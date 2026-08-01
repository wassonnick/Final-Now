<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

/**
 * Reports whether uploaded images actually survive a deploy.
 *
 * This is the failure that hides. An upload succeeds, the URL comes back, the image
 * renders — and then the container is replaced and the file is gone, because a Render web
 * service has an ephemeral filesystem and the default uploads disk writes to
 * storage/app/public inside it. Nothing errors at any point. Societies simply lose their
 * pictures some time later, which reads as "upload does not save" and as images
 * disappearing on their own, and neither description points at the cause.
 *
 * So: name the driver, prove a round trip, and count how many stored images have already
 * vanished.
 */
class AdminStorageDiagnosticController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $diskName = (string) config('filesystems.uploads_disk', 'public');
        $driver = (string) config("filesystems.disks.{$diskName}.driver", 'unknown');
        $disk = Storage::disk($diskName);

        // A local driver on a container platform means every deploy wipes uploads.
        $ephemeral = $driver === 'local';

        $out = [
            'disk' => $diskName,
            'driver' => $driver,
            'durable' => ! $ephemeral,
            'root' => $driver === 'local' ? (string) config("filesystems.disks.{$diskName}.root") : null,
            'configured_alternatives' => collect(config('filesystems.disks', []))
                ->filter(fn ($config) => ($config['driver'] ?? null) === 's3')
                ->keys()
                ->values()
                ->all(),
        ];

        // Round trip: can we write, read back and delete right now?
        $probe = 'diagnostics/storage-probe-'.now()->timestamp.'.txt';
        try {
            $disk->put($probe, 'ok');
            $out['round_trip'] = ['wrote' => true, 'read_back' => $disk->get($probe) === 'ok'];
            $disk->delete($probe);
        } catch (\Throwable $e) {
            $out['round_trip'] = ['wrote' => false, 'error' => $e->getMessage()];
        }

        // How much has already been lost. Only locally-stored files can be checked —
        // a remote URL failing is a different problem from a file that is not there.
        $missing = 0;
        $checked = 0;
        $examples = [];

        Society::query()
            ->whereNotNull('cover_image')
            ->select(['id', 'name', 'cover_image'])
            ->chunk(200, function ($societies) use ($disk, &$missing, &$checked, &$examples) {
                foreach ($societies as $society) {
                    $path = $this->storagePathFor((string) $society->cover_image);
                    if ($path === null) {
                        continue;
                    }

                    $checked++;
                    if (! $disk->exists($path)) {
                        $missing++;
                        if (count($examples) < 10) {
                            $examples[] = ['id' => $society->id, 'name' => $society->name, 'path' => $path];
                        }
                    }
                }
            });

        $out['stored_covers'] = [
            'checked' => $checked,
            'missing_from_disk' => $missing,
            'examples' => $examples,
        ];

        $out['verdict'] = match (true) {
            $ephemeral && $missing > 0 => "Uploads are on an EPHEMERAL disk and {$missing} of {$checked} stored covers are already gone. Every deploy wipes them. Set UPLOADS_DISK to an S3/R2 bucket, or mount a Render Disk at the storage path.",
            $ephemeral => 'Uploads are on an EPHEMERAL local disk. Nothing is missing yet, but the next deploy will wipe every uploaded image. Set UPLOADS_DISK to an S3/R2 bucket, or mount a Render Disk.',
            $missing > 0 => "Storage is durable, but {$missing} of {$checked} stored covers are missing — these were lost before the durable disk was configured and need re-uploading.",
            default => 'Storage is durable and every stored cover is present.',
        };

        return response()->json($out);
    }

    /** Map a public storage URL back to its path on the disk, or null if it is remote. */
    private function storagePathFor(string $url): ?string
    {
        if ($url === '' || str_starts_with($url, 'data:')) {
            return null;
        }

        // Only files we serve from our own /storage prefix live on the uploads disk.
        if (! preg_match('#/storage/(.+)$#', $url, $m)) {
            return null;
        }

        return $m[1];
    }
}
