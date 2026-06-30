<?php

namespace App\Services\VerifiedSocietyImporter;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use ZipArchive;

class SocietyImportExcelParser
{
    private const MAX_ROWS = 500;
    public function __construct(private SocietyImportNormalizer $normalizer) {}

    public function parse(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $matrix = match ($extension) {
            'csv' => $this->csv($file->getRealPath()),
            'xlsx' => $this->xlsx($file->getRealPath()),
            default => throw ValidationException::withMessages(['file'=>'Upload an .xlsx or .csv file.']),
        };
        if (count($matrix)<2) throw ValidationException::withMessages(['file'=>'Add a header row and at least one society row.']);
        $headers = array_map(fn($v)=>trim((string)$v),array_shift($matrix));
        $mapping = $this->normalizer->mapHeaders($headers);
        if (! isset($mapping['name'])) throw ValidationException::withMessages(['file'=>'Missing required name/project/society column.']);
        $rows=[]; $warnings=[];
        foreach ($matrix as $offset=>$values) {
            if (! array_filter($values,fn($v)=>trim((string)$v)!=='')) continue;
            $row=[];
            foreach($mapping as $field=>$index) $row[$field]=trim((string)($values[$index]??''));
            $row['row_number']=$offset+2;
            if (($row['name']??'')==='') $warnings[]='Row '.$row['row_number'].': missing society name.';
            if (($row['city']??'')==='') $row['city']='Gurugram';
            $rows[]=$row;
        }
        if(count($rows)>self::MAX_ROWS) throw ValidationException::withMessages(['file'=>'A maximum of '.self::MAX_ROWS.' rows is allowed.']);
        return ['headers'=>$headers,'mapping'=>$mapping,'rows'=>$rows,'warnings'=>$warnings];
    }

    private function csv(string $path): array
    {
        $h=fopen($path,'rb'); if(!$h) throw ValidationException::withMessages(['file'=>'CSV could not be read.']);
        $rows=[]; while(($row=fgetcsv($h))!==false && count($rows)<=self::MAX_ROWS+1) $rows[]=$row; fclose($h); return $rows;
    }

    private function xlsx(string $path): array
    {
        $zip=new ZipArchive; if($zip->open($path)!==true) throw ValidationException::withMessages(['file'=>'Excel workbook is invalid.']);
        foreach(['xl/sharedStrings.xml','xl/worksheets/sheet1.xml'] as $entry){$s=$zip->statName($entry);if($s&&(int)($s['size']??0)>10_000_000){$zip->close();throw ValidationException::withMessages(['file'=>'Excel worksheet is too large.']);}}
        $shared=[];
        if(($xml=$zip->getFromName('xl/sharedStrings.xml'))!==false){$doc=simplexml_load_string($xml,\SimpleXMLElement::class,LIBXML_NONET|LIBXML_NOCDATA);foreach($doc?->xpath('/*[local-name()="sst"]/*[local-name()="si"]')?:[] as $item)$shared[]=trim(implode('',array_map('strval',$item->xpath('.//*[local-name()="t"]')?:[])));}
        $sheetXml=$zip->getFromName('xl/worksheets/sheet1.xml');$zip->close();if($sheetXml===false)throw ValidationException::withMessages(['file'=>'First worksheet could not be read.']);
        $sheet=simplexml_load_string($sheetXml,\SimpleXMLElement::class,LIBXML_NONET|LIBXML_NOCDATA);$rows=[];
        foreach($sheet?->xpath('//*[local-name()="sheetData"]/*[local-name()="row"]')?:[] as $row){if(count($rows)>self::MAX_ROWS)break;$values=[];foreach($row->xpath('./*[local-name()="c"]')?:[] as $cell){preg_match('/^[A-Z]+/',(string)$cell['r'],$m);$index=$this->columnIndex($m[0]??'A');$type=(string)$cell['t'];if($type==='inlineStr')$value=trim(implode('',array_map('strval',$cell->xpath('.//*[local-name()="t"]')?:[])));else{$nodes=$cell->xpath('./*[local-name()="v"]')?:[];$raw=(string)($nodes[0]??'');$value=$type==='s'?($shared[(int)$raw]??''):$raw;}$values[$index]=$value;}if($values!==[]){ksort($values);$rows[]=array_replace(array_fill(0,max(array_keys($values))+1,''),$values);}}
        return $rows;
    }

    private function columnIndex(string $letters): int { $index=0;foreach(str_split($letters) as $letter)$index=$index*26+(ord($letter)-64);return $index-1; }
}
