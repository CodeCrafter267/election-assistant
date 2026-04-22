document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatArea = document.getElementById('chat-area');

    // Basic responses for the assistant
    const botResponses = [
        "That's a great question about the election! The first step is to ensure you are registered to vote.",
        "You can find your local polling station on your state's official election website.",
        "Election Day is typically the first Tuesday following the first Monday in November.",
        "To register to vote, you'll need a valid form of identification. Would you like to know more about valid IDs?",
        "Remember, every vote counts! It's important to participate in the democratic process."
    ];

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, 'user');
        
        // Clear input
        userInput.value = '';

        // Simulate thinking delay
        setTimeout(() => {
            const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
            addMessage(randomResponse, 'assistant');
        }, 800 + Math.random() * 700); // Random delay between 0.8s and 1.5s
    });

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = text;

        messageDiv.appendChild(contentDiv);
        chatArea.appendChild(messageDiv);

        // Scroll to the bottom to show the newest message
        chatArea.scrollTop = chatArea.scrollHeight;
    }
});
