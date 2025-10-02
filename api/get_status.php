<?php
require_once 'config.php';

// Get system status
$status = [
    'isReady' => true,
    'qrCode' => null,
    'clientInfo' => [
        'pushname' => 'WhatsApp Web (PHP)',
        'wid' => 'demo_user',
        'platform' => 'PHP'
    ]
];

sendJson($status);
