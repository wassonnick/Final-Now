<?php

namespace Database\Seeders;

use App\Models\Landmark;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * The landmarks people name when describing where they want to live.
 *
 * Coordinates are accurate to roughly a hundred metres, which is the right precision for
 * the job: this ranks societies by how far they are, and no one choosing between 1.4 km and
 * 1.5 km is served by a third decimal place. Anything not listed here is resolved from
 * Google Places on first use and saved, so the list does not have to be complete to be
 * useful — it only has to cover what gets asked often enough to be worth not paying for.
 */
class LandmarkSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->landmarks() as [$name, $category, $city, $lat, $lng, $aliases]) {
            Landmark::updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'aliases' => $aliases,
                    'category' => $category,
                    'city' => $city,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'source' => 'curated',
                ],
            );
        }
    }

    /** @return array<int,array{0:string,1:string,2:string,3:float,4:float,5:array<int,string>}> */
    private function landmarks(): array
    {
        return [
            // Gurgaon — offices and malls carry most of the intent here.
            ['Ambience Mall Gurgaon', 'mall', 'Gurugram', 28.5041, 77.0968, ['ambience mall', 'ambience island']],
            ['DLF Cyber City', 'office', 'Gurugram', 28.4949, 77.0885, ['cyber city', 'cybercity', 'dlf cyber city']],
            ['DLF Cyber Hub', 'office', 'Gurugram', 28.4952, 77.0892, ['cyber hub', 'cyberhub']],
            ['Udyog Vihar', 'office', 'Gurugram', 28.5025, 77.0863, ['udyog vihar']],
            ['Golf Course Road', 'corridor', 'Gurugram', 28.4420, 77.0980, ['golf course road']],
            ['Golf Course Extension Road', 'corridor', 'Gurugram', 28.4160, 77.0500, ['golf course extension', 'gc extension road']],
            ['Sohna Road', 'corridor', 'Gurugram', 28.4089, 77.0378, ['sohna road']],
            ['Dwarka Expressway', 'corridor', 'Gurugram', 28.4900, 77.0300, ['dwarka expressway', 'northern peripheral road']],
            ['HUDA City Centre Metro', 'metro', 'Gurugram', 28.4595, 77.0724, ['huda city centre', 'huda city center metro']],
            ['MG Road Metro Gurgaon', 'metro', 'Gurugram', 28.4795, 77.0801, ['mg road metro']],
            ['IFFCO Chowk', 'metro', 'Gurugram', 28.4726, 77.0724, ['iffco chowk']],
            ['Rajiv Chowk Gurgaon', 'junction', 'Gurugram', 28.4266, 77.0334, ['rajiv chowk gurgaon']],
            ['Medanta The Medicity', 'hospital', 'Gurugram', 28.4394, 77.0409, ['medanta', 'medanta hospital']],
            ['Fortis Memorial Research Institute', 'hospital', 'Gurugram', 28.4595, 77.0729, ['fortis gurgaon', 'fortis memorial']],
            ['Sector 29 Market', 'market', 'Gurugram', 28.4667, 77.0645, ['sector 29 market', 'leisure valley']],
            ['IMT Manesar', 'office', 'Gurugram', 28.3536, 76.9364, ['manesar', 'imt manesar']],

            // Delhi.
            ['Indira Gandhi International Airport', 'airport', 'Delhi', 28.5562, 77.0999, ['igi airport', 'delhi airport', 'airport terminal 3']],
            ['Aerocity', 'office', 'Delhi', 28.5486, 77.1200, ['aerocity', 'delhi aerocity']],
            ['Connaught Place', 'market', 'Delhi', 28.6315, 77.2167, ['connaught place', 'cp delhi', 'rajiv chowk delhi']],
            ['Select Citywalk Saket', 'mall', 'Delhi', 28.5285, 77.2195, ['select citywalk', 'saket mall']],
            ['AIIMS Delhi', 'hospital', 'Delhi', 28.5672, 77.2100, ['aiims', 'aiims delhi']],
            ['Dwarka Sector 21 Metro', 'metro', 'Delhi', 28.5522, 77.0583, ['dwarka sector 21']],
            ['Rajouri Garden Metro', 'metro', 'Delhi', 28.6491, 77.1216, ['rajouri garden metro']],
            ['Janakpuri West Metro', 'metro', 'Delhi', 28.6290, 77.0780, ['janakpuri west']],
            ['Vasant Kunj', 'locality', 'Delhi', 28.5200, 77.1500, ['vasant kunj']],

            // Noida and Greater Noida.
            ['DLF Mall of India', 'mall', 'Noida', 28.5677, 77.3260, ['mall of india', 'dlf mall noida']],
            ['Noida Sector 18 Market', 'market', 'Noida', 28.5700, 77.3210, ['sector 18 noida', 'atta market']],
            ['Noida City Centre Metro', 'metro', 'Noida', 28.5745, 77.3560, ['noida city centre', 'city centre metro']],
            ['Botanical Garden Metro', 'metro', 'Noida', 28.5644, 77.3340, ['botanical garden metro']],
            ['Noida Sector 62 IT Hub', 'office', 'Noida', 28.6270, 77.3720, ['sector 62 noida', 'noida it hub']],
            ['Noida Expressway', 'corridor', 'Noida', 28.5200, 77.3800, ['noida expressway', 'noida greater noida expressway']],
            ['Amity University Noida', 'education', 'Noida', 28.5450, 77.3340, ['amity university', 'amity noida']],
            ['Noida International Airport Jewar', 'airport', 'Greater Noida', 28.1700, 77.6000, ['jewar airport', 'noida airport']],
        ];
    }
}
