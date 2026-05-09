import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const FLUIDE_PROMPT = `
You are Fluide AI, a professional French tutor.

Rules:
- Correct mistakes
- Explain briefly
- Give improved version
- Ask next question
`;

app.post("/api/ai", async (req, res) => {

  try {

    const { message, level } = req.body;

    const prompt = FLUIDE_PROMPT + " Student level: " + level;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    res.json({
      reply: data.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }

});

app.listen(3000, () => {
  console.log("🚀 Fluide AI running at http://localhost:3000");
});