# IPR Module System Overview

This document explains the purpose, data model, workflows, permissions, and APIs for the IPR (Intellectual Property Rights) module. It is designed so that an engineer can understand end‑to‑end logic without reading the codebase.

## Purpose
- Provide a unified flow for filing IPR applications (Patent, Copyright, Trademark, Design) by students, faculty, and staff.
- Enable mentor collaborative review for student filings.
- Manage DRD review and approvals, including head approvals and government filing steps.
- Track contributors/inventors, notifications, status history, and incentives/points distribution after publication.

## Roles
- Student: Creates IPR application, selects mentor, responds to mentor/DRD edit suggestions.
- Faculty/Staff (Applicant or Contributor): Creates applications (without mentor flow) or is added as an inventor/contributor.
- Mentor (Faculty): Reviews student applications; can approve or request changes via edit suggestions.
- DRD Reviewer: Reviews submitted applications; can approve (with current logic direct to `drd_head_approved`) or request changes.
- DRD Head: Final approval stage represented in status; simplified via controller logic.

## Key Status Flow
Statuses are in `IprApplication.status`. Typical paths:
- Student: `draft → pending_mentor_approval → submitted → under_drd_review → drd_head_approved → submitted_to_govt → published → completed`
- Faculty/Staff (no mentor): `draft → submitted → under_drd_review → drd_head_approved → ...`
- Changes requested: `changes_required → resubmitted` (Mentor flow refined: student acceptance of mentor suggestions returns to `pending_mentor_approval`).
- Rejections or cancellation: `drd_rejected`, `cancelled`.

Notes:
- Auto-submission to mentor for students with `filingType=complete` and mentor present.
- For faculty/staff filing with `filingType=complete`, auto-submission goes directly to DRD (`submitted`).
- DRD approvals currently set status to `drd_head_approved` directly.

## Data Models (Prisma)
- IprApplication: Core application (title, description, iprType, projectType, filingType, applicantUserId, school/department, sdgs, status, applicationNumber, incentiveAmount, pointsAwarded, publicationId, timestamps).
- IprApplicantDetails: Applicant metadata (e.g., mentorUid, name, contact; also `metadata.contributors` at creation).
- IprContributor: Inventors/contributors linked to application — fields: `userId?`, `uid?`, `name`, `email?`, `phone?`, `department?`, `employeeCategory?`, `employeeType?`, `role` (inventor/co-inventor/etc.), access flags (`canView`, `canEdit=false`). Unique per `(iprApplicationId, uid)`.
- IprStatusHistory: Tracks transitions (fromStatus, toStatus, changedById, comments, metadata, timestamps).
- Notification: System notifications to users; used for mentor approvals, contributor added, incentives credited, publication events.

## Backend Controllers (High-Level)
- ipr.controller:
  - Create application: assigns `applicationNumber`, creates `IprApplicantDetails`, writes `IprStatusHistory`, and creates `IprContributor` entries from provided contributors (resolving `uid` → `userId` when possible). Auto-submission based on `filingType` & role.
  - Update application: editable in `draft`, `changes_required`, `pending_mentor_approval`, `resubmitted`. Updates details, SDGs, files; auto-submission if `filingType` changes to `complete`.
  - Get my applications: returns applications created by current user.
  - Get contributed applications: returns applications where current user is listed in `IprContributor` (by `userId` or `uid`), excluding those where user is the applicant. Includes contributor role and access flags.
  - Exposes flags like `changesRequestedByMentor` for UI decisions.
- collaborativeEditing.controller:
  - Mentor/student edit suggestions (create, list, respond). On student response:
    - If suggestion note starts with `[MENTOR]`, accepting routes status back to `pending_mentor_approval` (not `resubmitted`).
- drdReview.controller:
  - DRD review submission; approvals now set status to `drd_head_approved` directly.
  - Publication handling: `addPublicationId` sets `status=published`, stores per-inventor incentive/points on `IprApplication`, credits notifications to inventors.
  - Incentive calculation utilizes active `IncentivePolicy` or defaults; equal split among inventors (contributors with inventor roles plus applicant if internal).
- incentivePolicy.controller:
  - CRUD for incentive policy per `iprType` (base amount, points, split policy). Default values used if none active.
- finance.controller:
  - Aggregates incentives and points, auditing, and reporting helpers.

## Permissions & Visibility
- Editing allowed statuses: `draft`, `changes_required`, `pending_mentor_approval`, `resubmitted` for the applicant.
- Approve buttons require BOTH review and approve permissions (`canApprove` logic updated on frontend).
- Contributors can view applications they are added to (`canView=true`) and see their role; they cannot edit (`canEdit=false`).
- Contributed applications appear under the "As Contributor" view. Query matches either `userId` or `uid` in `IprContributor`.

