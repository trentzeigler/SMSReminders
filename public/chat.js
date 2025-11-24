// Chat Application JavaScript

class ChatApp {
    constructor() {
        this.token = localStorage.getItem('token');
        if (!this.token) {
            window.location.href = '/login';
            return;
        }
        this.currentConversationId = null;
        this.conversations = [];

        this.initializeElements();
        this.attachEventListeners();
        this.loadConversations();
        this.autoResizeTextarea();
    }

    initializeElements() {
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.messageContainer = document.getElementById('messageContainer');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.conversationList = document.getElementById('conversationList');
        this.newConversationBtn = document.getElementById('newConversationBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.chatTitle = document.getElementById('chatTitle');
    }

    attachEventListeners() {
        this.messageForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        this.newConversationBtn.addEventListener('click', () => this.createNewConversation());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());

        // Enter to send, Shift+Enter for new line
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.messageForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    async loadConversations() {
        if (!this.token) {
            this.handleUnauthorized();
            return;
        }

        try {
            const response = await fetch('/api/conversations', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.handleUnauthorized();
                    return;
                }
                throw new Error('Failed to load conversations');
            }

            const data = await response.json();
            this.conversations = data.conversations;
            this.renderConversations();
        } catch (error) {
            console.error('Error loading conversations:', error);
            // If we can't load conversations, something is wrong with auth or server
            // For now, just log it, but if it persists, maybe redirect
        }
    }

    renderConversations() {
        if (this.conversations.length === 0) {
            this.conversationList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No conversations yet</div>';
            return;
        }

        this.conversationList.innerHTML = this.conversations.map(conv => `
      <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}" data-id="${conv.id}">
        <div class="conversation-title">${this.escapeHtml(conv.title)}</div>
        <div class="conversation-meta">${this.formatDate(conv.lastMessageAt)} • ${conv.messageCount} messages</div>
      </div>
    `).join('');

        // Attach click handlers
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadConversation(item.dataset.id);
            });
        });
    }

    async loadConversation(conversationId) {
        if (!this.token) {
            this.handleUnauthorized();
            return;
        }

        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.handleUnauthorized();
                    return;
                }
                throw new Error('Failed to load conversation');
            }

            const data = await response.json();
            this.currentConversationId = conversationId;
            this.chatTitle.textContent = data.conversation.title;

            // Clear and render messages
            this.messageContainer.innerHTML = '';
            data.conversation.messages.forEach(msg => {
                this.addMessageToUI(msg.role, msg.content);
            });

            // Update active state
            this.renderConversations();

            // Scroll to bottom
            this.scrollToBottom();
        } catch (error) {
            console.error('Error loading conversation:', error);
            this.addMessageToUI('assistant', 'Failed to load conversation. Please try again or refresh the page.');
        }
    }

    async createNewConversation() {
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to create conversation');

            const data = await response.json();
            this.currentConversationId = data.conversation.id;
            this.chatTitle.textContent = 'New Conversation';

            // Clear messages
            this.messageContainer.innerHTML = '<div class="welcome-message"><h2>👋 Start a new conversation!</h2><p>Ask me to create, list, update, or delete reminders.</p></div>';

            // Reload conversations
            await this.loadConversations();
        } catch (error) {
            console.error('Error creating conversation:', error);
        }
    }

    async handleSendMessage(e) {
        e.preventDefault();

        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message to UI
        this.addMessageToUI('user', message);

        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();

        // Disable send button
        this.sendButton.disabled = true;

        // Show typing indicator
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();

        try {
            const payload = {
                message
            };

            if (this.currentConversationId) {
                payload.conversationId = this.currentConversationId;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.handleUnauthorized();
                    return;
                }
                throw new Error('Failed to send message');
            }

            // Create assistant message placeholder
            const messageDiv = this.addMessageToUI('assistant', '');
            const contentDiv = messageDiv.querySelector('.message-content');
            let fullResponse = '';

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') continue;

                        try {
                            const event = JSON.parse(dataStr);

                            if (event.type === 'token') {
                                fullResponse += event.data;
                                contentDiv.innerHTML = marked.parse(fullResponse);
                                this.scrollToBottom();
                            } else if (event.type === 'tool_start') {
                                const toolDiv = document.createElement('div');
                                toolDiv.className = 'tool-execution';
                                toolDiv.innerHTML = `⚙️ Calling tool: <code>${event.data.name}</code>...`;
                                contentDiv.appendChild(toolDiv);
                                this.scrollToBottom();
                            } else if (event.type === 'tool_end') {
                                const tools = contentDiv.querySelectorAll('.tool-execution');
                                if (tools.length > 0) {
                                    tools[tools.length - 1].innerHTML += ' ✅ Done';
                                    setTimeout(() => tools[tools.length - 1].remove(), 2000); // Remove after 2s
                                }
                            } else if (event.type === 'conversation_id') {
                                this.currentConversationId = event.data;
                            } else if (event.type === 'error') {
                                throw new Error(event.error);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE event:', e);
                        }
                    }
                }
            }

            // Hide typing indicator
            this.typingIndicator.style.display = 'none';

            // Reload conversations to update list
            await this.loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            this.typingIndicator.style.display = 'none';

            // User-friendly error message
            let displayError = 'Sorry, I encountered an error processing your request. Please try again.';
            if (error.message.includes('Failed to fetch')) {
                displayError = 'Network error. Please check your internet connection.';
            } else if (error.message) {
                displayError = `Error: ${error.message}. Please try again.`;
            }

            this.addMessageToUI('assistant', displayError);
        } finally {
            this.sendButton.disabled = false;
        }
    }

    addMessageToUI(role, content) {
        // Remove welcome message if present
        const welcomeMessage = this.messageContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const avatar = role === 'user' ? 'U' : '🤖';

        // Parse Markdown for assistant messages, or both if desired
        // Configure marked to treat newlines as line breaks
        marked.setOptions({
            breaks: true,
            gfm: true
        });

        let messageHtml;
        if (role === 'assistant') {
            messageHtml = marked.parse(content);
        } else {
            // For user messages, just escape HTML to prevent XSS but allow basic text
            messageHtml = this.escapeHtml(content).replace(/\n/g, '<br>');
        }

        messageDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content markdown-body">${messageHtml}</div>
    `;

        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();

        return messageDiv;
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }, 100);
    }

    handleLogout() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    handleUnauthorized() {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }
}

// Expose initialization function
window.initializeChatApp = () => {
    if (!window.chatApp) {
        window.chatApp = new ChatApp();
    }
};
