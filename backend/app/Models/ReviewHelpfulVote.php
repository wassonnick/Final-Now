<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewHelpfulVote extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'review_helpful_votes';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['review_id', 'account_id', 'is_helpful'];

    protected $casts = ['is_helpful' => 'boolean'];

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }
}
