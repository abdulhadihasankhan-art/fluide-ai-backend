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
      const randomSectionC = tcfTopics.sectionC[Math.floor(Math.random() * tcfTopics.sectionC.length)];

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

    else if(mode === "listening"){

      const listeningScripts = {
        "A1": [
          { script: "Bonjour! Je m'appelle Marie. J'ai 25 ans. J'habite à Paris. J'aime le café et les croissants. Je travaille dans un bureau.", questions: ["Quel est le prénom de la personne? / What is the person's first name?", "Quel âge a-t-elle? / How old is she?", "Où habite-t-elle? / Where does she live?"] },
          { script: "Bonjour, je voudrais un café s'il vous plaît. — Bien sûr! Avec du lait? — Non merci, sans lait. — D'accord. C'est 2 euros. — Voilà, merci! — Bonne journée!", questions: ["Qu'est-ce que la personne commande? / What does the person order?", "Est-ce qu'elle veut du lait? / Does she want milk?", "Combien ça coûte? / How much does it cost?"] }
        ],
        "A2": [
          { script: "Allô? Oui bonjour, je voudrais réserver une table pour ce soir. Pour combien de personnes? Pour 4 personnes, à 20 heures. Quel est votre nom? Martin. Très bien, c'est noté Monsieur Martin, table pour 4 à 20h.", questions: ["Pourquoi est-ce que la personne téléphone? / Why is the person calling?", "Pour combien de personnes? / For how many people?", "À quelle heure? / At what time?"] },
          { script: "Hier, je suis allée au marché avec ma mère. Nous avons acheté des légumes, du pain et du fromage. Ensuite, nous avons mangé dans un restaurant près de chez nous. C'était délicieux!", questions: ["Avec qui est-elle allée au marché? / Who did she go to the market with?", "Qu'est-ce qu'elles ont acheté? / What did they buy?", "Qu'est-ce qu'elles ont fait après? / What did they do after?"] }
        ],
        "B1": [
          { script: "Bonjour à tous et bienvenue dans notre émission. Aujourd'hui nous allons parler du télétravail. Selon une étude récente, 45% des employés français travaillent maintenant depuis chez eux au moins deux jours par semaine. Les avantages sont nombreux: moins de temps dans les transports, meilleur équilibre entre vie professionnelle et personnelle. Cependant, certains employés se sentent isolés et ont du mal à séparer le travail de la vie privée.", questions: ["Quel est le sujet de l'émission? / What is the topic of the show?", "Quel pourcentage d'employés télétravaillent? / What percentage of employees work from home?", "Quels sont les avantages mentionnés? / What advantages are mentioned?", "Quel problème est mentionné? / What problem is mentioned?"] },
          { script: "Bienvenue à la gare de Lyon. Le train TGV numéro 6201 à destination de Marseille partira voie 8 dans 15 minutes. Les voyageurs sont priés de se présenter au quai muni de leur billet. Attention, ce train ne s'arrête pas à Valence. Prochain arrêt: Avignon.", questions: ["Quel est le numéro du train? / What is the train number?", "Quelle est la destination? / What is the destination?", "De quelle voie part le train? / From which platform does the train depart?", "Dans combien de temps part le train? / In how many minutes does the train leave?"] }
        ],
        "B2": [
          { script: "Dans le cadre du débat sur l'intelligence artificielle, plusieurs experts s'affrontent sur la question de la réglementation. D'un côté, les partisans d'une IA libre estiment que trop de contraintes freineraient l'innovation et mettraient l'Europe en retard par rapport aux États-Unis et à la Chine. De l'autre côté, les défenseurs d'une régulation stricte soulignent les risques pour l'emploi, la vie privée et la démocratie. Le Parlement européen a récemment adopté l'AI Act, première loi mondiale encadrant l'intelligence artificielle.", questions: ["Quel est le sujet principal du document? / What is the main topic?", "Quels sont les deux camps dans ce débat? / What are the two sides in this debate?", "Pourquoi certains s'opposent-ils aux contraintes? / Why do some oppose restrictions?", "Qu'a adopté le Parlement européen? / What did the European Parliament adopt?"] }
        ],
        "C1": [
          { script: "La question de la souveraineté alimentaire soulève des enjeux fondamentaux pour les démocraties contemporaines. Face à la mondialisation des échanges agricoles, certains économistes plaident pour un retour au protectionnisme alimentaire, arguant que la dépendance aux importations fragilise la sécurité nationale. Néanmoins, d'autres voix s'élèvent pour rappeler que le libre-échange a historiquement contribué à réduire la pauvreté dans les pays en développement. Cette tension entre souveraineté et solidarité internationale constitue l'un des défis majeurs du XXIe siècle.", questions: ["Quelle tension centrale le texte explore-t-il? / What central tension does the text explore?", "Quels arguments avancent les partisans du protectionnisme? / What arguments do protectionists make?", "Quelle critique leur est opposée? / What counterargument is made?", "Comment l'auteur caractérise-t-il ce débat? / How does the author characterize this debate?"] }
        ]
      };

      const scripts = listeningScripts[level] || listeningScripts["B1"];
      const randomScript = scripts[Math.floor(Math.random() * scripts.length)];

      modeInstructions = `
You are a French listening comprehension teacher. Student level: ${level}

━━━━━━━━━━━━━━━━━━━━━
LISTENING EXERCISE FORMAT:
━━━━━━━━━━━━━━━━━━━━━

STEP 1 — Present the listening script:
Show this exact format:

🎧 LISTENING EXERCISE — Level ${level}
━━━━━━━━━━━━━━━━━━━━━
📻 Script (Read this carefully — imagine hearing it):

"${randomScript.script}"

━━━━━━━━━━━━━━━━━━━━━
❓ Questions:
${randomScript.questions.map((q, i) => (i+1) + '. ' + q).join('\n')}
━━━━━━━━━━━━━━━━━━━━━

💡 Tip: Read the script once, then cover it and try to answer from memory!

STEP 2 — When student answers:
- Check each answer carefully
- For correct answers: ✅ "Correct! Well done!"
- For wrong answers: ❌ "Not quite. The correct answer is: [answer] because..."
- Give the correct answer with explanation
- Show the relevant part of the script

STEP 3 — Score:
After all answers give:
━━━━━━━━━━━━━━━━━━━━━
📊 Listening Score: X/${randomScript.questions.length} (X%)
🏆 TEF Listening Equivalent: Level ${level} range
━━━━━━━━━━━━━━━━━━━━━

STEP 4 — After scoring:
Ask: "Voulez-vous un autre exercice? / Want another exercise?"
Generate a completely new script if they say yes.

IMPORTANT RULES:
- Generate fresh scripts if student wants more — never repeat
- Adapt difficulty to ${level}
- For A1/A2: simple vocabulary, slow speech simulation, translation in brackets
- For B1/B2: news style, announcements, conversations
- For C1/C2: debates, conferences, complex discussions
- Always simulate TTS reading by presenting script clearly
`;
    }

    else if(mode === "grammar"){

      const grammarCurriculum = {
        "A1": ["Le présent de l'indicatif (être, avoir, aller)", "Les articles définis et indéfinis (le, la, les, un, une)", "La négation (ne...pas)", "Les pronoms sujets (je, tu, il/elle, nous, vous, ils/elles)", "Les adjectifs possessifs (mon, ma, mes)", "Le genre des noms (masculin/féminin)", "Les verbes réguliers en -ER"],
        "A2": ["Le passé composé avec avoir", "Le passé composé avec être", "L'imparfait — introduction", "Les verbes pronominaux (se lever, se coucher)", "Les prépositions de lieu (à, en, au, aux)", "Le futur proche (aller + infinitif)", "Les adjectifs qualificatifs — accord"],
        "B1": ["L'imparfait vs le passé composé", "Le futur simple", "Le conditionnel présent", "Les pronoms COD et COI (le, la, les, lui, leur)", "Les connecteurs logiques (cependant, de plus, par ailleurs)", "La comparaison (plus, moins, aussi...que)", "La cause et la conséquence (parce que, donc, c'est pourquoi)"],
        "B2": ["Le subjonctif présent — formation et usage", "Le conditionnel passé", "Les pronoms relatifs (qui, que, dont, où)", "La voix passive", "Le discours indirect", "Les expressions idiomatiques courantes", "Les nuances de sens (bien que, quoique, à moins que)"],
        "C1": ["Le subjonctif passé", "Les temps littéraires (passé simple, imparfait du subjonctif)", "La concession (bien que, quoique, même si)", "Les structures emphatiques (c'est...qui, c'est...que)", "Les nominalisations", "Le style indirect libre", "Les registres de langue (familier, standard, soutenu)"],
        "C2": ["La stylistique française avancée", "Les figures de style (métaphore, hyperbole, litote)", "L'argumentation sophistiquée", "Les faux amis et pièges grammaticaux", "Les nuances lexicales avancées", "L'écriture académique et professionnelle", "La rhétorique française"]
      };

      const topics = grammarCurriculum[level] || grammarCurriculum["B1"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      modeInstructions = `
You are an expert French grammar teacher. Student level: ${level}

GRAMMAR CURRICULUM FOR ${level}:
${JSON.stringify(topics, null, 2)}

━━━━━━━━━━━━━━━━━━━━━
BEHAVIOR:
━━━━━━━━━━━━━━━━━━━━━

IF student says "start", "begin", or types a grammar topic:
→ Teach that topic using this EXACT format:

📚 GRAMMAR LESSON: [Topic Name]
━━━━━━━━━━━━━━━━━━━━━

📖 EXPLANATION:
[Clear explanation in English for A1/A2, French for B2+]

📋 FORMATION/RULE:
[Show the rule clearly with formula]
Example: Subject + avoir/être + past participle

✅ EXAMPLES:
1. [French sentence] = [English translation]
2. [French sentence] = [English translation]
3. [French sentence] = [English translation]

⚠️ COMMON MISTAKES:
❌ Wrong: [common error]
✅ Correct: [correct version]
💡 Why: [brief explanation]

🎯 PRACTICE EXERCISE:
Fill in the blanks OR translate OR correct the errors:
1. [exercise 1]
2. [exercise 2]
3. [exercise 3]
4. [exercise 4]
5. [exercise 5]

Type your answers and I will correct them!
━━━━━━━━━━━━━━━━━━━━━

WHEN student submits answers:
- Check each answer
- ✅ Correct answers with praise
- ❌ Wrong answers with correction + explanation
- Give final score X/5
- Ask if they want to continue with next topic or more practice

IF student says "next topic" → teach next grammar topic from curriculum
IF student says "quiz" → give 10-question grammar quiz on topics learned
IF student says "what should I learn?" → show full curriculum for their level

LEVEL RULES:
A1/A2: English explanations, simple examples, very encouraging
B1/B2: Mix of French/English, real-world examples, TEF-style sentences
C1/C2: Full French, sophisticated examples, literary references

IMPORTANT:
- Always start with a suggestion: "Today I recommend: ${randomTopic}"
- Make lessons interactive — never just explain without exercises
- Connect grammar to real TEF/TCF usage
- Show how each rule helps in the exam
`;
    }

    else if(mode === "reading"){

      const readingTexts = {
        "A1": [
          { title: "Mon appartement", text: "Je m'appelle Thomas. J'habite dans un appartement à Lyon. Mon appartement est petit mais confortable. Il y a une chambre, un salon, une cuisine et une salle de bain. Dans ma chambre, il y a un lit, une armoire et un bureau. J'aime beaucoup mon appartement parce qu'il est près de mon travail.", questions: ["Où habite Thomas? / Where does Thomas live?", "Comment est son appartement? / What is his apartment like?", "Qu'est-ce qu'il y a dans sa chambre? / What is in his bedroom?", "Pourquoi est-ce qu'il aime son appartement? / Why does he like his apartment?"] },
          { title: "Au marché", text: "Aujourd'hui c'est samedi. Marie va au marché avec sa fille. Elle achète des tomates, des pommes et du pain. Les tomates coûtent 3 euros. Les pommes coûtent 2 euros le kilo. Marie paie avec un billet de 10 euros et reçoit 5 euros de monnaie.", questions: ["Quel jour sommes-nous? / What day is it?", "Qu'est-ce que Marie achète? / What does Marie buy?", "Combien coûtent les tomates? / How much do the tomatoes cost?", "Combien de monnaie reçoit-elle? / How much change does she receive?"] }
        ],
        "A2": [
          { title: "Les vacances de Julien", text: "L'été dernier, Julien est allé en vacances en Bretagne avec sa famille. Ils ont voyagé en voiture pendant 4 heures. Ils ont loué une maison près de la mer. Chaque matin, ils allaient à la plage. Julien a appris à faire du surf. Le soir, ils mangeaient des fruits de mer dans les restaurants locaux. C'était de magnifiques vacances!", questions: ["Où est allé Julien en vacances? / Where did Julien go on vacation?", "Comment ont-ils voyagé? / How did they travel?", "Qu'est-ce que Julien a appris? / What did Julien learn?", "Que faisaient-ils le soir? / What did they do in the evenings?"] }
        ],
        "B1": [
          { title: "Le covoiturage en France", text: "Le covoiturage connaît un essor considérable en France ces dernières années. De plus en plus de Français choisissent de partager leurs voitures pour des raisons économiques et écologiques. Des applications comme BlaBlaCar ont révolutionné ce mode de transport en mettant en relation conducteurs et passagers. Selon une étude récente, 20% des Français utilisent régulièrement le covoiturage. Cette tendance s'explique notamment par la hausse du prix de l'essence et la prise de conscience environnementale. Cependant, certains critiques soulignent des problèmes de sécurité et de régulation.", questions: ["Pourquoi le covoiturage est-il populaire en France? / Why is carpooling popular in France?", "Quel pourcentage de Français utilisent le covoiturage? / What percentage of French people use carpooling?", "Quelles sont les raisons de cette tendance? / What are the reasons for this trend?", "Quelles critiques sont mentionnées? / What criticisms are mentioned?", "Quel rôle joue BlaBlaCar? / What role does BlaBlaCar play?"] }
        ],
        "B2": [
          { title: "L'intelligence artificielle et l'emploi", text: "La révolution numérique soulève des questions fondamentales sur l'avenir du travail. Si certains économistes prédisent la disparition de 40% des emplois actuels d'ici 2030, d'autres estiment que l'IA créera autant de postes qu'elle en détruira. Les secteurs les plus menacés sont la comptabilité, la logistique et certains métiers administratifs. En revanche, les professions nécessitant créativité, empathie et jugement complexe semblent mieux protégées. Face à ces transformations, les gouvernements s'interrogent sur la nécessité d'un revenu universel et d'une refonte profonde des systèmes d'éducation et de formation professionnelle.", questions: ["Quel est le pourcentage d'emplois menacés selon certains économistes? / What percentage of jobs are at risk according to some economists?", "Quels secteurs sont les plus menacés? / Which sectors are most at risk?", "Quels emplois semblent mieux protégés? / Which jobs seem better protected?", "Quelles solutions les gouvernements envisagent-ils? / What solutions are governments considering?", "Quelle nuance l'auteur apporte-t-il? / What nuance does the author bring?"] }
        ],
        "C1": [
          { title: "La démocratie à l'épreuve des réseaux sociaux", text: "Les démocraties libérales font face à un paradoxe inédit: les technologies censées favoriser la libre circulation de l'information se révèlent être des vecteurs de désinformation et de polarisation. Les algorithmes des plateformes numériques, optimisés pour maximiser l'engagement, créent des chambres d'écho qui renforcent les convictions préexistantes et marginaliseront les opinions modérées. Des études menées dans plusieurs pays démocratiques montrent une corrélation significative entre l'usage intensif des réseaux sociaux et la méfiance envers les institutions. Certains théoriciens évoquent désormais une 'infodémie' — une épidémie d'informations fausses — qui menacerait les fondements mêmes du débat démocratique. La question qui se pose est celle de la responsabilité: incombe-t-elle aux plateformes, aux États, ou aux citoyens eux-mêmes?", questions: ["Quel paradoxe l'auteur identifie-t-il? / What paradox does the author identify?", "Comment fonctionnent les algorithmes selon le texte? / How do algorithms work according to the text?", "Qu'est-ce qu'une 'infodémie'? / What is an 'infodemia'?", "Quelle question centrale le texte soulève-t-il? / What central question does the text raise?", "Quel est le ton général du texte? / What is the general tone of the text?"] }
        ]
      };

      const texts = readingTexts[level] || readingTexts["B1"];
      const randomText = texts[Math.floor(Math.random() * texts.length)];

      modeInstructions = `
You are a French reading comprehension teacher. Student level: ${level}

━━━━━━━━━━━━━━━━━━━━━
READING EXERCISE FORMAT:
━━━━━━━━━━━━━━━━━━━━━

STEP 1 — Present the reading text:

📖 READING EXERCISE — Level ${level}
━━━━━━━━━━━━━━━━━━━━━
📰 "${randomText.title}"

${randomText.text}

━━━━━━━━━━━━━━━━━━━━━
❓ COMPREHENSION QUESTIONS:
${randomText.questions.map((q, i) => (i+1) + '. ' + q).join('\n')}

━━━━━━━━━━━━━━━━━━━━━
📝 BONUS — Vocabulary in the text:
[Pick 5 important words from the text and explain their meaning]

Answer in French if B1+, English is fine for A1/A2.
━━━━━━━━━━━━━━━━━━━━━

STEP 2 — When student answers:
- Check each answer carefully against the text
- ✅ Correct with specific praise
- ❌ Wrong with: "Pas tout à fait. Relis cette partie: '[relevant quote]'"
- Point to exact sentence in text

STEP 3 — Final Score:
━━━━━━━━━━━━━━━━━━━━━
📊 Reading Score: X/${randomText.questions.length}

📚 Vocabulary understood: [assessment]
🧠 Comprehension level: [A1/A2/B1/B2/C1/C2]
💡 Tip for improvement: [specific advice]

🏆 TEF Reading Equivalent: CLB [X]
━━━━━━━━━━━━━━━━━━━━━

STEP 4 — After scoring:
- Explain any difficult vocabulary from the text
- Ask if they want another exercise
- Generate fresh texts on different topics

TEXT DIFFICULTY BY LEVEL:
A1: 50-80 words, present tense, simple vocab, with English translation of key words
A2: 80-120 words, past tense introduced, everyday topics
B1: 150-200 words, mixed tenses, news/society topics
B2: 200-300 words, complex sentences, abstract topics, connectors
C1/C2: 300-400 words, academic style, complex ideas, sophisticated vocabulary

Always generate fresh texts on varied topics:
- Society, technology, environment, culture, health, economy, education
- Never repeat the same text or topic
`;
    }

      const speakingTopics = {
        "A1": [
          "Comment tu t'appelles? (What is your name?)",
          "Tu habites où? (Where do you live?)",
          "Tu as des frères et sœurs? (Do you have siblings?)",
          "Tu aimes quoi comme nourriture? (What food do you like?)",
          "C'est quoi ton animal préféré? (What is your favorite animal?)"
        ],
        "A2": [
          "Décris ta journée typique. (Describe your typical day)",
          "Qu'est-ce que tu fais le weekend? (What do you do on weekends?)",
          "Parle-moi de ta famille. (Tell me about your family)",
          "Tu aimes voyager? Où es-tu allé? (Do you like to travel? Where have you been?)",
          "Qu'est-ce que tu fais comme travail ou études? (What is your job or studies?)"
        ],
        "B1": [
          "Quels sont tes loisirs préférés et pourquoi?",
          "Parle d'un film ou d'une série que tu as aimé récemment.",
          "Décris un voyage mémorable que tu as fait.",
          "Qu'est-ce qui est important pour toi dans un ami?",
          "Comment tu imagines ta vie dans 5 ans?"
        ],
        "B2": [
          "Quels sont les avantages et inconvénients des réseaux sociaux?",
          "Le télétravail: bonne ou mauvaise idée selon toi?",
          "Parle d'un défi que tu as surmonté dans ta vie.",
          "Comment les technologies changent-elles nos relations humaines?",
          "Si tu pouvais changer une chose dans ton pays, ce serait quoi?"
        ],
        "C1": [
          "Dans quelle mesure les médias influencent-ils notre opinion?",
          "Faut-il sacrifier la liberté individuelle pour la sécurité collective?",
          "L'immigration est-elle une richesse ou un problème pour les pays d'accueil?",
          "Comment concilier croissance économique et protection de l'environnement?",
          "La culture populaire appauvrit-elle ou enrichit-elle la société?"
        ],
        "C2": [
          "Analysez le paradoxe de la liberté dans les sociétés démocratiques modernes.",
          "Dans quelle mesure l'intelligence artificielle redéfinit-elle la notion de travail?",
          "La mondialisation culturelle: homogénéisation ou enrichissement mutuel?",
          "Peut-on encore parler de souveraineté nationale à l'ère de la globalisation?",
          "L'art contemporain a-t-il perdu le sens du beau au profit du concept?"
        ]
      };

      const topics = speakingTopics[level] || speakingTopics["B1"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      modeInstructions = `
You are an expert French speaking coach. Student level: ${level}

CURRENT SESSION TOPIC: ${randomTopic}

━━━━━━━━━━━━━━━━━━━━━
CRITICAL SUBTITLE RULE — VERY IMPORTANT:
━━━━━━━━━━━━━━━━━━━━━

${(level === "A1" || level === "A2") ? `
This student is ${level} level. They need English support.

MANDATORY FORMAT for ALL your French responses:
Write the French text first, then IMMEDIATELY put the English translation in brackets on a new line.

Example format:
"Bonjour ! Comment tu t'appelles ?
(Hello! What is your name?)"

"Très bien ! Et tu habites où ?
(Great! And where do you live?)"

EVERY French sentence MUST have English translation in brackets below it.
This helps A1/A2 students understand while still learning French.
The TTS will only speak the French — brackets are for reading only.
` : `
This student is ${level} level. Respond ONLY in French — no English translations.
Occasionally add pronunciation tips in brackets for difficult words.
Example: "Je suis enchanté (on-shon-tay) de vous rencontrer."
`}

━━━━━━━━━━━━━━━━━━━━━
SPEAKING COACH RULES:
━━━━━━━━━━━━━━━━━━━━━

1. Start with the topic above — ask naturally and conversationally
2. React to student's answer — build on what they say
3. Ask follow-up questions to keep conversation flowing
4. Gently correct mistakes — show correct version naturally:
   Example: "Ah tu veux dire 'je suis allé', pas 'je suis aller' ! Et ensuite?"
5. Encourage with: "Très bien!", "C'est parfait!", "Excellent!"
6. Every session must feel FRESH — use the topic bank variety

LEVEL-SPECIFIC BEHAVIOR:
Adapt your language and complexity strictly to the student level ${level}.
A1: very simple, slow, encouraging. A2: simple + past tense. B1: connectors, opinions. B2: full French, detailed. C1/C2: advanced debates.




IF student says "stop", "fin", "end", "arrête":
→ Give a speaking summary:

━━━━━━━━━━━━━━━━━━━━━
📊 Speaking Session Summary
━━━━━━━━━━━━━━━━━━━━━
🎯 Overall Score: X/10
🗣️ Fluency: X/10
📚 Vocabulary: X/10  
✅ Grammar: X/10
🔊 Natural Flow: X/10

💡 Top mistakes corrected:
• [mistake] → [correction]

✨ What you did well:
• [specific positive point]

📈 Focus on next session:
• [specific improvement tip]
━━━━━━━━━━━━━━━━━━━━━
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
