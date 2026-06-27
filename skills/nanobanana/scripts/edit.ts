import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { writeFile, readFile, mkdir } from "fs/promises";
import { dirname, join } from "path";

dotenvConfig({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

// Parse args manually to support multiple --input flags
const args = process.argv.slice(2);
const inputs: string[] = [];
let prompt = "";
let output = "edited.png";
let size = "1K";
let model = "gemini-3.1-flash-image-preview";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--input" && args[i + 1]) {
    inputs.push(args[++i]);
  } else if (args[i] === "--prompt" && args[i + 1]) {
    prompt = args[++i];
  } else if (args[i] === "--output" && args[i + 1]) {
    output = args[++i];
  } else if (args[i] === "--size" && args[i + 1]) {
    size = args[++i];
  } else if (args[i] === "--model" && args[i + 1]) {
    model = args[++i];
  }
}

if (!prompt) {
  console.error("Error: --prompt is required");
  process.exit(1);
}

if (inputs.length === 0) {
  console.error("Error: at least one --input is required (path to source image)");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set");
  process.exit(1);
}

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // Build parts array: all images first, then the text prompt
  const parts: any[] = [];

  for (const inputPath of inputs) {
    const imageBuffer = await readFile(inputPath);
    const imageMimeType = mime.getType(inputPath) || "image/png";
    const imageBase64 = imageBuffer.toString("base64");
    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBase64,
      },
    });
  }

  parts.push({ text: prompt });

  const config = {
    responseModalities: ["IMAGE", "TEXT"] as const,
    thinkingConfig: { thinkingLevel: "MINIMAL" as const },
    imageConfig: { imageSize: size },
  };

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  await mkdir(dirname(output), { recursive: true });

  let saved = false;
  for await (const chunk of response) {
    if (
      !chunk.candidates ||
      !chunk.candidates[0]?.content?.parts
    ) {
      continue;
    }

    for (const part of chunk.candidates[0].content.parts) {
      if (part.inlineData) {
        const ext = mime.getExtension(part.inlineData.mimeType || "") || "png";
        const finalPath = output.replace(/\.[^.]+$/, "") + "." + ext;
        const buffer = Buffer.from(part.inlineData.data || "", "base64");
        await writeFile(finalPath, buffer);
        console.log(`Image saved: ${finalPath}`);
        saved = true;
      } else if (part.text) {
        console.log(part.text);
      }
    }
  }

  if (!saved) {
    console.error("No image was generated. Try refining your prompt.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Edit failed:", err.message || err);
  process.exit(1);
});
