import express from 'express';
import bodyParser from 'body-parser';
import generatorController from './src/controllers/generator.js';

const app = express();

// Middleware to handle JSON data
app.use(bodyParser.json()); // Add this middleware to parse JSON bodies
app.use(bodyParser.urlencoded({extended: false}));

app.use("/generator", generatorController);

app.use((req, res, next) => {
    res.status(404).send('<h1>404</h1>');
})

app.listen(4500);
