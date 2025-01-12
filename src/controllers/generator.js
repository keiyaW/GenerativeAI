import express from 'express';
import OpenAI from 'openai';
import { CohereClientV2 } from 'cohere-ai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const openai_api_key = process.env.OPENAI_API_KEY || "OPENAI API Key not found!";
const openai = new OpenAI({
    apiKey: openai_api_key,  // Pass the API key to the OpenAI instance
    dangerouslyAllowBrowser: true,
});

const cohere_api_key = process.env.COHERE_API_KEY || "Cohere API Key not found!";
const cohere = new CohereClientV2({
    token: cohere_api_key,
  });

const srcDir = path.resolve('./src/');

router.get('/', (req, res, next) => {
    res.sendFile(path.join(srcDir, 'views', 'generator.html'));
});

router.post('/generate-response', (req, res, next) => {

    const { details } = req.body;

    if (!details) {
        return res.status(400).send('Details specification is required.');
    }

    var response = null;
    try {
        response = processGPTAI();
        const response = "your input : \n" + details;
        res.send(response);
    } catch (error) {
        console.error("Error with OpenAI request:", error);
        res.status(500).send("Something went wrong with the OpenAI request.");
    }
});

function processGPTAI(details) {
    const messages = [
        {
            role: 'system',
            content: 'You are my friend.'
            // content: 'You are an expert IT instructor and teacher.' + 
            //         'Your answer should be completed within 100 tokens and contains only 1 or 2 points or topics.'
        },
        {
            role: 'user',
            content: 'Who is Indonesia\'s president on November 2024?'
            // content: 'Hi, i am a junior backend developer. I have experience in building REST API, database, cache, and kafka.' + 
            //         'What more should I learn?'
        }
    ];

    // const response = await useOpenAIGPT(messages);
    
    // const response = await useCohereAI(messages);

    // await callCohereStream(messages);

    return response?response:"";
    
}


async function useCohereAI(messages) {
    return await cohere.chat({
        model: 'command-r-plus',
        messages: messages
    });;
}


async function useOpenAIGPT(messages) {
    return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 1.5,
        max_tokens: 100
    });
}

async function callCohereStream(messages) {
    const stream = await cohere.chatStream({
        model: 'command-r-plus',
        messages: messages,
    });

    for await (const chatEvent of stream) {
        console.log(chatEvent);
        if (chatEvent.type === 'content-delta') {
            console.log(chatEvent.delta?.message);
        }
    }
}

export default router;