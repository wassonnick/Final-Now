<?php
namespace App\Services\Seo;
use App\Models\SeoChangeLog;
use App\Models\SeoDraft;
use App\Models\SeoPage;
use App\Models\SeoTask;
use App\Models\Society;
use App\Models\SocietySeoContent;
use Illuminate\Support\Str;
class SeoDraftService
{
    /** Warnings every draft carries by design — they don't indicate an actual problem. */
    public const BOILERPLATE_WARNINGS = [
        'Admin review required before publication.',
        'Prices, distances, RERA and legal claims are intentionally omitted unless already verified.',
    ];

    public function __construct(private SeoAutopilotAiService $ai){}

    /**
     * Whether the nightly run may approve AND publish this draft without a human:
     * landing-page metadata only (never society content), public page, confidence at or
     * above the policy threshold, and no risk warnings beyond the standard boilerplate.
     */
    public function autoPublishEligible(SeoDraft $draft, int $minConfidence): bool
    {
        $page = $draft->page;
        if (! $page || ! $page->is_public || $draft->status !== 'needs_review') return false;
        if ($page->page_type === 'society' || ($page->entity_type === Society::class && $page->entity_id)) return false;
        if ((int) $draft->confidence_score < $minConfidence) return false;

        $realWarnings = collect((array) $draft->risk_warnings)
            ->reject(fn ($warning) => in_array($warning, self::BOILERPLATE_WARNINGS, true));

        return $realWarnings->isEmpty();
    }

