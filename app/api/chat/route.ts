import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages, CoreMessage } from "ai";
import { tools } from "@/lib/tools";
import { gradeDocuments, rewriteQuestion } from "@/lib/grader";
import { searchDocuments, formatDocuments } from "@/lib/documents";

const MAX_ITERATIONS = 3; // Prevent infinite loops

/**
 * Extract the most recent user message
 */
function getLatestUserMessage(messages: CoreMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as any;
    if (msg.role !== "user") continue;

    // 1) message.content as plain string
    if (typeof msg.content === "string") return msg.content;

    // 2) message.content as array of parts/segments
    if (Array.isArray(msg.content)) {
      // search from end for the most recent text
      for (let j = msg.content.length - 1; j >= 0; j--) {
        const part = msg.content[j];
        if (!part) continue;
        if (typeof part === "string") return part;
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
      }
    }

    // 3) message.parts (example structure you provided)
    if (Array.isArray(msg.parts)) {
      for (let j = msg.parts.length - 1; j >= 0; j--) {
        const part = msg.parts[j];
        if (!part) continue;
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
      }
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    let currentMessages = convertToModelMessages(messages);
    let iterations = 0;

    console.log("Received messages:", messages.length);
    console.log("Last message:", messages[messages.length - 1]);

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      console.log(`\n=== Iteration ${iterations} ===`);

      const userQuestion = getLatestUserMessage(currentMessages);

      if (!userQuestion) {
        console.log("No user question found, exiting loop");
        return streamText({
          model: openai("gpt-4o-mini"),
          messages: currentMessages,
        }).toUIMessageStreamResponse();
      }

      // Step 1: Response Agent - Let LLM decide whether to retrieve or answer directly
      const { generateText } = await import("ai");

      const decisionPrompt = `Given the user's question, decide if you need to search documents to answer it, or if you can answer directly without searching.

User question: "${userQuestion}"

If the question is about:
- LangGraph, Vercel AI SDK, RAG, embeddings, agentic systems, Next.js, tool calling - respond with "SEARCH"
- General greetings, simple questions, or things you can answer without specific documents - respond with "ANSWER"

Respond with only one word: either "SEARCH" or "ANSWER"`;

      const decision = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: decisionPrompt,
      });

      const decisionText = decision.text.trim().toUpperCase();
      console.log("Decision:", decisionText);

      if (decisionText.includes("SEARCH")) {
        // Step 2: Retrieve documents
        console.log("Retrieving documents for:", userQuestion);
        const documents = searchDocuments(userQuestion, 3);
        const context = formatDocuments(documents);

        console.log(`Retrieved ${documents.length} documents`);

        if (documents.length === 0) {
          // No documents found - answer without context
          return streamText({
            model: openai("gpt-4o-mini"),
            messages: [
              ...currentMessages,
              {
                role: "assistant",
                content:
                  "I searched for relevant documents but couldn't find any. Let me try to answer based on my general knowledge.",
              },
            ],
          }).toUIMessageStreamResponse();
        }

        // Step 3: Grade the documents
        const score = await gradeDocuments(userQuestion, context);
        console.log(`Document relevance score: ${score}`);

        if (score > 0.5) {
          // Documents are relevant - generate final answer
          console.log("Documents relevant! Generating final answer...");

          const finalPrompt = `You are an assistant for question-answering tasks.
Use the following pieces of retrieved context to answer the question.
If you don't know the answer, just say that you don't know.
Use three sentences maximum and keep the answer concise.
Include the source document name and page number of the context used to form your answer.

Question: ${userQuestion}

Context: ${context}`;

          return streamText({
            model: openai("gpt-4o-mini"),
            prompt: finalPrompt,
          }).toUIMessageStreamResponse();
        } else {
          // Documents not relevant - rewrite question and retry
          console.log("Documents not relevant, rewriting question...");
          const rewrittenQuestion = await rewriteQuestion(userQuestion);
          console.log(`Rewritten question: ${rewrittenQuestion}`);

          // Update messages with the rewritten question and continue loop
          currentMessages.push({
            role: "user",
            content: rewrittenQuestion,
          });

          continue;
        }
      } else {
        // No retrieval needed - answer directly
        console.log("No retrieval needed, answering directly");
        return streamText({
          model: openai("gpt-4o-mini"),
          messages: currentMessages,
        }).toUIMessageStreamResponse();
      }
    }

    // Max iterations reached - return final response
    console.log("Max iterations reached");
    return streamText({
      model: openai("gpt-4o-mini"),
      prompt: `Please answer the following question with the information you have: ${getLatestUserMessage(currentMessages)}`,
    }).toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
