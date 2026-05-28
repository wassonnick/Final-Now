
-- ============================================
-- SocietyFlats Seed Data
-- Real Gurgaon Market Data (2025-2026)
-- ============================================

-- Insert Builders
INSERT INTO builders (id, name, slug, logo_url, established_year, headquarters, total_projects, total_delivered, reputation_score, rera_registered) VALUES
('b1', 'DLF Limited', 'dlf-limited', 'https://cdn.societyflats.in/builders/dlf.png', 1946, 'New Delhi', 30, 25, 4.50, true),
('b2', 'Godrej Properties', 'godrej-properties', 'https://cdn.societyflats.in/builders/godrej.png', 1990, 'Mumbai', 20, 15, 4.60, true),
('b3', 'M3M India', 'm3m-india', 'https://cdn.societyflats.in/builders/m3m.png', 2010, 'Gurgaon', 15, 10, 4.20, true),
('b4', 'Ireo', 'ireo', 'https://cdn.societyflats.in/builders/ireo.png', 2004, 'Gurgaon', 12, 8, 4.30, true),
('b5', 'Bestech Group', 'bestech-group', 'https://cdn.societyflats.in/builders/bestech.png', 1996, 'Gurgaon', 10, 8, 4.10, true),
('b6', 'Vatika Group', 'vatika-group', 'https://cdn.societyflats.in/builders/vatika.png', 1992, 'Gurgaon', 25, 20, 4.00, true),
('b7', 'Ansal API', 'ansal-api', 'https://cdn.societyflats.in/builders/ansal.png', 1967, 'New Delhi', 18, 15, 3.80, true),
('b8', 'SS Group', 'ss-group', 'https://cdn.societyflats.in/builders/ss.png', 1992, 'Gurgaon', 8, 6, 4.00, true),
('b9', 'Emaar India', 'emaar-india', 'https://cdn.societyflats.in/builders/emaar.png', 1997, 'Gurgaon', 10, 8, 4.40, true),
('b10', 'Tata Realty', 'tata-realty', 'https://cdn.societyflats.in/builders/tata.png', 1984, 'Mumbai', 12, 10, 4.70, true);

-- Insert Localities with Real Market Data
INSERT INTO localities (id, name, slug, city, pincode, latitude, longitude, avg_rent_1bhk, avg_rent_2bhk, avg_rent_3bhk, avg_rent_4bhk, price_per_sqft, metro_distance_km, airport_distance_km, cyber_city_distance_km, connectivity_score, safety_score, lifestyle_score) VALUES
('l1', 'DLF Phase 1-5', 'dlf-phase-1-5', 'Gurgaon', '122002', 28.4595, 77.0266, 25000, 45000, 65000, 95000, 22000.00, 3.2, 12.5, 2.1, 9.2, 9.5, 9.8),
('l2', 'Golf Course Road', 'golf-course-road', 'Gurgaon', '122002', 28.4682, 77.0822, 28000, 52000, 75000, 120000, 25000.00, 2.8, 11.0, 1.5, 9.5, 9.3, 9.9),
('l3', 'Golf Course Extension Road', 'golf-course-extension-road', 'Gurgaon', '122011', 28.4220, 77.1025, 18000, 35000, 50000, 75000, 18000.00, 5.5, 14.2, 3.8, 8.5, 8.8, 9.0),
('l4', 'Sohna Road', 'sohna-road', 'Gurgaon', '122018', 28.3923, 77.0487, 14000, 26000, 40000, 60000, 12000.00, 8.0, 18.5, 6.2, 7.5, 7.8, 8.2),
('l5', 'Sector 57', 'sector-57', 'Gurgaon', '122003', 28.4252, 77.0728, 16000, 28000, 45000, 65000, 14000.00, 4.5, 13.0, 4.0, 8.2, 8.5, 8.3),
('l6', 'Sector 49', 'sector-49', 'Gurgaon', '122018', 28.4089, 77.0487, 15000, 28000, 48000, 70000, 13000.00, 6.0, 15.5, 5.5, 7.8, 8.0, 7.9),
('l7', 'Sector 54', 'sector-54', 'Gurgaon', '122011', 28.4334, 77.1025, 20000, 38000, 55000, 80000, 16000.00, 4.0, 12.8, 3.5, 8.8, 8.9, 8.7),
('l8', 'Sushant Lok', 'sushant-lok', 'Gurgaon', '122009', 28.4567, 77.0728, 17000, 32000, 48000, 70000, 15000.00, 3.5, 13.5, 3.0, 8.6, 8.7, 8.5),
('l9', 'Palam Vihar', 'palam-vihar', 'Gurgaon', '122017', 28.5123, 77.0266, 12000, 22000, 38000, 55000, 10000.00, 7.5, 16.0, 7.0, 7.2, 7.5, 7.3),
('l10', 'Dwarka Expressway', 'dwarka-expressway', 'Gurgaon', '122505', 28.5123, 77.0125, 13000, 24000, 38000, 55000, 11000.00, 6.5, 10.0, 8.5, 7.8, 7.5, 7.6),
('l11', 'Sector 82', 'sector-82', 'Gurgaon', '122505', 28.3923, 76.9789, 10000, 18000, 30000, 45000, 8000.00, 9.0, 20.0, 9.5, 6.5, 7.0, 6.8),
('l12', 'Sector 86', 'sector-86', 'Gurgaon', '122505', 28.3789, 76.9654, 9000, 16000, 28000, 42000, 7500.00, 10.0, 22.0, 10.5, 6.0, 6.8, 6.5);

