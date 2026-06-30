<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Models\VerifiedSocietyImportImage;

class SocietyImportImageService
{
    public function capture(int $jobId, int $societyId, array $data, int $confidence): array
    {
        $created = [];
        if (! empty($data['cover_image_url']) && $this->safeRemoteUrl($data['cover_image_url'])) {
            $created[] = $this->create($jobId,$societyId,'cover','excel_url',$data['cover_image_url'],$data,$confidence,0);
        }
        foreach (array_slice((array) ($data['gallery_image_urls'] ?? []),0,10) as $i=>$url) {
            if ($this->safeRemoteUrl((string) $url)) $created[] = $this->create($jobId,$societyId,'gallery','excel_url',(string)$url,$data,$confidence,$i+1);
        }
        if (! empty($data['google_photo_references']) && is_array($data['google_photo_references'])) {
            foreach (array_slice($data['google_photo_references'],0,10) as $i=>$reference) {
                $created[] = VerifiedSocietyImportImage::create(['import_job_id'=>$jobId,'society_id'=>$societyId,'image_type'=>$i===0?'cover':'gallery','source_type'=>'google_photos','google_photo_reference'=>(string)$reference,'attribution'=>$data['image_attribution']??'Google Places','sort_order'=>$i,'confidence_score'=>80,'needs_review'=>true]);
            }
        }
        return $created;
    }

    public function safeRemoteUrl(string $url): bool
    {
        if (! filter_var($url,FILTER_VALIDATE_URL) || ! in_array(strtolower((string) parse_url($url,PHP_URL_SCHEME)),['http','https'],true)) return false;
        $host = strtolower((string) parse_url($url,PHP_URL_HOST));
        if ($host==='' || $host==='localhost' || str_ends_with($host,'.local')) return false;
        if (filter_var($host,FILTER_VALIDATE_IP) && ! filter_var($host,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE)) return false;
        return true;
    }

    private function create(int $jobId,int $societyId,string $type,string $source,string $url,array $data,int $confidence,int $sort): VerifiedSocietyImportImage
    {
        return VerifiedSocietyImportImage::create(['import_job_id'=>$jobId,'society_id'=>$societyId,'image_type'=>$type,'source_type'=>$source,'source_url'=>$url,'alt_text'=>($data['display_name']??$data['name']).' in Gurugram','attribution'=>$data['image_attribution']??null,'sort_order'=>$sort,'confidence_score'=>$confidence,'needs_review'=>true]);
    }
}
