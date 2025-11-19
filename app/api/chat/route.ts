import { openai } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { retrieverTool } from "@/lib/tools";


export async function POST(req: Request) {
  try {
    const { messages, tools }: { messages: UIMessage[], tools?: any } = await req.json();

    const lastMessage = messages[messages.length - 1];
    const shouldUseTool = !lastMessage.parts.some(part => 
      part.text.toLowerCase().includes("summary") || 
      part.text.toLowerCase().includes("summarize")
    );


    console.log("Should")

    const result = streamText({
      model: openai("gpt-5-nano"), // Using a better model for summarization
      messages: convertToModelMessages(messages), 
      tools: shouldUseTool ? { "retrieverTool": retrieverTool } : undefined,
      toolChoice: { type: "tool", toolName: "retrieverTool" }, // Prefer tools first
      maxRetries: 5, // Allow multiple tool calls if needed
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
