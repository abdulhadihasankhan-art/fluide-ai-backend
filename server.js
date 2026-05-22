import dotenv from "dotenv";
dotenv.config();
import express from "express";
import ttsRoute from "./tts.js";
import fetch from "node-fetch";
import cors from "cors";
import pool from "./db.js";
import bcrypt from "bcrypt";

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

// TEF Advertisement Bank
const tefAds = [
  { title: "Appartement 3.5 a louer - Montreal", content: "Appartement 3.5 a louer\nPlateau-Mont-Royal, Montreal\n1200$/mois + electricite\n2 chambres | 1 salle de bain\nAnimaux: Non\nMetro Laurier: 5 min\nDisponible: 1er juillet\nContact: Marie Tremblay" },
  { title: "Offre d'emploi - Serveur/Serveuse", content: "Serveur/Serveuse recherche\nRestaurant Le Petit Bistro\nVieux-Montreal\n15$/heure + pourboires\nTemps partiel: soirs et weekends\nExperience: 1 an minimum\nFrancais obligatoire" },
  { title: "Cours de yoga - Studio Zen", content: "Cours de Yoga pour Debutants\nStudio Zen Montreal\n60$/mois (4 cours)\nMardi et Jeudi: 18h-19h30\nMaximum 10 personnes\nPremier cours GRATUIT\nInscription obligatoire" },
  { title: "Vente de voiture", content: "Toyota Corolla 2019 a vendre\n14 500$ negociable\n85 000 km | Automatique\nEssence | Climatisation\nRecemment revisee\nDisponible weekends seulement" },
  { title: "Colocation disponible", content: "Chambre disponible en colocation\nRosemont, Montreal\n650$/mois tout inclus (WiFi, chauffage)\nChambre meublee\n3 colocataires\nDisponible: immediatement\nNon-fumeur obligatoire" },
  { title: "Club de randonnee", content: "Club de Randonnee Les Montagnards\nRandonnees chaque weekend\nDepart: Parc du Mont-Royal\n25$/mois | Premier essai gratuit\nTous niveaux acceptes\nProchaine sortie: samedi 9h" },
  { title: "Garderie privee", content: "Garderie familiale agreee\nEnfants de 0-5 ans\nVerdun, Montreal\n35$/jour (7h-17h)\nEducatrice diplomee | 10 ans experience\nRepas inclus\nPlaces limitees: 2 disponibles" },
  { title: "Ecole de conduite", content: "Auto-Ecole Securite Plus\nCours theoriques + pratiques\n800$ - forfait complet\nHoraires flexibles: jour/soir\nTaux de reussite: 89%\nMoniteurs certifies" }
];

// TEF Section B Scenarios
const tefScenarios = [
  "Convainquez votre colocataire d'adopter un chat alors qu'il n'aime pas les animaux.",
  "Persuadez votre ami de venir faire du camping ce weekend.",
  "Convainquez votre patron de vous accorder une semaine de vacances supplementaire.",
  "Persuadez votre famille d'aller au restaurant francais.",
  "Convainquez votre ami d'apprendre le francais avec vous.",
  "Persuadez votre collegue de faire du covoiturage avec vous.",
  "Convainquez votre colocataire de reduire sa consommation d'electricite.",
  "Persuadez votre ami de s'inscrire a une salle de sport avec vous."
];

// TCF Topics
const tcfTopicsA = ["Parlez-moi de votre famille.", "Decrivez votre ville natale.", "Quels sont vos loisirs preferes?", "Parlez de votre travail ou vos etudes.", "Qu'est-ce que vous aimez faire le weekend?"];
const tcfTopicsB = ["Vous voulez louer un appartement - posez des questions au proprietaire.", "Vous cherchez un emploi dans un restaurant - renseignez-vous.", "Vous voulez vous inscrire a un cours de francais.", "Vous voulez acheter une voiture d'occasion."];
const tcfTopicsC = ["Les avantages et inconvenients des reseaux sociaux.", "L'importance de l'apprentissage des langues.", "Le teletravail: pour ou contre?", "Comment les technologies changent notre vie.", "L'importance de proteger l'environnement.", "La vie en ville vs la campagne."];

