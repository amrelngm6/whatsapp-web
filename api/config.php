<?php
// Configuration file for WhatsApp Chat API

// Set JSON content type header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Define paths
define('MESSAGES_FILE', __DIR__ . '/messages.json');
define('CHATS_FILE', __DIR__ . '/chats.json');
define('STATUS_FILE', __DIR__ . '/status.json');

// Helper function to read JSON file
function readJsonFile($file) {
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

// Helper function to write JSON file
function writeJsonFile($file, $data) {
    $dir = dirname($file);
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

// Helper function to send JSON response
function sendJson($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Helper function to send error response
function sendError($message, $statusCode = 400) {
    sendJson(['error' => $message], $statusCode);
}

// Get POST data
function getPostData() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?: [];
}
