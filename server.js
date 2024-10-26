require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
const port = 3000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Sample exam questions
const examQuestions = [
    {
        id: 1,
        question: "Welche der folgenden Aussagen zur Lebensversicherung ist korrekt?",
        options: [
            "Die Todesfallleistung wird nur bei Unfalltod ausgezahlt",
            "Eine Risikolebensversicherung beinhaltet immer eine Sparkomponente",
            "Die Kapitallebensversicherung kombiniert Todesfallschutz mit Sparvorgang",
            "Lebensversicherungen können nicht gekündigt werden"
        ],
        correctAnswer: 2
    },
    {
        id: 2,
        question: "Was ist ein wichtiges Merkmal der gesetzlichen Krankenversicherung?",
        options: [
            "Nur Arbeitnehmer können versichert werden",
            "Das Solidaritätsprinzip",
            "Keine Familienversicherung möglich",
            "Beiträge sind einkommensunabhängig"
        ],
        correctAnswer: 1
    }
];

// API endpoints
app.get('/api/questions', (req, res) => {
    res.json(examQuestions);
});

app.post('/api/evaluate', (req, res) => {
    const { questionId, answer } = req.body;
    const question = examQuestions.find(q => q.id === questionId);
    
    if (!question) {
        return res.status(404).json({ error: 'Question not found' });
    }

    const isCorrect = answer === question.correctAnswer;
    res.json({
        correct: isCorrect,
        feedback: isCorrect ? 
            "Richtig! Sehr gut gemacht!" : 
            `Nicht ganz richtig. Die korrekte Antwort ist: ${question.options[question.correctAnswer]}`
    });
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, context = [] } = req.body;

        const systemPrompt = `You are an expert IHK exam preparation assistant for "Versicherungskaufmann/frau". 
        Your role is to:
        1. Answer questions about insurance concepts
        2. Provide practice exam questions
        3. Explain complex insurance topics
        4. Give feedback on answers
        5. Share exam preparation strategies
        
        Always respond in German and be encouraging but professional.`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...context,
            { role: "user", content: message }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
        });

        res.json({
            response: completion.choices[0].message.content,
            context: [
                ...context,
                { role: "user", content: message },
                { role: "assistant", content: completion.choices[0].message.content }
            ]
        });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ error: 'Fehler bei der Verarbeitung der Anfrage' });
    }
});

app.post('/api/generate-question', async (req, res) => {
    try {
        const { topic } = req.body;

        const prompt = `Erstelle eine IHK-Prüfungsfrage zum Thema ${topic} für Versicherungskaufleute. 
        Format:
        {
            "question": "Die Frage",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0,
            "explanation": "Detaillierte Erklärung der richtigen Antwort"
        }`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are an IHK insurance exam expert." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        });

        const questionData = JSON.parse(completion.choices[0].message.content);
        res.json(questionData);
    } catch (error) {
        console.error('Question Generation Error:', error);
        res.status(500).json({ error: 'Fehler bei der Fragengenerierung' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
