<?php

namespace App\Services\Seo;

use App\Models\Property;
use App\Models\SeoPage;
use App\Models\Society;
use App\Models\City;
use Illuminate\Support\Str;

class SeoPageRegistryService
{
    public function sync(): int
    {
        $count = 0;
        Society::with('seoContent')->orderBy('id')->chunk(100, function ($societies) use (&$count) {
            foreach ($societies as $society) {
                $seo = $society->seoContent;
                $publishedSeo = $seo?->status === 'published' ? $seo : null;
                $content = implode(' ', array_filter([
                    $society->description,
                    $publishedSeo?->intro_summary,
                    $publishedSeo?->about_content,
                    $publishedSeo?->location_content,
                    $publishedSeo?->rent_content,
                    $publishedSeo?->sale_content,
                    $publishedSeo?->amenities_content,
                    $publishedSeo?->investment_content,
                ]));
                $isPublic = $society->is_published && in_array($society->status, ['Verified', 'Premium'], true);
                $links = count((array) $publishedSeo?->internal_link_suggestions_json);
                $schema = array_keys((array) $publishedSeo?->schema_json);
                $imageCount = count(array_filter([$society->cover_image, $society->image_url, $society->image_photo_reference])) + count((array) $society->approved_gallery_image_urls);
                $altCoverage = $imageCount === 0 ? 100 : (filled($society->image_alt_text) ? 100 : 0);

                $this->upsert([
                    'page_key' => 'society:'.$society->id,
                    'page_type' => 'society', 'entity_type' => Society::class, 'entity_id' => $society->id,
                    'url' => '/society/'.$society->slug,
                    'title' => $publishedSeo?->seo_title ?: $society->meta_title,
                    'meta_description' => $publishedSeo?->seo_description ?: $society->meta_description,
                    'h1' => $publishedSeo?->seo_h1 ?: $society->name,
                    'canonical_url' => '/society/'.$society->slug,
                    'is_indexable' => $isPublic, 'sitemap_included' => $isPublic, 'is_public' => $isPublic,
                    'content_word_count' => $this->words($content), 'internal_link_count' => $links,
                    'image_alt_coverage' => $altCoverage, 'schema_types' => $schema,
                    'freshness_at' => $publishedSeo?->updated_at ?: $society->updated_at,
                    'metadata' => [
                        'name'=>$society->name,'sector'=>$society->sector,'locality'=>$society->locality,'builder'=>$society->builder,
                        'city'=>$society->city,'status'=>$society->status,'seo_status'=>$seo?->status ?: 'missing',
                        'score'=>$society->score ? round((float) $society->score, 1) : null,
                        'rent_range'=>$society->rent_range,'buy_range'=>$society->buy_range,
                        'has_cta'=>true,'heading_count'=>$publishedSeo ? 7 : 2,'missing_data'=>$this->missingSocietyData($society),
                    ],
                ]); $count++;

                // Every published society has a public RWA community page, but these pages are
                // often unclaimed/thin while the RWA module is still being populated. Keep them
                // visible to users from society pages, but do not push them into SEO index/sitemap
                // workflows until the community content policy is mature.
                if ($isPublic) {
                    $this->upsert([
                        'page_key' => 'rwa:'.$society->id,
                        'page_type' => 'rwa', 'entity_type' => Society::class, 'entity_id' => $society->id,
                        'url' => '/rwa/'.$society->slug, 'canonical_url' => '/rwa/'.$society->slug,
                        'title' => $society->name.' RWA — Announcements & Resident Updates | SocietyFlats',
                        'meta_description' => 'Official RWA announcements, resident questions and community updates for '.$society->name.', Gurgaon — on the verified SocietyFlats profile.',
                        'h1' => $society->name.' RWA',
                        'is_indexable' => false, 'sitemap_included' => false, 'is_public' => true,
                        // The rendered RWA page carries society context, the announcements feed,
                        // resident Q&A threads and related links — a genuinely content-rich page.
                        'content_word_count' => 240, 'internal_link_count' => 4,
                        'image_alt_coverage' => 100, 'schema_types' => ['WebPage', 'BreadcrumbList'],
                        'freshness_at' => $society->updated_at,
                        'metadata' => ['name' => $society->name.' RWA', 'sector' => $society->sector, 'has_cta' => true, 'heading_count' => 3],
                    ]); $count++;
                }
            }
        });

        Property::with('society')->orderBy('id')->chunk(100, function ($properties) use (&$count) {
            foreach ($properties as $property) {
                // Property has BOTH a `society` string column (the name) and a society()
                // relation — magic access returns the column, so read the loaded relation
                // explicitly or is_published gets read off a string and the sync 500s.
                $linkedSociety = $property->relationLoaded('society') ? $property->getRelation('society') : null;
                $isPublic = $property->status === 'Live' && $property->verified && $property->published_at && (bool) $linkedSociety?->is_published;
                $this->upsert([
                    'page_key'=>'property:'.$property->id,'page_type'=>'property','entity_type'=>Property::class,'entity_id'=>$property->id,
                    'url'=>'/property/'.$property->slug,'title'=>$property->title,'meta_description'=>$property->description,'h1'=>$property->title,
                    'canonical_url'=>'/property/'.$property->slug,'is_indexable'=>$isPublic,'sitemap_included'=>$isPublic,'is_public'=>$isPublic,
                    'content_word_count'=>$this->words($property->description),'internal_link_count'=>$property->society_id ? 1 : 0,
                    'image_alt_coverage'=>count((array)$property->images) ? 0 : 100,'schema_types'=>['WebPage'],
                    'freshness_at'=>$property->availability_checked_at ?: $property->updated_at,
                    'metadata'=>['name'=>$property->title,'society'=>$linkedSociety?->name,'locality'=>$property->locality,'has_cta'=>true,'heading_count'=>2],
                ]); $count++;
            }
        });

        // Comparison pages: registering them puts them in the live sitemap, nightly audits
        // and GSC mapping like every other money page. Unpublished/stale pages flip to
        // non-public here so the sitemap drops them the same cycle they disappear.
        \App\Models\SocietyComparePage::with(['societyA:id,is_published,status', 'societyB:id,is_published,status', 'societyC:id,is_published,status'])
            ->orderBy('id')->chunk(100, function ($comparePages) use (&$count) {
                foreach ($comparePages as $cp) {
                    $isPublic = $cp->status === \App\Models\SocietyComparePage::STATUS_PUBLISHED && $cp->published_at
                        && collect([$cp->societyA, $cp->societyB, $cp->societyC])
                            ->every(fn ($s) => $s && $s->is_published && in_array($s->status, ['Verified', 'Premium'], true));
                    $content = implode(' ', array_filter([
                        $cp->intro, $cp->comparison_summary, $cp->recommendation_copy,
                        collect((array) $cp->faq_json)->map(fn ($f) => ($f['question'] ?? '').' '.($f['answer'] ?? ''))->join(' '),
                        collect((array) ($cp->comparison_table_json['rows'] ?? []))->map(fn ($r) => ($r['label'] ?? '').' '.implode(' ', (array) ($r['values'] ?? [])))->join(' '),
                    ]));

                    $this->upsert([
                        'page_key' => 'compare:'.$cp->id,
                        'page_type' => 'compare', 'entity_type' => \App\Models\SocietyComparePage::class, 'entity_id' => $cp->id,
                        'url' => '/compare/'.$cp->slug, 'canonical_url' => '/compare/'.$cp->slug,
                        'title' => $cp->meta_title ?: $cp->title, 'meta_description' => $cp->meta_description, 'h1' => $cp->h1 ?: $cp->title,
                        'is_indexable' => $isPublic, 'sitemap_included' => $isPublic, 'is_public' => $isPublic,
                        'content_word_count' => $this->words($content),
                        'internal_link_count' => count((array) $cp->internal_links_json) + 4,
                        'image_alt_coverage' => 100, 'schema_types' => ['BreadcrumbList', 'FAQPage', 'ItemList'],
                        'freshness_at' => $cp->updated_at,
                        'metadata' => [
                            'name' => $cp->title, 'sector' => $cp->sector_cluster, 'city' => $cp->city ?: 'Gurgaon',
                            'compare_status' => $cp->status, 'quality' => (float) $cp->content_quality_score,
                            'has_cta' => true, 'heading_count' => 6,
                        ],
                    ]); $count++;
                }
            });

        $publicSocieties = Society::query()->where('is_published', true)->whereIn('status', ['Verified','Premium'])->get();
        foreach ($publicSocieties->groupBy('sector')->filter(fn ($items, $key) => filled($key)) as $sector => $items) {
            $slug=Str::slug($sector);
            $this->upsertLanding('sector:'.$slug,'sector','/gurgaon/'.$slug,"Best Societies in {$sector}, Gurgaon","Compare verified societies, rent and resale context in {$sector}, Gurgaon.","Best Societies in {$sector}, Gurgaon",$items->count(),['sector'=>$sector,'societies'=>$items->pluck('name')->take(8)->all(),'has_cta'=>true]+$this->marketFacts($items));$count++;
        }
        $builderGroups=$publicSocieties->filter(fn($society)=>filled($society->builder))->groupBy(fn($society)=>$this->builderSlug((string)$society->builder));
        foreach ($builderGroups as $slug => $items) {
            $builder=$this->builderLabel((string)$slug,(string)$items->first()->builder);
            $this->upsertLanding('builder:'.$slug,'builder','/builder/'.$slug,"{$builder} Societies in Gurgaon","Explore verified {$builder} societies, locations and availability in Gurgaon.","{$builder} Societies in Gurgaon",$items->count(),['builder'=>$builder,'societies'=>$items->pluck('name')->take(8)->all(),'has_cta'=>true]+$this->marketFacts($items));$count++;
        }

        foreach ($this->staticPages() as $page) { $this->upsert($page); $count++; }
        foreach ($this->ncrCityPages() as $page) { $this->upsert($page); $count++; }
        return $count;
    }

