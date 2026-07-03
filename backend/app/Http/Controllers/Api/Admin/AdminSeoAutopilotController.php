<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SeoAudit;
use App\Models\SeoDraft;
use App\Models\SeoKeyword;
use App\Models\SeoPage;
use App\Models\SeoReport;
use App\Models\SeoSearchConsoleMetric;
use App\Models\SeoTask;
use App\Services\Seo\SeoAutopilotAuditService;
use App\Services\Seo\SeoDraftService;
use App\Services\Seo\SeoKeywordIntelligenceService;
use App\Services\Seo\SeoPageRegistryService;
use App\Services\Seo\SeoReportService;
use App\Services\Seo\SeoSearchConsoleService;
use App\Services\Seo\SeoTechnicalAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSeoAutopilotController extends Controller
{
    public function __construct(private SeoPageRegistryService $registry,private SeoAutopilotAuditService $audits,private SeoKeywordIntelligenceService $keywords,private SeoSearchConsoleService $searchConsole,private SeoReportService $reports,private SeoDraftService $drafts,private SeoTechnicalAuditService $technical){}

    public function dashboard(): JsonResponse
    {
        $this->registry->sync();if(!SeoAudit::exists())$this->audits->run();$latest=SeoAudit::whereIn('id',SeoAudit::selectRaw('MAX(id)')->groupBy('seo_page_id'))->get();
        $duplicateTitles=SeoPage::whereNotNull('title')->selectRaw('title, COUNT(*) aggregate')->groupBy('title')->havingRaw('COUNT(*) > 1')->count();$duplicateMeta=SeoPage::whereNotNull('meta_description')->selectRaw('meta_description, COUNT(*) aggregate')->groupBy('meta_description')->havingRaw('COUNT(*) > 1')->count();
        return response()->json(['status'=>'ok','data'=>['summary'=>['total_pages'=>SeoPage::count(),'public_pages'=>SeoPage::where('is_public',true)->count(),'average_score'=>round((float)$latest->avg('score'),1),'missing_title'=>SeoPage::whereNull('title')->orWhere('title','')->count(),'missing_meta'=>SeoPage::whereNull('meta_description')->orWhere('meta_description','')->count(),'missing_h1'=>SeoPage::whereNull('h1')->orWhere('h1','')->count(),'missing_schema'=>SeoPage::whereNull('schema_types')->count(),'thin_content'=>SeoPage::where('content_word_count','<',300)->count(),'duplicate_titles'=>$duplicateTitles,'duplicate_meta'=>$duplicateMeta,'missing_internal_links'=>SeoPage::where('internal_link_count','<',2)->count(),'pending_drafts'=>SeoDraft::where('status','needs_review')->count(),'failed_checks'=>$latest->where('status','failed')->count(),'technical_issues'=>SeoTask::where('status','open')->where('source','technical')->count(),'open_tasks'=>SeoTask::where('status','open')->count()],'sitemap'=>['included'=>SeoPage::where('sitemap_included',true)->count(),'public_not_in_sitemap'=>SeoPage::where('is_public',true)->where('is_indexable',true)->where('sitemap_included',false)->count()],'search_console'=>['configured'=>$this->searchConsole->configured(),'authentication'=>$this->searchConsole->authenticationMode(),'clicks_28d'=>SeoSearchConsoleMetric::where('metric_date','>=',now()->subDays(28))->sum('clicks'),'impressions_28d'=>SeoSearchConsoleMetric::where('metric_date','>=',now()->subDays(28))->sum('impressions')],'opportunities'=>SeoTask::with('page')->where('status','open')->orderByRaw("CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")->latest()->limit(12)->get(),'quick_actions'=>[['id'=>'audit','label'=>'Run technical + page audit'],['id'=>'keywords','label'=>'Refresh keyword clusters'],['id'=>'report','label'=>'Generate weekly report'],['id'=>'gsc','label'=>'Import Search Console data']]]]);
    }

    public function pages(Request $request): JsonResponse{$query=SeoPage::with('latestAudit');foreach(['page_type','is_public','is_indexable'] as $filter)if($request->filled($filter))$query->where($filter,$request->input($filter));if($request->filled('status'))$query->whereHas('latestAudit',fn($q)=>$q->where('status',$request->input('status')));if($request->filled('search'))$query->where(fn($q)=>$q->where('url','like','%'.$request->input('search').'%')->orWhere('title','like','%'.$request->input('search').'%'));return response()->json(['status'=>'ok','data'=>$query->orderBy('page_type')->orderBy('url')->paginate(min($request->integer('per_page',50),100))]);}
    public function runAudit(Request $request): JsonResponse{$this->registry->sync();$page=$request->filled('page_id')?SeoPage::findOrFail($request->integer('page_id')):null;$result=$this->audits->run($page);if(!$page)$result['technical']=$this->technical->run();return response()->json(['status'=>'ok','message'=>'SEO audit completed. No content was published.','data'=>$result]);}
    public function tasks(Request $request): JsonResponse{$q=SeoTask::with('page');if($request->filled('status'))$q->where('status',$request->input('status'));if($request->filled('priority'))$q->where('priority',$request->input('priority'));return response()->json(['status'=>'ok','data'=>$q->latest()->paginate(min($request->integer('per_page',50),100))]);}
    public function updateTask(Request $request,SeoTask $task): JsonResponse{$data=$request->validate(['status'=>['required',Rule::in(['open','in_progress','resolved','dismissed'])],'priority'=>['nullable',Rule::in(['low','medium','high','critical'])]]);$task->update($data+['resolved_at'=>in_array($data['status'],['resolved','dismissed'],true)?now():null]);return response()->json(['status'=>'ok','data'=>$task->fresh()]);}
    public function keywordList(Request $request): JsonResponse{$q=SeoKeyword::with('page');if($request->filled('cluster_type'))$q->where('cluster_type',$request->input('cluster_type'));return response()->json(['status'=>'ok','data'=>$q->orderBy('cluster_type')->orderBy('keyword')->paginate(min($request->integer('per_page',100),200))]);}
    public function seedKeywords(): JsonResponse{return response()->json(['status'=>'ok','message'=>'Keyword clusters refreshed from verified page inventory.','count'=>$this->keywords->seed()]);}
    public function importSearchConsole(Request $request): JsonResponse{$data=$request->validate(['rows'=>['required','array','max:25000'],'rows.*.page_url'=>['required','url'],'rows.*.date'=>['nullable','date'],'rows.*.query'=>['nullable','string','max:500'],'rows.*.clicks'=>['nullable','integer','min:0'],'rows.*.impressions'=>['nullable','integer','min:0'],'rows.*.ctr'=>['nullable','numeric','min:0'],'rows.*.position'=>['nullable','numeric','min:0']]);return response()->json(['status'=>'ok','message'=>'Search Console metrics imported and opportunities created.','count'=>$this->searchConsole->import($data['rows'])]);}
    public function fetchSearchConsole(): JsonResponse{try{$count=$this->searchConsole->fetch();return response()->json(['status'=>'ok','message'=>$count?'Search Console metrics imported.':'Search Console is not configured; no data changed.','count'=>$count,'configured'=>$this->searchConsole->configured()]);}catch(\Throwable $e){report($e);return response()->json(['status'=>'error','message'=>'Search Console import failed. Existing metrics were preserved.'],422);}}
    public function draftList(Request $request): JsonResponse{$q=SeoDraft::with('page');if($request->filled('status'))$q->where('status',$request->input('status'));return response()->json(['status'=>'ok','data'=>$q->latest()->paginate(min($request->integer('per_page',50),100))]);}
    public function generateDraft(SeoPage $page): JsonResponse{try{$draft=$this->drafts->generate($page);return response()->json(['status'=>'ok','message'=>'SEO draft generated for admin review. Nothing was published.','data'=>$draft->load('page')],201);}catch(\InvalidArgumentException $e){return response()->json(['status'=>'error','message'=>$e->getMessage()],str_starts_with($e->getMessage(),'Published')?409:422);}}
    public function updateDraft(Request $request,SeoDraft $draft): JsonResponse
    {
        $data=$request->validate(['seo_title'=>['nullable','string','max:65'],'seo_description'=>['nullable','string','max:170'],'seo_h1'=>['nullable','string','max:140'],'intro_summary'=>['nullable','string','max:3000'],'reason'=>['nullable','string','max:2000']]);
        try{return response()->json(['status'=>'ok','message'=>'Draft updated for review. Nothing was published.','data'=>$this->drafts->update($draft,$data,$this->actor($request))->load('page')]);}catch(\InvalidArgumentException $e){return response()->json(['status'=>'error','message'=>$e->getMessage()],422);}
    }
    public function approveDraft(Request $request,SeoDraft $draft): JsonResponse{try{$result=$this->drafts->approve($draft,$this->actor($request));return response()->json(['status'=>'ok','message'=>'Draft approved and applied to reviewable SEO fields. It is not public until explicitly published.','data'=>$result->load('page')]);}catch(\InvalidArgumentException $e){return response()->json(['status'=>'error','message'=>$e->getMessage()],422);}}
    public function rejectDraft(Request $request,SeoDraft $draft): JsonResponse{$data=$request->validate(['reason'=>['nullable','string','max:2000']]);return response()->json(['status'=>'ok','message'=>'SEO draft rejected. No public content changed.','data'=>$this->drafts->reject($draft,$this->actor($request),$data['reason']??null)->load('page')]);}
    public function publishDraft(Request $request,SeoDraft $draft): JsonResponse{try{return response()->json(['status'=>'ok','message'=>'Approved SEO content published. Sitemap refresh remains a tracked validation task.','data'=>$this->drafts->publish($draft,$this->actor($request))->load('page')]);}catch(\InvalidArgumentException $e){return response()->json(['status'=>'error','message'=>$e->getMessage()],422);}}
    public function reportList(): JsonResponse{return response()->json(['status'=>'ok','data'=>SeoReport::latest('generated_at')->limit(24)->get()]);}
    public function generateReport(Request $request): JsonResponse{$data=$request->validate(['period'=>['nullable',Rule::in(['daily','weekly','monthly'])]]);return response()->json(['status'=>'ok','message'=>'SEO report generated.','data'=>$this->reports->generate($data['period']??'weekly')],201);}
    private function actor(Request $request): string{return (string)($request->header('X-Admin-Email')?:'admin');}
}
