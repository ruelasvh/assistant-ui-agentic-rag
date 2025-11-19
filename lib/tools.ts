/**
 * Tools and agents for the agentic RAG system
 */

import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";


const client = new ChromaClient();

/**
 * Summarize retrieved documents with citations
 * @param content - The content retrieved from the vector database
 * @param query - The original user query
 * @returns A summary with citations
 */
export async function summarize({ content, query }: { content: string, query: string }) {
  const systemPrompt = `You are an AI assistant with access to a vector database of documents about particle physics. Use the context provided only to answer user queries accurately and concisely.

  When you receive results from the database, synthesize the information and cite the sources (filename and line number).`;

  const userPrompt = `Using the following retrieved documents, provide a concise summary that answers the user's query. Cite the sources (filename and line number) in your response.

  Retrieved Documents:
  ${content}

  User Query: ${query}

  If no relevant information is found, respond with "No relevant information found."
  `;

  const resultSummary = await generateText({
    model: openai("gpt-5-nano"),
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Return member of context that is type text
  return resultSummary.content.filter((c) => c.type === "text");
}

/**
 * Retriever tool - searches documents and returns formatted context
 */
export const retrieverTool = {
  description: "Query the vector database using only the user's question for relevant documents about particle physics. Returns context that you should use to answer the user's question.",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant documents"),
  }),
  execute: async ({ query }: { query: string }) => {
    const collection = await client.getCollection({
      name: "particle_physics_knowledge_base",
    });
    const embeddingFunction = collection.embeddingFunction || new DefaultEmbeddingFunction();
    const embeddings = await embeddingFunction.generate([query]);
    const queryResults = await collection.query({
      queryEmbeddings: embeddings,
      nResults: 10, // Get more results for better context
    });
    
    // Format the results for the LLM to use
    const formattedQueryResults = queryResults.documents[0]?.map((doc, idx) => ({
      id: idx,
      content: doc,
      source: queryResults.metadatas[0]?.[idx],
      distance: queryResults.distances?.[0]?.[idx],
    })) || [];

    const queryResultText = formattedQueryResults.map((doc) => `- Source: ${doc.source?.filename ?? "unknown"} (Page ${doc.source?.page ?? "unknown"} - Line ${doc.source?.line_number ?? "unknown"}): ${doc.content}`).join("\n");

    return {
      summary: [{text: queryResultText}]
    }

    // const resultSummary = await summarize({ content: queryResultText, query });
    // return {
    //   summary: resultSummary,
    // };
  },
};

/**
 * Tools available to the response agent
 */
export const tools = {
  retrieve_documents: retrieverTool,
};
