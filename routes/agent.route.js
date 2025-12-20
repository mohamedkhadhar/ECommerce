var express = require('express');
var router = express.Router();
const dotenv =require('dotenv')
var fetch = require ('node-fetch');
const path = require('path');
var { Client } = require ('@modelcontextprotocol/sdk/client/index.js');
var { StdioClientTransport } = require
('@modelcontextprotocol/sdk/client/stdio.js');
dotenv.config();
/* =========================================
MCP CLIENT
========================================= */
let mcpClient;
let availableTools = [];
async function initializeMCP() {
mcpClient = new Client({ name: 'ollama-mcp-client', version: '1.0.0' });
const transport = new StdioClientTransport({
command: 'node',
args: [path.resolve(__dirname, '../server.js')]
});
await mcpClient.connect(transport);
const toolsList = await mcpClient.listTools();
availableTools = toolsList.tools || [];
console.log(` MCP connecté – ${availableTools.length} outil(s)`);
availableTools.forEach(t =>
console.log(` • ${t.name}: ${t.description}`)
);
}
initializeMCP().catch(err => {
console.error(' Erreur MCP', err);
process.exit(1);
});
/* =========================================
MCP TOOL EXEC
========================================= */
async function executeToolViaMCP(toolName, args) {
console.log(` MCP call → ${toolName}`, args);
const result = await mcpClient.callTool({
name: toolName,
arguments: args
});
const text = result?.content?.find(c => c.type === 'text')?.text;
try {
return JSON.parse(text);
} catch {
return text;
}
}
/* =========================================
OLLAMA CALL
========================================= */
async function callOllama(messages) {
const res = await fetch('http://127.0.0.1:11434/api/chat', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
model: 'llama3.1',
messages,
stream: false,
options: {
temperature: 0.1
}
})
});
const data = await res.json();
return data.message.content;
}
/* =========================================
ROUTE PRINCIPALE
========================================= */
router.post('/', async (req, res) => {
const { message } = req.body;
if (!message) {
return res.status(400).json({ error: 'Message manquant' });
}
const systemPrompt = `
Tu es un assistant BACKEND pour un site e-commerce.

TON RÔLE :
- Comprendre l'intention de l'utilisateur
- Choisir le BON TOOL
- Ne JAMAIS inventer de données

RÈGLES STRICTES :
- Tu DOIS répondre uniquement en JSON valide (strict).
- Si la question concerne des DONNÉES → UTILISE UN TOOL.
- Tu NE DOIS JAMAIS répondre en texte libre ni faire d'explication.
- Toujours retourner une seule structure JSON (outil ou final).

FORMAT DE RÉPONSE :

1) Pour appeler un tool :
{ "tool": "nom-du-tool", "arguments": { ... } }

2) Pour une réponse finale simple :
{ "final": "texte" }

LISTE CANONIQUE DES CATÉGORIES (UTILISER EXACTEMENT CES LIBELLÉS)
[
  "jardin et exterieur",
  "cosmetique",
  "Électroménager",
  "Électroniques",
  "Téléphone & Tablette",
  "Informatique",
  "Mode",
  "Articles de sport",
  "Santé & Beauté",
  "Superette",
  "jeux vidéos",
  "Intérieur",
  "MODE HOMME"
]

INSTRUCTIONS SPÉCIALES POUR LES CATÉGORIES (TRÈS IMPORTANT)
- Si l'utilisateur mentionne une catégorie (ex: "cosmétique", "Telephones", "mode homme", "téléphone & tablette", "électromenager", "jeux video"...), tu dois :
  1) Normaliser ce que l'utilisateur a dit (supprimer accents, minuscules, supprimer ponctuation) uniquement pour COMPARAISON.
  2) Comparer la forme normalisée aux formes normalisées de la LISTE CANONIQUE ci‑dessus.
  3) Si une correspondance exacte ou proche existe, tu DOIS appeler le tool getArticlesByCategory et passer dans les arguments le libellé CANONIQUE EXACT tel qu'il apparaît dans la liste ci‑dessus.
     Exemple : si l'utilisateur dit "Cosmétique" ou "cosmetique", appelle getArticlesByCategory avec { "nomcategorie": "cosmetique" }.
     Exemple : si l'utilisateur dit "telephones" ou "Téléphone & Tablette", appelle getArticlesByCategory avec { "nomcategorie": "Téléphone & Tablette" }.
- Si plusieurs catégories de la liste semblent correspondre, choisis la meilleure correspondance (privilégie l'égalité après normalisation, sinon la correspondance contenant la chaîne).
- Si AUCUNE catégorie de la liste ne correspond, ne pas deviner : retourne plutôt le tool getListCategories pour que l'application cliente obtienne la liste canonique.

RÈGLES D’INTENTION (QUAND UTILISER QUEL TOOL)
- Pour "chercher", "trouver", "afficher", "liste", "donne-moi", "montre" → UTILISE UN TOOL.
- Si l'utilisateur demande "liste des catégories" → { "tool": "getListCategories", "arguments": {} }
- Si l'utilisateur demande "liste des articles" → { "tool": "getListArticles", "arguments": {} }
- Si l'utilisateur demande "chercher les articles de catégorie X" → appliquer la logique ci‑dessus et appeler { "tool": "getArticlesByCategory", "arguments": { "nomcategorie": "<libellé-canonique>" } }

EXEMPLES OBLIGATOIRES (format de sortie exact)
Question : "chercher les articles de catégorie Homme"
Réponse :
{ "tool": "getArticlesByCategory", "arguments": { "nomcategorie": "Mode" } }

Question : "liste des catégories"
Réponse :
{ "tool": "getListCategories", "arguments": {} }

Question : "liste des articles"
Réponse :
{ "tool": "getListArticles", "arguments": {} }

Question : "liste de article de categorie cosmetique"
Réponse :
{ "tool": "getArticlesByCategory", "arguments": { "nomcategorie": "cosmetique" } }

Question : "bonjour"
Réponse :
{ "final": "Bonjour !" }

IMPORTANT :
- Ne retourne jamais de texte explicatif. Seul le JSON formaté ci‑dessus est autorisé.
- Si tu n'es pas sûr de la catégorie, appelle getListCategories (ne devine pas).
`.trim();


let messages = [
{ role: 'system', content: systemPrompt },
{ role: 'user', content: message }
];



let history = [];
let turns = 0;
const MAX_TURNS = 8;
try {
while (turns < MAX_TURNS) {
turns++;
const raw = await callOllama(messages);
console.log('🧠 Ollama:', raw);
let parsed;
try {
parsed = JSON.parse(raw);
} catch {
return res.json({ success: true, message: raw });
}
// FIN
if (parsed.final) {
return res.json({
success: true,
message: parsed.final,
turns,
toolsCalled: history
});
}
if (parsed.tool) {
  const toolResult = await executeToolViaMCP(
    parsed.tool,
    parsed.arguments || {}
  );

  return res.json({
    success: true,
    tool: parsed.tool,
    arguments: parsed.arguments,
    data: toolResult
  });
}

return res.json({ message: raw });
}
return res.status(500).json({
error: 'Limite de tours atteinte',
toolsCalled: history
});
} catch (err) {
console.error(err);
res.status(500).json({
error: 'Erreur serveur',
message: err.message
});
}
});

module.exports = router;