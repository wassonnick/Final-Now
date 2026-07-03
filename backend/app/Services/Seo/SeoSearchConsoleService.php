<?php
namespace App\Services\Seo;
use App\Models\SeoPage;
use App\Models\SeoSearchConsoleMetric;
use App\Models\SeoTask;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
class SeoSearchConsoleService
{
    private ?string $resolvedAccessToken=null;

    public function configured(): bool
    {
        return filled(config('services.search_console.site_url'))
            && (filled(config('services.search_console.access_token')) || $this->hasRefreshCredentials());
    }

    public function authenticationMode(): string
    {
        if($this->hasRefreshCredentials())return 'refresh_token';
        if(filled(config('services.search_console.access_token')))return 'access_token';
        return 'not_configured';
    }
    public function import(array $rows): int
    {
        $count=0;
        foreach($rows as $row){$url=(string)($row['page_url']??$row['page']??'');if($url==='')continue;$path=parse_url($url,PHP_URL_PATH)?:'/';$page=SeoPage::where('url',$path)->orWhere('canonical_url',$path)->first();$date=Carbon::parse($row['date']??now())->startOfDay();$metric=SeoSearchConsoleMetric::updateOrCreate(['metric_date'=>$date,'page_url'=>$url,'query'=>(string)($row['query']??'')],['seo_page_id'=>$page?->id,'clicks'=>(int)($row['clicks']??0),'impressions'=>(int)($row['impressions']??0),'ctr'=>(float)($row['ctr']??0),'position'=>isset($row['position'])?(float)$row['position']:null,'metadata'=>$row['metadata']??null]);$this->opportunities($metric);$count++;}
        return $count;
    }
    public function fetch(int $days=28): int
    {
        if(!$this->configured())return 0;$site=rawurlencode((string)config('services.search_console.site_url'));
        $response=Http::withToken($this->accessToken())->timeout(30)->post("https://searchconsole.googleapis.com/webmasters/v3/sites/{$site}/searchAnalytics/query",['startDate'=>now()->subDays($days)->toDateString(),'endDate'=>now()->subDay()->toDateString(),'dimensions'=>['date','page','query'],'rowLimit'=>25000]);
        if(!$response->successful())throw new \RuntimeException('Search Console import failed with HTTP '.$response->status().'.');
        $rows=collect($response->json('rows',[]))->map(fn($r)=>['date'=>$r['keys'][0]??now()->toDateString(),'page_url'=>$r['keys'][1]??'','query'=>$r['keys'][2]??null,'clicks'=>$r['clicks']??0,'impressions'=>$r['impressions']??0,'ctr'=>$r['ctr']??0,'position'=>$r['position']??null])->all();return $this->import($rows);
    }
    private function opportunities(SeoSearchConsoleMetric $m): void
    {
        if($m->impressions>=100&&(float)$m->ctr<0.02)$this->task($m,'low_ctr','high','High impressions, low CTR','Improve title and meta description for this query/page combination.');
        if($m->impressions>=20&&$m->position!==null&&(float)$m->position>=4&&(float)$m->position<=20)$this->task($m,'striking_distance','medium','Ranking in positions 4–20','Strengthen content depth and relevant internal links.');
    }
    private function hasRefreshCredentials(): bool
    {
        return filled(config('services.search_console.client_id'))
            && filled(config('services.search_console.client_secret'))
            && filled(config('services.search_console.refresh_token'));
    }
    private function accessToken(): string
    {
        if($this->resolvedAccessToken!==null)return $this->resolvedAccessToken;
        if(!$this->hasRefreshCredentials())return $this->resolvedAccessToken=(string)config('services.search_console.access_token');

        $response=Http::asForm()->timeout(20)->post('https://oauth2.googleapis.com/token',[
            'client_id'=>(string)config('services.search_console.client_id'),
            'client_secret'=>(string)config('services.search_console.client_secret'),
            'refresh_token'=>(string)config('services.search_console.refresh_token'),
            'grant_type'=>'refresh_token',
        ]);
        $token=$response->json('access_token');
        if(!$response->successful()||!is_string($token)||$token==='')throw new \RuntimeException('Search Console OAuth token refresh failed with HTTP '.$response->status().'.');
        return $this->resolvedAccessToken=$token;
    }
    private function task(SeoSearchConsoleMetric $m,string $type,string $priority,string $title,string $description): void{SeoTask::updateOrCreate(['seo_page_id'=>$m->seo_page_id,'task_type'=>'gsc_'.$type,'status'=>'open'],['priority'=>$priority,'title'=>$title,'description'=>$description,'source'=>'search_console','metadata'=>['query'=>$m->query,'page_url'=>$m->page_url,'impressions'=>$m->impressions,'ctr'=>$m->ctr,'position'=>$m->position]]);}
}
