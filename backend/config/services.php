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

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => env('OPENAI_MODEL', 'gpt-5.4-mini'),
        'image_model' => env('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
        'processing_mode' => env('OPENAI_PROCESSING_MODE', 'standard'),
    ],

    'search_console' => [
        'site_url' => env('GOOGLE_SEARCH_CONSOLE_SITE_URL', 'https://www.societyflats.com'),
        'access_token' => env('GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN'),
        'client_id' => env('GOOGLE_SEARCH_CONSOLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET'),
        'refresh_token' => env('GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN'),
    ],

    'social_oauth' => [
        'redirect_uri' => env('SOCIAL_OAUTH_REDIRECT_URI', rtrim(env('APP_URL', 'https://final-now.onrender.com'), '/').'/api/admin/social/oauth/callback'),
        'meta_client_id' => env('META_CLIENT_ID'),
        'meta_client_secret' => env('META_CLIENT_SECRET'),
        'meta_connect_scopes' => env('META_CONNECT_SCOPES', 'public_profile,pages_show_list,pages_read_engagement'),
        'meta_publish_scopes' => env('META_PUBLISH_SCOPES', 'pages_manage_posts,pages_manage_engagement,instagram_basic,instagram_content_publish'),
        'linkedin_client_id' => env('LINKEDIN_CLIENT_ID'),
        'linkedin_client_secret' => env('LINKEDIN_CLIENT_SECRET'),
        'google_client_id' => env('GOOGLE_BUSINESS_CLIENT_ID', env('GOOGLE_SEARCH_CONSOLE_CLIENT_ID')),
        'google_client_secret' => env('GOOGLE_BUSINESS_CLIENT_SECRET', env('GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET')),
    ],

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

    // Claude by default: no daily quota (unlike Gemini's 20/day free tier, which silently
    // degrades imports to Google-Places-only drafts once exhausted) and grounded web search
    // stays on reliably, so single/bulk/spreadsheet imports and re-enrichment actually research
    // each society instead of guessing from training data. Requires ANTHROPIC_API_KEY.
    'ai_import_provider' => env('AI_IMPORT_PROVIDER', 'claude'),

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),
        // Live Google Search grounding for imports. Off by default: the grounded call is the
        // slow path (it times out from some hosts) and Google Places already supplies the
        // authoritative facts, so the non-grounded call fills the soft fields far more
        // reliably. Set GEMINI_IMPORT_GROUNDING=true to re-enable cited market research.
        'import_grounding' => env('GEMINI_IMPORT_GROUNDING', false),
    ],

    'ops' => [
        // Admin operations automation (Action Inbox, scheduled jobs).
        'sitemap_url' => env('OPS_SITEMAP_URL', 'https://www.societyflats.com/sitemap.xml'),
        'public_api_url' => env('OPS_PUBLIC_API_URL', 'https://final-now.onrender.com/api'),
        // Daily cap on unattended AI calls (scheduled jobs only, not admin actions).
        'ai_daily_call_cap' => env('OPS_AI_DAILY_CALL_CAP', 150),
    ],

    'claude' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
        'model' => env('ANTHROPIC_MODEL', 'claude-haiku-4-5'),
        // Market pricing must match 99acres/Housing/MagicBricks exactly, so the market
        // researcher runs on a stronger reasoning model that synthesises portal listings
        // and config-spanning price ranges more reliably than Haiku. Low volume (<=66/day)
        // keeps the cost negligible.
        'market_model' => env('ANTHROPIC_MARKET_MODEL', 'claude-sonnet-4-6'),
        // Conversational assistant model. Haiku is fast and cheap for chat and handles the
        // society-search tool well; bump to a stronger model via env if you want deeper reasoning.
        'assistant_model' => env('ANTHROPIC_ASSISTANT_MODEL', 'claude-haiku-4-5'),
        // Social draft generation model (SM1A). Haiku default keeps daily autopilot cheap.
        'social_model' => env('ANTHROPIC_SOCIAL_MODEL', 'claude-haiku-4-5'),
        // Claude API has no free daily quota (unlike Gemini's 20/day), so grounded web search
        // can stay on by default — cost is roughly $0.02-0.03 per society.
        'import_grounding' => env('ANTHROPIC_IMPORT_GROUNDING', true),
    ],

];
