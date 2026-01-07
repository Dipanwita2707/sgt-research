-- Update existing status values to map to the new 4-status system
-- Mapping:
-- writing, submitted, under_review -> communicated
-- revision_requested, revised -> accepted
-- accepted -> accepted
-- published -> published
-- rejected -> rejected

UPDATE research_progress_tracker
SET current_status = 'rejected'
WHERE current_status = 'rejected';

UPDATE research_progress_tracker
SET current_status = 'published'
WHERE current_status = 'published';

UPDATE research_progress_tracker
SET current_status = 'accepted'
WHERE current_status IN ('accepted', 'revision_requested', 'revised');

UPDATE research_progress_tracker
SET current_status = 'communicated'
WHERE current_status IN ('writing', 'submitted', 'under_review');

-- Update status history table
UPDATE research_progress_status_history
SET from_status = 'rejected'
WHERE from_status = 'rejected';

UPDATE research_progress_status_history
SET to_status = 'rejected'
WHERE to_status = 'rejected';

UPDATE research_progress_status_history
SET from_status = 'published'
WHERE from_status = 'published';

UPDATE research_progress_status_history
SET to_status = 'published'
WHERE to_status = 'published';

UPDATE research_progress_status_history
SET from_status = 'accepted'
WHERE from_status IN ('accepted', 'revision_requested', 'revised');

UPDATE research_progress_status_history
SET to_status = 'accepted'
WHERE to_status IN ('accepted', 'revision_requested', 'revised');

UPDATE research_progress_status_history
SET from_status = 'communicated'
WHERE from_status IN ('writing', 'submitted', 'under_review');

UPDATE research_progress_status_history
SET to_status = 'communicated'
WHERE to_status IN ('writing', 'submitted', 'under_review');
