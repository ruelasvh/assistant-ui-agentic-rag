/**
 * Tools and agents for the agentic RAG system
 */

import { z } from "zod";
import { searchDocuments, formatDocuments } from "./documents";

/**
 * Retriever tool - searches documents and returns formatted context
 */
export const retrieverTool = {
  description: "Search and return information about documents.",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant documents"),
  }),
  execute: async ({ query }: { query: string }) => {
    // Search for relevant documents
    const documents = searchDocuments(query, 3);

    if (documents.length === 0) {
      return "No relevant documents found.";
    }

    // Format documents for context
    return formatDocuments(documents);
  },
};

/**
 * Tools available to the response agent
 */
export const tools = {
  retrieve_documents: retrieverTool,
};
