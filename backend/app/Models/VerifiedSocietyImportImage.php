<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VerifiedSocietyImportImage extends Model
{
    protected $fillable = ['import_job_id','society_id','image_type','source_type','source_url','google_photo_reference','local_path','alt_text','caption','attribution','sort_order','confidence_score','needs_review','admin_approved','admin_rejected'];
    protected $casts = ['needs_review'=>'boolean','admin_approved'=>'boolean','admin_rejected'=>'boolean'];
}
