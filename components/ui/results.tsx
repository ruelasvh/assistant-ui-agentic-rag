import * as React from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Document } from "../../lib/documents";


type RetrieverArgs = {
  query: string;
};

type RetrieverResults = {
  docs: Document[];
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
        {result && result.docs.length > 0 ? (
          <div>
            <h3 className="font-semibold mb-2">
              Retrieved {result.docs.length} document
              {result.docs.length > 1 ? "s" : ""} for query: {args.query}
            </h3>
            <ul className="list-disc list-inside space-y-2">
              {result.docs.map((doc) => (
                <li key={doc.id}>
                  <p className="font-medium">Source: {doc.metadata.source}</p>
                  <p className="font-medium">Page: {doc.metadata.page}</p>
                  <p className="whitespace-pre-wrap">{doc.content}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>No documents found for query: {args.query}</div>
        )}
      </div>
    );
  },
});
