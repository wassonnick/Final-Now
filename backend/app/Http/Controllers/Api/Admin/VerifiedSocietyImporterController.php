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
use App\Services\VerifiedSocietyImporter\SocietyImportProfileApplier;
use App\Services\VerifiedSocietyImporter\VerifiedSocietyImporterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VerifiedSocietyImporterController extends Controller
{
    public function __construct(private VerifiedSocietyImporterService $service, private SocietyImportExcelParser $parser, private SocietyImportProfileApplier $profileApplier) {}

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
            ? 'Review-only draft created. Google enrichment is a disabled foundation placeholder and no external facts were fetched.'
            : 'Verified import completed as a review-only draft job.';
        return response()->json(['message'=>$message,'data'=>$job],201);
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $data=$request->validate(['items'=>['required'],'default_city'=>['nullable','string','max:100'],'duplicate_action'=>['nullable',Rule::in(['skip','attach','create_anyway'])]]);
        $lines=is_array($data['items'])?$data['items']:(preg_split('/\r\n|\r|\n/',(string)$data['items'])?:[]);
        $rows=[];
        foreach($lines as $line){if(is_array($line)){$rows[]=$line;continue;}$line=trim((string)$line);if($line==='')continue;$parts=array_map('trim',preg_split('/\s*[|\t,]\s*/',$line,3)?:[]);$rows[]=['name'=>$parts[0]??'','sector'=>$parts[1]??'','builder_name'=>$parts[2]??'','city'=>$data['default_city']??'Gurugram'];}
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
        $headers=['name','builder_name','city','sector','address','rera_number','google_place_id','builder_url','brochure_url','cover_image_url','gallery_image_urls','amenities','description','source_type','source_url','notes'];
        return response()->streamDownload(function()use($headers){$h=fopen('php://output','wb');fputcsv($h,$headers);fputcsv($h,['DLF Example','DLF','Gurugram','Sector 54','','','','','','','','','','manual_admin','','']);fclose($h);},'verified-society-import-template.csv',['Content-Type'=>'text/csv']);
    }

    public function reviewQueue(): JsonResponse
    {
        $fields=VerifiedSocietyFieldSource::query()->where('needs_review',true)->where('admin_rejected',false)->latest()->limit(300)->get();
        $images=VerifiedSocietyImportImage::query()->where('needs_review',true)->where('admin_rejected',false)->latest()->limit(200)->get();
        $ids=$fields->pluck('society_id')->merge($images->pluck('society_id'))->filter()->unique();
        $sources=VerifiedSocietyImportSource::whereIn('society_id',$ids)->get();
        $societies=Society::whereIn('id',$ids)->get()->map(function($society)use($fields,$images,$sources){return ['id'=>$society->id,'name'=>$society->name,'slug'=>$society->slug,'builder'=>$society->builder,'sector'=>$society->sector,'city'=>$society->city,'status'=>$society->status,'is_published'=>$society->is_published,'overall_confidence'=>$society->source_confidence_score,'source_count'=>$sources->where('society_id',$society->id)->count(),'field_count'=>$fields->where('society_id',$society->id)->count(),'image_count'=>$images->where('society_id',$society->id)->count()];});
        $duplicates=VerifiedSocietyImportRow::where('status','duplicate')->latest()->limit(100)->get();
        $lowConfidence=VerifiedSocietyImportRow::whereNotNull('confidence_score')->where('confidence_score','<',70)->latest()->limit(100)->get();
        return response()->json(['data'=>['societies'=>$societies->values(),'fields'=>$fields,'images'=>$images,'duplicates'=>$duplicates,'low_confidence'=>$lowConfidence]]);
    }

    public function approveField(Request $request, VerifiedSocietyFieldSource $field): JsonResponse
    {
        $data=$request->validate(['review_notes'=>['nullable','string','max:2000']]);
        $applied=[];
        DB::transaction(function()use($field,$data,&$applied){VerifiedSocietyFieldSource::where('society_id',$field->society_id)->where('field_name',$field->field_name)->update(['is_selected_value'=>false]);$field->update(['is_selected_value'=>true,'needs_review'=>false,'admin_approved'=>true,'admin_rejected'=>false,'confidence_score'=>max(90,(int)$field->confidence_score),'review_notes'=>$data['review_notes']??null]);$applied=$this->profileApplier->applyFieldSource($field);});
        return response()->json(['message'=>'Field approved and applied. Society remains a draft.','data'=>$field->fresh(),'applied_fields'=>$applied,'society'=>Society::find($field->society_id)]);
    }

    public function rejectField(Request $request, VerifiedSocietyFieldSource $field): JsonResponse
    {
        $data=$request->validate(['review_notes'=>['nullable','string','max:2000']]);$field->update(['needs_review'=>false,'admin_rejected'=>true,'admin_approved'=>false,'is_selected_value'=>false,'review_notes'=>$data['review_notes']??null]);return response()->json(['message'=>'Field value rejected.','data'=>$field->fresh()]);
    }

    public function approveImage(VerifiedSocietyImportImage $image): JsonResponse
    {
        $image->update(['needs_review'=>false,'admin_approved'=>true,'admin_rejected'=>false]);
        if($image->image_type==='gallery'&&$image->source_url&&($society=Society::find($image->society_id))){$urls=array_values(array_unique([...($society->approved_gallery_image_urls?:[]),$image->source_url]));$society->update(['approved_gallery_image_urls'=>$urls,'verification_status'=>'Needs Review']);}
        return response()->json(['message'=>'Image approved. It remains publication-gated.','data'=>$image->fresh()]);
    }

    public function rejectImage(VerifiedSocietyImportImage $image): JsonResponse
    {
        $image->update(['needs_review'=>false,'admin_rejected'=>true,'admin_approved'=>false]);return response()->json(['message'=>'Image rejected.','data'=>$image->fresh()]);
    }

    public function setCoverImage(VerifiedSocietyImportImage $image): JsonResponse
    {
        $society=Society::findOrFail($image->society_id);
        if($image->google_photo_reference){$society->update(['image_photo_reference'=>$image->google_photo_reference,'image_status'=>'google_places_reference_found','image_credit'=>$image->attribution?:'Google Places','image_approved_by_admin'=>true,'verification_status'=>'Needs Review']);}
        elseif($image->source_url){$society->update(['image_url'=>$image->source_url,'image_reference_url'=>$image->source_url,'cover_image'=>$image->source_url,'image_status'=>'approved_for_live','image_credit'=>$image->attribution,'image_approved_by_admin'=>true,'verification_status'=>'Needs Review']);}
        else return response()->json(['message'=>'This image has no usable source URL or Google photo reference.'],422);
        VerifiedSocietyImportImage::where('society_id',$society->id)->where('image_type','cover')->update(['image_type'=>'gallery']);
        $image->update(['image_type'=>'cover','needs_review'=>false,'admin_approved'=>true,'admin_rejected'=>false]);
        return response()->json(['message'=>'Approved cover selected. Society remains unpublished.','data'=>$image->fresh()]);
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

    private function rowRules(): array
    {
        return ['name'=>['required','string','min:2','max:255'],'display_name'=>['nullable','string','max:255'],'legal_name'=>['nullable','string','max:255'],'city'=>['nullable','string','max:100'],'sector'=>['nullable','string','max:100'],'locality'=>['nullable','string','max:255'],'builder_name'=>['nullable','string','max:255'],'rera_number'=>['nullable','string','max:120'],'google_place_id'=>['nullable','string','max:255'],'google_maps_url'=>['nullable','url','max:2000'],'builder_url'=>['nullable','url','max:2000'],'developer_url'=>['nullable','url','max:2000'],'official_project_url'=>['nullable','url','max:2000'],'brochure_url'=>['nullable','url','max:2000'],'source_url'=>['nullable','url','max:2000'],'source_type'=>['nullable','string','max:50'],'cover_image_url'=>['nullable','url','max:2000'],'image_reference_url'=>['nullable','url','max:2000'],'gallery_image_urls'=>['nullable'],'google_photo_references'=>['nullable'],'image_attribution'=>['nullable','string','max:500'],'notes'=>['nullable','string','max:3000'],'address'=>['nullable','string','max:500'],'description'=>['nullable','string','max:5000'],'project_status'=>['nullable','string','max:100'],'possession_status'=>['nullable','string','max:100'],'possession_date'=>['nullable','string','max:100'],'amenities'=>['nullable'],'nearby_schools'=>['nullable'],'nearby_metro'=>['nullable'],'nearby_hospitals'=>['nullable'],'nearby_office_hubs'=>['nullable'],'rent_min'=>['nullable','string','max:100'],'rent_max'=>['nullable','string','max:100'],'resale_min'=>['nullable','string','max:100'],'resale_max'=>['nullable','string','max:100'],'maintenance_charges'=>['nullable','string','max:100'],'score'=>['nullable','numeric','min:0','max:10'],'security_score'=>['nullable','numeric','min:0','max:10'],'maintenance_score'=>['nullable','numeric','min:0','max:10'],'connectivity_score'=>['nullable','numeric','min:0','max:10'],'lifestyle_score'=>['nullable','numeric','min:0','max:10'],'investment_score'=>['nullable','numeric','min:0','max:10'],'latitude'=>['nullable','numeric'],'longitude'=>['nullable','numeric'],'confidence_score'=>['nullable','integer','min:0','max:100']];
    }
}
