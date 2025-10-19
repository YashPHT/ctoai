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
        this.priorityOrder = { high: 0, medium: 1, low: 2 };
        this.currentTaskId = null;
        this.activeModal = null;
        this.isFetchingTasks = false;
        this.lastTaskFetchError = null;
        this.apiEndpoints = {
            tasks: '/api/tasks',
            task: (id) => `/api/tasks/${encodeURIComponent(id)}`,
            taskPriority: (id) => `/api/tasks/${encodeURIComponent(id)}/priority`,
            timetable: '/api/timetable',
            analytics: '/api/analytics'
        };
        this.motivationalMessages = [
            "You're doing great! Keep up the momentum! 🚀",
            "Every small step counts toward your goals! 💪",
            "Consistency is key to success! 🎯",
            "Believe in yourself - you've got this! ⭐",
            "Your effort today shapes your success tomorrow! 🌟",
            "Stay focused and watch yourself grow! 🌱",
            "Progress, not perfection! 👏"
        ];

        this.analytics = null;
        this.charts = {};
        this.calendarState = { currentDate: new Date(), selectedDate: new Date(), eventsByDate: {} };
        this.timetable = null;
        
        this.boundHandleViewportChange = this.handleViewportChange.bind(this);
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.initChatClient();
        this.attachEventListeners();
        this.handleViewportChange();
        this.loadFromStorage();
        this.displayWelcomeMessage();
        this.updateMotivationalMessage();
        this.renderTasks();
        const fetchTasksPromise = this.fetchTasks();
        if (fetchTasksPromise && typeof fetchTasksPromise.then === 'function') {
            fetchTasksPromise.then(() => this.initAnalyticsAndCharts()).catch(() => this.initAnalyticsAndCharts());
        } else {
            setTimeout(() => this.initAnalyticsAndCharts(), 300);
        }
        this.fetchTimetable();
        this.setupCalendar();
    }
    
    cacheElements() {
        this.elements = {
            chatbotTrigger: document.getElementById('chatbot-trigger'),
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            chatbotModal: document.getElementById('chatbot-modal'),
            chatbotOverlay: document.getElementById('chatbot-overlay'),
            closeChatbot: document.getElementById('close-chatbot'),
            chatbotMessages: document.getElementById('chatbot-messages'),
            chatbotForm: document.getElementById('chatbot-form'),
            chatbotInput: document.getElementById('chatbot-input'),
            sendButton: document.getElementById('send-button'),
            taskList: document.getElementById('task-list'),
            priorityTaskList: document.getElementById('priority-task-list'),
            refreshTasks: document.getElementById('refresh-tasks'),
            addTaskButton: document.getElementById('add-task'),
            themeToggle: document.getElementById('theme-toggle'),
            startChatEmpty: document.getElementById('start-chat-empty'),
            motivationalMessage: document.getElementById('motivational-message'),
            quickActions: document.querySelectorAll('.quick-action-button'),
            chatNotification: document.getElementById('chat-notification'),
            taskModalOverlay: document.getElementById('task-modal-overlay'),
            taskFormModal: document.getElementById('task-form-modal'),
            taskDetailModal: document.getElementById('task-detail-modal'),
            taskDetailTitle: document.getElementById('task-detail-title'),
            taskDetailSubtitle: document.getElementById('task-detail-subtitle'),
            taskDetailPriorityBadge: document.getElementById('task-detail-priority'),
            taskDetailProgressBar: document.getElementById('task-detail-progress-bar'),
            taskDetailProgressValue: document.getElementById('task-detail-progress-value'),
            taskDetailName: document.getElementById('task-detail-name'),
            taskDetailDescription: document.getElementById('task-detail-description'),
            taskDetailSubject: document.getElementById('task-detail-subject'),
            taskDetailDueDate: document.getElementById('task-detail-due-date'),
            taskDetailUpdated: document.getElementById('task-detail-updated'),
            deleteConfirmModal: document.getElementById('delete-confirm-modal'),
            priorityOverrideModal: document.getElementById('priority-override-modal'),
            taskForm: document.getElementById('task-form'),
            taskFormTitle: document.getElementById('task-form-title'),
            taskFormId: document.getElementById('task-form-id'),
            taskFormTitleInput: document.getElementById('task-form-title-input'),
            taskFormDescription: document.getElementById('task-form-description'),
            taskFormSubject: document.getElementById('task-form-subject'),
            taskFormDueDate: document.getElementById('task-form-due-date'),
            taskFormPriority: document.getElementById('task-form-priority'),
            taskFormProgress: document.getElementById('task-form-progress'),
            taskFormProgressValue: document.getElementById('task-form-progress-value'),
            taskFormSubmit: document.getElementById('task-form-submit'),
            editTaskAction: document.getElementById('edit-task-action'),
            deleteTaskAction: document.getElementById('delete-task-action'),
            overridePriorityAction: document.getElementById('override-priority-action'),
            confirmDeleteTask: document.getElementById('confirm-delete-task'),
            priorityOverrideForm: document.getElementById('priority-override-form'),
            priorityOverrideTaskId: document.getElementById('priority-override-task-id'),
            priorityOverrideSelect: document.getElementById('priority-override-select'),
            priorityOverrideReason: document.getElementById('priority-override-reason'),
            // New data-driven UI elements
            timeChartCanvas: document.getElementById('timeChartCanvas'),
            progressGraphCanvas: document.getElementById('progressGraphCanvas'),
            progressViewButtons: document.querySelectorAll('.progress-view-toggle__button'),
            calendarDaysContainer: document.querySelector('[data-calendar-days]'),
            calendarMonthLabel: document.querySelector('[data-current-month]'),
            calendarNavButtons: document.querySelectorAll('[data-calendar-nav]'),
            calendarEventsList: document.querySelector('[data-calendar-events] .calendar-events__list'),
            timetableSchedule: document.querySelector('[data-timetable-container] .timetable__schedule'),
            timetableEditButton: document.querySelector('[data-action="edit-timetable"]'),
            timetableEditorModal: document.getElementById('timetable-editor-modal'),
            timetableEditorForm: document.getElementById('timetable-editor-form'),
            timetableJsonInput: document.getElementById('timetable-json-input'),
            chatbotFab: document.getElementById('chatbot-fab'),
            resetChat: document.getElementById('reset-chat'),
            chatAnnouncer: document.getElementById('chat-aria-live')
        };
    }
    
    initChatClient() {
        if (!window.ChatbotClient) {
            this.chat = null;
            return;
        }
        const self = this;
        this.chat = new window.ChatbotClient({
            endpoint: '/api/chat',
            storageKey: 'smartMentorConversation',
            maxHistory: 20,
            onStreamStart() {
                self.showTypingIndicator();
                self.beginStreamingBotMessage();
            },
            onStreamDelta(delta, aggregate) {
                self.updateStreamingBotMessage(aggregate);
            },
            onStreamComplete(fullText, meta) {
                self.hideTypingIndicator();
                self.finishStreamingBotMessage(fullText, meta);
                if (meta && meta.suggestions && Array.isArray(meta.suggestions) && meta.suggestions.length) {
                    self.addActionButtons(meta.suggestions.map(text => ({ text })));
                }
            },
            onIntent(intent, payload, resources) {
                self.handleIntent(intent, payload, resources);
            },
            onError(err) {
                console.error('Chat error:', err);
                self.hideTypingIndicator();
                self.addMessage('bot', "I'm having trouble connecting right now. Let's try again in a moment.");
            }
        });
    }
    
    attachEventListeners() {
        if (this.elements.chatbotTrigger) {
            this.elements.chatbotTrigger.addEventListener('click', () => this.openChatbot());
        }
        if (this.elements.chatbotFab) {
            this.elements.chatbotFab.addEventListener('click', () => this.openChatbot());
        }
        if (this.elements.resetChat) {
            this.elements.resetChat.addEventListener('click', () => this.resetConversation());
        }
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebarVisibility());
        }
        if (this.elements.sidebar) {
            const sidebarLinks = this.elements.sidebar.querySelectorAll('.sidebar__nav-link');
            sidebarLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (this.isMobile()) {
                        this.closeSidebar();
                    }
                });
            });
        }
        window.addEventListener('resize', this.boundHandleViewportChange);
        document.addEventListener('click', this.boundHandleDocumentClick);
        if (this.elements.closeChatbot) {
            this.elements.closeChatbot.addEventListener('click', () => this.closeChatbot());
        }
        if (this.elements.chatbotOverlay) {
            this.elements.chatbotOverlay.addEventListener('click', () => this.closeChatbot());
        }
        if (this.elements.chatbotForm) {
            this.elements.chatbotForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.elements.chatbotInput) {
            this.elements.chatbotInput.addEventListener('input', () => this.handleInputChange());
            this.elements.chatbotInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        }
        if (this.elements.refreshTasks) {
            this.elements.refreshTasks.addEventListener('click', () => this.refreshTasks());
        }
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        if (this.elements.addTaskButton) {
            this.elements.addTaskButton.addEventListener('click', () => this.openTaskForm());
        }
        if (this.elements.taskForm) {
            this.elements.taskForm.addEventListener('submit', (e) => this.handleTaskFormSubmit(e));
        }
        if (this.elements.taskFormProgress) {
            this.elements.taskFormProgress.addEventListener('input', () => this.updateTaskFormProgressValue());
        }
        if (this.elements.taskModalOverlay) {
            this.elements.taskModalOverlay.addEventListener('click', () => this.closeModal());
        }
        if (this.elements.confirmDeleteTask) {
            this.elements.confirmDeleteTask.addEventListener('click', () => this.confirmDeleteTask());
        }
        if (this.elements.priorityOverrideForm) {
            this.elements.priorityOverrideForm.addEventListener('submit', (e) => this.handlePriorityOverrideSubmit(e));
        }
        if (this.elements.editTaskAction) {
            this.elements.editTaskAction.addEventListener('click', () => {
                if (this.currentTaskId) {
                    this.openTaskForm(this.currentTaskId);
                }
            });
        }
        if (this.elements.deleteTaskAction) {
            this.elements.deleteTaskAction.addEventListener('click', () => {
                if (this.currentTaskId) {
                    this.openDeleteConfirm(this.currentTaskId);
                }
            });
        }
        if (this.elements.overridePriorityAction) {
            this.elements.overridePriorityAction.addEventListener('click', () => {
                if (this.currentTaskId) {
                    this.openPriorityOverride(this.currentTaskId);
                }
            });
        }
        
        if (this.elements.startChatEmpty) {
            this.elements.startChatEmpty.addEventListener('click', () => this.openChatbot());
        }
        
        if (this.elements.quickActions) {
            this.elements.quickActions.forEach(button => {
                button.addEventListener('click', () => {
                    const action = button.getAttribute('data-action');
                    this.handleQuickAction(action);
                });
            });
        }
        
        const modalCloseButtons = document.querySelectorAll('[data-close-modal], .modal-close');
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const target = event.currentTarget.getAttribute('data-close-modal');
                if (target) {
                    this.closeModal(target);
                } else {
                    this.closeModal();
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.activeModal) {
                    this.closeModal();
                } else if (this.conversationState.isOpen) {
                    this.closeChatbot();
                } else if (this.isSidebarOpen()) {
                    this.closeSidebar();
                }
            }
        });

        if (this.elements.timetableEditButton) {
            this.elements.timetableEditButton.addEventListener('click', () => this.openTimetableEditor());
        }
        if (this.elements.timetableEditorForm) {
            this.elements.timetableEditorForm.addEventListener('submit', (e) => this.handleTimetableSave(e));
        }
        if (this.elements.progressViewButtons && this.elements.progressViewButtons.forEach) {
            this.elements.progressViewButtons.forEach(btn => {
                btn.addEventListener('click', () => this.handleProgressViewToggle(btn));
            });
        }
        if (this.elements.calendarNavButtons && this.elements.calendarNavButtons.forEach) {
            this.elements.calendarNavButtons.forEach(btn => {
                btn.addEventListener('click', () => this.handleCalendarNavClick(btn.getAttribute('data-calendar-nav')));
            });
        }
    }
    
    openChatbot() {
        this.conversationState.isOpen = true;
        this._restoreFocusTo = document.activeElement;
        this.elements.chatbotModal.removeAttribute('hidden');
        this.elements.chatbotOverlay.removeAttribute('hidden');
        
        setTimeout(() => {
            this.elements.chatbotModal.classList.add('active');
            this.elements.chatbotOverlay.classList.add('active');
            this.elements.chatbotInput.focus();
            this.setupChatFocusTrap();
        }, 10);
        
        this.elements.chatNotification.classList.remove('active');
        this.scrollToBottom();
    }
    
    closeChatbot() {
        this.conversationState.isOpen = false;
        this.teardownChatFocusTrap();
        this.elements.chatbotModal.classList.remove('active');
        this.elements.chatbotOverlay.classList.remove('active');
        
        setTimeout(() => {
            this.elements.chatbotModal.setAttribute('hidden', '');
            this.elements.chatbotOverlay.setAttribute('hidden', '');
            const restoreTo = this._restoreFocusTo || this.elements.chatbotTrigger || this.elements.chatbotFab;
            if (restoreTo && typeof restoreTo.focus === 'function') restoreTo.focus();
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
        
        if (this.chat) {
            try {
                await this.chat.sendMessage(message);
            } catch (error) {
                console.error('Error communicating with chatbot:', error);
                this.hideTypingIndicator();
                this.addMessage('bot', "I'm having trouble connecting right now. Let me help you offline with common tasks!");
                this.offerOfflineOptions();
            }
        } else {
            // Fallback to legacy API flow
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
                    sessionId: this.chat?.state?.sessionId || undefined
                })
            });
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            const raw = await response.json();
            const payload = raw?.data || raw || {};
            const { reply, intent, resources } = payload;
            
            setTimeout(() => {
                this.hideTypingIndicator();
                if (reply) this.addMessage('bot', reply);
                if (resources) this.applyResources(resources);
                if (intent && intent !== 'none') this.handleIntent(intent, payload.payload || {}, resources || {});
            }, 300 + Math.random() * 600);
            
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

    beginStreamingBotMessage() {
        if (this.streamingMessage?.el && this.streamingMessage.el.isConnected) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message bot';
        wrapper.setAttribute('role', 'article');
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
        const content = document.createElement('div');
        content.className = 'message-content';
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = '';
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = '...';
        content.appendChild(bubble);
        content.appendChild(time);
        wrapper.appendChild(avatar);
        wrapper.appendChild(content);
        this.elements.chatbotMessages.appendChild(wrapper);
        this.streamingMessage = { el: wrapper, bubbleEl: bubble, timeEl: time, text: '' };
        if (this.elements.chatAnnouncer) {
            this.elements.chatAnnouncer.textContent = 'Assistant is typing';
        }
        this.scrollToBottom();
    }

    updateStreamingBotMessage(text) {
        if (!this.streamingMessage || !this.streamingMessage.bubbleEl) {
            this.beginStreamingBotMessage();
        }
        this.streamingMessage.text = text;
        this.streamingMessage.bubbleEl.textContent = text;
        if (this.elements.chatAnnouncer) {
            try { this.elements.chatAnnouncer.textContent = text.slice(-120); } catch (_) {}
        }
        this.scrollToBottom();
    }

    finishStreamingBotMessage(fullText, meta = {}) {
        if (!this.streamingMessage || !this.streamingMessage.bubbleEl) {
            this.beginStreamingBotMessage();
        }
        this.streamingMessage.bubbleEl.textContent = fullText;
        this.streamingMessage.timeEl.textContent = this.formatTime(new Date());
        // persist message to history
        this.conversationState.messages.push({ id: Date.now() + Math.random(), sender: 'bot', text: fullText, timestamp: new Date() });
        this.saveToStorage();
        // handle intent/resources
        if (meta && meta.resources) {
            this.applyResources(meta.resources);
        }
        if (meta && meta.intent && meta.intent !== 'none') {
            // Announce intent and also dispatch a custom event for external listeners
            window.dispatchEvent(new CustomEvent('chatbot:intent', { detail: { intent: meta.intent, payload: meta.payload || {}, resources: meta.resources || {} } }));
            // Simple auto-action: refresh tasks for relevant intents
            if (meta.intent === 'create_task' || meta.intent === 'update_task' || meta.intent === 'complete_task') {
                this.refreshTasks();
            }
        }
        // clear streaming message state
        this.streamingMessage = null;
    }

    handleIntent(intent, payload = {}, resources = {}) {
        // Handle common intents by updating UI/state
        switch (intent) {
            case 'create_task':
            case 'update_task':
            case 'complete_task':
                this.applyResources(resources);
                this.renderTasks();
                break;
            case 'create_subject':
                // No-op in UI for now; could update subject pickers
                break;
            default:
                break;
        }
    }

    applyResources(resources = {}) {
        if (resources && Array.isArray(resources.tasks)) {
            this.tasks = resources.tasks.map(t => this.normalizeTask(t)).filter(Boolean);
            this.saveToStorage();
            this.renderTasks();
        }
        // Future: subjects/events integration
    }

    async resetConversation() {
        try {
            if (this.chat && this.chat.reset) {
                await this.chat.reset();
            }
        } catch (_) {}
        // Clear UI
        this.conversationState.messages = [];
        if (this.elements.chatbotMessages) {
            this.elements.chatbotMessages.innerHTML = '';
        }
        this.saveToStorage();
        this.displayWelcomeMessage();
        if (this.elements.chatAnnouncer) {
            this.elements.chatAnnouncer.textContent = 'Conversation reset';
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
        this.renderPriorityTasks();
        const listEl = this.elements.taskList;
        if (!listEl) return;
        const errorBanner = this.lastTaskFetchError ? `
            <div class="inline-error" role="alert">
                <span>Unable to refresh tasks. You're viewing cached data.</span>
                <button class="link-button" id="retry-fetch-tasks">Retry</button>
            </div>` : '';
        
        if (this.tasks.length === 0) {
            listEl.innerHTML = errorBanner + `
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
            const retry = document.getElementById('retry-fetch-tasks');
            if (retry) retry.addEventListener('click', () => this.refreshTasks());
            const startButton = document.getElementById('start-chat-empty');
            if (startButton) {
                startButton.addEventListener('click', () => this.openChatbot());
            }
            return;
        }
        
        listEl.innerHTML = errorBanner;
        const retryBtn = document.getElementById('retry-fetch-tasks');
        if (retryBtn) retryBtn.addEventListener('click', () => this.refreshTasks());
        
        const tasks = this.getSortedTasks();
        
        tasks.forEach((task) => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            taskEl.setAttribute('role', 'button');
            taskEl.setAttribute('tabindex', '0');
            taskEl.dataset.taskId = task.id;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'task-checkbox';
            checkbox.checked = Boolean(task.completed);
            checkbox.setAttribute('aria-label', `Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`);
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleTask(task.id, checkbox.checked);
            });
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            const content = document.createElement('div');
            content.className = 'task-content';
            
            const header = document.createElement('div');
            header.className = 'task-item-header';
            
            const title = document.createElement('div');
            title.className = 'task-title';
            title.textContent = task.title;
            
            const badge = this.createPriorityBadge(task);
            
            header.appendChild(title);
            header.appendChild(badge);
            
            const details = document.createElement('div');
            details.className = 'task-details';
            details.textContent = task.description || task.subject || 'No description';
            
            content.appendChild(header);
            content.appendChild(details);
            
            if (task.progress !== undefined && task.progress > 0) {
                const progressMini = document.createElement('div');
                progressMini.className = 'task-progress-mini';
                progressMini.innerHTML = `
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${task.progress}%"></div>
                    </div>
                    <span class="progress-value">${task.progress}%</span>
                `;
                content.appendChild(progressMini);
            }
            
            if (task.dueDate || task.subject) {
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
                        ${this.formatDate(task.dueDate)}
                    `;
                    meta.appendChild(dateTag);
                }
                
                content.appendChild(meta);
            }
            
            taskEl.appendChild(checkbox);
            taskEl.appendChild(content);
            
            taskEl.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    this.openTaskDetail(task.id);
                }
            });
            taskEl.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && e.target !== checkbox) {
                    e.preventDefault();
                    this.openTaskDetail(task.id);
                }
            });
            
            this.elements.taskList.appendChild(taskEl);
        });
    }
    
    toggleTask(taskId, isCompleted) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        this.tasks[taskIndex].completed = isCompleted;
        this.tasks[taskIndex].updatedAt = new Date().toISOString();
        this.saveToStorage();
        this.renderPriorityTasks();
        
        if (isCompleted) {
            const completedMessages = [
                "Awesome! Task completed! 🎉",
                "Great work! Keep it up! ⭐",
                "Well done! You're making progress! 👏"
            ];
            this.updateMotivationalMessage(completedMessages[Math.floor(Math.random() * completedMessages.length)]);
        }
    }
    
    getSortedTasks() {
        return [...this.tasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            const priorityDifference = this.getPriorityWeight(a) - this.getPriorityWeight(b);
            if (priorityDifference !== 0) {
                return priorityDifference;
            }
            const dueDateDifference = this.compareDueDates(a, b);
            if (dueDateDifference !== 0) {
                return dueDateDifference;
            }
            return new Date(a.updatedAt) - new Date(b.updatedAt);
        });
    }
    
    createPriorityBadge(task) {
        const level = (task.priority || 'medium').toLowerCase();
        const badge = document.createElement('div');
        badge.className = `priority-badge ${level}`;
        badge.textContent = level.charAt(0).toUpperCase() + level.slice(1);
        return badge;
    }
    
    async refreshTasks() {
        const button = this.elements.refreshTasks;
        const svg = button?.querySelector('svg');
        
        if (svg) {
            svg.style.animation = 'none';
            setTimeout(() => {
                svg.style.animation = 'spin 0.5s ease-in-out';
            }, 10);
        }
        
        await this.fetchTasks();
        
        if (this.elements.chatNotification && !this.conversationState.isOpen && this.tasks.length > 0) {
            this.elements.chatNotification.classList.add('active');
        }
        
        if (svg) {
            setTimeout(() => {
                svg.style.animation = '';
            }, 500);
        }
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

    toggleSidebarVisibility() {
        if (!this.elements.sidebarToggle) return;
        if (!this.isTabletOrSmaller()) return;
        const shouldOpen = !this.isSidebarOpen();
        if (shouldOpen) {
            this.openSidebar();
        } else {
            this.closeSidebar();
        }
    }

    openSidebar() {
        document.body.classList.add('sidebar-open');
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.setAttribute('aria-expanded', 'true');
        }
    }

    closeSidebar() {
        document.body.classList.remove('sidebar-open');
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.setAttribute('aria-expanded', 'false');
        }
    }

    isSidebarOpen() {
        return document.body.classList.contains('sidebar-open');
    }

    isMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    isTabletOrSmaller() {
        return window.matchMedia('(max-width: 1024px)').matches;
    }

    handleViewportChange() {
        if (!this.elements.sidebarToggle) {
            return;
        }

        if (!this.isTabletOrSmaller()) {
            document.body.classList.remove('sidebar-open');
            this.elements.sidebarToggle.setAttribute('aria-expanded', 'true');
            return;
        }

        const isOpen = this.isSidebarOpen();
        if (this.isMobile()) {
            if (!isOpen) {
                this.elements.sidebarToggle.setAttribute('aria-expanded', 'false');
            }
        } else {
            this.elements.sidebarToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    }

    handleDocumentClick(event) {
        if (!this.isSidebarOpen() || !this.isMobile()) {
            return;
        }

        const sidebar = this.elements.sidebar;
        const toggle = this.elements.sidebarToggle;
        if (sidebar && !sidebar.contains(event.target) && toggle && !toggle.contains(event.target)) {
            this.closeSidebar();
        }
    }

    setupChatFocusTrap() {
        const modal = this.elements.chatbotModal;
        if (!modal) return;
        const selectors = [
            'a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
            'button:not([disabled])','iframe','[tabindex]:not([tabindex="-1"])','[contentEditable=true]'
        ];
        const getFocusable = () => Array.from(modal.querySelectorAll(selectors.join(','))).filter(el => el.offsetParent !== null || el === document.activeElement);
        this._chatTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const focusables = getFocusable();
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first || !modal.contains(document.activeElement)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last || !modal.contains(document.activeElement)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        this._chatFocusinHandler = (e) => {
            if (!modal.contains(e.target)) {
                this.elements.chatbotInput && this.elements.chatbotInput.focus();
            }
        };
        document.addEventListener('keydown', this._chatTrapHandler);
        document.addEventListener('focusin', this._chatFocusinHandler);
    }

    teardownChatFocusTrap() {
        if (this._chatTrapHandler) {
            document.removeEventListener('keydown', this._chatTrapHandler);
            this._chatTrapHandler = null;
        }
        if (this._chatFocusinHandler) {
            document.removeEventListener('focusin', this._chatFocusinHandler);
            this._chatFocusinHandler = null;
        }
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
            const msgs = Array.isArray(this.conversationState.messages) ? this.conversationState.messages.slice(-20) : [];
            localStorage.setItem('smartMentorMessages', JSON.stringify(msgs));
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
    
    async fetchTasks() {
        if (this.isFetchingTasks) return;
        this.isFetchingTasks = true;
        
        try {
            let tasks = null;
            if (window.api && window.api.getTasks) {
                const payload = await window.api.getTasks();
                tasks = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.tasks)
                        ? payload.tasks
                        : Array.isArray(payload?.data)
                            ? payload.data
                            : [];
            } else {
                const response = await fetch(this.apiEndpoints.tasks, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error(`Task fetch failed with status ${response.status}`);
                const payload = await response.json();
                tasks = Array.isArray(payload) ? payload : Array.isArray(payload?.tasks) ? payload.tasks : Array.isArray(payload?.data) ? payload.data : [];
            }
            if (Array.isArray(tasks)) {
                this.tasks = tasks.map(task => this.normalizeTask(task)).filter(Boolean);
                this.saveToStorage();
            }
            this.lastTaskFetchError = null;
        } catch (error) {
            console.warn('Task API unavailable, using stored data:', error);
            this.lastTaskFetchError = error.message;
        } finally {
            this.isFetchingTasks = false;
            this.renderTasks();
        }
    }
    
    normalizeTask(task) {
        if (!task) return null;
        
        const normalized = {
            id: task.id || task.taskId || task.uuid || task._id || this.generateTaskId(),
            title: task.title || task.name || 'Untitled Task',
            description: task.description ?? task.details ?? '',
            subject: task.subject ?? task.course ?? task.category ?? '',
            dueDate: task.dueDate || task.due_date || task.deadline || '',
            priorityOverride: task.priorityOverride || null,
            priorityScore: typeof task.priorityScore === 'number' ? task.priorityScore : null,
            progress: this.clamp(
                typeof task.progress === 'number'
                    ? task.progress
                    : typeof task.completion === 'number'
                        ? task.completion
                        : (task.completed ? 100 : 0),
                0,
                100
            ),
            completed: Boolean(
                task.completed ||
                (typeof task.status === 'string' && task.status.toLowerCase() === 'completed') ||
                (typeof task.progress === 'number' && task.progress >= 100)
            ),
            createdAt: task.createdAt || task.created_at || task.createdOn || new Date().toISOString(),
            updatedAt: task.updatedAt || task.updated_at || task.lastUpdated || task.last_updated || task.modifiedAt || new Date().toISOString()
        };
        
        normalized.priority = this.getPriorityLevelFromTask(task);
        
        if (normalized.completed && normalized.progress < 100) {
            normalized.progress = 100;
        }
        
        return normalized;
    }
    
    generateTaskId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    }
    
    openTaskForm(taskId = null) {
        this.currentTaskId = taskId;
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                this.elements.taskFormTitle.textContent = 'Edit Task';
                this.elements.taskFormId.value = task.id;
                this.elements.taskFormTitleInput.value = task.title;
                this.elements.taskFormDescription.value = task.description || '';
                this.elements.taskFormSubject.value = task.subject || '';
                this.elements.taskFormDueDate.value = task.dueDate || '';
                this.elements.taskFormPriority.value = task.priority;
                this.elements.taskFormProgress.value = task.progress || 0;
                this.updateTaskFormProgressValue();
                this.elements.taskFormSubmit.textContent = 'Update Task';
            }
        } else {
            this.elements.taskFormTitle.textContent = 'Add Task';
            this.elements.taskFormId.value = '';
            this.elements.taskForm.reset();
            this.elements.taskFormPriority.value = 'medium';
            this.elements.taskFormProgress.value = 0;
            this.updateTaskFormProgressValue();
            this.elements.taskFormSubmit.textContent = 'Save Task';
        }
        
        this.openModal('task-form-modal');
    }
    
    updateTaskFormProgressValue() {
        if (this.elements.taskFormProgress && this.elements.taskFormProgressValue) {
            this.elements.taskFormProgressValue.textContent = this.elements.taskFormProgress.value + '%';
        }
    }
    
    async handleTaskFormSubmit(e) {
        e.preventDefault();
        
        const taskId = this.elements.taskFormId.value;
        const taskData = {
            title: this.elements.taskFormTitleInput.value.trim(),
            description: this.elements.taskFormDescription.value.trim(),
            subject: this.elements.taskFormSubject.value.trim(),
            dueDate: this.elements.taskFormDueDate.value,
            priority: this.elements.taskFormPriority.value.toLowerCase(),
            progress: parseInt(this.elements.taskFormProgress.value),
            completed: false,
            updatedAt: new Date().toISOString()
        };
        
        if (taskId) {
            await this.updateTask(taskId, taskData);
        } else {
            await this.createTask(taskData);
        }
        
        this.closeModal('task-form-modal');
        this.renderTasks();
    }
    
    async createTask(taskData) {
        const task = this.normalizeTask({
            ...taskData,
            createdAt: new Date().toISOString()
        });
        
        try {
            if (window.api && window.api.createTask) {
                const created = await window.api.createTask(task);
                this.tasks.push(this.normalizeTask(created));
            } else {
                const response = await fetch(this.apiEndpoints.tasks, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.task || data.data) {
                        this.tasks.push(this.normalizeTask(data.task || data.data));
                    } else {
                        this.tasks.push(task);
                    }
                } else {
                    this.tasks.push(task);
                }
            }
        } catch (error) {
            console.warn('Task creation API unavailable, saving locally');
            this.tasks.push(task);
        }
        
        this.saveToStorage();
        this.updateMotivationalMessage("Great! Task created successfully! 🎉");
        this.initAnalyticsAndCharts();
        this.buildEventsFromData();
    }
    
    async updateTask(taskId, taskData) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        const updatedTask = {
            ...this.tasks[taskIndex],
            ...taskData
        };
        
        try {
            if (window.api && window.api.updateTask) {
                const saved = await window.api.updateTask(taskId, updatedTask);
                this.tasks[taskIndex] = this.normalizeTask(saved);
            } else {
                const response = await fetch(this.apiEndpoints.task(taskId), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedTask)
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.task || data.data) {
                        this.tasks[taskIndex] = this.normalizeTask(data.task || data.data);
                    } else {
                        this.tasks[taskIndex] = updatedTask;
                    }
                } else {
                    this.tasks[taskIndex] = updatedTask;
                }
            }
        } catch (error) {
            console.warn('Task update API unavailable, saving locally');
            this.tasks[taskIndex] = updatedTask;
        }
        
        this.saveToStorage();
        this.updateMotivationalMessage("Task updated successfully! ✅");
        this.initAnalyticsAndCharts();
        this.buildEventsFromData();
    }
    
    openTaskDetail(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.currentTaskId = taskId;
        
        if (this.elements.taskDetailTitle) {
            this.elements.taskDetailTitle.textContent = 'Task Details';
        }
        if (this.elements.taskDetailSubtitle) {
            this.elements.taskDetailSubtitle.textContent = task.subject || 'General';
        }
        if (this.elements.taskDetailName) {
            this.elements.taskDetailName.textContent = task.title;
        }
        if (this.elements.taskDetailDescription) {
            this.elements.taskDetailDescription.textContent = task.description || 'No description provided';
        }
        if (this.elements.taskDetailSubject) {
            this.elements.taskDetailSubject.textContent = task.subject || '—';
        }
        if (this.elements.taskDetailDueDate) {
            this.elements.taskDetailDueDate.textContent = task.dueDate ? this.formatDate(task.dueDate) : '—';
        }
        if (this.elements.taskDetailUpdated) {
            this.elements.taskDetailUpdated.textContent = task.updatedAt ? this.formatDateTime(task.updatedAt) : '—';
        }
        
        if (this.elements.taskDetailPriorityBadge) {
            this.elements.taskDetailPriorityBadge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            this.elements.taskDetailPriorityBadge.className = 'priority-badge ' + task.priority;
        }
        
        const progress = task.progress || 0;
        if (this.elements.taskDetailProgressBar) {
            this.elements.taskDetailProgressBar.style.width = progress + '%';
        }
        if (this.elements.taskDetailProgressValue) {
            this.elements.taskDetailProgressValue.textContent = progress + '%';
        }
        
        this.openModal('task-detail-modal');
    }
    
    openDeleteConfirm(taskId) {
        this.currentTaskId = taskId;
        this.closeModal('task-detail-modal');
        this.openModal('delete-confirm-modal');
    }
    
    async confirmDeleteTask() {
        if (!this.currentTaskId) return;
        
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentTaskId);
        if (taskIndex === -1) return;
        
        try {
            if (window.api && window.api.deleteTask) {
                await window.api.deleteTask(this.currentTaskId);
            } else {
                const response = await fetch(this.apiEndpoints.task(this.currentTaskId), { method: 'DELETE' });
                if (!response.ok && response.status !== 404) {
                    console.warn('Task deletion API failed, removing locally');
                }
            }
        } catch (error) {
            console.warn('Task deletion API unavailable, removing locally');
        }
        
        this.tasks.splice(taskIndex, 1);
        this.saveToStorage();
        this.renderTasks();
        this.closeModal('delete-confirm-modal');
        this.currentTaskId = null;
        this.updateMotivationalMessage("Task deleted.");
        this.initAnalyticsAndCharts();
        this.buildEventsFromData();
    }
    
    openPriorityOverride(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.currentTaskId = taskId;
        this.elements.priorityOverrideTaskId.value = taskId;
        this.elements.priorityOverrideSelect.value = task.priority;
        this.elements.priorityOverrideReason.value = '';
        
        this.closeModal('task-detail-modal');
        this.openModal('priority-override-modal');
    }
    
    async handlePriorityOverrideSubmit(e) {
        e.preventDefault();
        
        const taskId = this.elements.priorityOverrideTaskId.value;
        const newPriority = this.elements.priorityOverrideSelect.value.toLowerCase();
        const reason = this.elements.priorityOverrideReason.value.trim();
        
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        try {
            const response = await fetch(this.apiEndpoints.taskPriority(taskId), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    priority: newPriority,
                    reason: reason
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.task) {
                    this.tasks[taskIndex] = this.normalizeTask(data.task);
                } else {
                    this.tasks[taskIndex].priority = newPriority;
                    this.tasks[taskIndex].updatedAt = new Date().toISOString();
                }
            } else {
                this.tasks[taskIndex].priority = newPriority;
                this.tasks[taskIndex].updatedAt = new Date().toISOString();
            }
        } catch (error) {
            console.warn('Priority override API unavailable, saving locally');
            this.tasks[taskIndex].priority = newPriority;
            this.tasks[taskIndex].updatedAt = new Date().toISOString();
        }
        
        this.saveToStorage();
        this.renderTasks();
        this.closeModal('priority-override-modal');
        this.updateMotivationalMessage("Priority updated! 🎯");
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        this.activeModal = modalId;
        
        if (this.elements.taskModalOverlay) {
            this.elements.taskModalOverlay.removeAttribute('hidden');
            requestAnimationFrame(() => {
                this.elements.taskModalOverlay.classList.add('active');
            });
        }
        modal.removeAttribute('hidden');
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    }
    
    closeModal(modalId = null) {
        const targetModalId = modalId || this.activeModal;
        if (!targetModalId) return;
        
        const modal = document.getElementById(targetModalId);
        if (!modal) return;
        
        if (this.elements.taskModalOverlay) {
            this.elements.taskModalOverlay.classList.remove('active');
        }
        modal.classList.remove('active');
        
        setTimeout(() => {
            if (this.elements.taskModalOverlay && !document.querySelector('.modal.active')) {
                this.elements.taskModalOverlay.setAttribute('hidden', '');
            }
            modal.setAttribute('hidden', '');
            this.activeModal = null;
        }, 250);
    }
    
    renderPriorityTasks() {
        const priorityTasks = this.tasks
            .filter(task => !task.completed && (task.priority === 'high' || task.progress > 0))
            .sort((a, b) => {
                if (this.priorityOrder[a.priority] !== this.priorityOrder[b.priority]) {
                    return this.priorityOrder[a.priority] - this.priorityOrder[b.priority];
                }
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            })
            .slice(0, 6);
        
        if (!this.elements.priorityTaskList) return;
        
        if (priorityTasks.length === 0) {
            this.elements.priorityTaskList.innerHTML = `
                <div class="priority-task-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <p>No priority tasks yet. Create your first task!</p>
                </div>
            `;
            return;
        }
        
        this.elements.priorityTaskList.innerHTML = '';
        
        priorityTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'priority-task-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Open details for ${task.title}`);
            
            const header = document.createElement('div');
            header.className = 'priority-task-card-header';
            
            const titleEl = document.createElement('h4');
            titleEl.textContent = task.title;
            
            const badge = document.createElement('div');
            badge.className = `priority-badge ${task.priority}`;
            badge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            
            header.appendChild(titleEl);
            header.appendChild(badge);
            
            const desc = document.createElement('p');
            desc.textContent = task.description || 'No description';
            
            const progress = task.progress || 0;
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = `<div class="progress-bar-fill" style="width: ${progress}%"></div>`;
            
            const footer = document.createElement('div');
            footer.className = 'priority-task-card-footer';
            
            const meta = document.createElement('div');
            meta.className = 'priority-task-meta';
            
            if (task.subject) {
                const subject = document.createElement('span');
                subject.className = 'priority-task-subject';
                subject.textContent = task.subject;
                meta.appendChild(subject);
            }
            
            const progressValue = document.createElement('span');
            progressValue.className = 'progress-value';
            progressValue.textContent = progress + '%';
            
            footer.appendChild(meta);
            footer.appendChild(progressValue);
            
            card.appendChild(header);
            card.appendChild(desc);
            card.appendChild(progressBar);
            card.appendChild(footer);
            
            card.addEventListener('click', () => this.openTaskDetail(task.id));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openTaskDetail(task.id);
                }
            });
            
            this.elements.priorityTaskList.appendChild(card);
        });
    }
    
    formatDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    formatDateTime(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }
    
    getPriorityLevelFromTask(task) {
        if (task.priorityOverride) {
            const override = task.priorityOverride.toLowerCase().trim();
            if (['high', 'medium', 'low'].includes(override)) {
                return override;
            }
        }
        
        if (task.priority) {
            const level = (task.priority + '').toLowerCase().trim();
            const map = {
                'high': 'high',
                'urgent': 'high',
                '3': 'high',
                'critical': 'high',
                'medium': 'medium',
                'normal': 'medium',
                '2': 'medium',
                'low': 'low',
                '1': 'low',
                'minor': 'low'
            };
            if (map[level]) {
                return map[level];
            }
            if (level.startsWith('h')) return 'high';
            if (level.startsWith('m') || level.startsWith('n')) return 'medium';
            if (level.startsWith('l')) return 'low';
        }
        
        if (typeof task.priorityScore === 'number') {
            if (task.priorityScore >= 70) return 'high';
            if (task.priorityScore >= 40) return 'medium';
            return 'low';
        }
        
        return 'medium';
    }
    
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    getPriorityWeight(task) {
        const overrideLevel = typeof task.priorityOverride === 'string'
            ? task.priorityOverride.toLowerCase()
            : task.priorityOverride && task.priorityOverride.level
                ? String(task.priorityOverride.level).toLowerCase()
                : null;
        if (overrideLevel && this.priorityOrder[overrideLevel] !== undefined) {
            return this.priorityOrder[overrideLevel] - 0.5;
        }
        const level = (task.priority || 'medium').toLowerCase();
        let weight = this.priorityOrder[level] !== undefined ? this.priorityOrder[level] : this.priorityOrder['medium'];
        if (typeof task.priorityScore === 'number') {
            const score = task.priorityScore > 1 ? task.priorityScore / 100 : task.priorityScore;
            weight -= score * 0.1;
        }
        return weight;
    }
    
    compareDueDates(a, b) {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
            return 0;
        }
        return dateA - dateB;
    }

    async initAnalyticsAndCharts() {
        try {
            if (window.api && window.api.getAnalytics) {
                const analytics = await window.api.getAnalytics();
                this.analytics = analytics;
            } else {
                this.analytics = this.deriveAnalyticsFromTasks();
            }
        } catch (e) {
            this.analytics = this.deriveAnalyticsFromTasks();
        }
        this.initCharts();
        this.renderProgressRing();
    }

    deriveAnalyticsFromTasks() {
        const subjects = {};
        let completed = 0; let inProgress = 0; let totalProgress = 0;
        this.tasks.forEach(t => {
            const key = t.subject || 'General';
            if (!subjects[key]) subjects[key] = { estimated: 60, actual: 0, sessions: 0 };
            subjects[key].sessions += 1;
            subjects[key].actual += t.progress ? Math.round((t.progress / 100) * 60) : 0;
            if (t.completed) completed += 1; else inProgress += 1;
            totalProgress += t.progress || 0;
        });
        const avgProgress = this.tasks.length ? Math.round(totalProgress / this.tasks.length) : 0;
        // Simple trends
        const weekly = Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(avgProgress + (Math.random() * 20 - 10))));
        const monthly = Array.from({ length: 30 }, () => Math.max(0, Math.round(avgProgress + (Math.random() * 20 - 10))));
        const yearly = Array.from({ length: 12 }, () => Math.max(0, Math.round(avgProgress + (Math.random() * 20 - 10))));
        return { subjects, totals: { completed, inProgress, avgProgress }, trend: { weekly, monthly, yearly } };
    }

    initCharts() {
        this.updateTimeChart();
        this.drawLineChart(this.currentProgressView || 'weekly');
    }

    updateTimeChart() {
        const canvas = this.elements.timeChartCanvas;
        if (!canvas || !this.analytics) return;
        const ctx = canvas.getContext('2d');
        const labels = Object.keys(this.analytics.subjects || {});
        const values = labels.map(k => (this.analytics.subjects[k].actual || 0) / 60);
        if (window.Chart) {
            if (this.charts.timeChart) {
                this.charts.timeChart.data.labels = labels;
                this.charts.timeChart.data.datasets[0].data = values;
                this.charts.timeChart.update();
            } else {
                this.charts.timeChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Hours',
                            data: values,
                            backgroundColor: ['#1D9BF0', '#38BDF8', '#0F6EB2', '#10B981', '#F59E0B']
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => `${ctx.formattedValue} hrs`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { callback: (value) => `${value}h` }
                            }
                        }
                    }
                });
            }
        } else {
            // Fallback simple bar drawing
            const w = canvas.width = canvas.clientWidth; const h = canvas.height = 180;
            ctx.clearRect(0, 0, w, h);
            const max = Math.max(1, ...values);
            const barW = w / (values.length * 1.5 || 1);
            values.forEach((v, i) => {
                const x = 20 + i * barW * 1.5;
                const bh = (v / max) * (h - 40);
                ctx.fillStyle = ['#1D9BF0', '#38BDF8', '#0F6EB2', '#10B981', '#F59E0B'][i % 5];
                ctx.fillRect(x, h - bh - 20, barW, bh);
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#64748b';
                ctx.font = '12px system-ui';
                ctx.fillText(labels[i] || '', x, h - 5);
            });
        }
    }

    handleProgressViewToggle(button) {
        if (!button) return;
        const view = button.getAttribute('data-view') || 'weekly';
        const buttons = this.elements.progressViewButtons || [];
        buttons.forEach(b => b.classList.remove('progress-view-toggle__button--active'));
        button.classList.add('progress-view-toggle__button--active');
        this.currentProgressView = view;
        this.drawLineChart(view);
    }

    drawLineChart(view) {
        const canvas = this.elements.progressGraphCanvas;
        if (!canvas || !this.analytics) return;
        const data = (this.analytics.trend && this.analytics.trend[view]) || [];
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.clientWidth; const h = canvas.height = 180;
        ctx.clearRect(0, 0, w, h);
        const max = Math.max(100, ...data);
        const pts = data.map((v, i) => [i / Math.max(1, data.length - 1) * (w - 40) + 20, h - 20 - (v / max) * (h - 40)]);
        // Animate with requestAnimationFrame
        let t = 0; const duration = 350; const start = performance.now();
        const animate = (now) => {
            t = Math.min(1, (now - start) / duration);
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 2; ctx.beginPath();
            pts.forEach(([x, y], i) => {
                const iy = h - 20 - (1 - t) * (h - 20 - y);
                if (i === 0) ctx.moveTo(x, iy); else ctx.lineTo(x, iy);
            });
            ctx.stroke();
            if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    renderProgressRing() {
        const container = document.querySelector('#progressGraph .progress-summary');
        if (!container || !this.analytics) return;
        if (container.querySelector('.progress-ring')) return;
        const avg = this.analytics.totals?.avgProgress || 0;
        const size = 72; const stroke = 8; const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
        const el = document.createElement('div');
        el.className = 'progress-ring';
        el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '12px';
        el.innerHTML = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="#e5e7eb" stroke-width="${stroke}" fill="none" />
                <circle class="progress-ring-bar" cx="${size/2}" cy="${size/2}" r="${r}" stroke="#10B981" stroke-width="${stroke}" fill="none" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})" stroke-dasharray="${c}" stroke-dashoffset="${c}" />
            </svg>
            <div>
                <div style="font-size:20px;font-weight:600;">${avg}%</div>
                <div class="progress-summary__label">Avg Progress</div>
            </div>`;
        container.prepend(el);
        const bar = el.querySelector('.progress-ring-bar');
        const target = c * (1 - avg / 100);
        let current = c; const duration = 400; const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const val = current + (target - c) * t; // animate to target
            bar.setAttribute('stroke-dashoffset', String(val));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    async fetchTimetable() {
        try {
            if (window.api && window.api.getTimetable) {
                const data = await window.api.getTimetable();
                this.timetable = data;
            }
        } catch (e) {
            this.timetable = this.timetable || null;
        }
        this.renderTimetable();
        this.buildEventsFromData();
    }

    renderTimetable() {
        const scheduleEl = this.elements.timetableSchedule;
        if (!scheduleEl) return;
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const entries = this.timetable?.days?.[today] || [];
        scheduleEl.innerHTML = '';
        if (!entries.length) {
            const row = document.createElement('div');
            row.className = 'timetable__row';
            row.innerHTML = `<div class="timetable__time">—</div><div class="timetable__slot"><span class="timetable__slot-title">No classes</span></div>`;
            scheduleEl.appendChild(row);
            return;
        }
        entries.forEach(item => {
            const row = document.createElement('div');
            row.className = 'timetable__row';
            row.innerHTML = `
                <div class="timetable__time">${item.time}</div>
                <div class="timetable__slot timetable__slot--active">
                    <span class="timetable__slot-title">${item.subject}</span>
                    <span class="timetable__slot-room">${item.room || ''}</span>
                </div>`;
            scheduleEl.appendChild(row);
        });
        const badge = document.querySelector('[data-current-day]');
        if (badge) {
            const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            badge.textContent = `Today: ${day}`;
        }
    }

    openTimetableEditor() {
        if (!this.elements.timetableJsonInput) return;
        const value = JSON.stringify(this.timetable || { days: {} }, null, 2);
        this.elements.timetableJsonInput.value = value;
        this.openModal('timetable-editor-modal');
    }

    async handleTimetableSave(e) {
        e.preventDefault();
        try {
            const text = this.elements.timetableJsonInput.value.trim();
            const parsed = text ? JSON.parse(text) : { days: {} };
            let saved = parsed;
            if (window.api && window.api.saveTimetable) {
                const res = await window.api.saveTimetable(parsed);
                saved = res?.data || res || parsed;
            }
            this.timetable = saved;
            this.renderTimetable();
            this.buildEventsFromData();
            this.closeModal('timetable-editor-modal');
            this.updateMotivationalMessage('Timetable saved successfully! ✅');
        } catch (err) {
            alert('Invalid JSON. Please check your timetable format.');
        }
    }

    setupCalendar() {
        this.calendarState = this.calendarState || { currentDate: new Date(), selectedDate: new Date(), eventsByDate: {} };
        this.generateCalendarDays();
        this.updateCalendarEventsList();
    }

    handleCalendarNavClick(dir) {
        const date = this.calendarState.currentDate || new Date();
        const month = date.getMonth();
        this.calendarState.currentDate = new Date(date.getFullYear(), month + (dir === 'next' ? 1 : -1), 1);
        this.generateCalendarDays();
    }

    selectCalendarDate(date) {
        this.calendarState.selectedDate = date;
        this.generateCalendarDays();
        this.updateCalendarEventsList();
    }

    generateCalendarDays() {
        const container = this.elements.calendarDaysContainer;
        if (!container) return;
        const current = this.calendarState.currentDate || new Date();
        const year = current.getFullYear(); const month = current.getMonth();
        const firstDay = new Date(year, month, 1); const startDay = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const selected = this.calendarState.selectedDate || new Date();
        const labelEl = this.elements.calendarMonthLabel;
        if (labelEl) labelEl.textContent = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        container.innerHTML = '';
        // Fill blanks
        for (let i = 0; i < startDay; i++) {
            const blank = document.createElement('div'); blank.className = 'calendar__day calendar__day--empty'; container.appendChild(blank);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const cell = document.createElement('button');
            cell.className = 'calendar__day';
            const dateObj = new Date(year, month, d);
            cell.textContent = String(d);
            cell.setAttribute('type', 'button');
            if (dateObj.toDateString() === selected.toDateString()) cell.classList.add('calendar__day--selected');
            const key = dateObj.toISOString().slice(0, 10);
            const events = this.calendarState.eventsByDate?.[key] || [];
            if (events.length) {
                const dot = document.createElement('span'); dot.className = 'calendar__day-dot'; cell.appendChild(dot);
            }
            cell.addEventListener('click', () => this.selectCalendarDate(dateObj));
            container.appendChild(cell);
        }
    }

    buildEventsFromData() {
        const byDate = {};
        // Tasks due dates
        this.tasks.forEach(t => {
            if (t.dueDate) {
                const key = new Date(t.dueDate).toISOString().slice(0, 10);
                byDate[key] = byDate[key] || [];
                byDate[key].push({ type: 'task', title: t.title, date: new Date(t.dueDate) });
            }
        });
        // You could also add timetable entries mapped to current week
        this.calendarState.eventsByDate = byDate;
    }

    updateCalendarEventsList() {
        const list = this.elements.calendarEventsList;
        if (!list) return;
        list.innerHTML = '';
        const sel = this.calendarState.selectedDate || new Date();
        const key = sel.toISOString().slice(0, 10);
        const evts = this.calendarState.eventsByDate?.[key] || [];
        if (!evts.length) {
            const empty = document.createElement('div');
            empty.className = 'calendar-event';
            empty.innerHTML = '<div class="calendar-event__content"><span class="calendar-event__title">No events</span></div>';
            list.appendChild(empty);
            return;
        }
        evts.forEach((e) => {
            const item = document.createElement('div');
            item.className = 'calendar-event';
            item.innerHTML = `
                <div class="calendar-event__marker" style="background-color:#4F46E5;"></div>
                <div class="calendar-event__content">
                    <span class="calendar-event__title">${e.title}</span>
                    <span class="calendar-event__date">${sel.toDateString()}</span>
                </div>`;
            list.appendChild(item);
        });
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
