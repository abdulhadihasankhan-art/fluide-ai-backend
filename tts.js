import express from "express";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

router.post("/tts", async (req, res) => {
  try {
    const { text, lang, voice } = req.body;

    if(!text || text.trim().length < 2){
      return res.status(400).json({ error: "No text" });
    }

    const useVoice = VALID_VOICES.includes(voice) ? voice : "alloy";
    const cleanText = text.trim().slice(0, 500);

    console.log(`[TTS] voice=${useVoice} lang=${lang} text="${cleanText.slice(0,50)}"`);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",   // HD = clearer, crisper
      voice: useVoice,
      input: cleanText,
      speed: 1.0           // Normal speed — not slow/heavy
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "X-Voice-Used": useVoice,
      "Cache-Control": "no-cache"
    });

    res.send(buffer);

  } catch(err){
    console.error("[TTS] Error:", err.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
