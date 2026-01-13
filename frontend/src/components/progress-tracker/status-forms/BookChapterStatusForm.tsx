'use client';

import { ResearchTrackerStatus } from '@/services/progressTracker.service';

interface BookChapterStatusFormProps {
  status: ResearchTrackerStatus;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export default function BookChapterStatusForm({ status, data, onChange }: BookChapterStatusFormProps) {
  const handleChange = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  // Reusable Author Section Component
  const AuthorSection = () => (
    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-teal-900 mb-3">Author Information</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Authors <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={(data.totalAuthors as number) || 1}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              handleChange('totalAuthors', val);
              if ((data.sgtAffiliatedAuthors as number) > val) {
                handleChange('sgtAffiliatedAuthors', val);
              }
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SGT Authors <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max={(data.totalAuthors as number) || 1}
            value={(data.sgtAffiliatedAuthors as number) || 1}
            onChange={(e) => handleChange('sgtAffiliatedAuthors', parseInt(e.target.value) || 1)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="1"
          />
        </div>
      </div>
      <p className="text-xs text-teal-700 mt-2">
        💡 Incentive will be distributed equally among all SGT authors
      </p>
    </div>
  );

  switch (status) {
    case 'writing':
    case 'communicated':
      return (
        <div className="space-y-4">
          {/* Book Title & Chapter Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Book Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={(data.bookTitle as string) || ''}
              onChange={(e) => handleChange('bookTitle', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter the title of the book"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Number</label>
              <input
                type="text"
                value={(data.chapterNumber as string) || ''}
                onChange={(e) => handleChange('chapterNumber', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., Chapter 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Numbers</label>
              <input
                type="text"
                value={(data.pageNumbers as string) || ''}
                onChange={(e) => handleChange('pageNumbers', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., 100-125"
              />
            </div>
          </div>

          {/* Editors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Editors</label>
            <input
              type="text"
              value={(data.editors as string) || ''}
              onChange={(e) => handleChange('editors', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter editor names (comma separated)"
            />
          </div>

          {/* Publisher & National/International */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(data.publisherName as string) || ''}
                onChange={(e) => handleChange('publisherName', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter publisher name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                National / International <span className="text-red-500">*</span>
              </label>
              <select
                value={(data.nationalInternational as string) || ''}
                onChange={(e) => handleChange('nationalInternational', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">-- Select --</option>
                <option value="national">National</option>
                <option value="international">International</option>
              </select>
            </div>
          </div>

          {/* Publication Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publication Type <span className="text-red-500">*</span>
            </label>
            <select
              value={(data.bookIndexingType as string) || 'scopus_indexed'}
              onChange={(e) => handleChange('bookIndexingType', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="scopus_indexed">Scopus Indexed</option>
              <option value="non_indexed">Non-Indexed</option>
              <option value="sgt_publication_house">SGT Publication House</option>
            </select>
          </div>

          {/* Interdisciplinary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interdisciplinary (SGT) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {['yes', 'no'].map(v => (
                <label key={v} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isInterdisciplinary"
                    value={v}
                    checked={(data.isInterdisciplinary as string) === v}
                    onChange={(e) => handleChange('isInterdisciplinary', e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="ml-2 capitalize">{v}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Author Section */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-teal-900 mb-3">Author Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Authors <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={(data.totalAuthors as number) || 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    handleChange('totalAuthors', val);
                    if ((data.sgtAffiliatedAuthors as number) > val) {
                      handleChange('sgtAffiliatedAuthors', val);
                    }
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SGT Authors <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={(data.totalAuthors as number) || 1}
                  value={(data.sgtAffiliatedAuthors as number) || 1}
                  onChange={(e) => handleChange('sgtAffiliatedAuthors', parseInt(e.target.value) || 1)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="1"
                />
              </div>
            </div>
            <p className="text-xs text-teal-700 mt-2">
              💡 Incentive will be distributed equally among all SGT authors
            </p>
          </div>

          {/* Communication Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Communication Date</label>
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
          {/* Author Section */}
          <AuthorSection />

          {/* Submission Date & Chapter ID */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Chapter/Manuscript ID</label>
              <input
                type="text"
                value={(data.manuscriptId as string) || ''}
                onChange={(e) => handleChange('manuscriptId', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Publisher assigned ID"
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
          {/* Author Section */}
          <AuthorSection />

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Number Assigned</label>
            <input
              type="text"
              value={(data.chapterNumber as string) || ''}
              onChange={(e) => handleChange('chapterNumber', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
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
        </div>
      );

    case 'published':
      return (
        <div className="space-y-4">
          {/* Author Section */}
          <AuthorSection />

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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISBN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(data.isbn as string) || ''}
                onChange={(e) => handleChange('isbn', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="978-xxx-xxx-xxxx-x"
              />
            </div>
          </div>

          {/* Document Submission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Book Chapter Document <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('chapterDocument', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload the published book chapter (PDF or Word document)</p>
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
          {/* Author Section */}
          <AuthorSection />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
            <select
              value={(data.rejectionReason as string) || ''}
              onChange={(e) => handleChange('rejectionReason', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option value="not_suitable">Not Suitable for Book</option>
              <option value="quality_issues">Quality Issues</option>
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
              <option value="same_publisher">Yes, to same publisher</option>
              <option value="different_publisher">Yes, to different publisher</option>
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
