// public/app.js

// Define ChatManager class outside of DOMContentLoaded
class ChatManager {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-message');
        this.context = [];

        this.initialize();
    }

    initialize() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Add initial greeting
        this.addMessage({
            role: 'assistant',
            content: 'Hallo! Ich bin dein IHK-Prüfungsassistent. Wie kann ich dir bei deiner Vorbereitung helfen?'
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage({ role: 'user', content: message });
        this.messageInput.value = '';

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    context: this.context
                })
            });

            const data = await response.json();
            this.context = data.context;
            this.addMessage({ role: 'assistant', content: data.response });
        } catch (error) {
            console.error('Chat Error:', error);
            this.addMessage({
                role: 'assistant',
                content: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Anfrage.'
            });
        }
    }

    addMessage({ role, content }) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;

        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Main application code
document.addEventListener('DOMContentLoaded', () => {
    let currentQuestion = null;
    let questions = [];

    // Initialize chat manager
    const chatManager = new ChatManager();

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Exam functionality
    async function fetchQuestions() {
        try {
            const response = await fetch('http://localhost:3000/api/questions');
            questions = await response.json();
            showQuestion(0);
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    }

    function showQuestion(index) {
        if (index >= questions.length) {
            document.getElementById('question-container').innerHTML = '<h3>Prüfung beendet!</h3>';
            return;
        }

        currentQuestion = questions[index];
        const questionText = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');
        const feedbackDiv = document.getElementById('feedback');

        questionText.innerHTML = `<h3>${currentQuestion.question}</h3>`;
        optionsContainer.innerHTML = '';
        feedbackDiv.innerHTML = '';

        currentQuestion.options.forEach((option, i) => {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = option;
            button.addEventListener('click', () => submitAnswer(i));
            optionsContainer.appendChild(button);
        });
    }

    async function submitAnswer(answerIndex) {
        try {
            const response = await fetch('http://localhost:3000/api/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    questionId: currentQuestion.id,
                    answer: answerIndex
                })
            });

            const result = await response.json();
            const feedbackDiv = document.getElementById('feedback');
            feedbackDiv.innerHTML = result.feedback;
            feedbackDiv.className = `feedback ${result.correct ? 'correct' : 'incorrect'}`;

            document.getElementById('next-question').style.display = 'block';
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    }

    // Next question button
    const nextQuestionButton = document.getElementById('next-question');
    if (nextQuestionButton) {
        nextQuestionButton.addEventListener('click', () => {
            const currentIndex = questions.indexOf(currentQuestion);
            showQuestion(currentIndex + 1);
            nextQuestionButton.style.display = 'none';
        });
    }

    // Generate Question functionality
    async function generateQuestion(topic) {
        try {
            const response = await fetch('http://localhost:3000/api/generate-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic })
            });
            
            const questionData = await response.json();
            return questionData;
        } catch (error) {
            console.error('Error generating question:', error);
            return null;
        }
    }

    // Initialize exam
    fetchQuestions();
});