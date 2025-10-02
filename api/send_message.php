<?php
require_once 'config.php';

// Get POST data
$data = getPostData();

$chatId = $data['chatId'] ?? null;
$message = $data['message'] ?? null;

if (!$chatId || !$message) {
    sendError('chatId and message are required');
}

// Generate unique message ID
$messageId = 'msg_' . time() . '_' . uniqid();

// Create message object
$newMessage = [
    'id' => $messageId,
    'chatId' => $chatId,
    'body' => $message,
    'fromMe' => true,
    'timestamp' => time(),
    'ack' => 1, // sent
    'type' => 'text',
    'hasMedia' => false
];

// Load existing messages
$messages = readJsonFile(MESSAGES_FILE);

// Add new message
$messages[] = $newMessage;

// Save messages
writeJsonFile(MESSAGES_FILE, $messages);

// Update chat last message
$chats = readJsonFile(CHATS_FILE);
$chatFound = false;

foreach ($chats as &$chat) {
    if ($chat['id'] === $chatId) {
        $chat['lastMessage'] = [
            'body' => $message,
            'timestamp' => time(),
            'fromMe' => true
        ];
        $chat['timestamp'] = time();
        $chatFound = true;
        break;
    }
}

if (!$chatFound) {
    // Create new chat if it doesn't exist
    $chats[] = [
        'id' => $chatId,
        'name' => 'Unknown Chat',
        'isGroup' => false,
        'unreadCount' => 0,
        'timestamp' => time(),
        'lastMessage' => [
            'body' => $message,
            'timestamp' => time(),
            'fromMe' => true
        ]
    ];
}

// Save chats
writeJsonFile(CHATS_FILE, $chats);

// Return success response
sendJson([
    'success' => true,
    'messageId' => $messageId,
    'message' => $newMessage
]);