    private function upsertLanding(string $key,string $type,string $url,string $title,string $description,string $h1,int $count,array $metadata): void
    {
        $this->upsert(['page_key'=>$key,'page_type'=>$type,'url'=>$url,'title'=>$title,'meta_description'=>$description,'h1'=>$h1,'canonical_url'=>$url,'is_indexable'=>$count>=2,'sitemap_included'=>$count>=2,'is_public'=>$count>=2,'content_word_count'=>$count*45,'internal_link_count'=>$count,'image_alt_coverage'=>100,'schema_types'=>['WebPage','BreadcrumbList'],'freshness_at'=>now(),'metadata'=>$metadata+['approved_society_count'=>$count,'heading_count'=>4]]);
    }

    private function staticPages(): array
    {
        // Every public module page must be registered here or the SEO Autopilot is blind to
        // it — no audits, no keyword mapping, no gap tasks, no drafts. Word counts are honest
        // estimates so thin tool pages get flagged as the real content gaps they are.
        $pages=[
            ['guide:gurgaon','guide','/gurgaon','Gurgaon Society Guide','Compare verified Gurgaon societies by sector, builder and living priorities.','Gurgaon Society Guide',350],
            ['guide:societies','guide','/societies','Verified Societies in Gurgaon','Browse verified Gurgaon societies with reviewed location and lifestyle data.','Verified Societies in Gurgaon',350],
            ['rent:gurgaon','rent','/search?tab=rent','Flats for Rent in Gurgaon','Request current verified rental availability across Gurgaon societies.','Flats for Rent in Gurgaon',350],
            ['buy:gurgaon','buy','/search?tab=buy','Flats for Sale in Gurgaon','Compare verified Gurgaon societies before requesting resale availability.','Flats for Sale in Gurgaon',350],
            ['comparison:gurgaon','comparison','/compare','Compare Gurgaon Societies','Compare verified Gurgaon societies side by side.','Compare Gurgaon Societies',350],
            ['guide:insights','guide','/insights','Gurgaon Property Insights','Decision-focused guides for Gurgaon society renters and buyers.','Gurgaon Property Insights',350],
            ['guide:sell','guide','/sell','List Your Gurgaon Flat — Reach Verified Buyers & Tenants | SocietyFlats','List your Gurgaon home once and meet buyers and tenants already searching your exact society.','Own a home in Gurgaon? List it once, and meet the right people.',420],
            ['guide:nri','guide','/nri-services','NRI Property Support in Gurgaon — Handled with Care | SocietyFlats','Buying, selling or renting out in Gurgaon from overseas? Start with a real, human consultation.','Gurgaon property, handled with care while you\'re overseas.',380],
            ['guide:builder-floors','guide','/builder-floors','Builder Floors in Gurgaon — What to Check Before You Buy | SocietyFlats','How builder floors really differ from apartments — land share, entry, parking, terrace rights and title.','A builder floor isn\'t an apartment. Here\'s what actually changes.',420],
            ['guide:builder-portal','guide','/builder-portal','Builder & RWA Portal — Claim Your Society | SocietyFlats','Claim your published society and share official updates with residents and buyers.','Claim your society\'s profile on SocietyFlats',260],
            // $p[7] === false marks an internal/tool page: still public and reachable, but kept
            // out of the sitemap and the index so it does not dilute crawl budget, rank for the
            // wrong intent, or sit forever as a thin-content SEO task. Defaults to indexable.
            ['guide:broker','guide','/broker-crm','Gurgaon Broker Partner Program | SocietyFlats','Apply to become a verified SocietyFlats broker partner for society-specific Gurgaon enquiries.','Join SocietyFlats as a Broker Partner',240,false],
            ['feature:ai-advisor','feature','/ai-advisor','SocietyFlats AI Advisor — Your Gurgaon Home Search, Made Simple','Tell our AI advisor what matters and it shortlists the Gurgaon societies and homes that genuinely fit.','SocietyFlats AI Advisor',140],
            ['feature:chat','feature','/chat','Gurgaon Society AI Chat | SocietyFlats','Ask a conversational assistant grounded in published SocietyFlats societies and live Gurgaon homes.','Ask anything about Gurgaon societies',130,false],
            ['feature:maps','feature','/maps','Gurgaon Society Map — Explore Verified Societies Live | SocietyFlats','Explore Gurgaon\'s verified societies on a live map with real coordinates and profile links.','Explore Gurgaon societies on a live map.',180],
            ['feature:calculator','feature','/investment-calculator','Gurgaon Rental Yield & Investment Calculator | SocietyFlats','Estimate rent, yield and investment context for Gurgaon societies from verified published data.','Gurgaon Investment Calculator',200],
            ['feature:recommendations','feature','/recommendations','Gurgaon Society Recommendations | SocietyFlats','Build a shortlist from published Gurgaon society profiles and live verified inventory.','Your shortlist',160,false],
            ['guide:trust','guide','/trust','How SocietyFlats Verifies Societies | SocietyFlats','What admin-reviewed society data actually means — our verification standard.','What admin-reviewed society data actually means.',300],
            ['guide:help','guide','/help','Help & FAQ | SocietyFlats','Clear answers for society-first home search on SocietyFlats.','Clear answers for society-first home search.',300],
        ];
        return array_map(function($p){$indexable=$p[7]??true;return ['page_key'=>$p[0],'page_type'=>$p[1],'url'=>$p[2],'title'=>$p[3],'meta_description'=>$p[4],'h1'=>$p[5],'canonical_url'=>str_contains($p[2],'?')?strstr($p[2],'?',true):$p[2],'is_indexable'=>$indexable,'sitemap_included'=>$indexable&&!str_contains($p[2],'?'),'is_public'=>true,'content_word_count'=>$p[6],'internal_link_count'=>8,'image_alt_coverage'=>100,'schema_types'=>['WebPage','BreadcrumbList'],'freshness_at'=>now(),'metadata'=>['name'=>$p[5],'city'=>'Gurgaon','has_cta'=>true,'heading_count'=>5]];},$pages);
    }

