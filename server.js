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
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
             return res.status(500).json({ error: "API key is not configured on the server." });
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        
        const systemPrompt = `You are "The Election Navigator", a neutral, non-partisan AI assistant.

CRITICAL RULES:
- Do NOT repeat your introduction. Start answering immediately.
- Keep responses short and concise (max 5-6 lines total).
- Use simple language (8th grade level).
- Never give political opinions or suggest who to vote for.
- Avoid long paragraphs.
- Make responses conversational. Example: "Got it — since you're in Delhi, here's how to register:"
- Always guide the user to the next action with a short question at the end.

RESPONSE STRUCTURE:
Always use this format:
**[Title or Conversational Opening]**
[Key link, if applicable]
1. [Step 1]
2. [Step 2]
3. [Step 3 or 4]

[Short next-step question]

BEHAVIOR:
- First understand user's location, determine eligibility, then guide through the process.
- If user asks about registration, provide official website if known.
- If user gives a location (e.g., Delhi), provide relevant official info (e.g., https://voterportal.eci.gov.in/).
- If unclear, ask a follow-up question instead of a generic answer.

User message: "${message}"`;

        const apiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: systemPrompt }]
                }]
            })
        });

        if (!apiResponse.ok) {
            console.error("API Response not ok:", apiResponse.status, apiResponse.statusText);
            return res.status(apiResponse.status).json({ error: "Failed to communicate with AI provider." });
        }

        const data = await apiResponse.json();
        
        if (data.candidates && data.candidates.length > 0) {
            let aiText = data.candidates[0].content.parts[0].text;
            res.json({ response: aiText.trim() });
        } else {
            res.json({ response: "I'm not sure how to answer that. Need help with <em>registration</em> or <em>how to vote</em>?" });
        }
    } catch (error) {
        console.error("Server API Error:", error);
        res.status(500).json({ error: "I'm having a bit of trouble thinking right now. You can try asking me to <em>Teach you the basics</em>." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
