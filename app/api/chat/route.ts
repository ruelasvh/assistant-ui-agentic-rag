import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { retrieverTool } from "@/lib/tools";



export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    console.log("Received messages:", messages.length);
    console.log("Last message:", messages[messages.length - 1]);

    const result = streamText({
      model: openai("gpt-5-nano"), // Using a better model for summarization
      messages: convertToModelMessages(messages), 
      tools: { "retrieverTool": retrieverTool },
      maxRetries: 5, // Allow multiple tool calls if needed
      toolChoice: { type: "tool", toolName: "retrieverTool" }, // Prefer tools first
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
