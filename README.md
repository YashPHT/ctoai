# Smart Academic Mentor - Chatbot UI

An AI-powered academic mentoring chatbot with a responsive, accessible front-end interface.

## Features

### Chatbot Interface
- **Responsive Modal/Sidebar Design**: Slides in from the right on desktop, full-screen on mobile
- **Real-time Conversation UI**: Message bubbles, typing indicators, and smooth animations
- **Multi-step Question Flow**: Handles complex conversation flows for task creation and planning
- **Quick Actions**: Pre-defined action buttons for common tasks
- **API Integration**: Communicates with `/api/chat` endpoint for AI responses

### Dashboard
- **Task Management**: Display and manage study tasks created through the chatbot
- **Task List Refresh**: Manual refresh button to update task list
- **Empty State**: Encourages users to start chatting when no tasks exist
- **Motivational Messages**: Dynamic motivational prompts that update based on user actions

### Accessibility
- **ARIA Labels**: Comprehensive ARIA attributes for screen readers
- **Keyboard Navigation**: Full keyboard support with focus management
- **Focus Indicators**: Clear visual focus states for all interactive elements
- **Semantic HTML**: Proper use of semantic elements and roles
- **Reduced Motion Support**: Respects `prefers-reduced-motion` preference

### Responsive Design
- **Mobile-First Approach**: Optimized for mobile devices
- **Breakpoints**:
  - Desktop: Full sidebar chatbot (max-width: 450px)
  - Tablet: 768px and below
  - Mobile: 480px and below
- **Adaptive Layout**: Header and UI elements adjust for smaller screens

### Dark Mode
- **Theme Toggle**: Switch between light and dark themes
- **System Preference Detection**: Respects user's system theme preference
- **Persistent**: Theme preference saved to localStorage
- **CSS Variables**: Easy theme customization through CSS custom properties

## File Structure

```
.
├── index.html          # Main dashboard HTML structure
├── styles.css          # Complete styling with dark mode and responsiveness
├── script.js           # Chatbot logic and interactions
└── README.md           # This file
```

## Implementation Details

### HTML Structure (`index.html`)
- Dashboard header with chatbot trigger button
- Main content area with welcome section and task list
- Chatbot modal with header, messages area, and input form
- Quick action buttons for common tasks
- Overlay for modal backdrop

### CSS Styling (`styles.css`)
- CSS custom properties for easy theming
- Smooth transitions and animations
- Flexbox and Grid layouts for responsive design
- Dark mode implementation using `data-theme` attribute
- Accessibility focus styles

### JavaScript Logic (`script.js`)
- **SmartMentorChatbot Class**: Main chatbot controller
- **Conversation Management**: Handles multi-step flows and state management
- **API Communication**: Sends messages to `/api/chat` endpoint
- **Offline Mode**: Graceful fallback when API is unavailable
- **Task Management**: Create, display, and update tasks
- **Local Storage**: Persists messages, tasks, and theme preferences
- **Event Handling**: Comprehensive event listeners for all interactions

## API Integration

The chatbot expects a POST endpoint at `/api/chat` with the following request format:

```json
{
  "message": "User's message",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "currentStep": "task_creation_subject",
  "taskData": {}
}
```

Expected response format:

```json
{
  "message": "Bot's response",
  "currentStep": "task_creation_description",
  "taskData": { "subject": "Math" },
  "actions": [
    { "text": "Continue", "action": "continue" }
  ],
  "taskCreated": true,
  "task": {
    "title": "Study Algebra",
    "description": "Practice problems 1-10",
    "subject": "Math",
    "dueDate": "2024-10-20",
    "priority": "High"
  },
  "motivational": "Great job creating a task!"
}
```

## Usage

### Opening the Chatbot
- Click the "Chat" button in the dashboard header
- Click "Start Chatting" button in the empty state

### Creating Tasks
1. Click "Create Task" quick action or type "create task"
2. Follow the multi-step conversation flow
3. Provide subject, description, due date, and priority
4. Task is created and displayed in the task list

### Keyboard Shortcuts
- `Enter`: Send message (without Shift key)
- `Shift + Enter`: New line in message input
- `Escape`: Close chatbot modal

### Theme Toggle
- Click the sun/moon icon in the header to toggle between light and dark themes

## Browser Support

- Modern browsers with ES6+ support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customization

### Colors
Modify CSS custom properties in `:root` and `[data-theme="dark"]` sections of `styles.css`:

```css
:root {
  --primary-color: #4F46E5;
  --secondary-color: #10B981;
  /* ... */
}
```

### Motivational Messages
Edit the `motivationalMessages` array in the `SmartMentorChatbot` constructor in `script.js`.

### Quick Actions
Modify the quick action buttons in `index.html` and handle them in `handleQuickAction()` method.

## Performance Considerations

- Smooth 60fps animations
- Efficient DOM manipulation
- LocalStorage for data persistence
- Lazy loading of messages
- Optimized scroll handling

## Future Enhancements

- Voice input support
- File attachment support
- Task categories and filtering
- Calendar integration
- Progress tracking and analytics
- Push notifications for task reminders
- Collaborative features
