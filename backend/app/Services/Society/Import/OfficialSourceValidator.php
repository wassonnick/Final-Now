<?php

namespace App\Services\Society\Import;

use Illuminate\Support\Str;

/**
 * Decides whether a URL is genuinely the developer's own, or a portal wearing the
 * developer's name.
 *
 * A blocklist alone cannot answer this: aggregators spin up project microsites on
 * unknown domains that look official and rank well. So the decisive test is positive —
 * does the registrable domain actually contain the builder's or the society's name?
 * "dlf.in" for DLF Limited passes; "dlf-privana-north-gurgaon.in" run by a broker does
 * not, because the domain has to match the *builder*, not the project marketing.
 *
 * Anything unrecognised is "unverified", never "official". Unverified sources stay
 * available for an admin to use deliberately; they simply do not feed automated
 * harvesting.
 */
class OfficialSourceValidator
{
    public const OFFICIAL = 'official';
    public const UNVERIFIED = 'unverified';
    public const BLOCKED = 'blocked';

    /** Listing portals, brokers, social and shorteners — never an official source. */
    private const BLOCKED_HOSTS = [
        '99acres', 'magicbricks', 'housing.com', 'nobroker', 'squareyards', 'commonfloor',
        'makaan', 'proptiger', 'realestateindia', 'indiaproperty', 'roofandfloor',
        'quikr', 'olx.', 'sulekha', 'justdial', 'propertywala', 'homeonline',
        'squareyards', 'investoxpert', 'propertypistol', 'zricks', 'realtynmore',
        'youtube.', 'facebook.', 'instagram.', 'pinterest.', 'twitter.', 'x.com',
        'linkedin.', 'wikipedia.', 'blogspot.', 'wordpress.com', 'medium.com',
        'bit.ly', 'tinyurl', 'lnkd.in', 'google.com', 'goo.gl',
    ];

    /** Corporate suffixes that carry no identity and must not be matched on. */
    private const NOISE_TOKENS = [
        'ltd', 'limited', 'pvt', 'private', 'llp', 'inc', 'company', 'co',
        'group', 'groups', 'developers', 'developer', 'builders', 'builder',
        'infra', 'infratech', 'infrastructure', 'projects', 'project',
        'realty', 'realtors', 'estates', 'estate', 'properties', 'property',
        'india', 'homes', 'housing', 'construction', 'constructions', 'land',
        'the', 'and',
    ];

    public function verdict(?string $url, ?string $builder = null, ?string $societyName = null): string
    {
        $host = $this->host($url);
        if ($host === '') {
            return self::UNVERIFIED;
        }

        foreach (self::BLOCKED_HOSTS as $blocked) {
            if (str_contains($host, $blocked)) {
                return self::BLOCKED;
            }
        }

        $domain = $this->organisationLabel($host);
        if ($domain === '') {
            return self::UNVERIFIED;
        }

        $builderTokens = $this->identityTokens($builder);

        // Multi-word developers register the whole name: "Signature Global" owns
        // signatureglobal.in, "Ansal API" owns ansalapi.com. Test the joined identity as
        // well as each token, or those read as impostors.
        foreach ($this->candidateIdentities($builderTokens) as $identity) {
            if ($this->domainIsOwnedBy($domain, $identity)) {
                return self::OFFICIAL;
            }
        }

        // Some developers publish a flagship on its own domain (thecamellias.com). Accept
        // that only when the society's own name is distinctive enough to stand as evidence.
        foreach ($this->candidateIdentities($this->identityTokens($societyName)) as $identity) {
            if (mb_strlen($identity) >= 6 && $this->domainIsOwnedBy($domain, $identity)) {
                return self::OFFICIAL;
            }
        }

        return self::UNVERIFIED;
    }

    public function isOfficial(?string $url, ?string $builder = null, ?string $societyName = null): bool
    {
        return $this->verdict($url, $builder, $societyName) === self::OFFICIAL;
    }

    private function host(?string $url): string
    {
        $host = strtolower((string) parse_url(trim((string) $url), PHP_URL_HOST));

        return Str::of($host)->replaceFirst('www.', '')->toString();
    }

    /**
     * The organisation's own label, ignoring any project subdomain.
     * "camellias.dlf.in" -> "dlf"   |   "dlf-privana-north-gurgaon.in" -> "dlfprivananorthgurgaon"
     *
     * Taking the last label before the public suffix is what separates a project page
     * hosted on the developer's domain from a lookalike domain registered by someone else.
     */
    private function organisationLabel(string $host): string
    {
        $host = preg_replace('/\.(co|com|net|org|gov|edu)\.[a-z]{2}$/', '', $host) ?? $host;
        $host = preg_replace('/\.[a-z]{2,}$/', '', $host) ?? $host;

        $labels = array_values(array_filter(explode('.', $host)));
        $organisation = $labels ? end($labels) : '';

        return preg_replace('/[^a-z0-9]/', '', $organisation) ?? '';
    }

    /**
     * True when the domain *is* this identity rather than merely containing it.
     *
     * "dlf" owns dlf / dlfindia / dlfhomes — the leftover is corporate noise. It does not
     * own dlfprivananorthgurgaon, where the leftover is project and location marketing:
     * that is the shape of a broker microsite trading on the developer's name.
     */
    private function domainIsOwnedBy(string $domain, string $token): bool
    {
        $domain = $this->peelNoise($domain, true);

        if ($domain === $token) {
            return true;
        }

        if (! str_starts_with($domain, $token)) {
            return false;
        }

        $remainder = substr($domain, strlen($token));

        return $this->peelNoise($remainder, false) === '';
    }

    /**
     * Strip corporate filler from the front of a domain fragment. Only whole known words
     * are removed, so project and location words such as "privana" or "gurgaon" survive
     * and correctly disqualify a lookalike domain.
     */
    private function peelNoise(string $value, bool $keepIfEmptied): string
    {
        $original = $value;
        $peeling = true;

        while ($peeling && $value !== '') {
            $peeling = false;
            foreach (self::NOISE_TOKENS as $noise) {
                if (mb_strlen($noise) >= 3 && str_starts_with($value, $noise)) {
                    $value = substr($value, strlen($noise));
                    $peeling = true;
                    break;
                }
            }
        }

        // Peeling a domain down to nothing means it was entirely filler; keep the original.
        return ($keepIfEmptied && $value === '') ? $original : $value;
    }

    /**
     * @param  array<int,string>  $tokens
     * @return array<int,string>
     */
    private function candidateIdentities(array $tokens): array
    {
        if ($tokens === []) {
            return [];
        }

        $identities = $tokens;
        if (count($tokens) > 1) {
            array_unshift($identities, implode('', $tokens));
        }

        return array_values(array_unique($identities));
    }

    /** @return array<int,string> */
    private function identityTokens(?string $name): array
    {
        return collect(preg_split('/[^a-z0-9]+/', strtolower(trim((string) $name))) ?: [])
            ->filter(fn ($token) => $token !== '' && mb_strlen($token) >= 3)
            ->reject(fn ($token) => in_array($token, self::NOISE_TOKENS, true))
            ->unique()
            ->values()
            ->all();
    }
}
