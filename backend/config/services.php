<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'admin_api_token' => env('ADMIN_API_TOKEN'),
    'google_places_api_key' => env('GOOGLE_PLACES_API_KEY'),

    'lead_notifications' => [
        'enabled' => env('LEAD_NOTIFICATION_ENABLED', false),
        'webhook_url' => env('LEAD_NOTIFICATION_WEBHOOK_URL'),
        'webhook_token' => env('LEAD_NOTIFICATION_WEBHOOK_TOKEN'),
        'admin_base_url' => env('ADMIN_FRONTEND_URL', 'https://societyflats.com'),
        'frontend_url' => env('FRONTEND_URL', 'https://societyflats.com'),
    ],

    'saved_search_alerts' => [
        'enabled' => env('SAVED_SEARCH_ALERT_ENABLED', false),
        'webhook_url' => env('SAVED_SEARCH_ALERT_WEBHOOK_URL'),
        'webhook_token' => env('SAVED_SEARCH_ALERT_WEBHOOK_TOKEN'),
        'frontend_url' => env('FRONTEND_URL', 'https://societyflats.com'),
    ],

    'otp' => [
        'enabled' => env('OTP_DELIVERY_ENABLED', false),
        'provider' => env('OTP_PROVIDER', 'log'),
        'webhook_url' => env('OTP_WEBHOOK_URL'),
        'webhook_token' => env('OTP_WEBHOOK_TOKEN'),

        'msg91_authkey' => env('MSG91_AUTHKEY'),
        'msg91_template_id' => env('MSG91_OTP_TEMPLATE_ID'),
        'msg91_base_url' => env('MSG91_BASE_URL', 'https://control.msg91.com/api/v5'),
        'msg91_country_code' => env('MSG91_COUNTRY_CODE', '91'),
    ],

    'ai_import_provider' => env('AI_IMPORT_PROVIDER', 'gemini'),

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),
    ],

];