// Speaking Topics
const speakingTopicsMap = {
  "A1": ["Comment tu t'appelles?", "Tu habites ou?", "Tu as des freres et soeurs?", "Tu aimes quoi comme nourriture?"],
  "A2": ["Decris ta journee typique.", "Qu'est-ce que tu fais le weekend?", "Parle-moi de ta famille.", "Tu aimes voyager?"],
  "B1": ["Quels sont tes loisirs preferes et pourquoi?", "Parle d'un film que tu as aime.", "Decris un voyage memorable.", "Comment tu imagines ta vie dans 5 ans?"],
  "B2": ["Les reseaux sociaux: avantages et inconvenients?", "Le teletravail: bonne ou mauvaise idee?", "Comment les technologies changent nos relations?"],
  "C1": ["Dans quelle mesure les medias influencent-ils notre opinion?", "Immigration: richesse ou probleme?", "Croissance economique et environnement."],
  "C2": ["Le paradoxe de la liberte dans les societes democratiques.", "L'IA redefinie-t-elle la notion de travail?", "Mondialisation: homogeneisation ou enrichissement?"]
};

// Writing Topics
const writingTopicsMap = {
  "A1": ["Decrivez votre chambre.", "Parlez de votre famille.", "Decrivez votre animal prefere."],
  "A2": ["Decrivez votre journee typique.", "Parlez de votre meilleur ami.", "Decrivez vos vacances preferees."],
  "B1": ["Les avantages et inconvenients de vivre en ville?", "Parlez d'un voyage memorable.", "Quelles sont les qualites d'un bon ami?"],
  "B2": ["Les reseaux sociaux: bienfait ou danger?", "Le teletravail: plus d'avantages que d'inconvenients?", "L'IA va-t-elle remplacer les humains au travail?"],
  "C1": ["La mondialisation menace-t-elle les cultures locales?", "L'education en ligne peut-elle remplacer l'enseignement?", "Liberte d'expression et democratie."],
  "C2": ["L'impact de la desinformation sur les democraties.", "L'art comme outil politique.", "Croissance economique et developpement durable."]
};

// Listening Scripts
const listeningMap = {
  "A1": [{ script: "Bonjour! Je m'appelle Marie. J'ai 25 ans. J'habite a Paris. J'aime le cafe et les croissants. Je travaille dans un bureau.", questions: ["Quel est le prenom? / What is the first name?", "Quel age a-t-elle? / How old is she?", "Ou habite-t-elle? / Where does she live?"] }],
  "A2": [{ script: "Hier, je suis allee au marche avec ma mere. Nous avons achete des legumes, du pain et du fromage. Ensuite, nous avons mange dans un restaurant pres de chez nous.", questions: ["Avec qui est-elle allee au marche? / Who did she go with?", "Qu'est-ce qu'elles ont achete? / What did they buy?", "Qu'est-ce qu'elles ont fait apres? / What did they do after?"] }],
  "B1": [{ script: "Bienvenue a la gare de Lyon. Le train TGV numero 6201 a destination de Marseille partira voie 8 dans 15 minutes. Les voyageurs sont pries de se presenter au quai munis de leur billet. Attention, ce train ne s'arrete pas a Valence.", questions: ["Quel est le numero du train? / What is the train number?", "Quelle est la destination? / What is the destination?", "De quelle voie part le train? / From which platform?", "Dans combien de temps? / In how many minutes?"] }],
  "B2": [{ script: "Dans le debat sur l'intelligence artificielle, plusieurs experts s'affrontent. Les partisans d'une IA libre estiment que trop de contraintes freineraient l'innovation. Les defenseurs d'une regulation stricte soulignent les risques pour l'emploi. Le Parlement europeen a adopte l'AI Act.", questions: ["Quel est le sujet? / What is the topic?", "Quels sont les deux camps? / What are the two sides?", "Pourquoi certains s'opposent aux contraintes? / Why do some oppose restrictions?", "Qu'a adopte le Parlement? / What did Parliament adopt?"] }],
  "C1": [{ script: "La question de la souverainete alimentaire souleve des enjeux fondamentaux. Face a la mondialisation agricole, certains economistes plaident pour le protectionnisme, arguant que la dependance aux importations fragilise la securite nationale. D'autres rappellent que le libre-echange a contribue a reduire la pauvrete.", questions: ["Quelle tension le texte explore-t-il? / What tension does it explore?", "Quels arguments pour le protectionnisme? / Arguments for protectionism?", "Quelle critique est opposee? / What counterargument?", "Comment l'auteur caracterise ce debat? / How does the author characterize it?"] }]
};

