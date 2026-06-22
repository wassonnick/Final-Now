# Society draft import format

Use `php artisan societies:import-gurgaon-master --file=database/imports/<file>.json --dry-run` before every import. Remove `--dry-run` only after reviewing the summary.

The file must be a JSON array of objects. Each object requires a society name in `official_name`, `society_name`, or `name`. `slug` is optional and is generated from the name when absent.

Supported fields include:

- identity: `official_name`, `society_name`, `name`, `slug`
- location: `approx_area_sector`, `sector`, `micro_market`, `locality`, `city`, `state`, `latitude`, `longitude`, `google_maps_url`
- project: `developer_builder`, `society_type`, `project_status`, `launch_status`, `configuration`, `project_area`, `unit_size_range`, `description`
- intelligence: `amenities`, `nearby_schools`, `nearby_metro`, `nearby_hospitals`, `nearby_office_hubs`
- sources: `rera_id`, `official_project_url`, `official_developer_url`, `official_brochure_url`, `official_floor_plan_url`, `official_gallery_url`, `rera_search_url`
- SEO: `meta_title`, `meta_description`
- controlled media: `image_url`, `image_status`, `image_reference_url`, `image_alt_text`, `image_credit`, `image_license_notes`

Arrays may be JSON arrays or comma/semicolon/pipe-separated strings. Every created society is forced to `Draft`, `is_published=false`, `featured=false`, and `image_approved_by_admin=false`. Existing matches by slug or normalized name plus sector/locality are skipped and never overwritten.

The final `SUMMARY` line reports would-create/created, skipped duplicates, skipped non-residential rows, and failures.
