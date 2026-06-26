<?php

namespace Tests\Unit;

use App\Services\Society\Import\SocietyScoringService;
use Tests\TestCase;

class SocietyScoringServiceTest extends TestCase
{
    private function service(): SocietyScoringService
    {
        return new SocietyScoringService(require base_path('config/society_scoring.php'));
    }

    public function test_rich_premium_society_scores_high_with_high_confidence(): void
    {
        $result = $this->service()->score([
            'name' => 'DLF The Crest',
            'builder' => 'DLF',
            'locality' => 'Golf Course Road',
            'sector' => 'Sector 54',
            'address' => 'Sector 54, Golf Course Road, Gurugram',
            'amenities' => ['Clubhouse', 'Swimming Pool', 'Gym', 'Tennis Court', '24x7 Security', 'CCTV', 'Concierge', 'Landscaped Greens', 'Power Backup'],
            'latitude' => 28.4421, 'longitude' => 77.1025,
            'nearby' => [
                'metro' => [['name' => 'Rapid Metro', 'distance_m' => 600]],
                'office' => [['name' => 'Cyber City', 'distance_m' => 2200]],
                'lifestyle' => array_fill(0, 8, ['name' => 'Cafe']),
            ],
            'rating' => 4.5, 'rating_count' => 1200,
            'year_built' => '2016',
            'rental_yield' => '3.5%',
            'project_status' => 'Ready to Move',
            'market_confirmed' => true,
        ]);

        $this->assertGreaterThanOrEqual(8.0, $result['scores']['score']);
        $this->assertGreaterThan(0.8, $result['confidence']);
        // Every score within the realistic envelope.
        foreach ($result['scores'] as $value) {
            $this->assertGreaterThanOrEqual(5.5, $value);
            $this->assertLessThanOrEqual(9.6, $value);
        }
        // Breakdown is auditable.
        $this->assertArrayHasKey('connectivity', $result['breakdown']);
        $this->assertArrayHasKey('signals', $result['breakdown']['connectivity']);
        $this->assertArrayHasKey('overall', $result['breakdown']);
    }

    public function test_thin_data_society_has_low_confidence_and_is_penalized(): void
    {
        $rich = $this->service()->score([
            'name' => 'DLF The Crest', 'builder' => 'DLF', 'locality' => 'Golf Course Road',
            'amenities' => ['Clubhouse', '24x7 Security'], 'latitude' => 28.44, 'longitude' => 77.10,
            'nearby' => ['metro' => [['distance_m' => 600]], 'office' => [['distance_m' => 2200]], 'lifestyle' => [[], []]],
            'rating' => 4.4, 'rating_count' => 500, 'year_built' => '2016', 'rental_yield' => '3.5%', 'project_status' => 'Ready to Move',
        ]);

        $thin = $this->service()->score(['name' => 'Unknown Society']);

        $this->assertLessThan(0.5, $thin['confidence']);
        $this->assertGreaterThan($thin['confidence'], $rich['confidence']);
        // Thin data is pulled down by the confidence penalty, never inflated.
        $this->assertLessThan($rich['scores']['score'], $thin['scores']['score']);
        $this->assertGreaterThanOrEqual(5.5, $thin['scores']['score']);
    }

    public function test_closer_transit_raises_connectivity(): void
    {
        $base = ['name' => 'X', 'locality' => 'Sohna Road', 'latitude' => 28.42, 'longitude' => 77.04];

        $near = $this->service()->score($base + ['nearby' => ['metro' => [['distance_m' => 500]], 'office' => [['distance_m' => 1000]]]]);
        $far = $this->service()->score($base + ['nearby' => ['metro' => [['distance_m' => 5500]], 'office' => [['distance_m' => 11000]]]]);

        $this->assertGreaterThan($far['scores']['connectivity_score'], $near['scores']['connectivity_score']);
    }

    public function test_unconfirmed_market_is_down_weighted_in_investment(): void
    {
        $facts = [
            'name' => 'Y', 'builder' => 'M3M', 'locality' => 'Dwarka Expressway',
            'rental_yield' => '4.8%', 'project_status' => 'Under Construction',
            'latitude' => 28.5, 'longitude' => 76.99, 'nearby' => ['metro' => [['distance_m' => 3000]]],
        ];

        $confirmed = $this->service()->score($facts + ['market_confirmed' => true]);
        $unconfirmed = $this->service()->score($facts + ['market_confirmed' => false]);

        // A strong (confirmed) yield should pull investment at least as high as the
        // same yield treated as an unconfirmed estimate.
        $this->assertGreaterThanOrEqual(
            $unconfirmed['scores']['investment_score'],
            $confirmed['scores']['investment_score']
        );
    }
}
