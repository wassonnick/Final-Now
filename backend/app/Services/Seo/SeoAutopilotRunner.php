<?php

namespace App\Services\Seo;

use App\Models\SeoAutomationRun;
use App\Models\SeoAutomationSetting;
use App\Models\SeoDraft;
use App\Models\SeoPage;
use App\Models\SeoTask;
use App\Models\Society;
use Illuminate\Support\Facades\Cache;

class SeoAutopilotRunner
{
    public function __construct(
        private SeoPageRegistryService $registry,
        private SeoAutopilotAuditService $audits,
        private SeoTechnicalAuditService $technical,
        private SeoKeywordIntelligenceService $keywords,
        private SeoSearchConsoleService $searchConsole,
        private SeoDraftService $drafts,
        private SeoReportService $reports,
    ) {}

    public function settings(): SeoAutomationSetting
    {
        return SeoAutomationSetting::firstOrCreate([], [
            'enabled'=>true, 'audit_enabled'=>true, 'technical_checks_enabled'=>true,
            'search_console_enabled'=>true, 'keyword_refresh_enabled'=>true,
            'draft_generation_enabled'=>true, 'reports_enabled'=>true,
            'drafts_per_run'=>5, 'timezone'=>'Asia/Kolkata',
        ]);
    }

    public function run(string $trigger = 'scheduled'): SeoAutomationRun
    {
        $settings=$this->settings();
        if(!$settings->enabled)throw new \InvalidArgumentException('SEO Autopilot is paused. Enable it before running a cycle.');

        $lock=Cache::lock('seo-autopilot-cycle', 1800);
        if(!$lock->get())throw new \RuntimeException('An SEO Autopilot cycle is already running.');

        $run=SeoAutomationRun::create(['trigger'=>$trigger,'status'=>'running','started_at'=>now()]);
        $summary=['pages_registered'=>0,'pages_audited'=>0,'average_score'=>0,'technical_failures'=>0,'keywords_refreshed'=>0,'search_console_rows'=>0,'drafts_generated'=>0,'report_id'=>null,'warnings'=>[]];

        try {
            $summary['pages_registered']=$this->registry->sync();

            if($settings->audit_enabled){
                $audit=$this->audits->run();
                $summary['pages_audited']=$audit['checked'];
                $summary['average_score']=$audit['average_score'];
            }
            if($settings->technical_checks_enabled){
                $technical=$this->technical->run();
                $summary['technical_failures']=$technical['failed'];
            }
            if($settings->keyword_refresh_enabled)$summary['keywords_refreshed']=$this->keywords->seed();
            if($settings->search_console_enabled&&$this->searchConsole->configured()){
                try{$summary['search_console_rows']=$this->searchConsole->fetch();}
                catch(\Throwable $e){report($e);$summary['warnings'][]='Search Console import failed; existing metrics were preserved.';}
            }
            if($settings->draft_generation_enabled)$summary['drafts_generated']=$this->generateOpportunityDrafts($settings->drafts_per_run);
            if($settings->reports_enabled)$summary['report_id']=$this->reports->generate('daily')->id;

            $status=$summary['warnings']||$summary['technical_failures']?'completed_with_warnings':'completed';
            $run->update(['status'=>$status,'finished_at'=>now(),'summary'=>$summary]);
        } catch (\Throwable $e) {
            report($e);
            $run->update(['status'=>'failed','finished_at'=>now(),'summary'=>$summary,'error'=>$e->getMessage()]);
            throw $e;
        } finally {
            $lock->release();
        }

        return $run->fresh();
    }

    private function generateOpportunityDrafts(int $limit): int
    {
        $types=['audit_title','audit_meta_description','audit_h1','audit_content_depth','audit_internal_links','gsc_low_ctr','gsc_striking_distance'];
        $pageIds=SeoTask::query()->where('status','open')->whereIn('task_type',$types)
            ->whereNotNull('seo_page_id')->orderByRaw("CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")
            ->pluck('seo_page_id')->unique();
        $generated=0;
        foreach($pageIds as $pageId){
            if($generated>=max(0,min($limit,20)))break;
            $page=SeoPage::find($pageId);
            if(!$page||!$page->is_public||SeoDraft::where('seo_page_id',$page->id)->whereIn('status',['needs_review','approved'])->exists())continue;
            if($page->entity_type===Society::class&&$page->entity_id&&(($page->metadata?:[])['seo_status']??null)==='published')continue;
            try{$this->drafts->generate($page);$generated++;}
            catch(\InvalidArgumentException){continue;}
        }
        return $generated;
    }

    public function marketingPlan(): array
    {
        return [
            ['id'=>'foundation','title'=>'Technical foundation','outcome'=>'Keep every public page crawlable, indexable, canonical and present in the sitemap.','cadence'=>'Daily','automation'=>['Page and technical audits','Broken URL, robots and sitemap monitoring','Automatic issue resolution after recovery'],'kpis'=>['Healthy pages','Technical failures','Sitemap coverage']],
            ['id'=>'demand','title'=>'Capture existing demand','outcome'=>'Turn Search Console impressions into more qualified Gurgaon clicks.','cadence'=>'Daily','automation'=>['Search Console import','Low-CTR and striking-distance detection','Opportunity scoring and metadata drafts'],'kpis'=>['Clicks','CTR','Top-10 queries']],
            ['id'=>'authority','title'=>'Build topical authority','outcome'=>'Strengthen society, sector, builder, rental and resale clusters with verified facts.','cadence'=>'Weekly','automation'=>['Keyword-to-page mapping','Thin-content detection','Internal-link and schema recommendations'],'kpis'=>['Mapped keywords','Content depth','Internal links']],
            ['id'=>'conversion','title'=>'Convert organic visits','outcome'=>'Move search visitors from research to shortlist, availability request and site visit.','cadence'=>'Continuous','automation'=>['CTA coverage audits','Decision-intent page monitoring','Weekly and monthly performance reports'],'kpis'=>['Organic leads','Shortlist starts','Site-visit requests']],
        ];
    }
}
