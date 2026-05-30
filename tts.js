import express from "express";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache — voice bhi key mein include
const ttsCache = new Map();

router.post("/tts", async (req, res) => {
  try {
    const { text, lang, voice } = req.body;

    if(!text || text.trim().length < 2){
      return res.status(400).json({ error: "No text" });
    }

    // Voice — jo bhi frontend se aaye, wahi use karo
    // Valid voices: alloy, echo, fable, onyx, nova, shimmer
    const VALID = ["alloy","echo","fable","onyx","nova","shimmer"];
    const selectedVoice = VALID.includes(voice) ? voice : "alloy";

    const cleanText = text.trim().slice(0, 500);

    // Speed
    const speed = (lang === "fr") ? 0.95 : 1.0;

    // Cache key includes voice — different voice = different cache
    const cacheKey = selectedVoice + "|" + cleanText.slice(0, 100);

    if(ttsCache.has(cacheKey)){
      const cached = ttsCache.get(cacheKey);
      res.set({ "Content-Type":"audio/mpeg", "Content-Length":cached.length, "X-Voice":selectedVoice, "X-Cache":"HIT" });
      return res.send(cached);
    }

    console.log(`TTS: voice=${selectedVoice}, lang=${lang}, text="${cleanText.slice(0,40)}..."`);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice,
      input: cleanText,
      speed: speed
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Keep cache small
    if(ttsCache.size >= 100) ttsCache.delete(ttsCache.keys().next().value);
    ttsCache.set(cacheKey, buffer);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "X-Voice": selectedVoice,
      "X-Cache": "MISS"
    });
    res.send(buffer);

  } catch(err){
    console.error("TTS error:", err.message);
    res.status(500).json({ error: "TTS failed", detail: err.message });
  }
});

export default router;
