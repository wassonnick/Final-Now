<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Lead;
use App\Models\Property;
use App\Support\AccountRole;
use App\Support\AccountStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminAccountController extends Controller
{
    /**
     * End every session on an account without changing what it is allowed to do.
     *
     * Blocking is the answer when someone should not be back; this is the answer when a
     * device was lost and the person still wants their account. Until sessions existed
     * there was no way to do either — a token stayed valid for ever.
     */
    public function signOutEverywhere(Request $request, Account $account): JsonResponse
    {
        $revoked = $account->sessions()->active()->update(['revoked_at' => now()]);

        $account->forceFill(['meta' => array_merge($account->meta ?: [], [
            'sessions_revoked_at' => now()->toISOString(),
            'sessions_revoked_by' => $this->adminActor($request),
            'sessions_revoked_count' => $revoked,
        ])])->save();

        return response()->json([
            'message' => $revoked === 1 ? '1 device signed out.' : "{$revoked} devices signed out.",
            'account' => $this->accountPayload($account->fresh()),
        ]);
    }

    /** Who is doing this, for the trail left on the account. */
    private function adminActor(Request $request): string
    {
        return (string) ($request->header('X-Admin-Email') ?: 'admin');
    }

    /**
     * "This column's digits end with this phone number", on whichever database we are on.
     *
     * regexp_replace with a 'g' flag is Postgres-only, and it was written inline three
     * times. Production is Postgres and the test database is SQLite, which is why nothing
     * in this controller could be covered — every admin account response ran through it and
     * died on the way. Elsewhere the digits are compared directly, which is right whenever
     * the stored number carries no separators and is the common case here.
     */
    private function whereDigitsEndWith($query, string $column, string $phone)
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            return $query->whereRaw("regexp_replace({$column}, '[^0-9]', '', 'g') LIKE ?", ['%'.$phone]);
        }

        return $query->where($column, 'like', '%'.$phone);
    }

    private function normalizePhone($value): string
    {
        return substr(preg_replace('/\D+/', '', (string) $value), -10);
    }

    private function accountPayload(Account $account, bool $withRelated = false): array
    {
        $phone = $this->normalizePhone($account->phone_normalized ?: $account->phone);

        $payload = [
            'id' => $account->id,
            'role' => $account->role,
            'phone' => $account->phone,
            'phone_normalized' => $account->phone_normalized,
            'name' => $account->name,
            'email' => $account->email,
            'status' => $account->status,
            'last_login_at' => optional($account->last_login_at)->toISOString(),
            'phone_verified_at' => optional($account->phone_verified_at)->toISOString(),
            'meta' => $account->meta,
            'created_at' => optional($account->created_at)->toISOString(),
            'updated_at' => optional($account->updated_at)->toISOString(),
            'active_sessions' => $account->sessions()->active()->count(),
            'last_seen_at' => optional($account->sessions()->active()->max('last_used_at'))
                ? Carbon::parse($account->sessions()->active()->max('last_used_at'))->toISOString()
                : null,
        ];

        $payload['related_counts'] = [
            'leads' => $this->relatedLeadsQuery($phone)->count(),
            'properties' => $this->relatedPropertiesQuery($phone)->count(),
        ];

        if ($withRelated) {
            $payload['related_leads'] = $this->relatedLeadsQuery($phone)
                ->limit(20)
                ->get()
                ->map(fn (Lead $lead) => $this->leadPayload($lead))
                ->values();

            $payload['related_properties'] = $this->relatedPropertiesQuery($phone)
                ->limit(20)
                ->get()
                ->map(fn (Property $property) => $this->propertyPayload($property))
                ->values();
        }

        return $payload;
    }

    private function relatedLeadsQuery(string $phone)
    {
        return Lead::query()
            ->with(['property.society', 'society', 'linkedProperties'])
            ->where(fn ($query) => $this->whereDigitsEndWith($query, 'phone', $phone))
            ->latest();
    }

    private function relatedPropertiesQuery(string $phone)
    {
        return Property::query()
            ->with(['society', 'sourceLead'])
            ->where(function ($query) use ($phone) {
                $this->whereDigitsEndWith($query, 'owner_phone', $phone)
                    ->orWhereHas('sourceLead', function ($leadQuery) use ($phone) {
                        $this->whereDigitsEndWith($leadQuery, 'phone', $phone);
                    });
            })
            ->latest();
    }

    private function leadPayload(Lead $lead): array
    {
        return [
            'id' => $lead->id,
            'name' => $lead->name,
            'phone' => $lead->phone,
            'email' => $lead->email,
            'source' => $lead->source,
            'status' => $lead->status,
            'priority' => $lead->priority,
            'requirement' => $lead->requirement,
            'budget' => $lead->budget,
            'society_name' => $lead->society_name ?: optional($lead->society)->name ?: optional(optional($lead->property)->society)->name,
            'property_title' => $lead->property_title ?: optional($lead->property)->title,
            'created_at' => optional($lead->created_at)->toISOString(),
            'linked_properties_count' => $lead->linkedProperties ? $lead->linkedProperties->count() : 0,
        ];
    }

    private function propertyPayload(Property $property): array
    {
        return [
            'id' => $property->id,
            'title' => $property->title,
            'slug' => $property->slug,
            'status' => $property->status,
            'listing_type' => $property->listing_type,
            'society_name' => optional($property->society)->name ?: $property->society,
            'owner_name' => $property->owner_name,
            'owner_phone' => $property->owner_phone,
            'source_lead_id' => $property->source_lead_id,
            'created_at' => optional($property->created_at)->toISOString(),
            'updated_at' => optional($property->updated_at)->toISOString(),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $query = Account::query()->latest();

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) $request->query('q'))) {
            $query->where(function ($q) use ($search) {
                $driver = config('database.default');
                $operator = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';

                $q->where('name', $operator, "%{$search}%")
                    ->orWhere('phone', $operator, "%{$search}%")
                    ->orWhere('phone_normalized', $operator, "%{$search}%")
                    ->orWhere('email', $operator, "%{$search}%")
                    ->orWhere('role', $operator, "%{$search}%")
                    ->orWhere('status', $operator, "%{$search}%");
            });
        }

        $perPage = max(1, min((int) $request->query('per_page', 50), 100));
        $withRelated = filter_var($request->query('with_related', false), FILTER_VALIDATE_BOOLEAN);

        $accounts = $query->paginate($perPage);

        return response()->json([
            'data' => $accounts->getCollection()
                ->map(fn (Account $account) => $this->accountPayload($account, $withRelated))
                ->values(),
            'meta' => [
                'current_page' => $accounts->currentPage(),
                'last_page' => $accounts->lastPage(),
                'per_page' => $accounts->perPage(),
                'total' => $accounts->total(),
            ],
        ]);
    }

    public function show(Account $account): JsonResponse
    {
        return response()->json([
            'account' => $this->accountPayload($account, true),
        ]);
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        $validated = $request->validate([
            // RWA was missing from this list, so an admin could not set that role — and
            // editing an existing RWA member's name failed validation on their own role.
            'role' => ['nullable', Rule::in(AccountRole::signupRoles())],
            'status' => ['nullable', Rule::in(AccountStatus::all())],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'meta' => ['nullable', 'array'],
        ]);

        $payload = [];

        foreach (['role', 'status', 'name', 'email'] as $field) {
            if (array_key_exists($field, $validated)) {
                $payload[$field] = $validated[$field];
            }
        }

        if (array_key_exists('meta', $validated)) {
            $payload['meta'] = array_merge($account->meta ?: [], $validated['meta'] ?: []);
        }

        $wasActive = AccountStatus::allowsSignIn($account->status);

        $account->update($payload);

        // Blocking someone has to end their sessions. The middleware would refuse them
        // anyway, but leaving live rows behind means the devices list still shows them
        // signed in, and un-blocking would silently restore access from a device the
        // person may no longer hold.
        if ($wasActive && ! AccountStatus::allowsSignIn($account->status)) {
            $revoked = $account->sessions()->active()->update(['revoked_at' => now()]);

            $account->forceFill(['meta' => array_merge($account->meta ?: [], [
                'blocked_at' => now()->toISOString(),
                'blocked_by' => $this->adminActor($request),
                'blocked_sessions_revoked' => $revoked,
            ])])->save();
        }

        return response()->json([
            'message' => 'Account updated.',
            'account' => $this->accountPayload($account->fresh(), true),
        ]);
    }
}
