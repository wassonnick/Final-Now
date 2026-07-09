<?php
namespace App\Services\Seo;
use App\Models\SeoAudit;
use App\Models\SeoChangeLog;
use App\Models\SeoDraft;
use App\Models\SeoPage;
use App\Models\SeoReport;
use App\Models\SeoSearchConsoleMetric;
use App\Models\SeoTask;
class SeoReportService
{
    public function generate(string $period='weekly'): SeoReport
    {
        [$start,$end]=match($period){'daily'=>[today(),today()],'monthly'=>[now()->startOfMonth(),now()->endOfMonth()],default=>[now()->startOfWeek(),now()->endOfWeek()]};
        $latest=SeoAudit::query()->whereIn('id',SeoAudit::selectRaw('MAX(id)')->groupBy('seo_page_id'))->get();
        $averageScore=round((float)$latest->avg('score'),1);
        $previous=SeoReport::where('period',$period)->where('period_start','<',$start)->latest('period_start')->first();
        $summary=['pages'=>SeoPage::count(),'public_pages'=>SeoPage::where('is_public',true)->count(),'average_score'=>$averageScore,
            // Movement vs the previous report of this period — the result-oriented view.
            'average_score_delta'=>$previous?round($averageScore-(float)($previous->summary['average_score']??0),1):null,
            'published_in_period'=>SeoChangeLog::where('action','draft_published')->whereBetween('created_at',[$start,$end])->count(),
            'auto_published_in_period'=>SeoChangeLog::where('action','draft_published')->where('actor','autopilot')->whereBetween('created_at',[$start,$end])->count(),
            'keywords_mapped'=>\App\Models\SeoKeyword::where('status','mapped')->count(),
            'failed_checks'=>$latest->where('status','failed')->count(),'open_tasks'=>SeoTask::where('status','open')->count(),'high_priority_tasks'=>SeoTask::where('status','open')->where('priority','high')->count(),'pending_drafts'=>SeoDraft::where('status','needs_review')->count(),'changes'=>SeoChangeLog::whereBetween('created_at',[$start,$end])->count(),'search_console'=>$this->searchConsoleTotals($start,$end),'top_opportunities'=>SeoTask::with('page')->where('status','open')->orderByRaw("CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")->limit(10)->get()->toArray()];
        return SeoReport::create(['period'=>$period,'period_start'=>$start,'period_end'=>$end,'summary'=>$summary,'status'=>'generated','generated_at'=>now()]);
    }

    /**
     * Prefer the query='' totals rows from the dual-pass import (they match the GSC UI);
     * Google drops anonymized queries from query-sliced rows, which undercounts headline
     * numbers. Falls back to summing everything for pre-dual-pass data.
     *
     * @return array{clicks:int,impressions:int}
     */
    private function searchConsoleTotals($start,$end): array
    {
        $window=fn()=>SeoSearchConsoleMetric::whereBetween('metric_date',[$start,$end]);
        $hasTotals=$window()->where('query','')->exists();

        return [
            'clicks'=>(int)$window()->when($hasTotals,fn($q)=>$q->where('query',''))->sum('clicks'),
            'impressions'=>(int)$window()->when($hasTotals,fn($q)=>$q->where('query',''))->sum('impressions'),
        ];
    }
}
