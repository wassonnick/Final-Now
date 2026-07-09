<?php
namespace App\Services\Seo;
use App\Models\SeoPage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
class SeoAutopilotAiService
{
    public function available(): bool{return $this->provider()==='claude'?filled(config('services.claude.api_key')):filled(config('services.gemini.api_key'));}
    public function model(): string{return $this->provider().':'.(string)config('services.'.$this->provider().'.model');}
    public function improve(SeoPage $page,array $fallback,array $intel=[]): array
    {
        if(!$this->available())return $fallback;$prompt=$this->prompt($page,$fallback,$intel);$raw=$this->provider()==='claude'?$this->claude($prompt):$this->gemini($prompt);return $this->normalize($raw,$fallback);
    }
    private function prompt(SeoPage $page,array $fallback,array $intel=[]): string
    {
        $facts=['page_type'=>$page->page_type,'url'=>$page->url,'current_title'=>$page->title,'current_description'=>$page->meta_description,'current_h1'=>$page->h1,'verified_metadata'=>$page->metadata?:[],'content_word_count'=>$page->content_word_count];
        $targeting='';
        if(!empty($intel['target_keywords']))$targeting.="\nTARGET KEYWORDS (work the primary one naturally into seo_title and seo_h1; use others only where natural): ".json_encode($intel['target_keywords'],JSON_UNESCAPED_UNICODE);
        if(!empty($intel['search_console_queries']))$targeting.="\nREAL SEARCH QUERIES this page already appears for (align title/description wording with the highest-impression ones): ".json_encode($intel['search_console_queries'],JSON_UNESCAPED_UNICODE);
        if(!empty($intel['open_audit_issues']))$targeting.="\nOPEN AUDIT ISSUES to fix in this draft: ".json_encode($intel['open_audit_issues'],JSON_UNESCAPED_UNICODE);
        return "Improve this SocietyFlats SEO draft using ONLY the supplied verified facts. Never invent prices, distances, RERA, possession, amenities, availability, builder facts or legal claims. If a fact is absent, omit it and add a risk warning. Titles must be under 65 characters and earn the click with real specifics from verified_metadata (counts, rent_from, buy_from, scores) rather than generic phrasing; meta descriptions under 165 characters with one concrete fact and a clear next step. Prefer the real society profile URLs already present in the fallback internal_links. Return JSON only with keys seo_title, seo_description, seo_h1, intro_summary, internal_links, faq, schema, reason, risk_warnings. Internal links must be relative SocietyFlats paths. Schema types are limited to WebPage, BreadcrumbList and FAQPage. Nothing is published automatically.".$targeting."\nFACTS: ".json_encode($facts,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)."\nSAFE FALLBACK: ".json_encode($fallback,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    }
    private function gemini(string $prompt): array
    {
        $model=(string)(config('services.gemini.model')?:'gemini-2.0-flash');$response=Http::timeout(45)->withHeaders(['x-goog-api-key'=>(string)config('services.gemini.api_key'),'Content-Type'=>'application/json'])->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",['contents'=>[['role'=>'user','parts'=>[['text'=>$prompt]]]],'generationConfig'=>['temperature'=>0.1,'responseMimeType'=>'application/json']]);if(!$response->successful())throw new \RuntimeException('Gemini SEO Autopilot request failed with HTTP '.$response->status().'.');$text=collect(data_get($response->json(),'candidates.0.content.parts',[]))->pluck('text')->filter()->join("\n");return $this->decode($text);
    }
    private function claude(string $prompt): array
    {
        $client=new \Anthropic\Client(apiKey:(string)config('services.claude.api_key'));$message=$client->messages->create(maxTokens:3500,messages:[['role'=>'user','content'=>$prompt]],model:(string)(config('services.claude.model')?:'claude-haiku-4-5'),system:'Return factual admin-reviewable SocietyFlats SEO JSON from supplied facts only.');$text=collect($message->content)->filter(fn($b)=>$b->type==='text')->map(fn($b)=>$b->text)->join("\n");return $this->decode($text);
    }
    private function decode(string $text): array{$clean=trim(Str::of($text)->replaceMatches('/^```(?:json)?\s*|\s*```$/i','')->toString());$data=json_decode($clean,true);if(!is_array($data))throw new \RuntimeException('AI returned invalid SEO Autopilot JSON.');return $data;}
    private function normalize(array $raw,array $fallback): array
    {
        $out=$fallback;foreach(['seo_title'=>65,'seo_description'=>170,'seo_h1'=>120,'intro_summary'=>1200] as $key=>$max)if(filled($raw[$key]??null))$out[$key]=Str::limit(strip_tags((string)$raw[$key]),$max,'');
        $out['internal_links']=collect(is_array($raw['internal_links']??null)?$raw['internal_links']:[])->map(function($i){if(!is_array($i))return null;$label=trim(strip_tags((string)($i['label']??$i['anchor']??'')));$url=trim((string)($i['url']??$i['path']??''));return $label!==''&&preg_match('#^/[a-z0-9][a-z0-9/_?=&.%-]*$#i',$url)?['label'=>$label,'url'=>$url]:null;})->filter()->take(12)->values()->all()?:$fallback['internal_links'];
        $out['faq']=collect(is_array($raw['faq']??null)?$raw['faq']:[])->filter(fn($i)=>is_array($i)&&filled($i['question']??null)&&filled($i['answer']??null))->map(fn($i)=>['question'=>Str::limit(strip_tags((string)$i['question']),300,''),'answer'=>Str::limit(strip_tags((string)$i['answer']),2000,'')])->take(8)->values()->all()?:$fallback['faq'];
        $schema=is_array($raw['schema']??null)?$raw['schema']:[];$type=(string)($schema['@type']??'');$out['schema']=in_array($type,['WebPage','BreadcrumbList','FAQPage'],true)?$schema:$fallback['schema'];$out['reason']=filled($raw['reason']??null)?Str::limit(strip_tags((string)$raw['reason']),1000,''):'AI improved a verified-data fallback draft.';$out['risk_warnings']=collect(is_array($raw['risk_warnings']??null)?$raw['risk_warnings']:[])->map(fn($v)=>Str::limit(strip_tags((string)$v),500,''))->filter()->take(12)->values()->all();return $out;
    }
    private function provider(): string{return strtolower((string)config('services.ai_import_provider'))==='gemini'?'gemini':'claude';}
}
