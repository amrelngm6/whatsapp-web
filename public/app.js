/**
 * WhatsApp Web Client Application
 * Professional client-side application for WhatsApp Web interface
 * Handles real-time messaging, chat management, and UI interactions
 */
class WhatsAppClient {
    constructor() {
        // Initialize state
        this.socket = null;
        this.currentChatId = null;
        this.chats = [];
        this.messages = [];
        this.isReady = false; 
        this.clientInfo = null;
        this.messagePolling = null;
        
        // DOM elements
        this.elements = {
            qrModal: document.getElementById('qrModal'),
            qrCode: document.getElementById('qrCode'),
            statusBanner: document.getElementById('statusBanner'),
            statusText: document.getElementById('statusText'),
            chatList: document.getElementById('chatList'),
            welcomeScreen: document.getElementById('welcomeScreen'),
            chatContainer: document.getElementById('chatContainer'),
            messagesArea: document.getElementById('messagesArea'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            chatName: document.getElementById('chatName'),
            chatStatus: document.getElementById('chatStatus'),
            searchInput: document.getElementById('searchInput'),
            menuBtn: document.getElementById('menuBtn'),
            menuDropdown: document.getElementById('menuDropdown'),
            logoutBtn: document.getElementById('logoutBtn'),
            userName: document.getElementById('userName')
        };
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        console.log('Initializing WhatsApp Client...');
        this.setupSocketConnection();
        this.setupEventListeners();
        this.checkStatus();
    }
    
    /**
     * Setup Socket.IO connection
     */
    setupSocketConnection() {
        try {
            this.socket = io({
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 10
            });
            
            // Connection events
            this.socket.on('connect', () => {
                console.log('Socket connected');
                this.updateStatus('connecting', 'Connecting to WhatsApp...');
            });
            
            this.socket.on('disconnect', () => {
                console.log('Socket disconnected');
                this.updateStatus('error', 'Disconnected from server');
                this.isReady = false;
            });
            
            // WhatsApp events
            this.socket.on('qr', (qrData) => {
                console.log('QR Code received');
                this.showQRCode(qrData);
                this.updateStatus('qr_code', 'Scan QR code with WhatsApp');
            });
            
            this.socket.on('authenticated', () => {
                console.log('Authenticated');
                this.hideQRCode();
                this.updateStatus('authenticated', 'Authenticated! Loading...');
            });
            
            this.socket.on('ready', (clientInfo) => {
                console.log('WhatsApp is ready!', clientInfo);
                this.isReady = true;
                this.clientInfo = clientInfo;
                this.hideQRCode();
                this.updateStatus('success', 'Connected to WhatsApp', true);
                
                if (clientInfo && clientInfo.pushname) {
                    this.elements.userName.textContent = clientInfo.pushname;
                }
            });
            
            this.socket.on('chats', (chatsData) => {
                console.log('Chats received:', chatsData.length);
                this.chats = chatsData;
                this.renderChatList(chatsData);
            });
            
            this.socket.on('message', (messageData) => {
                console.log('New message received:', messageData);
                this.handleIncomingMessage(messageData);
            });
            
            this.socket.on('message_ack', (data) => {
                console.log('Message acknowledgement:', data);
                this.updateMessageStatus(data.id, data.ack);
            });
            
            this.socket.on('status', (statusData) => {
                console.log('Status update:', statusData);
                this.handleStatusUpdate(statusData);
            });
            
            this.socket.on('disconnected', (reason) => {
                console.log('WhatsApp disconnected:', reason);
                this.isReady = false;
                this.updateStatus('error', 'Disconnected from WhatsApp');
                this.showQRCode(null);
            });
            
        } catch (error) {
            console.error('Socket connection error:', error);
            this.updateStatus('error', 'Failed to connect to server');
        }
    }
    
    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Send message on button click
        this.elements.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Send message on Enter key
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Search functionality
        this.elements.searchInput.addEventListener('input', (e) => {
            this.filterChats(e.target.value);
        });
        
        // Menu dropdown
        this.elements.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.menuDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.elements.menuDropdown.classList.remove('show');
        });
        
        // Logout
        this.elements.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
        
        // Close QR modal on background click
        this.elements.qrModal.addEventListener('click', (e) => {
            if (e.target === this.elements.qrModal) {
                // Don't allow closing QR modal when authentication is required
                // this.hideQRCode();
            }
        });
    }
    
    /**
     * Check current status from server
     */
    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.isReady) {
                this.isReady = true;
                this.clientInfo = data.clientInfo;
                this.updateStatus('success', 'Connected to WhatsApp', true);
                
                if (data.clientInfo && data.clientInfo.pushname) {
                    this.elements.userName.textContent = data.clientInfo.pushname;
                }
                
                this.loadChats();
            } else if (data.qrCode) {
                this.showQRCode(data.qrCode);
                this.updateStatus('qr_code', 'Scan QR code with WhatsApp');
            } else {
                this.updateStatus('connecting', 'Initializing WhatsApp...');
            }
        } catch (error) {
            console.error('Error checking status:', error);
            this.updateStatus('error', 'Failed to connect to server');
        }
    }
    
    /**
     * Load chats from server
     */
    async loadChats() {
        try {
            const response = await fetch('/api/chats');
            
            if (!response.ok) {
                throw new Error('Failed to load chats');
            }
            
            const chats = await response.json();
            this.chats = chats;
            this.renderChatList(chats);
        } catch (error) {
            console.error('Error loading chats:', error);
            this.showNotification('Failed to load chats', 'error');
        }
    }
    
    /**
     * Render chat list in sidebar
     */
    renderChatList(chats) {
        if (!chats || chats.length === 0) {
            this.elements.chatList.innerHTML = `
                <div class="loading">
                    <i class="fas fa-comments"></i>
                    <p>No chats available</p>
                </div>
            `;
            return;
        }
        
        this.elements.chatList.innerHTML = '';
        
        chats.forEach(chat => {
            const chatItem = this.createChatElement(chat);
            this.elements.chatList.appendChild(chatItem);
        });
    }
    
    /**
     * Create a chat list item element
     */
    createChatElement(chat) {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;
        
        if (this.currentChatId === chat.id) {
            chatItem.classList.add('active');
        }
        
        const lastMessageText = chat.lastMessage 
            ? (chat.lastMessage.fromMe ? 'You: ' : '') + (chat.lastMessage.body || 'Media')
            : 'No messages yet';
        
        const timestamp = chat.lastMessage 
            ? this.formatTimestamp(chat.lastMessage.timestamp)
            : '';
        
        const unreadBadge = chat.unreadCount > 0 
            ? `<div class="chat-badge">${chat.unreadCount}</div>`
            : '';
        
        chatItem.innerHTML = `
            <div class="chat-avatar">
                ${chat.profilePicUrl 
                    ? `<img src="${chat.profilePicUrl}" alt="${chat.name}">` 
                    : `<i class="fas fa-${chat.isGroup ? 'users' : 'user'}"></i>`
                }
            </div>
            <div class="chat-info">
                <div class="chat-header-row">
                    <span class="chat-title">${this.escapeHtml(chat.name)}</span>
                    <span class="chat-time">${timestamp}</span>
                </div>
                <div class="chat-last-message">
                    <span class="chat-last-message-text">${this.escapeHtml(lastMessageText)}</span>
                    ${unreadBadge}
                </div>
            </div>
        `;
        
        chatItem.addEventListener('click', () => {
            this.openChat(chat.id);
        });
        
        return chatItem;
    }
    
    /**
     * Open a chat
     */
    async openChat(chatId) {
        if (!this.isReady) {
            this.showNotification('WhatsApp is not ready yet', 'error');
            return;
        }
        
        this.currentChatId = chatId;
        
        // Update UI
        this.elements.welcomeScreen.style.display = 'none';
        this.elements.chatContainer.style.display = 'flex';
        
        // Update active chat in list
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId === chatId) {
                item.classList.add('active');
            }
        });
        
        // Find chat info
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            this.elements.chatName.textContent = chat.name;
            this.elements.chatStatus.textContent = 'online';
        }
        
        // Load messages
        await this.loadMessages(chatId);
        
        // Mark as read
        this.markChatAsRead(chatId);
        
        // Focus input
        this.elements.messageInput.focus();
    }
    
    /**
     * Load messages for a chat
     */
    async loadMessages(chatId) {
        try {
            this.elements.messagesArea.innerHTML = `
                <div class="loading">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <p>Loading messages...</p>
                </div>
            `;
            
            const response = await fetch(`/api/messages/${chatId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            
            const messages = await response.json();
            this.messages = messages;
            this.renderMessages(messages);
            
            // Scroll to bottom
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Error loading messages:', error);
            this.elements.messagesArea.innerHTML = `
                <div class="loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load messages</p>
                </div>
            `;
        }
    }
    
    /**
     * Render messages in chat area
     */
    renderMessages(messages) {
        this.elements.messagesArea.innerHTML = '';
        
        if (messages.length === 0) {
            this.elements.messagesArea.innerHTML = `
                <div class="loading">
                    <i class="fas fa-comment"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }
        
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.elements.messagesArea.appendChild(messageElement);
        });
    }
    
    /**
     * Create a message element
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.fromMe ? 'outgoing' : 'incoming'}`;
        messageDiv.dataset.messageId = message.id;
        
        const senderName = !message.fromMe && message.senderName 
            ? `<div class="message-sender">${this.escapeHtml(message.senderName)}</div>`
            : '';
        
        const mediaContent = message.hasMedia && message.media
            ? this.createMediaContent(message.media)
            : '';
        
        const statusIcon = message.fromMe
            ? this.getStatusIcon(message.ack)
            : '';
        
        const timestamp = this.formatMessageTime(message.timestamp);
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${senderName}
                ${mediaContent}
                ${message.body ? `<div class="message-text">${this.escapeHtml(message.body)}</div>` : ''}
                <div class="message-footer">
                    <span class="message-time">${timestamp}</span>
                    ${statusIcon}
                </div>
            </div>
        `;
        
        return messageDiv;
    }
    
    /**
     * Create media content for message
     */
    createMediaContent(media) {
        if (media.mimetype && media.mimetype.startsWith('image/')) {
            return `
                <div class="message-media">
                    <img src="data:${media.mimetype};base64,${media.data}" alt="Image">
                </div>
            `;
        }
        return '';
    }
    
    /**
     * Get message status icon
     */
    getStatusIcon(ack) {
        const icons = {
            0: '<i class="fas fa-clock message-status"></i>',
            1: '<i class="fas fa-check message-status"></i>',
            2: '<i class="fas fa-check-double message-status delivered"></i>',
            3: '<i class="fas fa-check-double message-status read"></i>'
        };
        return icons[ack] || '';
    }
    
    /**
     * Send a message
     */
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        
        if (!message || !this.currentChatId || !this.isReady) {
            return;
        }
        
        // Clear input
        this.elements.messageInput.value = '';
        
        // Add message to UI immediately (optimistic update)
        const tempMessage = {
            id: 'temp_' + Date.now(),
            body: message,
            fromMe: true,
            timestamp: Math.floor(Date.now() / 1000),
            ack: 0
        };
        
        const messageElement = this.createMessageElement(tempMessage);
        this.elements.messagesArea.appendChild(messageElement);
        this.scrollToBottom();
        
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    message: message
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const data = await response.json();
            console.log('Message sent:', data);
            
            // Update temp message with real ID
            if (data.messageId) {
                messageElement.dataset.messageId = data.messageId;
            }
            
            // Update chat list
            this.updateChatLastMessage(this.currentChatId, message, true);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message', 'error');
            
            // Remove temp message
            messageElement.remove();
        }
    }
    
    /**
     * Handle incoming message from socket
     */
    handleIncomingMessage(messageData) {
        // Update chat list
        if (messageData.chatId) {
            this.updateChatLastMessage(
                messageData.chatId, 
                messageData.body, 
                messageData.fromMe
            );
        }
        
        // If message is for current chat, add it to the UI
        if (messageData.chatId === this.currentChatId) {
            const messageElement = this.createMessageElement(messageData);
            this.elements.messagesArea.appendChild(messageElement);
            this.scrollToBottom();
            
            // Mark as read
            if (!messageData.fromMe) {
                this.markChatAsRead(messageData.chatId);
            }
        } else {
            // Show notification for other chats
            if (!messageData.fromMe) {
                this.showNotification(`New message from ${messageData.senderName || 'Unknown'}`);
            }
        }
    }
    
    /**
     * Update message status (acknowledgement)
     */
    updateMessageStatus(messageId, ack) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
            const statusElement = messageElement.querySelector('.message-status');
            if (statusElement) {
                const newIcon = this.getStatusIcon(ack);
                statusElement.outerHTML = newIcon;
            }
        }
    }
    
    /**
     * Update chat last message in the list
     */
    updateChatLastMessage(chatId, messageText, fromMe) {
        const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
        
        if (chatItem) {
            const lastMessageElement = chatItem.querySelector('.chat-last-message-text');
            const timeElement = chatItem.querySelector('.chat-time');
            
            if (lastMessageElement) {
                lastMessageElement.textContent = (fromMe ? 'You: ' : '') + messageText;
            }
            
            if (timeElement) {
                timeElement.textContent = this.formatTimestamp(Math.floor(Date.now() / 1000));
            }
            
            // Move to top of list
            this.elements.chatList.prepend(chatItem);
        }
        
        // Update chat in data
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.lastMessage = {
                body: messageText,
                timestamp: Math.floor(Date.now() / 1000),
                fromMe: fromMe
            };
            
            if (!fromMe && chatId !== this.currentChatId) {
                chat.unreadCount = (chat.unreadCount || 0) + 1;
                this.updateUnreadBadge(chatId, chat.unreadCount);
            }
        }
    }
    
    /**
     * Update unread badge for a chat
     */
    updateUnreadBadge(chatId, count) {
        const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
        
        if (chatItem) {
            let badge = chatItem.querySelector('.chat-badge');
            
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'chat-badge';
                    chatItem.querySelector('.chat-last-message').appendChild(badge);
                }
                badge.textContent = count;
            } else if (badge) {
                badge.remove();
            }
        }
    }
    
    /**
     * Mark chat as read
     */
    async markChatAsRead(chatId) {
        try {
            await fetch(`/api/mark-read/${chatId}`, {
                method: 'POST'
            });
            
            // Update UI
            this.updateUnreadBadge(chatId, 0);
            
            // Update data
            const chat = this.chats.find(c => c.id === chatId);
            if (chat) {
                chat.unreadCount = 0;
            }
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    }
    
    /**
     * Filter chats based on search query
     */
    filterChats(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.renderChatList(this.chats);
            return;
        }
        
        const filteredChats = this.chats.filter(chat => {
            const name = chat.name.toLowerCase();
            const lastMessage = chat.lastMessage?.body?.toLowerCase() || '';
            return name.includes(searchTerm) || lastMessage.includes(searchTerm);
        });
        
        this.renderChatList(filteredChats);
    }
    
    /**
     * Show QR code modal
     */
    showQRCode(qrData) {
        this.elements.qrModal.classList.add('show');
        
        if (qrData) {
            this.elements.qrCode.innerHTML = `<img src="${qrData}" alt="QR Code">`;
        } else {
            this.elements.qrCode.innerHTML = '<div class="loader"></div>';
        }
    }
    
    /**
     * Hide QR code modal
     */
    hideQRCode() {
        this.elements.qrModal.classList.remove('show');
    }
    
    /**
     * Update status banner
     */
    updateStatus(status, message, autoHide = false) {
        this.elements.statusBanner.className = 'status-banner';
        
        const icons = {
            connecting: '<i class="fas fa-circle-notch fa-spin"></i>',
            qr_code: '<i class="fas fa-qrcode"></i>',
            authenticated: '<i class="fas fa-check-circle"></i>',
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-triangle"></i>'
        };
        
        if (status === 'success') {
            this.elements.statusBanner.classList.add('success');
        } else if (status === 'error') {
            this.elements.statusBanner.classList.add('error');
        }
        
        this.elements.statusText.innerHTML = `${icons[status] || ''} ${message}`;
        this.elements.statusBanner.classList.remove('hidden');
        
        if (autoHide) {
            setTimeout(() => {
                this.elements.statusBanner.classList.add('hidden');
            }, 3000);
        }
    }
    
    /**
     * Handle status updates from socket
     */
    handleStatusUpdate(statusData) {
        const statusMap = {
            'qr_code': 'qr_code',
            'authenticated': 'authenticated',
            'ready': 'success',
            'disconnected': 'error'
        };
        
        const status = statusMap[statusData.status] || 'connecting';
        this.updateStatus(status, statusData.message, status === 'success');
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Simple notification using status banner
        this.updateStatus(type === 'error' ? 'error' : 'success', message, true);
    }
    
    /**
     * Logout from WhatsApp
     */
    async logout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.isReady = false;
                this.currentChatId = null;
                this.chats = [];
                this.messages = [];
                
                // Reset UI
                this.elements.welcomeScreen.style.display = 'flex';
                this.elements.chatContainer.style.display = 'none';
                this.elements.chatList.innerHTML = '';
                
                this.updateStatus('connecting', 'Logged out. Waiting for new QR code...');
                this.showQRCode(null);
            }
        } catch (error) {
            console.error('Error logging out:', error);
            this.showNotification('Failed to logout', 'error');
        }
    }
    
    /**
     * Scroll messages area to bottom
     */
    scrollToBottom() {
        setTimeout(() => {
            this.elements.messagesArea.scrollTop = this.elements.messagesArea.scrollHeight;
        }, 100);
    }
    
    /**
     * Format timestamp for chat list
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        
        // If today, show time
        if (diff < 86400000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        }
        
        // If yesterday
        if (diff < 172800000 && date.getDate() === now.getDate() - 1) {
            return 'Yesterday';
        }
        
        // If this week
        if (diff < 604800000) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }
        
        // Otherwise show date
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    /**
     * Format timestamp for message
     */
    formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing WhatsApp Client...');
    window.whatsappClient = new WhatsAppClient();
});
