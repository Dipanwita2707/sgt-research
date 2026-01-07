'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import progressTrackerService, {
  ResearchProgressTracker,
  ResearchTrackerStatus,
  StatusHistoryEntry,
  statusLabels,
  statusColors,
  publicationTypeLabels,
  publicationTypeIcons,
} from '@/services/progressTracker.service';

// Import the writing form components
import ResearchPaperWritingForm from '@/components/progress-tracker/forms/ResearchPaperWritingForm';
import BookWritingForm from '@/components/progress-tracker/forms/BookWritingForm';
import BookChapterWritingForm from '@/components/progress-tracker/forms/BookChapterWritingForm';
import ConferencePaperWritingForm from '@/components/progress-tracker/forms/ConferencePaperWritingForm';

export default function TrackerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuthStore();
  
  const [tracker, setTracker] = useState<ResearchProgressTracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  
  // Editable form data
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [originalData, setOriginalData] = useState<Record<string, unknown>>({});
  
  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [documentNotes, setDocumentNotes] = useState('');
  
  // UI state for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    publicationDetails: true,
    statusFields: true,
    documents: true,  // Expanded by default to show uploads
    history: true,    // Expanded by default to show progress
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchTracker = async () => {
    try {
      setLoading(true);
      const response = await progressTrackerService.getTrackerById(id);
      setTracker(response.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tracker';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTracker();
    }
  }, [id]);

  // Initialize form data when tracker loads
  useEffect(() => {
    if (tracker) {
      const typeData = tracker.publicationType === 'research_paper' ? tracker.researchPaperData :
                       tracker.publicationType === 'book' ? tracker.bookData :
                       tracker.publicationType === 'book_chapter' ? tracker.bookChapterData :
                       tracker.publicationType === 'conference_paper' ? tracker.conferencePaperData : {};
      
      // Get the latest status-specific data from ALL history entries (merged newest first)
      let mergedStatusData: Record<string, unknown> = {};
      if (tracker.statusHistory && tracker.statusHistory.length > 0) {
        // Merge all status data from oldest to newest so newest values take precedence
        const sortedHistory = [...tracker.statusHistory].reverse(); // oldest first
        sortedHistory.forEach((entry: any) => {
          if (entry.statusData && typeof entry.statusData === 'object') {
            mergedStatusData = { ...mergedStatusData, ...entry.statusData };
          }
        });
      }
      
      const initialData: Record<string, unknown> = {
        title: tracker.title,
        schoolId: user?.employeeDetails?.department?.school?.id || tracker.schoolId,
        departmentId: user?.employeeDetails?.department?.id || tracker.departmentId,
        expectedCompletionDate: tracker.expectedCompletionDate,
        notes: tracker.notes || '',
        currentStatus: tracker.currentStatus,
        ...(typeData || {}),
        ...mergedStatusData, // Merge all status history data (latest values take precedence)
      };
      
      console.log('Initializing form with data:', initialData);
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [tracker]);

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      setUpdateError('');
      setUpdateSuccess('');

      // Detect changes
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      Object.keys(formData).forEach(key => {
        if (JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
          changes[key] = { old: originalData[key], new: formData[key] };
        }
      });

      console.log('Changes detected:', changes);
      console.log('Current status in form:', formData.currentStatus);
      console.log('Tracker current status:', tracker?.currentStatus);

      // Allow update if there are changes OR documents to upload
      if (Object.keys(changes).length === 0 && uploadedDocuments.length === 0) {
        setUpdateError('No changes detected');
        return;
      }

      // Build update payload
      const updatePayload: any = {
        title: formData.title,
        schoolId: formData.schoolId,
        departmentId: formData.departmentId,
        expectedCompletionDate: formData.expectedCompletionDate,
        notes: formData.notes,
        currentStatus: formData.currentStatus,
      };

      // Add type-specific data
      const typeDataKey = tracker?.publicationType === 'research_paper' ? 'researchPaperData' :
                          tracker?.publicationType === 'book' ? 'bookData' :
                          tracker?.publicationType === 'book_chapter' ? 'bookChapterData' :
                          'conferencePaperData';
      
      const typeData = { ...formData };
      delete typeData.title;
      delete typeData.schoolId;
      delete typeData.departmentId;
      delete typeData.expectedCompletionDate;
      delete typeData.notes;
      delete typeData.currentStatus;
      
      updatePayload[typeDataKey] = typeData;

      console.log('Update payload:', updatePayload);

      // If status changed, handle status update
      if (formData.currentStatus !== tracker?.currentStatus) {
        console.log('Status changed, calling updateTrackerWithStatus');
        await progressTrackerService.updateTrackerWithStatus(id, {
          ...updatePayload,
          toStatus: formData.currentStatus as ResearchTrackerStatus,
          reportedDate: new Date().toISOString(),
          actualDate: new Date().toISOString(),
          notes: `Status changed from ${statusLabels[tracker!.currentStatus]} to ${statusLabels[formData.currentStatus as ResearchTrackerStatus]}. Changes: ${Object.keys(changes).join(', ')}`,
          statusData: typeData,
        });
      } else if (Object.keys(changes).length > 0) {
        console.log('Fields changed, calling updateTracker');
        // Regular update with field changes - update tracker and create history
        await progressTrackerService.updateTracker(id, updatePayload);
        
        // Create a history entry for monthly report
        await progressTrackerService.updateTrackerWithStatus(id, {
          ...updatePayload,
          toStatus: tracker!.currentStatus, // Same status
          reportedDate: new Date().toISOString(),
          actualDate: new Date().toISOString(),
          notes: `Monthly update. Changes: ${Object.keys(changes).join(', ')}`,
          statusData: typeData,
          isMonthlyReport: true,
        });
      } else if (uploadedDocuments.length > 0) {
        // Only documents uploaded, no field changes - just create a note in history
        await progressTrackerService.updateTrackerWithStatus(id, {
          ...updatePayload,
          toStatus: tracker!.currentStatus,
          reportedDate: new Date().toISOString(),
          actualDate: new Date().toISOString(),
          notes: documentNotes || 'Documents uploaded',
          statusData: typeData,
          isMonthlyReport: true,
        });
      }

      // Upload documents if any
      if (uploadedDocuments.length > 0) {
        const uploadFormData = new FormData();
        uploadedDocuments.forEach((file) => {
          uploadFormData.append('files', file);
        });
        if (documentNotes) {
          uploadFormData.append('notes', documentNotes);
        }
        
        await progressTrackerService.uploadAttachments(id, uploadFormData);
        setUploadedDocuments([]);
        setDocumentNotes('');
      }

      setUpdateSuccess('Tracker updated successfully!');
      await fetchTracker();
      
      // Auto-expand history section to show newly uploaded documents
      setExpandedSections(prev => ({ ...prev, history: true }));
      
      setTimeout(() => setUpdateSuccess(''), 3000);
    } catch (err: any) {
      console.error('Update error:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update tracker';
      setUpdateError(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTypeData = () => {
    if (!tracker) return null;
    switch (tracker.publicationType) {
      case 'research_paper': return tracker.researchPaperData;
      case 'book': return tracker.bookData;
      case 'book_chapter': return tracker.bookChapterData;
      case 'conference_paper': return tracker.conferencePaperData;
      default: return null;
    }
  };

  const formatDisplayValue = (key: string, value: unknown): string | null => {
    // Skip null, undefined, empty strings, false booleans
    if (!value || value === '' || (typeof value === 'boolean' && !value)) return null;
    
    // Handle booleans
    if (typeof value === 'boolean') return 'Yes';
    
    // Handle arrays (like coAuthors)
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      // If it's an array of author objects
      if (typeof value[0] === 'object' && value[0]?.name) {
        return value.map((author: any) => {
          const category = author.authorCategory === 'Internal' ? '🏢' : '🌍';
          const role = author.authorRole === 'first_author' ? '1st' : 
                      author.authorRole === 'corresponding_author' ? '📧' : 'Co';
          return `${category} ${role} ${author.name}`;
        }).join(', ');
      }
      return value.join(', ');
    }
    
    // Handle objects
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Handle strings and numbers
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">{error || 'Tracker not found'}</p>
          <Link href="/research/progress-tracker" className="text-indigo-600 hover:underline mt-2 inline-block">
            Back to Trackers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/research/progress-tracker"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Trackers
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{publicationTypeIcons[tracker.publicationType]}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[tracker.currentStatus]}`}>
                  {statusLabels[tracker.currentStatus]}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{tracker.title}</h1>
              <p className="text-gray-600">
                {publicationTypeLabels[tracker.publicationType]}
                <span className="mx-2">•</span>
                <span className="font-mono text-sm">{tracker.trackingNumber}</span>
              </p>
              {tracker.school && (
                <p className="text-sm text-gray-500 mt-1">
                  {tracker.school.name}
                  {tracker.department && ` • ${tracker.department.name}`}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {tracker.currentStatus === 'published' && !tracker.researchContributionId && (
                <Link
                  href={`/research/apply?type=${tracker.publicationType}&trackerId=${tracker.id}`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center"
                >
                  File for Incentive
                </Link>
              )}
              {tracker.researchContributionId && (
                <Link
                  href={`/research/contribution/${tracker.researchContributionId}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
                >
                  View Incentive Claim
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            {['writing', 'submitted', 'under_review', 'accepted', 'published'].map((status) => {
              const statusOrder = ['writing', 'submitted', 'under_review', 'revision_requested', 'revised', 'accepted', 'published'];
              const currentIndex = statusOrder.indexOf(tracker.currentStatus);
              const thisIndex = statusOrder.indexOf(status);
              const isComplete = thisIndex <= currentIndex;
              const isCurrent = status === tracker.currentStatus || 
                (status === 'under_review' && ['revision_requested', 'revised'].includes(tracker.currentStatus));
              
              return (
                <div 
                  key={status} 
                  className={`text-center flex-1 ${isComplete ? 'text-indigo-600 font-medium' : ''} ${isCurrent ? 'font-bold text-indigo-700' : ''}`}
                >
                  {statusLabels[status as ResearchTrackerStatus]}
                </div>
              );
            })}
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            {(() => {
              const statusOrder = ['communicated', 'accepted', 'published'];
              const currentIndex = statusOrder.indexOf(tracker.currentStatus);
              const progress = tracker.currentStatus === 'rejected' ? 0 : ((currentIndex + 1) / 3) * 100;
              return (
                <div 
                  className={`h-full ${tracker.currentStatus === 'rejected' ? 'bg-red-500' : 'bg-indigo-600'} transition-all duration-500`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              );
            })()}
          </div>
        </div>

        {/* Editable Form Section */}
        <div className="p-6 border-b space-y-4">
          {/* Alert Messages */}
          {updateError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {updateError}
            </div>
          )}
          {updateSuccess && (
            <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-green-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {updateSuccess}
            </div>
          )}

          {/* Basic Information Section */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('basicInfo')}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">Required</span>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.basicInfo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.basicInfo && (
              <div className="p-4 space-y-4 bg-gray-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={(formData.title as string) || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter publication title"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                    <select
                      value={formData.currentStatus as string}
                      onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="communicated">Communicated</option>
                      <option value="rejected">Rejected</option>
                      <option value="accepted">Accepted</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Completion</label>
                    <input
                      type="date"
                      value={(formData.expectedCompletionDate as string)?.split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={(formData.notes as string) || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Any additional notes or comments..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Publication Details Section */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('publicationDetails')}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Publication Details</h3>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{publicationTypeLabels[tracker.publicationType]}</span>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.publicationDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.publicationDetails && (
              <div className="p-4 bg-gray-50">
                {tracker.publicationType === 'research_paper' && (
                  <ResearchPaperWritingForm
                    data={formData}
                    onChange={setFormData}
                  />
                )}
                {tracker.publicationType === 'book' && (
                  <BookWritingForm
                    data={formData}
                    onChange={setFormData}
                  />
                )}
                {tracker.publicationType === 'book_chapter' && (
                  <BookChapterWritingForm
                    data={formData}
                    onChange={setFormData}
                  />
                )}
                {tracker.publicationType === 'conference_paper' && (
                  <ConferencePaperWritingForm
                    data={formData}
                    onChange={setFormData}
                  />
                )}
              </div>
            )}
          </div>

          {/* Status-Specific Fields */}
          {formData.currentStatus !== 'writing' && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('statusFields')}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {statusLabels[formData.currentStatus as ResearchTrackerStatus]} Stage Details
                  </h3>
                  {formData.currentStatus === 'published' && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Final Stage</span>}
                </div>
                <svg className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.statusFields ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.statusFields && (
                <div className="p-4 bg-gray-50 space-y-4">
                {/* Submitted Status Fields */}
                {['submitted', 'under_review', 'revision_requested', 'revised', 'accepted', 'published'].includes(formData.currentStatus as string) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Submission Date {['submitted', 'under_review', 'revision_requested', 'revised', 'accepted', 'published'].includes(formData.currentStatus as string) && '*'}
                        </label>
                        <input
                          type="date"
                          value={(formData.submissionDate as string)?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Manuscript ID</label>
                        <input
                          type="text"
                          value={(formData.manuscriptId as string) || ''}
                          onChange={(e) => setFormData({ ...formData, manuscriptId: e.target.value })}
                          placeholder="e.g., MS-2024-12345"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Under Review Status Fields */}
                {['under_review', 'revision_requested', 'revised', 'accepted', 'published'].includes(formData.currentStatus as string) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Review Start Date</label>
                        <input
                          type="date"
                          value={(formData.reviewStartDate as string)?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, reviewStartDate: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Review Completion</label>
                        <input
                          type="date"
                          value={(formData.expectedReviewDate as string)?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, expectedReviewDate: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Revision Requested Fields */}
                {['revision_requested', 'revised', 'accepted', 'published'].includes(formData.currentStatus as string) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Comments</label>
                      <textarea
                        value={(formData.reviewerComments as string) || ''}
                        onChange={(e) => setFormData({ ...formData, reviewerComments: e.target.value })}
                        rows={3}
                        placeholder="Summary of reviewer feedback..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Revision Deadline</label>
                        <input
                          type="date"
                          value={(formData.revisionDeadline as string)?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, revisionDeadline: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      {formData.currentStatus === 'revised' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Revision Submitted Date</label>
                          <input
                            type="date"
                            value={(formData.revisionSubmittedDate as string)?.split('T')[0] || ''}
                            onChange={(e) => setFormData({ ...formData, revisionSubmittedDate: e.target.value })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Accepted Status Fields */}
                {['accepted', 'published'].includes(formData.currentStatus as string) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acceptance Date {formData.currentStatus === 'accepted' && '*'}
                        </label>
                        <input
                          type="date"
                          value={(formData.acceptanceDate as string)?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, acceptanceDate: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Publication Date</label>
                        <input
                          type="date"
                          value={(formData.expectedPublicationDate as string)?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, expectedPublicationDate: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Rejected Status Fields */}
                {formData.currentStatus === 'rejected' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Date *</label>
                      <input
                        type="date"
                        value={(formData.rejectionDate as string)?.split('T')[0] || ''}
                        onChange={(e) => setFormData({ ...formData, rejectionDate: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                      <textarea
                        value={(formData.rejectionReason as string) || ''}
                        onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                        rows={3}
                        placeholder="Brief summary of rejection reason..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          )}

          {/* Document Upload Section - Always Available */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('documents')}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Attach Documents</h3>
                {uploadedDocuments.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {uploadedDocuments.length} new file{uploadedDocuments.length !== 1 ? 's' : ''} selected
                  </span>
                )}
                {tracker?.statusHistory && tracker.statusHistory.some((entry: any) => entry.attachments && entry.attachments.length > 0) && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {tracker.statusHistory.reduce((total: number, entry: any) => total + (entry.attachments?.length || 0), 0)} uploaded
                  </span>
                )}
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.documents ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.documents && (
              <div className="p-4 bg-gray-50 space-y-4">
              {/* Previously Uploaded Documents */}
              {tracker?.statusHistory && tracker.statusHistory.some((entry: any) => entry.attachments && entry.attachments.length > 0) && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Previously Uploaded Documents:
                  </p>
                  <div className="space-y-2">
                    {tracker.statusHistory.map((entry: any, idx: number) => (
                      entry.attachments && entry.attachments.length > 0 && (
                        <div key={idx} className="border-l-2 border-blue-300 pl-3 py-1">
                          <p className="text-xs text-gray-500 mb-1">
                            {new Date(entry.changedAt).toLocaleDateString()} - {entry.notes || 'Document upload'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {entry.attachments.map((att: any, i: number) => (
                              <a
                                key={i}
                                href={att.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {att.originalName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New ZIP Files
                </label>
                <input
                  type="file"
                  multiple
                  accept=".zip"
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadedDocuments(Array.from(e.target.files));
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload ZIP files containing your documents (max 50MB per file)
                </p>
              </div>

              {uploadedDocuments.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Files ({uploadedDocuments.length}):
                  </p>
                  <ul className="space-y-1">
                    {uploadedDocuments.map((file, index) => (
                      <li key={index} className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUploadedDocuments(uploadedDocuments.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Notes (Optional)
                </label>
                <textarea
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                  rows={2}
                  placeholder="Add any notes about the documents you're uploading..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            )}
          </div>

          {/* Update Button - Enhanced */}
          <div className="sticky bottom-0 bg-white border-t-2 border-indigo-600 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Ready to save changes?</span>
                <p className="text-xs text-gray-500 mt-1">
                  {Object.keys(formData).filter(key => 
                    JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])
                  ).length > 0 || uploadedDocuments.length > 0
                    ? `${Object.keys(formData).filter(key => 
                        JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])
                      ).length} field(s) modified${uploadedDocuments.length > 0 ? ` + ${uploadedDocuments.length} document(s)` : ''}`
                    : 'No changes yet'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(originalData);
                    setUploadedDocuments([]);
                    setDocumentNotes('');
                    setUpdateError('');
                    setUpdateSuccess('');
                  }}
                  className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={updating}
                  className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {updating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Tracker
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline - keep this as read-only */}
        <div className="p-6 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Timeline</h3>
          <dl className="space-y-2 text-sm grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-gray-500">Started</dt>
              <dd className="font-medium">{formatDate(tracker.createdAt)}</dd>
            </div>
            {tracker.expectedCompletionDate && (
              <div>
                <dt className="text-gray-500">Expected Completion</dt>
                <dd className="font-medium">{formatDate(tracker.expectedCompletionDate)}</dd>
              </div>
            )}
            {tracker.actualCompletionDate && (
              <div>
                <dt className="text-gray-500">Completed</dt>
                <dd className="font-medium text-green-600">{formatDate(tracker.actualCompletionDate)}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="font-medium">{formatDateTime(tracker.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Status History Timeline */}
        <div className="px-6 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Progress History</h3>
          <div className="relative">
            {tracker.statusHistory && tracker.statusHistory.length > 0 ? (
              <div className="space-y-4">
                {tracker.statusHistory.map((entry: StatusHistoryEntry, index: number) => {
                  const isMonthlyReport = entry.fromStatus === entry.toStatus;
                  
                  return (
                  <div key={entry.id} className="relative flex gap-4">
                    {/* Timeline Line */}
                    {index < (tracker.statusHistory?.length || 0) - 1 && (
                      <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    
                    {/* Timeline Dot */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isMonthlyReport ? 'bg-blue-100 text-blue-700' :
                      entry.toStatus === 'rejected' ? 'bg-red-100' :
                      entry.toStatus === 'published' ? 'bg-green-100' :
                      'bg-indigo-100'
                    }`}>
                      {isMonthlyReport ? '📝' :
                       entry.toStatus === 'rejected' ? '✗' :
                       entry.toStatus === 'published' ? '✓' :
                       index + 1}
                    </div>
                    
                    {/* Content */}
                    <div className={`flex-1 rounded-lg p-4 ${isMonthlyReport ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isMonthlyReport ? (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              📝 Monthly Report - {statusLabels[entry.toStatus]}
                            </span>
                          ) : (
                            <>
                              {entry.fromStatus && (
                                <>
                                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[entry.fromStatus]}`}>
                                    {statusLabels[entry.fromStatus]}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                </>
                              )}
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[entry.toStatus]}`}>
                                {statusLabels[entry.toStatus]}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{formatDateTime(entry.changedAt)}</span>
                      </div>
                      
                      {/* Dates */}
                      <div className="text-sm text-gray-600 mb-2">
                        <span>Reported: {formatDate(entry.reportedDate)}</span>
                        {entry.actualDate && (
                          <span className="ml-4">Actual: {formatDate(entry.actualDate)}</span>
                        )}
                      </div>
                      
                      {/* Notes */}
                      {entry.notes && (
                        <p className="text-sm text-gray-700 mb-2">{entry.notes}</p>
                      )}
                      
                      {/* Status Data */}
                      {entry.statusData && Object.keys(entry.statusData).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          {/* Show changed fields if available */}
                          {entry.statusData.changedFields && Array.isArray(entry.statusData.changedFields) && entry.statusData.changedFields.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-700 mb-2">📝 Changed Fields:</p>
                              {entry.statusData.changedFields.map((change: any, idx: number) => (
                                <div key={idx} className="text-xs bg-white rounded p-2 border border-gray-200">
                                  <div className="font-medium text-gray-700 mb-1">
                                    {change.field.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                      <span className="text-gray-500">From: </span>
                                      <span className="text-red-600">{formatDisplayValue(change.field, change.oldValue) || '(empty)'}</span>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                    <div className="flex-1">
                                      <span className="text-gray-500">To: </span>
                                      <span className="text-green-600">{formatDisplayValue(change.field, change.newValue) || '(empty)'}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700">
                                View Details
                              </summary>
                              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(entry.statusData).map(([key, value]) => {
                                  const displayValue = formatDisplayValue(key, value);
                                  if (!displayValue) return null;
                                  
                                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                  return (
                                    <div key={key} className="col-span-2">
                                      <dt className="text-gray-500">{label}</dt>
                                      <dd className="font-medium break-words">
                                        {displayValue}
                                      </dd>
                                    </div>
                                  );
                                })}
                              </dl>
                            </details>
                          )}
                        </div>
                      )}
                      
                      {/* Attachments */}
                      {entry.attachments && entry.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {entry.attachments.map((att, i) => (
                              <a
                                key={i}
                                href={att.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:underline"
                              >
                                📎 {att.originalName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No status history yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
