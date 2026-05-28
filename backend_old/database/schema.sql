
-- ============================================
-- SocietyFlats Database Schema
-- PostgreSQL 15+ Compatible
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE builders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    established_year INTEGER,
    headquarters VARCHAR(255),
    website VARCHAR(255),
    description TEXT,
    total_projects INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    reputation_score DECIMAL(3,2) DEFAULT 0.00,
    rera_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE localities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Gurgaon',
    state VARCHAR(100) NOT NULL DEFAULT 'Haryana',
    pincode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geom GEOMETRY(Point, 4326),
    description TEXT,
    connectivity_score DECIMAL(3,2) DEFAULT 0.00,
    safety_score DECIMAL(3,2) DEFAULT 0.00,
    lifestyle_score DECIMAL(3,2) DEFAULT 0.00,
    avg_rent_1bhk INTEGER,
    avg_rent_2bhk INTEGER,
    avg_rent_3bhk INTEGER,
    avg_rent_4bhk INTEGER,
    price_per_sqft DECIMAL(10,2),
    metro_distance_km DECIMAL(5,2),
    airport_distance_km DECIMAL(5,2),
    cyber_city_distance_km DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE societies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    builder_id UUID REFERENCES builders(id),
    locality_id UUID REFERENCES localities(id),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geom GEOMETRY(Point, 4326),

    -- Society Configuration
    total_towers INTEGER,
    total_units INTEGER,
    total_floors INTEGER,
    possession_year INTEGER,
    construction_status VARCHAR(50), -- ready, under_construction, upcoming
    rera_number VARCHAR(100),

    -- Society Intelligence Scores (0-100)
    security_score DECIMAL(5,2) DEFAULT 0,
    maintenance_score DECIMAL(5,2) DEFAULT 0,
    amenities_score DECIMAL(5,2) DEFAULT 0,
    connectivity_score DECIMAL(5,2) DEFAULT 0,
    family_friendly_score DECIMAL(5,2) DEFAULT 0,
    pet_friendly_score DECIMAL(5,2) DEFAULT 0,
    construction_quality_score DECIMAL(5,2) DEFAULT 0,
    rental_demand_score DECIMAL(5,2) DEFAULT 0,
    overall_score DECIMAL(5,2) DEFAULT 0,

    -- Detailed Attributes (JSONB for flexibility)
    security_features JSONB DEFAULT '{}',
    amenities JSONB DEFAULT '{}',
    maintenance_details JSONB DEFAULT '{}',
    rules_regulations JSONB DEFAULT '{}',
    nearby_facilities JSONB DEFAULT '{}',

    -- Media
    cover_image TEXT,
    gallery_images JSONB DEFAULT '[]',
    video_tour_url TEXT,

    -- SEO & Content
    meta_title VARCHAR(255),
    meta_description TEXT,
    content_html TEXT,
    faqs JSONB DEFAULT '[]',

    -- Verification & Status
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, verified, rejected
    featured BOOLEAN DEFAULT FALSE,
    sponsored BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, draft

    -- Analytics
    view_count INTEGER DEFAULT 0,
    lead_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(2,1) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    owner_id UUID,
    broker_id UUID,

    -- Property Details
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    property_type VARCHAR(50) NOT NULL, -- apartment, villa, penthouse, studio
    bhk INTEGER NOT NULL,
    area_sqft DECIMAL(8,2),
    area_sqm DECIMAL(8,2),

    -- Pricing
    rent_amount INTEGER NOT NULL,
    maintenance_amount INTEGER DEFAULT 0,
    deposit_months INTEGER DEFAULT 2,
    negotiable BOOLEAN DEFAULT FALSE,

    -- Configuration
    floor_number INTEGER,
    total_floors INTEGER,
    facing VARCHAR(50),
    furnished_status VARCHAR(50), -- unfurnished, semi_furnished, fully_furnished

    -- Features
    bedrooms INTEGER,
    bathrooms INTEGER,
    balconies INTEGER,
    parking_count INTEGER DEFAULT 0,

    -- Detailed Features (JSONB)
    features JSONB DEFAULT '{}',
    appliances JSONB DEFAULT '[]',

    -- Media
    photos JSONB DEFAULT '[]',
    videos JSONB DEFAULT '[]',
    floor_plan_url TEXT,
    virtual_tour_url TEXT,

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_badges JSONB DEFAULT '[]',

    -- Availability
    available_from DATE,
    is_available BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, rented, inactive, draft
    featured BOOLEAN DEFAULT FALSE,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    lead_count INTEGER DEFAULT 0,
    shortlist_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER MANAGEMENT
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),

    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    user_type VARCHAR(50) NOT NULL DEFAULT 'tenant', -- tenant, owner, broker, admin

    -- Verification
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(50) DEFAULT 'pending',
    kyc_documents JSONB DEFAULT '[]',

    -- Preferences
    search_preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    filters JSONB NOT NULL,
    alert_enabled BOOLEAN DEFAULT TRUE,
    alert_frequency VARCHAR(50) DEFAULT 'daily', -- instant, daily, weekly
    last_alert_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_shortlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id)
);

