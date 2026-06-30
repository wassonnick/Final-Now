<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VerifiedSocietyImportRow extends Model
{
    protected $fillable = ['import_job_id','row_number','input_data','normalized_data','matched_society_id','created_society_id','status','confidence_score','warnings','errors'];
    protected $casts = ['input_data'=>'array','normalized_data'=>'array','warnings'=>'array','errors'=>'array'];
}
