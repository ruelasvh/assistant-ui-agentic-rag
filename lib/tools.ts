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
 * Retriever tool - searches documents and returns formatted context
 */
export const retrieverTool = {
  description: "Query the vector database for relevant documents about particle physics. Returns context that you should use to answer the user's question.",
  inputSchema: z.object({
    query: z.string().describe("The search query to find relevant documents"),
  }),
  execute: async ({ query }: { query: string }) => {
    const collection = await client.getCollection({
      name: "particle_physics_knowledge_base",
    });
    const embeddingFunction = collection.embeddingFunction || new DefaultEmbeddingFunction();
    console.log("Querying database with query:", query);
    const embeddings = await embeddingFunction.generate([query]);
    const results = await collection.query({
      queryEmbeddings: embeddings,
      nResults: 3, // Get more results for better context
    });
    
    // Format the results for the LLM to use
    const formattedResults = results.documents[0]?.map((doc, idx) => ({
      id: idx,
      content: doc,
      source: results.metadatas[0]?.[idx],
      distance: results.distances?.[0]?.[idx],
    })) || [];

    const systemPrompt = `You are an AI assistant with access to a vector database of documents about particle physics. Use the queryDatabase tool to retrieve relevant information, then use that context to answer user queries accurately and concisely.

    When you receive results from the database, synthesize the information and cite the sources (filename and line number).`;

    const resultSummary = await generateText({
      model: openai("gpt-5-nano"),
      system: systemPrompt,
      prompt: `Using the following retrieved documents, provide a concise summary that answers the user's query. Cite the sources (filename and line number) in your response.

      Retrieved Documents:
      ${formattedResults.map((doc) => `- Source: ${doc.source.filename} (Line ${doc.source.line_number}): ${doc.content}`).join("\n")}

      User Query: ${query}`,
    });

    // Return member of context that is type text
    return {
      summary: resultSummary.content.filter((c) => c.type === "text")
    };
  },
}

/**
 * Tools available to the response agent
 */
export const tools = {
  retrieve_documents: retrieverTool,
};
