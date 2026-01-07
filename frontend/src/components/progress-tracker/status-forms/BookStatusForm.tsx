'use client';

import { ResearchTrackerStatus } from '@/services/progressTracker.service';

interface BookStatusFormProps {
  status: ResearchTrackerStatus;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export default function BookStatusForm({ status, data, onChange }: BookStatusFormProps) {
  const handleChange = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  switch (status) {
    case 'communicated':
      return (
        <div className="space-y-4">
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

          {/* Author Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author Type <span className="text-red-500">*</span>
            </label>
            <select
              value={(data.bookPublicationType as string) || 'authored'}
              onChange={(e) => handleChange('bookPublicationType', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="authored">Authored</option>
              <option value="edited">Edited</option>
            </select>
          </div>

          {/* Publisher & Communication Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(data.publisherName as string) || ''}
                onChange={(e) => handleChange('publisherName', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., Springer, Elsevier"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Communication Date</label>
              <input
                type="date"
                value={(data.communicationDate as string) || ''}
                onChange={(e) => handleChange('communicationDate', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* National/International & Interdisciplinary */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interdisciplinary (SGT) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 mt-2">
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
          </div>

          {/* Official ID Communication */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Have you communicated the publication with official ID? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {['yes', 'no'].map(v => (
                <label key={v} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="communicatedWithOfficialId"
                    value={v}
                    checked={(data.communicatedWithOfficialId as string) === v}
                    onChange={(e) => handleChange('communicatedWithOfficialId', e.target.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="ml-2 capitalize">{v}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Personal Email if not communicated with official ID */}
          {data.communicatedWithOfficialId === 'no' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Personal Email ID <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={(data.personalEmail as string) || ''}
                onChange={(e) => handleChange('personalEmail', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter your personal email address"
              />
            </div>
          )}
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(data.contractSigned as boolean) || false}
              onChange={(e) => handleChange('contractSigned', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label className="text-sm text-gray-700">Contract Signed</label>
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
              Upload Book Document <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleChange('bookDocument', file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">Upload the published book (PDF or Word document)</p>
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
              <option value="not_suitable">Not Suitable for Publisher</option>
              <option value="quality_issues">Quality Issues</option>
              <option value="market_concerns">Market Concerns</option>
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