    public function generate(SeoPage $page): SeoDraft
    {
        $meta=$page->metadata?:[];$count=(int)($meta['approved_society_count']??count((array)($meta['societies']??[])));
        if($page->page_type==='society'&&($meta['seo_status']??null)==='published')throw new \InvalidArgumentException('Published society SEO was not overwritten. Unpublish it explicitly before generating a replacement draft.');
        if(in_array($page->page_type,['sector','builder'],true)&&$count<2){SeoTask::updateOrCreate(['seo_page_id'=>$page->id,'task_type'=>'insufficient_approved_societies','status'=>'open'],['priority'=>'high','title'=>'Not enough approved societies for SEO landing page','description'=>'At least two published, approved societies are required before generating this page.','source'=>'generator']);throw new \InvalidArgumentException('Not enough approved societies to generate a safe landing-page draft.');}
        $name=(string)($meta['name']??$meta['sector']??$meta['builder']??$page->h1??'Gurgaon');$societies=array_values((array)($meta['societies']??[]));
        $fallback=['seo_title'=>$this->title($page,$name,$count),'seo_description'=>$this->description($page,$name,$count,$meta),'seo_h1'=>$this->h1($page,$name),'intro_summary'=>$this->intro($page,$name,$count,$meta),'internal_links'=>$this->links($page,$societies,$meta),'faq'=>$this->faqs($page,$name,$count,$meta),'schema'=>$this->schema($page,$name)];
        $intel=$this->intel($page);
        try{$suggested=$this->ai->improve($page,$fallback,$intel);$suggested['schema']=$fallback['schema'];$usedAi=$this->ai->available();}catch(\Throwable $e){report($e);$suggested=$fallback;$usedAi=false;$suggested['risk_warnings'][]='AI provider failed; deterministic verified-data fallback used.';}
        return SeoDraft::create(['seo_page_id'=>$page->id,'status'=>'needs_review','current_version'=>['seo_title'=>$page->title,'seo_description'=>$page->meta_description,'seo_h1'=>$page->h1],'suggested_version'=>$suggested,'reason'=>$suggested['reason']??'Improve metadata, local intent, internal linking and schema using verified first-party page inventory.','confidence_score'=>$this->confidence($page,$meta,$intel,$usedAi),'data_sources'=>['seo_pages registry','published SocietyFlats society records'],'risk_warnings'=>array_values(array_unique(array_filter(['Admin review required before publication.',...($suggested['risk_warnings']??[]),empty($societies)&&in_array($page->page_type,['sector','builder'],true)?'Society list is empty; do not publish.':null,'Prices, distances, RERA and legal claims are intentionally omitted unless already verified.']))),'generated_by'=>$usedAi?'ai':'system','ai_model'=>$usedAi?$this->ai->model():null]);
    }
    public function update(SeoDraft $draft,array $suggested,string $actor): SeoDraft
    {
        if($draft->status!=='needs_review')throw new \InvalidArgumentException('Only review-pending drafts can be edited.');
        $before=$draft->suggested_version?:[];$page=$draft->page;$name=(string)(($page->metadata?:[])['name']??($page->metadata?:[])['sector']??($page->metadata?:[])['builder']??$page->h1??'Gurgaon');
        $safe=array_merge($before,array_filter($suggested,fn($value)=>$value!==null));
        $safe['schema']=$this->schema($page,$name);
        $draft->update(['suggested_version'=>$safe,'reason'=>$suggested['reason']??$draft->reason,'reviewed_by'=>null,'reviewed_at'=>null]);
        SeoChangeLog::create(['seo_page_id'=>$draft->seo_page_id,'action'=>'draft_edited','actor'=>$actor,'before_content'=>$before,'after_content'=>$safe,'ai_model'=>$draft->ai_model,'metadata'=>['draft_id'=>$draft->id,'publicly_visible'=>false]]);
        return $draft->fresh();
    }
    public function approve(SeoDraft $draft,string $actor): SeoDraft
    {
        if($draft->status!=='needs_review')throw new \InvalidArgumentException('Only review-pending drafts can be approved.');$page=$draft->page;$before=$draft->current_version;$suggested=$draft->suggested_version;
        if($page->entity_type===Society::class&&$page->entity_id){$content=SocietySeoContent::firstOrNew(['society_id'=>$page->entity_id]);if($content->exists&&$content->status==='published')throw new \InvalidArgumentException('Published society SEO was not overwritten. Unpublish it explicitly before approving a replacement draft.');$content->fill(['seo_title'=>$suggested['seo_title']??null,'seo_description'=>$suggested['seo_description']??null,'seo_h1'=>$suggested['seo_h1']??null,'intro_summary'=>$suggested['intro_summary']??null,'internal_link_suggestions_json'=>$suggested['internal_links']??[],'faq_json'=>$suggested['faq']??[],'schema_json'=>$suggested['schema']??[]]);$content->status='approved';$content->generated_by=$content->exists?'ai_plus_admin':'system';$content->published_at=null;$content->save();$contentId=$content->id;}else{$page->update(['title'=>$suggested['seo_title']??$page->title,'meta_description'=>$suggested['seo_description']??$page->meta_description,'h1'=>$suggested['seo_h1']??$page->h1,'metadata'=>array_merge($page->metadata?:[],['approved_draft_id'=>$draft->id])]);$contentId=null;}
        $draft->update(['status'=>'approved','reviewed_by'=>$actor,'reviewed_at'=>now()]);SeoChangeLog::create(['seo_page_id'=>$page->id,'society_seo_content_id'=>$contentId,'action'=>'draft_approved','actor'=>$actor,'before_content'=>$before,'after_content'=>$suggested,'ai_model'=>$draft->ai_model,'metadata'=>['draft_id'=>$draft->id,'publicly_visible'=>false]]);SeoTask::updateOrCreate(['seo_page_id'=>$page->id,'task_type'=>'sitemap_refresh_after_publish','status'=>'open'],['priority'=>'low','title'=>'Refresh sitemap after this SEO content is published','description'=>'Approval does not publish. Refresh and validate sitemap only after explicit publication.','source'=>'workflow']);return $draft->fresh();
    }
    public function reject(SeoDraft $draft,string $actor,?string $reason=null): SeoDraft{$draft->update(['status'=>'rejected','reviewed_by'=>$actor,'reviewed_at'=>now(),'risk_warnings'=>array_values(array_filter([...(array)$draft->risk_warnings,$reason]))]);SeoChangeLog::create(['seo_page_id'=>$draft->seo_page_id,'action'=>'draft_rejected','actor'=>$actor,'before_content'=>$draft->current_version,'after_content'=>$draft->suggested_version,'metadata'=>['draft_id'=>$draft->id,'reason'=>$reason]]);return $draft->fresh();}
    public function publish(SeoDraft $draft,string $actor): SeoDraft
    {
        if($draft->status!=='approved')throw new \InvalidArgumentException('Approve the SEO draft before publishing it.');$page=$draft->page;$contentId=null;
        if($page->entity_type===Society::class&&$page->entity_id){$content=SocietySeoContent::where('society_id',$page->entity_id)->firstOrFail();if($content->status!=='approved')throw new \InvalidArgumentException('The linked society SEO content is not approved.');$content->update(['status'=>'published','published_at'=>now()]);$contentId=$content->id;}
        $draft->update(['status'=>'published','published_at'=>now(),'reviewed_by'=>$draft->reviewed_by?:$actor,'reviewed_at'=>$draft->reviewed_at?:now()]);SeoChangeLog::create(['seo_page_id'=>$page->id,'society_seo_content_id'=>$contentId,'action'=>'draft_published','actor'=>$actor,'before_content'=>$draft->current_version,'after_content'=>$draft->suggested_version,'ai_model'=>$draft->ai_model,'metadata'=>['draft_id'=>$draft->id]]);SeoTask::updateOrCreate(['seo_page_id'=>$page->id,'task_type'=>'sitemap_refresh_after_publish','status'=>'open'],['priority'=>'high','title'=>'Refresh and validate sitemap after SEO publication','description'=>'Confirm the live sitemap retains every public URL and does not add unpublished property URLs.','source'=>'workflow']);return $draft->fresh();
    }
    /**
     * Confidence is earned, not assumed: a thin landing page without verified market facts
     * stays below the auto-publish threshold and waits for a human, while a keyword-targeted,
     * fact-rich draft clears it. Society drafts keep their fixed score (they never auto-publish).
     */
    private function confidence(SeoPage $page,array $meta,array $intel,bool $usedAi): int
    {
        if($page->page_type==='society')return 85;
        $score=76;
        if($usedAi)$score+=2;
        if(!empty($meta['rent_from'])||!empty($meta['buy_from']))$score+=6;
        if(!empty($meta['top_societies']))$score+=4;
        if(!empty($intel['target_keywords']))$score+=2;
        return min(95,$score);
    }

