const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WhatsApp Client
let client;
let qrCodeData = null;
let isReady = false;
let clientInfo = null;

// Initialize WhatsApp Client
function initializeClient() {
    client = new Client({
        authStrategy: new LocalAuth({
            clientId: "client-one"
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    // QR Code event
    client.on('qr', async (qr) => {
        console.log('QR Code received');
        qrCodeData = await qrcode.toDataURL(qr);
        io.emit('qr', qrCodeData);
        io.emit('status', { status: 'qr_code', message: 'Scan QR Code with WhatsApp' });
    });

    // Authentication event
    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
        qrCodeData = null;
        io.emit('authenticated');
        io.emit('status', { status: 'authenticated', message: 'Authenticated successfully' });
    });

    // Ready event
    client.on('ready', async () => {
        console.log('CLIENT IS READY!');
        isReady = true;
        clientInfo = {
            pushname: client.info.pushname,
            wid: client.info.wid.user,
            platform: client.info.platform
        };
        
        io.emit('ready', clientInfo);
        io.emit('status', { status: 'ready', message: 'WhatsApp is ready!' });
        
        // Load initial chats
        try {
            // const chats = await client.getChats();

            // // only load first 30 quickly
            // const chatList = await Promise.all(chats.slice(0, 30).map(async (chat) => {
            //     const contact = await chat.getContact();
            //     const lastMessage = chat.lastMessage;
            //     return {
            //         id: chat.id._serialized,
            //         name: chat.name || contact.pushname || contact.number,
            //         isGroup: chat.isGroup,
            //         unreadCount: chat.unreadCount,
            //         timestamp: chat.timestamp,
            //         lastMessage: lastMessage ? {
            //             body: lastMessage.body,
            //             timestamp: lastMessage.timestamp,
            //             fromMe: lastMessage.fromMe
            //         } : null
            //         // skip profilePicUrl for speed
            //     };
            // }));
    
            // // Sort by timestamp
            // chatList.sort((a, b) => b.timestamp - a.timestamp);
            // io.emit('chats', chatList);

            const chats = await client.getChats();

// only load first 30 quickly
const chatList = await Promise.all(chats.slice(0, 30).map(async (chat) => {
   const contact = await chat.getContact();
   const lastMessage = chat.lastMessage;
   return {
      id: chat.id._serialized,
      name: chat.name || contact.pushname || contact.number,
      isGroup: chat.isGroup,
      unreadCount: chat.unreadCount,
      timestamp: chat.timestamp,
      lastMessage: lastMessage ? {
         body: lastMessage.body,
         timestamp: lastMessage.timestamp,
         fromMe: lastMessage.fromMe
      } : null
      // skip profilePicUrl for speed
   };
}));

io.emit('chats', chatList);

        } catch (err) {
            console.error('Error loading chats:', err);
        }
    });

    // Message event
    client.on('message', async (msg) => {
        console.log('New message received:', msg.body);
        
        try {
            const chat = await msg.getChat();
            const contact = await msg.getContact();
            
            const messageData = {
                id: msg.id._serialized,
                body: msg.body,
                from: msg.from,
                to: msg.to,
                chatId: chat.id._serialized,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                hasMedia: msg.hasMedia,
                type: msg.type,
                author: msg.author,
                senderName: contact.pushname || contact.number || 'Unknown'
            };
            
            // Download media if present
            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    messageData.media = {
                        mimetype: media.mimetype,
                        data: media.data,
                        filename: media.filename
                    };
                } catch (err) {
                    console.error('Error downloading media:', err);
                }
            }
            
            io.emit('message', messageData);
            
            // Update chat list
            const chats = await client.getChats();
            const chatList = await Promise.all(chats.slice(0, 50).map(async (c) => {
                const cont = await c.getContact();
                const lastMsg = c.lastMessage;
                
                return {
                    id: c.id._serialized,
                    name: c.name || cont.pushname || cont.number,
                    isGroup: c.isGroup,
                    unreadCount: c.unreadCount,
                    timestamp: c.timestamp,
                    lastMessage: lastMsg ? {
                        body: lastMsg.body,
                        timestamp: lastMsg.timestamp,
                        fromMe: lastMsg.fromMe
                    } : null,
                    profilePicUrl: await cont.getProfilePicUrl().catch(() => null)
                };
            }));
            
            chatList.sort((a, b) => b.timestamp - a.timestamp);
            io.emit('chats', chatList);
            
        } catch (err) {
            console.error('Error processing message:', err);
        }
    });

    // Message acknowledgement event
    client.on('message_ack', (msg, ack) => {
        io.emit('message_ack', {
            id: msg.id._serialized,
            ack: ack
        });
    });

    // Disconnected event
    client.on('disconnected', (reason) => {
        console.log('Client disconnected:', reason);
        isReady = false;
        io.emit('disconnected', reason);
        io.emit('status', { status: 'disconnected', message: 'Disconnected from WhatsApp' });
    });

    client.initialize();
}

