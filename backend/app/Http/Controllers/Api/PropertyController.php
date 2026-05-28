<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class PropertyController extends Controller {
  public function index(Request $request): JsonResponse { $q=Property::query()->with('society'); if($request->filled('q')){ $term=$request->string('q'); $q->where(fn($b)=>$b->where('title','ilike',"%{$term}%")->orWhere('society','ilike',"%{$term}%")->orWhere('locality','ilike',"%{$term}%")->orWhere('listing_type','ilike',"%{$term}%")); } if($request->filled('listing_type')) $q->where('listing_type',$request->string('listing_type')); if($request->boolean('featured')) $q->where('featured',true); return response()->json(['status'=>'ok','data'=>$q->latest()->paginate($request->integer('per_page',24))]); }
  public function show(string $idOrSlug): JsonResponse { return response()->json(['status'=>'ok','data'=>Property::where('id',$idOrSlug)->orWhere('slug',$idOrSlug)->with('society')->firstOrFail()]); }
  public function store(Request $request): JsonResponse { $p=$this->payload($request); $p['slug']=$p['slug']??Str::slug($p['title']).'-'.Str::random(5); if(!empty($p['society'])&&empty($p['society_id'])) $p['society_id']=Society::where('name',$p['society'])->value('id'); $property=Property::create($p); return response()->json(['status'=>'ok','message'=>'Property created successfully.','data'=>$property],201); }
  public function update(Request $request, Property $property): JsonResponse { $p=$this->payload($request,true); if(!empty($p['society'])&&empty($p['society_id'])) $p['society_id']=Society::where('name',$p['society'])->value('id'); $property->update($p); return response()->json(['status'=>'ok','message'=>'Property updated successfully.','data'=>$property]); }
  public function destroy(Property $property): JsonResponse { $property->delete(); return response()->json(['status'=>'ok','message'=>'Property deleted successfully.']); }
  private function payload(Request $r,bool $partial=false):array { $req=$partial?'sometimes':'required'; return $r->validate(['society_id'=>'nullable|exists:societies,id','title'=>"{$req}|string|max:255",'slug'=>'nullable|string|max:255','listing_type'=>'nullable|string|max:100','status'=>'nullable|string|max:100','society'=>'nullable|string|max:255','locality'=>'nullable|string|max:255','price'=>'nullable|string|max:100','security_deposit'=>'nullable|string|max:100','maintenance'=>'nullable|string|max:100','bedrooms'=>'nullable|string|max:50','bathrooms'=>'nullable|string|max:50','area_sqft'=>'nullable|string|max:100','floor'=>'nullable|string|max:100','facing'=>'nullable|string|max:100','furnished_status'=>'nullable|string|max:100','description'=>'nullable|string','amenities'=>'nullable|array','images'=>'nullable|array','featured'=>'nullable|boolean','verified'=>'nullable|boolean']); }
}
