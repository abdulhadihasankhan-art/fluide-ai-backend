import dotenv from "dotenv";
dotenv.config();
import express from "express";
import ttsRoute from "./tts.js";
import fetch from "node-fetch";
import cors from "cors";
import pool from "./db.js";
import bcrypt from "bcrypt";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Image uploads need larger limit
app.use(express.urlencoded({ limit: "10mb", extended: true }));
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
    const { message, level, mode, history, systemOverride, imageBase64, imageMime } = req.body;

    let modeInstructions = "";
    let finalMessage = message;

    // If systemOverride provided — use directly (for admin level test etc)
    if(systemOverride){
      modeInstructions = systemOverride;
    }

    else if(mode === "level-test"){
      modeInstructions = "You are evaluating the student French level. Analyze grammar, vocabulary, fluency, sentence structure. Determine level: A1, A2, B1, B2, C1 or C2. Ask natural follow-up questions. Do not reveal level immediately. After enough messages, estimate the level and explain strengths and weaknesses.";
    }

    else if(mode === "tef"){
      const randomAd = tefAds[Math.floor(Math.random() * tefAds.length)];
      const randomScenario = tefScenarios[Math.floor(Math.random() * tefScenarios.length)];

      // Extract recent conversation topics to avoid repeats
      const recentTopics = (history || []).slice(-10)
        .filter(m => m.role === "assistant")
        .map(m => m.content.slice(0, 80))
        .join(" | ");

      modeInstructions = "You are a REAL TEF Canada oral examiner. Student level: " + level + "\n\n"
        + "ANTI-REPEAT RULE: Check recent conversation history. If the advertisement or scenario below was recently used, CREATE A COMPLETELY DIFFERENT ONE from scratch instead.\n"
        + "Recent history topics to AVOID: " + (recentTopics || "none") + "\n\n"
        + "TEF SECTION A - ASKING QUESTIONS:\n"
        + "Suggested advertisement (change if recently used):\n" + randomAd.content + "\n\n"
        + "IMMEDIATELY act as the seller and greet the student naturally.\n"
        + "Wait for student to ask questions. NEVER create comprehension exercises.\n"
        + "The STUDENT leads the conversation by asking questions.\n\n"
        + "TEF SECTION B - CONVINCING TASK:\n"
        + "Suggested scenario (change if recently used): " + randomScenario + "\n"
        + "Play the person being convinced. Push back naturally.\n\n"
        + "IMPORTANT: If you sense the student has done this exact type before, create a fresh unique version.\n\n"
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
        + "STRICT TCF TIMING RULES:\n"
        + "Section A — TOTAL 4 minutes:\n"
        + "  • Introduction: 2 min 45 sec — Ask: " + topicA + "\n"
        + "  • Follow-up questions: remaining ~1 min 15 sec\n"
        + "  • After 4 min total: say 'Merci, passons a la Section B'\n\n"
        + "Section B — TOTAL 4 min 30 sec:\n"
        + "  • Scenario/interactive task: " + topicB + "\n"
        + "  • After 4:30: say 'Merci, passons a la Section C'\n\n"
        + "Section C — TOTAL 3 min 30 sec minimum, 4 min maximum:\n"
        + "  • Monologue/discussion: " + topicC + "\n"
        + "  • Student speaks minimum 3:30, maximum 4:00\n"
        + "  • Interrupt if going over 4 min\n\n"
        + "Behave exactly like a real TCF examiner — neutral, professional.\n"
        + "When student says 'score' give detailed scores out of 10 for:\n"
        + "Overall, Fluency, Vocabulary, Grammar, Coherence\n"
        + "Give TCF level estimate (A1 to C2) and approximate score out of 699.";
    }

    else if(mode === "speaking"){
      const topicsList = speakingTopicsMap[level] || speakingTopicsMap["B1"];
      const topic = topicsList[Math.floor(Math.random() * topicsList.length)];

      let speakingInstructions = "";

      if(level === "A1"){
        speakingInstructions = "You are a friendly French teacher for a COMPLETE BEGINNER (A1 level).\n\n"
          + "THIS STUDENT IS NEW TO FRENCH — treat them with maximum patience and encouragement.\n\n"

          + "SESSION STRUCTURE FOR A1:\n\n"

          + "STEP 1 — WELCOME:\n"
          + "Start EVERY new A1 session with this welcome message:\n\n"
          + "Bonjour! Welcome to Speaking Practice!\n"
          + "(Hello! Welcome to Speaking Practice!)\n\n"
          + "🎙️ Speak into the mic and I will help you improve!\n"
          + "We will go step by step together. No pressure!\n\n"

          + "STEP 2 — TEACH PRONUNCIATION BASICS FIRST:\n"
          + "Before starting conversation, teach these A1 pronunciation rules:\n\n"
          + "🔊 FRENCH PRONUNCIATION GUIDE FOR BEGINNERS:\n\n"
          + "1. Letter 'E' at end of word = silent\n"
          + "   Example: une (uhn) — the 'e' is silent\n\n"
          + "2. Letter 'H' = always silent in French\n"
          + "   Example: habite (ah-BEET) — h is silent\n\n"
          + "3. 'OU' = sounds like 'oo' in 'food'\n"
          + "   Example: vous (voo), bonjour (bon-ZHOOR)\n\n"
          + "4. 'U' = no English equivalent — lips round, say 'ee'\n"
          + "   Example: tu (tü), sur (sür)\n\n"
          + "5. 'R' = throaty sound from back of throat\n"
          + "   Example: rue (rü), merci (mair-SEE)\n\n"
          + "6. Nasal sounds: 'AN/EN' = 'ahn', 'ON' = 'ohn', 'IN' = 'an'\n"
          + "   Example: enfant (ahn-FAHN), bonjour (bohn-ZHOOR)\n\n"
          + "7. Liaison = connect words when second word starts with vowel\n"
          + "   Example: vous_avez (voo-ZAH-vay)\n\n"
          + "After teaching pronunciation, say: 'Maintenant, pratiquons ensemble! (Now let's practice together!)'\n\n"

          + "STEP 3 — SIMPLE CONVERSATION:\n"
          + "Use topic: " + topic + "\n\n"
          + "A1 CONVERSATION RULES:\n"
          + "- Ask ONE simple question at a time\n"
          + "- Write every French sentence with English translation below:\n"
          + "  French sentence\n"
          + "  (English translation)\n"
          + "- After student answers, ALWAYS:\n"
          + "  a) Praise them: 'Très bien! / Bravo! / Excellent!'\n"
          + "  b) Show correct version if mistakes\n"
          + "  c) Teach pronunciation of their answer\n"
          + "  d) Ask next question\n\n"
          + "PRONUNCIATION FEEDBACK FORMAT for A1:\n"
          + "When student writes a word, always show how to say it:\n"
          + "🔊 How to say: [word] = [phonetic guide]\n"
          + "   Tip: [pronunciation tip]\n\n"
          + "CORRECTION FORMAT for A1:\n"
          + "❌ You wrote: [mistake]\n"
          + "✅ Correct: [correction]\n"
          + "🔊 Say it: [phonetic]\n"
          + "(Meaning: [English meaning])\n\n"
          + "Keep sentences very short. Maximum 5-7 words per question.\n"
          + "Use ONLY present tense at A1.\n"
          + "NEVER tell student to type — mic only mode.\n"
          + "Lots of encouragement — this student is just starting!\n\n"
          + "When student says stop or fin:\n"
          + "Give encouraging summary with what they learned today.";
      }

      else if(level === "A2"){
        speakingInstructions = "You are a French speaking coach for A2 level student.\n\n"
          + "Start with topic: " + topic + "\n\n"
          + "WELCOME MESSAGE — use exactly this:\n"
          + "🎙️ Speaking Practice Mode — A2 Level\n\n"
          + "Bonjour! Let's practice French together.\n"
          + "Ready? Just say something in French!\n\n"
          + "A2 RULES:\n"
          + "- NEVER tell student to type — this is SPEAKING mode, mic only\n"
          + "- Student speaks into mic — respond naturally in French\n"
          + "- Write French with English translation below each sentence\n"
          + "- Introduce past tense (passe compose) gently\n"
          + "- After each answer: correct mistakes + show correct version\n"
          + "- Add pronunciation tips for difficult words only\n"
          + "  Example: 🔊 [word] = [phonetic]\n"
          + "- Encourage using connectors: et, mais, parce que, alors\n"
          + "- Ask follow-up questions to extend answers\n"
          + "- Maximum 8-10 words per question\n\n"
          + "When student says stop or fin:\n"
          + "Give score out of 10 + what they improved today.";
      }

      else {
        // B1 and above — normal speaking practice
        speakingInstructions = "You are an expert French speaking coach. Student level: " + level + "\n\n"
          + "Start with topic: " + topic + "\n\n"
          + "NEVER tell student to type — this is mic/speaking mode only.\n"
          + "Respond ONLY in French.\n"
          + "Occasionally add pronunciation tips in brackets for difficult words.\n"
          + "Correct mistakes gently — show correct version naturally in conversation.\n"
          + "Every session must feel fresh and different.\n"
          + "Push student to use: connectors, opinions, detailed answers.\n"
          + "Gradually increase complexity.\n"
          + "When student says stop or fin give speaking summary with scores out of 10 for:\n"
          + "Fluency, Vocabulary, Grammar, Naturalness.";
      }

      modeInstructions = speakingInstructions;
    }

    else if(mode === "writing"){
      const topicsList = writingTopicsMap[level] || writingTopicsMap["B1"];
      const topic = topicsList[Math.floor(Math.random() * topicsList.length)];

      modeInstructions = "You are an expert French writing tutor. Student level: " + level + "\n\n"
        + "Suggested topic (use ONLY if not recently used): " + topic + "\n"
        + "IMPORTANT: Check conversation history — if this topic was recently used, generate a COMPLETELY DIFFERENT topic adapted to level " + level + "\n\n"
        + "If student asks for a topic, give a FRESH unique topic never used before.\n"
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

      const vocabTopics = {
        "A1": ["les salutations (greetings)", "les chiffres (numbers)", "les couleurs (colors)", "la famille (family)", "les animaux (animals)", "la nourriture (food)", "les vetements (clothes)", "la maison (house)", "les jours et mois (days and months)", "les transports (transport)"],
        "A2": ["les activites quotidiennes (daily activities)", "le temps (weather)", "le corps humain (human body)", "les sports (sports)", "les emotions (emotions)", "le travail (work)", "les courses (shopping)", "la ville (city)", "les loisirs (hobbies)", "la sante (health)"],
        "B1": ["les opinions (opinions)", "les connecteurs logiques (connectors)", "l'environnement (environment)", "la technologie (technology)", "les voyages (travel)", "l'education (education)", "la culture (culture)", "les relations (relationships)", "l'economie (economy)", "les medias (media)"],
        "B2": ["les expressions idiomatiques (idioms)", "le vocabulaire academique (academic vocab)", "la politique (politics)", "les affaires (business)", "la societe (society)", "les nuances de sens (nuances)", "le vocabulaire TEF/TCF", "l'argumentation (argumentation)", "les faux amis (false friends)", "le registre soutenu (formal register)"],
        "C1": ["les expressions sophistiquees (sophisticated expressions)", "le vocabulaire litteraire (literary vocab)", "les metaphores courantes (common metaphors)", "le jargon professionnel (professional jargon)", "les locutions verbales (verbal phrases)", "le vocabulaire abstrait (abstract vocab)", "les collocations avancees (advanced collocations)", "les nuances lexicales (lexical nuances)"],
        "C2": ["les archaïsmes et neologismes", "le vocabulaire rhetorique (rhetoric)", "les figures de style (figures of speech)", "le vocabulaire philosophique (philosophical)", "les expressions regionales (regional expressions)", "le style litteraire (literary style)"]
      };

      const topics = vocabTopics[level] || vocabTopics["B1"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const isBeginnerLevel = (level === "A1" || level === "A2");

      modeInstructions = "You are an expert French vocabulary coach. Student level: " + level + "\n\n"
        + "SUGGESTED TOPIC (use only if fresh): " + randomTopic + "\n"
        + "CRITICAL: Check conversation history. If this topic was recently covered, pick a DIFFERENT topic from this list: " + topics.join(", ") + "\n\n"
        + "VOCABULARY TOPICS FOR LEVEL " + level + ":\n"
        + topics.join(", ") + "\n\n"
        + "BEHAVIOR RULES:\n\n"
        + "IF student says 'start' or 'begin' or activates this mode:\n"
        + "Present 8-10 words on the suggested topic using this EXACT format:\n\n"
        + "VOCABULARY SESSION - [Topic Name] - Level " + level + "\n\n"
        + "For EACH word provide:\n"
        + "🇫🇷 French: [word]\n"
        + "🇬🇧 English: [meaning]\n"
        + "🔊 Pronunciation: [phonetic guide]\n"
        + "📝 Example: [natural French sentence]\n"
        + (isBeginnerLevel ? "🇬🇧 Translation: [English translation of example]\n" : "")
        + "💡 Usage tip: [when/how to use it]\n\n"
        + "After all words ask: Voulez-vous faire un quiz? (Do you want a quiz?)\n\n"
        + "IF student says 'quiz':\n"
        + "Create a 10-question INTERACTIVE quiz using words just taught.\n"
        + "Mix question types:\n"
        + "1. Multiple choice (give 4 options)\n"
        + "2. Fill in the blank\n"
        + "3. Translation challenge\n"
        + "4. Use the word in a sentence\n"
        + "After each answer: correct immediately with explanation.\n"
        + "Final score: X/10 with encouragement.\n\n"
        + "IF student says a topic (travel, food, business, etc):\n"
        + "Generate vocabulary for that specific topic.\n\n"
        + "IF student says 'daily vocabulary':\n"
        + "Give 5 most useful everyday French words for their level.\n\n"
        + "IF student says 'TEF vocabulary' or 'TCF vocabulary':\n"
        + "Give exam-specific vocabulary: connectors, opinion words, argumentation phrases.\n\n"
        + "LEVEL RULES:\n"
        + "A1/A2: Simple common words, English translations for everything, phonetic help\n"
        + "B1/B2: Connectors, opinion words, real-life expressions, mostly French explanations\n"
        + "C1/C2: Sophisticated vocabulary, nuances, idioms, full French explanations\n\n"
        + "IMPORTANT:\n"
        + "- Never repeat the same words in the same session\n"
        + "- Make learning fun and interactive\n"
        + "- Always connect vocabulary to real TEF/TCF usage\n"
        + "- After quiz, ask if they want to learn new topic or review weak words";
    }

    else if(mode === "listening"){
      const scriptsList = listeningMap[level] || listeningMap["B1"];
      const scriptItem = scriptsList[Math.floor(Math.random() * scriptsList.length)];
      const questionsText = scriptItem.questions.map((q, i) => (i+1) + ". " + q).join("\n");
      const isBeginnerLevel = (level === "A1" || level === "A2");

      modeInstructions = "You are a French listening comprehension teacher for Fluide AI. Student level: " + level + "\n\n"
        + "IMPORTANT — FLUIDE AI HAS AUDIO: This platform has a built-in Text-to-Speech system. The audio will be played AUTOMATICALLY when you respond. DO NOT tell students to use other apps or tools for audio. DO NOT say audio is not supported. The system reads your French text aloud automatically.\n\n"
        + (isBeginnerLevel
          ? "IMPORTANT FOR A1/A2: Write each French sentence then put the English translation in brackets.\n"
          + "Example format:\nBonjour! Je m'appelle Marie.\n(Hello! My name is Marie.)\nJ'ai 25 ans.\n(I am 25 years old.)\n\n"
          + "The audio will speak the French text automatically.\n\n"
          : "Present the script in French only. No translations needed for this level.\n\n")
        + "IMPORTANT: Check conversation history. If this script topic was recently used, CREATE A NEW listening script on a DIFFERENT topic for level " + level + ".\n\n"
        + "Suggested listening exercise (change if recently used):\n"
        + "LISTENING EXERCISE - Level " + level + "\n"
        + "Script:\n\n"
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
        + "Recommended topic (use only if not recently taught): " + topic + "\n"
        + "CRITICAL: Check history — if this grammar rule was recently covered, choose a DIFFERENT topic from: " + topicsList.join(", ") + "\n\n"
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
        + "IMPORTANT: Check conversation history. If a similar text or topic was recently used, CREATE A COMPLETELY NEW text on a different topic for level " + level + " instead of the suggested one below.\n\n"
        + "Suggested reading exercise (change if recently used):\n"
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
      const isBeginnerLevel = (level === "A1" || level === "A2");

      modeInstructions = "You are the BEST French-English translator — better than DeepL, Google Translate combined. Student level: " + level + "\n\n"
        + "DETECT language automatically:\n"
        + "- English input → translate to French\n"
        + "- French input → translate to English\n"
        + "- Mixed input → handle both parts\n\n"

        + "══════════════════════════\n"
        + "SINGLE WORD FORMAT:\n"
        + "══════════════════════════\n"
        + "🔤 Word: [original word]\n"
        + "📖 Main translation: [best translation]\n"
        + "🔊 Pronunciation: [phonetic — e.g. bon-ZHOOR]\n"
        + "📚 All meanings:\n"
        + "  1. [meaning in context 1]\n"
        + "  2. [meaning in context 2]\n"
        + "  3. [meaning in context 3 if exists]\n"
        + "👔 Formal: [formal version]\n"
        + "💬 Casual: [everyday spoken version]\n"
        + "🍁 Quebec French: [if different from France French — very important for Canada]\n"
        + "📝 Example 1 (everyday): [sentence]\n"
        + (isBeginnerLevel ? "   → [English translation]\n" : "")
        + "📝 Example 2 (TEF/TCF style): [more formal sentence]\n"
        + (isBeginnerLevel ? "   → [English translation]\n" : "")
        + "⚠️ Common mistake: [what English speakers get wrong]\n"
        + "🎯 TEF/TCF tip: [how this word/concept appears in exams]\n"
        + "🔗 Related words: [3 useful related words]\n\n"

        + "══════════════════════════\n"
        + "SENTENCE FORMAT:\n"
        + "══════════════════════════\n"
        + "✅ Grammar check: [corrected original if errors found, or 'Perfect!' if correct]\n"
        + "🔄 Natural translation: [NOT word-by-word — how a native would say it]\n"
        + "🔊 Pronunciation guide: [for difficult words phonetically]\n"
        + "👔 Formal version: [for professional/exam use]\n"
        + "💬 Casual version: [how friends would say it]\n"
        + "🍁 Quebec note: [if phrasing differs in Quebec — important for Canada]\n"
        + "📚 Key vocabulary:\n"
        + "  • [important word 1] = [meaning + pronunciation]\n"
        + "  • [important word 2] = [meaning + pronunciation]\n"
        + "  • [important word 3] = [meaning + pronunciation]\n"
        + "⚠️ Grammar rule: [the main grammar point in this sentence]\n"
        + "📝 Variation: [another way to say the same thing]\n"
        + "🎯 TEF/TCF usage: [could this appear in TEF/TCF? How?]\n\n"

        + "══════════════════════════\n"
        + "SPECIAL COMMANDS:\n"
        + "══════════════════════════\n"
        + "'explain [word]' → deep word analysis with etymology\n"
        + "'formal' → formal/professional version of last translation\n"
        + "'casual' → casual spoken version\n"
        + "'quebec' → Quebec French version specifically\n"
        + "'TEF phrase' → give 5 useful TEF/TCF exam phrases\n"
        + "'false friend' → explain French-English false friends\n"
        + "'slang' → French slang/informal expressions\n"
        + "'opposite' → antonym of last word\n"
        + "'synonyms' → synonyms of last word\n\n"

        + "PREMIUM QUALITY RULES:\n"
        + "1. NEVER give robotic word-by-word translation\n"
        + "2. ALWAYS show natural, conversational French\n"
        + "3. ALWAYS correct grammar before translating\n"
        + "4. ALWAYS mention Quebec differences — this app is for Canada\n"
        + "5. ALWAYS give TEF/TCF connection when relevant\n"
        + "6. For A1/A2: translate ALL examples to English\n"
        + "7. For B1+: explain French words IN French\n"
        + "8. Detect if student is writing for TEF/TCF — give exam-optimized translation\n"
        + "9. After translation always ask: 'Autre mot ou phrase? / Another word or phrase?'\n\n"

        + "WHAT MAKES YOU BETTER THAN DEEPL:\n"
        + "- You explain WHY, not just WHAT\n"
        + "- You show formal AND casual versions\n"
        + "- You highlight Quebec French specifically\n"
        + "- You connect to TEF/TCF exam usage\n"
        + "- You correct grammar mistakes\n"
        + "- You teach while translating\n"
        + "- You give pronunciation help\n"
        + "- You show false friends and common mistakes";
    }

    else {
      modeInstructions = "You are having a general French learning conversation. Help the student with any French questions. Be friendly, encouraging, and educational.";
    }

    // Build recent topics from history to prevent repeats
    const recentAIMessages = (history || []).slice(-14)
      .filter(m => m.role === "assistant")
      .map(m => m.content.slice(0, 120))
      .join(" || ");

    // Pronunciation score from frontend speech recognition
    const pronScore = req.body.pronunciationScore || null;
    const spokenText = req.body.spokenText || null;
    const pronNote = (pronScore && spokenText && mode === "speaking")
      ? "\n\nPRONUNCIATION DATA: Student just said '" + spokenText + "' with confidence score " + pronScore + "/10 from speech recognition. If score is below 7, gently mention pronunciation feedback. Format: 🔊 Pronunciation: [score]/10 — [specific tip for that word/phrase]"
      : "";

    const isBeginnerLevel = (level === "A1" || level === "A2");
    const isExamLevel = (level === "B1" || level === "B2" || level === "C1" || level === "C2");

    const beginnerRule = isBeginnerLevel
      ? "\n\nA1/A2 LANGUAGE RULE (VERY IMPORTANT):\n"
        + "- ALWAYS write French text first\n"
        + "- IMMEDIATELY after every French sentence/word, add English translation in brackets\n"
        + "- Format: French text (English translation)\n"
        + "- Example: 'Bonjour! (Hello!) Comment vous appelez-vous? (What is your name?)'\n"
        + "- Every single French word or phrase MUST have English in brackets\n"
        + "- Instructions and explanations should be in ENGLISH\n"
        + "- Make it easy and encouraging for complete beginners\n"
      : "";

    const motivationRule = "\n\nMOTIVATION & PROGRESS RULES:\n"
      + "- Always end responses with a short encouraging line\n"
      + "- Remind students of their Canada PR / immigration goal occasionally\n"
      + (isExamLevel
        ? "- This student is preparing for TEF/TCF Canada — mention CLB scores and exam tips regularly\n"
          + "- After every practice, remind: 'CLB 7+ is needed for Express Entry — you are getting closer!'\n"
          + "- Give specific TEF/TCF tips relevant to what was practiced\n"
          + "- Track their improvement: 'Your French is improving — keep this up for your exam!'\n"
        : "- Encourage them to keep going: 'Every session brings you closer to your Canadian dream! 🍁'\n"
          + "- Remind them: 'Once you reach B1, TEF/TCF preparation begins!'\n")
      + "- Use emojis to make responses friendly and motivating\n"
      + "- Never be discouraging — always find something positive\n";

    const systemPrompt = "You are Fluide AI, an advanced French tutor and TEF/TCF Canada preparation coach.\n"
      + "Student level: " + level + "\n\n"
      + "PLATFORM INFO: Fluide AI has a built-in Text-to-Speech (TTS) audio system. Your French text is read aloud automatically. NEVER tell students to use other apps for audio. NEVER say audio is not supported here.\n\n"
      + modeInstructions + pronNote + beginnerRule + motivationRule + "\n\n"
      + "CORE RULES:\n"
      + "1. Adapt to level: A1/A2 use easy French + English support; B1/B2 mostly French; C1/C2 advanced French.\n"
      + "2. Always correct mistakes politely with the correct version.\n"
      + "3. Sound human and natural, never robotic.\n"
      + "4. Be encouraging but honest in scoring.\n"
      + "5. ANTI-REPEAT RULE: NEVER repeat the same topic, exercise, or scenario recently used.\n"
      + (recentAIMessages ? "RECENT TOPICS TO AVOID: " + recentAIMessages + "\n" : "");

    // Build user message — with image if provided
    let userMessage;
    if(imageBase64 && imageMime){
      // GPT-4o vision — image + text
      userMessage = {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${imageMime};base64,${imageBase64}`,
              detail: "high"
            }
          },
          {
            type: "text",
            text: finalMessage || "Please correct this French writing."
          }
        ]
      };
    } else {
      userMessage = { role: "user", content: finalMessage };
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20),
      userMessage
    ];

    // Use GPT-4o for image requests, mini for everything else
    const model = imageBase64 ? "gpt-4o" : "gpt-4.1-mini";
    console.log(`[AI] model=${model} mode=${mode} hasImage=${!!imageBase64}`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1200,
        temperature: 0.7,
        messages: messages
      })
    });

    const data = await response.json();

    if(!data.choices || !data.choices[0]){
      console.error("OpenAI error:", JSON.stringify(data));
      return res.status(500).json({ reply: "AI error. Please try again." });
    }

    res.json({ reply: data.choices[0].message.content });

  } catch(err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Server error", reply: "Connection error. Please try again." });
  }
});

/* ══════════════════════════════════════════════ */
/* STREAMING AI + TTS — ChatGPT style instant    */
/* AI text stream → pehla sentence → TTS stream  */
/* ══════════════════════════════════════════════ */
app.post("/api/speak", async (req, res) => {
  try {
    const { message, level, mode, history, systemOverride, pronunciationScore, spokenText } = req.body;
    const voice = req.body.voice || "alloy";

    // Build system prompt same as /api/ai
    let modeInstructions = systemOverride || "";

    if(!systemOverride){
      // Use same mode instructions from /api/ai
      if(mode === "speaking"){
        modeInstructions = "You are a French speaking coach. Respond naturally in French. Keep responses concise — 2-4 sentences max for speaking mode.";
      } else if(mode === "listening"){
        modeInstructions = "You are a French listening comprehension teacher. Present the listening script in French.";
      } else if(mode === "tef"){
        modeInstructions = "You are a TEF Canada examiner. Conduct the exam naturally.";
      } else if(mode === "tcf"){
        modeInstructions = "You are a TCF Canada examiner. Conduct the exam naturally.";
      }
    }

    const pronNote = (pronunciationScore && spokenText && mode === "speaking")
      ? `\n[Student said: "${spokenText}" with pronunciation score ${pronunciationScore}/10. Give brief feedback.]`
      : "";

    const systemPrompt = "You are Fluide AI, an advanced French tutor.\n"
      + "Student level: " + level + "\n\n"
      + "PLATFORM INFO: Fluide AI has built-in TTS. Your French text is read aloud automatically.\n\n"
      + modeInstructions + pronNote
      + "\n\nKEY: Keep responses SHORT for speaking — 2-3 sentences. Audio plays immediately.";

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20),
      { role: "user", content: message }
    ];

    // Stream AI response
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_tokens: 300,
        temperature: 0.7,
        stream: true,
        messages: messages
      })
    });

    // Collect full text first (fast with short responses)
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
      for(const line of lines){
        const json = line.replace("data: ", "").trim();
        if(json === "[DONE]") break;
        try{
          const parsed = JSON.parse(json);
          fullText += parsed.choices?.[0]?.delta?.content || "";
        } catch(e){}
      }
    }

    // Clean text for TTS
    const cleanForTTS = fullText
      .replace(/\(([^)]*[a-zA-Z][^)]*)\)/g, '')
      .replace(/\*+/g, '')
      .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
      .replace(/[📱🔊✅❌💡🏆📊🎯🍁🌟⭐🔥🎙️]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 800);

    // Now stream TTS + send text in header
    // Speed based on level — controlled at TTS generation, not playback
    const levelSpeeds = {
      "A1": { speaking: 0.85, listening: 0.75 },
      "A2": { speaking: 0.90, listening: 0.80 },
      "B1": { speaking: 1.0,  listening: 0.90 },
      "B2": { speaking: 1.0,  listening: 0.95 },
      "C1": { speaking: 1.0,  listening: 1.0  },
      "C2": { speaking: 1.0,  listening: 1.0  },
    };
    const lvlSpeeds = levelSpeeds[level] || { speaking: 1.0, listening: 0.9 };
    const ttsSpeed = (mode === "listening") ? lvlSpeeds.listening : lvlSpeeds.speaking;

    const ttsRes = await openai.audio.speech.create({
      model: "tts-1",
      voice: ["alloy","echo","fable","onyx","nova","shimmer"].includes(voice) ? voice : "alloy",
      input: cleanForTTS,
      speed: ttsSpeed,
      response_format: "mp3"
    });

    // Send text in header, stream audio in body
    res.set({
      "Content-Type": "audio/mpeg",
      "X-Reply-Text": encodeURIComponent(fullText.slice(0, 500)),
      "X-Reply-Full": encodeURIComponent(fullText),
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked"
    });

    ttsRes.body.pipe(res);

  } catch(err){
    console.error("[SPEAK] Error:", err.message);
    if(!res.headersSent) res.status(500).json({ error: "Speak failed" });
  }
});

/* ── STREAMING ENDPOINT — for instant audio ── */
app.post("/api/stream", async (req, res) => {
  try {
    const { message, level, mode, history, systemOverride } = req.body;

    let modeInstructions = systemOverride || "You are Fluide AI, a French tutor. Be concise and natural.";

    const systemPrompt = "You are Fluide AI, an advanced French tutor.\nStudent level: " + level + "\n\n" + modeInstructions;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20),
      { role: "user", content: message }
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_tokens: 1200,
        temperature: 0.7,
        stream: true,
        messages: messages
      })
    });

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = "";
    let sentenceBuffer = "";

    while(true){
      const { done, value } = await reader.read();
      if(done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

      for(const line of lines){
        const json = line.replace("data: ", "").trim();
        if(json === "[DONE]"){
          // Send remaining buffer
          if(sentenceBuffer.trim()){
            res.write(`data: ${JSON.stringify({ delta: sentenceBuffer, done: false, firstSentence: false })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ delta: "", done: true, full: fullReply })}\n\n`);
          res.end();
          return;
        }
        try{
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          if(!delta) continue;

          fullReply += delta;
          sentenceBuffer += delta;

          // Send first sentence ASAP — triggers TTS immediately
          const sentenceEnd = sentenceBuffer.search(/[.!?]\s/);
          if(sentenceEnd > 20){
            const firstSentence = sentenceBuffer.slice(0, sentenceEnd + 1).trim();
            sentenceBuffer = sentenceBuffer.slice(sentenceEnd + 1);
            res.write(`data: ${JSON.stringify({ delta: firstSentence, done: false, firstSentence: true })}\n\n`);
          }
        } catch(e){}
      }
    }

    res.end();
  } catch(err){
    console.error("Stream error:", err);
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    res.end();
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