// API Routes

// Get status
app.get('/api/status', (req, res) => {
    res.json({
        isReady,
        qrCode: qrCodeData,
        clientInfo
    });
});

// Get chats
app.get('/api/chats', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }
        
        const chats = await client.getChats();
        const chatList = await Promise.all(chats.map(async (chat) => {
            const contact = await chat.getContact();
            const lastMessage = chat.lastMessage;
            
            return {
                id: chat.id._serialized,
                name: chat.name || contact.pushname || contact.number,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
                lastMessage: lastMessage ? {
                    body: lastMessage.body,
                    timestamp: lastMessage.timestamp,
                    fromMe: lastMessage.fromMe
                } : null,
                profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
            };
        }));
        
        chatList.sort((a, b) => b.timestamp - a.timestamp);
        res.json(chatList);
    } catch (err) {
        console.error('Error getting chats:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get messages from a chat
app.get('/api/messages/:chatId', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }
        
        const chat = await client.getChatById(req.params.chatId);
        const messages = await chat.fetchMessages({ limit: 50 });
        
        const messageList = await Promise.all(messages.map(async (msg) => {
            const contact = await msg.getContact();
            
            const messageData = {
                id: msg.id._serialized,
                body: msg.body,
                from: msg.from,
                to: msg.to,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                hasMedia: msg.hasMedia,
                type: msg.type,
                author: msg.author,
                senderName: contact.pushname || contact.number || 'Unknown',
                ack: msg.ack
            };
            
            if (msg.hasMedia && msg.type === 'image') {
                try {
                    const media = await msg.downloadMedia();
                    messageData.media = {
                        mimetype: media.mimetype,
                        data: media.data,
                        filename: media.filename
                    };
                } catch (err) {
                    console.error('Error downloading media:', err);
                }
            }
            
            return messageData;
        }));
        
        res.json(messageList);
    } catch (err) {
        console.error('Error getting messages:', err);
        res.status(500).json({ error: err.message });
    }
});

// Send message
app.post('/api/send-message', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }
        
        const { chatId, message } = req.body;
        
        if (!chatId || !message) {
            return res.status(400).json({ error: 'chatId and message are required' });
        }
        
        const chat = await client.getChatById(chatId);
        const sentMsg = await chat.sendMessage(message);
        
        res.json({
            success: true,
            messageId: sentMsg.id._serialized
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark chat as read
app.post('/api/mark-read/:chatId', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }
        
        const chat = await client.getChatById(req.params.chatId);
        await chat.sendSeen();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking as read:', err);
        res.status(500).json({ error: err.message });
    }
});

// Search messages
app.get('/api/search', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }
        
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'query parameter is required' });
        }
        
        const searchResults = await client.searchMessages(query, { limit: 50 });
        
        const results = searchResults.map(msg => ({
            id: msg.id._serialized,
            body: msg.body,
            from: msg.from,
            timestamp: msg.timestamp,
            fromMe: msg.fromMe
        }));
        
        res.json(results);
    } catch (err) {
        console.error('Error searching:', err);
        res.status(500).json({ error: err.message });
    }
});

// Logout
app.post('/api/logout', async (req, res) => {
    try {
        if (client) {
            await client.logout();
            isReady = false;
            clientInfo = null;
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'No active client' });
        }
    } catch (err) {
        console.error('Error logging out:', err);
        res.status(500).json({ error: err.message });
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Send current status
    socket.emit('status', {
        isReady,
        qrCode: qrCodeData,
        clientInfo
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    initializeClient();
});