-- Insert Societies with Real Intelligence Scores
INSERT INTO societies (id, name, slug, builder_id, locality_id, address, total_towers, total_units, possession_year, construction_status, security_score, maintenance_score, amenities_score, connectivity_score, family_friendly_score, pet_friendly_score, construction_quality_score, rental_demand_score, is_verified, featured, status, view_count, review_count, avg_rating, security_features, amenities, nearby_facilities) VALUES
('s1', 'DLF The Aralias', 'dlf-the-aralias', 'b1', 'l2', 'Golf Course Road, Sector 42, Gurgaon', 5, 250, 2008, 'ready', 95.0, 92.0, 96.0, 94.0, 90.0, 75.0, 95.0, 88.0, true, true, 'active', 15420, 128, 4.8,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 15}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "tennis_court": true, "basketball_court": true, "jogging_track": true, "kids_play_area": true, "senior_citizen_area": true, "party_hall": true, "library": true, "spa": true}',
 '{"metro_station_km": 2.8, "hospital_km": 1.5, "school_km": 2.0, "mall_km": 1.2, "market_km": 0.8}'),

('s2', 'DLF Park Place', 'dlf-park-place', 'b1', 'l2', 'Golf Course Road, Sector 54, Gurgaon', 8, 450, 2012, 'ready', 93.0, 90.0, 94.0, 95.0, 92.0, 80.0, 93.0, 90.0, true, true, 'active', 12850, 95, 4.7,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 20}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "squash_court": true, "badminton_court": true, "jogging_track": true, "kids_play_area": true, "theatre": true, "business_center": true}',
 '{"metro_station_km": 2.5, "hospital_km": 1.8, "school_km": 1.5, "mall_km": 1.0, "market_km": 0.5}'),

('s3', 'M3M Golf Estate', 'm3m-golf-estate', 'b3', 'l3', 'Golf Course Extension Road, Sector 65, Gurgaon', 12, 800, 2018, 'ready', 88.0, 85.0, 92.0, 82.0, 88.0, 70.0, 90.0, 85.0, true, true, 'active', 11200, 76, 4.5,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 25}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "golf_simulator": true, "cricket_pitch": true, "jogging_track": true, "kids_play_area": true, "skating_rink": true, "amphitheatre": true}',
 '{"metro_station_km": 5.5, "hospital_km": 3.5, "school_km": 2.5, "mall_km": 4.0, "market_km": 2.0}'),

