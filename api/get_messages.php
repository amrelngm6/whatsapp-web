<?php
require_once 'config.php';

// Get chat ID from query parameter
$chatId = $_GET['chatId'] ?? null;

if (!$chatId) {
    sendError('chatId parameter is required');
}

// Get all messages
$allMessages = readJsonFile(MESSAGES_FILE);

// Filter messages for this chat
$chatMessages = array_filter($allMessages, function($msg) use ($chatId) {
    return ($msg['chatId'] ?? '') === $chatId;
});

// Convert to indexed array and sort by timestamp
$chatMessages = array_values($chatMessages);
usort($chatMessages, function($a, $b) {
    return ($a['timestamp'] ?? 0) - ($b['timestamp'] ?? 0);
});

sendJson($chatMessages);
