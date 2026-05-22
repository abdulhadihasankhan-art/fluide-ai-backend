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

/* ========================= */
/* REAL TEF ADVERTISEMENT BANK */
/* ========================= */
const tefAdvertisements = [
  {
    title: "Appartement à louer — Montreal",
    content: `📋 ANNONCE
    
Appartement 3½ à louer
📍 Plateau-Mont-Royal, Montréal
💰 1 200$/mois + électricité
🛏️ 2 chambres | 1 salle de bain
🐾 Animaux: Non
🚇 Métro Laurier: 5 min à pied
📞 Disponible: 1er juillet

Contactez: Marie Tremblay`
  },
  {
    title: "Offre d'emploi — Serveur/Serveuse",
    content: `📋 OFFRE D'EMPLOI

Serveur/Serveuse recherché(e)
🏪 Restaurant Le Petit Bistro
📍 Vieux-Montréal
💰 15$/heure + pourboires
⏰ Temps partiel: soirs et weekends
📚 Expérience: 1 an minimum
🗣️ Français obligatoire | Anglais un atout
📞 Appelez entre 14h-17h`
  },
  {
    title: "Cours de yoga — Studio Zen",
    content: `📋 ANNONCE

Cours de Yoga pour Débutants
🧘 Studio Zen Montréal
📍 Rue Sainte-Catherine Ouest
💰 60$/mois (4 cours)
⏰ Mardi & Jeudi: 18h-19h30
👥 Maximum 10 personnes
🎁 Premier cours GRATUIT
📞 Inscription obligatoire`
  },
  {
    title: "Vente de voiture",
    content: `📋 VENTE

Toyota Corolla 2019 à vendre
💰 14 500$ négociable
🚗 85 000 km | Automatique
⛽ Essence | Climatisation
🔧 Récemment révisée
📋 2 propriétaires | Carfax disponible
📍 Laval, Québec
📞 Disponible weekends seulement`
  },
  {
    title: "Colocation cherchée",
    content: `📋 COLOCATION

Chambre disponible dans colocation
📍 Rosemont, Montréal
💰 650$/mois tout inclus (WiFi, chauffage)
🛏️ Chambre meublée
👥 3 colocataires (2F, 1H)
🐾 Chat accepté
🚇 Bus 97: 2 min
📅 Disponible: immédiatement
⚠️ Non-fumeur obligatoire`
  },
  {
    title: "Club de randonnée",
    content: `📋 CLUB

Club de Randonnée Les Montagnards
🥾 Randonnées chaque weekend
📍 Départ: Parc du Mont-Royal
💰 25$/mois | Premier essai gratuit
🎯 Tous niveaux acceptés
👥 Groupe de 15-20 personnes
🗓️ Prochaine sortie: samedi 9h
📞 Inscription avant vendredi`
  },
  {
    title: "Garderie privée",
    content: `📋 GARDERIE

Garderie familiale agréée
👶 Enfants de 0-5 ans
📍 Verdun, Montréal
💰 35$/jour (7h-17h)
👩‍🏫 Éducatrice diplômée | 10 ans expérience
🍎 Repas inclus
🗣️ Environnement bilingue
📋 Places limitées: 2 disponibles`
  },
  {
    title: "Cours de conduite",
    content: `📋 ÉCOLE DE CONDUITE

Auto-École Sécurité Plus
🚗 Cours théoriques + pratiques
💰 800$ — forfait complet
⏰ Horaires flexibles: jour/soir
📍 Succursales: Laval, Longueuil, MTL
✅ Taux de réussite: 89%
🎓 Moniteurs certifiés
📞 Réservation en ligne disponible`
  }
];

