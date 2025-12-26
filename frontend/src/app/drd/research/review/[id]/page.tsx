'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  User,
  Building,
  Calendar,
  Globe,
  Award,
  Coins,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  BookOpen,
  Presentation,
  DollarSign,
  Edit3,
  Plus,
  Trash2,
  Eye,
  Save
} from 'lucide-react';
import { researchService, ResearchContribution, ResearchPublicationType } from '@/services/research.service';
import { permissionManagementService } from '@/services/permissionManagement.service';
import { useAuthStore } from '@/store/authStore';

// Editable field configuration
const EDITABLE_FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'journalName', label: 'Journal Name', type: 'text' },
  { key: 'volume', label: 'Volume', type: 'text' },
  { key: 'issue', label: 'Issue', type: 'text' },
  { key: 'pageNumbers', label: 'Page Numbers', type: 'text' },
  { key: 'doi', label: 'DOI', type: 'text' },
  { key: 'issn', label: 'ISSN', type: 'text' },
  { key: 'publisherName', label: 'Publisher Name', type: 'text' },
  { key: 'publisherLocation', label: 'Publisher Location', type: 'text' },
  { key: 'publicationDate', label: 'Publication Date', type: 'date' },
  { key: 'publicationStatus', label: 'Publication Status', type: 'select', options: ['published', 'in_press', 'accepted', 'under_review'] },
  { key: 'impactFactor', label: 'Impact Factor', type: 'number' },
  { key: 'sjr', label: 'SJR', type: 'number' },
  { key: 'quartile', label: 'Quartile', type: 'select', options: ['q1', 'q2', 'q3', 'q4', 'na'] },
  { key: 'abstract', label: 'Abstract', type: 'textarea' },
  { key: 'conferenceName', label: 'Conference Name', type: 'text' },
  { key: 'conferenceLocation', label: 'Conference Location', type: 'text' },
  { key: 'grantTitle', label: 'Grant Title', type: 'text' },
  { key: 'fundingAgency', label: 'Funding Agency', type: 'text' },
  { key: 'grantAmount', label: 'Grant Amount', type: 'number' },
];

