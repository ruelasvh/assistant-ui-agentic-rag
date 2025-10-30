import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { retrieverTool } from "@/lib/tools";

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    console.log("Received messages:", messages.length);
    console.log("Last message:", messages[messages.length - 1]);

    const result = streamText({
      model: openai("gpt-5-nano"),
      messages: convertToModelMessages(messages),
      tools: { retrieverTool },
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
