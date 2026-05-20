import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if(!text) return res.status(400).json({ error: "No text provided" });

    // iOS ke liye CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");

    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text.slice(0, 500)
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);

  } catch(error) {
    console.log(error);
    res.status(500).json({ error: "TTS failed" });
  }
});

// OPTIONS request handle karo iOS ke liye
router.options("/tts", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

export default router;