('s4', 'Ireo The Corridors', 'ireo-the-corridors', 'b4', 'l3', 'Golf Course Extension Road, Sector 67A, Gurgaon', 10, 600, 2016, 'ready', 86.0, 84.0, 88.0, 80.0, 85.0, 65.0, 87.0, 82.0, true, false, 'active', 9850, 62, 4.4,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 18}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "tennis_court": true, "basketball_court": true, "jogging_track": true, "kids_play_area": true, "yoga_deck": true}',
 '{"metro_station_km": 6.0, "hospital_km": 4.0, "school_km": 3.0, "mall_km": 4.5, "market_km": 2.5}'),

('s5', 'Bestech Park View', 'bestech-park-view', 'b5', 'l5', 'Sector 66, Gurgaon', 8, 500, 2015, 'ready', 85.0, 88.0, 90.0, 78.0, 90.0, 72.0, 86.0, 80.0, true, false, 'active', 8750, 58, 4.3,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 16}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "badminton_court": true, "volleyball_court": true, "jogging_track": true, "kids_play_area": true, "senior_citizen_area": true, "meditation_center": true}',
 '{"metro_station_km": 4.5, "hospital_km": 3.0, "school_km": 2.0, "mall_km": 3.5, "market_km": 1.5}'),

('s6', 'Vatika City', 'vatika-city', 'b6', 'l5', 'Sector 49, Gurgaon', 15, 1200, 2010, 'ready', 82.0, 80.0, 85.0, 85.0, 88.0, 78.0, 82.0, 86.0, true, false, 'active', 10200, 71, 4.2,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 22}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "tennis_court": true, "basketball_court": true, "jogging_track": true, "kids_play_area": true, "community_hall": true}',
 '{"metro_station_km": 4.0, "hospital_km": 2.5, "school_km": 1.5, "mall_km": 2.0, "market_km": 1.0}'),

('s7', 'Ansal Esencia', 'ansal-esencia', 'b7', 'l4', 'Sector 67, Sohna Road, Gurgaon', 20, 1500, 2014, 'ready', 80.0, 78.0, 82.0, 75.0, 85.0, 70.0, 80.0, 78.0, true, false, 'active', 7650, 45, 4.1,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 20}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "badminton_court": true, "jogging_track": true, "kids_play_area": true, "temple": true}',
 '{"metro_station_km": 7.0, "hospital_km": 4.5, "school_km": 3.0, "mall_km": 5.0, "market_km": 2.0}'),

('s8', 'SS The Hibiscus', 'ss-the-hibiscus', 'b8', 'l2', 'Golf Course Road, Sector 50, Gurgaon', 6, 300, 2011, 'ready', 90.0, 88.0, 90.0, 92.0, 88.0, 82.0, 90.0, 87.0, true, true, 'active', 13500, 89, 4.6,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 14}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "squash_court": true, "badminton_court": true, "jogging_track": true, "kids_play_area": true, "roof_garden": true, "party_lawn": true}',
 '{"metro_station_km": 3.0, "hospital_km": 2.0, "school_km": 1.5, "mall_km": 1.8, "market_km": 1.0}'),

('s9', 'Emaar Palm Gardens', 'emaar-palm-gardens', 'b9', 'l3', 'Sector 83, Gurgaon', 10, 700, 2019, 'ready', 87.0, 86.0, 89.0, 76.0, 86.0, 68.0, 88.0, 79.0, true, false, 'active', 8200, 52, 4.3,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 18}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "tennis_court": true, "cricket_net": true, "jogging_track": true, "kids_play_area": true, "barbecue_pit": true}',
 '{"metro_station_km": 6.5, "hospital_km": 4.0, "school_km": 3.5, "mall_km": 5.5, "market_km": 2.5}'),

('s10', 'Tata Primanti', 'tata-primanti', 'b10', 'l3', 'Sector 72, Golf Course Extension Road, Gurgaon', 8, 400, 2017, 'ready', 91.0, 90.0, 93.0, 84.0, 89.0, 75.0, 92.0, 83.0, true, true, 'active', 9800, 67, 4.5,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 16}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "golf_putting": true, "basketball_court": true, "jogging_track": true, "kids_play_area": true, "organic_farm": true, "reading_lounge": true}',
 '{"metro_station_km": 5.8, "hospital_km": 3.8, "school_km": 2.8, "mall_km": 4.2, "market_km": 2.0}'),

