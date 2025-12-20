const express = require('express');
const router = express.Router();
// Créer une instance de categorie.
const Categorie = require('../models/categorie');
// afficher la liste des categories.
router.get('/', async (req, res) => {
    try {
        const categories = await Categorie.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});
// chercher une catégorie
router.get('/:categorieId', async (req, res) => {
    try {
        const categorie = await Categorie.findById(req.params.categorieId);
        if (!categorie) return res.status(404).json({ message: "Catégorie non trouvée" });
        res.status(200).json(categorie);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});
// modifier une catégorie
router.put('/:categorieId', async (req, res) => {
    try {
        const { nomcategorie, imagecategorie } = req.body;
        const categorie = await Categorie.findByIdAndUpdate(req.params.categorieId, { nomcategorie, imagecategorie }, { new: true });
        if (!categorie) return res.status(404).json({ message: "Catégorie non trouvée" });
        res.status(200).json(categorie);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});
// Supprimer une catégorie
router.delete('/:categorieId', async (req, res) => {
    try {
        const categorie = await Categorie.findByIdAndDelete(req.params.categorieId);
        if (!categorie) return res.status(404).json({ message: "Catégorie non trouvée" });
        res.status(200).json({ message: "Catégorie supprimée" });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});
// créer une nouvelle catégorie
router.post('/', async (req, res) => {
const { nomcategorie, imagecategorie} = req.body;
const newCategorie = new Categorie({nomcategorie:nomcategorie,
imagecategorie:imagecategorie})
try {
await newCategorie.save();
res.status(200).json(newCategorie );
} catch (error) {
res.status(404).json({ message: error.message });
}

});
// modifier une catégorie
router.put('/:categorieId', async (req, res)=> {
try {
const cat1 = await Categorie.findByIdAndUpdate(
req.params.categorieId,
{ $set: req.body },
{ new: true }
);
res.status(200).json(cat1);
} catch (error) {
res.status(404).json({ message: error.message });
}
});
// Supprimer une catégorie
router.delete('/:categorieId', async (req, res)=> {
const id = req.params.categorieId;
await Categorie.findByIdAndDelete(id);
res.json({ message: "categorie deleted successfully." });

});
// chercher une catégorie
router.get('/:categorieId',async(req, res)=>{
try {
const cat = await Categorie.findById(req.params.categorieId);
res.status(200).json(cat);
} catch (error) {
res.status(404).json({ message: error.message });
}
});


module.exports = router;