document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatArea = document.getElementById('chat-area');
    const sendBtn = document.getElementById('send-btn');
    const quickActionsContainer = document.getElementById('quick-actions');

    // Assistant Memory
    let userState = {
        age: null
    };

    let chatHistory = [];

    // Focus input on load
    userInput.focus();

    // Enable/disable send button based on input
    userInput.addEventListener('input', () => {
        sendBtn.disabled = userInput.value.trim() === '';
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;
        handleUserMessage(message);
    });

    async function handleUserMessage(message) {
        addMessage(message, 'user');
        chatHistory.push({ role: 'user', text: message });
        if (chatHistory.length > 10) chatHistory.shift();
        
        userInput.value = '';
        sendBtn.disabled = true;
        clearQuickActions();

        const typingId = showTypingIndicator();

        try {
            const response = await getAssistantResponse(message);
            removeTypingIndicator(typingId);
            addMessage(response, 'assistant');
            chatHistory.push({ role: 'assistant', text: response });
            if (chatHistory.length > 10) chatHistory.shift();
            
            // Extract and render quick actions from the response
            renderQuickActions(response);
        } catch (error) {
            removeTypingIndicator(typingId);
            addMessage("I'm sorry, I'm having trouble connecting right now.", 'assistant');
            console.error(error);
        }
        userInput.focus();
    }

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (userInput.value.trim() !== '') {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    async function getAssistantResponse(message) {
        const lowerMsg = message.toLowerCase();
        
        // Detect Age for Memory
        const ageMatch = lowerMsg.match(/(?:i am|i'm|im|my age is|age is|turning)\s*(\d+)/) || lowerMsg.match(/^(\d+)$/);
        if (ageMatch) {
            const age = parseInt(ageMatch[1], 10);
            if (!isNaN(age)) userState.age = age;
        }

        let retries = 1;
        let delay = 1000;

        while (retries >= 0) {
            try {
                const apiResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ history: chatHistory, state: userState })
                });
                
                if (apiResponse.ok) {
                    const data = await apiResponse.json();
                    if (data.response && data.response.length > 5) {
                         return data.response.trim();
                    }
                }
                
                if (apiResponse.status === 429) delay *= 2; 
                throw new Error(`API error: ${apiResponse.status}`);
            } catch (error) {
                if (retries === 0) return getLocalResponse(lowerMsg);
                retries--;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    function getLocalResponse(query) {
        const knowledge = [
            {
                keys: ['age', 'old', 'limit', 'years', 'eligible'],
                response: "🗳️ **Voting Age in India**\nYou must be at least **18 years old** to register as a voter.\n\n📌 Tip: You can apply at 17 if you turn 18 by the qualifying date.\nNext: Help with registration? or Documents needed?"
            },
            {
                keys: ['register', 'apply', 'voter id', 'epic', 'form 6', 'enroll'],
                response: "📝 **New Voter Registration**\n1. Visit the [Voters Service Portal](https://voters.eci.gov.in/)\n2. Fill out **Form 6** for new electors.\n3. Upload your photo and ID proof.\n4. Submit and track your status.\n\n📌 Tip: It is free and can be done entirely online.\nNext: What documents are needed? or Track status"
            }
        ];

        for (const item of knowledge) {
            if (item.keys.some(k => query.includes(k))) return item.response;
        }
        return "I'm having trouble connecting to my live brain. I can help with **registration steps**, **required documents**, or **eligibility**. What would you like to know?";
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        let innerHTML = '';
        if (sender === 'assistant') {
            innerHTML += `<div class="avatar assistant-avatar">EA</div>`;
        }

        let contentText = text;
        if (sender === 'user') {
            contentText = escapeHTML(text);
        } else {
            // Enhanced Markdown Parser
            contentText = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
                .replace(/([^\*])\*([^\*].*?[^\*])\*([^\*])/g, '$1<em>$2</em>$3');
            
            const lines = contentText.split('\n');
            let isInsideList = false;
            const formattedLines = lines.map(line => {
                const trimmed = line.trim();
                // Bullet points
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    isInsideList = true;
                    return `<li style="margin-left: 18px; margin-bottom: 6px;">${trimmed.substring(2)}</li>`;
                }
                // Numbered lists
                const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
                if (numberedMatch) {
                    isInsideList = true;
                    return `<li style="margin-left: 18px; margin-bottom: 6px; list-style-type: decimal;">${numberedMatch[2]}</li>`;
                }
                
                // Normal text or titles
                if (isInsideList && trimmed === '') {
                    isInsideList = false;
                    return ''; // Spacing after list
                }
                return line;
            });
            
            contentText = formattedLines.filter(l => l !== null).join('<br>');
        }
        
        innerHTML += `<div class="message-content">${contentText}</div>`;
        messageDiv.innerHTML = innerHTML;
        chatArea.appendChild(messageDiv);
        scrollToBottom();
    }

    function renderQuickActions(text) {
        clearQuickActions();
        const nextMatch = text.match(/Next:\s*(.*)/i);
        if (nextMatch) {
            const actionText = nextMatch[1].trim();
            const actions = actionText.split(/\s+or\s+/i);
            
            actions.forEach(action => {
                const cleanAction = action.replace(/[?.]/g, '').trim();
                if (cleanAction.length > 0 && cleanAction.length < 50) {
                    const chip = document.createElement('div');
                    chip.classList.add('quick-action-chip');
                    chip.textContent = cleanAction;
                    chip.addEventListener('click', () => {
                        userInput.value = cleanAction;
                        handleUserMessage(cleanAction);
                    });
                    quickActionsContainer.appendChild(chip);
                }
            });
        }
    }

    function clearQuickActions() {
        quickActionsContainer.innerHTML = '';
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = id;
        messageDiv.classList.add('message', 'assistant-message');

        messageDiv.innerHTML = `
            <div class="avatar assistant-avatar">EA</div>
            <div class="typing-status">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        chatArea.appendChild(messageDiv);
        scrollToBottom();
        return id;
    }

    function removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) element.remove();
    }

    function scrollToBottom() {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":"&#39;",'"':"&quot;"}[t] || t));
    }

    renderQuickActions("Next: Check registration status or Learn how to apply");
});
