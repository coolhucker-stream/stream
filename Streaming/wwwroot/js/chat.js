window.Chat = {
    messages: null,
    input: null,
    colors: ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFAAA5'],

    init() {
        this.messages = document.getElementById('chatMessages');
        this.input = document.getElementById('chatInput');

        this.scrollToBottom();
        this.setupEventListeners();
    },

    setupEventListeners() {
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        const sendBtn = document.getElementById('chatSendBtn');
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
    },

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    },

    sendMessage() {
        const message = this.input.value.trim();
        if (message) {
            window.SignalR.connection.invoke("SendMessage", message)
                .catch(err => console.error('Send message failed:', err));
            this.input.value = '';
        }
    },

    addMessage(username, text) {
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'chat-username';
        usernameSpan.style.color = color;
        usernameSpan.textContent = username;

        const textSpan = document.createElement('span');
        textSpan.className = 'chat-text';
        textSpan.textContent = text;

        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(textSpan);
        this.messages.appendChild(messageDiv);

        this.scrollToBottom();
    },
};