## Incentives & Points
- Stored on `IprApplication` at publication: `incentiveAmount` and `pointsAwarded` represent per-inventor share after split.
- Inventor set includes `IprContributor` entries with inventor roles and any internal applicant not already listed.
- Notifications sent to each inventor with their credited share.
- Frontend totals must sum numerically; beware of string concatenation — convert using `Number()`/`parseInt()`.

## Frontend (Next.js) Overview
- My Applications (`/ipr/my-applications`): Lists user’s applications; shows earnings summary and tabs for All, In Progress, Completed, and an "As Contributor" entry panel.
- Contributed IPRs (`/ipr/contributed` and `/ipr/contributed/[id]`): Lists applications where the user is a contributor; shows role and access flags.
- IPR Apply (`/ipr/apply?type=...`): New application form; shows "Already in Process" combining own and contributed applications; ID should use `applicationNumber` rather than UUID slices.
- Mentor Collaborative Review Modal: Allows mentors to suggest edits collaboratively or do traditional reviews; approves to DRD or requests changes (student sees pending suggestions).
- DRD Dashboard: Filters and displays applications at various stages; govt filing tab aligned with `drd_head_approved` and subsequent statuses.

## API Endpoints (Selected)
- `GET /ipr/my` → Own applications (applicant).
- `GET /ipr/contributed` → Applications where user is contributor (excludes those where user is applicant).
- `GET /ipr/contributed/:id` → Single contributed application details.
- `POST /ipr` → Create application; body includes contributors and applicantDetails (e.g., `mentorUid`).
- `PUT /ipr/:id` → Update application; applies file paths, SDGs, fields; triggers auto-submission.
- `POST /ipr/mentor/:id/approve` → Mentor approves; submits to DRD.
- `POST /ipr/mentor/:id/reject` → Mentor requests changes; student must respond.
- `GET /collaborative-editing/:id/suggestions` → List suggestions.
- `POST /collaborative-editing/suggestions/:sid/respond` → Student accepts/rejects; mentor-tagged accept returns to `pending_mentor_approval`.
- `POST /drd/publication/:id` → Add publicationId; sets `published`, credits incentives, notifies.

## Edge Cases & Notes
- Contributor linking: When adding by `uid`, if that UID does not exist internally, `userId` remains null. Incentive credit notifications rely on `userId` for internal users; external contributors won’t receive internal notifications.
- Inventor roles: Incentive split includes roles `inventor`, `co-inventor`, `primary_inventor`, `co_inventor`. Ensure contributors are added with correct roles.
- Totals on frontend: Convert numeric fields from API before aggregation; avoid concatenating strings (e.g., `"500" + "250"` → `"500250"`).
- Status names: Ensure enum usage matches DB (e.g., `cancelled` instead of legacy `withdrawn`).
- Approvals: Current DRD logic sets directly to `drd_head_approved` to simplify flow as requested.

## Typical Flows

### Student Filing (with Mentor)
1. Student creates application (`draft`) with `filingType=complete` and `mentorUid`.
2. Auto-submits to `pending_mentor_approval`; mentor notified.
3. Mentor reviews:
   - Approve → application goes to DRD (`submitted`).
   - Request changes → student sees suggestions and responds; acceptance routes back to `pending_mentor_approval`.
4. DRD approves → status `drd_head_approved`.
5. Admin adds publication ID → `published`, incentives/points credited and notifications sent.

### Faculty/Staff Filing (no Mentor)
1. Applicant creates application (`draft`).
2. If `filingType=complete`, auto-submits to DRD (`submitted`).
3. DRD approves → `drd_head_approved`.
4. Publication added → `published`, incentives credited.

### Contributor Visibility
- Contributors added during creation can view application in "As Contributor".
- Earnings summary shows own and contributed totals; ensure numeric aggregation.

## Troubleshooting Cheatsheet
- Contributed apps not visible: Confirm `IprContributor` has either matching `userId` or `uid`; ensure route `/ipr/contributed` is used by all roles that can be contributors.
- Incentive not added: Incentives are credited at publication via `drdReview.controller.addPublicationId`; check `incentivePolicy` and contributor roles.
- Wrong totals on UI: Convert to numbers in reducers; use `toLocaleString()` only for display.
- Wrong ID shown: Use `applicationNumber` for display instead of UUID slices.

---