    /** Keywords, live-search queries and open audit issues for this page — targeting intel for the AI pass. */
    private function intel(SeoPage $page): array
    {
        $keywords=\App\Models\SeoKeyword::where('seo_page_id',$page->id)->orderBy('id')->limit(6)->pluck('keyword')->values()->all();
        $queries=\App\Models\SeoSearchConsoleMetric::where('seo_page_id',$page->id)->where('metric_date','>=',now()->subDays(28))->where('query','!=','')
            ->selectRaw('query, SUM(impressions) as impressions, SUM(clicks) as clicks')->groupBy('query')->orderByDesc('impressions')->limit(5)->get()
            ->map(fn($m)=>['query'=>$m->query,'impressions'=>(int)$m->impressions,'clicks'=>(int)$m->clicks])->all();
        $issues=collect((array)($page->latestAudit?->issues??[]))->pluck('message')->filter()->take(6)->values()->all();
        return ['target_keywords'=>$keywords,'search_console_queries'=>$queries,'open_audit_issues'=>$issues];
    }
    private function title(SeoPage $p,string $n,int $c): string{return Str::limit(match($p->page_type){'sector'=>$c>=2?"{$c} Best Societies in {$n}, Gurgaon | SocietyFlats":"Best Societies in {$n}, Gurgaon | SocietyFlats",'builder'=>$c>=2?"{$n} Societies in Gurgaon: {$c} Verified | SocietyFlats":"{$n} Societies in Gurgaon | SocietyFlats",'rent'=>"Verified Flats for Rent in Gurgaon | SocietyFlats",'buy'=>"Verified Flats for Sale in Gurgaon | SocietyFlats",'comparison'=>"Compare Gurgaon Societies | SocietyFlats",default=>"{$n} Gurgaon Society Guide | SocietyFlats"},65,'');}
    private function description(SeoPage $p,string $n,int $c,array $meta=[]): string
    {
        $prefix=$c>0?"Compare {$c} verified societies":"Explore verified SocietyFlats information";
        $facts=implode('',array_filter([($meta['rent_from']??null)?" — rent from {$meta['rent_from']}":null,($meta['rent_from']??null)&&($meta['buy_from']??null)?", resale from {$meta['buy_from']}":((!($meta['rent_from']??null)&&($meta['buy_from']??null))?" — resale from {$meta['buy_from']}":null)]));
        return Str::limit("{$prefix} for {$n}, Gurgaon{$facts}. Real scores, reviewed locations and honest availability — checked by real people.",165,'');
    }
    private function h1(SeoPage $p,string $n): string{return match($p->page_type){'sector'=>"Best Societies in {$n}, Gurgaon",'builder'=>"{$n} Societies in Gurgaon",'rent'=>'Flats for Rent in Gurgaon','buy'=>'Flats for Sale in Gurgaon','comparison'=>'Compare Gurgaon Societies',default=>$n};}
    private function intro(SeoPage $p,string $n,int $c,array $meta=[]): string
    {
        $base=($c?"This page compares {$c} currently published SocietyFlats society profiles":"This page uses currently published SocietyFlats records")." for {$n}.";
        $facts=array_filter([($meta['rent_from']??null)?"verified rents start around {$meta['rent_from']}":null,($meta['buy_from']??null)?"resale entries start around {$meta['buy_from']}":null]);
        if($facts)$base.=' Across these societies, '.implode(' and ',$facts).'.';
        return $base.' Availability and market information must be confirmed before users make a decision.';
    }
    private function links(SeoPage $p,array $societies,array $meta=[]): array
    {
        $links=[['label'=>'Browse verified Gurgaon societies','url'=>'/societies'],['label'=>'Compare societies','url'=>'/compare']];
        $top=collect((array)($meta['top_societies']??[]))->filter(fn($s)=>filled($s['slug']??null));
        if($top->isNotEmpty()){foreach($top->take(6) as $s)$links[]=['label'=>(string)$s['name'],'url'=>'/society/'.$s['slug']];}
        else{foreach(array_slice($societies,0,6) as $name)$links[]=['label'=>$name,'url'=>'/search?tab=societies&q='.rawurlencode((string)$name)];}
        return $links;
    }
    private function faqs(SeoPage $p,string $n,int $c=0,array $meta=[]): array
    {
        $faqs=[['question'=>"How does SocietyFlats review {$n}?",'answer'=>'SocietyFlats uses published society records and admin-reviewed source fields. Missing facts remain marked for verification.'],['question'=>'Are rental or resale homes guaranteed to be available?','answer'=>'No. Current availability must be requested and confirmed; SocietyFlats does not show fabricated inventory.']];
        if(($meta['rent_from']??null)&&$c>0)$faqs[]=['question'=>"What does it cost to rent in {$n}?",'answer'=>"Published SocietyFlats data shows verified rents starting around {$meta['rent_from']} across {$c} societies here. Pricing varies by society and home — request current availability for exact options."];
        if(($meta['buy_from']??null)&&$c>0)$faqs[]=['question'=>"What do resale homes cost in {$n}?",'answer'=>"Verified resale ranges start around {$meta['buy_from']} across the published societies on this page. Exact pricing depends on the society, size and floor — confirm before deciding."];
        $top=collect((array)($meta['top_societies']??[]))->filter(fn($s)=>filled($s['name']??null))->take(3);
        if($top->isNotEmpty())$faqs[]=['question'=>"Which societies stand out in {$n}?",'answer'=>'Based on published SocietyFlats scores: '.$top->map(fn($s)=>$s['name'].(isset($s['score'])?' ('.$s['score'].'/10)':''))->implode(', ').'. Open each profile for verified details.'];
        return $faqs;
    }
    private function schema(SeoPage $p,string $n): array{return ['@context'=>'https://schema.org','@type'=>'WebPage','name'=>$this->h1($p,$n),'url'=>'https://www.societyflats.com'.(str_contains($p->canonical_url,'?')?strstr($p->canonical_url,'?',true):$p->canonical_url)];}
}
