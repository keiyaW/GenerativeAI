import express from 'express';
import OpenAI from 'openai';
import { CohereClientV2 } from 'cohere-ai';
import path from 'path';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

dotenv.config();

const active_ai = true;

const ai_used = 'openai'; // cohere, openai

const router = express.Router();

const openai_api_key = process.env.OPENAI_API_KEY || "OPENAI API Key not found!";
const openai = new OpenAI({
    apiKey: openai_api_key,  // Pass the API key to the OpenAI instance
    dangerouslyAllowBrowser: true
});

const cohere_api_key = process.env.COHERE_API_KEY || "Cohere API Key not found!";
const cohere = new CohereClientV2({
    token: cohere_api_key,
  });

const srcDir = path.resolve('./src/');

const system_setup = 'You are an expert ServiceNow developer.'
    + 'you should reply with test cases scenario for servicenow.'
    + 'You shouldnt include unnecessary sentences/words in the response.'
    + 'Your answer should be completed within 1000 tokens using business level japanese.'
    + 'Your answer must not contain newlines or semicolon, and should be a proper complete response!'
    + 'You should response in format (Number;Test Scenario;Steps for testing;Excpected Result) for each test case and separate each case using | character without using any newline.'
    + 'The test cases should cover all possible scenarios to test, it would be better if some test cases can be combined into one  but dont include the scenario which not mentioned in requirement.'
    + 'Example Response format :'
    + 'No:1;Scenario:First Scenario;Steps:-stepone>>-steptwo;Result:First result|No:2;Scenario:Second Scenario;Steps:-stepone>>-steptwo;Result:Second Result'
    + '\nTest Scenario value in each test case scenario should be unique.'
    + 'in steps, use >> without space to separate between step, example: ・stepone>>・steptwo'
    + '\nLimit the test case to 10.';

const exportToSpreadsheet = async (data) => {

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    
    // Add a worksheet
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Set columns (header definitions)
    worksheet.columns = [
        { header: '番号', key: 'no' },
        { header: 'シナリオ', key: 'scenario' },
        { header: '手順', key: 'steps' },
        { header: '期待結果', key: 'exp-res' },
        { header: '実際の結果', key: 'act-res'}
    ];
    
    // Add rows (data)
    worksheet.addRows(data);

    // Set wrap text for all cells
    worksheet.eachRow((row, rowIndex) => {
        row.eachCell((cell, colIndex) => {
            cell.alignment = { wrapText: true, vertical: 'top' };
            const column = worksheet.getColumn(colIndex + 1); // ExcelJS columns are 1-based            

            column.width = colIndex == 0? 5: 50; // Set the new width
            if (rowIndex == 1) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '6593c7' } // Yellow color (ARGB format)
                };
            }
        });
    });

    // Apply bold style to the first row (header)
    worksheet.getRow(1).font = { bold: true };

    // Generate the Excel file buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    return excelBuffer; // Return buffer instead of using FileSaver
};

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
        response = await processGeneration(details);

        // response = "No:1;Scenario:Validation for Name Input Field;Steps:-Open the Form from the Record Producer with valid roles (test-admin/test-cust)>>-Enter a name with numeric characters (e.g., "John123")>>-Submit the form;Expected Result:An error message is displayed stating that the Name field must contain alphabets only.|No:2;Scenario:Validation for Email Input Field;Steps:-Open the Form from the Record Producer with valid roles (test-admin/test-cust)>>-Input an incorrectly formatted email (e.g., "invalidemail@nopoint")>>-Submit the form;Expected Result:An error message is displayed stating that an invalid email format is provided.|No:3;Scenario:Restriction on Access to Form;Steps:-Attempt to access the Form from the Record Producer with user role neither test-admin nor test-cust>>-Check access;Expected Result:Access to the form is denied with an appropriate message indicating insufficient permissions."
        var resArray = "";

        switch(ai_used){
            case "openai":
                if (response.choices != null) {
                    resArray = response.choices[0].message.content.split('|');
                    console.log(response.choices[0].message.content);
                }
                break;
            case "cohere":
                resArray = response.message.content[0].text.split('|');
                console.log(response.message.content[0].text);
                break;
        }

        console.log(resArray);

        var finalResponse = [];

        resArray.forEach((data) => {
            var dataDetail = data.replace("No:","").replace("Scenario:","").replace("Steps:","").replace("Result:","").replace(/>>/g, '\n').split(';');
            finalResponse.push(dataDetail);
        })
        console.log(finalResponse);

        const excelFile = await exportToSpreadsheet(finalResponse);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=test.xlsx");
    
        res.end(excelFile);
    } catch (error) {
        console.error("Error with OpenAI request:", error);
        res.status(500).send("Something went wrong with the OpenAI request.");
    }
});

async function processGeneration(details) {
    const messages = [
        {
            role: 'system',
            content: system_setup
        },
        {
            role: 'user',
            content: "I want to develop in servicenow with requirements: \n" + details
        }
    ];


    if (active_ai) {
        var aiRes;
        if (ai_used == "cohere") {
            aiRes = await useCohereAI(messages);
        } 
        else if(ai_used == "openai") {
            aiRes = await useOpenAI(messages);
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
        messages: messages,
        temperature: 0.6
    });;
}


async function useOpenAI(messages) {
    return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.6,
        max_tokens: 1000
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