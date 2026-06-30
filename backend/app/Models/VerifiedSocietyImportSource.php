<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VerifiedSocietyImportSource extends Model
{
    protected $fillable = ['import_job_id','society_id','source_type','source_name','source_url','source_priority','raw_response','raw_response_path','fetched_at','confidence_score','status','error_message'];
    protected $casts = ['raw_response'=>'array','fetched_at'=>'datetime'];
}
