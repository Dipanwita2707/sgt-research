-- Add pending_mentor_approval to ipr_status_enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_mentor_approval' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ipr_status_enum')) THEN
        ALTER TYPE ipr_status_enum ADD VALUE 'pending_mentor_approval' AFTER 'draft';
    END IF;
END
$$;
