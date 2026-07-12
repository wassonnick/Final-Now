<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportImage;
use App\Models\VerifiedSocietyImportJob;
use App\Models\VerifiedSocietyImportRow;
use App\Models\VerifiedSocietyImportSource;
use App\Services\VerifiedSocietyImporter\SocietyImportExcelParser;
use App\Services\VerifiedSocietyImporter\SocietyImportDraftGenerator;
use App\Services\VerifiedSocietyImporter\SocietyImportProfileApplier;
use App\Services\VerifiedSocietyImporter\SocietyImportLayerService;
use App\Services\VerifiedSocietyImporter\VerifiedSocietyImporterService;
use App\Services\GooglePlacesSocietyImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VerifiedSocietyImporterController extends Controller
{
    public function __construct(private VerifiedSocietyImporterService $service, private SocietyImportExcelParser $parser, private SocietyImportProfileApplier $profileApplier, private SocietyImportDraftGenerator $generator, private SocietyImportLayerService $layers, private \App\Services\Society\Import\SocietyDraftCompletionService $completion) {}

    public function jobs(Request $request): JsonResponse
    {
        return response()->json(['data'=>VerifiedSocietyImportJob::query()->latest()->paginate($request->integer('per_page',25))]);
    }

    public function showJob(VerifiedSocietyImportJob $job): JsonResponse
    {
        return response()->json(['data'=>$job->load(['rows','sources','fieldSources','images'])]);
    }

    public function singleImport(Request $request): JsonResponse
    {
        $data=$request->validate($this->rowRules()+['duplicate_action'=>['nullable',Rule::in(['skip','attach','create_anyway'])],'fetch_google'=>['nullable','boolean']]);
        $options=['duplicate_action'=>$data['duplicate_action']??'skip','fetch_google'=>(bool)($data['fetch_google']??false)];
        unset($data['duplicate_action'],$data['fetch_google']);
        $job=$this->service->createJob('single',[$data],$options,null,$request->header('X-Admin-Email')?:'admin');
        $message = $options['fetch_google']
            ? (($job->summary['google_enriched'] ?? false)
                ? 'Review-only draft created and enriched with Google Places location and photo-reference facts.'
                : ($job->rows->first()?->warnings[0] ?? 'Review-only draft created, but Google Places returned no reliable match.'))
            : 'Verified import completed as a review-only draft job.';
        return response()->json(['message'=>$message,'data'=>$job],201);
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $data=$request->validate(['items'=>['required'],'default_city'=>['nullable','string','max:100'],'duplicate_action'=>['nullable',Rule::in(['skip','attach','create_anyway'])]]);
        $lines=is_array($data['items'])?$data['items']:(preg_split('/\r\n|\r|\n/',(string)$data['items'])?:[]);
        $rows=[];
        foreach($lines as $line){if(is_array($line)){$rows[]=$line;continue;}$line=trim((string)$line);if($line==='')continue;$parts=array_map('trim',preg_split('/\s*[|\t,]\s*/',$line,4)?:[]);$rows[]=['name'=>$parts[0]??'','sector'=>$parts[1]??'','builder_name'=>$parts[2]??'','amenities'=>$parts[3]??'','city'=>$data['default_city']??'Gurugram'];}
        if(count($rows)>100)return response()->json(['message'=>'A maximum of 100 bulk rows is allowed.'],422);
        $job=$this->service->createJob('bulk',$rows,['duplicate_action'=>$data['duplicate_action']??'skip'],null,$request->header('X-Admin-Email')?:'admin');
        return response()->json(['message'=>'Bulk verified import processed; every created society remains a draft.','data'=>$job],201);
    }

    public function previewExcel(Request $request): JsonResponse
    {
        $request->validate(['file'=>['required','file','mimes:xlsx,csv','max:10240']]);
        return response()->json(['data'=>$this->parser->parse($request->file('file'))]);
    }

    public function importExcel(Request $request): JsonResponse
    {
        $data=$request->validate(['rows'=>['required','array','min:1','max:500'],'rows.*'=>['array'],'file_name'=>['nullable','string','max:255'],'duplicate_action'=>['nullable',Rule::in(['skip','attach','create_anyway'])]]);
        $job=$this->service->createJob('excel',$data['rows'],['duplicate_action'=>$data['duplicate_action']??'skip'],$data['file_name']??null,$request->header('X-Admin-Email')?:'admin');
        return response()->json(['message'=>'Excel rows imported as source-tracked review-only drafts.','data'=>$job],201);
    }

    public function downloadTemplate(): StreamedResponse
    {
        $headers=['name','slug','builder_name','legal_name','description','city','state','sector','locality','address','google_maps_url','latitude','longitude','rera_number','rera_url','promoter_name','rera_status','registration_date','registration_validity','certificate_url','oc_cc_pcc_url','builder_url','official_project_url','brochure_url','project_status','possession_status','possession_date','configurations','land_area','tower_count','unit_count','amenities','cover_image_url','gallery_image_urls','image_reference_url','google_photo_reference','image_attribution','nearby_schools','nearby_hospitals','nearby_metro','office_hubs','nearby_malls','nearby_markets','commute_notes','rent_min','rent_max','rent_range','buy_min','buy_max','resale_min','resale_max','buy_range','average_rent','average_sale_price','price_per_sqft','rental_yield','maintenance_charges','market_notes','market_source_url','market_source_type','score','security_score','maintenance_score','connectivity_score','lifestyle_score','investment_score','seo_title','seo_description','source_type','source_url','confidence_score','notes'];
        return response()->streamDownload(function()use($headers){$h=fopen('php://output','wb');fputcsv($h,$headers);$example=array_fill(0,count($headers),'');foreach(['name'=>'DLF Example','builder_name'=>'DLF','city'=>'Gurugram','state'=>'Haryana','sector'=>'Sector 54','status'=>'Draft','source_type'=>'manual_admin'] as $field=>$value){$index=array_search($field,$headers,true);if($index!==false)$example[$index]=$value;}fputcsv($h,$example);fclose($h);},'verified-society-import-template.csv',['Content-Type'=>'text/csv']);
    }

    public function reviewQueue(): JsonResponse
    {
        $fields=VerifiedSocietyFieldSource::query()->where('needs_review',true)->where('admin_rejected',false)->latest()->limit(300)->get();
        $images=VerifiedSocietyImportImage::query()->where('needs_review',true)->where('admin_rejected',false)->latest()->limit(200)->get();
        $ids=$fields->pluck('society_id')->merge($images->pluck('society_id'))->filter()->unique();
        $sources=VerifiedSocietyImportSource::whereIn('society_id',$ids)->get();
        $societies=Society::with('seoContent')->whereIn('id',$ids)->get()->map(function($society)use($fields,$images,$sources){return ['id'=>$society->id,'name'=>$society->name,'slug'=>$society->slug,'builder'=>$society->builder,'sector'=>$society->sector,'city'=>$society->city,'status'=>$society->status,'is_published'=>$society->is_published,'image_approved_by_admin'=>$society->image_approved_by_admin,'has_approved_cover'=>$society->image_approved_by_admin&&(filled($society->cover_image)||filled($society->image_url)||filled($society->image_photo_reference)),'overall_confidence'=>$society->source_confidence_score,'source_count'=>$sources->where('society_id',$society->id)->count(),'field_count'=>$fields->where('society_id',$society->id)->count(),'image_count'=>$images->where('society_id',$society->id)->count(),'layers'=>$this->layers->summary($society),'completion'=>$this->completionStatus($society)];});
        $duplicates=VerifiedSocietyImportRow::where('status','duplicate')->latest()->limit(100)->get();
        $lowConfidence=VerifiedSocietyImportRow::whereNotNull('confidence_score')->where('confidence_score','<',70)->latest()->limit(100)->get();
        return response()->json(['data'=>['societies'=>$societies->values(),'fields'=>$fields,'images'=>$images,'duplicates'=>$duplicates,'low_confidence'=>$lowConfidence]]);
    }

    public function approveField(Request $request, VerifiedSocietyFieldSource $field): JsonResponse
    {
        $data=$request->validate(['review_notes'=>['nullable','string','max:2000']]);
        $applied=[];
        DB::transaction(function()use($field,$data,&$applied){VerifiedSocietyFieldSource::where('society_id',$field->society_id)->where('field_name',$field->field_name)->update(['is_selected_value'=>false]);$field->update(['is_selected_value'=>true,'needs_review'=>false,'admin_approved'=>true,'admin_rejected'=>false,'confidence_score'=>max(90,(int)$field->confidence_score),'review_notes'=>$data['review_notes']??null,'reviewed_by'=>$this->reviewer(request()),'reviewed_at'=>now()]);$applied=$this->profileApplier->applyFieldSource($field);});
        return response()->json(['message'=>'Field approved and applied. Society remains a draft.','data'=>$field->fresh(),'applied_fields'=>$applied,'society'=>Society::find($field->society_id)]);
    }

    public function rejectField(Request $request, VerifiedSocietyFieldSource $field): JsonResponse
    {
        $data=$request->validate(['review_notes'=>['nullable','string','max:2000']]);
        $cleared=$this->profileApplier->rejectFieldSource($field,$data['review_notes']??null);
        $field->update(['reviewed_by'=>$this->reviewer($request),'reviewed_at'=>now()]);
        return response()->json(['message'=>'Field value rejected and removed from the draft where it was still applied.','data'=>$field->fresh(),'cleared_fields'=>$cleared,'society'=>Society::find($field->society_id)]);
    }

    public function approveImage(Request $request, VerifiedSocietyImportImage $image): JsonResponse
    {
        $society=Society::findOrFail($image->society_id);$this->assertImporterImageDraft($society);
        DB::transaction(function()use($image,$society,$request){
            $update=['status'=>'Draft','verification_status'=>'Needs Review','is_published'=>false,'published_at'=>null,'image_approved_by_admin'=>true];
            if($image->source_url)$update['approved_gallery_image_urls']=array_values(array_unique([...($society->approved_gallery_image_urls?:[]),$image->source_url]));
            $update['image_candidates']=$this->upsertSocietyImageCandidate($society,$image,false,true);
            $society->update($update);
            $image->update(['image_type'=>'gallery','needs_review'=>false,'admin_approved'=>true,'admin_rejected'=>false,'reviewed_by'=>$this->reviewer($request),'reviewed_at'=>now()]);
        });
        return response()->json(['message'=>'Image approved to gallery. It remains publication-gated.','data'=>$image->fresh(),'society'=>$society->fresh()]);
    }

    public function rejectImage(Request $request, VerifiedSocietyImportImage $image): JsonResponse
    {
        $society=Society::findOrFail($image->society_id);$enforceDraft=$society->source_name==='Verified Society Importer V2';
        DB::transaction(function()use($image,$society,$request){
            $candidates=array_values(array_filter($society->image_candidates?:[],fn($candidate)=>is_array($candidate)&&!$this->sameSocietyImageCandidate($candidate,$image)));
            $gallery=array_values(array_filter($society->approved_gallery_image_urls?:[],fn($url)=>$url!==$image->source_url));
            $update=['image_candidates'=>$candidates,'approved_gallery_image_urls'=>$gallery,'verification_status'=>'Needs Review'];
            if($society->source_name==='Verified Society Importer V2')$update+=['status'=>'Draft','is_published'=>false,'published_at'=>null];
            $isCover=($image->google_photo_reference&&$society->image_photo_reference===$image->google_photo_reference)||($image->source_url&&in_array($image->source_url,[$society->cover_image,$society->image_url],true));
            if($isCover)$update+=['cover_image'=>null,'image_url'=>null,'image_photo_reference'=>null,'image_approved_by_admin'=>false,'image_status'=>'placeholder'];
            elseif($gallery===[]&&!collect($candidates)->contains(fn($candidate)=>$candidate['approved']??false)&&blank($society->cover_image)&&blank($society->image_photo_reference))$update['image_approved_by_admin']=false;
            $society->update($update);$image->update(['needs_review'=>false,'admin_rejected'=>true,'admin_approved'=>false,'reviewed_by'=>$this->reviewer($request),'reviewed_at'=>now()]);
        });
        return response()->json(['message'=>'Image rejected and removed from public-use fields.'.($enforceDraft?' Society remains unpublished.':''),'data'=>$image->fresh(),'society'=>$society->fresh()]);
    }

    public function setCoverImage(Request $request, VerifiedSocietyImportImage $image): JsonResponse
    {
        $data=$request->validate(['replace'=>['nullable','boolean']]);$society=Society::findOrFail($image->society_id);$this->assertImporterImageDraft($society);
        $different=($image->google_photo_reference&&$society->image_photo_reference!==$image->google_photo_reference)||($image->source_url&&!in_array($image->source_url,[$society->cover_image,$society->image_url],true));
        $hasExistingCover=$society->image_approved_by_admin&&(filled($society->cover_image)||filled($society->image_url)||filled($society->image_photo_reference));
        if($hasExistingCover&&$different&&!($data['replace']??false))return response()->json(['message'=>'An approved cover already exists. Confirm replacement to continue.','requires_confirmation'=>true],409);
        if($image->google_photo_reference){$society->update(['image_photo_reference'=>$image->google_photo_reference,'cover_image'=>null,'image_url'=>null,'image_status'=>'google_places_reference_found','image_credit'=>$image->attribution?:'Google Places','image_approved_by_admin'=>true,'verification_status'=>'Needs Review']);}
        elseif($image->source_url){$society->update(['image_photo_reference'=>null,'image_url'=>$image->source_url,'image_reference_url'=>$image->source_url,'cover_image'=>$image->source_url,'image_status'=>'approved_for_live','image_credit'=>$image->attribution,'image_approved_by_admin'=>true,'verification_status'=>'Needs Review']);}
        else return response()->json(['message'=>'This image has no usable source URL or Google photo reference.'],422);
        $society->update(['image_candidates'=>$this->upsertSocietyImageCandidate($society,$image,true,true),'status'=>'Draft','is_published'=>false,'published_at'=>null]);
        VerifiedSocietyImportImage::where('society_id',$society->id)->where('image_type','cover')->update(['image_type'=>'gallery']);
        $image->update(['image_type'=>'cover','needs_review'=>false,'admin_approved'=>true,'admin_rejected'=>false]);
        return response()->json(['message'=>'Approved cover selected. Society remains unpublished.','data'=>$image->fresh(),'society'=>$society->fresh()]);
    }

    public function previewImage(VerifiedSocietyImportImage $image, GooglePlacesSocietyImageService $places): HttpResponse|JsonResponse
    {
        if($image->admin_rejected)return response()->json(['message'=>'Rejected image previews are unavailable.'],404);
        if(!$image->google_photo_reference)return response()->json(['message'=>'This candidate uses a direct source URL.'],422);
        try{$photo=$places->fetchPhotoByReference($image->google_photo_reference,720);}catch(\Throwable){return response()->json(['message'=>'Google Places preview is unavailable.'],404);}
        return response($photo['body'],200)->header('Content-Type',$photo['content_type'])->header('Cache-Control','private, max-age=3600')->header('X-SocietyFlats-Image-Source','Google Places');
    }

    public function retryFailedRows(VerifiedSocietyImportJob $job): JsonResponse
    {
        return response()->json(['message'=>'Failed rows retried.','data'=>$this->service->retryFailed($job)]);
    }

    public function applyHighConfidence(Society $society): JsonResponse
    {
        try {
            $applied=$this->profileApplier->applyHighConfidence($society,80);
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['message'=>$exception->getMessage()],422);
        }
        return response()->json(['message'=>count($applied).' high-confidence fields applied. Society remains a draft.','applied_fields'=>$applied,'data'=>$society->fresh()]);
    }

    public function enrichExistingDraft(Society $society): JsonResponse
    {
        try{$result=$this->service->enrichExistingDraft($society);}
        catch(\InvalidArgumentException $exception){return response()->json(['message'=>$exception->getMessage()],422);}
        return response()->json($result);
    }

    public function importSourceLayer(Request $request, Society $society, string $layer): JsonResponse
    {
        $data=$request->validate([
            'rera_number'=>['nullable','string','max:120'],'rera_url'=>['nullable','url','max:2000'],'legal_name'=>['nullable','string','max:255'],'promoter_name'=>['nullable','string','max:255'],'rera_status'=>['nullable','string','max:120'],'registration_date'=>['nullable','string','max:120'],'registration_validity'=>['nullable','string','max:255'],'certificate_url'=>['nullable','url','max:2000'],'oc_cc_pcc_url'=>['nullable','url','max:2000'],
            'builder_name'=>['nullable','string','max:255'],'builder_url'=>['nullable','url','max:2000'],'official_project_url'=>['nullable','url','max:2000'],'brochure_url'=>['nullable','url','max:2000'],'project_status'=>['nullable','string','max:120'],'possession_status'=>['nullable','string','max:120'],'possession_date'=>['nullable','string','max:120'],'configurations'=>['nullable','string','max:255'],'land_area'=>['nullable','string','max:120'],'tower_count'=>['nullable','string','max:120'],'unit_count'=>['nullable','string','max:120'],'amenities'=>['nullable'],'description_source_text'=>['nullable','string','max:5000'],'replace_description'=>['nullable','boolean'],'cover_image_url'=>['nullable','url','max:2000'],'gallery_image_urls'=>['nullable'],
            'nearby_schools'=>['nullable'],'nearby_hospitals'=>['nullable'],'nearby_metro'=>['nullable'],'office_hubs'=>['nullable'],'nearby_malls'=>['nullable'],'nearby_markets'=>['nullable'],'commute_notes'=>['nullable','string','max:3000'],
            'rent_min'=>['nullable','string','max:120'],'rent_max'=>['nullable','string','max:120'],'rent_range'=>['nullable','string','max:120'],'buy_min'=>['nullable','string','max:120'],'buy_max'=>['nullable','string','max:120'],'resale_min'=>['nullable','string','max:120'],'resale_max'=>['nullable','string','max:120'],'buy_range'=>['nullable','string','max:120'],'average_rent'=>['nullable','string','max:120'],'average_sale_price'=>['nullable','string','max:120'],'price_per_sqft'=>['nullable','string','max:120'],'rental_yield'=>['nullable','string','max:120'],'maintenance_charges'=>['nullable','string','max:120'],'market_notes'=>['nullable','string','max:3000'],
            'source_url'=>['nullable','url','max:2000'],'market_source_url'=>['nullable','url','max:2000'],'source_type'=>['nullable',Rule::in(['manual_admin','excel','portal_reference','broker_input'])],'market_source_type'=>['nullable',Rule::in(['manual_admin','excel','portal_reference','broker_input'])],'confidence_score'=>['nullable','integer','min:0','max:100'],'notes'=>['nullable','string','max:3000'],
        ]);
        try{$result=$this->layers->import($society,$layer,$data);}
        catch(\InvalidArgumentException $exception){return response()->json(['message'=>$exception->getMessage()],422);}
        return response()->json($result);
    }

    public function importGoogleNearby(Society $society): JsonResponse
    {
        try{$result=$this->layers->importNearbyFromGoogle($society);}
        catch(\InvalidArgumentException $exception){return response()->json(['message'=>$exception->getMessage()],422);}
        return response()->json($result);
    }

    public function generateDescription(Request $request, Society $society): JsonResponse
    {
        $data=$request->validate(['replace'=>['nullable','boolean']]);
        try{$result=$this->generator->description($society,(bool)($data['replace']??false));}
        catch(\InvalidArgumentException $exception){return response()->json(['message'=>$exception->getMessage()],422);}
        return response()->json($result+['society'=>$society->fresh()]);
    }

    public function generateSeo(Request $request, Society $society): JsonResponse
    {
        $data=$request->validate(['replace'=>['nullable','boolean']]);
        try{$result=$this->generator->seo($society,(bool)($data['replace']??false));}
        catch(\InvalidArgumentException $exception){return response()->json(['message'=>$exception->getMessage()],422);}
        return response()->json($result+['society'=>$society->fresh()]);
    }

    public function generateScores(Request $request, Society $society): JsonResponse
    {
        $data=$request->validate(['replace'=>['nullable','boolean']]);
        try{$result=$this->generator->scores($society,(bool)($data['replace']??false));}
        catch(\InvalidArgumentException $exception){return response()->json(['message'=>$exception->getMessage()],422);}
        return response()->json($result+['society'=>$society->fresh()]);
    }

    public function applyMarketData(Society $society): JsonResponse
    {
        try{$result=$this->generator->applyMarketData($society);}
        catch(\InvalidArgumentException $exception){return response()->json(['message'=>$exception->getMessage()],422);}
        return response()->json($result+['society'=>$society->fresh()]);
    }

    private function rowRules(): array
    {
        return ['name'=>['required','string','min:2','max:255'],'display_name'=>['nullable','string','max:255'],'legal_name'=>['nullable','string','max:255'],'slug'=>['nullable','string','max:255'],'city'=>['nullable','string','max:100'],'state'=>['nullable','string','max:100'],'sector'=>['nullable','string','max:100'],'locality'=>['nullable','string','max:255'],'builder_name'=>['nullable','string','max:255'],'rera_number'=>['nullable','string','max:120'],'rera_url'=>['nullable','url','max:2000'],'promoter_name'=>['nullable','string','max:255'],'rera_status'=>['nullable','string','max:120'],'registration_validity'=>['nullable','string','max:255'],'certificate_url'=>['nullable','url','max:2000'],'rera_search_url'=>['nullable','url','max:2000'],'google_place_id'=>['nullable','string','max:255'],'google_maps_url'=>['nullable','url','max:2000'],'builder_url'=>['nullable','url','max:2000'],'developer_url'=>['nullable','url','max:2000'],'official_project_url'=>['nullable','url','max:2000'],'brochure_url'=>['nullable','url','max:2000'],'source_url'=>['nullable','url','max:2000'],'source_type'=>['nullable','string','max:50'],'cover_image_url'=>['nullable','url','max:2000'],'image_reference_url'=>['nullable','url','max:2000'],'gallery_image_urls'=>['nullable'],'google_photo_references'=>['nullable'],'image_attribution'=>['nullable','string','max:500'],'notes'=>['nullable','string','max:3000'],'address'=>['nullable','string','max:500'],'description'=>['nullable','string','max:5000'],'project_status'=>['nullable','string','max:100'],'possession_status'=>['nullable','string','max:100'],'possession_date'=>['nullable','string','max:100'],'amenities'=>['nullable','array','max:50'],'nearby_schools'=>['nullable'],'nearby_metro'=>['nullable'],'nearby_hospitals'=>['nullable'],'nearby_office_hubs'=>['nullable'],'rent_range'=>['nullable','string','max:100'],'buy_range'=>['nullable','string','max:100'],'rent_min'=>['nullable','string','max:100'],'rent_max'=>['nullable','string','max:100'],'buy_min'=>['nullable','string','max:100'],'buy_max'=>['nullable','string','max:100'],'resale_min'=>['nullable','string','max:100'],'resale_max'=>['nullable','string','max:100'],'average_rent'=>['nullable','string','max:100'],'average_sale_price'=>['nullable','string','max:100'],'price_per_sqft'=>['nullable','string','max:100'],'rental_yield'=>['nullable','string','max:100'],'maintenance_charges'=>['nullable','string','max:100'],'market_notes'=>['nullable','string','max:3000'],'meta_title'=>['nullable','string','max:255'],'meta_description'=>['nullable','string','max:1000'],'score'=>['nullable','numeric','min:0','max:10'],'security_score'=>['nullable','numeric','min:0','max:10'],'maintenance_score'=>['nullable','numeric','min:0','max:10'],'connectivity_score'=>['nullable','numeric','min:0','max:10'],'lifestyle_score'=>['nullable','numeric','min:0','max:10'],'investment_score'=>['nullable','numeric','min:0','max:10'],'latitude'=>['nullable','numeric','between:-90,90'],'longitude'=>['nullable','numeric','between:-180,180'],'confidence_score'=>['nullable','integer','min:0','max:100']];
    }

    public function completeDraft(Society $society): JsonResponse
    {
        $this->assertImporterImageDraft($society);
        $result=$this->completion->complete($society->fresh());
        return response()->json(['data'=>['result'=>$result,'completion'=>$this->completionStatus($society->fresh())]]);
    }

    private function reviewer(Request $request): string
    {
        return (string)($request->header('X-Admin-Email')?:'admin');
    }

    /**
     * At-a-glance completion state for the Review Queue, using the very gates the one-click
     * pipeline publishes on. Labels: published (live) / ready (all gates pass, publish it) /
     * incomplete (list of what's still missing).
     *
     * @return array{state:string,label:string,missing:array<int,string>,missing_labels:array<int,string>}
     */
    private function completionStatus(Society $society): array
    {
        if ($society->is_published) {
            return ['state'=>'published','label'=>'Published','missing'=>[],'missing_labels'=>[]];
        }
        $missing=$this->completion->missing($society);
        $labels=['description'=>'Description','score'=>'Score','sector_or_locality'=>'Sector / locality','approved_cover_image'=>'Approved cover image','published_seo'=>'Published SEO'];
        return $missing===[]
            ? ['state'=>'ready','label'=>'Ready to publish','missing'=>[],'missing_labels'=>[]]
            : ['state'=>'incomplete','label'=>count($missing).' to complete','missing'=>$missing,'missing_labels'=>array_map(fn($key)=>$labels[$key]??$key,$missing)];
    }

    private function assertImporterImageDraft(Society $society): void
    {
        if($society->source_name!=='Verified Society Importer V2')throw new \InvalidArgumentException('This action is limited to Verified Importer drafts.');
    }

    private function sameSocietyImageCandidate(array $candidate,VerifiedSocietyImportImage $image): bool
    {
        return ($image->google_photo_reference&&($candidate['photo_reference']??null)===$image->google_photo_reference)||($image->source_url&&($candidate['url']??null)===$image->source_url);
    }

    private function upsertSocietyImageCandidate(Society $society,VerifiedSocietyImportImage $image,bool $cover,bool $approved): array
    {
        $candidates=array_values(array_filter($society->image_candidates?:[],'is_array'));$found=false;
        foreach($candidates as $index=>$candidate){if($cover)$candidates[$index]['is_cover']=false;if($this->sameSocietyImageCandidate($candidate,$image)){$candidates[$index]=array_merge($candidate,['approved'=>$approved,'is_cover'=>$cover,'rights_confirmed'=>true]);$found=true;}}
        if(!$found)$candidates[]=['source'=>$image->google_photo_reference?'google_places':$image->source_type,'url'=>$image->source_url,'photo_reference'=>$image->google_photo_reference,'place_id'=>$society->place_id,'credit'=>$image->attribution,'approved'=>$approved,'is_cover'=>$cover,'rights_confirmed'=>true];
        return array_slice(array_values($candidates),0,20);
    }
}
