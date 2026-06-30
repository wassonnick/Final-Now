<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VerifiedSocietyFieldSource extends Model
{
    protected $fillable = ['import_job_id','society_id','field_name','field_value','raw_value','normalized_value','source_type','source_name','source_url','confidence_score','is_selected_value','needs_review','admin_approved','admin_rejected','review_notes'];
    protected $casts = ['is_selected_value'=>'boolean','needs_review'=>'boolean','admin_approved'=>'boolean','admin_rejected'=>'boolean'];
}
