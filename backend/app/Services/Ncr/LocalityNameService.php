<?php

namespace App\Services\Ncr;

use App\Models\City;
use Illuminate\Support\Str;

/**
 * What counts as a locality, and what a locality is called.
 *
 * The importer writes whatever the source called the area into `locality`, and sources are
 * inconsistent: "sec-36", "Sector-63A" and "Sector 36" are the same kind of thing spelt
 * three ways, while "Premium Gurgaon Corridor" and "Dwarka Expressway, Village Babupur"
 * are not localities at all — one is ad copy, the other an address.
 *
 * That mattered little while these were loose strings. It matters now that each one becomes
 * a published page: a thin duplicate page is worse for the catalogue than no page, because
 * it competes with the real locality for the same search.
 *
 * The rules are deliberately narrow. They correct spelling and reject things that are
 * obviously not places; they do not guess at whether an unfamiliar village name is real.
 */
class LocalityNameService
{
    /**
     * Words that mark a marketing phrase rather than a place.
     *
     * "Golf Course Extension Road" and "Dwarka Expressway" are real and must survive, so
     * this catches only vocabulary an estate agent uses and a map does not.
     */
    private const MARKETING_WORDS = [
        'premium', 'luxury', 'luxurious', 'posh', 'upscale', 'affordable',
        'corridor', 'micromarket', 'micro-market', 'prime', 'belt',
    ];

    /** Names that are a region or a city, never a locality within one. */
    private const NOT_A_PLACE = ['ncr', 'delhi ncr', 'india', 'haryana', 'uttar pradesh', 'north india'];

    /**
     * Spelling only — "sec-36" and "Sector 36" name the same sector, and one of them has to
     * win or the catalogue carries both as separate pages.
     */
    public function canonicalise(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');

        if ($name === '') {
            return '';
        }

        // sec-36 / Sect. 36 / Sector-63A → Sector 36 / Sector 63A
        if (preg_match('/^(sec|sect|sector)[\s\-.]*([0-9].*)$/i', $name, $m)) {
            $suffix = trim($m[2]);
            // A letter attached to a number is a sector sub-block: 63a → 63A.
            $suffix = preg_replace_callback('/(\d)([a-z])\b/i', fn ($x) => $x[1].strtoupper($x[2]), $suffix) ?? $suffix;

            return 'Sector '.$suffix;
        }

        // Title-case only what arrived entirely lowercase; anything with existing capitals
        // came in cased deliberately ("DLF Phase IV") and retitling would damage it.
        return $name === strtolower($name) ? Str::title($name) : $name;
    }

    public function slugFor(string $name): string
    {
        return Str::slug($this->canonicalise($name));
    }

    /**
     * Why this name should not become a locality page, or null if it is fine.
     *
     * Returns the reason rather than a boolean so the operator reading the dry run can tell
     * a judgement they disagree with from one they do not.
     */
    public function rejectionReason(string $name, ?string $city = null): ?string
    {
        $name = $this->canonicalise($name);
        $lower = strtolower($name);

        if ($name === '') {
            return 'empty';
        }

        if (str_contains($name, ',')) {
            return 'address, not a locality';
        }

        if (in_array($lower, self::NOT_A_PLACE, true)) {
            return 'a region, not a locality';
        }

        if ($this->namesTheCity($name, $city)) {
            return 'the city name, not a locality within it';
        }

        if (preg_match('/^(block|tower|phase|plot)\s+[a-z0-9]{1,3}$/i', $name)) {
            return 'a block within a project, not a locality';
        }

        foreach (self::MARKETING_WORDS as $word) {
            if (preg_match('/\b'.preg_quote($word, '/').'\b/i', $name)) {
                return 'marketing phrase ("'.$word.'")';
            }
        }

        return null;
    }

    /**
     * Gurgaon and Gurugram are the same city, and the catalogue uses both spellings, so a
     * string comparison against the society's own city field is not enough.
     */
    private function namesTheCity(string $name, ?string $city): bool
    {
        $slug = Str::slug($name);

        if (in_array($slug, ['gurgaon', 'gurugram'], true)) {
            return true;
        }

        if ($city !== null && $slug === Str::slug($city)) {
            return true;
        }

        // Cached: this is called once per locality in a loop over the whole catalogue.
        $this->citySlugs ??= City::query()->pluck('name')
            ->map(fn ($known) => Str::slug((string) $known))
            ->filter()
            ->all();

        return in_array($slug, $this->citySlugs, true);
    }

    /** @var list<string>|null */
    private ?array $citySlugs = null;
}
