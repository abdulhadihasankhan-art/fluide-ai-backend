import express from "express";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory cache
const ttsCache = new Map();
const MAX_CACHE = 50;

router.post("/tts", async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || text.trim().length < 2) {
      return res.status(400).json({ error: "No text provided" });
    }

    const cleanText = text.trim().slice(0, 500);
    const cacheKey = cleanText.slice(0, 100);

    // Cache hit — instant
    if(ttsCache.has(cacheKey)){
      const cached = ttsCache.get(cacheKey);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": cached.length,
        "Cache-Control": "public, max-age=3600"
      });
      return res.send(cached);
    }

    // Voice: "nova" — clear, natural, not heavy
    // Speed: 1.0 normal, 1.1 slightly faster = lighter/thinner sound
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",     // HD = clearer, crisper — less "muddy"
      voice: "nova",          // nova = clear female, natural, not heavy/thick
      input: cleanText,
      speed: 1.05             // Slightly faster = lighter, crisper sound
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Cache
    if(ttsCache.size >= MAX_CACHE){
      ttsCache.delete(ttsCache.keys().next().value);
    }
    ttsCache.set(cacheKey, buffer);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=3600"
    });

    res.send(buffer);

  } catch (error) {
    console.error("TTS error:", error.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
