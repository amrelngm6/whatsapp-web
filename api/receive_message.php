<?php
require_once 'config.php';

// This endpoint simulates receiving a message (for testing)
// In a real scenario, this would be called by a webhook or external service

// Get POST data
$data = getPostData();

$chatId = $data['chatId'] ?? null;
$message = $data['message'] ?? null;
$senderName = $data['senderName'] ?? 'Unknown';
$from = $data['from'] ?? null;

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
    'fromMe' => false,
    'from' => $from,
    'timestamp' => time(),
    'ack' => 0,
    'type' => 'text',
    'hasMedia' => false,
    'senderName' => $senderName
];

// Load existing messages
$messages = readJsonFile(MESSAGES_FILE);

// Add new message
$messages[] = $newMessage;

// Save messages
writeJsonFile(MESSAGES_FILE, $messages);

// Update chat last message and unread count
$chats = readJsonFile(CHATS_FILE);
$chatFound = false;

foreach ($chats as &$chat) {
    if ($chat['id'] === $chatId) {
        $chat['lastMessage'] = [
            'body' => $message,
            'timestamp' => time(),
            'fromMe' => false
        ];
        $chat['timestamp'] = time();
        $chat['unreadCount'] = ($chat['unreadCount'] ?? 0) + 1;
        $chatFound = true;
        break;
    }
}

if (!$chatFound) {
    // Create new chat if it doesn't exist
    $chats[] = [
        'id' => $chatId,
        'name' => $senderName,
        'isGroup' => false,
        'unreadCount' => 1,
        'timestamp' => time(),
        'lastMessage' => [
            'body' => $message,
            'timestamp' => time(),
            'fromMe' => false
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