-- ============================================
-- REVIEW ECOSYSTEM
-- ============================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),

    -- Review Content
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT NOT NULL,

    -- Category Ratings
    security_rating DECIMAL(2,1),
    maintenance_rating DECIMAL(2,1),
    amenities_rating DECIMAL(2,1),
    connectivity_rating DECIMAL(2,1),
    management_rating DECIMAL(2,1),
    value_for_money_rating DECIMAL(2,1),

    -- Living Experience
    lived_duration_months INTEGER,
    property_type VARCHAR(50),
    bhk INTEGER,
    floor_number INTEGER,

    -- Pros/Cons
    pros JSONB DEFAULT '[]',
    cons JSONB DEFAULT '[]',

    -- Verification
    is_verified_resident BOOLEAN DEFAULT FALSE,
    verification_proof JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    moderation_notes TEXT,

    -- Engagement
    helpful_count INTEGER DEFAULT 0,
    reported_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, user_id)
);

-- ============================================
-- LEAD & COMMUNICATION
-- ============================================

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    society_id UUID REFERENCES societies(id),

    -- Lead Source
    source VARCHAR(50) NOT NULL, -- search, society_page, property_page, ai_advisor, requirement_post

    -- Tenant Details
    tenant_name VARCHAR(255) NOT NULL,
    tenant_email VARCHAR(255),
    tenant_phone VARCHAR(20) NOT NULL,
    tenant_user_id UUID REFERENCES users(id),

    -- Requirements
    budget_min INTEGER,
    budget_max INTEGER,
    preferred_move_in DATE,
    requirements_notes TEXT,

    -- Status Pipeline
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, visited, negotiated, converted, closed_lost

    -- Assignment
    assigned_to_owner_id UUID,
    assigned_to_broker_id UUID,

    -- Follow-ups
    next_follow_up_at TIMESTAMP,
    follow_up_count INTEGER DEFAULT 0,

    -- Analytics
    response_time_minutes INTEGER,
    conversion_value INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- call, visit, message, email, note
    description TEXT,
    performed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Requirements
    preferred_localities JSONB DEFAULT '[]',
    budget_min INTEGER,
    budget_max INTEGER,
    bhk_preference JSONB DEFAULT '[]',
    property_type VARCHAR(50),
    furnished_preference VARCHAR(50),
    move_in_date DATE,

    -- Lifestyle
    family_size INTEGER,
    has_pets BOOLEAN DEFAULT FALSE,
    pet_details TEXT,
    parking_required BOOLEAN DEFAULT FALSE,

    -- Work
    office_location TEXT,
    max_commute_minutes INTEGER,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, fulfilled, expired
    expires_at TIMESTAMP,

    -- Matching
    match_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VERIFICATION FRAMEWORK
-- ============================================

CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verifiable_type VARCHAR(50) NOT NULL, -- society, property, owner, photo
    verifiable_id UUID NOT NULL,

    -- Request Details
    request_type VARCHAR(50) NOT NULL, -- ownership, identity, property_condition, photo_authenticity
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, approved, rejected, expired

    -- Documents
    documents JSONB DEFAULT '[]',
    verification_notes TEXT,

    -- Reviewer
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SUBSCRIPTION & PAYMENTS
-- ============================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    target_user_type VARCHAR(50) NOT NULL, -- owner, broker, society

    -- Pricing
    price_monthly INTEGER,
    price_quarterly INTEGER,
    price_annually INTEGER,

    -- Features
    max_listings INTEGER,
    max_premium_listings INTEGER,
    max_photos_per_listing INTEGER,
    features JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),

    -- Billing
    billing_cycle VARCHAR(50) NOT NULL, -- monthly, quarterly, annual
    amount_paid INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',

    -- Period
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired, suspended

    -- Payment
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),

    -- Payment Details
    amount INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_type VARCHAR(50), -- subscription, featured_listing, verification, concierge

    -- Gateway
    gateway VARCHAR(50) DEFAULT 'razorpay',
    gateway_order_id VARCHAR(255),
    gateway_payment_id VARCHAR(255),
    gateway_signature VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, captured, failed, refunded

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CONTENT & SEO
-- ============================================

CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,

    -- Categorization
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',

    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,

    -- Author
    author_id UUID REFERENCES users(id),

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP,

    -- Engagement
    view_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seo_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_type VARCHAR(50) NOT NULL, -- society, builder, locality, sector, bhk, lifestyle
    entity_id UUID,

    -- URL & Content
    url_path VARCHAR(500) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    meta_description TEXT,
    meta_keywords TEXT,
    h1_title VARCHAR(255),
    content_html TEXT,

    -- Dynamic Data
    dynamic_data JSONB DEFAULT '{}',

    -- Status
    is_indexed BOOLEAN DEFAULT TRUE,
    last_generated_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS & AUDIT
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    type VARCHAR(50) NOT NULL, -- lead, review, verification, system, marketing
    title VARCHAR(255) NOT NULL,
    message TEXT,
    action_url TEXT,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),

    -- Action Details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,

    -- Data
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Society indexes
CREATE INDEX idx_societies_locality ON societies(locality_id);
CREATE INDEX idx_societies_builder ON societies(builder_id);
CREATE INDEX idx_societies_status ON societies(status);
CREATE INDEX idx_societies_verified ON societies(is_verified);
CREATE INDEX idx_societies_featured ON societies(featured);
CREATE INDEX idx_societies_overall_score ON societies(overall_score DESC);
CREATE INDEX idx_societies_slug ON societies(slug);
CREATE INDEX idx_societies_geom ON societies USING GIST(geom);

-- Property indexes
CREATE INDEX idx_properties_society ON properties(society_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_rent ON properties(rent_amount);
CREATE INDEX idx_properties_bhk ON properties(bhk);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_slug ON properties(slug);

-- Search indexes
CREATE INDEX idx_societies_search ON societies USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_properties_search ON properties USING gin(to_tsvector('english', title || ' ' || COALESCE(features::text, '')));

-- Review indexes
CREATE INDEX idx_reviews_society ON reviews(society_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);

-- Lead indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_property ON leads(property_id);
CREATE INDEX idx_leads_society ON leads(society_id);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_type ON users(user_type);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_builders_updated_at BEFORE UPDATE ON builders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_localities_updated_at BEFORE UPDATE ON localities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_societies_updated_at BEFORE UPDATE ON societies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SOCIETY SCORE CALCULATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_society_overall_score(society_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    overall DECIMAL(5,2);
BEGIN
    SELECT (
        COALESCE(security_score, 0) * 0.20 +
        COALESCE(maintenance_score, 0) * 0.20 +
        COALESCE(amenities_score, 0) * 0.15 +
        COALESCE(connectivity_score, 0) * 0.15 +
        COALESCE(family_friendly_score, 0) * 0.10 +
        COALESCE(pet_friendly_score, 0) * 0.05 +
        COALESCE(construction_quality_score, 0) * 0.10 +
        COALESCE(rental_demand_score, 0) * 0.05
    ) INTO overall
    FROM societies WHERE id = society_uuid;

    RETURN ROUND(overall, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE OVERALL SCORE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_society_overall_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.overall_score = calculate_society_overall_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_overall_score 
    BEFORE INSERT OR UPDATE OF security_score, maintenance_score, amenities_score, 
    connectivity_score, family_friendly_score, pet_friendly_score, 
    construction_quality_score, rental_demand_score
    ON societies
    FOR EACH ROW
    EXECUTE FUNCTION update_society_overall_score();
