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
app.get("/test-db", async(req,res)=>{

  try{

    const result =

    await pool.query(
      "SELECT NOW()"
    );

    res.json({

      success:true,

      time: result.rows[0]

    });

  }

  catch(error){

    console.log(error);

    res.status(500).json({

      success:false,

      error:error.message

    });

  }

});

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

app.post("/api/signup", async(req,res)=>{

  try{

    const {

      name,

      email,

      password

    } = req.body;

    const existingUser =

    await pool.query(

      "SELECT * FROM users WHERE email = $1",

      [email]

    );

    if(

      existingUser.rows.length > 0

    ){

      return res.status(400).json({

        error:"User already exists"

      });

    }

    const hashedPassword =

    await bcrypt.hash(password,10);

    const newUser =

    await pool.query(

      `

      INSERT INTO users

      (name,email,password)

      VALUES ($1,$2,$3)

      RETURNING *

      `,

      [

        name,

        email,

        hashedPassword

      ]

    );

    res.json({

      success:true,

      user:newUser.rows[0]

    });

  }

  catch(error){

    console.log(error);

    res.status(500).json({

      error:"Signup failed"

    });

  }

});

app.listen(3000,"0.0.0.0", () => {

  console.log(
    "🚀 Fluide AI running at http://192.168.29.202:3000"
  );

});