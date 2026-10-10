PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL DEFAULT 'text',
    unit TEXT,
    basis TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS locations (
    location_id TEXT PRIMARY KEY,
    location_name TEXT NOT NULL,
    campus_zone TEXT NOT NULL CHECK (
        campus_zone IN ('College Avenue', 'Busch', 'Livingston', 'Cook/Douglass')
    ),
    site_description TEXT,
    latitude REAL,
    longitude REAL,
    coordinate_note TEXT,
    location_type TEXT,
    meal_swipe_eligible_today INTEGER NOT NULL DEFAULT 0 CHECK (meal_swipe_eligible_today IN (0, 1)),
    ru_express_accepted_today INTEGER NOT NULL DEFAULT 0 CHECK (ru_express_accepted_today IN (0, 1)),
    swipe_notes TEXT,
    hours_basis TEXT,
    proposed_health_section TEXT NOT NULL,
    reservation_supported INTEGER NOT NULL DEFAULT 0 CHECK (reservation_supported IN (0, 1)),
    staff_verification_supported INTEGER NOT NULL DEFAULT 0 CHECK (staff_verification_supported IN (0, 1)),
    student_verification_supported INTEGER NOT NULL DEFAULT 0 CHECK (student_verification_supported IN (0, 1)),
    product_tier TEXT NOT NULL CHECK (product_tier IN ('Core', 'Full')),
    verification_notes TEXT,
    location_verified INTEGER NOT NULL DEFAULT 1 CHECK (location_verified IN (0, 1))
);

CREATE TABLE IF NOT EXISTS location_hours (
    location_id TEXT NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    opens_minute INTEGER CHECK (opens_minute BETWEEN 0 AND 1440),
    closes_minute INTEGER CHECK (closes_minute BETWEEN 0 AND 1440),
    hours_known INTEGER NOT NULL DEFAULT 1 CHECK (hours_known IN (0, 1)),
    PRIMARY KEY (location_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS products (
    product_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    active_ingredient_or_type TEXT,
    simple_definition TEXT NOT NULL,
    typical_use TEXT,
    label_caution TEXT NOT NULL,
    product_tier TEXT NOT NULL CHECK (product_tier IN ('Core', 'Extended')),
    quantity_limit_per_transaction TEXT NOT NULL,
    requires_staff_assistance INTEGER NOT NULL DEFAULT 0 CHECK (requires_staff_assistance IN (0, 1)),
    retail_swipe_status TEXT NOT NULL,
    data_basis TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    proposed_to_stock INTEGER NOT NULL CHECK (proposed_to_stock IN (0, 1)),
    availability_status TEXT NOT NULL CHECK (
        availability_status IN (
            'Available', 'Low stock', 'Out of stock', 'Unknown',
            'Temporarily unavailable', 'Not stocked in proposal'
        )
    ),
    quantity_band TEXT NOT NULL,
    reported_confidence TEXT NOT NULL,
    last_verified TEXT,
    retail_swipe_status TEXT,
    payment_options TEXT,
    quantity_limit TEXT,
    reservation_minutes INTEGER NOT NULL DEFAULT 75,
    requires_staff_assistance INTEGER NOT NULL DEFAULT 0 CHECK (requires_staff_assistance IN (0, 1)),
    data_label TEXT,
    allocatable_units_internal INTEGER NOT NULL DEFAULT 0 CHECK (allocatable_units_internal >= 0),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (location_id, product_id)
);

CREATE TABLE IF NOT EXISTS verification_reports (
    report_id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
    reporter_role TEXT NOT NULL CHECK (
        reporter_role IN ('Rutgers staff', 'Authorized student', 'Student (basic)')
    ),
    reporter_token TEXT NOT NULL,
    reported_status TEXT NOT NULL CHECK (
        reported_status IN ('Available', 'Low stock', 'Out of stock', 'Unknown', 'Temporarily unavailable')
    ),
    reported_at TEXT NOT NULL,
    geofence_distance_m REAL,
    geofence_radius_m REAL,
    geofence_result TEXT,
    photo_attached INTEGER NOT NULL DEFAULT 0 CHECK (photo_attached IN (0, 1)),
    photo_review TEXT,
    verification_outcome TEXT NOT NULL,
    validity_minutes INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by_token TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
    reservation_id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
    reserved_by_token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('Active', 'Collected', 'Cancelled', 'Declined (first come, first served)')
    ),
    pickup_method TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    pickup_code_hash TEXT,
    pickup_code_last4 TEXT,
    collected_at TEXT,
    cancelled_at TEXT
);

CREATE TABLE IF NOT EXISTS health_contacts (
    contact_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    phone_or_contact TEXT NOT NULL,
    when_to_use TEXT NOT NULL,
    source TEXT,
    verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_locations_zone ON locations(campus_zone);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_availability ON inventory(availability_status);
CREATE INDEX IF NOT EXISTS idx_reports_inventory_time ON verification_reports(inventory_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_inventory_status ON reservations(inventory_id, status, expires_at);

