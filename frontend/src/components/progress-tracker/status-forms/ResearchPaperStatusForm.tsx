'use client';

import { ResearchTrackerStatus } from '@/services/progressTracker.service';

interface ResearchPaperStatusFormProps {
  status: ResearchTrackerStatus;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export default function ResearchPaperStatusForm({ status, data, onChange }: ResearchPaperStatusFormProps) {
  const handleChange = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  switch (status) {
    case 'communicated':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Communication Date</label>
              <input
                type="date"
                value={(data.communicationDate as string) || ''}
                onChange={(e) => handleChange('communicationDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manuscript ID</label>
              <input
                type="text"
                value={(data.manuscriptId as string) || ''}
                onChange={(e) => handleChange('manuscriptId', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Journal assigned manuscript ID"
              />
            </div>
          </div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Communication Document</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('communicationDocument', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload submission confirmation or communication proof (PDF, DOC, DOCX)</p>
          </div>
        </div>
      );

    case 'accepted':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manuscript ID</label>
              <input
                type="text"
                value={(data.manuscriptId as string) || ''}
                onChange={(e) => handleChange('manuscriptId', e.target.value)}
                className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="From communication stage"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Manuscript ID from communication stage</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Date</label>
              <input
                type="date"
                value={(data.acceptanceDate as string) || ''}
                onChange={(e) => handleChange('acceptanceDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Publication Date</label>
            <input
              type="date"
              value={(data.expectedPublicationDate as string) || ''}
              onChange={(e) => handleChange('expectedPublicationDate', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Notes</label>
            <textarea
              value={(data.acceptanceNotes as string) || ''}
              onChange={(e) => handleChange('acceptanceNotes', e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Notes about the acceptance..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Acceptance Letter <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('acceptanceLetter', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload official acceptance letter (PDF, DOC, DOCX)</p>
          </div>
        </div>
      );

    case 'published':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date</label>
              <input
                type="date"
                value={(data.publicationDate as string) || ''}
                onChange={(e) => handleChange('publicationDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DOI</label>
              <input
                type="text"
                value={(data.doi as string) || ''}
                onChange={(e) => handleChange('doi', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="10.xxxx/xxxxx"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
              <input
                type="text"
                value={(data.volume as string) || ''}
                onChange={(e) => handleChange('volume', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue</label>
              <input
                type="text"
                value={(data.issue as string) || ''}
                onChange={(e) => handleChange('issue', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
              <input
                type="text"
                value={(data.pageNumbers as string) || ''}
                onChange={(e) => handleChange('pageNumbers', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., 123-145"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISSN</label>
              <input
                type="text"
                value={(data.issn as string) || ''}
                onChange={(e) => handleChange('issn', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quartile</label>
              <select
                value={(data.quartile as string) || ''}
                onChange={(e) => handleChange('quartile', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select</option>
                <option value="Top 1%">Top 1%</option>
                <option value="Top 5%">Top 5%</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impact Factor</label>
              <input
                type="number"
                step="0.001"
                value={(data.impactFactor as number) || ''}
                onChange={(e) => handleChange('impactFactor', parseFloat(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SJR</label>
              <input
                type="number"
                step="0.001"
                value={(data.sjr as number) || ''}
                onChange={(e) => handleChange('sjr', parseFloat(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indexed In</label>
            <select
              value={(data.indexedIn as string) || ''}
              onChange={(e) => handleChange('indexedIn', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option value="scopus">Scopus</option>
              <option value="wos">Web of Science</option>
              <option value="both">Both Scopus & WoS</option>
              <option value="ugc">UGC Care</option>
              <option value="pubmed">PubMed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Publication URL</label>
            <input
              type="url"
              value={(data.weblink as string) || ''}
              onChange={(e) => handleChange('weblink', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Published Paper <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('publishedPaper', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload final published paper (PDF, DOC, DOCX)</p>
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
              <option value="methodology_issues">Methodology Issues</option>
              <option value="insufficient_novelty">Insufficient Novelty</option>
              <option value="poor_writing">Poor Writing Quality</option>
              <option value="incomplete_research">Incomplete Research</option>
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
              <option value="same_journal">Yes, to same journal</option>
              <option value="different_journal">Yes, to different journal</option>
              <option value="no">No</option>
              <option value="undecided">Undecided</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Rejection Letter</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('rejectionLetter', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload rejection letter for reference (PDF, DOC, DOCX)</p>
          </div>
        </div>
      );

    default:
      return (
        <p className="text-sm text-gray-500">No additional fields required for this status.</p>
      );
  }
}
