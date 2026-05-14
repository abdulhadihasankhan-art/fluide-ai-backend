import express from "express";

import OpenAI from "openai";

import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/tts", async (req,res)=>{

  try{

    const { text, language } = req.body;

    const mp3 = await client.audio.speech.create({

      model:"gpt-4o-mini-tts",

      voice:

language === "fr"

? "nova"

: "alloy",

      input:text

    });

    const buffer = Buffer.from(
      await mp3.arrayBuffer()
    );

    res.setHeader(
      "Content-Type",
      "audio/mpeg"
    );

    res.send(buffer);

  }

  catch(error){

    console.log(error);

    res.status(500).json({
      error:"TTS failed"
    });

  }

});

export default router;