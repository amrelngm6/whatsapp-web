<?php
require_once 'config.php';

// Initialize with demo data for testing

// Demo chats
$demoChats = [
    [
        'id' => 'chat_1',
        'name' => 'John Doe',
        'isGroup' => false,
        'unreadCount' => 2,
        'timestamp' => time() - 3600,
        'lastMessage' => [
            'body' => 'Hey, how are you?',
            'timestamp' => time() - 3600,
            'fromMe' => false
        ],
        'profilePicUrl' => null
    ],
    [
        'id' => 'chat_2',
        'name' => 'Project Team',
        'isGroup' => true,
        'unreadCount' => 0,
        'timestamp' => time() - 7200,
        'lastMessage' => [
            'body' => 'Meeting at 3 PM',
            'timestamp' => time() - 7200,
            'fromMe' => true
        ],
        'profilePicUrl' => null
    ],
    [
        'id' => 'chat_3',
        'name' => 'Alice Smith',
        'isGroup' => false,
        'unreadCount' => 0,
        'timestamp' => time() - 86400,
        'lastMessage' => [
            'body' => 'Thanks for the help!',
            'timestamp' => time() - 86400,
            'fromMe' => false
        ],
        'profilePicUrl' => null
    ]
];

// Demo messages
$demoMessages = [
    [
        'id' => 'msg_1',
        'chatId' => 'chat_1',
        'body' => 'Hi John!',
        'fromMe' => true,
        'timestamp' => time() - 7200,
        'ack' => 3,
        'type' => 'text',
        'hasMedia' => false
    ],
    [
        'id' => 'msg_2',
        'chatId' => 'chat_1',
        'body' => 'Hey, how are you?',
        'fromMe' => false,
        'timestamp' => time() - 3600,
        'ack' => 0,
        'type' => 'text',
        'hasMedia' => false,
        'senderName' => 'John Doe'
    ],
    [
        'id' => 'msg_3',
        'chatId' => 'chat_1',
        'body' => 'Need your help with something',
        'fromMe' => false,
        'timestamp' => time() - 3500,
        'ack' => 0,
        'type' => 'text',
        'hasMedia' => false,
        'senderName' => 'John Doe'
    ],
    [
        'id' => 'msg_4',
        'chatId' => 'chat_2',
        'body' => 'Hello team!',
        'fromMe' => false,
        'timestamp' => time() - 10800,
        'ack' => 0,
        'type' => 'text',
        'hasMedia' => false,
        'senderName' => 'Bob Johnson'
    ],
    [
        'id' => 'msg_5',
        'chatId' => 'chat_2',
        'body' => 'Meeting at 3 PM',
        'fromMe' => true,
        'timestamp' => time() - 7200,
        'ack' => 2,
        'type' => 'text',
        'hasMedia' => false
    ]
];

// Save demo data
writeJsonFile(CHATS_FILE, $demoChats);
writeJsonFile(MESSAGES_FILE, $demoMessages);

sendJson([
    'success' => true,
    'message' => 'Demo data initialized',
    'chats' => count($demoChats),
    'messages' => count($demoMessages)
]);
