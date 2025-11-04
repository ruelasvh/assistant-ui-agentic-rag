import { ChromaClient } from "chromadb";
import { del } from "framer-motion/m";
import * as fs from "fs/promises";
import * as path from "path";

interface IngestOptions {
  documentsDirectory?: string;
  collectionName?: string;
}

async function main({
  documentsDirectory = "documents",
  collectionName = "particle_physics_knowledge_base",
}: IngestOptions = {}): Promise<void> {
  const documents: string[] = [];
  const metadatas: Array<{ filename: string; line_number: number }> = [];

  // Read all files in the documents directory
  const files = await fs.readdir(documentsDirectory);

  console.log(`Reading files from ${documentsDirectory}...`);

  for (const filename of files) {
    const filePath = path.join(documentsDirectory, filename);
    const fileContent = await fs.readFile(filePath, "utf-8");
    const lines = fileContent.split("\n");

    console.log(`Reading ${filename} (${lines.length} lines)...`);

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (trimmedLine.length === 0) {
        return;
      }

      documents.push(trimmedLine);
      metadatas.push({
        filename,
        line_number: index + 1,
      });
    });
  }

  console.log(`Total documents to add: ${documents.length}`);

  // Instantiate a persistent chroma client
  const client = new ChromaClient();

  // Get or create the collection
  const collection = await client.getOrCreateCollection({
    name: collectionName,
  });

  // Get current count
  const count = await collection.count();
  console.log(`Collection already contains ${count} documents`);

  // Create ids from the current count
  const ids = Array.from(
    { length: documents.length },
    (_, i) => (count + i).toString()
  );

  // Load documents in batches of 100
  const batchSize = 100;
  const totalBatches = Math.ceil(documents.length / batchSize);

  console.log(`Adding documents in ${totalBatches} batches...`);

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = Math.floor(i / batchSize) + 1;
    const end = Math.min(i + batchSize, documents.length);

    await collection.add({
      ids: ids.slice(i, end),
      documents: documents.slice(i, end),
      metadatas: metadatas.slice(i, end),
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