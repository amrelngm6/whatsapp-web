<?php
require_once 'config.php';

// Get all chats
$chats = readJsonFile(CHATS_FILE);

// Sort by timestamp (newest first)
usort($chats, function($a, $b) {
    return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
});

sendJson($chats);