('s11', 'Godrej Meridien', 'godrej-meridien', 'b2', 'l3', 'Sector 106, Dwarka Expressway, Gurgaon', 10, 600, 2020, 'ready', 89.0, 87.0, 91.0, 80.0, 87.0, 73.0, 90.0, 81.0, true, true, 'active', 8900, 54, 4.4,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 20, "smart_home": true}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "tennis_court": true, "skating_rink": true, "jogging_track": true, "kids_play_area": true, "co_working_space": true, "pet_park": true}',
 '{"metro_station_km": 4.5, "hospital_km": 3.0, "school_km": 2.5, "mall_km": 3.8, "market_km": 1.8}'),

('s12', 'DLF The Magnolias', 'dlf-the-magnolias', 'b1', 'l2', 'Golf Course Road, Sector 42, Gurgaon', 4, 200, 2010, 'ready', 96.0, 94.0, 97.0, 95.0, 88.0, 70.0, 96.0, 85.0, true, true, 'active', 16800, 142, 4.9,
 '{"gated": true, "cctv": true, "security_24_7": true, "intercom": true, "access_control": true, "security_personnel": 18, "biometric": true}',
 '{"swimming_pool": true, "gym": true, "club_house": true, "private_theatre": true, "wine_cellar": true, "jogging_track": true, "kids_play_area": true, "spa": true, "salon": true, "concierge": true}',
 '{"metro_station_km": 2.5, "hospital_km": 1.5, "school_km": 2.0, "mall_km": 1.0, "market_km": 0.5}');

