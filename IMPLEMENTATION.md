# Agentic RAG with Vercel AI SDK

This project implements a **two-agent agentic RAG (Retrieval-Augmented Generation) system** using Vercel's AI SDK, mirroring the architecture from the LangGraph implementation.

## Architecture Overview

The system implements the same two-agent pattern from the LangGraph version:

### 1. **Response Agent**
- Decides whether to retrieve documents or answer directly
- Makes intelligent routing decisions based on the question type
- Handles general questions without unnecessary retrieval

### 2. **Grader Agent**  
- Uses `generateObject()` with structured output to score document relevance (0-1)
- Evaluates retrieved documents against the user's question
- Triggers question rewriting if documents aren't relevant (score ≤ 0.5)

## Flow Diagram

```
User Question
      ↓
[Response Agent] → Decide: SEARCH or ANSWER?
      ↓
  SEARCH path:
      ↓
[Retrieve Documents] → Search static document store
      ↓
[Grader Agent] → Score relevance (0-1)
      ↓
  Score > 0.5?
      ↓ YES               ↓ NO
[Generate Answer]   [Rewrite Question] → Loop back (max 3x)
      ↓
Stream Response to User
```

## Implementation Details

### Key Files

#### `/lib/documents.ts`
- Static document store with 8 sample documents about AI, LangGraph, RAG, etc.
- Keyword-based search function (simple implementation for demo)
- Document formatting for LLM context

#### `/lib/grader.ts`
- **`gradeDocuments()`**: Uses `generateObject()` with Zod schema for structured scoring
- **`rewriteQuestion()`**: Reformulates questions to improve retrieval
- Both use GPT-4o-mini for efficiency

#### `/lib/tools.ts`
- Retriever tool definition (prepared for future tool calling enhancement)
- Currently used as reference, actual retrieval is direct in the route

#### `/app/api/chat/route.ts`
- Main orchestration logic
- Implements the iterative loop:
  1. Decision making (search vs. answer)
  2. Document retrieval
  3. Grading with structured output
  4. Answer generation or question rewriting
- Max 3 iterations to prevent infinite loops

## Key Differences: LangGraph vs. AI SDK

| Feature | LangGraph | Vercel AI SDK |
|---------|-----------|---------------|
| **Flow Control** | Declarative graph with edges | Imperative orchestration in route handler |
| **State Management** | Automatic via `MessagesState` | Manual via message array |
| **Tool Calling** | Automatic with `ToolNode` | Currently manual retrieval (can be enhanced) |
| **Structured Output** | `.with_structured_output()` | `generateObject()` with Zod schema |
| **Streaming** | Via compiled graph | Via `streamText().toTextStreamResponse()` |
| **Routing** | Conditional edges | If/else logic + loops |

## Testing the System

The system handles different question types:

### ✅ Should Trigger Retrieval + Grading:
- "What is LangGraph?"
- "Explain agentic RAG"
- "How does the Vercel AI SDK work?"
- "What are vector embeddings?"

### ✅ Should Answer Directly (No Retrieval):
- "Hello!"
- "What's 2+2?"
- "Tell me a joke"

### ✅ Should Trigger Rewrite (Low Relevance):
- Very vague questions that don't match document content well
- The system will rewrite and retry up to 3 times

## Console Logs

The implementation includes detailed logging:

```typescript
=== Iteration 1 ===
Decision: SEARCH
Retrieving documents for: What is LangGraph?
Retrieved 3 documents
Document relevance score: 0.92
Documents relevant! Generating final answer...
```

Or for low-relevance scenarios:

```typescript
=== Iteration 1 ===
Decision: SEARCH
Retrieved 3 documents
Document relevance score: 0.3
Documents not relevant, rewriting question...
Rewritten question: Can you explain the LangGraph framework?
```

## Environment Variables

Create a `.env.local` file:

```env
OPENAI_API_KEY=your_api_key_here
```

## Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to test the chat interface.

## Future Enhancements

1. **Real Vector Store**: Replace static documents with FAISS, Pinecone, or Supabase
2. **Semantic Search**: Use embeddings instead of keyword matching
3. **Tool Calling**: Implement proper AI SDK tool calling instead of decision prompts
4. **Multi-Document Grading**: Grade each document individually vs. batch grading
5. **Streaming Grading**: Show grading progress to users
6. **Confidence Scores**: Display relevance scores in the UI

## Comparison with LangGraph Implementation

Both implementations achieve the same functional outcome:

✅ Response agent decides to retrieve or answer  
✅ Grader scores document relevance  
✅ Iterative question rewriting on low scores  
✅ Streaming responses  
✅ Context-aware answer generation  

The AI SDK version trades LangGraph's declarative elegance for more explicit control and TypeScript type safety.
