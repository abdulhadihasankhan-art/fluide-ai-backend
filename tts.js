import express from "express";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ttsCache = new Map();
const MAX_CACHE = 50;

router.post("/tts", async (req, res) => {
  try {
    const { text, lang, voice: reqVoice } = req.body;
    if (!text || text.trim().length < 2) {
      return res.status(400).json({ error: "No text provided" });
    }

    const cleanText = text.trim().slice(0, 500);

    // Voice selection:
    // alloy   = neutral, balanced — not too heavy, not too light
    // echo    = male, clear
    // fable   = warm, European feel
    // onyx    = deep male
    // nova    = clear female
    // shimmer = soft female, lightest voice
    const voice = reqVoice || "alloy";

    const cacheKey = voice + "_" + cleanText.slice(0, 80);

    if(ttsCache.has(cacheKey)){
      const cached = ttsCache.get(cacheKey);
      res.set({ "Content-Type":"audio/mpeg", "Content-Length":cached.length });
      return res.send(cached);
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: cleanText,
      speed: 1.0
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    if(ttsCache.size >= MAX_CACHE) ttsCache.delete(ttsCache.keys().next().value);
    ttsCache.set(cacheKey, buffer);

    res.set({ "Content-Type":"audio/mpeg", "Content-Length":buffer.length });
    res.send(buffer);

  } catch(error){
    console.error("TTS error:", error.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
