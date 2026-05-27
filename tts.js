import express from "express";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory cache — same text nahi dobara fetch hogi
const ttsCache = new Map();
const MAX_CACHE = 50;

router.post("/tts", async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text || text.trim().length < 2) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Trim text — max 500 chars for speed
    const cleanText = text.trim().slice(0, 500);
    const cacheKey = cleanText.slice(0, 100);

    // ── CACHE HIT — instant response ──
    if(ttsCache.has(cacheKey)){
      const cached = ttsCache.get(cacheKey);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": cached.length,
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "HIT"
      });
      return res.send(cached);
    }

    // ── FETCH FROM OPENAI ──
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",          // tts-1 = fastest, tts-1-hd = higher quality
      voice: "fable",          // European/French accent
      input: cleanText,
      speed: (lang === "fr") ? 0.92 : 1.0
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Cache karo
    if(ttsCache.size >= MAX_CACHE){
      const firstKey = ttsCache.keys().next().value;
      ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, buffer);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=3600",
      "X-Cache": "MISS"
    });

    res.send(buffer);

  } catch (error) {
    console.error("TTS error:", error.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
