<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Models\Society;
use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportImage;
use App\Models\VerifiedSocietyImportSource;
use Illuminate\Support\Facades\DB;

class SocietyImportLayerService
{
    private const LAYERS = [
        'rera' => ['rera_number','rera_url','legal_name','promoter_name','rera_status','registration_date','registration_validity','certificate_url','oc_cc_pcc_url','source_url','notes'],
        'builder' => ['builder_name','builder_url','official_project_url','brochure_url','project_status','possession_status','possession_date','configurations','land_area','tower_count','unit_count','amenities','description','cover_image_url','gallery_image_urls','notes'],
        'nearby' => ['nearby_schools','nearby_hospitals','nearby_metro','nearby_office_hubs','nearby_malls','nearby_markets','commute_notes','source_url','notes'],
        'market' => ['rent_min','rent_max','rent_range','resale_min','resale_max','buy_range','average_rent','average_sale_price','price_per_sqft','rental_yield','maintenance_charges','market_notes','source_url','source_type','confidence_score','notes'],
    ];

    public function __construct(
        private SocietyImportNormalizer $normalizer,
        private SocietyImportConfidenceScorer $scorer,
        private SocietyImportSourceRecorder $recorder,
        private SocietyImportProfileApplier $profileApplier,
        private SocietyImportImageService $images,
    ) {}

    public function import(Society $society, string $layer, array $input): array
    {
        $this->assertImporterDraft($society);
        if (! isset(self::LAYERS[$layer])) throw new \InvalidArgumentException('Unknown source layer.');

        $normalized=$this->normalizer->normalize($input);
        $fields=[];
        foreach(self::LAYERS[$layer] as $field) {
            if(!array_key_exists($field,$normalized)||$this->empty($normalized[$field]))continue;
            $fields[$field]=$normalized[$field];
        }
        if($layer==='builder'&&isset($fields['description'])&&filled($society->description)&&!($input['replace_description']??false))unset($fields['description']);
        if($fields===[])throw new \InvalidArgumentException('Add at least one source-backed field before importing this layer.');

        [$sourceType,$confidence,$sourceUrl]=$this->sourcePolicy($layer,$fields,$input);
        $jobId=$this->jobId($society);

        return DB::transaction(function() use($society,$layer,$fields,$sourceType,$confidence,$sourceUrl,$jobId,$input) {
            $this->recorder->source([
                'import_job_id'=>$jobId,'society_id'=>$society->id,'source_type'=>$sourceType,
                'source_name'=>$this->layerName($layer),'source_url'=>$sourceUrl,'confidence_score'=>$confidence,
                'raw_response'=>$input,
            ]);
            foreach($fields as $field=>$value) {
                VerifiedSocietyFieldSource::where('society_id',$society->id)->where('field_name',$field)->update(['is_selected_value'=>false]);
                $this->recorder->field($society->id,$jobId,$field,$value,$sourceType,$this->layerName($layer),$sourceUrl,$confidence,true);
            }
            $applied=$this->profileApplier->apply($society,$fields,true);
            $imageData=$fields+['name'=>$society->name,'display_name'=>$society->name,'source_type'=>$sourceType];
            $captured=$layer==='builder'?$this->images->capture($jobId,$society->id,$imageData,$confidence):[];
            return [
                'message'=>$this->layerName($layer).' imported for review. Society remains unpublished.',
                'applied_fields'=>$applied,'pending_images'=>count($captured),'data'=>$society->fresh(),
                'layer'=>$this->summary($society->fresh())[$layer],
            ];
        });
    }

    public function summary(Society $society): array
    {
        $definitions=[
            'google'=>['google_place_id','google_maps_url','latitude','longitude','address','sector'],
            'rera'=>self::LAYERS['rera'], 'builder'=>self::LAYERS['builder'], 'nearby'=>self::LAYERS['nearby'],
            'market'=>self::LAYERS['market'], 'content'=>['description','meta_title','meta_description','score','connectivity_score','lifestyle_score'],
        ];
        $sources=VerifiedSocietyFieldSource::where('society_id',$society->id)->where('admin_rejected',false)->get();
        $result=[];
        foreach($definitions as $key=>$fields) {
            $fields=array_values(array_unique(array_filter($fields,fn($field)=>!in_array($field,['notes','source_type','confidence_score','source_url'],true))));
            $completed=0;
            foreach($fields as $field) {
                $column=$this->normalizer->societyColumn($field);
                $hasProfile=$column&&!$this->empty($society->{$column});
                $hasSource=$sources->where('field_name',$field)->contains(fn($source)=>filled($source->normalized_value));
                if($hasProfile||$hasSource)$completed++;
            }
            $layerSources=$sources->whereIn('field_name',$fields);
            $result[$key]=[
                'completed_fields'=>$completed,'total_fields'=>count($fields),'pending_fields'=>$layerSources->where('needs_review',true)->count(),
                'confidence'=>$layerSources->max('confidence_score'),
            ];
        }
        $images=VerifiedSocietyImportImage::where('society_id',$society->id)->where('admin_rejected',false)->get();
        $result['images']=['completed_fields'=>$images->count(),'total_fields'=>1,'pending_fields'=>$images->where('needs_review',true)->count(),'confidence'=>$images->max('confidence_score')];
        return $result;
    }

    private function sourcePolicy(string $layer,array $fields,array $input): array
    {
        $sourceUrl=$fields['source_url']??$fields['rera_url']??$fields['brochure_url']??$fields['official_project_url']??$fields['builder_url']??null;
        if($layer==='rera')return [$sourceUrl?'rera':'manual_admin',$sourceUrl?95:75,$sourceUrl];
        if($layer==='builder') {
            $type=filled($fields['brochure_url']??null)?'builder_brochure':($sourceUrl?'builder_website':'manual_admin');
            return [$type,$sourceUrl?88:72,$sourceUrl];
        }
        if($layer==='nearby')return ['manual_admin',$sourceUrl?82:75,$sourceUrl];
        $type=in_array(($fields['source_type']??null),['portal_reference','manual_admin','excel'],true)?$fields['source_type']:'manual_admin';
        $explicit=is_numeric($input['confidence_score']??null)?(int)$input['confidence_score']:($type==='excel'?60:($sourceUrl?70:55));
        return [$type,max(55,min(75,$explicit)),$sourceUrl];
    }

    private function jobId(Society $society): int
    {
        $id=VerifiedSocietyImportSource::where('society_id',$society->id)->whereNotNull('import_job_id')->latest()->value('import_job_id')
            ?:VerifiedSocietyFieldSource::where('society_id',$society->id)->whereNotNull('import_job_id')->latest()->value('import_job_id');
        if(!$id)throw new \InvalidArgumentException('No verified importer job is linked to this society.');
        return (int)$id;
    }

    private function layerName(string $layer): string
    {
        return ['rera'=>'RERA / Legal','builder'=>'Builder / Brochure','nearby'=>'Nearby Places','market'=>'Market Data'][$layer];
    }

    private function assertImporterDraft(Society $society): void
    {
        if($society->source_name!=='Verified Society Importer V2')throw new \InvalidArgumentException('This action is limited to Verified Importer drafts.');
    }

    private function empty(mixed $value): bool { return $value===null||$value===''||$value===[]; }
}
