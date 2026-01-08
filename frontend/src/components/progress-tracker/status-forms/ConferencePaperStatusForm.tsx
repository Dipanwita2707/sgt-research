'use client';

import { ResearchTrackerStatus } from '@/services/progressTracker.service';

interface ConferencePaperStatusFormProps {
  status: ResearchTrackerStatus;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  conferenceSubType?: string;
}

export default function ConferencePaperStatusForm({ status, data, onChange, conferenceSubType }: ConferencePaperStatusFormProps) {
  const handleChange = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  switch (status) {
    case 'communicated':
      return (
        <div className="space-y-4">
          {/* Show conference type info banner */}
          {conferenceSubType && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-800">
                <span className="font-semibold">Conference Type:</span>{' '}
                {conferenceSubType === 'paper_not_indexed' && 'Papers in Conferences (not Indexed) / Seminars / Workshops'}
                {conferenceSubType === 'paper_indexed_scopus' && 'Paper in conference proceeding indexed in Scopus'}
                {conferenceSubType === 'keynote_speaker_invited_talks' && 'Keynote Speaker / Session chair / Invited Talks'}
                {conferenceSubType === 'organizer_coordinator_member' && 'Organizer / Coordinator / Member of conference'}
              </p>
            </div>
          )}

          {/* Conference Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conference Date (From)</label>
              <input
                type="date"
                value={(data.conferenceDateFrom as string) || ''}
                onChange={(e) => handleChange('conferenceDateFrom', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conference Date (To)</label>
              <input
                type="date"
                value={(data.conferenceDateTo as string) || ''}
                onChange={(e) => handleChange('conferenceDateTo', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Proceedings Title & Quartile (for paper conferences only) */}
          {(conferenceSubType === 'paper_not_indexed' || conferenceSubType === 'paper_indexed_scopus') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title of the Proceedings</label>
                <input
                  type="text"
                  value={(data.proceedingsTitle as string) || ''}
                  onChange={(e) => handleChange('proceedingsTitle', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter proceedings title"
                />
              </div>
              {conferenceSubType === 'paper_indexed_scopus' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proceedings Quartile <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={(data.proceedingsQuartile as string) || 'na'}
                    onChange={(e) => handleChange('proceedingsQuartile', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="na">NA</option>
                    <option value="q1">Q1</option>
                    <option value="q2">Q2</option>
                    <option value="q3">Q3</option>
                    <option value="q4">Q4</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* National/International & Virtual */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National / International <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 mt-2">
                {['national', 'international'].map(v => (
                  <label key={v} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="conferenceType"
                      value={v}
                      checked={((data.conferenceType as string) || '') === v}
                      onChange={(e) => handleChange('conferenceType', e.target.value)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="ml-2 capitalize">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Virtual Conference?</label>
              <div className="flex gap-4 mt-2">
                {['yes', 'no'].map(v => (
                  <label key={v} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="virtualConference"
                      value={v}
                      checked={((data.virtualConference as string) || '') === v}
                      onChange={(e) => handleChange('virtualConference', e.target.value)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="ml-2 capitalize">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Submission Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submission Date</label>
            <input
              type="date"
              value={(data.submissionDate as string) || ''}
              onChange={(e) => handleChange('submissionDate', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      );

    case 'submitted':
      return (
        <div className="space-y-4">
          {/* Submission Date & Paper ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Submission Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={(data.submissionDate as string) || ''}
                onChange={(e) => handleChange('submissionDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper/Manuscript ID</label>
              <input
                type="text"
                value={(data.manuscriptId as string) || ''}
                onChange={(e) => handleChange('manuscriptId', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Conference assigned ID"
              />
            </div>
          </div>

          {/* Submission Portal/Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submission Portal/Link</label>
            <input
              type="url"
              value={(data.submissionPortal as string) || ''}
              onChange={(e) => handleChange('submissionPortal', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="https://..."
            />
          </div>

          {/* Progress Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Progress Notes</label>
            <textarea
              value={(data.progressNotes as string) || ''}
              onChange={(e) => handleChange('progressNotes', e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Brief update on submission status..."
            />
          </div>

          {/* Upload Document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Submission Confirmation</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('submissionDocument', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload submission confirmation email or receipt (PDF, DOC, DOCX)</p>
          </div>
        </div>
      );

    case 'accepted':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Date</label>
            <input
              type="date"
              value={(data.acceptanceDate as string) || ''}
              onChange={(e) => handleChange('acceptanceDate', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Presentation Type</label>
            <select
              value={(data.presentationType as string) || ''}
              onChange={(e) => handleChange('presentationType', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option value="oral">Oral Presentation</option>
              <option value="poster">Poster Presentation</option>
              <option value="keynote">Keynote</option>
              <option value="invited">Invited Talk</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session/Track</label>
            <input
              type="text"
              value={(data.sessionTrack as string) || ''}
              onChange={(e) => handleChange('sessionTrack', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g., Track 2: Machine Learning"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Presentation Date/Time</label>
            <input
              type="datetime-local"
              value={(data.presentationDateTime as string) || ''}
              onChange={(e) => handleChange('presentationDateTime', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      );

    case 'published':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publication Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={(data.publicationDate as string) || ''}
                onChange={(e) => handleChange('publicationDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISBN/ISSN</label>
              <input
                type="text"
                value={(data.isbn as string) || ''}
                onChange={(e) => handleChange('isbn', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Proceedings ISBN/ISSN"
              />
            </div>
          </div>

          {/* Document Submission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Conference Paper <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('paperDocument', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload the published conference paper (PDF or Word document)</p>
          </div>

          {/* Faculty Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Remarks</label>
            <textarea
              value={(data.facultyRemarks as string) || ''}
              onChange={(e) => handleChange('facultyRemarks', e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Any additional remarks or comments..."
            />
          </div>
        </div>
      );

    case 'rejected':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
            <select
              value={(data.rejectionReason as string) || ''}
              onChange={(e) => handleChange('rejectionReason', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option value="out_of_scope">Out of Scope</option>
              <option value="quality_issues">Quality Issues</option>
              <option value="incomplete_work">Incomplete Work</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Summary</label>
            <textarea
              value={(data.feedbackSummary as string) || ''}
              onChange={(e) => handleChange('feedbackSummary', e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Summary of rejection feedback..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan to Resubmit?</label>
            <select
              value={(data.planToResubmit as string) || ''}
              onChange={(e) => handleChange('planToResubmit', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option value="same_conference">Yes, to same conference</option>
              <option value="different_conference">Yes, to different conference</option>
              <option value="no">No</option>
              <option value="undecided">Undecided</option>
            </select>
          </div>
        </div>
      );

    default:
      return (
        <p className="text-sm text-gray-500">No additional fields required for this status.</p>
      );
  }
}
