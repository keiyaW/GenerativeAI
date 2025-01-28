import express from 'express';
import OpenAI from 'openai';
import { CohereClientV2 } from 'cohere-ai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const active_ai = false;

const ai_used = 'openai'; // cohere, openai

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

router.post('/generate-response', async (req, res, next) => {

    const { details } = req.body;

    if (!details) {
        return res.status(400).send('Details specification is required.');
    }

    var response = null;
    try {
        response = await processGPTAI(details);
        // const response = "your input : \n" + details;

        if(active_ai) {
            switch(ai_used){
                case "openai":
                    if (response.choices != null) {
                        console.log(response.choices[0].message.content);
                        res.send(response.choices[0].message.content);
                    }
                    break;
                case "cohere":
                    console.log(response.message.content);
                    res.send(response.message.content[0].text);
                    break;
            }
        }
        else {        
            res.send(response);
        }
    } catch (error) {
        console.error("Error with OpenAI request:", error);
        res.status(500).send("Something went wrong with the OpenAI request.");
    }
});

async function processGPTAI(details) {
    const messages = [
        {
            role: 'system',
            content: 'You are an expert ServiceNow developer.' 
                    + 'you should reply with the quite simple development steps in ServiceNow, and testcases scenario.' 
                    + 'Your answer should be completed within 100 tokens and should reply completed response.' 
                    + 'You should response using business level japanese and use proper non-redundant newline in the response!'
                    // + 'Dont include unnnecessary newline in your answer!'
        },
        {
            role: 'user',
            content: details
        }
    ];


    if (active_ai) {
        var aiRes;
        if (ai_used == "cohere") {
            aiRes = await useCohereAI(messages);
        } 
        else if(ai_used == "openai") {
            aiRes = await useOpenAIGPT(messages);
        }
    
        // await callCohereStream(messages);

        return aiRes?aiRes:"";
    } else {
        return 'inactive';
    }
    
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