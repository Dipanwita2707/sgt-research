-- SGT University Management System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Types Enum
CREATE TYPE user_type AS ENUM ('student', 'staff', 'admin');

-- =====================================================
-- USERS TABLE (Main authentication table)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type user_type NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STUDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(9) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(15),
    program VARCHAR(100),
    batch VARCHAR(20),
    semester INTEGER,
    enrollment_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_reg_number CHECK (LENGTH(registration_number) = 9 AND registration_number ~ '^[0-9]+$')
);

-- =====================================================
-- STAFF TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uid VARCHAR(5) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(15),
    designation VARCHAR(100),
    department VARCHAR(100),
    joining_date DATE,
    employee_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_uid CHECK (LENGTH(uid) = 5 AND uid ~ '^[0-9]+$')
);

-- =====================================================
-- MODULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    route VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PERMISSIONS TABLE (Checkbox-based permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_default_student BOOLEAN DEFAULT false,
    is_default_staff BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, permission_key)
);

-- =====================================================
-- USER PERMISSIONS TABLE (Checkbox assignments)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_id)
);

-- =====================================================
-- ROLE TEMPLATES TABLE (Default permission sets)
-- =====================================================
CREATE TABLE IF NOT EXISTS role_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(100) UNIQUE NOT NULL,
    user_type user_type NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ROLE TEMPLATE PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS role_template_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_template_id, permission_id)
);

-- =====================================================
-- AUDIT LOG TABLE (Track permission changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_students_reg_number ON students(registration_number);
CREATE INDEX idx_staff_uid ON staff(uid);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX idx_permissions_module ON permissions(module_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- TRIGGER: Update timestamp on record update
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA: Modules
-- =====================================================
INSERT INTO modules (name, slug, description, icon, route, display_order) VALUES
('Research & Patent Management', 'research-patent', 'Manage research papers, patents, and intellectual property', 'FileText', '/modules/research-patent', 1)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- INITIAL DATA: Permissions for Research & Patent Module
-- =====================================================
INSERT INTO permissions (module_id, permission_name, permission_key, description, is_default_student, is_default_staff)
SELECT 
    m.id,
    'View Research Papers',
    'research.view',
    'Ability to view research papers',
    true,
    true
FROM modules m WHERE m.slug = 'research-patent'
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO permissions (module_id, permission_name, permission_key, description, is_default_student, is_default_staff)
SELECT 
    m.id,
    'Submit Research Paper',
    'research.submit',
    'Ability to submit new research papers',
    true,
    true
FROM modules m WHERE m.slug = 'research-patent'
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO permissions (module_id, permission_name, permission_key, description, is_default_student, is_default_staff)
SELECT 
    m.id,
    'Review Research Papers',
    'research.review',
    'Ability to review and approve research papers',
    false,
    true
FROM modules m WHERE m.slug = 'research-patent'
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO permissions (module_id, permission_name, permission_key, description, is_default_student, is_default_staff)
SELECT 
    m.id,
    'View Patents',
    'patent.view',
    'Ability to view patent applications',
    true,
    true
FROM modules m WHERE m.slug = 'research-patent'
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO permissions (module_id, permission_name, permission_key, description, is_default_student, is_default_staff)
SELECT 
    m.id,
    'Submit Patent',
    'patent.submit',
    'Ability to submit patent applications',
    false,
    true
FROM modules m WHERE m.slug = 'research-patent'
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO permissions (module_id, permission_name, permission_key, description, is_default_student, is_default_staff)
SELECT 
    m.id,
    'Manage Patents',
    'patent.manage',
    'Ability to manage and process patent applications',
    false,
    true
FROM modules m WHERE m.slug = 'research-patent'
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- Research & Patent Module Tables
-- =====================================================

-- RESEARCH PAPERS TABLE
CREATE TABLE IF NOT EXISTS research_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    abstract TEXT NOT NULL,
    keywords TEXT[],
    authors TEXT,
    journal_name VARCHAR(255),
    publication_date DATE,
    doi VARCHAR(255),
    url TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    review_comments TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PATENTS TABLE
CREATE TABLE IF NOT EXISTS patents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    inventors TEXT,
    application_number VARCHAR(100),
    filing_date DATE,
    patent_number VARCHAR(100),
    grant_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    status_comments TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Research & Patent Indexes
CREATE INDEX idx_research_papers_user ON research_papers(user_id);
CREATE INDEX idx_research_papers_status ON research_papers(status);
CREATE INDEX idx_patents_user ON patents(user_id);
CREATE INDEX idx_patents_status ON patents(status);

-- Research & Patent Triggers
CREATE TRIGGER update_research_papers_updated_at BEFORE UPDATE ON research_papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patents_updated_at BEFORE UPDATE ON patents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
