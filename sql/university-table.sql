-- Create the university table
CREATE TABLE IF NOT EXISTS university (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL, -- e.g. byu, uvu, utahtech
    domain VARCHAR(255) NOT NULL, -- e.g. byu.edu
    primary_color VARCHAR(7) DEFAULT '#12F987', -- hex color
    secondary_color VARCHAR(7) DEFAULT '#0D8B56', -- hex color
    accent_color VARCHAR(7) DEFAULT '#85E5C2', -- hex color
    dark_color VARCHAR(7) DEFAULT '#0A1B12', -- hex color
    light_color VARCHAR(7) DEFAULT '#F0FFF9', -- hex color
    text_color VARCHAR(7) DEFAULT '#1A1A1A', -- hex color
    secondary_text_color VARCHAR(7) DEFAULT '#666666', -- hex color
    logo_url TEXT -- nullable
);

-- Create an index on subdomain for fast lookups
CREATE INDEX IF NOT EXISTS idx_university_subdomain ON university(subdomain);

-- Enable Row Level Security
ALTER TABLE university ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read university data (for subdomain lookups)
CREATE POLICY "University data is publicly readable" ON university
    FOR SELECT USING (true);

-- Policy: Only authenticated users can insert university data (admin only in practice)
CREATE POLICY "Authenticated users can insert universities" ON university
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Only authenticated users can update university data (admin only in practice)
CREATE POLICY "Authenticated users can update universities" ON university
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Insert default STU university data
INSERT INTO university (name, subdomain, domain, primary_color, secondary_color, accent_color, dark_color, light_color, text_color, secondary_text_color)
VALUES ('STU Planning', 'stu', 'stuplanning.com', '#12F987', '#0D8B56', '#85E5C2', '#0A1B12', '#F0FFF9', '#1A1A1A', '#666666')
ON CONFLICT (subdomain) DO NOTHING;