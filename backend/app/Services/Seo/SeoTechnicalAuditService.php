<?php
namespace App\Services\Seo;
use App\Models\SeoPage;
use App\Models\SeoTask;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
class SeoTechnicalAuditService
{
    public function run(): array
    {
        $base=rtrim((string)config('services.lead_notifications.frontend_url','https://www.societyflats.com'),'/');$results=['checked'=>0,'failed'=>0,'issues'=>[]];
        try{$robots=Http::timeout(15)->get($base.'/robots.txt');$this->check($results,'robots_accessible',$robots->successful()&&str_contains(mb_strtolower($robots->body()),'user-agent'),'robots.txt is unavailable or invalid','critical');}catch(\Throwable){$this->check($results,'robots_accessible',false,'robots.txt could not be reached','critical');}
        try{$sitemap=Http::timeout(20)->get($base.'/sitemap.xml');$body=$sitemap->body();$healthy=$sitemap->successful()&&str_contains($body,'<urlset');$this->check($results,'sitemap_accessible',$healthy,'sitemap.xml is unavailable or invalid','critical');if($healthy){$expected=SeoPage::where('is_public',true)->where('is_indexable',true)->where('sitemap_included',true)->get();foreach($expected as $page){if(!str_contains($body,'<loc>'.$base.$page->canonical_url.'</loc>')){$results['issues'][]='Sitemap missing '.$page->canonical_url;$results['failed']++;SeoTask::updateOrCreate(['seo_page_id'=>$page->id,'task_type'=>'technical_sitemap_missing','status'=>'open'],['priority'=>'high','title'=>'Public page missing from live sitemap','description'=>$page->canonical_url.' was expected in the live sitemap.','source'=>'technical']);}}}}catch(\Throwable){$this->check($results,'sitemap_accessible',false,'sitemap.xml could not be reached','critical');}
        $pages=SeoPage::where('is_public',true)->limit(100)->get();
        try{$responses=Http::pool(fn(Pool $pool)=>$pages->mapWithKeys(fn($page)=>[(string)$page->id=>$pool->as((string)$page->id)->timeout(15)->get($base.$page->url)])->all());foreach($pages as $page){$response=$responses[(string)$page->id]??null;$results['checked']++;if(!$response||!$response->successful()){$results['failed']++;$results['issues'][]='Broken public URL '.$page->url;SeoTask::updateOrCreate(['seo_page_id'=>$page->id,'task_type'=>'technical_broken_url','status'=>'open'],['priority'=>'critical','title'=>'Public page returns an error','description'=>$page->url.' did not return a successful response.','source'=>'technical']);}else{SeoTask::where('seo_page_id',$page->id)->where('task_type','technical_broken_url')->where('status','open')->update(['status'=>'resolved','resolved_at'=>now()]);}}
        }catch(\Throwable){$this->check($results,'public_url_scan',false,'Public URL scan could not complete','high');}
        try{$notFound=Http::timeout(15)->get($base.'/404');$body=mb_strtolower($notFound->body());$this->check($results,'404_page',$notFound->successful()&&(str_contains($body,'noindex')||str_contains($body,'not found')),'404 route lacks a clear noindex/not-found response','medium');}catch(\Throwable){$this->check($results,'404_page',false,'404 route could not be reached','medium');}
        return $results;
    }
    private function check(array &$results,string $type,bool $passed,string $message,string $priority): void{$results['checked']++;if($passed){SeoTask::whereNull('seo_page_id')->where('task_type','technical_'.$type)->where('status','open')->update(['status'=>'resolved','resolved_at'=>now()]);return;}$results['failed']++;$results['issues'][]=$message;SeoTask::updateOrCreate(['seo_page_id'=>null,'task_type'=>'technical_'.$type,'status'=>'open'],['priority'=>$priority,'title'=>$message,'description'=>'Automated site-level technical SEO check failed. Verify deployment and rerun the audit.','source'=>'technical']);}
}
