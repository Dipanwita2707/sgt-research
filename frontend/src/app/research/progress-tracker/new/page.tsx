'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import progressTrackerService, {
  TrackerPublicationType,
  CreateTrackerRequest,
  publicationTypeLabels,
  publicationTypeIcons,
  ResearchTrackerStatus,
  statusLabels,
} from '@/services/progressTracker.service';

// Category-specific form components
import {
  ResearchPaperWritingForm,
  BookWritingForm,
  BookChapterWritingForm,
  ConferencePaperWritingForm,
} from '@/components/progress-tracker/forms';

import {
  ResearchPaperStatusForm,
  BookStatusForm,
  BookChapterStatusForm,
  ConferencePaperStatusForm,
} from '@/components/progress-tracker/status-forms';

export default function NewTrackerPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1); // 1: Select Type, 2: Fill Details
  const [selectedType, setSelectedType] = useState<TrackerPublicationType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Common fields
  const [title, setTitle] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [startingStatus, setStartingStatus] = useState<ResearchTrackerStatus>('communicated');
  
  // Auto-populate from logged-in user
  const schoolId = user?.employeeDetails?.department?.school?.id || '';
  const departmentId = user?.employeeDetails?.department?.id || '';
  const schoolName = user?.employeeDetails?.department?.school?.name || 'Not assigned';
  const departmentName = user?.employeeDetails?.department?.name || 'Not assigned';
  
  // Log for debugging
  console.log('User data:', user);
  console.log('School ID:', schoolId, 'Department ID:', departmentId);
  console.log('School Name:', schoolName, 'Department Name:', departmentName);
  
  // Type-specific data
  const [typeData, setTypeData] = useState<Record<string, unknown>>({});

  const handleTypeSelect = (type: TrackerPublicationType) => {
    setSelectedType(type);
    setTypeData({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data: CreateTrackerRequest = {
        publicationType: selectedType,
        title,
        schoolId: schoolId || undefined,
        departmentId: departmentId || undefined,
        expectedCompletionDate: expectedCompletionDate || undefined,
        notes: notes || undefined,
        currentStatus: startingStatus,
      };

      // Add type-specific data
      if (selectedType === 'research_paper') {
        data.researchPaperData = typeData;
      } else if (selectedType === 'book') {
        data.bookData = typeData;
      } else if (selectedType === 'book_chapter') {
        data.bookChapterData = typeData;
      } else if (selectedType === 'conference_paper') {
        data.conferencePaperData = typeData;
      }

      const response = await progressTrackerService.createTracker(data);
      router.push(`/research/progress-tracker/${response.data.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tracker';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/research/progress-tracker"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Trackers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Track New Research</h1>
        <p className="text-gray-600 mt-1">
          Start tracking your research journey from writing to publication
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-8">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
          1
        </div>
        <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
          2
        </div>
      </div>

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What are you working on?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(publicationTypeLabels) as [TrackerPublicationType, string][]).map(([type, label]) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className="flex items-center gap-4 p-6 bg-white rounded-lg shadow hover:shadow-md hover:border-indigo-500 border-2 border-transparent transition-all text-left"
              >
                <span className="text-4xl">{publicationTypeIcons[type]}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{label}</h3>
                  <p className="text-sm text-gray-500">
                    {type === 'research_paper' && 'Journal articles, research papers'}
                    {type === 'book' && 'Textbooks, reference books, edited volumes'}
                    {type === 'book_chapter' && 'Chapters in edited books'}
                    {type === 'conference_paper' && 'Conference papers, presentations, keynotes'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Fill Details */}
      {step === 2 && selectedType && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow p-6">
            {/* Selected Type Badge */}
            <div className="flex items-center gap-2 mb-6 pb-4 border-b">
              <span className="text-2xl">{publicationTypeIcons[selectedType]}</span>
              <span className="font-semibold text-gray-900">{publicationTypeLabels[selectedType]}</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ml-auto text-sm text-indigo-600 hover:text-indigo-700"
              >
                Change Type
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Common Fields */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder={
                    selectedType === 'research_paper' ? 'e.g., Impact of AI on Healthcare Diagnostics' :
                    selectedType === 'book' ? 'e.g., Advanced Machine Learning Techniques' :
                    selectedType === 'book_chapter' ? 'e.g., Deep Learning in Medical Imaging' :
                    'e.g., Novel Approach to Data Security'
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School/Faculty</label>
                  <input
                    type="text"
                    value={schoolName}
                    readOnly
                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-gray-600 cursor-not-allowed"
                  />
                  {!schoolId && (
                    <p className="mt-1 text-xs text-amber-600">
                      ⚠️ No school assigned. Please contact admin to assign your school/faculty.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={departmentName}
                    readOnly
                    className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm text-gray-600 cursor-not-allowed"
                  />
                  {!departmentId && (
                    <p className="mt-1 text-xs text-amber-600">
                      ⚠️ No department assigned. Please contact admin to assign your department.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Completion Date</label>
                  <input
                    type="date"
                    value={expectedCompletionDate}
                    onChange={(e) => setExpectedCompletionDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stage <span className="text-gray-400 font-normal">(Where are you now?)</span>
                  </label>
                  <select
                    value={startingStatus}
                    onChange={(e) => setStartingStatus(e.target.value as ResearchTrackerStatus)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select</option>
                    <option value="communicated">Communicated</option>
                    <option value="rejected">Rejected</option>
                    <option value="accepted">Accepted</option>
                    <option value="published">Published</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Start tracking from your current progress stage</p>
                </div>
              </div>

              {/* Type-Specific Form */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedType === 'research_paper' && 'Research Paper Details'}
                  {selectedType === 'book' && 'Book Details'}
                  {selectedType === 'book_chapter' && 'Book Chapter Details'}
                  {selectedType === 'conference_paper' && 'Conference Paper Details'}
                </h3>
                
                {/* Base form fields - always visible */}
                {selectedType === 'research_paper' && (
                  <ResearchPaperWritingForm data={typeData} onChange={setTypeData} />
                )}
                {selectedType === 'book' && (
                  <BookWritingForm data={typeData} onChange={setTypeData} />
                )}
                {selectedType === 'book_chapter' && (
                  <BookChapterWritingForm data={typeData} onChange={setTypeData} />
                )}
                {selectedType === 'conference_paper' && (
                  <ConferencePaperWritingForm data={typeData} onChange={setTypeData} />
                )}
              </div>

              {/* Additional Status-Specific Fields */}
              {startingStatus && startingStatus !== 'communicated' && (
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Additional Details for {statusLabels[startingStatus]} Stage
                  </h3>
                  
                  {selectedType === 'research_paper' && (
                    <ResearchPaperStatusForm status={startingStatus} data={typeData} onChange={setTypeData} />
                  )}
                  {selectedType === 'book' && (
                    <BookStatusForm status={startingStatus} data={typeData} onChange={setTypeData} />
                  )}
                  {selectedType === 'book_chapter' && (
                    <BookChapterStatusForm status={startingStatus} data={typeData} onChange={setTypeData} />
                  )}
                  {selectedType === 'conference_paper' && (
                    <ConferencePaperStatusForm status={startingStatus} data={typeData} onChange={setTypeData} />
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Any additional notes about your research..."
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/research/progress-tracker')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Start Tracking'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