/* ========================= */
/* REAL TCF TOPICS BANK */
/* ========================= */
const tcfTopics = {
  sectionA: [
    "Parlez-moi de votre famille.",
    "Décrivez votre ville natale.",
    "Quels sont vos loisirs préférés?",
    "Parlez de votre travail ou vos études.",
    "Qu'est-ce que vous aimez faire le weekend?"
  ],
  sectionB: [
    "Vous voulez louer un appartement — posez des questions au propriétaire.",
    "Vous cherchez un emploi dans un restaurant — renseignez-vous.",
    "Vous voulez vous inscrire à un cours de français — demandez des informations.",
    "Vous voulez acheter une voiture d'occasion — posez des questions au vendeur.",
    "Vous voulez rejoindre un club de sport — renseignez-vous sur les modalités."
  ],
  sectionC: [
    "Les avantages et inconvénients des réseaux sociaux.",
    "L'importance de l'apprentissage des langues.",
    "Le télétravail: pour ou contre?",
    "Comment les technologies changent notre vie quotidienne.",
    "L'importance de protéger l'environnement.",
    "La vie en ville vs la vie à la campagne.",
    "Parlez d'un voyage mémorable."
  ]
};

/* ========================= */
/* TEF CONVINCING SCENARIOS */
/* ========================= */
const tefSectionB = [
  "Convainquez votre colocataire d'adopter un chat alors qu'il n'aime pas les animaux.",
  "Persuadez votre ami de venir faire du camping avec vous ce weekend alors qu'il préfère rester chez lui.",
  "Convainquez votre patron de vous accorder une semaine de vacances supplémentaire.",
  "Persuadez votre famille d'aller au restaurant français au lieu du restaurant habituel.",
  "Convainquez votre ami d'apprendre le français avec vous.",
  "Persuadez votre colocataire de réduire sa consommation d'électricité pour économiser.",
  "Convainquez votre collègue de faire du covoiturage avec vous pour aller au travail.",
  "Persuadez votre ami de s'inscrire à une salle de sport avec vous."
];

