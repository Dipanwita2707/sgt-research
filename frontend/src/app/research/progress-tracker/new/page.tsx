'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { FileText, BookOpen, FileBarChart, Presentation, ChevronDown, ChevronUp, AlertCircle, Users } from 'lucide-react';
import progressTrackerService, {
  TrackerPublicationType,
  CreateTrackerRequest,
  publicationTypeLabels,
  publicationTypeIcons,
  ResearchTrackerStatus,
  statusLabels,
} from '@/services/progressTracker.service';

import {
  ResearchPaperStatusForm,
  BookStatusForm,
  BookChapterStatusForm,
  ConferencePaperStatusForm,
} from '@/components/progress-tracker/status-forms';
import AuthorSection, { AuthorData } from '@/components/progress-tracker/AuthorSection';

export default function NewTrackerPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1); // 1: Select Type, 2: Fill Details
  const [selectedType, setSelectedType] = useState<TrackerPublicationType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    authors: true,
    publication: true,
    status: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Category 1: Basic Information (Common Fields)
  const [title, setTitle] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Auto-populated fields
  const schoolId = user?.employeeDetails?.department?.school?.id || '';
  const departmentId = user?.employeeDetails?.department?.id || '';
  const schoolName = user?.employeeDetails?.department?.school?.name || 'Not assigned';
  const departmentName = user?.employeeDetails?.department?.name || 'Not assigned';
  
  // Category 2: Author Information
  const [authorData, setAuthorData] = useState<AuthorData>({
    totalAuthors: 1,
    totalInternalAuthors: 1,
  });

  // Category 3: Publication-Specific Details
  const [publicationDetails, setPublicationDetails] = useState<Record<string, unknown>>({});

  // Category 4: Current Status & Status-Specific Fields
  const [currentStatus, setCurrentStatus] = useState<ResearchTrackerStatus>('communicated');
  const [statusData, setStatusData] = useState<Record<string, unknown>>({});

  const handleTypeSelect = (type: TrackerPublicationType) => {
    setSelectedType(type);
    setAuthorData({ totalAuthors: 1, totalInternalAuthors: 1 });
    setPublicationDetails({});
    setStatusData({});
    setStep(2);
  };

  const handleAuthorDataChange = (data: AuthorData) => {
    setAuthorData(data);
  };

  const handlePublicationDetailChange = (field: string, value: unknown) => {
    setPublicationDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusDataChange = (data: Record<string, unknown>) => {
    setStatusData(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestData: CreateTrackerRequest = {
        publicationType: selectedType,
        title,
        schoolId: schoolId || undefined,
        departmentId: departmentId || undefined,
        expectedCompletionDate: expectedCompletionDate || undefined,
        notes: notes || undefined,
        currentStatus,
      };

      // Combine publication details with status-specific data
      const combinedData = { ...publicationDetails, ...statusData, ...authorData };

      // Add type-specific data
      if (selectedType === 'research_paper') {
        requestData.researchPaperData = combinedData as any;
      } else if (selectedType === 'book') {
        requestData.bookData = combinedData as any;
      } else if (selectedType === 'book_chapter') {
        requestData.bookChapterData = combinedData as any;
      } else if (selectedType === 'conference_paper') {
        requestData.conferencePaperData = combinedData as any;
      }

      const response = await progressTrackerService.createTracker(requestData);
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

      {/* Step 2: Fill Details - Redesigned with 4 Categories */}
      {step === 2 && selectedType && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected Type Header */}
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3 border-2 border-indigo-100">
            <span className="text-3xl">{publicationTypeIcons[selectedType]}</span>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 text-lg">{publicationTypeLabels[selectedType]}</h2>
              <p className="text-sm text-gray-600">Fill in the details to start tracking your progress</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            >
              Change Type
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* CATEGORY 1: Basic Information (Common - Always Required) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => toggleSection('basic')}
              className="w-full px-6 py-4 flex items-center justify-between text-left bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">1. Basic Information</h3>
                  <p className="text-xs text-gray-600">Essential details about your work</p>
                </div>
              </div>
              {expandedSections.basic ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.basic && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">School/Faculty</label>
                    <input
                      type="text"
                      value={schoolName}
                      readOnly
                      className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-600 cursor-not-allowed"
                    />
                    {!schoolId && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Contact admin to assign your school/faculty
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      value={departmentName}
                      readOnly
                      className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-600 cursor-not-allowed"
                    />
                    {!departmentId && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Contact admin to assign your department
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Completion Date</label>
                  <input
                    type="date"
                    value={expectedCompletionDate}
                    onChange={(e) => setExpectedCompletionDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">When do you expect to complete this work?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Any additional notes or context about your research..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 2: Author Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => toggleSection('authors')}
              className="w-full px-6 py-4 flex items-center justify-between text-left bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">2. Author Information</h3>
                  <p className="text-xs text-gray-600">Specify authorship and collaboration details</p>
                </div>
              </div>
              {expandedSections.authors ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.authors && (
              <div className="p-6">
                <AuthorSection 
                  publicationType={selectedType!} 
                  conferenceSubType={publicationDetails.conferenceSubType as string}
                  onAuthorDataChange={handleAuthorDataChange}
                />
              </div>
            )}
          </div>

          {/* CATEGORY 3: Publication-Specific Details (Type-Dependent) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => toggleSection('publication')}
              className="w-full px-6 py-4 flex items-center justify-between text-left bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                {selectedType === 'book' && <BookOpen className="w-5 h-5 text-green-600" />}
                {selectedType === 'research_paper' && <FileBarChart className="w-5 h-5 text-green-600" />}
                {selectedType === 'conference_paper' && <Presentation className="w-5 h-5 text-green-600" />}
                {selectedType === 'book_chapter' && <FileText className="w-5 h-5 text-green-600" />}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    3. {selectedType === 'research_paper' && 'Journal & Research Details'}
                    {selectedType === 'book' && 'Book Publication Details'}
                    {selectedType === 'book_chapter' && 'Chapter & Book Details'}
                    {selectedType === 'conference_paper' && 'Conference Details'}
                  </h3>
                  <p className="text-xs text-gray-600">Publication-specific information</p>
                </div>
              </div>
              {expandedSections.publication ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.publication && (
              <div className="p-6">
                {selectedType === 'research_paper' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Journal Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(publicationDetails.journalName as string) || ''}
                        onChange={(e) => handlePublicationDetailChange('journalName', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="e.g., Nature, IEEE Transactions, etc."
                        required
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'book' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Publisher Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(publicationDetails.publisherName as string) || ''}
                        onChange={(e) => handlePublicationDetailChange('publisherName', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="e.g., Springer, Wiley, etc."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ISBN (if available)</label>
                      <input
                        type="text"
                        value={(publicationDetails.isbn as string) || ''}
                        onChange={(e) => handlePublicationDetailChange('isbn', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="xxx-x-xxxx-xxxx-x"
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'conference_paper' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conference Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={(publicationDetails.conferenceSubType as string) || ''}
                        onChange={(e) => {
                          handlePublicationDetailChange('conferenceSubType', e.target.value);
                          // Reset author data when conference type changes
                          setAuthorData({ totalAuthors: 1, totalInternalAuthors: 1 });
                        }}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      >
                        <option value="">-- Please Select --</option>
                        <option value="paper_not_indexed">Papers in Conferences (not Indexed) / Seminars / Workshops</option>
                        <option value="paper_indexed_scopus">Paper in conference proceeding indexed in Scopus</option>
                        <option value="keynote_speaker_invited_talks">Keynote Speaker / Session chair / Invited Talks (Outside SGT)</option>
                        <option value="organizer_coordinator_member">Organizer / Coordinator / Member of conference held at SGT</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {(publicationDetails.conferenceSubType === 'paper_not_indexed' || publicationDetails.conferenceSubType === 'paper_indexed_scopus') && 
                          '✓ Author information will be required for this type'}
                        {(publicationDetails.conferenceSubType === 'keynote_speaker_invited_talks' || publicationDetails.conferenceSubType === 'organizer_coordinator_member') && 
                          'ℹ️ Author information not required for this type'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conference Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(publicationDetails.conferenceName as string) || ''}
                        onChange={(e) => handlePublicationDetailChange('conferenceName', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="e.g., ICML 2026, NeurIPS, etc."
                        required
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'book_chapter' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Book Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={(publicationDetails.bookTitle as string) || ''}
                        onChange={(e) => handlePublicationDetailChange('bookTitle', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Title of the book containing your chapter"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CATEGORY 4: Current Status & Status-Specific Fields (Dynamic) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => toggleSection('status')}
              className="w-full px-6 py-4 flex items-center justify-between text-left bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">4. Current Progress Status</h3>
                  <p className="text-xs text-gray-600">Where are you in your journey?</p>
                </div>
              </div>
              {expandedSections.status ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.status && (
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stage <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentStatus}
                    onChange={(e) => {
                      setCurrentStatus(e.target.value as ResearchTrackerStatus);
                      setStatusData({}); // Reset status-specific data when stage changes
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="communicated">� Communicated</option>
                    <option value="submitted">📤 Submitted</option>
                    <option value="accepted">🎉 Accepted</option>
                    <option value="rejected">❌ Rejected</option>
                    <option value="published">📰 Published</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Select your current progress stage. You can update this anytime.
                  </p>
                </div>

                {/* Status-Specific Fields Based on Selected Stage */}
                {currentStatus && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      📋 Additional Details for "{statusLabels[currentStatus]}" Stage
                    </h4>
                    
                    {selectedType === 'research_paper' && (
                      <ResearchPaperStatusForm 
                        status={currentStatus} 
                        data={statusData} 
                        onChange={handleStatusDataChange} 
                      />
                    )}
                    {selectedType === 'book' && (
                      <BookStatusForm 
                        status={currentStatus} 
                        data={statusData} 
                        onChange={handleStatusDataChange} 
                      />
                    )}
                    {selectedType === 'book_chapter' && (
                      <BookChapterStatusForm 
                        status={currentStatus} 
                        data={statusData} 
                        onChange={handleStatusDataChange} 
                      />
                    )}
                    {selectedType === 'conference_paper' && (
                      <ConferencePaperStatusForm 
                        status={currentStatus} 
                        data={statusData} 
                        onChange={handleStatusDataChange}
                        conferenceSubType={publicationDetails.conferenceSubType as string}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">📊 Progress Tracking & Updates</p>
                <p>After creating this tracker, you can update your progress anytime. All changes will be recorded in the history timeline, even if you don't change the status stage.</p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.push('/research/progress-tracker')}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Start Tracking
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