// Reading Texts
const readingMap = {
  "A1": [{ title: "Mon appartement", text: "Je m'appelle Thomas. J'habite dans un appartement a Lyon. Mon appartement est petit mais confortable. Il y a une chambre, un salon, une cuisine et une salle de bain. Dans ma chambre, il y a un lit, une armoire et un bureau. J'aime mon appartement parce qu'il est pres de mon travail.", questions: ["Ou habite Thomas? / Where does Thomas live?", "Comment est son appartement? / What is his apartment like?", "Qu'est-ce qu'il y a dans sa chambre? / What is in his bedroom?", "Pourquoi il aime son appartement? / Why does he like it?"] }],
  "A2": [{ title: "Les vacances de Julien", text: "L'ete dernier, Julien est alle en vacances en Bretagne. Ils ont voyage en voiture pendant 4 heures. Ils ont loue une maison pres de la mer. Chaque matin, ils allaient a la plage. Julien a appris a faire du surf.", questions: ["Ou est alle Julien? / Where did Julien go?", "Comment ont-ils voyage? / How did they travel?", "Qu'est-ce que Julien a appris? / What did Julien learn?"] }],
  "B1": [{ title: "Le covoiturage en France", text: "Le covoiturage connait un essor considerable en France. De plus en plus de Francais choisissent de partager leurs voitures pour des raisons economiques et ecologiques. Des applications comme BlaBlaCar ont revolutionne ce mode de transport. Selon une etude, 20% des Francais utilisent regulierement le covoiturage.", questions: ["Pourquoi le covoiturage est populaire? / Why is carpooling popular?", "Quel pourcentage l'utilise? / What percentage use it?", "Quel role joue BlaBlaCar? / What role does BlaBlaCar play?"] }],
  "B2": [{ title: "IA et emploi", text: "La revolution numerique souleve des questions sur l'avenir du travail. Certains economistes predisent la disparition de 40% des emplois d'ici 2030. Les secteurs les plus menaces sont la comptabilite et la logistique. Les professions necessitant creativite semblent mieux protegees. Les gouvernements s'interrogent sur un revenu universel.", questions: ["Quel pourcentage d'emplois menaces? / What percentage at risk?", "Quels secteurs sont menaces? / Which sectors?", "Quels emplois sont proteges? / Which jobs are protected?", "Quelles solutions envisagees? / What solutions?"] }],
  "C1": [{ title: "Democratie et reseaux sociaux", text: "Les democraties font face a un paradoxe: les technologies censees favoriser l'information sont des vecteurs de desinformation. Les algorithmes creent des chambres d'echo qui renforcent les convictions et marginalisent les opinions moderees. Des etudes montrent une correlation entre l'usage des reseaux sociaux et la mefiance envers les institutions.", questions: ["Quel paradoxe l'auteur identifie? / What paradox?", "Comment fonctionnent les algorithmes? / How do algorithms work?", "Quelle correlation est mentionnee? / What correlation?", "Quel est le ton du texte? / What is the tone?"] }]
};

// Grammar Curriculum
const grammarMap = {
  "A1": ["Le present de l'indicatif (etre, avoir, aller)", "Les articles definis et indefinis", "La negation (ne...pas)", "Les pronoms sujets", "Les adjectifs possessifs", "Le genre des noms", "Les verbes en -ER"],
  "A2": ["Le passe compose avec avoir", "Le passe compose avec etre", "L'imparfait - introduction", "Les verbes pronominaux", "Les prepositions de lieu", "Le futur proche", "Les adjectifs - accord"],
  "B1": ["L'imparfait vs le passe compose", "Le futur simple", "Le conditionnel present", "Les pronoms COD et COI", "Les connecteurs logiques", "La comparaison", "La cause et la consequence"],
  "B2": ["Le subjonctif present", "Le conditionnel passe", "Les pronoms relatifs", "La voix passive", "Le discours indirect", "Les expressions idiomatiques", "Les nuances de sens"],
  "C1": ["Le subjonctif passe", "Les temps litteraires", "La concession", "Les structures emphatiques", "Les nominalisations", "Le style indirect libre", "Les registres de langue"],
  "C2": ["La stylistique avancee", "Les figures de style", "L'argumentation sophistiquee", "Les faux amis", "Les nuances lexicales", "L'ecriture academique", "La rhetorique francaise"]
};

