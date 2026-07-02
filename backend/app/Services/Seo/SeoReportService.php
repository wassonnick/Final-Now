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
        $summary=['pages'=>SeoPage::count(),'public_pages'=>SeoPage::where('is_public',true)->count(),'average_score'=>round((float)$latest->avg('score'),1),'failed_checks'=>$latest->where('status','failed')->count(),'open_tasks'=>SeoTask::where('status','open')->count(),'high_priority_tasks'=>SeoTask::where('status','open')->where('priority','high')->count(),'pending_drafts'=>SeoDraft::where('status','needs_review')->count(),'changes'=>SeoChangeLog::whereBetween('created_at',[$start,$end])->count(),'search_console'=>['clicks'=>SeoSearchConsoleMetric::whereBetween('metric_date',[$start,$end])->sum('clicks'),'impressions'=>SeoSearchConsoleMetric::whereBetween('metric_date',[$start,$end])->sum('impressions')],'top_opportunities'=>SeoTask::with('page')->where('status','open')->orderByRaw("CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")->limit(10)->get()->toArray()];
        return SeoReport::create(['period'=>$period,'period_start'=>$start,'period_end'=>$end,'summary'=>$summary,'status'=>'generated','generated_at'=>now()]);
    }
}
