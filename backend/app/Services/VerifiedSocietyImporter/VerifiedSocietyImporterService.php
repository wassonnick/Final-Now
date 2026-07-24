<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Models\City;
use App\Models\Locality;
use App\Models\Society;
use App\Models\Zone;
use App\Models\VerifiedSocietyImportJob;
use App\Models\VerifiedSocietyImportRow;
use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportSource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VerifiedSocietyImporterService
{
    public function __construct(
        private SocietyImportNormalizer $normalizer,
        private SocietyImportConfidenceScorer $scorer,
        private SocietyImportSourceRecorder $recorder,
        private SocietyImportDuplicateMatcher $duplicates,
        private SocietyImportImageService $images,
        private SocietyImportProfileApplier $profileApplier,
        private SocietyImportGooglePlacesService $googlePlaces,
    ) {}

    public function createJob(string $type, array $rows, array $options = [], ?string $fileName = null, ?string $createdBy = null): VerifiedSocietyImportJob
    {
        $jobAttributes = [
            'job_type'=>$type,'input_payload'=>['options'=>$options],'input_file_name'=>$fileName,
            'status'=>'running','total_rows'=>count($rows),'created_by'=>$createdBy,
        ];
        foreach (['target_region_id','target_city_id','target_zone_id','target_locality_id','target_city'] as $field) {
            if (array_key_exists($field, $options)) {
                $jobAttributes[$field] = $options[$field];
            }
        }
        $job = VerifiedSocietyImportJob::create($jobAttributes);
        return $this->process($job,$rows,$options);
    }

    public function process(VerifiedSocietyImportJob $job, array $rows, array $options = []): VerifiedSocietyImportJob
    {
        $confidences=[];
        foreach($rows as $index=>$input) {
            try {
                $result=$this->processOne($job,(array)$input,(int)($input['row_number']??($index+1)),$options);
                if($result->confidence_score!==null)$confidences[]=$result->confidence_score;
            } catch(\Throwable $e) {
                VerifiedSocietyImportRow::updateOrCreate(['import_job_id'=>$job->id,'row_number'=>(int)($input['row_number']??($index+1))],['input_data'=>$input,'status'=>'failed','errors'=>[mb_substr($e->getMessage(),0,500)]]);
            }
        }
        return $this->refreshSummary($job,$confidences);
    }

    public function retryFailed(VerifiedSocietyImportJob $job): VerifiedSocietyImportJob
    {
        $failed=$job->rows()->where('status','failed')->get();
        $rows=$failed->map(fn($row)=>$row->input_data+['row_number'=>$row->row_number])->all();
        $failed->each->delete();
        $job->update(['status'=>'running']);
        return $this->process($job,$rows,(array)($job->input_payload['options']??[]));
    }

    public function enrichExistingDraft(Society $society): array
    {
        if($society->source_name!=='Verified Society Importer V2')throw new \InvalidArgumentException('This action is limited to Verified Importer drafts.');
        $enrichment=$this->googlePlaces->enrich([
            'name'=>$society->name,'sector'=>$society->sector,'locality'=>$society->locality,
            'address'=>$society->address,'city'=>$society->city,'state'=>$society->state,
            'google_place_id'=>$society->place_id,
        ]);
        if(($enrichment['status']??null)!=='enriched')return ['message'=>$enrichment['message']??'Google Places returned no reliable match.','applied_fields'=>[],'pending_images'=>0];

        $fields=[];
        foreach((array)($enrichment['data']??[]) as $field=>$value) {
            $column=$this->normalizer->societyColumn((string)$field);
            if($column&&$this->emptyValue($society->{$column}))$fields[(string)$field]=$value;
            elseif(in_array($field,['google_photo_references','image_attribution'],true)&&!$this->emptyValue($value))$fields[(string)$field]=$value;
        }
        if($fields===[])return ['message'=>'This draft already contains all available Google Places fields.','applied_fields'=>[],'pending_images'=>0];

        $jobId=(int)(VerifiedSocietyImportSource::where('society_id',$society->id)->whereNotNull('import_job_id')->latest()->value('import_job_id')
            ?:VerifiedSocietyFieldSource::where('society_id',$society->id)->whereNotNull('import_job_id')->latest()->value('import_job_id'));
        if(!$jobId)throw new \InvalidArgumentException('No verified importer job is linked to this society.');
        $confidence=$this->scorer->forSource('google_places');

        return DB::transaction(function() use($society,$fields,$jobId,$confidence,$enrichment) {
            $mapsUrl=$fields['google_maps_url']??$society->google_maps_url;
            $this->recorder->source(['import_job_id'=>$jobId,'society_id'=>$society->id,'source_type'=>'google_places','source_name'=>'Google Places','source_url'=>$mapsUrl,'confidence_score'=>$confidence,'raw_response'=>(array)($enrichment['raw_response']??[])]);
            foreach($fields as $field=>$value) {
                $sourceType=in_array($field,['google_photo_references','image_attribution'],true)?'google_photos':'google_places';
                VerifiedSocietyFieldSource::where('society_id',$society->id)->where('field_name',$field)->update(['is_selected_value'=>false]);
                $this->recorder->field($society->id,$jobId,$field,$value,$sourceType,$sourceType==='google_photos'?'Google Places photos':'Google Places',$mapsUrl,$this->scorer->forSource($sourceType),true);
            }
            $applied=$this->profileApplier->apply($society,$fields,true);
            $captured=$this->images->capture($jobId,$society->id,$fields,$confidence);
            return ['message'=>'Existing draft enriched with '.count($applied).' Google Places profile fields. Society remains unpublished.','applied_fields'=>$applied,'pending_images'=>count($captured),'data'=>$society->fresh()];
        });
    }

    private function processOne(VerifiedSocietyImportJob $job,array $input,int $rowNumber,array $options): VerifiedSocietyImportRow
    {
        $data=$this->normalizer->normalize($input);
        if(mb_strlen($data['name'])<2) throw new \InvalidArgumentException('Missing society name.');
        $locationQualityWarnings=$this->enforceNcrLocationQuality($data);
        $googleFields=[];
        $googleRaw=[];
        $googleStatus=null;
        $enrichmentMessage=null;
        if((bool)($options['fetch_google']??false)) {
            $enrichment=$this->googlePlaces->enrich($data);
            $googleStatus=(string)($enrichment['status']??'not_matched');
            $enrichmentMessage=(string)($enrichment['message']??'Google Places enrichment did not return any fields.');
            $googleRaw=(array)($enrichment['raw_response']??[]);
            foreach((array)($enrichment['data']??[]) as $field=>$value) {
                if($this->emptyValue($data[$field]??null)) {
                    $data[$field]=$value;
                    $googleFields[]=(string)$field;
                }
            }
            $data=$this->normalizer->normalize($data);
        }
        foreach(['latitude','longitude'] as $coordinate) if(isset($data[$coordinate])&&$data[$coordinate]!==''&&!is_numeric($data[$coordinate])) throw new \InvalidArgumentException("Invalid {$coordinate}.");
        if(isset($data['latitude'])&&$data['latitude']!==''&&((float)$data['latitude'] < -90 || (float)$data['latitude'] > 90)) throw new \InvalidArgumentException('Latitude must be between -90 and 90.');
        if(isset($data['longitude'])&&$data['longitude']!==''&&((float)$data['longitude'] < -180 || (float)$data['longitude'] > 180)) throw new \InvalidArgumentException('Longitude must be between -180 and 180.');
        foreach(['score','security_score','maintenance_score','connectivity_score','lifestyle_score','investment_score'] as $scoreField) {
            if(isset($data[$scoreField])&&$data[$scoreField]!==''&&(!is_numeric($data[$scoreField])||(float)$data[$scoreField]<0||(float)$data[$scoreField]>10)) throw new \InvalidArgumentException("{$scoreField} must be between 0 and 10.");
        }
        foreach(['builder_url','developer_url','official_project_url','brochure_url','source_url','rera_url','certificate_url','rera_search_url','image_reference_url','cover_image_url'] as $urlField) {
            if(!empty($data[$urlField])&&!filter_var($data[$urlField],FILTER_VALIDATE_URL)) throw new \InvalidArgumentException("Invalid {$urlField}.");
        }
        foreach(['image_reference_url','cover_image_url'] as $imageField) {
            if(!empty($data[$imageField])&&!$this->images->safeRemoteUrl($data[$imageField])) throw new \InvalidArgumentException("Unsafe {$imageField}.");
        }
        foreach((array)($data['gallery_image_urls']??[]) as $url) if(!filter_var($url,FILTER_VALIDATE_URL)||!$this->images->safeRemoteUrl($url)) throw new \InvalidArgumentException('Invalid or unsafe gallery image URL.');

        $sourceType=(string)($data['source_type']??($job->job_type==='excel'?'excel':'manual_admin'));
        $allowed=['rera','hrera','dtcp','builder_website','builder_brochure','google_places','google_photos','google_places_nearby','portal_reference','broker_input','manual_admin','excel','ai_extraction'];
        if(!in_array($sourceType,$allowed,true))$sourceType='excel';
        $data['source_type']=$sourceType;
        $confidence=$this->scorer->forSource($sourceType,$data['confidence_score']??null);
        $duplicate=$this->duplicates->match($data);
        $warnings=[];
        $warnings=array_merge($warnings,$locationQualityWarnings);
        if($enrichmentMessage!==null)$warnings[]=$enrichmentMessage;
        if(empty($data['rera_number']))$warnings[]='No RERA number provided';
        if(empty($data['google_place_id']))$warnings[]='No Google Place ID provided';
        if($confidence<70)$warnings[]='Low confidence source';
        if($duplicate['duplicate_score']>0)$warnings[]='Possible duplicate: '.$duplicate['match_reason'];

        $action=(string)($options['duplicate_action']??'skip');
        if($duplicate['duplicate_score']>=90&&$action==='skip') {
            return VerifiedSocietyImportRow::create(['import_job_id'=>$job->id,'row_number'=>$rowNumber,'input_data'=>$input,'normalized_data'=>$data,'matched_society_id'=>$duplicate['matched_society_id'],'status'=>'duplicate','confidence_score'=>$confidence,'warnings'=>$warnings]);
        }

        $row = DB::transaction(function() use($job,$input,$data,$rowNumber,$sourceType,$confidence,$duplicate,$warnings,$action,$googleFields,$googleRaw,$googleStatus) {
            $attached=$duplicate['matched_society_id']&&$action==='attach';
            if($attached) {
                $society=Society::findOrFail($duplicate['matched_society_id']);
            } else {
                $attributes=$this->normalizer->societyAttributes($data);
                $attributes['slug']=$this->uniqueSlug($attributes['slug']??Str::slug($data['name']));
                $attributes+=['status'=>'Draft','verification_status'=>'Needs Review','is_published'=>false,'published_at'=>null,'featured'=>false,'show_in_hero'=>false,'search_boost'=>false,'image_approved_by_admin'=>false,'score'=>7.0,'source_name'=>'Verified Society Importer V2','source_confidence_score'=>$confidence,'data_quality'=>'Source-tracked V2 draft — importer default score needs review.','imported_at'=>now()];
                $society=Society::create($attributes);
                $data['slug']=$society->slug;
            }

            $primarySourceUrl=$data['source_url']??($data['rera_url']??null);
            $this->recorder->source(['import_job_id'=>$job->id,'society_id'=>$society->id,'source_type'=>$sourceType,'source_name'=>$data['source_name']??ucwords(str_replace('_',' ',$sourceType)),'source_url'=>$primarySourceUrl,'confidence_score'=>$confidence,'raw_response'=>$input]);
            if($googleStatus==='enriched') {
                $this->recorder->source(['import_job_id'=>$job->id,'society_id'=>$society->id,'source_type'=>'google_places','source_name'=>'Google Places','source_url'=>$data['google_maps_url']??null,'confidence_score'=>$this->scorer->forSource('google_places'),'raw_response'=>$googleRaw]);
            }
            $this->recordDeclaredSources($job->id,$society->id,$data);
            foreach($data as $field=>$value) {
                if(in_array($field,['row_number','source_type','source_name','confidence_score','normalized_name','builder_brand'],true)||$value===''||$value===[]||$value===null)continue;
                $isGoogle=in_array($field,$googleFields,true);
                $fieldSource=$isGoogle?(in_array($field,['google_photo_references','image_attribution'],true)?'google_photos':'google_places'):$sourceType;
                $fieldName=$isGoogle?($fieldSource==='google_photos'?'Google Places photos':'Google Places'):($data['source_name']??null);
                $fieldUrl=$isGoogle?($data['google_maps_url']??null):$primarySourceUrl;
                $fieldConfidence=$isGoogle?$this->scorer->forSource($fieldSource):$this->fieldConfidence($field,$sourceType,$confidence);
                $this->recorder->field($society->id,$job->id,$field,$value,$fieldSource,$fieldName,$fieldUrl,$fieldConfidence,!$attached);
            }
            if(!$attached&&(!array_key_exists('score',$data)||$data['score']==='')) {
                $this->recorder->field($society->id,$job->id,'score',7.0,'manual_admin','Importer safe draft default',null,50,true);
            }
            if(!$attached) $this->profileApplier->apply($society,$data,true);
            $captured=$this->images->capture($job->id,$society->id,$data,$confidence);
            if((!empty($data['cover_image_url'])||!empty($data['gallery_image_urls']))&&$captured===[])$warnings[]='Image URL could not be validated';

            return VerifiedSocietyImportRow::create(['import_job_id'=>$job->id,'row_number'=>$rowNumber,'input_data'=>$input,'normalized_data'=>$data,'matched_society_id'=>$duplicate['matched_society_id'],'created_society_id'=>$attached?null:$society->id,'status'=>$attached?'needs_review':'created','confidence_score'=>$confidence,'warnings'=>$warnings]);
        });

        // Cost control: importing captures data for ZERO AI spend. The AI-costed completion
        // (re-enrich + cover + SEO) only auto-dispatches when explicitly enabled — by default an
        // admin runs it deliberately via "Complete all drafts now" so credits are never spent
        // by surprise on import.
        if ($row->created_society_id && config('services.ops.auto_complete_imports')) {
            \App\Jobs\CompleteImportedSocietyDraft::dispatch($row->created_society_id);
        }

        return $row;
    }

    private function refreshSummary(VerifiedSocietyImportJob $job,array $confidences=[]): VerifiedSocietyImportJob
    {
        $rows=$job->rows()->get();$failed=$rows->where('status','failed')->count();$created=$rows->where('status','created')->count();$updated=$rows->where('status','needs_review')->count();$skipped=$rows->whereIn('status',['duplicate','skipped'])->count();
        $appliedFields=$job->fieldSources()->where('is_selected_value',true)->pluck('field_name')->map(fn($field)=>$this->normalizer->societyColumn($field))->filter()->unique()->count();
        $job->update(['processed_rows'=>$rows->count(),'created_societies_count'=>$created,'updated_societies_count'=>$updated,'skipped_count'=>$skipped,'failed_count'=>$failed,'overall_confidence'=>$confidences? (int)round(array_sum($confidences)/count($confidences)):($rows->avg('confidence_score')?:(null)),'status'=>$failed===$rows->count()&&$rows->count()>0?'failed':($failed>0?'partially_completed':'needs_review'),'summary'=>['applied_fields'=>$appliedFields,'pending_fields'=>$job->fieldSources()->where('needs_review',true)->count(),'pending_images'=>$job->images()->where('needs_review',true)->count(),'duplicate_status'=>$rows->contains('status','duplicate')?'warning':'none','google_enriched'=>$job->sources()->where('source_type','google_places')->exists()]]);
        return $job->fresh(['rows','sources','fieldSources','images']);
    }

    private function uniqueSlug(string $base): string
    {
        $base=$base?:'society-draft';$slug=$base;$i=2;while(Society::where('slug',$slug)->exists())$slug=$base.'-'.$i++;return $slug;
    }

    private function emptyValue(mixed $value): bool
    {
        return $value === null || $value === '' || $value === [];
    }

    private function fieldConfidence(string $field, string $sourceType, int $confidence): int
    {
        $marketFields=['rent_min','rent_max','rent_range','resale_min','resale_max','buy_range','average_rent','average_sale_price','price_per_sqft','rental_yield','maintenance_charges','market_notes'];
        if(!in_array($field,$marketFields,true))return $confidence;
        return match($sourceType){'manual_admin'=>min($confidence,75),'excel'=>min($confidence,60),'portal_reference'=>min($confidence,60),default=>min($confidence,75)};
    }

    private function recordDeclaredSources(int $jobId, int $societyId, array $data): void
    {
        $sources = [
            ['rera_url', 'rera', 'RERA / HRERA'],
            ['dtcp_url', 'dtcp', 'DTCP'],
            ['builder_url', 'builder_website', 'Builder website'],
            ['brochure_url', 'builder_brochure', 'Builder brochure'],
        ];

        foreach ($sources as [$field, $type, $name]) {
            if (empty($data[$field])) continue;
            $this->recorder->source([
                'import_job_id' => $jobId,
                'society_id' => $societyId,
                'source_type' => $type,
                'source_name' => $name,
                'source_url' => $data[$field],
                'confidence_score' => $this->scorer->forSource($type),
                'raw_response' => [$field => $data[$field]],
            ]);
        }
    }

    /**
     * NCR expansion must not allow loose text-only non-Gurgaon imports into the draft inventory.
     * Gurgaon stays backwards-compatible; Delhi/Noida/Greater Noida/Faridabad intake must carry
     * the structured city relationship and any zone/locality IDs must belong to that city.
     *
     * @return array<int, string>
     */
    private function enforceNcrLocationQuality(array &$data): array
    {
        if (! (bool) config('features.ncr_multicity', false)) {
            return [];
        }

        $warnings = [];
        $hadStructuredCity = ! empty($data['city_id']);
        $city = $this->resolveCity($data);
        if ($city) {
            $data['city_id'] = $city->id;
            $data['region_id'] = $data['region_id'] ?? $city->region_id;
            $data['city'] = $city->name;
            $data['state'] = $data['state'] ?? $city->state;
        }

        $cityText = $this->citySlug((string) ($data['city'] ?? ''));
        $isGurgaon = in_array($cityText, ['gurgaon', 'gurugram'], true);

        if (! $isGurgaon && ! $hadStructuredCity) {
            throw new \InvalidArgumentException('Non-Gurgaon NCR imports require a structured target city. Choose the importer target city before creating drafts.');
        }

        if (! empty($data['zone_id'])) {
            $zone = Zone::find((int) $data['zone_id']);
            if (! $zone) {
                throw new \InvalidArgumentException('Selected target zone could not be found.');
            }
            if (! empty($data['city_id']) && (int) $zone->city_id !== (int) $data['city_id']) {
                throw new \InvalidArgumentException('Selected target zone does not belong to the selected target city.');
            }
            $data['region_id'] = $data['region_id'] ?? $zone->region_id;
            $warnings[] = 'Structured NCR zone context preserved';
        }

        if (! empty($data['locality_id'])) {
            $locality = Locality::find((string) $data['locality_id']);
            if (! $locality) {
                throw new \InvalidArgumentException('Selected target locality could not be found.');
            }
            if (! empty($data['city_id']) && (int) $locality->city_id !== (int) $data['city_id']) {
                throw new \InvalidArgumentException('Selected target locality does not belong to the selected target city.');
            }
            if (! empty($data['zone_id']) && $locality->zone_id && (int) $locality->zone_id !== (int) $data['zone_id']) {
                throw new \InvalidArgumentException('Selected target locality does not belong to the selected target zone.');
            }
            $data['region_id'] = $data['region_id'] ?? $locality->region_id;
            $data['zone_id'] = $data['zone_id'] ?? $locality->zone_id;
            $data['locality'] = $data['locality'] ?? $locality->name;
            $warnings[] = 'Structured NCR locality context preserved';
        }

        if (! $isGurgaon) {
            $warnings[] = 'Non-Gurgaon NCR draft: keep review-only until local source QA is complete';
        }

        return array_values(array_unique($warnings));
    }

    private function resolveCity(array $data): ?City
    {
        if (! empty($data['city_id'])) {
            return City::query()->whereKey((int) $data['city_id'])->where('is_active', true)->first();
        }

        $slug = $this->citySlug((string) ($data['city'] ?? ''));
        if ($slug === '') {
            return null;
        }

        $aliases = [
            'gurugram' => 'gurgaon',
            'greaternoida' => 'greater-noida',
        ];
        $slug = $aliases[$slug] ?? $slug;

        return City::query()->where('slug', $slug)->where('is_active', true)->first();
    }

    private function citySlug(string $value): string
    {
        return Str::slug(str_replace(['Gurugram'], ['Gurgaon'], trim($value)));
    }
}