app.post("/api/ai", async (req, res) => {
  try {
    const { message, level, mode, history } = req.body;

    let modeInstructions = "";
    let finalMessage = message;

    if(mode === "level-test"){
      modeInstructions = "You are evaluating the student French level. Analyze grammar, vocabulary, fluency, sentence structure. Determine level: A1, A2, B1, B2, C1 or C2. Ask natural follow-up questions. Do not reveal level immediately. After enough messages, estimate the level and explain strengths and weaknesses.";
    }

    else if(mode === "tef"){
      const randomAd = tefAds[Math.floor(Math.random() * tefAds.length)];
      const randomScenario = tefScenarios[Math.floor(Math.random() * tefScenarios.length)];

      modeInstructions = "You are a REAL TEF Canada oral examiner. Student level: " + level + "\n\n"
        + "TEF SECTION A - ASKING QUESTIONS:\n"
        + "Show this advertisement:\n" + randomAd.content + "\n\n"
        + "IMMEDIATELY act as the seller and greet the student naturally.\n"
        + "Wait for student to ask questions. NEVER create comprehension exercises.\n"
        + "The STUDENT leads the conversation by asking questions.\n\n"
        + "TEF SECTION B - CONVINCING TASK:\n"
        + "Scenario: " + randomScenario + "\n"
        + "Play the person being convinced. Push back naturally.\n\n"
        + "When student says score give detailed scores out of 10 for:\n"
        + "Overall, Question Quality, Fluency, Vocabulary, Grammar, Connectors\n"
        + "Give TEF CLB level estimate.\n\n"
        + "If student says sample answer, provide a strong natural TEF answer with connectors.";
    }

    else if(mode === "tcf"){
      const topicA = tcfTopicsA[Math.floor(Math.random() * tcfTopicsA.length)];
      const topicB = tcfTopicsB[Math.floor(Math.random() * tcfTopicsB.length)];
      const topicC = tcfTopicsC[Math.floor(Math.random() * tcfTopicsC.length)];

      modeInstructions = "You are a REAL TCF oral examiner. Student level: " + level + "\n\n"
        + "Section A - Introduction: Ask: " + topicA + "\n"
        + "Section B - Questions: Scenario: " + topicB + "\n"
        + "Section C - Monologue: Topic: " + topicC + "\n\n"
        + "Interact naturally as a real examiner.\n"
        + "When student says score give detailed scores out of 10 for:\n"
        + "Overall, Fluency, Vocabulary, Grammar, Coherence\n"
        + "Give TCF level estimate (A1 to C2) and approximate score out of 699.";
    }

    else if(mode === "speaking"){
      const topicsList = speakingTopicsMap[level] || speakingTopicsMap["B1"];
      const topic = topicsList[Math.floor(Math.random() * topicsList.length)];
      const isBeginnerLevel = (level === "A1" || level === "A2");

      modeInstructions = "You are an expert French speaking coach. Student level: " + level + "\n\n"
        + "Start with this topic: " + topic + "\n\n"
        + (isBeginnerLevel
          ? "IMPORTANT: Write French text first, then put English translation in brackets on next line.\nExample: Bonjour! Comment tu t'appelles?\n(Hello! What is your name?)\nALL French must have English translation for this beginner level.\n"
          : "Respond ONLY in French. Occasionally add pronunciation tips in brackets.\n")
        + "\nCorrect mistakes gently. Show correct version naturally in conversation.\n"
        + "Every session must feel fresh and different.\n"
        + "Adapt speed and complexity to level " + level + ".\n"
        + "When student says stop or fin give speaking summary with scores out of 10.";
    }

    else if(mode === "writing"){
      const topicsList = writingTopicsMap[level] || writingTopicsMap["B1"];
      const topic = topicsList[Math.floor(Math.random() * topicsList.length)];

      modeInstructions = "You are an expert French writing tutor. Student level: " + level + "\n\n"
        + "Suggested topic: " + topic + "\n\n"
        + "If student asks for a topic, give: " + topic + "\n"
        + "If student submits French text, correct it using this format:\n"
        + "1. Scores: Grammar/10, Vocabulary/10, Structure/10, Overall/10\n"
        + "2. Errors Found: list every error with correction and explanation\n"
        + "3. Corrected Version: full corrected text\n"
        + "4. Improved Version: richer vocabulary and better connectors\n"
        + "5. Key Vocabulary: 5 useful words with meanings\n"
        + "6. Top 3 Things to Remember\n\n"
        + "Be specific. Quote exact wrong phrases. Score honestly.\n"
        + "After correction ask if they want a new topic or to rewrite.";
    }

    else if(mode === "vocabulary"){
      modeInstructions = "You are a French vocabulary coach. Student level: " + level + "\n"
        + "Teach useful French vocabulary. Always provide: French word, English meaning, pronunciation tip, example sentence.\n"
        + "Generate fresh vocabulary every session. Avoid repeating the same words.\n"
        + "If student says quiz, create interactive vocabulary quiz.\n"
        + "Group words by theme for better retention.";
    }

    else if(mode === "listening"){
      const scriptsList = listeningMap[level] || listeningMap["B1"];
      const scriptItem = scriptsList[Math.floor(Math.random() * scriptsList.length)];
      const questionsText = scriptItem.questions.map((q, i) => (i+1) + ". " + q).join("\n");
      const isBeginnerLevel = (level === "A1" || level === "A2");

      modeInstructions = "You are a French listening comprehension teacher. Student level: " + level + "\n\n"
        + (isBeginnerLevel
          ? "IMPORTANT FOR A1/A2: When presenting the script, write each French sentence then put the English translation in brackets on the next line.\n"
          + "Example format:\nBonjour! Je m'appelle Marie.\n(Hello! My name is Marie.)\nJ'ai 25 ans.\n(I am 25 years old.)\n\n"
          + "This helps beginners understand while learning. The audio will only speak the French text.\n\n"
          : "Present the script in French only. No translations needed for this level.\n\n")
        + "Present this listening exercise:\n\n"
        + "LISTENING EXERCISE - Level " + level + "\n"
        + "Script (Read carefully then answer from memory):\n\n"
        + scriptItem.script + "\n\n"
        + "Questions:\n" + questionsText + "\n\n"
        + "When student answers:\n"
        + "- Check each answer carefully\n"
        + "- Correct answers get praise\n"
        + "- Wrong answers get correction with explanation\n"
        + "- Give final score out of " + scriptItem.questions.length + "\n"
        + "- Ask if they want another exercise\n"
        + "Generate fresh scripts on different topics if they want more.";
    }

    else if(mode === "grammar"){
      const topicsList = grammarMap[level] || grammarMap["B1"];
      const topic = topicsList[Math.floor(Math.random() * topicsList.length)];

      modeInstructions = "You are an expert French grammar teacher. Student level: " + level + "\n\n"
        + "Recommended topic: " + topic + "\n"
        + "Full curriculum for " + level + ": " + topicsList.join(", ") + "\n\n"
        + "Teach using this format:\n"
        + "1. EXPLANATION: Clear explanation\n"
        + "2. FORMATION/RULE: Show the rule clearly\n"
        + "3. EXAMPLES: 3 examples with translations\n"
        + "4. COMMON MISTAKES: Wrong vs correct versions\n"
        + "5. PRACTICE: 5 exercises for student to complete\n\n"
        + "When student submits answers, correct them and give score out of 5.\n"
        + "Use English for A1/A2 explanations, French for B2 and above.\n"
        + "Connect each grammar rule to real TEF/TCF usage.";
    }

    else if(mode === "reading"){
      const textsList = readingMap[level] || readingMap["B1"];
      const textItem = textsList[Math.floor(Math.random() * textsList.length)];
      const questionsText = textItem.questions.map((q, i) => (i+1) + ". " + q).join("\n");

      modeInstructions = "You are a French reading comprehension teacher. Student level: " + level + "\n\n"
        + "Present this reading exercise:\n\n"
        + "READING EXERCISE - " + textItem.title + "\n\n"
        + textItem.text + "\n\n"
        + "Questions:\n" + questionsText + "\n\n"
        + "Also pick 5 important vocabulary words from the text and explain them.\n\n"
        + "When student answers:\n"
        + "- Check carefully against the text\n"
        + "- Point to exact sentence for wrong answers\n"
        + "- Give final score, vocabulary assessment, and TEF CLB equivalent\n"
        + "Generate fresh texts on different topics if they want more.";
    }

    else if(mode === "translator"){
      modeInstructions = "You are a French-English translator. Detect language automatically. Translate English to French or French to English. Correct grammar before translating. Provide pronunciation help. Give 1 example sentence. Note formal vs informal versions if different.";
    }

    else {
      modeInstructions = "You are having a general French learning conversation. Help the student with any French questions. Be friendly, encouraging, and educational.";
    }

    const systemPrompt = "You are Fluide AI, an advanced French tutor and TEF/TCF Canada preparation coach.\n"
      + "Student level: " + level + "\n\n"
      + modeInstructions + "\n\n"
      + "CORE RULES:\n"
      + "1. Adapt to level: A1/A2 use easy French + English support; B1/B2 mostly French; C1/C2 advanced French.\n"
      + "2. Always correct mistakes politely with the correct version.\n"
      + "3. Sound human and natural, never robotic.\n"
      + "4. Be encouraging but honest in scoring.";

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20),
      { role: "user", content: finalMessage }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
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
      return res.status(400).json({ error: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      "INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING *",
      [name, email, hashedPassword]
    );
    res.json({ success: true, user: newUser.rows[0] });
  } catch(error) {
    console.log(error);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Server ping to stay awake
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
