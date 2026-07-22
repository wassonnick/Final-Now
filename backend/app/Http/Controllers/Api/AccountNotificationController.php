<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthenticatesAccount;
use App\Http\Controllers\Controller;
use App\Models\AccountDevice;
use App\Models\AccountNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountNotificationController extends Controller
{
    use AuthenticatesAccount;

    public function inbox(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return $this->unauthorized();
        }

        $notifications = AccountNotification::query()
            ->where('account_id', $account->id)
            ->latest()
            ->limit(min(max((int) $request->integer('limit', 30), 1), 100))
            ->get();

        return response()->json([
            'status' => 'ok',
            'data' => $notifications->map(fn (AccountNotification $notification) => $this->safeNotificationPayload($notification))->values(),
            'unread_count' => AccountNotification::where('account_id', $account->id)->where('status', 'unread')->count(),
        ]);
    }

    public function markRead(Request $request, AccountNotification $notification): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account || $notification->account_id !== $account->id) {
            return $this->unauthorized();
        }

        $notification->update([
            'status' => 'read',
            'read_at' => $notification->read_at ?: now(),
        ]);

        return response()->json([
            'status' => 'ok',
            'data' => $this->safeNotificationPayload($notification->fresh()),
            'unread_count' => AccountNotification::where('account_id', $account->id)->where('status', 'unread')->count(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return $this->unauthorized();
        }

        AccountNotification::query()
            ->where('account_id', $account->id)
            ->where('status', 'unread')
            ->update(['status' => 'read', 'read_at' => now()]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Notifications marked read.',
            'unread_count' => 0,
        ]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return $this->unauthorized();
        }

        $devices = AccountDevice::query()
            ->where('account_id', $account->id)
            ->whereNull('disabled_at')
            ->latest('last_registered_at')
            ->get();

        $latest = $devices->first();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'saved_search_alerts' => $latest?->saved_search_alerts ?? true,
                'site_visit_reminders' => $latest?->site_visit_reminders ?? true,
                'owner_listing_updates' => $latest?->owner_listing_updates ?? true,
                'quiet_hours_enabled' => $latest?->quiet_hours_enabled ?? false,
                'quiet_hours_start' => $latest?->quiet_hours_start,
                'quiet_hours_end' => $latest?->quiet_hours_end,
                'timezone' => $latest?->timezone,
                'registered_devices_count' => $devices->count(),
                'push_ready' => $devices->contains(fn (AccountDevice $device) => filled($device->expo_push_token)),
            ],
        ]);
    }

    public function upsertDevice(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return $this->unauthorized();
        }

        $validated = $request->validate([
            'device_id' => ['required', 'string', 'max:120'],
            'expo_push_token' => ['required', 'string', 'max:255', 'regex:/^ExponentPushToken\\[[A-Za-z0-9_-]+\\]$|^ExpoPushToken\\[[A-Za-z0-9_-]+\\]$/'],
            'platform' => ['nullable', 'string', Rule::in(['ios', 'android', 'web', 'expo_go', 'unknown'])],
            'preferences' => ['nullable', 'array'],
            'preferences.saved_search_alerts' => ['sometimes', 'boolean'],
            'preferences.site_visit_reminders' => ['sometimes', 'boolean'],
            'preferences.owner_listing_updates' => ['sometimes', 'boolean'],
            'preferences.quiet_hours_enabled' => ['sometimes', 'boolean'],
            'preferences.quiet_hours_start' => ['nullable', 'date_format:H:i'],
            'preferences.quiet_hours_end' => ['nullable', 'date_format:H:i'],
            'preferences.timezone' => ['nullable', 'timezone'],
            'app_version' => ['nullable', 'string', 'max:80'],
        ]);

        $device = AccountDevice::query()->updateOrCreate(
            [
                'account_id' => $account->id,
                'device_id' => $validated['device_id'],
            ],
            [
                'platform' => $validated['platform'] ?? 'unknown',
                'expo_push_token' => $validated['expo_push_token'],
                'saved_search_alerts' => data_get($validated, 'preferences.saved_search_alerts', true),
                'site_visit_reminders' => data_get($validated, 'preferences.site_visit_reminders', true),
                'owner_listing_updates' => data_get($validated, 'preferences.owner_listing_updates', true),
                'quiet_hours_enabled' => data_get($validated, 'preferences.quiet_hours_enabled', false),
                'quiet_hours_start' => data_get($validated, 'preferences.quiet_hours_start'),
                'quiet_hours_end' => data_get($validated, 'preferences.quiet_hours_end'),
                'timezone' => data_get($validated, 'preferences.timezone'),
                'last_registered_at' => now(),
                'disabled_at' => null,
                'meta' => [
                    'app_version' => $validated['app_version'] ?? null,
                    'source' => 'societyflats_mobile',
                ],
            ]
        );

        return response()->json([
            'message' => 'Device notification preferences saved.',
            'data' => $this->safeDevicePayload($device->fresh()),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return $this->unauthorized();
        }

        $validated = $request->validate([
            'saved_search_alerts' => ['sometimes', 'boolean'],
            'site_visit_reminders' => ['sometimes', 'boolean'],
            'owner_listing_updates' => ['sometimes', 'boolean'],
            'quiet_hours_enabled' => ['sometimes', 'boolean'],
            'quiet_hours_start' => ['nullable', 'date_format:H:i'],
            'quiet_hours_end' => ['nullable', 'date_format:H:i'],
            'timezone' => ['nullable', 'timezone'],
        ]);

        AccountDevice::query()
            ->where('account_id', $account->id)
            ->whereNull('disabled_at')
            ->update($validated);

        return $this->preferences($request);
    }

    public function destroyDevice(Request $request, string $deviceId): JsonResponse
    {
        $account = $this->accountFromBearer($request);
        if (! $account) {
            return $this->unauthorized();
        }

        AccountDevice::query()
            ->where('account_id', $account->id)
            ->where('device_id', $deviceId)
            ->update(['disabled_at' => now()]);

        return response()->json(['message' => 'Device notifications disabled.']);
    }

    private function safeDevicePayload(AccountDevice $device): array
    {
        return [
            'id' => $device->id,
            'device_id' => $device->device_id,
            'platform' => $device->platform,
            'saved_search_alerts' => $device->saved_search_alerts,
            'site_visit_reminders' => $device->site_visit_reminders,
            'owner_listing_updates' => $device->owner_listing_updates,
            'quiet_hours_enabled' => $device->quiet_hours_enabled,
            'quiet_hours_start' => $device->quiet_hours_start,
            'quiet_hours_end' => $device->quiet_hours_end,
            'timezone' => $device->timezone,
            'push_token_registered' => filled($device->expo_push_token),
            'last_registered_at' => optional($device->last_registered_at)->toISOString(),
            'disabled_at' => optional($device->disabled_at)->toISOString(),
        ];
    }

    private function safeNotificationPayload(AccountNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'event' => $notification->event,
            'title' => $notification->title,
            'body' => $notification->body,
            'status' => $notification->status,
            'data' => $notification->data ?: [],
            'read_at' => optional($notification->read_at)->toISOString(),
            'created_at' => optional($notification->created_at)->toISOString(),
        ];
    }

    private function unauthorized(): JsonResponse
    {
        return response()->json(['message' => 'Login with OTP to manage notification preferences.'], 401);
    }
}