interface FieldSuggestion {
  fieldName: string;
  fieldPath?: string;
  originalValue: string;
  suggestedValue: string;
  note?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  submitted: { label: 'Submitted', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  under_review: { label: 'Under Review', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  changes_required: { label: 'Changes Required', icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  resubmitted: { label: 'Resubmitted', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

const PUBLICATION_TYPE_CONFIG: Record<ResearchPublicationType, { label: string; icon: React.ElementType; color: string }> = {
  research_paper: { label: 'Research Paper', icon: FileText, color: 'bg-blue-500' },
  book: { label: 'Book', icon: BookOpen, color: 'bg-green-500' },
  book_chapter: { label: 'Book Chapter', icon: BookOpen, color: 'bg-green-400' },
  conference_paper: { label: 'Conference Paper', icon: Presentation, color: 'bg-purple-500' },
  grant: { label: 'Grant', icon: DollarSign, color: 'bg-orange-500' },
};

export default function ResearchReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const id = params.id as string;
  
  const [contribution, setContribution] = useState<ResearchContribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  
  // Review form
  const [reviewComments, setReviewComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  
  // Collaborative editing state
  const [isEditMode, setIsEditMode] = useState(false);
  const [fieldSuggestions, setFieldSuggestions] = useState<FieldSuggestion[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempSuggestion, setTempSuggestion] = useState<Partial<FieldSuggestion>>({});
  const [showSuggestionsPreview, setShowSuggestionsPreview] = useState(false);

  useEffect(() => {
    if (id) {
      fetchContribution();
    }
    if (user?.id) {
      fetchUserPermissions();
    }
  }, [id, user]);

  const fetchUserPermissions = async () => {
    try {
      const response = await permissionManagementService.getUserPermissions(user!.id);
      const drdPermissions: Record<string, boolean> = {};
      response.data.centralDepartments.forEach(dept => {
        if (dept.centralDept.departmentCode === 'DRD') {
          Object.assign(drdPermissions, dept.permissions);
        }
      });
      setUserPermissions(drdPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchContribution = async () => {
    try {
      setLoading(true);
      const response = await researchService.getContributionById(id);
      setContribution(response.data);
    } catch (error) {
      console.error('Error fetching contribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = async () => {
    try {
      setActionLoading(true);
      await researchService.startReview(id);
      fetchContribution();
    } catch (error) {
      console.error('Error starting review:', error);
      alert('Failed to start review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const hasApprovePermission = userPermissions.research_approve;
    const actionText = hasApprovePermission ? 'Approve' : 'Recommend for Approval';
    const confirmText = hasApprovePermission 
      ? 'Approve this research contribution? Incentives will be credited to all authors.'
      : 'Recommend this contribution for final approval? It will be sent to the approver for review.';
    
    if (!confirm(confirmText)) return;
    
    try {
      setActionLoading(true);
      
      if (hasApprovePermission) {
        // Final approval
        await researchService.approveContribution(id, { comments: reviewComments });
        alert('Contribution approved successfully!');
      } else {
        // Recommend for approval
        await researchService.recommendForApproval(id, { comments: reviewComments });
        alert('Contribution recommended for approval successfully!');
      }
      
      router.push('/drd/research');
    } catch (error) {
      console.error(`Error ${hasApprovePermission ? 'approving' : 'recommending'} contribution:`, error);
      alert(`Failed to ${hasApprovePermission ? 'approve' : 'recommend'} contribution`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!reviewComments.trim() && fieldSuggestions.length === 0) {
      alert('Please provide comments or field suggestions for the changes required');
      return;
    }
    
    try {
      setActionLoading(true);
      await researchService.requestChanges(id, { 
        comments: reviewComments,
        suggestions: fieldSuggestions.map(s => ({
          fieldName: s.fieldName,
          fieldPath: s.fieldPath,
          originalValue: s.originalValue,
          suggestedValue: s.suggestedValue,
          note: s.note
        }))
      });
      setShowChangesModal(false);
      setReviewComments('');
      setFieldSuggestions([]);
      setIsEditMode(false);
      fetchContribution();
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Failed to request changes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      setActionLoading(true);
      await researchService.rejectContribution(id, { reason: rejectReason });
      alert('Contribution rejected');
      router.push('/drd/research');
    } catch (error) {
      console.error('Error rejecting contribution:', error);
      alert('Failed to reject contribution');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================
  // Collaborative Editing Functions
  // ============================================

  const getFieldValue = (fieldName: string): string => {
    if (!contribution) return '';
    const value = (contribution as any)[fieldName];
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    return String(value);
  };

  const getFieldLabel = (fieldName: string): string => {
    const field = EDITABLE_FIELDS.find(f => f.key === fieldName);
    return field?.label || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const startEditingField = (fieldName: string) => {
    const originalValue = getFieldValue(fieldName);
    setEditingField(fieldName);
    setTempSuggestion({
      fieldName,
      originalValue,
      suggestedValue: originalValue,
      note: ''
    });
  };

  const cancelEditingField = () => {
    setEditingField(null);
    setTempSuggestion({});
  };

  const saveFieldSuggestion = () => {
    if (!tempSuggestion.fieldName || !tempSuggestion.suggestedValue) return;
    
    // Check if suggestion already exists for this field
    const existingIndex = fieldSuggestions.findIndex(s => s.fieldName === tempSuggestion.fieldName);
    
    const newSuggestion: FieldSuggestion = {
      fieldName: tempSuggestion.fieldName,
      originalValue: tempSuggestion.originalValue || '',
      suggestedValue: tempSuggestion.suggestedValue,
      note: tempSuggestion.note
    };
    
    if (existingIndex >= 0) {
      const updated = [...fieldSuggestions];
      updated[existingIndex] = newSuggestion;
      setFieldSuggestions(updated);
    } else {
      setFieldSuggestions([...fieldSuggestions, newSuggestion]);
    }
    
    setEditingField(null);
    setTempSuggestion({});
  };

  const removeSuggestion = (fieldName: string) => {
    setFieldSuggestions(fieldSuggestions.filter(s => s.fieldName !== fieldName));
  };

  const hasSuggestionForField = (fieldName: string): boolean => {
    return fieldSuggestions.some(s => s.fieldName === fieldName);
  };

  const getSuggestionForField = (fieldName: string): FieldSuggestion | undefined => {
    return fieldSuggestions.find(s => s.fieldName === fieldName);
  };

  // Render editable field with suggestion capability
  const renderEditableField = (fieldName: string, displayValue: string | React.ReactNode, type: 'text' | 'number' | 'textarea' | 'select' | 'date' = 'text', options?: string[]) => {
    const isEditing = editingField === fieldName;
    const hasSuggestion = hasSuggestionForField(fieldName);
    const suggestion = getSuggestionForField(fieldName);
    
    if (!isEditMode) {
      return (
        <div className="font-medium">
          {hasSuggestion ? (
            <div className="space-y-1">
              <span className="line-through text-gray-400">{displayValue}</span>
              <span className="block text-green-600 font-semibold">{suggestion?.suggestedValue}</span>
              {suggestion?.note && (
                <span className="block text-xs text-gray-500 italic">Note: {suggestion.note}</span>
              )}
            </div>
          ) : (
            displayValue
          )}
        </div>
      );
    }
    
    if (isEditing) {
      return (
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Original: {tempSuggestion.originalValue || 'N/A'}</div>
          {type === 'textarea' ? (
            <textarea
              value={tempSuggestion.suggestedValue || ''}
              onChange={(e) => setTempSuggestion({ ...tempSuggestion, suggestedValue: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
          ) : type === 'select' && options ? (
            <select
              value={tempSuggestion.suggestedValue || ''}
              onChange={(e) => setTempSuggestion({ ...tempSuggestion, suggestedValue: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {options.map(opt => (
                <option key={opt} value={opt}>{opt.toUpperCase()}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={tempSuggestion.suggestedValue || ''}
              onChange={(e) => setTempSuggestion({ ...tempSuggestion, suggestedValue: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          )}
          <input
            type="text"
            placeholder="Add a note (optional)"
            value={tempSuggestion.note || ''}
            onChange={(e) => setTempSuggestion({ ...tempSuggestion, note: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={saveFieldSuggestion}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Save
            </button>
            <button
              onClick={cancelEditingField}
              className="px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-start justify-between group hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors">
        <div className="font-medium flex-1">
          {hasSuggestion ? (
            <div className="space-y-1">
              <span className="line-through text-gray-400">{displayValue}</span>
              <span className="block text-green-600 font-semibold">{suggestion?.suggestedValue}</span>
              {suggestion?.note && (
                <span className="block text-xs text-gray-500 italic">Note: {suggestion.note}</span>
              )}
            </div>
          ) : (
            <span>{displayValue || <span className="text-gray-400 italic">Not provided</span>}</span>
          )}
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <button
            onClick={() => startEditingField(fieldName)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-300 bg-blue-50 transition-all"
            title="Suggest change"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          {hasSuggestion && (
            <button
              onClick={() => removeSuggestion(fieldName)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg border border-red-300 bg-red-50"
              title="Remove suggestion"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!contribution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contribution not found</h2>
          <Link href="/drd/research" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[contribution.status] || STATUS_CONFIG.submitted;
  const StatusIcon = statusConfig.icon;
  const pubTypeConfig = PUBLICATION_TYPE_CONFIG[contribution.publicationType];
  const PubTypeIcon = pubTypeConfig?.icon || FileText;

  // Check if current user recommended this contribution
  const userRecommendedThis = contribution.reviews?.some(
    (review: any) => review.reviewerId === user?.id && review.decision === 'recommended'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link
            href="/drd/research"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 ${pubTypeConfig?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center`}>
                <PubTypeIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                {isEditMode ? (
                  <div className="group">
                    {renderEditableField('title', contribution.title, 'text')}
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">{contribution.title}</h1>
                )}
                <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                  <span>{contribution.applicationNumber}</span>
                  <span>•</span>
                  <span>{pubTypeConfig?.label || contribution.publicationType}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Edit Mode Toggle - Show when under review */}
              {['under_review', 'resubmitted'].includes(contribution.status) && (
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isEditMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Exit Edit Mode' : 'Suggest Changes'}
                </button>
              )}
              
              {/* User Recommended Badge */}
              {userRecommendedThis && (
                <div className="flex items-center px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  You Recommended
                </div>
              )}
              
              <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {statusConfig.label}
              </div>
            </div>
          </div>
          
          {/* Edit Mode Banner */}
          {isEditMode && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Edit3 className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">Collaborative Edit Mode Active</span>
                  <span className="ml-2 text-blue-600">
                    ({fieldSuggestions.length} suggestion{fieldSuggestions.length !== 1 ? 's' : ''} pending)
                  </span>
                </div>
                <div className="flex gap-2">
                  {fieldSuggestions.length > 0 && (
                    <button
                      onClick={() => setShowSuggestionsPreview(true)}
                      className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview & Submit
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Hover over any field and click the edit icon to suggest changes. Your suggestions will be sent to the applicant for review.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Applicant Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Applicant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Applicant</div>
                <div className="font-medium">{contribution.applicantUser?.employeeDetails?.displayName || contribution.applicantUser?.email}</div>
              </div>
            </div>
            {contribution.school && (
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">School</div>
                  <div className="font-medium">{contribution.school.facultyName || contribution.school.shortName}</div>
                </div>
              </div>
            )}
            {contribution.department && (
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Department</div>
                  <div className="font-medium">{contribution.department.departmentName}</div>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Submitted On</div>
                <div className="font-medium">
                  {contribution.submittedAt ? new Date(contribution.submittedAt).toLocaleDateString() : 'Not submitted'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Publication Details */}
        <div className={`bg-white rounded-xl shadow-sm border ${isEditMode ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Publication Details</h2>
            {isEditMode && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Click edit icon on any field to suggest changes
              </span>
            )}
          </div>
          
          {contribution.abstract && (
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">Abstract</div>
              {renderEditableField('abstract', contribution.abstract, 'textarea')}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contribution.publishedYear && (
              <div>
                <div className="text-sm text-gray-500">Published Year</div>
                {renderEditableField('publishedYear', contribution.publishedYear, 'number')}
              </div>
            )}
            {(contribution.doi || isEditMode) && (
              <div>
                <div className="text-sm text-gray-500">DOI</div>
                {isEditMode ? (
                  renderEditableField('doi', contribution.doi || '', 'text')
                ) : (
                  <a href={`https://doi.org/${contribution.doi}`} target="_blank" rel="noopener noreferrer" 
                     className="font-medium text-blue-600 hover:underline flex items-center">
                    {contribution.doi}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            )}
            
            {/* Research Paper specific */}
            {contribution.publicationType === 'research_paper' && (
              <>
                {(contribution.journalName || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Journal Name</div>
                    {renderEditableField('journalName', contribution.journalName || '', 'text')}
                  </div>
                )}
                {((contribution as any).volume || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Volume</div>
                    {renderEditableField('volume', (contribution as any).volume || '', 'text')}
                  </div>
                )}
                {((contribution as any).issue || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Issue</div>
                    {renderEditableField('issue', (contribution as any).issue || '', 'text')}
                  </div>
                )}
                {((contribution as any).pageNumbers || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Page Numbers</div>
                    {renderEditableField('pageNumbers', (contribution as any).pageNumbers || '', 'text')}
                  </div>
                )}
                {((contribution as any).issn || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">ISSN</div>
                    {renderEditableField('issn', (contribution as any).issn || '', 'text')}
                  </div>
                )}
                {((contribution as any).publisherName || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Publisher Name</div>
                    {renderEditableField('publisherName', (contribution as any).publisherName || '', 'text')}
                  </div>
                )}
                {((contribution as any).publisherLocation || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Publisher Location</div>
                    {renderEditableField('publisherLocation', (contribution as any).publisherLocation || '', 'text')}
                  </div>
                )}
                {((contribution as any).publicationDate || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Publication Date</div>
                    {renderEditableField('publicationDate', (contribution as any).publicationDate ? new Date((contribution as any).publicationDate).toISOString().split('T')[0] : '', 'date')}
                  </div>
                )}
                {((contribution as any).publicationStatus || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Publication Status</div>
                    {renderEditableField('publicationStatus', (contribution as any).publicationStatus || '', 'select', ['published', 'in_press', 'accepted', 'under_review'])}
                  </div>
                )}
                {(contribution.impactFactor || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Impact Factor</div>
                    {renderEditableField('impactFactor', contribution.impactFactor?.toString() || '', 'number')}
                  </div>
                )}
                {(contribution.sjr || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">SJR</div>
                    {renderEditableField('sjr', contribution.sjr?.toString() || '', 'number')}
                  </div>
                )}
                {((contribution as any).quartile || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Quartile</div>
                    {renderEditableField('quartile', (contribution as any).quartile?.toUpperCase() || '', 'select', ['q1', 'q2', 'q3', 'q4', 'na'])}
                  </div>
                )}
                {contribution.indexedIn && contribution.indexedIn.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500">Indexed In</div>
                    <div className="font-medium">{contribution.indexedIn.join(', ')}</div>
                  </div>
                )}
                {(contribution.hasInternationalAuthor !== undefined) && (
                  <div>
                    <div className="text-sm text-gray-500">International Author</div>
                    <div className="font-medium flex items-center">
                      {contribution.hasInternationalAuthor ? (
                        <>
                          <Globe className="w-4 h-4 mr-1 text-green-600" />
                          Yes
                        </>
                      ) : (
                        'No'
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Conference specific */}
            {contribution.publicationType === 'conference_paper' && (
              <>
                {(contribution.conferenceName || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Conference Name</div>
                    {renderEditableField('conferenceName', contribution.conferenceName || '', 'text')}
                  </div>
                )}
                {contribution.conferenceType && (
                  <div>
                    <div className="text-sm text-gray-500">Conference Type</div>
                    <div className="font-medium capitalize">{contribution.conferenceType}</div>
                  </div>
                )}
                {(contribution.conferenceLocation || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    {renderEditableField('conferenceLocation', contribution.conferenceLocation || '', 'text')}
                  </div>
                )}
              </>
            )}
            
            {/* Grant specific */}
            {contribution.publicationType === 'grant' && (
              <>
                {(contribution.grantTitle || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Grant Title</div>
                    {renderEditableField('grantTitle', contribution.grantTitle || '', 'text')}
                  </div>
                )}
                {(contribution.fundingAgency || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Funding Agency</div>
                    {renderEditableField('fundingAgency', contribution.fundingAgency || '', 'text')}
                  </div>
                )}
                {(contribution.grantAmount || isEditMode) && (
                  <div>
                    <div className="text-sm text-gray-500">Grant Amount</div>
                    {renderEditableField('grantAmount', contribution.grantAmount ? `₹${contribution.grantAmount.toLocaleString()}` : '', 'number')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Authors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Authors ({contribution.authors?.length || 0})</h2>
          <div className="space-y-3">
            {contribution.authors?.map((author, index) => (
              <div key={author.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{author.name}</div>
                    <div className="text-sm text-gray-500">
                      {author.authorType?.replace('_', ' ')} • {author.authorRole?.replace('_', ' ')}
                      {author.isCorresponding && ' • Corresponding'}
                    </div>
                  </div>
                </div>
                {author.userId && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Internal</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Submitted Documents
          </h2>
          <div className="space-y-3">
            {contribution.manuscriptFilePath ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Research Document</div>
                    <div className="text-sm text-gray-500">Main manuscript/publication</div>
                  </div>
                </div>
                <a
                  href={`http://localhost:5000${contribution.manuscriptFilePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View
                </a>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No research document uploaded</p>
              </div>
            )}

            {contribution.supportingDocsFilePaths && (contribution.supportingDocsFilePaths as any).files?.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 mt-4">Supporting Documents</h3>
                {((contribution.supportingDocsFilePaths as any).files as Array<{path: string, name: string, size?: number}>).map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{doc.name}</div>
                        {doc.size && (
                          <div className="text-xs text-gray-500">
                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={`http://localhost:5000${doc.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </a>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Incentive Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Incentive Calculation</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700 mb-1">
                <Coins className="w-5 h-5" />
                <span className="text-sm font-medium">Calculated Incentive</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                ₹{(contribution.calculatedIncentiveAmount || 0).toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2 text-purple-700 mb-1">
                <Award className="w-5 h-5" />
                <span className="text-sm font-medium">Calculated Points</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {contribution.calculatedPoints || 0}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            These incentives and points will be credited to all internal authors upon approval.
          </p>
        </div>

        {/* Review History */}
        {contribution.reviews && contribution.reviews.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review History</h2>
            <div className="space-y-3">
              {contribution.reviews.map((review: any, index: number) => {
                const isApproval = review.decision === 'approved';
                const isRecommendation = review.decision === 'recommended';
                const isCurrentUserReview = review.reviewerId === user?.id;
                
                return (
                  <div 
                    key={review.id || index} 
                    className={`p-4 rounded-lg border-l-4 ${
                      isApproval ? 'bg-green-50 border-green-500' :
                      isRecommendation ? 'bg-blue-50 border-blue-500' :
                      review.decision === 'rejected' ? 'bg-red-50 border-red-500' :
                      review.decision === 'changes_required' ? 'bg-orange-50 border-orange-500' :
                      'bg-gray-50 border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {review.reviewer?.uid ? `${review.reviewer.uid} - ` : ''}
                          {review.reviewer?.employeeDetails?.displayName || 'Reviewer'}
                        </span>
                        {isCurrentUserReview && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            You
                          </span>
                        )}
                        {isApproval && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {review.reviewedAt ? new Date(review.reviewedAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        isApproval ? 'bg-green-100 text-green-700' :
                        isRecommendation ? 'bg-blue-100 text-blue-700' :
                        review.decision === 'rejected' ? 'bg-red-100 text-red-700' :
                        review.decision === 'changes_required' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {isApproval ? '✓ Final Approval' : 
                         isRecommendation ? '→ Recommended for Approval' :
                         review.decision?.replace('_', ' ').toUpperCase()}
                      </span>
                      {review.comments && (
                        <p className="mt-2 italic">{review.comments}</p>
                      )}
                      {isApproval && (
                        <div className="mt-3 p-3 bg-white rounded border border-green-200">
                          <div className="flex items-center text-green-700">
                            <Award className="w-4 h-4 mr-2" />
                            <span className="font-medium text-sm">
                              Final approval granted - Incentives credited to all internal authors
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {['submitted', 'under_review', 'resubmitted'].includes(contribution.status) && (() => {
          // Check if current user has already reviewed this contribution
          const userHasReviewed = contribution.reviews?.some((review: any) => review.reviewerId === user?.id);
          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Actions</h2>
              {userHasReviewed && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-medium">You have already reviewed this contribution</span>
                  </div>
                </div>
              )}
              {!userHasReviewed && contribution.status === 'submitted' && (
                <button
                  onClick={handleStartReview}
                  disabled={actionLoading}
                  className="w-full mb-4 px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Clock className="w-5 h-5 mr-2" />}
                  Start Review
                </button>
              )}
              {!userHasReviewed && ['under_review', 'resubmitted'].includes(contribution.status) && (
                <div className="space-y-4">
                  {/* Edit Mode Info */}
                  {isEditMode && fieldSuggestions.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-800">
                          <Edit3 className="w-4 h-4 inline mr-2" />
                          You have {fieldSuggestions.length} field suggestion(s) pending
                        </span>
                        <button
                          onClick={() => setShowSuggestionsPreview(true)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Preview & Submit
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Comments</label>
                    <textarea
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add your review comments..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className={`flex-1 px-6 py-3 ${userPermissions.research_approve ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center`}
                    >
                      {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                      {userPermissions.research_approve ? 'Approve' : 'Recommend for Approval'}
                    </button>
                    <button
                      onClick={() => {
                        if (fieldSuggestions.length > 0) {
                          setShowSuggestionsPreview(true);
                        } else if (isEditMode) {
                          // Already in edit mode but no suggestions, show hint
                          alert('Use the edit icons on fields above to suggest specific changes, or add comments and click "Request Changes" to send general feedback.');
                        } else {
                          // Show the new enhanced modal
                          setShowChangesModal(true);
                        }
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Request Changes {fieldSuggestions.length > 0 && `(${fieldSuggestions.length})`}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Request Changes Modal */}
        {/* Enhanced Request Changes Modal */}
        {showChangesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Changes</h3>
              
              {/* Option to use collaborative editing */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <Edit3 className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800">Want to suggest specific field changes?</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Use the collaborative editing mode to suggest precise changes to individual fields like Journal Name, Impact Factor, etc.
                    </p>
                    <button
                      onClick={() => {
                        setShowChangesModal(false);
                        setIsEditMode(true);
                      }}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Enter Collaborative Edit Mode
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Or send a quick comment:</h4>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                  placeholder="Describe the changes required..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowChangesModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={actionLoading || !reviewComments.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Sending...' : 'Send Quick Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Contribution</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                placeholder="Reason for rejection..."
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions Preview Modal */}
        {showSuggestionsPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Review Your Suggestions</h3>
                <button
                  onClick={() => setShowSuggestionsPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {fieldSuggestions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No suggestions added yet.</p>
                ) : (
                  fieldSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-2">{getFieldLabel(suggestion.fieldName)}</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Original:</span>
                              <p className="text-gray-700 line-through">{suggestion.originalValue || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Suggested:</span>
                              <p className="text-green-600 font-medium">{suggestion.suggestedValue}</p>
                            </div>
                          </div>
                          {suggestion.note && (
                            <div className="mt-2 text-sm text-gray-500 italic">
                              Note: {suggestion.note}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeSuggestion(suggestion.fieldName)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                  placeholder="Add any additional comments for the applicant..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSuggestionsPreview(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => {
                    setShowSuggestionsPreview(false);
                    handleRequestChanges();
                  }}
                  disabled={actionLoading || fieldSuggestions.length === 0}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  Submit {fieldSuggestions.length} Suggestion{fieldSuggestions.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
