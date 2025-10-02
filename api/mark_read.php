<?php
require_once 'config.php';

// Get chat ID from POST data
$data = getPostData();
$chatId = $data['chatId'] ?? null;

if (!$chatId) {
    sendError('chatId is required');
}

// Load chats
$chats = readJsonFile(CHATS_FILE);

// Update unread count for the chat
foreach ($chats as &$chat) {
    if ($chat['id'] === $chatId) {
        $chat['unreadCount'] = 0;
        break;
    }
}

// Save chats
writeJsonFile(CHATS_FILE, $chats);

sendJson(['success' => true]);