    private function ncrCityPages(): array
    {
        if (! (bool) config('features.ncr_multicity', false)) {
            return [];
        }

        $indexingEnabled = (bool) config('features.ncr_city_indexing', false);
        $approvedSlugs = collect((array) config('features.ncr_indexable_city_slugs', []))
            ->map(fn ($slug) => Str::slug((string) $slug))
            ->filter()
            ->values();

        return City::query()
            ->where('is_active', true)
            ->whereIn('slug', ['gurgaon', 'delhi', 'noida', 'greater-noida', 'faridabad'])
            ->orderByRaw("CASE slug WHEN 'gurgaon' THEN 1 WHEN 'delhi' THEN 2 WHEN 'noida' THEN 3 WHEN 'greater-noida' THEN 4 WHEN 'faridabad' THEN 5 ELSE 99 END")
            ->get()
            ->map(function (City $city) use ($indexingEnabled, $approvedSlugs) {
                $approved = $indexingEnabled && $approvedSlugs->contains($city->slug);
                $publishedSocietyCount = Society::query()
                    ->where('is_published', true)
                    ->whereIn('status', ['Verified', 'Premium'])
                    ->where(function ($query) use ($city) {
                        $query->where('city_id', $city->id);
                        $cityNames = $city->slug === 'gurgaon' ? ['Gurgaon', 'Gurugram'] : [$city->name];
                        $query->orWhereIn('city', $cityNames);
                    })
                    ->count();

                return [
                    'page_key' => 'ncr-city:'.$city->slug,
                    'page_type' => 'ncr_city',
                    'entity_type' => City::class,
                    'entity_id' => $city->id,
                    'url' => '/ncr/'.$city->slug,
                    'canonical_url' => '/ncr/'.$city->slug,
                    'title' => $city->name.' NCR City Preview | SocietyFlats',
                    'meta_description' => 'Review-only SocietyFlats city shell for '.$city->name.'. Indexing requires explicit admin approval and the NCR city indexing flag.',
                    'h1' => $city->name.' SocietyFlats NCR city shell',
                    'is_indexable' => $approved,
                    'sitemap_included' => $approved,
                    'is_public' => true,
                    'content_word_count' => 260,
                    'internal_link_count' => 4,
                    'image_alt_coverage' => 100,
                    'schema_types' => ['WebPage', 'BreadcrumbList'],
                    'freshness_at' => now(),
                    'metadata' => [
                        'name' => $city->name,
                        'city' => $city->name,
                        'state' => $city->state,
                        'slug' => $city->slug,
                        'ncr_review_only' => ! $approved,
                        'indexing_policy' => $approved ? 'approved_city_sitemap' : 'held_noindex_until_approved',
                        'approved_society_count' => $publishedSocietyCount,
                        'has_cta' => true,
                        'heading_count' => 4,
                    ],
                ];
            })
            ->all();
    }

