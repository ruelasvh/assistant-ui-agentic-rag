# Particle Physics RAG Chat Assistant

A chat assistant for particle physics that uses **RAG** (Retrieval-Augmented Generation) to answer questions from a ChromaDB vector database. Built with [assistant-ui](https://github.com/Yonom/assistant-ui), Vercel AI SDK, and OpenAI.

## Architecture

This project uses an **agentic architecture** where the AI model has access to tools that extend its capabilities:

- **Frontend**: React-based UI (`app/assistant.tsx`) that communicates with the backend API
- **Backend API**: Express endpoint (`app/api/chat/route.ts`) that streams responses and tool calls
- **Tools**: The system uses tools, starting with the `retrieverTool` that enables document retrieval

### The Retriever Tool Workflow

The `retrieverTool` implements the RAG pattern with the following workflow:

1. **Query Embedding**: User query is converted to vector embeddings using ChromaDB's embedding function
2. **Vector Search**: Embeddings are used to search the `particle_physics_knowledge_base` collection for the 3 most relevant documents
3. **Results Formatting**: Retrieved documents are formatted with source metadata (filename, line number) and similarity distances
4. **LLM Synthesis**: An LLM synthesizes the retrieved documents into a concise summary that answers the user's query
5. **Source Citation**: The final response includes citations to the original document sources for transparency

This approach allows the model to intelligently decide when to search the knowledge base and provide grounded, cited answers.

## Getting Started

First, add your OpenAI API key to `.env.local` file:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then, run the development server:

```bash
npm run chroma
# and in another terminal
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

# Data Ingestion Guide

The system supports ingesting multiple document formats into the vector database:

## Supported File Types

- **PDF files** (`.pdf`): Extracts text from all pages with page numbers preserved
- **LaTeX files** (`.tex`, `.latex`): Parses LaTeX content and strips formatting commands
- **Images** (`.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.tiff`): Uses OCR (Tesseract.js) to extract text from images
- **Text files** (`.txt`, `.md`): Plain text and markdown files

## How to Ingest Documents

1. Place your documents in the `documents/` directory (any combination of the supported file types)
2. Run the ingestion script:

```bash
npm run ingest
```

The script will:
- Automatically detect file types based on extensions
- Process each file with the appropriate parser
- Extract text content and metadata (filename, page number, line number, file type)
- Store everything in ChromaDB's vector database with embeddings for semantic search

You can also specify custom options:

```bash
# Use a different directory
npm run ingest -- --data_directory ./my-documents

# Use a different collection name
npm run ingest -- --collection_name my_custom_collection
```