-- Insert Properties with Real Rent Data
INSERT INTO properties (id, society_id, title, slug, property_type, bhk, area_sqft, rent_amount, maintenance_amount, deposit_months, floor_number, total_floors, facing, furnished_status, bedrooms, bathrooms, balconies, parking_count, features, is_verified, status, view_count) VALUES
('p1', 's1', '3BHK Luxury Apartment in The Aralias', '3bhk-luxury-apartment-aralias', 'apartment', 3, 2800, 75000, 8000, 3, 8, 20, 'East', 'fully_furnished', 3, 4, 3, 2, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "fans": true, "lights": true, "curtains": true, "geyser": true, "chimney": true, "microwave": true, "refrigerator": true, "washing_machine": true, "sofa": true, "dining_table": true, "tv": true, "beds": true, "study_table": true}', true, 'active', 450),
('p2', 's1', '4BHK Penthouse in The Aralias', '4bhk-penthouse-aralias', 'penthouse', 4, 4200, 120000, 12000, 3, 20, 20, 'South-East', 'fully_furnished', 4, 5, 4, 3, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "private_terrace": true, "jacuzzi": true, "home_theatre": true, "servant_quarter": true}', true, 'active', 320),
('p3', 's2', '3BHK Premium Apartment Park Place', '3bhk-premium-park-place', 'apartment', 3, 2500, 65000, 7000, 2, 12, 18, 'North', 'semi_furnished', 3, 3, 2, 2, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "fans": true, "lights": true}', true, 'active', 380),
('p4', 's2', '2BHK Apartment Park Place', '2bhk-apartment-park-place', 'apartment', 2, 1650, 45000, 5000, 2, 5, 18, 'West', 'fully_furnished', 2, 2, 2, 1, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "sofa": true, "tv": true, "beds": true}', true, 'active', 520),
('p5', 's3', '3BHK Golf View Apartment', '3bhk-golf-view-m3m', 'apartment', 3, 2200, 55000, 6000, 2, 10, 22, 'East', 'semi_furnished', 3, 3, 2, 2, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "golf_view": true}', true, 'active', 410),
('p6', 's3', '4BHK Villa in Golf Estate', '4bhk-villa-golf-estate', 'villa', 4, 3500, 85000, 9000, 3, 2, 3, 'South', 'fully_furnished', 4, 4, 3, 2, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "private_garden": true, "home_office": true}', true, 'active', 280),
('p7', 's4', '3BHK Modern Apartment Corridors', '3bhk-modern-corridors', 'apartment', 3, 2100, 48000, 5000, 2, 8, 20, 'North-East', 'unfurnished', 3, 3, 2, 1, '{"modular_kitchen": true, "wardrobes": true}', true, 'active', 350),
('p8', 's5', '3BHK Family Home Park View', '3bhk-family-park-view', 'apartment', 3, 1950, 42000, 4500, 2, 6, 16, 'East', 'semi_furnished', 3, 2, 2, 1, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "fans": true}', true, 'active', 290),
('p9', 's6', '2BHK Affordable Vatika City', '2bhk-affordable-vatika', 'apartment', 2, 1400, 32000, 3500, 2, 4, 14, 'West', 'semi_furnished', 2, 2, 1, 1, '{"modular_kitchen": true, "wardrobes": true, "fans": true}', true, 'active', 440),
('p10', 's6', '3BHK Spacious Vatika City', '3bhk-spacious-vatika', 'apartment', 3, 1850, 40000, 4000, 2, 9, 14, 'South', 'unfurnished', 3, 2, 2, 1, '{"modular_kitchen": true, "wardrobes": true}', true, 'active', 310),
('p11', 's8', '3BHK Premium Hibiscus', '3bhk-premium-hibiscus', 'apartment', 3, 2600, 68000, 7000, 2, 7, 16, 'East', 'fully_furnished', 3, 3, 3, 2, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "sofa": true, "tv": true, "beds": true, "dining_table": true}', true, 'active', 390),
('p12', 's8', '4BHK Luxury Hibiscus', '4bhk-luxury-hibiscus', 'apartment', 4, 3400, 90000, 9500, 3, 12, 16, 'South-East', 'fully_furnished', 4, 4, 3, 2, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "servant_room": true, "study_room": true}', true, 'active', 250),
('p13', 's10', '3BHK Eco-Friendly Primanti', '3bhk-eco-primanti', 'apartment', 3, 2300, 52000, 5500, 2, 5, 18, 'North', 'semi_furnished', 3, 3, 2, 2, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "organic_farm_access": true}', true, 'active', 340),
('p14', 's11', '3BHK Smart Home Meridien', '3bhk-smart-meridien', 'apartment', 3, 2000, 48000, 5000, 2, 8, 20, 'East', 'fully_furnished', 3, 3, 2, 1, '{"smart_home": true, "ac": true, "modular_kitchen": true, "wardrobes": true, "sofa": true, "tv": true, "beds": true}', true, 'active', 360),
('p15', 's12', '4BHK Ultra Luxury Magnolias', '4bhk-ultra-luxury-magnolias', 'apartment', 4, 4000, 150000, 15000, 3, 15, 18, 'South', 'fully_furnished', 4, 5, 4, 3, '{"ac": true, "modular_kitchen": true, "wardrobes": true, "private_lift": true, "home_theatre": true, "wine_cellar": true, "servant_quarter": true, "study": true, "pooja_room": true}', true, 'active', 180);

-- Insert Sample Reviews
INSERT INTO reviews (id, society_id, user_id, rating, title, content, security_rating, maintenance_rating, amenities_rating, connectivity_rating, management_rating, value_for_money_rating, lived_duration_months, bhk, status, is_verified_resident, helpful_count, created_at) VALUES
('r1', 's1', 'u1', 5.0, 'Best society in Gurgaon', 'Living here for 3 years. Security is top notch, maintenance is prompt. The club house and amenities are world class. Perfect for families.', 5.0, 5.0, 5.0, 4.5, 5.0, 4.0, 36, 3, 'approved', true, 45, '2024-01-15'),
('r2', 's1', 'u2', 4.5, 'Premium living but expensive', 'Excellent society with great amenities. Only downside is the high maintenance charges. But you get what you pay for.', 5.0, 4.5, 5.0, 4.5, 4.5, 3.5, 24, 3, 'approved', true, 32, '2024-03-20'),
('r3', 's2', 'u3', 4.0, 'Good but crowded', 'Great location and amenities. However, it gets quite crowded during peak hours. Parking can be an issue.', 4.0, 4.0, 4.5, 5.0, 4.0, 4.0, 18, 2, 'approved', true, 28, '2024-02-10'),
('r4', 's3', 'u4', 4.5, 'Golf estate living', 'Love the golf course view. The amenities are excellent. Slightly far from metro but connectivity is improving.', 4.5, 4.0, 5.0, 3.5, 4.5, 4.5, 12, 3, 'approved', true, 22, '2024-04-05'),
('r5', 's8', 'u5', 5.0, 'Hidden gem on Golf Course Road', 'SS Hibiscus is underrated. Excellent construction quality, great management, and perfect location. Highly recommended.', 5.0, 4.5, 4.5, 5.0, 5.0, 4.5, 30, 3, 'approved', true, 38, '2024-01-28');

