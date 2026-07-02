<?php

namespace App\Services\Seo;

use App\Models\Property;
use App\Models\SeoPage;
use App\Models\Society;
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
                        'has_cta'=>true,'heading_count'=>$publishedSeo ? 7 : 2,'missing_data'=>$this->missingSocietyData($society),
                    ],
                ]); $count++;
            }
        });

        Property::with('society')->orderBy('id')->chunk(100, function ($properties) use (&$count) {
            foreach ($properties as $property) {
                $isPublic = $property->status === 'Live' && $property->verified && $property->published_at && $property->society?->is_published;
                $this->upsert([
                    'page_key'=>'property:'.$property->id,'page_type'=>'property','entity_type'=>Property::class,'entity_id'=>$property->id,
                    'url'=>'/property/'.$property->slug,'title'=>$property->title,'meta_description'=>$property->description,'h1'=>$property->title,
                    'canonical_url'=>'/property/'.$property->slug,'is_indexable'=>$isPublic,'sitemap_included'=>$isPublic,'is_public'=>$isPublic,
                    'content_word_count'=>$this->words($property->description),'internal_link_count'=>$property->society_id ? 1 : 0,
                    'image_alt_coverage'=>count((array)$property->images) ? 0 : 100,'schema_types'=>['WebPage'],
                    'freshness_at'=>$property->availability_checked_at ?: $property->updated_at,
                    'metadata'=>['name'=>$property->title,'society'=>$property->society?->name,'locality'=>$property->locality,'has_cta'=>true,'heading_count'=>2],
                ]); $count++;
            }
        });

        $publicSocieties = Society::query()->where('is_published', true)->whereIn('status', ['Verified','Premium'])->get();
        foreach ($publicSocieties->groupBy('sector')->filter(fn ($items, $key) => filled($key)) as $sector => $items) {
            $slug=Str::slug($sector);$names=$items->pluck('name')->take(8)->all();
            $this->upsertLanding('sector:'.$slug,'sector','/gurgaon/'.$slug,"Best Societies in {$sector}, Gurgaon","Compare verified societies, rent and resale context in {$sector}, Gurgaon.","Best Societies in {$sector}, Gurgaon",$items->count(),['sector'=>$sector,'societies'=>$names,'has_cta'=>true]);$count++;
        }
        $builderGroups=$publicSocieties->filter(fn($society)=>filled($society->builder))->groupBy(fn($society)=>$this->builderSlug((string)$society->builder));
        foreach ($builderGroups as $slug => $items) {
            $builder=$this->builderLabel((string)$slug,(string)$items->first()->builder);$names=$items->pluck('name')->take(8)->all();
            $this->upsertLanding('builder:'.$slug,'builder','/builder/'.$slug,"{$builder} Societies in Gurgaon","Explore verified {$builder} societies, locations and availability in Gurgaon.","{$builder} Societies in Gurgaon",$items->count(),['builder'=>$builder,'societies'=>$names,'has_cta'=>true]);$count++;
        }

        foreach ($this->staticPages() as $page) { $this->upsert($page); $count++; }
        return $count;
    }

    private function upsertLanding(string $key,string $type,string $url,string $title,string $description,string $h1,int $count,array $metadata): void
    {
        $this->upsert(['page_key'=>$key,'page_type'=>$type,'url'=>$url,'title'=>$title,'meta_description'=>$description,'h1'=>$h1,'canonical_url'=>$url,'is_indexable'=>$count>=2,'sitemap_included'=>$count>=2,'is_public'=>$count>=2,'content_word_count'=>$count*45,'internal_link_count'=>$count,'image_alt_coverage'=>100,'schema_types'=>['WebPage','BreadcrumbList'],'freshness_at'=>now(),'metadata'=>$metadata+['approved_society_count'=>$count,'heading_count'=>4]]);
    }

    private function staticPages(): array
    {
        $pages=[
            ['guide:gurgaon','guide','/gurgaon','Gurgaon Society Guide','Compare verified Gurgaon societies by sector, builder and living priorities.','Gurgaon Society Guide'],
            ['guide:societies','guide','/societies','Verified Societies in Gurgaon','Browse verified Gurgaon societies with reviewed location and lifestyle data.','Verified Societies in Gurgaon'],
            ['rent:gurgaon','rent','/search?tab=rent','Flats for Rent in Gurgaon','Request current verified rental availability across Gurgaon societies.','Flats for Rent in Gurgaon'],
            ['buy:gurgaon','buy','/search?tab=buy','Flats for Sale in Gurgaon','Compare verified Gurgaon societies before requesting resale availability.','Flats for Sale in Gurgaon'],
            ['comparison:gurgaon','comparison','/compare','Compare Gurgaon Societies','Compare verified Gurgaon societies side by side.','Compare Gurgaon Societies'],
            ['guide:insights','guide','/insights','Gurgaon Property Insights','Decision-focused guides for Gurgaon society renters and buyers.','Gurgaon Property Insights'],
        ];
        return array_map(fn($p)=>['page_key'=>$p[0],'page_type'=>$p[1],'url'=>$p[2],'title'=>$p[3],'meta_description'=>$p[4],'h1'=>$p[5],'canonical_url'=>str_contains($p[2],'?')?strstr($p[2],'?',true):$p[2],'is_indexable'=>true,'sitemap_included'=>!str_contains($p[2],'?'),'is_public'=>true,'content_word_count'=>350,'internal_link_count'=>8,'image_alt_coverage'=>100,'schema_types'=>['WebPage','BreadcrumbList'],'freshness_at'=>now(),'metadata'=>['name'=>$p[5],'city'=>'Gurgaon','has_cta'=>true,'heading_count'=>5]],$pages);
    }

    private function upsert(array $attributes): SeoPage { return SeoPage::updateOrCreate(['page_key'=>$attributes['page_key']],$attributes); }
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
