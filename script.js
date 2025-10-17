class SmartMentorChatbot {
    constructor() {
        this.conversationState = {
            isOpen: false,
            messages: [],
            currentStep: null,
            taskData: {},
            conversationHistory: []
        };
        
        this.tasks = [];
        this.motivationalMessages = [
            "You're doing great! Keep up the momentum! 🚀",
            "Every small step counts toward your goals! 💪",
            "Consistency is key to success! 🎯",
            "Believe in yourself - you've got this! ⭐",
            "Your effort today shapes your success tomorrow! 🌟",
            "Stay focused and watch yourself grow! 🌱",
            "Progress, not perfection! 👏"
        ];
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.loadFromStorage();
        this.displayWelcomeMessage();
        this.renderTasks();
        this.updateMotivationalMessage();
    }
    
    cacheElements() {
        this.elements = {
            chatbotTrigger: document.getElementById('chatbot-trigger'),
            chatbotModal: document.getElementById('chatbot-modal'),
            chatbotOverlay: document.getElementById('chatbot-overlay'),
            closeChatbot: document.getElementById('close-chatbot'),
            chatbotMessages: document.getElementById('chatbot-messages'),
            chatbotForm: document.getElementById('chatbot-form'),
            chatbotInput: document.getElementById('chatbot-input'),
            sendButton: document.getElementById('send-button'),
            taskList: document.getElementById('task-list'),
            refreshTasks: document.getElementById('refresh-tasks'),
            themeToggle: document.getElementById('theme-toggle'),
            startChatEmpty: document.getElementById('start-chat-empty'),
            motivationalMessage: document.getElementById('motivational-message'),
            quickActions: document.querySelectorAll('.quick-action-button'),
            chatNotification: document.getElementById('chat-notification')
        };
    }
    
    attachEventListeners() {
        this.elements.chatbotTrigger.addEventListener('click', () => this.openChatbot());
        this.elements.closeChatbot.addEventListener('click', () => this.closeChatbot());
        this.elements.chatbotOverlay.addEventListener('click', () => this.closeChatbot());
        this.elements.chatbotForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.elements.chatbotInput.addEventListener('input', () => this.handleInputChange());
        this.elements.chatbotInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.elements.refreshTasks.addEventListener('click', () => this.refreshTasks());
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        if (this.elements.startChatEmpty) {
            this.elements.startChatEmpty.addEventListener('click', () => this.openChatbot());
        }
        
        this.elements.quickActions.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.conversationState.isOpen) {
                this.closeChatbot();
            }
        });
    }
    
    openChatbot() {
        this.conversationState.isOpen = true;
        this.elements.chatbotModal.removeAttribute('hidden');
        this.elements.chatbotOverlay.removeAttribute('hidden');
        
        setTimeout(() => {
            this.elements.chatbotModal.classList.add('active');
            this.elements.chatbotOverlay.classList.add('active');
            this.elements.chatbotInput.focus();
        }, 10);
        
        this.elements.chatNotification.classList.remove('active');
        this.scrollToBottom();
    }
    
    closeChatbot() {
        this.conversationState.isOpen = false;
        this.elements.chatbotModal.classList.remove('active');
        this.elements.chatbotOverlay.classList.remove('active');
        
        setTimeout(() => {
            this.elements.chatbotModal.setAttribute('hidden', '');
            this.elements.chatbotOverlay.setAttribute('hidden', '');
        }, 350);
    }
    
    handleInputChange() {
        const value = this.elements.chatbotInput.value.trim();
        this.elements.sendButton.disabled = !value;
        
        this.elements.chatbotInput.style.height = 'auto';
        this.elements.chatbotInput.style.height = Math.min(this.elements.chatbotInput.scrollHeight, 120) + 'px';
    }
    
    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.elements.sendButton.disabled) {
                this.elements.chatbotForm.dispatchEvent(new Event('submit'));
            }
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const message = this.elements.chatbotInput.value.trim();
        if (!message) return;
        
        this.addMessage('user', message);
        this.elements.chatbotInput.value = '';
        this.elements.sendButton.disabled = true;
        this.elements.chatbotInput.style.height = 'auto';
        
        this.showTypingIndicator();
        
        try {
            await this.sendToAPI(message);
        } catch (error) {
            console.error('Error communicating with chatbot:', error);
            this.hideTypingIndicator();
            this.addMessage('bot', "I'm having trouble connecting right now. Let me help you offline with common tasks!");
            this.offerOfflineOptions();
        }
    }
    
    async sendToAPI(message) {
        this.conversationState.conversationHistory.push({
            role: 'user',
            content: message
        });
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversationHistory: this.conversationState.conversationHistory,
                    currentStep: this.conversationState.currentStep,
                    taskData: this.conversationState.taskData
                })
            });
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            const data = await response.json();
            
            setTimeout(() => {
                this.hideTypingIndicator();
                this.processAPIResponse(data);
            }, 500 + Math.random() * 1000);
            
        } catch (error) {
            this.hideTypingIndicator();
            this.handleOfflineMode(message);
        }
    }
    
    handleOfflineMode(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('task') || lowerMessage.includes('create') || lowerMessage.includes('add')) {
            this.startTaskCreation();
        } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
            this.addMessage('bot', "I'm your Smart Academic Mentor! I can help you:");
            this.addActionButtons([
                { text: 'Create study tasks', action: 'create-task' },
                { text: 'Plan your study schedule', action: 'study-plan' },
                { text: 'Get study tips', action: 'study-tips' }
            ]);
        } else if (lowerMessage.includes('plan') || lowerMessage.includes('schedule')) {
            this.addMessage('bot', "Let's create a study plan! First, what subject are you focusing on?");
            this.conversationState.currentStep = 'awaiting_subject';
        } else {
            this.addMessage('bot', "I'd love to help you with that! Could you tell me more about what you'd like to accomplish?");
            this.offerOfflineOptions();
        }
    }
    
    startTaskCreation() {
        this.conversationState.currentStep = 'task_creation_subject';
        this.conversationState.taskData = {};
        this.addMessage('bot', "Great! Let's create a new study task. What subject is this for?");
    }
    
    offerOfflineOptions() {
        setTimeout(() => {
            this.addActionButtons([
                { text: 'Create a task', action: 'create-task' },
                { text: 'Get help', action: 'help' }
            ]);
        }, 300);
    }
    
    processAPIResponse(data) {
        if (data.message) {
            this.addMessage('bot', data.message);
            this.conversationState.conversationHistory.push({
                role: 'assistant',
                content: data.message
            });
        }
        
        if (data.currentStep) {
            this.conversationState.currentStep = data.currentStep;
        }
        
        if (data.taskData) {
            this.conversationState.taskData = { ...this.conversationState.taskData, ...data.taskData };
        }
        
        if (data.actions && data.actions.length > 0) {
            this.addActionButtons(data.actions);
        }
        
        if (data.taskCreated) {
            this.handleTaskCreated(data.task);
        }
        
        if (data.motivational) {
            setTimeout(() => {
                this.updateMotivationalMessage(data.motivational);
            }, 1000);
        }
    }
    
    handleQuickAction(action) {
        switch (action) {
            case 'create-task':
                this.addMessage('user', 'I want to create a new task');
                this.showTypingIndicator();
                setTimeout(() => {
                    this.hideTypingIndicator();
                    this.startTaskCreation();
                }, 800);
                break;
            case 'study-plan':
                this.addMessage('user', 'Help me create a study plan');
                this.showTypingIndicator();
                setTimeout(() => {
                    this.hideTypingIndicator();
                    this.addMessage('bot', "Perfect! Let's build a study plan together. What's your main goal or upcoming exam?");
                    this.conversationState.currentStep = 'study_plan_goal';
                }, 800);
                break;
            case 'help':
                this.addMessage('user', 'What can you help me with?');
                this.showTypingIndicator();
                setTimeout(() => {
                    this.hideTypingIndicator();
                    this.addMessage('bot', "I'm here to help you succeed! I can assist you with:");
                    setTimeout(() => {
                        this.addMessage('bot', "📚 Creating and organizing study tasks\n📅 Planning your study schedule\n🎯 Setting achievable goals\n💡 Providing study tips and motivation\n✅ Tracking your progress");
                    }, 300);
                }, 800);
                break;
        }
    }
    
    addMessage(sender, text, options = {}) {
        const message = {
            id: Date.now() + Math.random(),
            sender,
            text,
            timestamp: new Date(),
            ...options
        };
        
        this.conversationState.messages.push(message);
        this.renderMessage(message);
        this.saveToStorage();
    }
    
    renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender}`;
        messageEl.setAttribute('role', 'article');
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = message.sender === 'bot' ? 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>' :
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = message.text;
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = this.formatTime(message.timestamp);
        
        content.appendChild(bubble);
        content.appendChild(time);
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        this.elements.chatbotMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    addActionButtons(actions) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message bot';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'action-buttons';
        
        actions.forEach(actionData => {
            const button = document.createElement('button');
            button.className = 'action-button';
            button.textContent = actionData.text;
            button.addEventListener('click', () => {
                this.addMessage('user', actionData.text);
                actionsContainer.remove();
                
                if (actionData.action) {
                    this.showTypingIndicator();
                    setTimeout(() => {
                        this.hideTypingIndicator();
                        this.handleActionClick(actionData.action, actionData.data);
                    }, 800);
                }
            });
            actionsContainer.appendChild(button);
        });
        
        content.appendChild(actionsContainer);
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        this.elements.chatbotMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    handleActionClick(action, data) {
        switch (action) {
            case 'create-task':
                this.startTaskCreation();
                break;
            case 'study-plan':
                this.addMessage('bot', "Great! Let's create a study plan. What subject would you like to focus on?");
                this.conversationState.currentStep = 'study_plan_subject';
                break;
            case 'study-tips':
                this.addMessage('bot', "Here are some effective study tips:\n\n1. Use the Pomodoro Technique: Study for 25 minutes, then take a 5-minute break\n2. Active recall: Test yourself instead of just re-reading\n3. Space out your learning over time\n4. Teach the material to someone else\n5. Stay organized with a study schedule");
                break;
            default:
                if (data) {
                    this.handleCustomAction(action, data);
                }
        }
    }
    
    handleCustomAction(action, data) {
        console.log('Custom action:', action, data);
    }
    
    showTypingIndicator() {
        if (document.querySelector('.typing-indicator')) return;
        
        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        typingEl.innerHTML = `
            <div class="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        this.elements.chatbotMessages.appendChild(typingEl);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingEl = document.querySelector('.typing-indicator');
        if (typingEl) {
            typingEl.remove();
        }
    }
    
    handleTaskCreated(task) {
        this.hideTypingIndicator();
        
        const confirmationEl = document.createElement('div');
        confirmationEl.className = 'message bot';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const confirmation = document.createElement('div');
        confirmation.className = 'confirmation-message';
        confirmation.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Task created successfully!</span>
        `;
        
        content.appendChild(confirmation);
        confirmationEl.appendChild(avatar);
        confirmationEl.appendChild(content);
        
        this.elements.chatbotMessages.appendChild(confirmationEl);
        
        this.tasks.push(task);
        this.saveToStorage();
        this.renderTasks();
        this.updateMotivationalMessage("Great job! You're building good study habits! 🎉");
        
        this.conversationState.currentStep = null;
        this.conversationState.taskData = {};
        
        setTimeout(() => {
            this.addMessage('bot', "Is there anything else I can help you with?");
        }, 1000);
        
        this.scrollToBottom();
    }
    
    displayWelcomeMessage() {
        if (this.conversationState.messages.length === 0) {
            const welcomeMessages = [
                "Hi! I'm your Smart Academic Mentor. I'm here to help you stay organized and motivated with your studies! 👋",
                "You can ask me to create study tasks, plan your schedule, or just chat about your academic goals. How can I help you today?"
            ];
            
            welcomeMessages.forEach((msg, index) => {
                setTimeout(() => {
                    this.addMessage('bot', msg);
                }, index * 1000);
            });
        }
    }
    
    renderTasks() {
        if (this.tasks.length === 0) {
            this.elements.taskList.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <h4>No tasks yet</h4>
                    <p>Chat with your AI mentor to create personalized study tasks!</p>
                    <button class="primary-button" id="start-chat-empty">Start Chatting</button>
                </div>
            `;
            
            const startButton = document.getElementById('start-chat-empty');
            if (startButton) {
                startButton.addEventListener('click', () => this.openChatbot());
            }
            return;
        }
        
        this.elements.taskList.innerHTML = '';
        
        this.tasks.forEach((task, index) => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = task.completed || false;
            checkbox.setAttribute('aria-label', `Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`);
            checkbox.addEventListener('change', () => this.toggleTask(index));
            
            const content = document.createElement('div');
            content.className = 'task-content';
            
            const title = document.createElement('div');
            title.className = 'task-title';
            title.textContent = task.title;
            
            const details = document.createElement('div');
            details.className = 'task-details';
            details.textContent = task.description || task.subject;
            
            content.appendChild(title);
            content.appendChild(details);
            
            if (task.dueDate || task.priority || task.subject) {
                const meta = document.createElement('div');
                meta.className = 'task-meta';
                
                if (task.subject) {
                    const subjectTag = document.createElement('span');
                    subjectTag.className = 'task-tag';
                    subjectTag.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        ${task.subject}
                    `;
                    meta.appendChild(subjectTag);
                }
                
                if (task.dueDate) {
                    const dateTag = document.createElement('span');
                    dateTag.className = 'task-tag';
                    dateTag.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${task.dueDate}
                    `;
                    meta.appendChild(dateTag);
                }
                
                if (task.priority) {
                    const priorityTag = document.createElement('span');
                    priorityTag.className = 'task-tag';
                    priorityTag.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        ${task.priority}
                    `;
                    meta.appendChild(priorityTag);
                }
                
                content.appendChild(meta);
            }
            
            taskEl.appendChild(checkbox);
            taskEl.appendChild(content);
            
            this.elements.taskList.appendChild(taskEl);
        });
    }
    
    toggleTask(index) {
        this.tasks[index].completed = !this.tasks[index].completed;
        this.saveToStorage();
        
        if (this.tasks[index].completed) {
            const completedMessages = [
                "Awesome! Task completed! 🎉",
                "Great work! Keep it up! ⭐",
                "Well done! You're making progress! 👏"
            ];
            this.updateMotivationalMessage(completedMessages[Math.floor(Math.random() * completedMessages.length)]);
        }
    }
    
    refreshTasks() {
        const button = this.elements.refreshTasks;
        const svg = button.querySelector('svg');
        
        svg.style.animation = 'none';
        setTimeout(() => {
            svg.style.animation = 'spin 0.5s ease-in-out';
        }, 10);
        
        this.renderTasks();
        
        if (!this.conversationState.isOpen && this.tasks.length > 0) {
            this.elements.chatNotification.classList.add('active');
        }
        
        setTimeout(() => {
            svg.style.animation = '';
        }, 500);
    }
    
    updateMotivationalMessage(message = null) {
        if (message) {
            this.elements.motivationalMessage.textContent = message;
        } else {
            const randomMessage = this.motivationalMessages[Math.floor(Math.random() * this.motivationalMessages.length)];
            this.elements.motivationalMessage.textContent = randomMessage;
        }
        
        this.elements.motivationalMessage.style.animation = 'none';
        setTimeout(() => {
            this.elements.motivationalMessage.style.animation = 'fadeIn 0.5s ease-in';
        }, 10);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.elements.chatbotMessages.scrollTop = this.elements.chatbotMessages.scrollHeight;
        }, 100);
    }
    
    formatTime(date) {
        const now = new Date();
        const messageDate = new Date(date);
        const diffInMs = now - messageDate;
        const diffInMins = Math.floor(diffInMs / 60000);
        
        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        
        const hours = messageDate.getHours();
        const minutes = messageDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        
        return `${displayHours}:${displayMinutes} ${ampm}`;
    }
    
    saveToStorage() {
        try {
            localStorage.setItem('smartMentorMessages', JSON.stringify(this.conversationState.messages));
            localStorage.setItem('smartMentorTasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const savedMessages = localStorage.getItem('smartMentorMessages');
            const savedTasks = localStorage.getItem('smartMentorTasks');
            const savedTheme = localStorage.getItem('theme');
            
            if (savedMessages) {
                this.conversationState.messages = JSON.parse(savedMessages);
                this.conversationState.messages.forEach(msg => this.renderMessage(msg));
            }
            
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
            }
            
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    window.smartMentor = new SmartMentorChatbot();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.smartMentor) {
            window.smartMentor = new SmartMentorChatbot();
        }
    });
} else {
    window.smartMentor = new SmartMentorChatbot();
}
