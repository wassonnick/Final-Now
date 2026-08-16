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

            // Gurgaon — the rest of the working city. Sector-level commercial hubs, the
            // hospitals people choose a home near, and the schools that decide a family's
            // shortlist. Coordinates verified to roughly a hundred metres, which is the
            // precision this job needs.
            ['Unitech Cyber Park', 'office', 'Gurugram', 28.4089, 77.0413, ['unitech cyber park', 'cyber park sector 39']],
            ['Vatika Business Park', 'office', 'Gurugram', 28.4229, 77.0490, ['vatika business park']],
            ['Candor TechSpace Sector 21', 'office', 'Gurugram', 28.5040, 77.0784, ['candor techspace', 'candor sector 21']],
            ['DLF Downtown Gurugram', 'office', 'Gurugram', 28.4830, 77.0900, ['dlf downtown']],
            ['One Horizon Center', 'office', 'Gurugram', 28.4497, 77.0968, ['one horizon center', 'horizon center golf course road']],
            ['Artemis Hospital', 'hospital', 'Gurugram', 28.4351, 77.0665, ['artemis hospital', 'artemis gurgaon']],
            ['Max Hospital Gurugram', 'hospital', 'Gurugram', 28.4595, 77.0726, ['max hospital gurgaon', 'max saket road']],
            ['Paras Hospital Gurugram', 'hospital', 'Gurugram', 28.4390, 77.0470, ['paras hospital gurgaon']],
            ['The Shri Ram School Aravali', 'education', 'Gurugram', 28.4585, 77.1010, ['shri ram school', 'shri ram aravali']],
            ['DPS Sector 45', 'education', 'Gurugram', 28.4498, 77.0621, ['dps sector 45', 'delhi public school gurgaon']],
            ['Sector 55-56 Metro', 'metro', 'Gurugram', 28.4210, 77.1020, ['sector 55 56 metro', 'sector 56 metro']],
            ['Sector 54 Chowk Metro', 'metro', 'Gurugram', 28.4415, 77.1030, ['sector 54 chowk metro']],
            ['Sikanderpur Metro', 'metro', 'Gurugram', 28.4817, 77.0946, ['sikanderpur metro', 'sikandarpur']],
            ['Cyber City Rapid Metro', 'metro', 'Gurugram', 28.4950, 77.0890, ['cyber city metro', 'rapid metro cyber city']],
            ['Southern Peripheral Road', 'corridor', 'Gurugram', 28.4130, 77.0480, ['spr gurgaon', 'southern peripheral road']],
            ['New Gurugram Sector 82-95', 'corridor', 'Gurugram', 28.3900, 76.9700, ['new gurgaon', 'sector 82 gurgaon']],
            ['Ambience Island', 'locality', 'Gurugram', 28.5050, 77.0980, ['ambience island', 'nh8 ambience']],
            ['Rajiv Chowk Gurgaon', 'corridor', 'Gurugram', 28.4380, 77.0290, ['rajiv chowk gurgaon', 'nh48 rajiv chowk']],

            // Delhi — the employment and transport anchors that decide where people live.
            ['Nehru Place', 'office', 'Delhi', 28.5494, 77.2510, ['nehru place', 'nehru place market']],
            ['Okhla Industrial Area', 'office', 'Delhi', 28.5300, 77.2730, ['okhla industrial area', 'okhla phase 1']],
            ['Jasola District Centre', 'office', 'Delhi', 28.5430, 77.2900, ['jasola', 'jasola district centre']],
            ['Bhikaji Cama Place', 'office', 'Delhi', 28.5690, 77.1860, ['bhikaji cama place']],
            ['Delhi University North Campus', 'education', 'Delhi', 28.6890, 77.2100, ['du north campus', 'delhi university']],
            ['IIT Delhi', 'education', 'Delhi', 28.5450, 77.1926, ['iit delhi', 'iit hauz khas']],
            ['Safdarjung Hospital', 'hospital', 'Delhi', 28.5680, 77.2070, ['safdarjung hospital']],
            ['Max Hospital Saket', 'hospital', 'Delhi', 28.5280, 77.2140, ['max saket', 'max hospital saket']],
            ['Hauz Khas Metro', 'metro', 'Delhi', 28.5440, 77.2060, ['hauz khas metro']],
            ['Punjabi Bagh Metro', 'metro', 'Delhi', 28.6700, 77.1310, ['punjabi bagh metro']],
            ['Netaji Subhash Place Metro', 'metro', 'Delhi', 28.6950, 77.1520, ['netaji subhash place', 'nsp metro']],
            ['Dwarka Sector 10 Metro', 'metro', 'Delhi', 28.5820, 77.0570, ['dwarka sector 10']],
            ['Karol Bagh', 'market', 'Delhi', 28.6510, 77.1900, ['karol bagh']],

            // Noida and Greater Noida — Greater Noida had exactly one landmark, so it could
            // never carry a page even once the city goes live.
            ['Noida Sector 16 Metro', 'metro', 'Noida', 28.5780, 77.3170, ['sector 16 noida metro']],
            ['Noida Electronic City Metro', 'metro', 'Noida', 28.6290, 77.3760, ['electronic city noida']],
            ['Noida Sector 137 Metro', 'metro', 'Noida', 28.5090, 77.4020, ['sector 137 noida']],
            ['Advant Navis Business Park', 'office', 'Noida', 28.5030, 77.4000, ['advant navis', 'advant sector 142']],
            ['Fortis Hospital Noida', 'hospital', 'Noida', 28.5760, 77.3560, ['fortis noida']],
            ['Jaypee Hospital Noida', 'hospital', 'Noida', 28.5060, 77.4090, ['jaypee hospital noida']],
            ['Knowledge Park Greater Noida', 'education', 'Greater Noida', 28.4700, 77.5000, ['knowledge park', 'knowledge park greater noida']],
            ['Pari Chowk', 'corridor', 'Greater Noida', 28.4630, 77.5060, ['pari chowk', 'pari chowk greater noida']],
            ['Alpha Commercial Belt', 'market', 'Greater Noida', 28.4760, 77.5100, ['alpha commercial belt', 'alpha 1 greater noida']],
            ['Yamuna Expressway', 'corridor', 'Greater Noida', 28.3600, 77.5400, ['yamuna expressway']],
            ['Gaur City', 'locality', 'Greater Noida', 28.6060, 77.4300, ['gaur city', 'gaur city noida extension']],
            ['Noida Extension', 'locality', 'Greater Noida', 28.6100, 77.4350, ['noida extension', 'greater noida west']],

            // Faridabad and Ghaziabad — seeded ahead of launch so those cities arrive with
            // pages rather than with an empty shortcut list.
            ['Faridabad Old Metro', 'metro', 'Faridabad', 28.3800, 77.3130, ['old faridabad metro']],
            ['Escorts Mujesar Metro', 'metro', 'Faridabad', 28.3630, 77.3130, ['escorts mujesar']],
            ['Sarvodaya Hospital Faridabad', 'hospital', 'Faridabad', 28.4020, 77.3080, ['sarvodaya hospital']],
            ['Vaishali Metro', 'metro', 'Ghaziabad', 28.6500, 77.3390, ['vaishali metro']],
            ['Indirapuram', 'locality', 'Ghaziabad', 28.6420, 77.3710, ['indirapuram']],
            ['Raj Nagar Extension', 'locality', 'Ghaziabad', 28.7100, 77.4300, ['raj nagar extension']],
        ];
    }
}
