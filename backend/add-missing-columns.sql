-- Add missing columns back to research_contribution
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_contribution' AND column_name='quartile') THEN
        ALTER TABLE research_contribution ADD COLUMN quartile VARCHAR(16);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_contribution' AND column_name='sdg_goals') THEN
        ALTER TABLE research_contribution ADD COLUMN sdg_goals TEXT[];
    END IF;
END $$;

-- Add missing columns back to research_incentive_policy
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_incentive_policy' AND column_name='first_author_percentage') THEN
        ALTER TABLE research_incentive_policy ADD COLUMN first_author_percentage DECIMAL(5,2) DEFAULT 40;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='research_incentive_policy' AND column_name='corresponding_author_percentage') THEN
        ALTER TABLE research_incentive_policy ADD COLUMN corresponding_author_percentage DECIMAL(5,2) DEFAULT 30;
    END IF;
END $$;
