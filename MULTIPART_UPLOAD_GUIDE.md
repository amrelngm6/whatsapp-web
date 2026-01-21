# WhatsApp Media Upload - Multipart Guide

## Benefits of Multipart Upload (Without Base64)

1. **More Efficient**: No base64 encoding overhead (~33% smaller payload)
2. **Faster**: Direct binary transfer
3. **Less Memory**: No need to hold entire base64 string in memory
4. **Better for Large Files**: Handles large media files better

---

## Setup Instructions

### Step 1: Install Multer in Node.js Server

```bash
cd c:\xampp\htdocs\workplace\whatsapp-js
npm install multer
```

### Step 2: Update server.js

Replace your current `/api/send-media` endpoint with the multipart version:

```javascript
const express = require('express');
const multer = require('multer'); // ADD THIS
// ... other imports

// Configure multer for file uploads - ADD THIS AFTER OTHER MIDDLEWARE
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ... existing code ...

// REPLACE the existing /api/send-media endpoint with this:
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
```

### Step 3: Laravel Service (Already Updated)

The `WhatsAppJSService.php` has been updated to use `Http::attach()` for multipart uploads:

```php
$response = Http::timeout($this->timeout)
    ->attach('file', $fileContent, $originalFilename)
    ->post("{$serverUrl}/api/send-media", [
        'client_id' => $clientId,
        'chatId' => $formattedTo,
        'to' => $formattedTo,
        'caption' => $caption,
        'mimetype' => $mimeType
    ]);
```

---

## Alternative: Keep Both Methods (Backwards Compatible)

If you want to support both base64 JSON and multipart uploads:

```javascript
// Method 1: Multipart (New - More Efficient)
app.post('/api/send-media', upload.single('file'), async (req, res) => {
    // ... multipart code above
});

// Method 2: JSON with Base64 (Legacy - Keep for compatibility)
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
```

---

## Testing

### 1. Start the Node.js server:
```bash
cd c:\xampp\htdocs\workplace\whatsapp-js
node server.js
```

### 2. Test from Laravel:
The controller already sends the file correctly:
```php
$message = $this->jsService->sendMediaMessage(
    $conversation->account,
    $conversation->contact->phone_number,
    $request->file('media'),  // UploadedFile instance
    $request->get('message', '')
);
```

### 3. Test with cURL (optional):
```bash
curl -X POST http://127.0.0.1:3002/api/send-media \
  -F "file=@/path/to/image.jpg" \
  -F "chatId=1234567890@c.us" \
  -F "caption=Test message" \
  -F "client_id=client-one"
```

---

## Comparison

### Before (Base64 in JSON):
```
File: 1MB → Base64: ~1.33MB → JSON Payload: ~1.35MB
```

### After (Multipart):
```
File: 1MB → Multipart Payload: ~1.01MB (with headers)
```

**Savings**: ~25-30% smaller payloads, faster processing

---

## Troubleshooting

### Error: "Multer is not defined"
```bash
npm install multer
```

### Error: "File too large"
Increase the limit in multer config:
```javascript
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});
```

### Error: "Cannot read property 'buffer' of undefined"
Make sure the field name matches: `upload.single('file')` matches `Http::attach('file', ...)`

---

## Summary

1. ✅ Install multer: `npm install multer`
2. ✅ Update server.js with the multipart endpoint
3. ✅ Laravel service already updated to use `Http::attach()`
4. ✅ Test the upload
5. ✅ Enjoy faster, more efficient file uploads!
