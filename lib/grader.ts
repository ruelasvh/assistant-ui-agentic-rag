/**
 * Grader agent - grades document relevance using structured output
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * Schema for grading documents
 */
const gradeSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(1)
    .describe("Relevance score: a float value representing relevance from 0 to 1"),
});

/**
 * Grade retrieved documents for relevance to the question
 * Returns a score from 0 to 1
 */
export async function gradeDocuments(
  question: string,
  context: string
): Promise<number> {
  const gradePrompt = `You are a grader assessing relevance of a retrieved document to a user question.
Here is the retrieved document:

${context}

Here is the user question: ${question}

If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant.
Give a score from 0 to 1 to indicate the relevance of the document to the question.`;

  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: gradeSchema,
      prompt: gradePrompt,
    });

    return result.object.score;
  } catch (error) {
    console.error("Error grading documents:", error);
    // Default to low score if grading fails
    return 0.3;
  }
}

/**
 * Rewrite a question to improve retrieval
 */
export async function rewriteQuestion(question: string): Promise<string> {
  const { generateText } = await import("ai");

  const rewritePrompt = `Look at the input and try to reason about the underlying semantic intent / meaning.
Here is the initial question:
------- 
${question}
-------
Formulate an improved question:`;

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: rewritePrompt,
    });

    return result.text;
  } catch (error) {
    console.error("Error rewriting question:", error);
    // Return original question if rewrite fails
    return question;
  }
}
