import express from 'express';
import bodyParser from 'body-parser';
import controller from './routes/controller.js';

const app = express();

app.use(bodyParser.urlencoded({extended: false}));

app.use(controller);

app.use((req, res, next) => {
    res.status(404).send('<h1>404</h1>');
})

app.listen(4500);
