import express from "express";
import ttsRoute from "./tts.js";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import pool from "./db.js";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", ttsRoute);

app.get("/test-db", async(req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ success:true, time: result.rows[0] });
  } catch(error) {
    console.log(error);
    res.status(500).json({ success:false, error:error.message });
  }
});

app.post("/api/ai", async (req, res) => {
  try {

    const { message, level, mode, history } = req.body;

    let modeInstructions = "";

    if(mode === "level-test"){
      modeInstructions = `
You are evaluating the student's French level.
Analyze grammar, vocabulary, fluency, sentence structure.
Determine level: A1, A2, B1, B2, C1 or C2.
Ask natural follow-up questions. Do not reveal level immediately.
After enough messages, estimate the level and explain strengths/weaknesses.
`;
    }
    else if(mode === "tef"){
      modeInstructions = `
You are a real TEF examiner.
Section A: Show a realistic advertisement. Act as the seller. Wait for student to ask questions. Never create comprehension exercises.
Section B: Create convincing task. Student must persuade someone.
Every session must feel NEW. Never repeat situations.
Adapt difficulty to level: ${level}
`;
    }
    else if(mode === "tcf"){
      modeInstructions = `
You are a real TCF examiner.
Section A: introduction practice
Section B: asking questions practice  
Section C: monologue practice
Continue naturally. Ask follow-up questions.
`;
    }
    else if(mode === "speaking"){
      modeInstructions = `
You are a speaking coach. Student level: ${level}
- Simulate realistic French conversations
- Correct grammar and pronunciation mistakes
- Encourage the student
- Every session must feel NEW and different
- A1/A2: simple French, short questions
- B1/B2: detailed answers, connectors
- C1/C2: advanced discussions, debates
Start with a unique engaging French question.
`;
    }
    else if(mode === "writing"){
      modeInstructions = `
You are a French writing tutor. Student level: ${level}
- Correct grammar mistakes
- Improve sentence structure and vocabulary
- Provide a better rewritten version
- Generate NEW unique writing topics every session
- Never repeat previous topics
`;
    }
    else if(mode === "vocabulary"){
      modeInstructions = `
You are a French vocabulary coach. Student level: ${level}
- Teach useful French vocabulary
- Provide: French word, English meaning, pronunciation, example sentence
- Generate fresh vocabulary every session
- If student says quiz: create vocabulary quiz
`;
    }
    else if(mode === "translator"){
      modeInstructions = `
You are a French-English translator.
- Detect language automatically
- Translate English to French or French to English
- Correct grammar before translating
- Provide pronunciation help
- Give example sentences
`;
    }
    else {
      modeInstructions = `
You are having a general French learning conversation.
Help the student with any French questions.
Be friendly, encouraging, and educational.
`;
    }

    const systemPrompt = `
You are Fluide AI, an advanced French tutor and TEF/TCF preparation coach.
Student level: ${level}

${modeInstructions}

RULES:
1. Adapt to level: A1/A2 use easy French + some English; B1/B2 mostly French; C1/C2 advanced French.
2. Always correct mistakes politely and encourage the student.
3. Keep responses conversational, motivating, and not too long.
4. Sound human and supportive, not robotic.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-10),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_tokens: 600,
        temperature: 0.7,
        messages: messages
      })
    });

    const data = await response.json();

    if(!data.choices || !data.choices[0]){
      console.error("OpenAI error:", data);
      return res.status(500).json({ reply: "AI error. Please try again." });
    }

    res.json({ reply: data.choices[0].message.content });

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/signup", async(req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if(existingUser.rows.length > 0){
      return res.status(400).json({ error:"User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      `INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING *`,
      [name, email, hashedPassword]
    );
    res.json({ success:true, user:newUser.rows[0] });
  } catch(error) {
    console.log(error);
    res.status(500).json({ error:"Signup failed" });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Fluide AI running on port 3000");
});
