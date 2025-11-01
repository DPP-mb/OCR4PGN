// api/ocr.js
import { createWorker } from "tesseract.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required" });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Missing imageBase64" });
  }

  try {
    const worker = await createWorker("eng");
    const {
      data: { text }
    } = await worker.recognize(Buffer.from(imageBase64, "base64"));
    await worker.terminate();

    // Versuch, Text in PGN-artige Struktur zu bringen
    const cleaned = text
      .replace(/\n{2,}/g, "\n")
      .replace(/[^\x00-\x7F]/g, "")
      .trim();

    // Grober Heuristik-Versuch: Züge erkennen
    const lines = cleaned.split("\n");
    const moveLines = lines.filter(l => /\d+\.\s?[A-Za-z]/.test(l));
    const moves = moveLines.join(" ").replace(/\s+/g, " ");

    const pgn = `[Event "Unknown"]
[White ""]
[Black ""]
[Result "*"]

${moves}`;

    res.status(200).json({ pgn, rawText: cleaned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
