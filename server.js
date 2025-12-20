const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } =
require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require("axios");
const { z } = require("zod");

// 2. Initialisation du Serveur
const server = new McpServer({
name: "ecommerce-backend-server",
version: "1.0.0",
});

server.tool(
"getListUsers",
{}, // Pas de paramètres
async () => {
const response = await axios.get(
"http://localhost:3001/api/users/getallusers"
);
return {
content: [
{
type: "text",
text: JSON.stringify(response.data)
}
]
};
}
);

server.tool(
"list-users",
'List users optionally filtered by firstname',
{ firstname: z.string().optional().describe('Filter by firstname') },
async ({ firstname }) => {
console.error('MCP list-users appelé avec:', firstname);
const response = await axios.post(
'http://localhost:3001/api/users/getuserbyname',
{ firstname },
);
const users = await response.data;
if (users.length === 0) {
return { content: [{ type: 'text', text: `user de la firstname ${firstname
?? ''} not found.` }] };
}
console.error(users);
return { content: [{ type: "text", text: JSON.stringify(users) }]

};
}
);
server.tool(
  "getListCategories",
  {}, // aucun paramètre
  async () => {
    const response = await axios.get(
      "http://localhost:3001/api/categories"
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data)
        }
      ]
    };
  }
);
server.tool(
  "getListArticles",
  {}, // aucun paramètre
  async () => {
    const response = await axios.get(
      "http://localhost:3001/api/articles"
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data)
        }
      ]
    };
  }
);
server.tool(
  "getScategories",
  {}, // aucun paramètre
  async () => {
    const response = await axios.get(
      "http://localhost:3001/api/scategories"
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data)
        }
      ]
    };
  }
);
server.tool(
  "getArticlesByCategory",
  "Get articles by category name",
  {
    nomcategorie: z.string().describe("Nom de la catégorie")
  },
  async ({ nomcategorie }) => {
    const normalize = s => {
      if (!s) return "";
      return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // supprime accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
    };

    try {
      console.error(`[MCP] getArticlesByCategory called with nomcategorie="${nomcategorie}"`);
      const targetNorm = normalize(nomcategorie);
      console.error(`[MCP] targetNorm="${targetNorm}"`);

      // 1) récupérer toutes les catégories
      const catRes = await axios.get("http://localhost:3001/api/categories");
      const allCats = Array.isArray(catRes.data) ? catRes.data : [];
      console.error(`[MCP] categories count=${allCats.length}`);

      // 2) tenter match normalisé
      let categorie = allCats.find(c => normalize(c.nomcategorie) === targetNorm);
      if (categorie) {
        console.error(`[MCP] matched by normalized name: id=${categorie._id}, nom="${categorie.nomcategorie}"`);
      } else {
        // fallback regex insensitive
        const esc = nomcategorie.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        categorie = allCats.find(c => new RegExp(`^${esc}$`, "i").test(c.nomcategorie));
        if (categorie) {
          console.error(`[MCP] matched by regex: id=${categorie._id}, nom="${categorie.nomcategorie}"`);
        } else {
          // fallback best-effort: contains (normalize)
          const maybe = allCats.find(c => normalize(c.nomcategorie).includes(targetNorm) || targetNorm.includes(normalize(c.nomcategorie)));
          if (maybe) {
            categorie = maybe;
            console.error(`[MCP] matched by contains fallback: id=${categorie._id}, nom="${categorie.nomcategorie}"`);
          }
        }
      }

      if (!categorie) {
        console.error(`[MCP] No category matched for "${nomcategorie}"`);
        return { content: [{ type: "text", text: JSON.stringify([]) }] };
      }

      // 3) récupérer scategories via endpoint dédié si existant
      let scats = [];
      try {
        const scRes = await axios.get(`http://localhost:3001/api/scategories/cat/${categorie._id}`);
        scats = Array.isArray(scRes.data) ? scRes.data : [];
        console.error(`[MCP] /scategories/cat/${categorie._id} returned count=${scats.length}`);
      } catch (e) {
        console.error(`[MCP] /scategories/cat/${categorie._id} not available or errored: ${e.message}`);
      }

      // 4) fallback : récupérer toutes les scategories et filtrer en mémoire (gère string vs ObjectId)
      if (!scats.length) {
        try {
          const allScRes = await axios.get("http://localhost:3001/api/scategories");
          const allSc = Array.isArray(allScRes.data) ? allScRes.data : [];
          console.error(`[MCP] all scategories count=${allSc.length}`);
          const catIdStr = String(categorie._id);
          scats = allSc.filter(sc => {
            const cid = sc.categorieID;
            return String(cid) === catIdStr;
          });
          console.error(`[MCP] after filtering all scategories by categorieID, found scats count=${scats.length}`);
        } catch (e) {
          console.error(`[MCP] failed to get all scategories: ${e.message}`);
        }
      }

      // ======= INSERTED FALLBACK: check articles with populated scategorie.categorieID =======
      if (!scats.length) {
        try {
          const artResAll = await axios.get("http://localhost:3001/api/articles");
          const allArts = Array.isArray(artResAll.data) ? artResAll.data : [];
          console.error(`[MCP] fallback: checking ${allArts.length} articles for populated scategorie.categorieID`);
          const catIdStr = String(categorie._id);

          const articlesMatchingViaPopulatedScat = allArts.filter(a => {
            const sc = a.scategorieID;
            // si sc est peuplé et contient categorieID (gère string ou ObjectId)
            const scCatId = sc && sc.categorieID ? String(sc.categorieID) : null;
            return scCatId && scCatId === catIdStr;
          });

          console.error(`[MCP] fallback found articles count=${articlesMatchingViaPopulatedScat.length}`);

          if (articlesMatchingViaPopulatedScat.length) {
            return { content: [{ type: "text", text: JSON.stringify(articlesMatchingViaPopulatedScat) }] };
          }
        } catch (e) {
          console.error('[MCP] fallback error while checking articles:', e.message || e);
        }

        // si rien trouvé via fallback, renvoyer tableau vide comme avant
        console.error(`[MCP] No scategories or fallback articles found for category id=${categorie._id}`);
        return { content: [{ type: "text", text: JSON.stringify([]) }] };
      }
      // ======= END inserted fallback =======

      const scIdsStr = scats.map(s => String(s._id));
      console.error(`[MCP] scIdsStr=${JSON.stringify(scIdsStr)}`);

      // 5) récupérer tous les articles et filtrer en comparant scategorieID (populated or not)
      const artRes = await axios.get("http://localhost:3001/api/articles");
      const allArts = Array.isArray(artRes.data) ? artRes.data : [];
      console.error(`[MCP] articles total count=${allArts.length}`);

      const articles = allArts.filter(a => {
        const sc = a.scategorieID;
        const scId = sc && sc._id ? String(sc._id) : (sc ? String(sc) : null);
        return scId && scIdsStr.includes(scId);
      });

      console.error(`[MCP] filtered articles count=${articles.length}`);
      if (articles.length) {
        console.error(`[MCP] sample article ids=${articles.slice(0,3).map(x=>x._id).join(',')}`);
      }

      return { content: [{ type: "text", text: JSON.stringify(articles) }] };
    } catch (err) {
      console.error("[MCP] getArticlesByCategory error:", err && err.message ? err.message : err);
      return { content: [{ type: "text", text: JSON.stringify([]) }] };
    }
  }
);




// 4. Lancement avec Transport STDIO
async function main() {
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Server is running on STDIO...");
}
main().catch((err) => {
console.error("Fatal Error:", err);
process.exit(1);
});