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
    const cleanText = text.trim().slice(0, 1000);

    console.log(`[TTS] voice=${useVoice} len=${cleanText.length} text="${cleanText.slice(0,50)}"`);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: useVoice,
      input: cleanText,
      speed: 1.0,
      response_format: "mp3"
    });

    // Stream directly — no await arrayBuffer
    res.set({
      "Content-Type": "audio/mpeg",
      "X-Voice-Used": useVoice,
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked"
    });

    // Pipe stream directly to response
    const stream = mp3.body;
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("[TTS] Stream error:", err.message);
      if(!res.headersSent) res.status(500).json({ error: "TTS stream failed" });
    });

  } catch(err){
    console.error("[TTS] Error:", err.message);
    if(!res.headersSent) res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
