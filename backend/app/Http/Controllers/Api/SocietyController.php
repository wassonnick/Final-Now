<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class SocietyController extends Controller {
  public function index(Request $request): JsonResponse {
    $query=Society::query();
    if($request->filled('q')){ $q=$request->string('q'); $query->where(fn($b)=>$b->where('name','ilike',"%{$q}%")->orWhere('locality','ilike',"%{$q}%")->orWhere('sector','ilike',"%{$q}%")->orWhere('builder','ilike',"%{$q}%")); }
    if($request->boolean('featured')) $query->where('featured',true);
    return response()->json(['status'=>'ok','data'=>$query->withCount('properties')->orderByDesc('featured')->orderByDesc('search_boost')->orderBy('name')->paginate($request->integer('per_page',24))]);
  }
  public function show(string $slug): JsonResponse
{
    $society = Society::with('properties')
        ->where('slug', $slug)
        ->first();

    if (!$society) {
        return response()->json([
            'status' => 'error',
            'message' => 'Society not found',
        ], 404);
    }

    return response()->json([
        'status' => 'ok',
        'data' => $society,
    ]);
}
  public function store(Request $request): JsonResponse { $p=$this->payload($request); $p['slug']=$p['slug']??Str::slug($p['name']); $s=Society::create($p); return response()->json(['status'=>'ok','message'=>'Society created successfully.','data'=>$s],201); }
  public function update(Request $request, Society $society): JsonResponse { $p=$this->payload($request,true); if(isset($p['name'])&&empty($p['slug'])) $p['slug']=Str::slug($p['name']); $society->update($p); return response()->json(['status'=>'ok','message'=>'Society updated successfully.','data'=>$society]); }
  public function destroy(Society $society): JsonResponse { $society->delete(); return response()->json(['status'=>'ok','message'=>'Society deleted successfully.']); }
  private function payload(Request $r,bool $partial=false): array { $req=$partial?'sometimes':'required'; return $r->validate(['name'=>"{$req}|string|max:255",'slug'=>'nullable|string|max:255','builder'=>'nullable|string|max:255','sector'=>'nullable|string|max:255','locality'=>'nullable|string|max:255','address'=>'nullable|string|max:500','description'=>'nullable|string','year_built'=>'nullable|string|max:50','total_towers'=>'nullable|string|max:50','total_units'=>'nullable|string|max:50','maintenance_charges'=>'nullable|string|max:100','rent_range'=>'nullable|string|max:100','buy_range'=>'nullable|string|max:100','rental_yield'=>'nullable|string|max:100','average_rent'=>'nullable|string|max:100','average_sale_price'=>'nullable|string|max:100','price_per_sqft'=>'nullable|string|max:100','score'=>'nullable|numeric|min:0|max:10','security_score'=>'nullable|numeric|min:0|max:10','maintenance_score'=>'nullable|numeric|min:0|max:10','connectivity_score'=>'nullable|numeric|min:0|max:10','lifestyle_score'=>'nullable|numeric|min:0|max:10','investment_score'=>'nullable|numeric|min:0|max:10','amenities'=>'nullable|array','nearby_schools'=>'nullable|string','nearby_metro'=>'nullable|string','nearby_hospitals'=>'nullable|string','nearby_office_hubs'=>'nullable|string','meta_title'=>'nullable|string|max:255','meta_description'=>'nullable|string','faq'=>'nullable|string','status'=>'nullable|string|max:100','featured'=>'nullable|boolean','show_in_hero'=>'nullable|boolean','search_boost'=>'nullable|boolean','latitude'=>'nullable|string|max:100','longitude'=>'nullable|string|max:100','rwa_contact'=>'nullable|string|max:255','cover_image'=>'nullable|string','gallery_images'=>'nullable|array','brochure_name'=>'nullable|string|max:255']); }
}
