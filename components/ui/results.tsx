import * as React from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";

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
            <h3 className="font-semibold mb-2">
              {result.summary[0].text}
            </h3>
          </div>
        ) : (
          <div>No documents found for query: {args.query}</div>
        )}
      </div>
    );
  },
});