app.post("/api/ai", async (req, res) => {
  try {

    const { message, level, mode, history } = req.body;
    const lowerMsg = message.toLowerCase().trim();

    let modeInstructions = "";
    let finalMessage = message;

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

      // Pick random advertisement and scenario
      const randomAd = tefAdvertisements[Math.floor(Math.random() * tefAdvertisements.length)];
      const randomScenarioB = tefSectionB[Math.floor(Math.random() * tefSectionB.length)];

      modeInstructions = `
You are a REAL TEF Canada oral examiner. You are strict, professional and encouraging.
Student level: ${level}

REAL TEF CANADA ADVERTISEMENT BANK (use these realistic formats):
${JSON.stringify(tefAdvertisements.slice(0,4), null, 2)}

━━━━━━━━━━━━━━━━━━━━━
TEF SECTION A — ASKING QUESTIONS
━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULES:
- Show ONE realistic advertisement (use the format above or create similar)
- IMMEDIATELY become the character from the ad — greet naturally
- Example: "Allô, bonjour! Vous appelez pour l'appartement?"
- Wait for student to ask questions — NEVER ask questions first
- Answer as the real character — stay in role completely
- Be realistic: give some info, withhold some to make student ask more
- Push student to ask varied, detailed questions

ADVERTISEMENT FORMAT to use:
${randomAd.content}

After student asks questions, stay in character and respond naturally.

NEVER do: comprehension questions, numbered questions, school exercises.

Response length by level:
A1: 20-40 words | A2: 40-70 words | B1: 80-120 words | B2: 120-180 words | C1/C2: 200+ words

━━━━━━━━━━━━━━━━━━━━━
SCORING — when student says "score" or "évalue-moi":
━━━━━━━━━━━━━━━━━━━━━

Analyze the ENTIRE conversation carefully, then give:

📊 TEF Section A — Résultats officiels
━━━━━━━━━━━━━━━━━━━━━
🎯 Score global: X/10

📝 Qualité des questions: X/10
   → [Specific feedback — did they ask varied questions? Did they use question words correctly?]

🗣️ Fluidité et aisance: X/10
   → [Specific feedback — hesitations? Natural flow?]

📚 Richesse du vocabulaire: X/10
   → [Specific words they used well or should improve]

✅ Précision grammaticale: X/10
   → [Specific grammar errors found in conversation]

🔗 Connecteurs et structures: X/10
   → [Did they use est-ce que, qu'est-ce que, combien, etc. correctly?]

━━━━━━━━━━━━━━━━━━━━━
💡 Erreurs principales détectées:
• [Quote actual error from conversation] → Correction: [correct version]
• [Quote actual error] → Correction: [correct version]

✨ Points forts observés:
• [Specific positive point from conversation]

📈 Pour progresser:
• [Specific actionable advice]
• [Specific actionable advice]

🏆 Niveau TEF estimé: CLB [4/5/6/7/8/9/10]
   (CLB 4-5 = A2 | CLB 6-7 = B1 | CLB 8-9 = B2 | CLB 10+ = C1/C2)
━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━
TEF SECTION B — CONVINCING TASK
━━━━━━━━━━━━━━━━━━━━━

Scenario to use: ${randomScenarioB}

RULES:
- Present the scenario clearly to student
- Play the role of the person being convinced
- Start skeptical — make student work to convince you
- React naturally to their arguments — be moved by good arguments
- Push back with realistic objections
- After 4-6 exchanges, you can be "partially convinced" if arguments are good

NEVER give up too easily — student must use varied arguments and connectors.

When student says "score":
📊 TEF Section B — Résultats officiels
━━━━━━━━━━━━━━━━━━━━━
🎯 Score global: X/10

💬 Force de conviction: X/10
   → [Were their arguments logical and varied?]

🗣️ Fluidité et aisance: X/10
   → [Natural speech? Hesitations?]

📚 Richesse du vocabulaire: X/10
   → [Specific vocabulary used]

✅ Précision grammaticale: X/10
   → [Actual errors found]

🔗 Connecteurs utilisés: X/10
   → [Did they use: cependant, de plus, par ailleurs, en revanche, c'est pourquoi?]

━━━━━━━━━━━━━━━━━━━━━
💡 Erreurs principales:
• [Actual error] → [Correction]

✨ Bons arguments utilisés:
• [Specific good argument they made]

📈 Pour améliorer:
• [Specific advice]

🏆 Niveau TEF estimé: CLB [X]
━━━━━━━━━━━━━━━━━━━━━

If student says "sample answer":
→ Show a STRONG natural TEF answer for the current scenario
→ Use: cependant, par ailleurs, de plus, en revanche, c'est pourquoi, il faut dire que
→ Show: Version simple (B1) + Version avancée (B2/C1)
→ Explain 3 key connectors used
`;
    }

    else if(mode === "tcf"){

      const randomSectionA = tcfTopics.sectionA[Math.floor(Math.random() * tcfTopics.sectionA.length)];
      const randomSectionB = tcfTopics.sectionB[Math.floor(Math.random() * tcfTopics.sectionB.length)];
      const randomSectionC = tcfTopics.tcfTopics ? tcfTopics.tcfTopics.sectionC[0] : tcfTopics.sectionC[Math.floor(Math.random() * tcfTopics.sectionC.length)];

      modeInstructions = `
You are a REAL TCF oral examiner. Professional, strict but encouraging.
Student level: ${level}

REAL TCF TOPIC BANK:
Section A topics: ${JSON.stringify(tcfTopics.sectionA)}
Section B topics: ${JSON.stringify(tcfTopics.sectionB)}
Section C topics: ${JSON.stringify(tcfTopics.sectionC)}

━━━━━━━━━━━━━━━━━━━━━
TCF SECTION A — INTRODUCTION (3 minutes)
━━━━━━━━━━━━━━━━━━━━━
Starting question: "${randomSectionA}"
- Ask natural follow-up questions
- Dig deeper — don't accept short answers
- React naturally like a real examiner

━━━━━━━━━━━━━━━━━━━━━
TCF SECTION B — ASKING QUESTIONS (4 minutes)
━━━━━━━━━━━━━━━━━━━━━
Scenario: "${randomSectionB}"
- Present situation clearly
- Play the character role
- Wait for student's questions
- Answer naturally — give some info, withhold some

━━━━━━━━━━━━━━━━━━━━━
TCF SECTION C — MONOLOGUE (3 minutes)
━━━━━━━━━━━━━━━━━━━━━
Topic: "${randomSectionC}"
- Present topic clearly
- Let student speak for 2-3 minutes
- After they finish, ask ONE follow-up question

━━━━━━━━━━━━━━━━━━━━━
SCORING — when student says "score":
━━━━━━━━━━━━━━━━━━━━━

📊 TCF Section [A/B/C] — Résultats officiels
━━━━━━━━━━━━━━━━━━━━━
🎯 Score global: X/10

🗣️ Fluidité et aisance: X/10
   → [Specific feedback]

📚 Richesse du vocabulaire: X/10
   → [Specific words used well or to improve]

✅ Précision grammaticale: X/10
   → [Actual errors with corrections]

🧠 Cohérence et organisation: X/10
   → [Was response organized? Logical flow?]

🔗 Connecteurs utilisés: X/10
   → [Specific connectors used or missing]

━━━━━━━━━━━━━━━━━━━━━
💡 Erreurs détectées:
• [Actual error] → [Correction]

✨ Points forts:
• [Specific positive point]

📈 Conseils pour progresser:
• [Specific actionable advice]

🏆 Niveau TCF estimé: [A1/A2/B1/B2/C1/C2]
   Score approximatif: [X]/699
━━━━━━━━━━━━━━━━━━━━━
`;
    }

    else if(mode === "speaking"){
      modeInstructions = `
You are a speaking coach. Student level: ${level}
- Simulate realistic French conversations
- Correct grammar and pronunciation mistakes
- Encourage the student
- Every session must feel NEW and different
- A1/A2: simple French, short questions, English support
- B1/B2: detailed answers, connectors, opinions
- C1/C2: advanced discussions, debates, abstract topics
Start with a unique engaging French question or roleplay situation.
`;
    }

    else if(mode === "writing"){

      const writingTopics = {
        "A1": [
          "Décrivez votre chambre. (Describe your room)",
          "Parlez de votre famille. (Talk about your family)",
          "Décrivez votre animal de compagnie préféré. (Describe your favorite pet)",
          "Parlez de vos couleurs préférées. (Talk about your favorite colors)",
          "Décrivez votre école ou votre lieu de travail. (Describe your school or workplace)"
        ],
        "A2": [
          "Décrivez votre journée typique. (Describe your typical day)",
          "Parlez de votre meilleur ami. (Talk about your best friend)",
          "Décrivez vos vacances préférées. (Describe your favorite vacation)",
          "Parlez de vos hobbies. (Talk about your hobbies)",
          "Décrivez un repas que vous aimez préparer. (Describe a meal you like to cook)"
        ],
        "B1": [
          "Quels sont les avantages et inconvénients de vivre en ville?",
          "Parlez d'un voyage mémorable que vous avez fait.",
          "Décrivez un problème que vous avez résolu récemment.",
          "Quelles sont les qualités d'un bon ami?",
          "Parlez de l'importance de l'exercice physique dans la vie quotidienne."
        ],
        "B2": [
          "Les réseaux sociaux: bienfait ou danger pour la société?",
          "Le télétravail a-t-il plus d'avantages que d'inconvénients?",
          "Faut-il limiter l'utilisation des smartphones chez les jeunes?",
          "L'intelligence artificielle va-t-elle remplacer les humains au travail?",
          "Quelle est l'importance de préserver les langues minoritaires?"
        ],
        "C1": [
          "Dans quelle mesure la mondialisation menace-t-elle les cultures locales?",
          "L'éducation en ligne peut-elle remplacer l'enseignement traditionnel?",
          "Le réchauffement climatique: responsabilité individuelle ou collective?",
          "La liberté d'expression a-t-elle des limites dans une société démocratique?",
          "Les inégalités économiques sont-elles inévitables dans un système capitaliste?"
        ],
        "C2": [
          "Analysez l'impact de la désinformation sur les démocraties contemporaines.",
          "Dans quelle mesure l'art peut-il être considéré comme un outil politique?",
          "La croissance économique est-elle compatible avec le développement durable?",
          "Réfléchissez sur le paradoxe de la liberté dans les sociétés modernes.",
          "L'intelligence artificielle remet-elle en question la notion de créativité humaine?"
        ]
      };

      const topics = writingTopics[level] || writingTopics["B1"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      modeInstructions = `
You are an expert French writing tutor. Student level: ${level}

WRITING TOPIC BANK FOR THIS LEVEL:
${JSON.stringify(topics, null, 2)}

━━━━━━━━━━━━━━━━━━━━━
BEHAVIOR RULES:
━━━━━━━━━━━━━━━━━━━━━

IF student asks for a topic OR says "give me a topic" or "sujet" or "topic":
→ Give this topic: "${randomTopic}"
→ Give clear writing instructions adapted to ${level}
→ Tell them minimum word count:
   A1/A2: 30-50 words
   B1: 80-120 words
   B2: 150-200 words
   C1/C2: 200-300 words

IF student submits French text to correct:
→ Use this EXACT correction format:

━━━━━━━━━━━━━━━━━━━━━
✍️ Writing Correction Report
━━━━━━━━━━━━━━━━━━━━━

📊 Scores:
• Grammar: X/10
• Vocabulary: X/10
• Structure: X/10
• Overall: X/10

━━━━━━━━━━━━━━━━━━━━━
❌ Errors Found:
━━━━━━━━━━━━━━━━━━━━━
[List EVERY error found, format:]
1. ❌ "[exact wrong phrase]"
   ✅ Correction: "[correct version]"
   💡 Why: [brief explanation in English]

2. ❌ "[exact wrong phrase]"
   ✅ Correction: "[correct version]"
   💡 Why: [brief explanation]

[continue for all errors]

━━━━━━━━━━━━━━━━━━━━━
✅ Corrected Version:
━━━━━━━━━━━━━━━━━━━━━
[Provide the FULL corrected text with all mistakes fixed]

━━━━━━━━━━━━━━━━━━━━━
🚀 Improved Version (with better vocabulary):
━━━━━━━━━━━━━━━━━━━━━
[Rewrite with richer vocabulary, better connectors, more natural French]

━━━━━━━━━━━━━━━━━━━━━
📚 Key Vocabulary to Learn:
━━━━━━━━━━━━━━━━━━━━━
[5 useful words/expressions from the corrected text with English meanings]

━━━━━━━━━━━━━━━━━━━━━
💡 Top 3 Things to Remember:
━━━━━━━━━━━━━━━━━━━━━
1. [Most important grammar rule they need]
2. [Vocabulary tip]
3. [Style/structure tip]
━━━━━━━━━━━━━━━━━━━━━

LEVEL-SPECIFIC RULES:
A1/A2: Use simple English explanations. Be very encouraging. Focus on basic verb conjugation and gender agreements.
B1/B2: Mostly French explanations. Focus on tenses, connectors (cependant, de plus, par ailleurs), sentence variety.
C1/C2: Full French. Focus on sophisticated vocabulary, style, nuance, and advanced structures.

IMPORTANT:
- ALWAYS correct EVERY single error — do not skip any
- Be specific — quote the exact wrong phrase
- Never be vague like "improve your vocabulary" — show exactly which words to improve
- Score honestly — do not give 9/10 for average work
- After correction, ask: "Voulez-vous un nouveau sujet ou voulez-vous réécrire ce texte?"
`;
    }

    else if(mode === "vocabulary"){
      modeInstructions = `
You are a French vocabulary coach. Student level: ${level}
- Teach useful French vocabulary
- Provide: French word, English meaning, pronunciation tip, example sentence
- Generate fresh vocabulary every session
- If student says quiz: create interactive vocabulary quiz
- Group words by theme for better retention
`;
    }

    else if(mode === "translator"){
      modeInstructions = `
You are a French-English translator.
- Detect language automatically
- Translate English to French or French to English
- Correct grammar before translating
- Provide pronunciation help (show syllables)
- Give 1 example sentence
- Note formal vs informal versions if different
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
You are Fluide AI, an advanced French tutor and TEF/TCF Canada preparation coach.
Student level: ${level}

${modeInstructions}

CORE RULES:
1. Adapt strictly to level: A1/A2 → easy French + English support; B1/B2 → mostly French; C1/C2 → full French
2. Always correct mistakes politely with the correct version
3. Sound human and natural — never robotic
4. Be encouraging but honest in scoring
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20),
      { role: "user", content: finalMessage }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_tokens: 1200,
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

// Server jaagta rahe
setInterval(() => {
  fetch("https://fluide-ai-backend-4.onrender.com/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "." })
  }).catch(() => {});
}, 840000);

app.listen(3000, "0.0.0.0", () => {
  console.log("Fluide AI running on port 3000");
});
