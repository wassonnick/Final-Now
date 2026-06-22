<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use ZipArchive;

class SocietySpreadsheetParser
{
    private const MAX_ROWS = 200;

    private const HEADERS = [
        'society_name' => ['society_name', 'society name', 'name', 'project_name', 'project name'],
        'city' => ['city'],
        'sector' => ['sector'],
        'locality' => ['locality', 'area', 'micro_market', 'micro market'],
        'builder' => ['builder', 'developer', 'builder_developer', 'builder developer'],
        'google_maps_url' => ['google_maps_url', 'google maps url', 'maps_url', 'maps url'],
    ];

    public function parse(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $rows = match ($extension) {
            'csv' => $this->parseCsv($file->getRealPath()),
            'xlsx' => $this->parseXlsx($file->getRealPath()),
            default => throw ValidationException::withMessages(['file' => 'Upload an .xlsx or .csv file.']),
        };

        return $this->normalize($rows);
    }

    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if (! $handle) {
            throw ValidationException::withMessages(['file' => 'The CSV file could not be read.']);
        }
        $rows = [];
        while (($row = fgetcsv($handle)) !== false && count($rows) <= self::MAX_ROWS + 20) {
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }

    private function parseXlsx(string $path): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages(['file' => 'The Excel workbook is invalid or unreadable.']);
        }
        foreach (['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml'] as $entry) {
            $stats = $zip->statName($entry);
            if ($stats && (int) ($stats['size'] ?? 0) > 10_000_000) {
                $zip->close();
                throw ValidationException::withMessages(['file' => 'The Excel worksheet is too large to process safely.']);
            }
        }
        $shared = [];
        if (($xml = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            $document = simplexml_load_string($xml, \SimpleXMLElement::class, LIBXML_NONET | LIBXML_NOCDATA);
            foreach ($document?->xpath('/*[local-name()="sst"]/*[local-name()="si"]') ?: [] as $item) {
                $shared[] = trim(implode('', array_map('strval', $item->xpath('.//*[local-name()="t"]') ?: [])));
            }
        }
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        if ($sheetXml === false) {
            throw ValidationException::withMessages(['file' => 'The first Excel worksheet could not be read.']);
        }
        $sheet = simplexml_load_string($sheetXml, \SimpleXMLElement::class, LIBXML_NONET | LIBXML_NOCDATA);
        $rows = [];
        foreach ($sheet?->xpath('//*[local-name()="sheetData"]/*[local-name()="row"]') ?: [] as $row) {
            if (count($rows) > self::MAX_ROWS + 20) {
                break;
            }
            $values = [];
            foreach ($row->xpath('./*[local-name()="c"]') ?: [] as $cell) {
                $reference = (string) $cell['r'];
                preg_match('/^[A-Z]+/', $reference, $match);
                $index = $this->columnIndex($match[0] ?? 'A');
                $type = (string) $cell['t'];
                if ($type === 'inlineStr') {
                    $value = trim(implode('', array_map('strval', $cell->xpath('.//*[local-name()="t"]') ?: [])));
                } else {
                    $valueNodes = $cell->xpath('./*[local-name()="v"]') ?: [];
                    $raw = (string) ($valueNodes[0] ?? '');
                    $value = $type === 's' ? ($shared[(int) $raw] ?? '') : $raw;
                }
                $values[$index] = $value;
            }
            if ($values !== []) {
                ksort($values);
                $rows[] = array_replace(array_fill(0, max(array_keys($values)) + 1, ''), $values);
            }
        }

        return $rows;
    }

    private function normalize(array $rows): array
    {
        if (count($rows) < 2) {
            throw ValidationException::withMessages(['file' => 'Add a header row and at least one society row.']);
        }
        $headerIndex = null;
        foreach (array_slice($rows, 0, 20, true) as $index => $candidate) {
            $normalized = array_map(fn ($value) => strtolower(trim((string) $value)), $candidate);
            if (count(array_intersect($normalized, self::HEADERS['society_name'])) > 0 && count(array_intersect($normalized, self::HEADERS['city'])) > 0) {
                $headerIndex = $index;
                break;
            }
        }
        if ($headerIndex === null) {
            throw ValidationException::withMessages(['file' => 'Missing required columns: society_name and city.']);
        }
        $rows = array_values(array_slice($rows, $headerIndex));
        if (count($rows) - 1 > self::MAX_ROWS) {
            throw ValidationException::withMessages(['file' => 'A maximum of '.self::MAX_ROWS.' society rows is allowed per upload.']);
        }
        $headers = array_map(fn ($value) => strtolower(trim((string) $value)), array_shift($rows));
        $map = [];
        foreach (self::HEADERS as $canonical => $aliases) {
            foreach ($headers as $index => $header) {
                if (in_array($header, $aliases, true)) {
                    $map[$canonical] = $index;
                    break;
                }
            }
        }
        foreach (['society_name', 'city'] as $required) {
            if (! isset($map[$required])) {
                throw ValidationException::withMessages(['file' => "Missing required column: {$required}."]);
            }
        }
        $output = [];
        $errors = [];
        foreach ($rows as $offset => $row) {
            if (count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }
            $item = [];
            foreach ($map as $key => $index) {
                $item[$key] = trim((string) ($row[$index] ?? ''));
            }
            $rowNumber = $offset + 2;
            if (mb_strlen($item['society_name']) < 3) {
                $errors[] = "Row {$rowNumber}: society_name must contain at least 3 characters.";

                continue;
            }
            if ($item['city'] === '') {
                $errors[] = "Row {$rowNumber}: city is required.";

                continue;
            }
            if (($item['google_maps_url'] ?? '') !== '' && ! filter_var($item['google_maps_url'], FILTER_VALIDATE_URL)) {
                $errors[] = "Row {$rowNumber}: google_maps_url must be a valid URL.";

                continue;
            }
            $item['row_number'] = $rowNumber;
            $output[] = $item;
        }
        if ($errors !== []) {
            throw ValidationException::withMessages(['file' => array_slice($errors, 0, 20)]);
        }
        if ($output === []) {
            throw ValidationException::withMessages(['file' => 'No valid society rows were found.']);
        }

        return $output;
    }

    private function columnIndex(string $letters): int
    {
        $index = 0;
        foreach (str_split($letters) as $letter) {
            $index = ($index * 26) + (ord($letter) - 64);
        }

        return $index - 1;
    }
}
