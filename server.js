require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.post('/api/chat', async (req, res) => {
    try {
        const { history, state } = req.body;

        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ error: "Invalid history format" });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
             return res.status(500).json({ error: "API key missing" });
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        
        const systemPrompt = `You are "Election Navigator", a helpful AI for Indian voters.
Your goal is to provide COMPLETE, structured, and actionable information.

STRICT REQUIREMENTS:
- Never return partial or cut-off responses.
- If providing instructions, always include ALL necessary steps (minimum 3-4 steps).
- Responses must be complete even if they are concise.
- Use the format below for all responses.

RESPONSE FORMAT:
🗳️ [Title]

1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Step 4]

📌 Tip: [1-sentence helpful tip]
Next: [Action 1] or [Action 2]

RULES:
- No long paragraphs.
- Use **bold** for emphasis.
- Use [Link Text](URL) for links.
- User Age: ${state?.age || 'unknown'}.`;

        const geminiContents = history.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const apiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: geminiContents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800,
                }
            })
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error(`[AI Error]`, errorData);
            return res.status(apiResponse.status).json({ error: "AI Busy" });
        }

        const data = await apiResponse.json();
        
        if (data.candidates && data.candidates[0].content) {
            let aiText = data.candidates[0].content.parts[0].text;
            res.json({ response: aiText.trim() });
        } else {
            res.json({ response: "I'm having trouble thinking clearly. Next: Registration steps or Documents needed?" });
        }
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
