'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  FileText,
  BookOpen,
  Presentation,
  DollarSign,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { researchService, ResearchContribution, ResearchPublicationType } from '@/services/research.service';
import { useAuthStore } from '@/store/authStore';

interface EditSuggestion {
  id: string;
  fieldName: string;
  fieldPath: string;
  originalValue: string;
  suggestedValue: string;
  suggestionNote?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewerId: string;
  reviewer?: { uid: string; employeeDetails?: { displayName: string } };
  createdAt: string;
}

const PUBLICATION_TYPE_CONFIG: Record<ResearchPublicationType, { label: string; icon: React.ElementType }> = {
  research_paper: { label: 'Research Paper', icon: FileText },
  book: { label: 'Book', icon: BookOpen },
  book_chapter: { label: 'Book Chapter', icon: BookOpen },
  conference_paper: { label: 'Conference Paper', icon: Presentation },
  grant: { label: 'Grant Proposal', icon: DollarSign },
};

export default function EditContributionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const id = params.id as string;

  const [contribution, setContribution] = useState<ResearchContribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState<string | null>(null);

  // Form data matching the original ResearchContributionForm structure
  const [formData, setFormData] = useState({
    title: '',
    targetedResearchType: 'scopus' as 'scopus' | 'wos' | 'both' | 'ugc',
    hasInternationalAuthor: 'yes' as 'yes' | 'no',
    numForeignUniversities: '',
    impactFactor: '',
    sjr: '',
    quartile: '' as '' | 'q1' | 'q2' | 'q3' | 'q4' | 'na',
    isInterdisciplinary: 'yes' as 'yes' | 'no',
    hasLpuStudents: 'yes' as 'yes' | 'no',
    journalName: '',
    volume: '',
    issue: '',
    pageNumbers: '',
    doi: '',
    issn: '',
    publisherName: '',
    publisherLocation: '',
    publicationDate: '',
    publicationStatus: 'published' as 'published' | 'in_press' | 'accepted' | 'under_review',
  });

  useEffect(() => {
    if (id) {
      fetchContribution();
    }
  }, [id]);

  const fetchContribution = async () => {
    try {
      setLoading(true);
      const response = await researchService.getContributionById(id);
      if (response.success && response.data) {
        setContribution(response.data);
        if (response.data.editSuggestions) {
          setEditSuggestions(response.data.editSuggestions);
        }
        // Map backend fields to form fields
        setFormData({
          title: response.data.title || '',
          targetedResearchType: response.data.targetedResearchType || 'scopus',
          hasInternationalAuthor: response.data.internationalAuthor ? 'yes' : 'no',
          numForeignUniversities: response.data.foreignCollaborationsCount?.toString() || '',
          impactFactor: response.data.impactFactor?.toString() || '',
          sjr: response.data.sjr?.toString() || '',
          quartile: response.data.quartile || '',
          isInterdisciplinary: response.data.interdisciplinaryFromSgt ? 'yes' : 'no',
          hasLpuStudents: response.data.studentsFromSgt ? 'yes' : 'no',
          journalName: response.data.journalName || '',
          volume: response.data.volume || '',
          issue: response.data.issue || '',
          pageNumbers: response.data.pageNumbers || '',
          doi: response.data.doi || '',
          issn: response.data.issn || '',
          publisherName: response.data.publisherName || '',
          publisherLocation: response.data.publisherLocation || '',
          publicationDate: response.data.publicationDate ? new Date(response.data.publicationDate).toISOString().split('T')[0] : '',
          publicationStatus: response.data.publicationStatus || 'published',
        });
      }
    } catch (error) {
      console.error('Error fetching contribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshContribution = async () => {
    try {
      const response = await researchService.getContributionById(id);
      if (response.success && response.data) {
        setContribution(response.data);
        if (response.data.editSuggestions) {
          setEditSuggestions(response.data.editSuggestions);
        }
      }
    } catch (error) {
      console.error('Error refreshing contribution:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAcceptSuggestion = async (suggestion: EditSuggestion) => {
    try {
      setSuggestionLoading(suggestion.id);
      // Map backend field names to form field names
      const fieldMapping: Record<string, string> = {
        'title': 'title',
        'journalName': 'journalName',
        'volume': 'volume',
        'issue': 'issue',
        'pageNumbers': 'pageNumbers',
        'doi': 'doi',
        'issn': 'issn',
        'publisherName': 'publisherName',
        'publisherLocation': 'publisherLocation',
        'publicationDate': 'publicationDate',
        'publicationStatus': 'publicationStatus',
        'targetedResearchType': 'targetedResearchType',
        'internationalAuthor': 'hasInternationalAuthor',
        'foreignCollaborationsCount': 'numForeignUniversities',
        'impactFactor': 'impactFactor',
        'sjr': 'sjr',
        'quartile': 'quartile',
        'interdisciplinaryFromSgt': 'isInterdisciplinary',
        'studentsFromSgt': 'hasLpuStudents',
      };
      
      const formFieldName = fieldMapping[suggestion.fieldName] || suggestion.fieldName;
      let valueToApply = suggestion.suggestedValue;
      
      // Convert boolean string values to yes/no for radio buttons
      if (['hasInternationalAuthor', 'isInterdisciplinary', 'hasLpuStudents'].includes(formFieldName)) {
        valueToApply = suggestion.suggestedValue === 'true' || suggestion.suggestedValue === 'Yes' ? 'yes' : 'no';
      }
      
      handleFieldChange(formFieldName, valueToApply);
      await researchService.respondToSuggestion(suggestion.id, { accept: true });
      await refreshContribution();
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      alert('Failed to accept suggestion');
    } finally {
      setSuggestionLoading(null);
    }
  };

  const handleRejectSuggestion = async (suggestion: EditSuggestion) => {
    try {
      setSuggestionLoading(suggestion.id);
      await researchService.respondToSuggestion(suggestion.id, { accept: false });
      await refreshContribution();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      alert('Failed to reject suggestion');
    } finally {
      setSuggestionLoading(null);
    }
  };

  // Build submit data matching buildSubmitData from ResearchContributionForm
  const buildSubmitData = () => {
    return {
      title: formData.title,
      journalName: formData.journalName,
      targetedResearchType: formData.targetedResearchType,
      internationalAuthor: formData.hasInternationalAuthor === 'yes',
      foreignCollaborationsCount: formData.numForeignUniversities ? Number(formData.numForeignUniversities) : 0,
      impactFactor: formData.impactFactor ? Number(formData.impactFactor) : undefined,
      sjr: formData.sjr ? Number(formData.sjr) : undefined,
      quartile: formData.quartile || undefined,
      interdisciplinaryFromSgt: formData.isInterdisciplinary === 'yes',
      studentsFromSgt: formData.hasLpuStudents === 'yes',
      volume: formData.volume || undefined,
      issue: formData.issue || undefined,
      pageNumbers: formData.pageNumbers || undefined,
      doi: formData.doi || undefined,
      issn: formData.issn || undefined,
      publisherName: formData.publisherName || undefined,
      publisherLocation: formData.publisherLocation || undefined,
      publicationDate: formData.publicationDate ? new Date(formData.publicationDate).toISOString() : undefined,
      publicationStatus: formData.publicationStatus || undefined,
    };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = buildSubmitData();
      await researchService.updateContribution(id, data);
      alert('Changes saved successfully');
      await refreshContribution();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndResubmit = async () => {
    const pending = editSuggestions.filter(s => s.status === 'pending');
    if (pending.length > 0) {
      alert(`Please resolve all ${pending.length} pending suggestion(s) before resubmitting.`);
      return;
    }

    try {
      setSubmitting(true);
      const data = buildSubmitData();
      await researchService.updateContribution(id, data);
      await researchService.resubmitContribution(id);
      alert('Contribution resubmitted successfully!');
      router.push(`/research/contribution/${id}`);
    } catch (error) {
      console.error('Error resubmitting:', error);
      alert('Failed to resubmit contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const getSuggestionForField = (backendFieldName: string): EditSuggestion | undefined => {
    return editSuggestions.find(s => s.fieldName === backendFieldName && s.status === 'pending');
  };

  const pendingSuggestions = editSuggestions.filter(s => s.status === 'pending');

  const renderSuggestionCard = (backendFieldName: string) => {
    const suggestion = getSuggestionForField(backendFieldName);
    if (!suggestion) return null;

    return (
      <div className="mt-3 p-3 bg-white border border-orange-200 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center text-sm font-medium text-orange-700 mb-2">
              <MessageSquare className="w-4 h-4 mr-1" />
              Reviewer Suggestion
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="text-gray-500 w-20 flex-shrink-0">Current:</span>
                <span className="text-red-600 line-through bg-red-50 px-2 py-0.5 rounded">
                  {suggestion.originalValue || '(empty)'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-gray-500 w-20 flex-shrink-0">Suggested:</span>
                <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                  {suggestion.suggestedValue || '(empty)'}
                </span>
              </div>
            </div>
            {suggestion.suggestionNote && (
              <p className="text-xs text-gray-500 mt-2 italic">Note: {suggestion.suggestionNote}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => handleAcceptSuggestion(suggestion)}
              disabled={suggestionLoading === suggestion.id}
              className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {suggestionLoading === suggestion.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Apply</>}
            </button>
            <button
              onClick={() => handleRejectSuggestion(suggestion)}
              disabled={suggestionLoading === suggestion.id}
              className="flex items-center px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              <X className="w-4 h-4 mr-1" />Reject
            </button>
          </div>
        </div>
      </div>
    );
  };

  const hasSuggestion = (backendFieldName: string) => {
    return editSuggestions.some(s => s.fieldName === backendFieldName && s.status === 'pending');
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
          <Link href="/research/my-contributions" className="text-blue-600 hover:underline">Back to My Contributions</Link>
        </div>
      </div>
    );
  }

  const pubTypeConfig = PUBLICATION_TYPE_CONFIG[contribution.publicationType];
  const PubTypeIcon = pubTypeConfig?.icon || FileText;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/research/contribution/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Edit Contribution</h1>
                <p className="text-sm text-gray-500">{contribution.applicationNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </button>
              <button onClick={handleSaveAndResubmit} disabled={submitting || pendingSuggestions.length > 0} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Save & Resubmit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions Summary */}
      {pendingSuggestions.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-900">{pendingSuggestions.length} Pending Suggestion{pendingSuggestions.length > 1 ? 's' : ''}</h3>
                <p className="text-sm text-orange-700 mt-1">Review each suggestion below and either accept (auto-fills the field) or reject it. You must resolve all suggestions before resubmitting.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {editSuggestions.length > 0 && pendingSuggestions.length === 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900">All Suggestions Resolved</h3>
                <p className="text-sm text-green-700 mt-1">Make any additional changes if needed, then click "Save & Resubmit".</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Publication Type Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <PubTypeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{pubTypeConfig?.label || contribution.publicationType}</p>
            <p className="text-sm text-gray-500">Publication Type (cannot be changed)</p>
          </div>
        </div>

        {/* Basic Information - Title */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className={`${hasSuggestion('title') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
              {hasSuggestion('title') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
            </label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleInputChange} 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Enter publication title" 
            />
            {renderSuggestionCard('title')}
          </div>
        </div>

        {/* Research Paper Specific Fields */}
        {contribution.publicationType === 'research_paper' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Research Details</h2>
            <div className="space-y-6">
              
              {/* Targeted Research Type */}
              <div className={`${hasSuggestion('targetedResearchType') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Targeted Research (Indexed in): <span className="text-red-500">*</span>
                  {hasSuggestion('targetedResearchType') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <div className="flex flex-wrap gap-4">
                  {[{v:'scopus',l:'Scopus'},{v:'wos',l:'SCI/SCIE'},{v:'both',l:'Both'},{v:'ugc',l:'UGC'}].map(({v,l}) => (
                    <label key={v} className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="targetedResearchType" 
                        value={v} 
                        checked={formData.targetedResearchType === v} 
                        onChange={handleInputChange} 
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
                {renderSuggestionCard('targetedResearchType')}
              </div>

              {/* International Author */}
              <div className={`${hasSuggestion('internationalAuthor') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  International Author: <span className="text-red-500">*</span>
                  {hasSuggestion('internationalAuthor') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <div className="flex gap-4">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="hasInternationalAuthor" 
                        value={v} 
                        checked={formData.hasInternationalAuthor === v} 
                        onChange={handleInputChange} 
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{v}</span>
                    </label>
                  ))}
                </div>
                {renderSuggestionCard('internationalAuthor')}
              </div>

              {/* Number of Foreign Universities */}
              <div className={`${hasSuggestion('foreignCollaborationsCount') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of foreign Universities/Research organizations:
                  {hasSuggestion('foreignCollaborationsCount') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <input 
                  type="number" 
                  name="numForeignUniversities" 
                  value={formData.numForeignUniversities} 
                  onChange={handleInputChange} 
                  min="0" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="0"
                />
                {renderSuggestionCard('foreignCollaborationsCount')}
              </div>

              {/* SJR and Quartile - Only show for Scopus or Both */}
              {(formData.targetedResearchType === 'scopus' || formData.targetedResearchType === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${hasSuggestion('sjr') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SJR:
                      {hasSuggestion('sjr') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                    </label>
                    <input 
                      type="text" 
                      name="sjr" 
                      value={formData.sjr} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="Enter SJR value" 
                    />
                    {renderSuggestionCard('sjr')}
                  </div>
                  <div className={`${hasSuggestion('quartile') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quartile: <span className="text-red-500">*</span>
                      {hasSuggestion('quartile') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['q1','q2','q3','q4','na'].map(v => (
                        <label key={v} className="inline-flex items-center">
                          <input 
                            type="radio" 
                            name="quartile" 
                            value={v} 
                            checked={formData.quartile === v} 
                            onChange={handleInputChange} 
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" 
                          />
                          <span className="ml-2 text-sm text-gray-700 uppercase">{v === 'na' ? 'N/A' : v}</span>
                        </label>
                      ))}
                    </div>
                    {renderSuggestionCard('quartile')}
                  </div>
                </div>
              )}

              {/* Impact Factor - Only show for WOS or Both */}
              {(formData.targetedResearchType === 'wos' || formData.targetedResearchType === 'both') && (
                <div className={`${hasSuggestion('impactFactor') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impact Factor: <span className="text-red-500">*</span>
                    {hasSuggestion('impactFactor') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="text" 
                    name="impactFactor" 
                    value={formData.impactFactor} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter Impact Factor" 
                  />
                  {renderSuggestionCard('impactFactor')}
                </div>
              )}

              {/* Interdisciplinary from SGT */}
              <div className={`${hasSuggestion('interdisciplinaryFromSgt') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interdisciplinary (from SGT): <span className="text-red-500">*</span>
                  {hasSuggestion('interdisciplinaryFromSgt') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <div className="flex gap-4">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="isInterdisciplinary" 
                        value={v} 
                        checked={formData.isInterdisciplinary === v} 
                        onChange={handleInputChange} 
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{v}</span>
                    </label>
                  ))}
                </div>
                {renderSuggestionCard('interdisciplinaryFromSgt')}
              </div>

              {/* Students from SGT */}
              <div className={`${hasSuggestion('studentsFromSgt') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student(s) (from SGT): <span className="text-red-500">*</span>
                  {hasSuggestion('studentsFromSgt') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <div className="flex gap-4">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="hasLpuStudents" 
                        value={v} 
                        checked={formData.hasLpuStudents === v} 
                        onChange={handleInputChange} 
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" 
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{v}</span>
                    </label>
                  ))}
                </div>
                {renderSuggestionCard('studentsFromSgt')}
              </div>

              {/* Journal Name */}
              <div className={`${hasSuggestion('journalName') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Journal Name: <span className="text-red-500">*</span>
                  {hasSuggestion('journalName') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <input 
                  type="text" 
                  name="journalName" 
                  value={formData.journalName} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter journal name" 
                />
                {renderSuggestionCard('journalName')}
              </div>

              {/* Volume, Issue, Page Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${hasSuggestion('volume') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volume Number
                    {hasSuggestion('volume') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="text" 
                    name="volume" 
                    value={formData.volume} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="e.g., 45" 
                  />
                  {renderSuggestionCard('volume')}
                </div>

                <div className={`${hasSuggestion('issue') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Number
                    {hasSuggestion('issue') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="text" 
                    name="issue" 
                    value={formData.issue} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="e.g., 3" 
                  />
                  {renderSuggestionCard('issue')}
                </div>

                <div className={`${hasSuggestion('pageNumbers') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Numbers
                    {hasSuggestion('pageNumbers') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="text" 
                    name="pageNumbers" 
                    value={formData.pageNumbers} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="e.g., 123-145" 
                  />
                  {renderSuggestionCard('pageNumbers')}
                </div>
              </div>

              {/* DOI and ISSN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${hasSuggestion('doi') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DOI
                    {hasSuggestion('doi') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="text" 
                    name="doi" 
                    value={formData.doi} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="e.g., 10.1234/example.2024" 
                  />
                  {renderSuggestionCard('doi')}
                </div>

                <div className={`${hasSuggestion('issn') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISSN
                    {hasSuggestion('issn') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="text" 
                    name="issn" 
                    value={formData.issn} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="e.g., 1234-5678" 
                  />
                  {renderSuggestionCard('issn')}
                </div>
              </div>

              {/* Publisher Name and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${hasSuggestion('publisherName') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publisher Name
                    {hasSuggestion('publisherName') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="text" 
                    name="publisherName" 
                    value={formData.publisherName} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter publisher name" 
                  />
                  {renderSuggestionCard('publisherName')}
                </div>

                
              </div>

              {/* Publication Date and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${hasSuggestion('publicationDate') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publication Date
                    {hasSuggestion('publicationDate') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <input 
                    type="date" 
                    name="publicationDate" 
                    value={formData.publicationDate} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                  {renderSuggestionCard('publicationDate')}
                </div>

                <div className={`${hasSuggestion('publicationStatus') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publication Status
                    {hasSuggestion('publicationStatus') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                  </label>
                  <select 
                    name="publicationStatus" 
                    value={formData.publicationStatus} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select status</option>
                    <option value="published">Published</option>
                    <option value="in_press">In Press</option>
                    <option value="accepted">Accepted</option>
                    <option value="under_review">Under Review</option>
                  </select>
                  {renderSuggestionCard('publicationStatus')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Editing Tips:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
                <li>Fields with orange highlighting have reviewer suggestions</li>
                <li>Click "Apply" to accept a suggestion and auto-fill the field</li>
                <li>Click "Reject" to dismiss a suggestion and keep your current value</li>
                <li>Author information cannot be edited here - contact admin if needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Link href={`/research/contribution/${id}`} className="text-gray-600 hover:text-gray-900 font-medium">
            Cancel
          </Link>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </button>
            <button 
              onClick={handleSaveAndResubmit} 
              disabled={submitting || pendingSuggestions.length > 0} 
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Save & Resubmit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
