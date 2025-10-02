<?php
require_once 'config.php';

// Clear all data by writing empty arrays
writeJsonFile(CHATS_FILE, []);
writeJsonFile(MESSAGES_FILE, []);

sendJson([
    'success' => true,
    'message' => 'All data cleared successfully',
    'chats' => 0,
    'messages' => 0
]);
