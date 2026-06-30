<?php
namespace App\Services\VerifiedSocietyImporter;
class SocietyImportReraService { public function lookup(?string $number): array { return ['status'=>'placeholder','rera_number'=>$number,'message'=>'Direct HRERA/DTCP lookup is not enabled in the foundation.']; } }
