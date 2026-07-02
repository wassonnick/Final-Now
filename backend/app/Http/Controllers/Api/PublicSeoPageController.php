<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\SeoDraft;
use App\Models\SeoPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class PublicSeoPageController extends Controller
{
    public function resolve(Request $request): JsonResponse
    {
        $data=$request->validate(['path'=>['required','string','max:500']]);$path=(string)(parse_url($data['path'],PHP_URL_PATH)?:'/');$page=SeoPage::where('canonical_url',$path)->orWhere('url',$path)->first();if(!$page||!$page->is_public||!$page->is_indexable)return response()->json(['data'=>null]);$draft=SeoDraft::where('seo_page_id',$page->id)->where('status','published')->latest('published_at')->first();return response()->json(['data'=>$draft?array_merge($draft->suggested_version,['canonical_url'=>$page->canonical_url]):null]);
    }
}
