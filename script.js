document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatArea = document.getElementById('chat-area');
    const sendBtn = document.getElementById('send-btn');

    // Assistant Memory
    let userState = {
        age: null
    };

    let fallbackCount = 0;

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

        addMessage(message, 'user');
        userInput.value = '';
        sendBtn.disabled = true;

        const typingId = showTypingIndicator();

        setTimeout(async () => {
            try {
                const response = await getAssistantResponse(message);
                removeTypingIndicator(typingId);
                addMessage(response, 'assistant');
            } catch (error) {
                removeTypingIndicator(typingId);
                addMessage("I'm sorry, I'm having trouble connecting right now.", 'assistant');
                console.error(error);
            }
            userInput.focus();
        }, 700 + Math.random() * 500);
    });

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
        
        // 1. Beginner / Start from beginning
        const isBeginner = /\b(new|beginner|begin|start|teach|basics|guide)\b/.test(lowerMsg) || 
                           (/\bfirst\b/.test(lowerMsg) && /\btime\b/.test(lowerMsg)) || 
                           /\bdon'?t know\b/.test(lowerMsg) ||
                           /\bfrom start\b/.test(lowerMsg);
                           
        if (isBeginner) {
            return `<strong>🗳️ Election Process (Simple Guide)</strong>\n\n1. Check eligibility (18+)\n2. Register to vote\n3. Get voter ID\n4. Find polling location\n5. Cast your vote\n\n<strong>Which step would you like help with?</strong>`;
        }

        // 2. Detect Age for Memory
        const ageMatch = lowerMsg.match(/(?:i am|i'm|im|my age is|age is|turning)\s*(\d+)/) || lowerMsg.match(/^(\d+)$/);
        if (ageMatch) {
            const age = parseInt(ageMatch[1], 10);
            if (!isNaN(age)) {
                userState.age = age;
                if (age >= 18) {
                    return `<strong>Status: <span style="color: #10a37f;">Eligible to Vote</span></strong>\n\nSince you are ${age}, you meet the age requirement! However, remember you must also be:\n• A citizen of the country\n• Officially registered to vote\n\n<strong>Next step:</strong> Would you like to know <em>how to register</em> or <em>the voting process</em>?`;
                } else {
                    return `<strong>Status: <span style="color: #dc2626;">Not Yet Eligible</span></strong>\n\nSince you are ${age}, you do not meet the 18-year age requirement to vote right now.\n\n<strong>Next step:</strong> You can still pre-register in some states or learn about the <em>voting process</em> for the future. What would you like to explore?`;
                }
            }
        }

        // 3. Intent: Eligibility / Qualifying
        const isEligibility = /\b(eligible|eligibility|qualify|requirements|allowed)\b/.test(lowerMsg) || 
                              (/\bcan\b/.test(lowerMsg) && /\bvote\b/.test(lowerMsg)) || 
                              /\bold enough\b/.test(lowerMsg);
                              
        if (isEligibility) {
            if (userState.age !== null) {
                if (userState.age >= 18) {
                    return `<strong>Status: <span style="color: #10a37f;">Eligible to Vote</span></strong>\n\nBased on your age (${userState.age}), you meet the age requirement! Remember, you also need to be a citizen and officially registered.\n\n<strong>Next step:</strong> Ask me <em>how to register</em> or <em>how to vote</em>.`;
                } else {
                    return `<strong>Status: <span style="color: #dc2626;">Not Yet Eligible</span></strong>\n\nBased on your age (${userState.age}), you are not eligible yet. You must be at least 18.\n\n<strong>Next step:</strong> Want to learn the <em>steps to vote</em> for when you are older?`;
                }
            }
            return `<strong>Voting Eligibility Requirements</strong>\n\nTo cast a ballot, you must meet these real-world conditions:\n• Be at least 18 years old on Election Day\n• Be a citizen of the country\n• Be registered to vote in your state\n\n<strong>Next step:</strong> How old are you? (I can check your age requirement!)`;
        }
        
        // 4. Intent: Registration
        const isRegistration = /\b(register|registration|sign up|enroll)\b/.test(lowerMsg);
        if (isRegistration) {
            return `<strong>Voter Registration Guide</strong>\n\nYou must be registered before you can vote. You can usually sign up:\n• <strong>Online:</strong> Through your state's official portal.\n• <strong>By Mail:</strong> Sending a paper form.\n• <strong>In-Person:</strong> At the DMV or local election office.\n\n<strong>Next step:</strong> Would you like the <em>voting steps</em> or <em>eligibility rules</em>?`;
        }
        
        // 5. Intent: Voting Process
        const isProcess = /\b(process|step|steps|procedure|guide)\b/.test(lowerMsg) || 
                          (/\bhow\b/.test(lowerMsg) && /\bvote\b/.test(lowerMsg)) || 
                          (/\bwhere\b/.test(lowerMsg) && /\bvote\b/.test(lowerMsg));
                          
        if (isProcess) {
            return `<strong>Step-by-Step Voting Guide</strong>\n\n1. <strong>Register:</strong> Sign up before your state's deadline.\n2. <strong>Locate:</strong> Find your assigned polling place.\n3. <strong>Prepare:</strong> Bring a valid ID (if required locally).\n4. <strong>Vote:</strong> Cast your ballot in-person or by mail.\n\n<strong>Next step:</strong> Need to know <em>how to register</em> or the <em>election timeline</em>?`;
        }
        
        // 6. Intent: Election Timeline
        const isTimeline = /\b(timeline|date|dates|schedule|calendar|deadline)\b/.test(lowerMsg) || 
                           (/\bwhen\b/.test(lowerMsg) && (/\bvote\b/.test(lowerMsg) || /\bregister\b/.test(lowerMsg) || /\belection\b/.test(lowerMsg)));
                           
        if (isTimeline) {
            return `<strong>General Election Timeline</strong>\n\n• <strong>Campaigning:</strong> Candidates run and debate.\n• <strong>Primaries:</strong> Parties choose their official nominees.\n• <strong>Election Day:</strong> The main voting period (usually early November).\n• <strong>Certification:</strong> Votes are officially counted and confirmed.\n\n<strong>Next step:</strong> Want to learn the <em>steps to vote</em>?`;
        }

        // 7. Intent: Greeting
        const isGreeting = /^(hi|hello|hey|greetings|morning|afternoon|evening)\b/.test(lowerMsg);
        if (isGreeting) {
            return `<strong>Hello! I'm your Election Assistant.</strong>\n\nI'm here to provide structured, real-world guidance on the election process. I can help you with:\n• Voting eligibility requirements\n• Step-by-step voting guides\n• Registration instructions\n\n<em>What would you like to know first?</em>`;
        }

        // 8. API Proxy Fallback
        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });
            
            if (!apiResponse.ok) {
                 return "I'm having a bit of trouble connecting right now. Try asking: <em>Teach me the basics</em>.";
            }

            const data = await apiResponse.json();
            
            if (data.response) {
                // Basic cleanup of excessive newlines
                return data.response.trim();
            } else {
                return "I'm not sure how to answer that. Need help with <em>registration</em> or <em>how to vote</em>?";
            }
        } catch (error) {
            console.error("Local API Error:", error);
            return "I'm having a bit of trouble thinking right now. You can try asking me to <em>Teach you the basics</em>.";
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        let innerHTML = '';
        
        if (sender === 'assistant') {
            innerHTML += `<div class="avatar assistant-avatar">EA</div>`;
        }

        // Only escape user input to allow rich HTML formatting in bot responses
        let contentText = text;
        if (sender === 'user') {
            contentText = escapeHTML(text);
        } else {
            // Replace newlines with <br> for bot responses that use structured text
            contentText = text.replace(/\n/g, '<br>');
        }
        
        innerHTML += `<div class="message-content">${contentText}</div>`;
        
        messageDiv.innerHTML = innerHTML;
        chatArea.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = id;
        messageDiv.classList.add('message', 'assistant-message');

        messageDiv.innerHTML = `
            <div class="avatar assistant-avatar">EA</div>
            <div class="typing-status">Assistant is typing...</div>
        `;

        chatArea.appendChild(messageDiv);
        scrollToBottom();
        
        return id;
    }

    function removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    function scrollToBottom() {
        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: 'smooth'
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
