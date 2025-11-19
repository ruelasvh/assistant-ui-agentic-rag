import { ChromaClient } from "chromadb";
import * as fs from "fs/promises";
import * as path from "path";
import { createWorker } from "tesseract.js";

// pdf-parse uses CommonJS, so we need to import it this way
const { PDFParse } = require("pdf-parse");

interface IngestOptions {
  documentsDirectory?: string;
  collectionName?: string;
}

interface DocumentChunk {
  text: string;
  metadata: {
    filename: string;
    page?: number;
    line_number?: number;
    file_type: string;
  };
}

/**
 * Process a PDF file and extract text from all pages
 * Optimized for large PDFs using streaming and range requests
 */
async function processPDF(filePath: string, filename: string): Promise<DocumentChunk[]> {
  const parser = new PDFParse({ 
    url: filePath,
    parsePageInfo: true,
  });
  
  try {
    const data = await parser.getText({
      disableAutoFetch: true,
			disableStream: true,
			rangeChunkSize: 65536,
    });
    
    const chunks: DocumentChunk[] = [];

    console.log(`PDF has ${data.pages.length} pages.`);

    // Process each page separately
    data.pages.forEach((page: any, pageIndex: number) => {
      const pageText = page.text || '';
      console.log(`  Processing page ${pageIndex + 1} with:\n${pageText}`);
      const lines = pageText.split('\n').filter((line: string) => line.trim().length > 0);
      
      lines.forEach((line: string, lineIndex: number) => {
        chunks.push({
          text: line.trim(),
          metadata: {
            filename,
            page: pageIndex + 1,
            line_number: lineIndex + 1,
            file_type: 'pdf'
          }
        });
      });
    });
    
    return chunks;
  } finally {
    // Clean up resources
    await parser.destroy();
  }
}

/**
 * Process a LaTeX file and extract text content
 */
async function processLaTeX(filePath: string, filename: string): Promise<DocumentChunk[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  
  const chunks: DocumentChunk[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines, comments, and common LaTeX commands without content
    if (
      trimmedLine.length === 0 ||
      trimmedLine.startsWith('%') ||
      trimmedLine.startsWith('\\documentclass') ||
      trimmedLine.startsWith('\\usepackage') ||
      trimmedLine === '\\begin{document}' ||
      trimmedLine === '\\end{document}'
    ) {
      return;
    }
    
    // Remove common LaTeX commands but keep the text
    let cleanedLine = trimmedLine
      .replace(/\\section\{([^}]+)\}/g, '$1')
      .replace(/\\subsection\{([^}]+)\}/g, '$1')
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\textit\{([^}]+)\}/g, '$1')
      .replace(/\\emph\{([^}]+)\}/g, '$1')
      .replace(/\\cite\{[^}]+\}/g, '')
      .replace(/\\label\{[^}]+\}/g, '')
      .replace(/\\ref\{[^}]+\}/g, 'reference')
      .replace(/\\[a-zA-Z]+/g, '') // Remove remaining commands
      .replace(/[{}]/g, '') // Remove braces
      .trim();
    
    if (cleanedLine.length > 0) {
      chunks.push({
        text: cleanedLine,
        metadata: {
          filename,
          line_number: index + 1,
          file_type: 'latex'
        }
      });
    }
  });
  
  return chunks;
}

/**
 * Process an image file using OCR to extract text
 */
async function processImage(filePath: string, filename: string): Promise<DocumentChunk[]> {
  const worker = await createWorker('eng');
  
  try {
    const { data: { text } } = await worker.recognize(filePath);
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    const chunks: DocumentChunk[] = lines.map((line, index) => ({
      text: line.trim(),
      metadata: {
        filename,
        line_number: index + 1,
        file_type: 'image'
      }
    }));
    
    return chunks;
  } finally {
    await worker.terminate();
  }
}

/**
 * Process a plain text file
 */
async function processTextFile(filePath: string, filename: string): Promise<DocumentChunk[]> {
  const fileContent = await fs.readFile(filePath, "utf-8");
  const lines = fileContent.split("\n");
  
  const chunks: DocumentChunk[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.length === 0) {
      return;
    }
    
    chunks.push({
      text: trimmedLine,
      metadata: {
        filename,
        line_number: index + 1,
        file_type: 'text'
      }
    });
  });
  
  return chunks;
}

/**
 * Route file to appropriate processor based on extension
 */
async function processFile(filePath: string, filename: string): Promise<DocumentChunk[]> {
  const ext = path.extname(filename).toLowerCase();
  
  console.log(`Processing ${filename} (${ext})...`);
  
  try {
    switch (ext) {
      case '.pdf':
        return await processPDF(filePath, filename);
      
      case '.tex':
      case '.latex':
        return await processLaTeX(filePath, filename);
      
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.bmp':
      case '.tiff':
        return await processImage(filePath, filename);
      
      case '.txt':
      case '.md':
      default:
        return await processTextFile(filePath, filename);
    }
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
    return [];
  }
}

async function main({
  documentsDirectory = "documents",
  collectionName = "particle_physics_knowledge_base",
}: IngestOptions = {}): Promise<void> {
  const allChunks: DocumentChunk[] = [];

  // Read all files in the documents directory
  const files = await fs.readdir(documentsDirectory);

  console.log(`Reading files from ${documentsDirectory}...`);

  for (const filename of files) {
    // Skip hidden files and directories
    if (filename.startsWith('.')) {
      continue;
    }
    
    const filePath = path.join(documentsDirectory, filename);
    
    // Check if it's a file (not a directory)
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      continue;
    }
    
    const chunks = await processFile(filePath, filename);
    allChunks.push(...chunks);
    
    console.log(`  Extracted ${chunks.length} chunks from ${filename}`);
  }

  console.log(`Total documents to add: ${allChunks.length}`);

  // Instantiate a persistent chroma client
  const client = new ChromaClient();

  // Get or create the collection
  const collection = await client.getOrCreateCollection({
    name: collectionName,
  });

  // Get current count
  const count = await collection.count();
  console.log(`Collection already contains ${count} documents`);

  // Prepare data for insertion
  const documents = allChunks.map(chunk => chunk.text);
  const metadatas = allChunks.map(chunk => chunk.metadata);
  
  // Create ids from the current count
  const ids = Array.from(
    { length: documents.length },
    (_, i) => (count + i).toString()
  );

  // Load documents in batches of 100
  const batchSize = 100;
  const totalBatches = Math.ceil(documents.length / batchSize);

  console.log(`Adding documents in ${totalBatches} batches...`);
  // embedding function
  const embeddingFunction = collection.embeddingFunction;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = Math.floor(i / batchSize) + 1;
    const end = Math.min(i + batchSize, documents.length);
    const batchDocumentsEmbeddings = await embeddingFunction?.generate(documents.slice(i, end)) || [];
    
    await collection.add({
      ids: ids.slice(i, end),
      documents: documents.slice(i, end),
      metadatas: metadatas.slice(i, end),
      embeddings: batchDocumentsEmbeddings,
    });

    console.log(`Processed batch ${batch}/${totalBatches}`);
  }

  const newCount = await collection.count();
  console.log(`Added ${newCount - count} documents`);
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options: IngestOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data_directory" && args[i + 1]) {
      options.documentsDirectory = args[i + 1];
      i++;
    } else if (args[i] === "--collection_name" && args[i + 1]) {
      options.collectionName = args[i + 1];
      i++;
    }
  }

  main(options)
    .then(() => {
      console.log("Ingestion completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error during ingestion:", error);
      process.exit(1);
    });
}

export { main };