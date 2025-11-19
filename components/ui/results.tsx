import { useAssistantToolUI } from "@assistant-ui/react";
import { makeAssistantToolUI, useAssistantApi, useAssistantState } from "@assistant-ui/react";


type RetrieverArgs = {
  query: string;
};

type RetrieverResults = {
  summary: any[];
};

export const DocumentsResultsUI = makeAssistantToolUI<
  RetrieverArgs,
  RetrieverResults
>({
  toolName: "retrieverTool",
  render: ({ args, status, result }) => {
    if (status.type === "running") {
      return (
        <div className="flex items-center gap-2">
          <span>Checking results for query: {args.query}...</span>
        </div>
      );
    }

    if (status.type === "incomplete" && status.reason === "error") {
      return (
        <div className="text-red-500">
          Failed to retrieve documents for query: {args.query}
        </div>
      );
    }

    return (
      <div>
        {result && result.summary.length > 0 ? (
          <div>
            <p className="font-semibold mb-2">
              {result.summary[0].text}
            </p>
          </div>
        ) : (
          <div>No documents found for query: {args.query}</div>
        )}
      </div>
    );
  },
});


export function RetrievalToolResultsUI({ handleMasterToolSwitch }: { handleMasterToolSwitch: (value: boolean) => void }) {
  const api = useAssistantApi();
  const appendMessage = (message: string) => {
    // handleMasterToolSwitch(false);
    const summaryPrompt = `Using the following retrieved documents, provide a concise summary that answers the user's query. Cite the sources (filename, page and line number) in your response.

      Retrieved Documents:
      ${message}

      If no relevant information is found, respond with "No relevant information found."
      `;
    // api.thread().append("Summarize");
    api.composer().setText(summaryPrompt);
  }
  const handleSend = () => {
    api.thread().append("Summarize");
    api.composer().send();
  }
  
  useAssistantToolUI({
    toolName: "retrieverTool",
    render: ({ args, result, status }) => {
      if (status.type === "running") {
        return (
          <div className="flex items-center gap-2">
            <span>Checking results for query: {args.query}...</span>
          </div>
        );
      }

      if (status.type === "incomplete" && status.reason === "error") {
        return (
          <div className="text-red-500">
            Failed to retrieve documents for query: {args.query}
          </div>
        );
      }

      return (
        <div>
          {result && result.summary.length > 0 ? (
            <div>
              <p className="font-semibold mb-2">
                {result.summary[0].text}
              </p>
              <button 
                className="bottom-4 right-4 rounded-full bg-blue-600 text-white px-2 shadow-lg hover:bg-blue-700"
                // onClick add the words summarize to the prompt text box
                // onClick={handleSend}
                onClick={() => appendMessage(result.summary[0].text)}
              >Summarize</button>
            </div>
          ) : (
            <div>No documents found for query: {args.query}</div>
          )}
        </div>
      );
    },
  });
  return null;
}