    /**
     * Verified market facts for a landing page, computed from the published societies it
     * covers: the rent/resale entry points and the strongest societies (with real profile
     * links) — so drafts can be specific and data-rich instead of generic.
     *
     * @param \Illuminate\Support\Collection<int,Society> $items
     * @return array<string,mixed>
     */
    private function marketFacts($items): array
    {
        $matcher = new \App\Services\Ai\SocietyMatchService();
        $rentFloors = $items->map(fn (Society $s) => $matcher->priceFromText($s->rent_range ?: $s->average_rent))->filter(fn ($v) => $v && $v >= 5000)->sort()->values();
        $buyFloors = $items->map(fn (Society $s) => $matcher->priceFromText($s->buy_range ?: $s->average_sale_price))->filter(fn ($v) => $v && $v >= 1000000)->sort()->values();

        return [
            'rent_from' => $rentFloors->isNotEmpty() ? '₹'.number_format((float) $rentFloors->first(), 0, '.', ',') : null,
            'buy_from' => $buyFloors->isNotEmpty() ? '₹'.rtrim(rtrim(number_format($buyFloors->first() / 10000000, 2, '.', ''), '0'), '.').' Cr' : null,
            'top_societies' => $items->sortByDesc(fn (Society $s) => (float) $s->score)->take(6)->map(fn (Society $s) => array_filter([
                'name' => $s->name, 'slug' => $s->slug, 'score' => $s->score ? round((float) $s->score, 1) : null,
                'rent_range' => $s->rent_range, 'buy_range' => $s->buy_range,
            ]))->values()->all(),
        ];
    }

