<?php

namespace App\Services\Seo;

use App\Models\SeoAudit;
use App\Models\SeoPage;
use App\Models\SeoTask;

class SeoAutopilotAuditService
{
    public function run(?SeoPage $only = null): array
    {
        $pages=$only?collect([$only]):SeoPage::all();$scores=[];
        foreach($pages as $page){$audit=$this->audit($page);$scores[]=$audit->score;}
        return ['checked'=>$pages->count(),'average_score'=>$scores?round(array_sum($scores)/count($scores),1):0,'failed'=>collect($scores)->filter(fn($s)=>$s<50)->count()];
    }

    public function audit(SeoPage $page): SeoAudit
    {
        $meta=$page->metadata?:[];$text=mb_strtolower(implode(' ',[$page->title,$page->meta_description,$page->h1]));
        $threshold=in_array($page->page_type,['society','sector','builder','guide'],true)?300:220;
        $checks=[
            'title'=>[$this->length($page->title,30,65),7,'Title is missing or outside 30–65 characters'],
            'meta_description'=>[$this->length($page->meta_description,90,170),7,'Meta description is missing or outside 90–170 characters'],
            'h1'=>[filled($page->h1),7,'H1 is missing'],
            'heading_structure'=>[((int)($meta['heading_count']??0))>=2,5,'Page needs a clearer H2 structure'],
            'content_depth'=>[$page->content_word_count>=$threshold,12,"Content is thin ({$page->content_word_count} words; target {$threshold}+)"] ,
            'local_intent'=>[str_contains($text,'gurgaon')||str_contains($text,'gurugram')||filled($meta['sector']??null),6,'Local Gurgaon intent is weak'],
            'keyword_targeting'=>[$this->keywordSignal($page,$meta),6,'Primary entity/topic is not reflected in title or H1'],
            'internal_links'=>[$page->internal_link_count>=2,7,'Too few internal links'],
            'schema'=>[count((array)$page->schema_types)>0,8,'Schema JSON-LD is missing'],
            'image_alt'=>[$page->image_alt_coverage>=80,6,'Image alt coverage is below 80%'],
            'canonical'=>[filled($page->canonical_url),6,'Canonical URL is missing'],
            'sitemap'=>[!$page->is_indexable||$page->sitemap_included,6,'Indexable page is missing from sitemap'],
            'indexability'=>[!$page->is_public||$page->is_indexable,7,'Public page is unexpectedly noindex'],
            'freshness'=>[$page->freshness_at&&$page->freshness_at->gte(now()->subDays(120)),5,'Content has not been refreshed in 120 days'],
            'conversion_cta'=>[(bool)($meta['has_cta']??false),5,'Decision or lead CTA is missing'],
            'slug_quality'=>[$this->slugQuality($page->url),0,'Slug contains unsafe, duplicated or low-quality segments'],
            'open_graph'=>[(bool)($meta['has_og']??true),0,'Open Graph metadata is missing'],
            'broken_internal_links'=>[((int)($meta['broken_internal_links']??0))===0,0,'One or more internal links are broken'],
        ];
        $breakdown=[];$issues=[];$score=0;
        foreach($checks as $key=>[$passed,$points,$message]){$earned=$passed?$points:0;$score+=$earned;$breakdown[$key]=['score'=>$earned,'max'=>$points,'passed'=>$passed];if(!$passed)$issues[]=['code'=>$key,'message'=>$message,'priority'=>in_array($key,['indexability','sitemap','title','h1'],true)?'high':'medium'];}
        $audit=SeoAudit::create(['seo_page_id'=>$page->id,'score'=>$score,'status'=>$score>=80?'healthy':($score>=50?'warning':'failed'),'breakdown'=>$breakdown,'issues'=>$issues,'checked_at'=>now()]);
        $this->tasks($page,$issues);
        $missingData=(array)($meta['missing_data']??[]);
        foreach($missingData as $field)$this->task($page,'missing_data','medium','Verify missing '.str_replace('_',' ',$field),'A verified source is required before AI may make this claim.',['field'=>$field]);
        // Data arrived since the task was opened — close it automatically.
        if($missingData===[])SeoTask::where('seo_page_id',$page->id)->where('task_type','missing_data')->where('status','open')->update(['status'=>'resolved','resolved_at'=>now()]);
        return $audit;
    }

    private function tasks(SeoPage $page,array $issues): void
    {
        foreach($issues as $issue)$this->task($page,'audit_'.$issue['code'],$issue['priority'],$issue['message'],'Resolve the audit issue and rerun the page score.',['issue_code'=>$issue['code']]);
        $active=array_map(fn($i)=>'audit_'.$i['code'],$issues);
        SeoTask::where('seo_page_id',$page->id)->where('source','audit')->where('status','open')->where('task_type','like','audit_%')->when($active,fn($q)=>$q->whereNotIn('task_type',$active))->update(['status'=>'resolved','resolved_at'=>now()]);
    }

    private function task(SeoPage $page,string $type,string $priority,string $title,string $description,array $metadata=[]): void
    {
        SeoTask::updateOrCreate(['seo_page_id'=>$page->id,'task_type'=>$type,'status'=>'open'],['priority'=>$priority,'title'=>$title,'description'=>$description,'source'=>str_starts_with($type,'audit_')?'audit':'data','metadata'=>$metadata]);
    }
    private function length(?string $v,int $min,int $max): bool{$n=mb_strlen(trim((string)$v));return $n>=$min&&$n<=$max;}
    /**
     * Keyword targeting checks the page's actual mapped keywords (punctuation-insensitive),
     * falling back to the entity name — titles must reflect what people really search for.
     */
    private function keywordSignal(SeoPage $p,array $m): bool
    {
        $hay=$this->normalizeText($p->title.' '.$p->h1);
        foreach(\App\Models\SeoKeyword::where('seo_page_id',$p->id)->limit(6)->pluck('keyword') as $keyword){
            if($keyword!==''&&str_contains($hay,$this->normalizeText((string)$keyword)))return true;
        }
        $needle=$this->normalizeText((string)($m['name']??$m['sector']??$m['builder']??$p->page_type));
        return $needle!==''&&str_contains($hay,$needle);
    }
    private function normalizeText(string $v): string{return trim((string)preg_replace('/\s+/',' ',(string)preg_replace('/[^a-z0-9\s]/',' ',mb_strtolower($v))));}
    private function slugQuality(string $url): bool{$path=(string)(parse_url($url,PHP_URL_PATH)?:'/');return $path==='/'||((bool)preg_match('#^/[a-z0-9][a-z0-9/-]*$#',$path)&&!str_contains($path,'//')&&!preg_match('#([a-z0-9-]+)/\1(?:/|$)#',$path));}
}
