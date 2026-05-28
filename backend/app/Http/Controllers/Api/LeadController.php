<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class LeadController extends Controller {
  public function index(Request $request): JsonResponse { $q=Lead::query()->with(['property','society']); if($request->filled('status')) $q->where('status',$request->string('status')); if($request->filled('q')){ $term=$request->string('q'); $q->where(fn($b)=>$b->where('name','ilike',"%{$term}%")->orWhere('phone','ilike',"%{$term}%")->orWhere('email','ilike',"%{$term}%")); } return response()->json(['status'=>'ok','data'=>$q->latest()->paginate($request->integer('per_page',24))]); }
  public function store(Request $request): JsonResponse { $p=$request->validate(['property_id'=>'nullable|exists:properties,id','society_id'=>'nullable|exists:societies,id','name'=>'required|string|max:255','phone'=>'required|string|max:50','email'=>'nullable|email|max:255','budget'=>'nullable|string|max:100','source'=>'nullable|string|max:100','status'=>'nullable|string|max:100','assigned_to'=>'nullable|string|max:255','notes'=>'nullable|string']); $p['status']=$p['status']??'New'; $p['source']=$p['source']??'Website'; $lead=Lead::create($p); return response()->json(['status'=>'ok','message'=>'Lead captured successfully.','data'=>$lead],201); }
  public function update(Request $request, Lead $lead): JsonResponse { $p=$request->validate(['status'=>'nullable|string|max:100','assigned_to'=>'nullable|string|max:255','notes'=>'nullable|string']); $lead->update($p); return response()->json(['status'=>'ok','message'=>'Lead updated successfully.','data'=>$lead]); }
  public function destroy(Lead $lead): JsonResponse { $lead->delete(); return response()->json(['status'=>'ok','message'=>'Lead deleted successfully.']); }
}
