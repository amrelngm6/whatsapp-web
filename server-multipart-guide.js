// Add this at the top with other requires
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// REPLACE the existing /api/send-media endpoint with this:

// Send Media Message - Multipart Upload Version (More Efficient)
app.post('/api/send-media', upload.single('file'), async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }

        const { chatId, caption, mimetype } = req.body;
        const file = req.file;

        if (!chatId) {
            return res.status(400).json({ error: 'chatId is required' });
        }

        if (!file) {
            return res.status(400).json({ error: 'file is required' });
        }

        const chat = await client.getChatById(chatId);
        
        // Convert buffer to base64 for MessageMedia
        const base64Data = file.buffer.toString('base64');
        const media = new MessageMedia(
            mimetype || file.mimetype, 
            base64Data, 
            file.originalname
        );
        
        const sentMsg = await chat.sendMessage(media, { caption: caption || '' });

        res.json({
            success: true,
            messageId: sentMsg.id._serialized
        });
    } catch (err) {
        console.error('Error sending media message:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// ALTERNATIVE: Keep backwards compatibility with both methods
app.post('/api/send-media-json', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'Client not ready' });
        }
        const { chatId, mediaData } = req.body;

        if (!chatId || !mediaData) {
            return res.status(400).json({ error: 'chatId and mediaData are required' });
        }   
        const chat = await client.getChatById(chatId);
        const media = new MessageMedia(mediaData.mimetype, mediaData.data, mediaData.filename);
        const sentMsg = await chat.sendMessage(media, { caption: mediaData.caption || '' });

        res.json({
            success: true,
            messageId: sentMsg.id._serialized
        });
    } catch (err) {
        console.error('Error sending media message:', err);
        res.status(500).json({ error: err.message });
    }
});
