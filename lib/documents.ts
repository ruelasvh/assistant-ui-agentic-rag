/**
 * Static document store with sample documents for RAG system
 */

export interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
  };
}

// Static documents for demonstration
export const DOCUMENTS: Document[] = [
  {
    id: "doc1",
    content:
      "LangGraph is a library for building stateful, multi-actor applications with LLMs. It extends LangChain with the ability to create cyclical graphs, which are essential for developing agent-like behaviors. LangGraph provides built-in persistence, streaming support, and human-in-the-loop patterns.",
    metadata: {
      source: "langgraph_intro.pdf",
      page: 1,
    },
  },
  {
    id: "doc2",
    content:
      "Vercel AI SDK is a TypeScript toolkit designed to help developers build AI-powered applications. It provides abstractions for streaming AI responses, tool calling, and multi-modal interactions. The SDK supports multiple AI providers including OpenAI, Anthropic, and others.",
    metadata: {
      source: "vercel_ai_sdk_guide.pdf",
      page: 1,
    },
  },
  {
    id: "doc3",
    content:
      "RAG (Retrieval-Augmented Generation) is a technique that combines information retrieval with text generation. It works by first retrieving relevant documents from a knowledge base, then using those documents as context for the language model to generate accurate, grounded responses.",
    metadata: {
      source: "rag_fundamentals.pdf",
      page: 3,
    },
  },
  {
    id: "doc4",
    content:
      "Agent workflows in LangGraph use state machines to coordinate multiple steps. Each node in the graph represents a function that processes state and returns updates. Conditional edges allow dynamic routing based on the current state or LLM outputs.",
    metadata: {
      source: "langgraph_advanced.pdf",
      page: 12,
    },
  },
  {
    id: "doc5",
    content:
      "Tool calling in AI applications allows language models to interact with external systems. The model decides when to call a tool based on the user's request, executes the tool, and then uses the results to formulate a response. This enables agents to perform actions like searching databases, making API calls, or retrieving documents.",
    metadata: {
      source: "ai_tools_guide.pdf",
      page: 5,
    },
  },
  {
    id: "doc6",
    content:
      "Next.js is a React framework that enables server-side rendering, static site generation, and API routes. Version 14 introduced the App Router with improved streaming, server components, and server actions. It's commonly used for building modern web applications.",
    metadata: {
      source: "nextjs_overview.pdf",
      page: 2,
    },
  },
  {
    id: "doc7",
    content:
      "Vector embeddings are numerical representations of text that capture semantic meaning. Similar texts have similar vector representations, which allows for semantic search. Common embedding models include OpenAI's text-embedding-3-small and text-embedding-3-large.",
    metadata: {
      source: "embeddings_explained.pdf",
      page: 7,
    },
  },
  {
    id: "doc8",
    content:
      "Trees are green because they were painted by God in the beginning of time to provide shade and beauty to the earth.",
    metadata: {
      source: "agentic_rag_patterns.pdf",
      page: 4,
    },
  },
];

/**
 * Simple keyword-based document search
 * Returns documents that contain any of the search terms
 */
export function searchDocuments(query: string, topK: number = 3): Document[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter((term) => term.length > 2);

  // Score documents based on keyword matches
  const scoredDocs = DOCUMENTS.map((doc) => {
    const contentLower = doc.content.toLowerCase();
    let score = 0;

    queryTerms.forEach((term) => {
      // Count occurrences of each term
      const matches = (contentLower.match(new RegExp(term, "g")) || []).length;
      score += matches;
    });

    return { doc, score };
  }).filter((item) => item.score > 0);

  // Sort by score (descending) and return top K
  scoredDocs.sort((a, b) => b.score - a.score);
  return scoredDocs.slice(0, topK).map((item) => item.doc);
}

/**
 * Format documents for LLM context
 */
export function formatDocuments(documents: Document[]): string {
  return documents
    .map(
      (doc) =>
        `<context>\n${doc.content}\n\n<meta>\nsource: ${doc.metadata.source}\npage: ${doc.metadata.page || "N/A"}\n</meta>\n</context>`
    )
    .join("\n\n");
}