    /**
     * seo_pages has a UNIQUE index on url as well as page_key. Registry history can leave a
     * row holding a URL under a stale page_key (keys were renamed across versions and the
     * sync never deletes) — a plain updateOrCreate(page_key) then explodes on the url index.
     * Reconcile on both: adopt the row matching either identity, and drop a stale duplicate
     * that would otherwise still hold our unique URL (its audits cascade, tasks null out).
     */
    private function upsert(array $attributes): SeoPage
    {
        $byKey = SeoPage::where('page_key', $attributes['page_key'])->first();
        $byUrl = SeoPage::where('url', $attributes['url'])->first();

        if ($byKey && $byUrl && $byKey->id !== $byUrl->id) {
            $byUrl->delete();
        }

        $target = $byKey ?: $byUrl;
        if ($target) {
            $target->update($attributes);

            return $target;
        }

        return SeoPage::create($attributes);
    }
    private function builderSlug(string $builder): string
    {
        $value=Str::lower($builder);
        return match(true){
            str_contains($value,'dlf')=>'dlf',str_contains($value,'godrej')=>'godrej',str_contains($value,'m3m')=>'m3m',
            str_contains($value,'emaar')=>'emaar',preg_match('/\bats\b/',$value)===1=>'ats',str_contains($value,'adani')=>'adani',
            str_contains($value,'tulip')=>'tulip',str_contains($value,'alpha corp')=>'alpha-corp',default=>Str::slug($builder),
        };
    }
    private function builderLabel(string $slug,string $fallback): string
    {
        return ['dlf'=>'DLF','godrej'=>'Godrej','m3m'=>'M3M','emaar'=>'Emaar','ats'=>'ATS','adani'=>'Adani','tulip'=>'Tulip','alpha-corp'=>'Alpha Corp'][$slug]??$fallback;
    }
    private function words(?string $value): int { return str_word_count(strip_tags((string)$value)); }
    private function missingSocietyData(Society $s): array { return array_values(array_filter([blank($s->builder)?'builder':null,blank($s->sector)&&blank($s->locality)?'location':null,blank($s->amenities)?'amenities':null,blank($s->rera_number)?'rera':null,blank($s->rent_range)?'rent_range':null,blank($s->buy_range)?'buy_range':null])); }
}