-- Insert Subscription Plans
INSERT INTO subscription_plans (id, name, slug, target_user_type, price_monthly, price_quarterly, price_annually, max_listings, max_premium_listings, max_photos_per_listing, features, display_order) VALUES
('sp1', 'Owner Starter', 'owner-starter', 'owner', 499, 1299, 4499, 3, 0, 10, '{"basic_analytics": true, "lead_notifications": true, "verification_badge": false}', 1),
('sp2', 'Owner Pro', 'owner-pro', 'owner', 999, 2699, 8999, 10, 3, 25, '{"advanced_analytics": true, "priority_support": true, "verification_badge": true, "featured_listing": true}', 2),
('sp3', 'Owner Elite', 'owner-elite', 'owner', 1999, 5499, 18999, 25, 10, 50, '{"premium_analytics": true, "dedicated_manager": true, "verification_badge": true, "featured_listing": true, "video_tour": true}', 3),
('sp4', 'Broker Basic', 'broker-basic', 'broker', 1499, 3999, 13999, 20, 5, 20, '{"team_management": true, "basic_crm": true, "lead_tracking": true}', 4),
('sp5', 'Broker Pro', 'broker-pro', 'broker', 2999, 7999, 27999, 50, 15, 40, '{"advanced_crm": true, "pipeline_management": true, "performance_reports": true, "api_access": true}', 5);

-- Insert Sample Users
INSERT INTO users (id, email, phone, first_name, last_name, user_type, email_verified, phone_verified, is_active) VALUES
('u1', 'tenant1@email.com', '+919999999991', 'Rahul', 'Sharma', 'tenant', true, true, true),
('u2', 'tenant2@email.com', '+919999999992', 'Priya', 'Gupta', 'tenant', true, true, true),
('u3', 'tenant3@email.com', '+919999999993', 'Amit', 'Kumar', 'tenant', true, true, true),
('u4', 'tenant4@email.com', '+919999999994', 'Sneha', 'Patel', 'tenant', true, true, true),
('u5', 'tenant5@email.com', '+919999999995', 'Vikram', 'Singh', 'tenant', true, true, true),
('o1', 'owner1@email.com', '+919888888881', 'Rajesh', 'Agarwal', 'owner', true, true, true),
('o2', 'owner2@email.com', '+919888888882', 'Meena', 'Verma', 'owner', true, true, true),
('br1', 'broker1@email.com', '+919777777771', 'Suresh', 'Broker', 'broker', true, true, true);

-- Insert Sample Leads
INSERT INTO leads (id, property_id, society_id, source, tenant_name, tenant_email, tenant_phone, tenant_user_id, budget_min, budget_max, preferred_move_in, status, created_at) VALUES
('ld1', 'p1', 's1', 'property_page', 'Rahul Sharma', 'tenant1@email.com', '+919999999991', 'u1', 60000, 90000, '2025-06-01', 'contacted', '2025-05-20'),
('ld2', 'p4', 's2', 'search', 'Priya Gupta', 'tenant2@email.com', '+919999999992', 'u2', 35000, 50000, '2025-07-01', 'new', '2025-05-21'),
('ld3', 'p5', 's3', 'society_page', 'Amit Kumar', 'tenant3@email.com', '+919999999993', 'u3', 45000, 65000, '2025-06-15', 'visited', '2025-05-18');
