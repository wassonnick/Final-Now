<?php
namespace App\Services\VerifiedSocietyImporter;
class SocietyImportAiExtractionService { public function extract(string $sourceText, string $sourceUrl): array { return ['status'=>'disabled','source_url'=>$sourceUrl,'source_text_reference'=>hash('sha256',$sourceText),'confidence_score'=>0,'needs_review'=>true,'data'=>[]]; } }
