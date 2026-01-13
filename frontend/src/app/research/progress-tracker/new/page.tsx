'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { FileText, BookOpen, FileBarChart, Presentation, ChevronDown, ChevronUp, AlertCircle, Users, RefreshCw } from 'lucide-react';
import progressTrackerService, {
  TrackerPublicationType,
  CreateTrackerRequest,
  publicationTypeLabels,
  publicationTypeIcons,
  ResearchTrackerStatus,
  statusLabels,
  ResearchProgressTracker,
} from '@/services/progressTracker.service';

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
  
  // Rejected trackers for auto-fill feature
  const [rejectedTrackers, setRejectedTrackers] = useState<ResearchProgressTracker[]>([]);
  const [selectedRejectedTracker, setSelectedRejectedTracker] = useState<string>('');
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [startMode, setStartMode] = useState<'scratch' | 'reapply'>('scratch'); // New state for radio selection
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    classification: true,
    status: true,
  });

  // Helper to get rejection data from status history
  const getRejectionData = (tracker: ResearchProgressTracker) => {
    const rejectedEntry = tracker.statusHistory?.find(h => h.toStatus === 'rejected');
    if (!rejectedEntry?.statusData) return null;
    const data = rejectedEntry.statusData as Record<string, unknown>;
    return {
      planToResubmit: data.planToResubmit as string | undefined,
      rejectionReason: data.rejectionReason as string | undefined,
      rejectionDate: data.rejectionDate as string | undefined,
    };
  };

  // Fetch rejected trackers that user wants to resubmit
  useEffect(() => {
    const fetchRejectedTrackers = async () => {
      setLoadingRejected(true);
      try {
        const response = await progressTrackerService.getMyTrackers({
          status: 'rejected',
        });
        // Filter to only those with planToResubmit = same_journal or different_journal
        const trackersToResubmit = response.data.filter((t) => {
          const rejectionData = getRejectionData(t);
          return rejectionData?.planToResubmit === 'same_journal' || rejectionData?.planToResubmit === 'different_journal';
        });
        setRejectedTrackers(trackersToResubmit);
      } catch (err) {
        console.error('Failed to fetch rejected trackers:', err);
      } finally {
        setLoadingRejected(false);
      }
    };
    
    fetchRejectedTrackers();
  }, []);

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

  // Category 2: Research Classification
  const [interdisciplinary, setInterdisciplinary] = useState<'yes' | 'no'>('no');
  const [sdgs, setSdgs] = useState<string[]>([]);
  const [targetedResearch, setTargetedResearch] = useState<'scopus' | 'sci_scie' | 'both'>('scopus');

  // Category 3: Current Status & All Publication/Status-Specific Fields (Combined)
  const [currentStatus, setCurrentStatus] = useState<ResearchTrackerStatus>('communicated');
  const [statusData, setStatusData] = useState<Record<string, unknown>>({});
  
  // Conference Paper specific
  const [conferenceSubType, setConferenceSubType] = useState<string>('');

  const handleTypeSelect = (type: TrackerPublicationType) => {
    setSelectedType(type);
    setStatusData({});
    // Don't auto-move to step 2, let user choose scratch or reapply first
    // setStep(2);
  };

  const handleStatusDataChange = (data: Record<string, unknown>) => {
    setStatusData(data);
  };

  // Handle prefilling from a rejected tracker
  const handlePrefillFromRejected = (trackerId: string) => {
    setSelectedRejectedTracker(trackerId);
    
    if (!trackerId) {
      // Clear all fields if no tracker selected
      return;
    }
    
    const tracker = rejectedTrackers.find(t => t.id === trackerId);
    if (!tracker) return;
    
    // Set the publication type
    setSelectedType(tracker.publicationType);
    
    // Set the title (user can modify it)
    setTitle(tracker.title);
    
    // Get the type-specific data
    let typeData: Record<string, unknown> = {};
    if (tracker.publicationType === 'research_paper' && tracker.researchPaperData) {
      typeData = { ...tracker.researchPaperData };
    } else if (tracker.publicationType === 'book' && tracker.bookData) {
      typeData = { ...tracker.bookData };
    } else if (tracker.publicationType === 'book_chapter' && tracker.bookChapterData) {
      typeData = { ...tracker.bookChapterData };
    } else if (tracker.publicationType === 'conference_paper' && tracker.conferencePaperData) {
      typeData = { ...tracker.conferencePaperData };
    }
    
    // Set classification fields from typeData
    if (typeData.interdisciplinary) {
      setInterdisciplinary(typeData.interdisciplinary as 'yes' | 'no');
    }
    if (typeData.sdgs && Array.isArray(typeData.sdgs)) {
      setSdgs(typeData.sdgs as string[]);
    }
    if (typeData.targetedResearch) {
      setTargetedResearch(typeData.targetedResearch as 'scopus' | 'sci_scie' | 'both');
    }
    
    // Set status data (excluding status-specific info like rejection details)
    // Keep fields like authors, journal info, etc.
    const statusDataCopy = { ...typeData };
    // Remove rejection-specific fields that shouldn't carry over
    delete statusDataCopy.rejectionReason;
    delete statusDataCopy.rejectionDate;
    delete statusDataCopy.planToResubmit;
    delete statusDataCopy.resubmissionNotes;
    
    setStatusData(statusDataCopy);
    
    // Reset to initial status for new tracker
    setCurrentStatus('writing');
    
    // Move to step 2
    setStep(2);
  };

  const handleContinue = () => {
    if (startMode === 'scratch') {
      // Clear any prefilled data and go to step 2
      setSelectedRejectedTracker('');
      setStep(2);
    } else if (startMode === 'reapply' && selectedRejectedTracker) {
      // Prefill data already handled by handlePrefillFromRejected
      setStep(2);
    }
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

      // Combine classification data with status data
      const combinedData = { 
        ...statusData,
        interdisciplinary,
        sdgs,
        targetedResearch,
        ...(selectedType === 'conference_paper' ? { conferenceSubType } : {}),
      };

      // Add type-specific data
      if (selectedType === 'research_paper') {
        requestData.researchPaperData = combinedData as any;
      } else if (selectedType === 'book') {
        requestData.bookData = combinedData as any;
      } else if (selectedType === 'book_chapter') {
        requestData.bookChapterData = combinedData as any;
      } else if (selectedType === 'conference_paper') {
        // Validate conference sub-type is selected
        if (!conferenceSubType) {
          setError('Please select a conference sub-type');
          setLoading(false);
          return;
        }
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
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What are you working on?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.entries(publicationTypeLabels) as [TrackerPublicationType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`flex items-center gap-4 p-6 bg-white rounded-lg shadow hover:shadow-md transition-all text-left ${
                    selectedType === type ? 'border-2 border-indigo-500 ring-2 ring-indigo-200' : 'border-2 border-transparent hover:border-indigo-500'
                  }`}
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

          {/* Radio buttons for Start Mode - Only show after type selection */}
          {selectedType && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">How would you like to proceed?</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="startMode"
                    value="scratch"
                    checked={startMode === 'scratch'}
                    onChange={(e) => {
                      setStartMode('scratch');
                      setSelectedRejectedTracker('');
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Start from Scratch</div>
                    <div className="text-sm text-gray-600">Create a new tracker with fresh information</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="startMode"
                    value="reapply"
                    checked={startMode === 'reapply'}
                    onChange={(e) => setStartMode('reapply')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Reapply a Rejected Research</div>
                    <div className="text-sm text-gray-600 mb-2">Auto-fill from a previously rejected paper marked for resubmission</div>
                    
                    {/* Dropdown appears only when reapply is selected */}
                    {startMode === 'reapply' && (
                      <div className="mt-3">
                        {loadingRejected ? (
                          <div className="text-sm text-gray-500">
                            <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                            Loading rejected papers...
                          </div>
                        ) : rejectedTrackers.filter(t => t.publicationType === selectedType).length > 0 ? (
                          <select
                            value={selectedRejectedTracker}
                            onChange={(e) => handlePrefillFromRejected(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                          >
                            <option value="">-- Select a rejected paper to resubmit --</option>
                            {rejectedTrackers
                              .filter(t => t.publicationType === selectedType)
                              .map((tracker) => {
                                const rejData = getRejectionData(tracker);
                                return (
                                  <option key={tracker.id} value={tracker.id}>
                                    {tracker.title} ({tracker.trackingNumber}) - {rejData?.planToResubmit === 'same_journal' ? 'Same Journal' : 'Different Journal'}
                                  </option>
                                );
                              })}
                          </select>
                        ) : (
                          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            No rejected {publicationTypeLabels[selectedType].toLowerCase()} marked for resubmission found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Continue Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={startMode === 'reapply' && !selectedRejectedTracker}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
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
              onClick={() => {
                setStep(1);
                setSelectedType(null);
                setStartMode('scratch');
                setSelectedRejectedTracker('');
              }}
              className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            >
              Change Type
            </button>
          </div>

          {/* Prefilled from Rejected Paper Notice */}
          {selectedRejectedTracker && (() => {
            const prefillTracker = rejectedTrackers.find(t => t.id === selectedRejectedTracker);
            if (!prefillTracker) return null;
            const rejData = getRejectionData(prefillTracker);
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">Resubmitting: {prefillTracker.title}</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    <span className="font-medium">Original Tracking #:</span> {prefillTracker.trackingNumber}
                    {rejData?.rejectionReason && (
                      <> • <span className="font-medium">Rejection Reason:</span> {rejData.rejectionReason}</>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Form has been pre-filled. Review and update the details as needed. A new tracking number will be assigned.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRejectedTracker('');
                    setTitle('');
                    setStatusData({});
                    setStep(1);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear & Start Fresh
                </button>
              </div>
            );
          })()}

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

          {/* CATEGORY 2: Research Classification */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => toggleSection('classification')}
              className="w-full px-6 py-4 flex items-center justify-between text-left bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">2. Research Classification</h3>
                  <p className="text-xs text-gray-600">For institutional reporting & ranking</p>
                </div>
              </div>
              {expandedSections.classification ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            
            {expandedSections.classification && (
              <div className="p-6 space-y-4">
                {/* Interdisciplinary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interdisciplinary (SGT) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {['yes', 'no'].map((v) => (
                      <label key={v} className="inline-flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="interdisciplinary"
                          value={v}
                          checked={interdisciplinary === v}
                          onChange={(e) => setInterdisciplinary(e.target.value as 'yes' | 'no')}
                          className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                        />
                        <span className="ml-2 capitalize text-gray-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* UN SDGs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UN Sustainable Development Goals (SDGs)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {[
                      { value: '1', label: '1. No Poverty' },
                      { value: '2', label: '2. Zero Hunger' },
                      { value: '3', label: '3. Good Health' },
                      { value: '4', label: '4. Quality Education' },
                      { value: '5', label: '5. Gender Equality' },
                      { value: '6', label: '6. Clean Water' },
                      { value: '7', label: '7. Clean Energy' },
                      { value: '8', label: '8. Decent Work' },
                      { value: '9', label: '9. Industry Innovation' },
                      { value: '10', label: '10. Reduced Inequalities' },
                      { value: '11', label: '11. Sustainable Cities' },
                      { value: '12', label: '12. Responsible Consumption' },
                      { value: '13', label: '13. Climate Action' },
                      { value: '14', label: '14. Life Below Water' },
                      { value: '15', label: '15. Life on Land' },
                      { value: '16', label: '16. Peace & Justice' },
                      { value: '17', label: '17. Partnerships' },
                    ].map((sdg) => (
                      <label key={sdg.value} className="flex items-center gap-2 text-sm text-gray-700 hover:bg-purple-50 p-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sdgs.includes(sdg.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSdgs([...sdgs, sdg.value]);
                            } else {
                              setSdgs(sdgs.filter(s => s !== sdg.value));
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs">{sdg.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{sdgs.length} goal(s) selected</p>
                </div>

                {/* Targeted Research Category - Only for Research Papers */}
                {selectedType === 'research_paper' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Targeted Research Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetedResearch}
                    onChange={(e) => setTargetedResearch(e.target.value as 'scopus' | 'sci_scie' | 'both')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  >
                    <option value="scopus">Scopus</option>
                    <option value="sci_scie">SCI/SCIE (WoS)</option>
                    <option value="both">Both (Scopus & SCI/SCIE)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">This determines the indexing category for your research</p>
                </div>
                )}
              </div>
            )}
          </div>

          {/* CATEGORY 3: Current Status & Publication Details (Combined) */}
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
                  <h3 className="font-semibold text-gray-900">3. Current Progress Status & Publication Details</h3>
                  <p className="text-xs text-gray-600">Provide complete publication information</p>
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
                  >                    <option value="writing">✍️ Writing</option>                    <option value="communicated">� Communicated</option>
                    <option value="submitted">📤 Submitted</option>
                    <option value="accepted">🎉 Accepted</option>
                    <option value="rejected">❌ Rejected</option>
                    <option value="published">📰 Published</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Select your current progress stage. You can update this anytime.
                  </p>
                </div>

                {/* Quartile, SJR, Impact Factor - Available for Research Papers */}
                {selectedType === 'research_paper' && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      📊 Research Metrics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Quartile - Show only for Scopus and Both */}
                      {(targetedResearch === 'scopus' || targetedResearch === 'both') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quartile <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={(statusData.quartile as string) || ''}
                            onChange={(e) => handleStatusDataChange({ ...statusData, quartile: e.target.value })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          >
                            <option value="">Select Quartile</option>
                            <option value="Top 1%">Top 1%</option>
                            <option value="Top 5%">Top 5%</option>
                            <option value="Q1">Q1</option>
                            <option value="Q2">Q2</option>
                            <option value="Q3">Q3</option>
                            <option value="Q4">Q4</option>
                          </select>
                        </div>
                      )}

                      {/* SJR - Show only for Scopus and Both */}
                      {(targetedResearch === 'scopus' || targetedResearch === 'both') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">SJR</label>
                          <input
                            type="number"
                            step="0.01"
                            value={(statusData.sjr as number) || ''}
                            onChange={(e) => handleStatusDataChange({ ...statusData, sjr: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="e.g., 0.5"
                          />
                        </div>
                      )}

                      {/* Impact Factor - Show only for SCI/SCIE and Both */}
                      {(targetedResearch === 'sci_scie' || targetedResearch === 'both') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Impact Factor <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={(statusData.impactFactor as number) || ''}
                            onChange={(e) => handleStatusDataChange({ ...statusData, impactFactor: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="e.g., 2.5"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conference Sub-Type Selection - For Conference Papers */}
                {selectedType === 'conference_paper' && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      🎤 Conference Type
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conference Sub-Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={conferenceSubType}
                        onChange={(e) => {
                          setConferenceSubType(e.target.value);
                          setStatusData({}); // Reset status data when sub-type changes
                        }}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        required
                      >
                        <option value="">-- Select Conference Type --</option>
                        <option value="paper_not_indexed">Papers in Conferences (not Indexed) / Seminars / Workshops</option>
                        <option value="paper_indexed_scopus">Paper in conference proceeding indexed in Scopus</option>
                        <option value="keynote_speaker_invited_talks">Keynote Speaker / Session chair / Invited Talks</option>
                        <option value="organizer_coordinator_member">Organizer / Coordinator / Member of conference</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Select the type of conference participation</p>
                    </div>
                  </div>
                )}

                {/* Status-Specific Fields Based on Selected Stage */}
                {currentStatus && (selectedType !== 'conference_paper' || conferenceSubType) && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      📋 Additional Details for "{statusLabels[currentStatus]}" Stage
                    </h4>
                    
                    {selectedType === 'research_paper' && (
                      <ResearchPaperStatusForm 
                        status={currentStatus} 
                        data={{ ...statusData, targetedResearchType: targetedResearch }} 
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
                        conferenceSubType={conferenceSubType}
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
              <div className="text-sm text-blue-800 space-y-2">
                <div>
                  <p className="font-medium">📊 Progress Tracking & Updates</p>
                  <p>After creating this tracker, you can update your progress anytime. All changes will be recorded in the history timeline.</p>
                </div>
                <div>
                  <p className="font-medium">📎 Document Uploads</p>
                  <p>You can upload documents (drafts, communication proof, etc.) after creating the tracker using the "Attach Documents" section.</p>
                </div>
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
