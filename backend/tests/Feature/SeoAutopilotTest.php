<?php

namespace Tests\Feature;

use App\Models\SeoChangeLog;
use App\Models\SeoAutomationRun;
use App\Models\SeoAutomationSetting;
use App\Models\SeoDraft;
use App\Models\SeoPage;
use App\Models\SeoTask;
use App\Models\Society;
use App\Models\SocietySeoContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SeoAutopilotTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token'=>'seo-admin-token']);
    }

    public function test_autopilot_routes_are_admin_only(): void
    {
        $this->getJson('/api/admin/seo-autopilot/dashboard')->assertUnauthorized();
        $this->postJson('/api/admin/seo-autopilot/audit')->assertUnauthorized();
    }

    public function test_dashboard_registers_pages_runs_persistent_audits_and_creates_tasks(): void
    {
        $society=$this->society('Audit Society','audit-society');
        SocietySeoContent::create(['society_id'=>$society->id,'status'=>'published','seo_title'=>'Audit Society Gurgaon Guide | SocietyFlats','seo_description'=>'Review Audit Society in Gurgaon with verified location, lifestyle, rent and resale context before requesting current availability.','seo_h1'=>'Audit Society Gurgaon','intro_summary'=>'A short intro.','published_at'=>now()]);

        // 1 published society + its public RWA page + 18 registered module/static pages.
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')
            ->assertOk()->assertJsonPath('data.summary.public_pages',20);

        $page=SeoPage::where('page_key','society:'.$society->id)->firstOrFail();
        $this->assertTrue($page->is_public);
        $this->assertDatabaseHas('seo_audits',['seo_page_id'=>$page->id]);
        $this->assertDatabaseHas('seo_tasks',['seo_page_id'=>$page->id,'status'=>'open']);
    }

    public function test_dashboard_exposes_automation_policy_and_marketing_plan(): void
    {
        $this->society('Plan Society','plan-society');

        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')
            ->assertOk()
            ->assertJsonPath('data.automation.settings.enabled',true)
            ->assertJsonPath('data.marketing_plan.0.id','foundation')
            ->assertJsonPath('data.quick_actions.0.id','cycle');
    }

    public function test_complete_automation_cycle_runs_and_records_summary(): void
    {
        $this->society('Cycle Society','cycle-society');

        $this->admin()->postJson('/api/admin/seo-autopilot/automation/run')
            ->assertOk()
            ->assertJsonPath('data.trigger','manual');

        $run=SeoAutomationRun::firstOrFail();
        $this->assertContains($run->status,['completed','completed_with_warnings']);
        $this->assertGreaterThan(0,$run->summary['pages_registered']);
        $this->assertGreaterThan(0,$run->summary['pages_audited']);
        $this->assertDatabaseHas('seo_reports',['period'=>'daily']);
    }

    public function test_automation_settings_can_pause_cycle(): void
    {
        $this->admin()->patchJson('/api/admin/seo-autopilot/automation/settings',['enabled'=>false,'drafts_per_run'=>3])
            ->assertOk()
            ->assertJsonPath('data.enabled',false)
            ->assertJsonPath('data.drafts_per_run',3);

        $this->assertFalse(SeoAutomationSetting::firstOrFail()->enabled);
        $this->admin()->postJson('/api/admin/seo-autopilot/automation/run')
            ->assertUnprocessable()
            ->assertJsonPath('message','SEO Autopilot is paused. Enable it before running a cycle.');
    }

    public function test_keyword_clusters_map_to_existing_pages(): void
    {
        $society=$this->society('Keyword Society','keyword-society');
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $this->admin()->postJson('/api/admin/seo-autopilot/keywords/seed')->assertOk();
        $this->assertDatabaseHas('seo_keywords',['keyword'=>'keyword society gurgaon','cluster_type'=>'society']);
        $this->assertDatabaseHas('seo_keywords',['keyword'=>'flats for rent in gurgaon','cluster_type'=>'rent']);
        $this->assertNotNull($society);
    }

    public function test_search_console_import_creates_low_ctr_and_striking_distance_tasks(): void
    {
        $this->society('Console Society','console-society');
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $this->admin()->postJson('/api/admin/seo-autopilot/search-console/import',['rows'=>[['_dummy'=>true,'page_url'=>'https://www.societyflats.com/society/console-society','date'=>'2026-07-02','query'=>'console society','clicks'=>1,'impressions'=>250,'ctr'=>0.004,'position'=>8.5]]])->assertOk()->assertJsonPath('count',1);
        $this->assertDatabaseHas('seo_tasks',['task_type'=>'gsc_low_ctr','status'=>'open']);
        $this->assertDatabaseHas('seo_tasks',['task_type'=>'gsc_striking_distance','status'=>'open']);
    }

    public function test_blank_search_console_queries_are_idempotent(): void
    {
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $row=['page_url'=>'https://www.societyflats.com/gurgaon','date'=>'2026-07-02','impressions'=>10];
        $this->admin()->postJson('/api/admin/seo-autopilot/search-console/import',['rows'=>[$row]])->assertOk();
        $this->admin()->postJson('/api/admin/seo-autopilot/search-console/import',['rows'=>[$row]])->assertOk();
        $this->assertDatabaseCount('seo_search_console_metrics',1);
    }

    public function test_search_console_refreshes_oauth_token_before_scheduled_import(): void
    {
        config(['services.search_console'=>[
            'site_url'=>'sc-domain:societyflats.com',
            'access_token'=>'stale-access-token',
            'client_id'=>'test-client-id',
            'client_secret'=>'test-client-secret',
            'refresh_token'=>'test-refresh-token',
        ]]);
        Http::fake([
            'https://oauth2.googleapis.com/token'=>Http::response(['access_token'=>'fresh-access-token','expires_in'=>3600],200),
            'https://searchconsole.googleapis.com/*'=>Http::response(['rows'=>[[
                'keys'=>['2026-07-03','https://www.societyflats.com/gurgaon','gurgaon societies'],
                'clicks'=>4,'impressions'=>120,'ctr'=>0.033,'position'=>5.2,
            ]]],200),
        ]);

        // Dual-pass import: one totals row (query='') + one query-sliced intel row.
        $this->admin()->postJson('/api/admin/seo-autopilot/search-console/fetch')
            ->assertOk()->assertJsonPath('count',2)->assertJsonPath('configured',true);

        Http::assertSent(fn($request)=>$request->url()==='https://oauth2.googleapis.com/token'
            && $request['grant_type']==='refresh_token'
            && $request['refresh_token']==='test-refresh-token');
        Http::assertSent(fn($request)=>str_starts_with($request->url(),'https://searchconsole.googleapis.com/')
            && $request->hasHeader('Authorization','Bearer fresh-access-token'));
        $this->assertDatabaseHas('seo_search_console_metrics',['query'=>'gurgaon societies','clicks'=>4]);
        $this->assertDatabaseHas('seo_search_console_metrics',['query'=>'','clicks'=>4]);
    }

    public function test_headline_gsc_totals_prefer_totals_rows_over_query_sliced_rows(): void
    {
        // Google omits anonymized queries from query-sliced rows, so the query rows undercount:
        // totals row says 9 clicks / 400 impressions; the only surviving query row says 2 / 150.
        \App\Models\SeoSearchConsoleMetric::create(['metric_date'=>now()->subDays(3),'page_url'=>'https://www.societyflats.com/gurgaon','query'=>'','clicks'=>9,'impressions'=>400,'ctr'=>0.0225]);
        \App\Models\SeoSearchConsoleMetric::create(['metric_date'=>now()->subDays(3),'page_url'=>'https://www.societyflats.com/gurgaon','query'=>'gurgaon societies','clicks'=>2,'impressions'=>150,'ctr'=>0.013]);

        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')
            ->assertOk()
            ->assertJsonPath('data.search_console.clicks_28d',9)
            ->assertJsonPath('data.search_console.impressions_28d',400);
    }

    public function test_society_draft_approval_updates_reviewable_fields_but_never_publishes(): void
    {
        $society=$this->society('Draft Society','draft-society');
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $page=SeoPage::where('page_key','society:'.$society->id)->firstOrFail();
        $draftResponse=$this->admin()->postJson("/api/admin/seo-autopilot/pages/{$page->id}/drafts")->assertCreated()->assertJsonPath('data.status','needs_review');
        $draftId=$draftResponse->json('data.id');

        $this->admin()->postJson("/api/admin/seo-autopilot/drafts/{$draftId}/approve")
            ->assertOk()->assertJsonPath('data.status','approved');

        $content=SocietySeoContent::where('society_id',$society->id)->firstOrFail();
        $this->assertSame('approved',$content->status);
        $this->assertNull($content->published_at);
        $this->assertTrue($society->fresh()->is_published);
        $this->assertDatabaseHas('seo_change_logs',['seo_page_id'=>$page->id,'action'=>'draft_approved']);
    }

    public function test_review_pending_draft_can_be_edited_without_publication(): void
    {
        $society=$this->society('Editable Society','editable-society');
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $page=SeoPage::where('page_key','society:'.$society->id)->firstOrFail();
        $draftId=$this->admin()->postJson("/api/admin/seo-autopilot/pages/{$page->id}/drafts")->assertCreated()->json('data.id');
        $this->admin()->patchJson("/api/admin/seo-autopilot/drafts/{$draftId}",['seo_title'=>'Editable Society Reviewed | SocietyFlats','seo_h1'=>'Editable Society Gurgaon'])
            ->assertOk()->assertJsonPath('data.suggested_version.seo_title','Editable Society Reviewed | SocietyFlats');
        $this->assertDatabaseMissing('society_seo_contents',['society_id'=>$society->id]);
        $this->assertDatabaseHas('seo_change_logs',['seo_page_id'=>$page->id,'action'=>'draft_edited']);
    }

    public function test_builder_variants_share_the_canonical_builder_page(): void
    {
        $one=$this->society('DLF One','dlf-one');$one->update(['builder'=>'DLF Limited']);
        $two=$this->society('DLF Two','dlf-two');$two->update(['builder'=>'DLF Homes']);
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $this->assertDatabaseHas('seo_pages',['page_key'=>'builder:dlf','url'=>'/builder/dlf','is_public'=>true]);
        $this->assertDatabaseMissing('seo_pages',['page_key'=>'builder:dlf-limited']);
    }

    public function test_sector_draft_requires_enough_published_societies_and_reports_are_stored(): void
    {
        $this->society('Only One','only-one','Sector 91');
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $sector=SeoPage::where('page_key','sector:sector-91')->firstOrFail();
        $this->admin()->postJson("/api/admin/seo-autopilot/pages/{$sector->id}/drafts")->assertUnprocessable();
        $this->assertDatabaseHas('seo_tasks',['seo_page_id'=>$sector->id,'task_type'=>'insufficient_approved_societies']);

        $this->admin()->postJson('/api/admin/seo-autopilot/reports',['period'=>'weekly'])->assertCreated()->assertJsonPath('data.period','weekly');
        $this->assertDatabaseCount('seo_reports',1);
    }

    public function test_autopilot_refuses_to_replace_published_society_seo(): void
    {
        $society=$this->society('Published SEO Society','published-seo-society');
        SocietySeoContent::create(['society_id'=>$society->id,'status'=>'published','seo_title'=>'Published title','published_at'=>now()]);
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $page=SeoPage::where('page_key','society:'.$society->id)->firstOrFail();
        $this->admin()->postJson("/api/admin/seo-autopilot/pages/{$page->id}/drafts")->assertConflict();
        $this->assertSame('published',$society->seoContent()->firstOrFail()->status);
        $this->assertDatabaseCount('seo_drafts',0);
    }

    public function test_gemini_compatible_drafts_remain_review_only_and_grounded(): void
    {
        config(['services.ai_import_provider'=>'gemini','services.gemini.api_key'=>'test-key','services.gemini.model'=>'gemini-test']);
        Http::fake(['https://generativelanguage.googleapis.com/*'=>Http::response(['candidates'=>[['content'=>['parts'=>[['text'=>json_encode(['seo_title'=>'AI Draft Society Gurgaon | SocietyFlats','seo_description'=>'A grounded review of AI Draft Society in Gurgaon using verified SocietyFlats facts and no guaranteed availability.','seo_h1'=>'AI Draft Society Gurgaon','intro_summary'=>'This draft uses only the supplied published SocietyFlats record.','internal_links'=>[['label'=>'Compare societies','url'=>'/compare']],'faq'=>[['question'=>'Is availability guaranteed?','answer'=>'No. Request current verified availability.']],'schema'=>['@context'=>'https://schema.org','@type'=>'WebPage','name'=>'AI Draft Society Gurgaon'],'reason'=>'Improve local intent using verified page data.','risk_warnings'=>['Admin review required.']])]]]]]],200)]);
        $society=$this->society('AI Draft Society','ai-draft-society');
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $page=SeoPage::where('page_key','society:'.$society->id)->firstOrFail();
        $this->admin()->postJson("/api/admin/seo-autopilot/pages/{$page->id}/drafts")
            ->assertCreated()->assertJsonPath('data.status','needs_review')->assertJsonPath('data.generated_by','ai')->assertJsonPath('data.ai_model','gemini:gemini-test');
        $this->assertDatabaseMissing('society_seo_contents',['society_id'=>$society->id]);
        $this->assertTrue($society->fresh()->is_published);
    }

    public function test_generic_landing_draft_requires_separate_approval_and_publication(): void
    {
        $this->society('Sector Page One','sector-page-one','Sector 88');
        $this->society('Sector Page Two','sector-page-two','Sector 88');
        $this->admin()->getJson('/api/admin/seo-autopilot/dashboard')->assertOk();
        $page=SeoPage::where('page_key','sector:sector-88')->firstOrFail();
        $draftId=$this->admin()->postJson("/api/admin/seo-autopilot/pages/{$page->id}/drafts")->assertCreated()->json('data.id');

        $this->getJson('/api/seo/pages/resolve?path=%2Fgurgaon%2Fsector-88')->assertOk()->assertJsonPath('data',null);
        $this->admin()->postJson("/api/admin/seo-autopilot/drafts/{$draftId}/approve")->assertOk()->assertJsonPath('data.status','approved');
        $this->getJson('/api/seo/pages/resolve?path=%2Fgurgaon%2Fsector-88')->assertOk()->assertJsonPath('data',null);
        $this->admin()->postJson("/api/admin/seo-autopilot/drafts/{$draftId}/publish")->assertOk()->assertJsonPath('data.status','published');
        $this->getJson('/api/seo/pages/resolve?path=%2Fgurgaon%2Fsector-88')->assertOk()->assertJsonPath('data.seo_h1','Best Societies in Sector 88, Gurgaon');
        $this->assertDatabaseHas('seo_change_logs',['seo_page_id'=>$page->id,'action'=>'draft_published']);
    }

    public function test_registry_covers_module_pages_and_rwa_pages_and_keywords_map_to_them(): void
    {
        $society=$this->society('Rwa Covered Society','rwa-covered-society');

        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();

        // Module pages are registered so the autopilot can audit and rank their gaps.
        foreach(['guide:sell','guide:nri','guide:builder-floors','guide:builder-portal','feature:ai-advisor','feature:chat','feature:maps','feature:calculator','guide:trust','guide:help'] as $key){
            $this->assertDatabaseHas('seo_pages',['page_key'=>$key,'is_public'=>true]);
        }

        // Every published society gets its public RWA community page registered too.
        $rwa=SeoPage::where('page_key','rwa:'.$society->id)->firstOrFail();
        $this->assertSame('/rwa/rwa-covered-society',$rwa->url);
        $this->assertTrue((bool)$rwa->is_public);
        $this->assertStringContainsString('RWA',$rwa->title);

        // Keyword intelligence seeds module intent keywords mapped to the right pages.
        app(\App\Services\Seo\SeoKeywordIntelligenceService::class)->seed();
        $this->assertDatabaseHas('seo_keywords',['keyword'=>'list flat in gurgaon']);
        $this->assertDatabaseHas('seo_keywords',['keyword'=>'builder floor in gurgaon']);
        $this->assertDatabaseHas('seo_keywords',['keyword'=>'gurgaon rental yield calculator']);
    }

    public function test_nightly_cycle_auto_publishes_safe_landing_drafts_and_skips_everything_else(): void
    {
        $this->society('Autopub Society','autopub-society');

        $safePage=SeoPage::create(['page_key'=>'sector:sector-165','page_type'=>'sector','url'=>'/gurgaon/sector-165','canonical_url'=>'/gurgaon/sector-165','title'=>'Old title','h1'=>'Old H1','is_public'=>true,'is_indexable'=>true,'metadata'=>['sector'=>'Sector 165','societies'=>['Autopub Society','Second Society'],'approved_society_count'=>2]]);
        $eligible=SeoDraft::create(['seo_page_id'=>$safePage->id,'status'=>'needs_review','current_version'=>['seo_title'=>'Old title'],'suggested_version'=>['seo_title'=>'Best Societies in Sector 165, Gurgaon | SocietyFlats','seo_description'=>'Compare verified societies.','seo_h1'=>'Best Societies in Sector 165, Gurgaon'],'confidence_score'=>85,'risk_warnings'=>\App\Services\Seo\SeoDraftService::BOILERPLATE_WARNINGS,'generated_by'=>'system']);

        $lowConfidence=SeoDraft::create(['seo_page_id'=>$safePage->id,'status'=>'needs_review','current_version'=>[],'suggested_version'=>['seo_title'=>'Low confidence'],'confidence_score'=>60,'risk_warnings'=>\App\Services\Seo\SeoDraftService::BOILERPLATE_WARNINGS,'generated_by'=>'system']);
        $warned=SeoDraft::create(['seo_page_id'=>$safePage->id,'status'=>'needs_review','current_version'=>[],'suggested_version'=>['seo_title'=>'Warned'],'confidence_score'=>90,'risk_warnings'=>[...\App\Services\Seo\SeoDraftService::BOILERPLATE_WARNINGS,'AI provider failed; deterministic verified-data fallback used.'],'generated_by'=>'system']);

        $societyModel=Society::where('slug','autopub-society')->firstOrFail();
        $societyPage=SeoPage::create(['page_key'=>'society:'.$societyModel->id,'page_type'=>'society','entity_type'=>Society::class,'entity_id'=>$societyModel->id,'url'=>'/society/autopub-society','canonical_url'=>'/society/autopub-society','is_public'=>true,'is_indexable'=>true]);
        $societyDraft=SeoDraft::create(['seo_page_id'=>$societyPage->id,'status'=>'needs_review','current_version'=>[],'suggested_version'=>['seo_title'=>'Society draft'],'confidence_score'=>95,'risk_warnings'=>\App\Services\Seo\SeoDraftService::BOILERPLATE_WARNINGS,'generated_by'=>'system']);

        $this->admin()->postJson('/api/admin/seo-autopilot/automation/run')->assertOk();

        $this->assertSame('published',$eligible->fresh()->status,'Safe high-confidence landing draft must auto-publish.');
        $this->assertSame('Best Societies in Sector 165, Gurgaon | SocietyFlats',$safePage->fresh()->title,'Approval must write the metadata to the page.');
        $this->assertSame('needs_review',$lowConfidence->fresh()->status,'Below-threshold confidence must stay for review.');
        $this->assertSame('needs_review',$warned->fresh()->status,'Real risk warnings must block auto-publish.');
        $this->assertSame('needs_review',$societyDraft->fresh()->status,'Society drafts must never auto-publish.');
        $this->assertTrue(SeoChangeLog::where('action','draft_published')->where('actor','autopilot')->exists());
        $this->assertGreaterThanOrEqual(1,(int) SeoAutomationRun::latest('id')->first()->summary['drafts_auto_published']);
    }

    public function test_registry_enriches_landing_pages_and_drafts_become_fact_rich_and_linked(): void
    {
        $a=$this->society('Fact Society A','fact-society-a','Sector 77');
        $a->update(['rent_range'=>'₹45,000 - ₹80,000 per month','buy_range'=>'₹1.75 Cr - ₹3.2 Cr','score'=>8.6]);
        $b=$this->society('Fact Society B','fact-society-b','Sector 77');
        $b->update(['rent_range'=>'₹60,000 - ₹95,000 per month','buy_range'=>'₹2.4 Cr - ₹4 Cr','score'=>7.9]);

        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();

        $page=SeoPage::where('page_key','sector:sector-77')->firstOrFail();
        $meta=$page->metadata;
        $this->assertSame('₹45,000',$meta['rent_from'],'Registry must compute the verified rent entry point.');
        $this->assertSame('₹1.75 Cr',$meta['buy_from'],'Registry must compute the verified resale entry point.');
        $this->assertSame('fact-society-a',$meta['top_societies'][0]['slug'],'Top societies must be ranked by score with slugs.');

        $draft=app(\App\Services\Seo\SeoDraftService::class)->generate($page);
        $suggested=$draft->suggested_version;

        $this->assertStringContainsString('2 Best Societies in Sector 77',$suggested['seo_title'],'Title must lead with the verified count.');
        $this->assertStringContainsString('₹45,000',$suggested['seo_description'],'Description must carry the verified rent entry point.');
        $this->assertStringContainsString('/society/fact-society-a',collect($suggested['internal_links'])->pluck('url')->implode(' '),'Drafts must link to real society profiles, not search queries.');
        $this->assertTrue(collect($suggested['faq'])->contains(fn($f)=>str_contains($f['question'],'cost to rent')&&str_contains($f['answer'],'₹45,000')),'FAQ must answer with the verified rent figure.');
        $this->assertTrue(collect($suggested['faq'])->contains(fn($f)=>str_contains($f['question'],'stand out')&&str_contains($f['answer'],'Fact Society A (8.6/10)')),'FAQ must surface top societies with scores.');
    }

    public function test_registry_sync_survives_legacy_rows_holding_urls_under_stale_page_keys(): void
    {
        // Production regression: seo_pages.url is UNIQUE, and old registry versions left rows
        // holding module URLs under stale page_keys. A plain updateOrCreate(page_key) then
        // 500s on the url index during sync (the admin dashboard runs sync inline).
        SeoPage::create(['page_key'=>'legacy:sell-page','page_type'=>'guide','url'=>'/sell','canonical_url'=>'/sell','title'=>'Old sell title','is_public'=>true,'is_indexable'=>true]);
        // And a stale duplicate scenario: current key exists AND another row holds the URL.
        SeoPage::create(['page_key'=>'guide:nri','page_type'=>'guide','url'=>'/nri-old-url','canonical_url'=>'/nri-old-url','is_public'=>true,'is_indexable'=>true]);
        SeoPage::create(['page_key'=>'legacy:nri','page_type'=>'guide','url'=>'/nri-services','canonical_url'=>'/nri-services','is_public'=>true,'is_indexable'=>true]);

        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();

        // The legacy /sell row was adopted under the new key — no duplicate, no crash.
        $this->assertSame(1,SeoPage::where('url','/sell')->count());
        $this->assertSame('guide:sell',SeoPage::where('url','/sell')->firstOrFail()->page_key);
        // The stale duplicate holding /nri-services was removed; the keyed row owns the URL.
        $this->assertSame(1,SeoPage::where('url','/nri-services')->count());
        $this->assertSame('guide:nri',SeoPage::where('url','/nri-services')->firstOrFail()->page_key);
        $this->assertDatabaseMissing('seo_pages',['page_key'=>'legacy:nri']);
    }

    public function test_registry_sync_survives_property_rows_with_society_name_column_set(): void
    {
        // Production regression: Property has BOTH a `society` string column and a society()
        // relation. Magic access returns the column, so the sync crashed with 'Attempt to
        // read property "is_published" on string' the moment a converted listing (which fills
        // the name column) existed.
        $society=$this->society('Prop Sync Society','prop-sync-society');
        \App\Models\Property::create([
            'title'=>'4 BHK Builder Floor for Sale in Prop Sync Society','slug'=>'4-bhk-builder-floor-prop-sync',
            'listing_type'=>'Builder Floor','status'=>'Draft','verified'=>false,
            'society_id'=>$society->id,'society'=>$society->name,'locality'=>'Sector 70','price'=>'₹3.2 Cr',
        ]);

        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();

        $page=SeoPage::where('page_key','like','property:%')->firstOrFail();
        $this->assertFalse((bool)$page->is_public,'Draft/unverified property must not be public.');
        $this->assertSame('Prop Sync Society',($page->metadata)['society'],'Metadata must carry the related society name, not crash on the string column.');
    }

    public function test_rwa_page_drafts_approve_and_publish_without_touching_society_seo(): void
    {
        // Regression: RWA pages link to a Society entity, so their drafts used to be routed
        // into the society-SEO-content path and blocked with "Published society SEO was not
        // overwritten" — making them unapprovable.
        $society=$this->society('Rwa Draft Society','rwa-draft-society');
        SocietySeoContent::create(['society_id'=>$society->id,'status'=>'published','seo_title'=>'Society title stays','seo_description'=>'Original.','seo_h1'=>'Society H1','published_at'=>now()]);

        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();
        $rwaPage=SeoPage::where('page_key','rwa:'.$society->id)->firstOrFail();
        $draft=SeoDraft::create(['seo_page_id'=>$rwaPage->id,'status'=>'needs_review','current_version'=>['seo_title'=>$rwaPage->title],'suggested_version'=>['seo_title'=>'Rwa Draft Society RWA Gurgaon | Community Updates','seo_description'=>'Verified resident updates.','seo_h1'=>'Rwa Draft Society RWA Gurgaon'],'confidence_score'=>82,'risk_warnings'=>\App\Services\Seo\SeoDraftService::BOILERPLATE_WARNINGS,'generated_by'=>'ai']);

        $this->admin()->postJson("/api/admin/seo-autopilot/drafts/{$draft->id}/approve")->assertOk();
        $this->admin()->postJson("/api/admin/seo-autopilot/drafts/{$draft->id}/publish")->assertOk();

        $this->assertSame('published',$draft->fresh()->status);
        $this->assertSame('Rwa Draft Society RWA Gurgaon | Community Updates',$rwaPage->fresh()->title,'Approval must land on the RWA page itself.');
        $this->assertSame('Society title stays',SocietySeoContent::firstOrFail()->seo_title,'The society\'s own published SEO must be untouched.');
    }

    public function test_sitemap_and_missing_data_tasks_auto_resolve(): void
    {
        // A published page present in the live sitemap clears its sitemap follow-up tasks,
        // and a page whose data gaps were filled clears its missing_data task — no human
        // needed to confirm what the machine can verify.
        $society=$this->society('Autoresolve Society','autoresolve-society');
        $society->update(['rera_number'=>'RERA-123','rent_range'=>'₹60,000 - ₹90,000 per month','buy_range'=>'₹2 Cr - ₹3 Cr']);
        SocietySeoContent::create(['society_id'=>$society->id,'status'=>'published','seo_title'=>'T','seo_description'=>'D','seo_h1'=>'H','published_at'=>now()]);
        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();
        $page=SeoPage::where('page_key','society:'.$society->id)->firstOrFail();

        SeoTask::create(['seo_page_id'=>$page->id,'task_type'=>'sitemap_refresh_after_publish','status'=>'open','priority'=>'high','title'=>'Refresh sitemap','description'=>'x','source'=>'workflow']);
        SeoTask::create(['seo_page_id'=>$page->id,'task_type'=>'missing_data','status'=>'open','priority'=>'medium','title'=>'Verify missing rera','description'=>'x','source'=>'data']);

        $base=rtrim((string)config('services.lead_notifications.frontend_url'),'/');
        $allLocs=SeoPage::where('is_public',true)->where('sitemap_included',true)->get()->map(fn($p)=>'<loc>'.$base.$p->canonical_url.'</loc>')->implode('');
        Http::fake([
            $base.'/robots.txt'=>Http::response("User-agent: *\nAllow: /",200),
            $base.'/sitemap.xml'=>Http::response('<urlset>'.$allLocs.'</urlset>',200),
            $base.'/404'=>Http::response('not found',200),
            '*'=>Http::response('ok',200),
        ]);

        app(\App\Services\Seo\SeoTechnicalAuditService::class)->run();
        app(\App\Services\Seo\SeoAutopilotAuditService::class)->audit($page->fresh());

        $this->assertSame('resolved',SeoTask::where('seo_page_id',$page->id)->where('task_type','sitemap_refresh_after_publish')->firstOrFail()->status);
        $this->assertSame('resolved',SeoTask::where('seo_page_id',$page->id)->where('task_type','missing_data')->firstOrFail()->status);
    }

    public function test_auto_publish_kill_switch_keeps_all_drafts_in_review(): void
    {
        $this->society('Killswitch Society','killswitch-society');
        $this->admin()->patchJson('/api/admin/seo-autopilot/automation/settings',['auto_publish_enabled'=>false])->assertOk()->assertJsonPath('data.auto_publish_enabled',false);

        $page=SeoPage::create(['page_key'=>'sector:sector-166','page_type'=>'sector','url'=>'/gurgaon/sector-166','canonical_url'=>'/gurgaon/sector-166','is_public'=>true,'is_indexable'=>true,'metadata'=>['sector'=>'Sector 166','societies'=>['A','B'],'approved_society_count'=>2]]);
        $draft=SeoDraft::create(['seo_page_id'=>$page->id,'status'=>'needs_review','current_version'=>[],'suggested_version'=>['seo_title'=>'Safe'],'confidence_score'=>92,'risk_warnings'=>\App\Services\Seo\SeoDraftService::BOILERPLATE_WARNINGS,'generated_by'=>'system']);

        $this->admin()->postJson('/api/admin/seo-autopilot/automation/run')->assertOk();

        $this->assertSame('needs_review',$draft->fresh()->status);
        $this->assertSame(0,(int) SeoAutomationRun::latest('id')->first()->summary['drafts_auto_published']);
    }

    private function society(string $name,string $slug,string $sector='Sector 65'): Society
    {
        return Society::create(['name'=>$name,'slug'=>$slug,'builder'=>'Verified Builder','sector'=>$sector,'locality'=>$sector,'city'=>'Gurugram','state'=>'Haryana','description'=>'Verified society information for Gurgaon residents considering rent or resale homes.','status'=>'Verified','verification_status'=>'Verified','is_published'=>true,'published_at'=>now(),'score'=>8.2,'amenities'=>['Gym'],'image_alt_text'=>$name.' Gurgaon society']);
    }

    private function admin()
    {
        return $this->withHeaders(['Authorization'=>'Bearer seo-admin-token','X-Admin-Email'=>'seo@example.test']);
    }
}
