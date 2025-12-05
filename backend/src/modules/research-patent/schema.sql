-- Research & Patent Module Tables

-- =====================================================
-- RESEARCH PAPERS TABLE
-- =====================================================
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

-- =====================================================
-- PATENTS TABLE
-- =====================================================
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

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_research_papers_user ON research_papers(user_id);
CREATE INDEX idx_research_papers_status ON research_papers(status);
CREATE INDEX idx_patents_user ON patents(user_id);
CREATE INDEX idx_patents_status ON patents(status);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_research_papers_updated_at BEFORE UPDATE ON research_papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patents_updated_at BEFORE UPDATE ON patents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
