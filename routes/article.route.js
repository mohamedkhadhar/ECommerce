const express = require('express');
const router = express.Router();
const Article=require("../models/article")
const Scategorie =require("../models/scategorie")
//mynjm y7el article kima l user connecté avec token
const {verifyToken} =require("../middleware/verifytoken")
const { uploadFile } = require('../middleware/uploadfile');
const {authorizeRoles} = require("../middleware/authorizeRoles")
const Categorie = require('../models/categorie');
// afficher la liste des articles.
router.get('/',async (req, res )=>{
try {
const articles = await Article.find({}, null, {sort: {'_id': -
1}}).populate("scategorieID").exec();
res.status(200).json(articles);
} catch (error) {
res.status(404).json({ message: error.message });
}
});
router.post('/', uploadFile.single("imageart"), async (req, res) => {
  try {
    const { reference, designation, prix, marque, qtestock, scategorieID } = req.body;
    const imageart = req.file ? req.file.filename : null; // récupérer le nom du fichier uploadé

    const nouvarticle = new Article({
      reference,
      designation,
      prix,
      marque,
      qtestock,
      scategorieID,
      imageart
    });

    await nouvarticle.save();
    res.status(200).json(nouvarticle); // conserve le status que tu utilisais
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});
// créer un nouvel article
router.post('/', async (req, res) => {
const nouvarticle = new Article(req.body)

try {
await nouvarticle.save();
res.status(200).json(nouvarticle );
} catch (error) {
res.status(404).json({ message: error.message });
}
});
// afficher la liste des articles par page
router.get('/pagination', async(req, res) => {
const page = req.query.page ||1 // Current page
const limit = req.query.limit ||5; // Number of items per page
// Calculez le nombre d'éléments à sauter (offset)
const offset = (page - 1) * limit;
try {
// Effectuez la requête à votre source de données en utilisant les paramètresde pagination

const articlesTot = await Article.countDocuments();
const articles = await Article.find( {}, null, {sort: {'_id': -1}})
.skip(offset)
.limit(limit)
res.status(200).json({articles:articles,tot:articlesTot});
} catch (error) {
res.status(404).json({ message: error.message });
}
});
// chercher un article
router.get('/:articleId',async(req, res)=>{
try {
const art = await Article.findById(req.params.articleId);
res.status(200).json(art);
} catch (error) {
res.status(404).json({ message: error.message });
}
});
// modifier un article
router.put('/:articleId', async (req, res)=> {
try {
const art = await Article.findByIdAndUpdate(
req.params.articleId,
{ $set: req.body },
{ new: true }
);
const articles = await
Article.findById(art._id).populate("scategorieID").exec();
res.status(200).json(articles);
} catch (error) {
res.status(404).json({ message: error.message });
}
});
// Supprimer un article
router.delete('/:articleId', async (req, res)=> {
const id = req.params.articleId;
await Article.findByIdAndDelete(id);
res.json({ message: "article deleted successfully." });
});
// chercher un article par s/cat
router.get('/scat/:scategorieID',async(req, res)=>{
try {
const art = await Article.find({ scategorieID:
req.params.scategorieID}).exec();
res.status(200).json(art);
} catch (error) {
res.status(404).json({ message: error.message });
}
});
// chercher un article par cat
router.get('/cat/:categorieID', async (req, res) => {
try {
// Recherche des sous-catégories correspondant à la catégorie donnée
const sousCategories = await Scategorie.find({ categorieID:
req.params.categorieID }).exec();

// Initialiser un tableau pour stocker les identifiants des sous-catégories trouvées

const sousCategorieIDs = sousCategories.map(scategorie => scategorie._id);
// Recherche des articles correspondant aux sous-catégories trouvées
const articles = await Article.find({ scategorieID: { $in:
sousCategorieIDs } }).exec();
res.status(200).json(articles);
} catch (error) {
res.status(404).json({ message: error.message });
}
});
// route /by-category-name/:nomcategorie (version tolérante)
router.get('/by-category-name/:nomcategorie', async (req, res) => {
  try {
    // decode et trim pour être sûr (Express décode déjà, mais on normalise)
    const rawNom = req.params.nomcategorie || '';
    const nomcategorie = decodeURIComponent(rawNom).trim();
    console.log('Recherche catégorie pour nomcategorie =', JSON.stringify(nomcategorie));

    // 1) Tentative avec collation (insensible à la casse et aux accents si Mongo le supporte)
    // Utilisez locale 'fr' pour francophone ; strength:1 ou 2 selon l'ignore des accents/casse
    let cat = null;
    try {
      cat = await Categorie.findOne({ nomcategorie }).collation({ locale: 'fr', strength: 1 });
    } catch (err) {
      // Si collation non supportée sur votre version/collection, on ignore l'erreur et on ira au fallback
      console.warn('Collation failed or not supported, falling back to regex:', err.message || err);
    }

    // 2) Fallback : recherche insensible à la casse avec regex (on échappe les caractères spéciaux)
    if (!cat) {
      const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const esc = escapeRegex(nomcategorie);
      cat = await Categorie.findOne({ nomcategorie: { $regex: `^${esc}$`, $options: 'i' } });
    }

    if (!cat) {
      console.log('Catégorie introuvable pour:', nomcategorie);
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // 3) Trouver les sous-catégories puis les articles
    const scats = await Scategorie.find({ categorieID: cat._id }).exec();
    const scatsIds = scats.map(s => s._id);
    const articles = await Article.find({ scategorieID: { $in: scatsIds } }).populate('scategorieID');

    return res.status(200).json(articles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});





module.exports = router;