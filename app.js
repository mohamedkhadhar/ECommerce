const express = require('express');
const mongoose = require("mongoose");
const dotenv = require('dotenv');
const cors = require('cors');

const app = express();

// config dotenv
dotenv.config();

// cors
app.use(cors());

// BodyParser Middleware
app.use(express.json());

// Connexion à la base de données
mongoose.connect(process.env.DATABASECLOUD)
  .then(() => {
    console.log("DataBase Successfully Connected");
  })
  .catch(err => {
    console.log("Unable to connect to database", err);
    process.exit();
  });

//  DES ROUTERS (AVANT app.use)
const userRouter = require("./routes/user.route");
const categorieRouter = require("./routes/categorie.route");
const scategorieRouter = require("./routes/scategorie.route");
const articleRouter = require("./routes/article.route");
const llmRouter=require('./routes/agent.route')

// Routes
app.get("/", (req, res) => {
  res.send("bonjour");
});

app.use('/api/users', userRouter);
app.use('/api/categories', categorieRouter);
app.use('/api/scategories', scategorieRouter);
app.use('/api/articles', articleRouter);
app.use('/api/llm', llmRouter);
app.use(express.static(__dirname + '/'));
// Server
app.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
});

module.exports = app;
