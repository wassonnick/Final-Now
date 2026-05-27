-- SocietyFlats Backend Core Foundation Patch
-- Apply this after database/schema.sql if your DB already exists.
-- It is safe to re-run on PostgreSQL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional image table for future Cloudinary/S3 media. Existing properties.photos JSONB still works.
CREATE TABLE IF NOT EXISTS property_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    public_id VARCHAR(255),
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_cover ON property_images(property_id, is_cover);

-- Helpful admin defaults.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
UPDATE users SET role = user_type WHERE role IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Admin route performance.
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_societies_created ON societies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up_at);

-- Useful for admin notes.
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created ON lead_activities(lead_id, created_at DESC);
