<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when the AI provider signals a usage/credit/billing limit (HTTP 429/402 or a
 * matching error message) rather than a transient failure. Callers trip the shared
 * circuit-breaker on this so a bulk refresh stops cleanly at the credit line instead of
 * firing a failing call at every remaining society.
 */
class AiProviderLimitException extends RuntimeException
{
}
