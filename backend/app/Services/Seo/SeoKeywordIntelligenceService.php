<?php
namespace App\Services\Seo;
use App\Models\SeoKeyword;
use App\Models\SeoPage;
class SeoKeywordIntelligenceService
{
    public function seed(): int
    {
        $count=0;
        foreach(SeoPage::where('is_public',true)->get() as $page){$m=$page->metadata?:[];$base=(string)($m['name']??$m['sector']??$m['builder']??'Gurgaon');$keywords=$this->keywords($page->page_type,$base);foreach($keywords as [$keyword,$intent]){SeoKeyword::updateOrCreate(['keyword'=>mb_strtolower($keyword)],['cluster_type'=>$page->page_type,'intent'=>$intent,'seo_page_id'=>$page->id,'suggested_url'=>$page->url,'source'=>'first_party_page_inventory','status'=>'mapped','metadata'=>['page_key'=>$page->page_key]]);$count++;}}
        return $count;
    }
    private function keywords(string $type,string $base): array{return match($type){
        'society'=>[["{$base} Gurgaon",'society'],["{$base} rent",'rent'],["{$base} resale",'buy'],["is {$base} a good society",'faq']],
        'sector'=>[["best societies in {$base} Gurgaon",'society'],["flats for rent in {$base} Gurgaon",'rent'],["flats for sale in {$base} Gurgaon",'buy'],["{$base} property price trends",'research']],
        'builder'=>[["{$base} societies in Gurgaon",'builder'],["{$base} projects Gurgaon",'builder'],["best {$base} society Gurgaon",'comparison']],
        'rent'=>[['flats for rent in Gurgaon','rent'],['verified rentals Gurgaon','rent']],
        'buy'=>[['flats for sale in Gurgaon','buy'],['resale flats Gurgaon','buy']],
        'comparison'=>[['compare Gurgaon societies','comparison'],['best society in Gurgaon','comparison']],
        default=>[["{$base}",'guide'],["{$base} guide",'research']],};}
}
