import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { parseArgs } from "util";

dotenvConfig({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

const { values } = parseArgs({
  options: {
    prompt: { type: "string" },
    output: { type: "string", default: "output.png" },
    aspect: { type: "string", default: "1:1" },
    size: { type: "string", default: "1K" },
    model: { type: "string", default: "gemini-3.1-flash-image-preview" },
  },
});

if (!values.prompt) {
  console.error("Error: --prompt is required");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set");
  process.exit(1);
}

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const config = {
    responseModalities: ["IMAGE", "TEXT"] as const,
    thinkingConfig: { thinkingLevel: "MINIMAL" as const },
    imageConfig: { imageSize: values.size, aspectRatio: values.aspect },
  };

  const response = await ai.models.generateContentStream({
    model: values.model!,
    config,
    contents: [
      {
        role: "user",
        parts: [{ text: values.prompt! }],
      },
    ],
  });

  const outputPath = values.output!;
  await mkdir(dirname(outputPath), { recursive: true });

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
        const finalPath = outputPath.replace(/\.[^.]+$/, "") + "." + ext;
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
  console.error("Generation failed:", err.message || err);
  process.exit(1);
});
