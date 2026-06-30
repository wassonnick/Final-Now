<?php
namespace App\Services\VerifiedSocietyImporter;
class SocietyImportBuilderPageService { public function inspect(?string $url): array { return ['status'=>'placeholder','source_url'=>$url,'message'=>'Builder page extraction is not enabled in the foundation.']; } }
