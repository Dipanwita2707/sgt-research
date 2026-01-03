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
  Sparkles,
  ChevronDown
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
    targetedResearchType: 'scopus' as 'scopus' | 'wos' | 'both',
    hasInternationalAuthor: 'yes' as 'yes' | 'no',
    numForeignUniversities: '',
    impactFactor: '',
    sjr: '',
    quartile: '' as '' | 'top1' | 'top5' | 'q1' | 'q2' | 'q3' | 'q4' | 'na',
    isInterdisciplinary: 'yes' as 'yes' | 'no',
    hasLpuStudents: 'yes' as 'yes' | 'no',
    journalName: '',
    sdgGoals: [] as string[],
    weblink: '',
    volume: '',
    issue: '',
    pageNumbers: '',
    doi: '',
    issn: '',
    publisherName: '',
    publisherLocation: '',
    publicationDate: '',
    publicationStatus: 'published' as 'published' | 'in_press' | 'accepted' | 'under_review',
    // Book-specific fields
    bookIndexingType: '' as '' | 'scopus_indexed' | 'non_indexed' | 'sgt_publication_house',
    bookPublicationType: '' as '' | 'authored' | 'edited',
    communicatedWithOfficialId: 'yes' as 'yes' | 'no',
    personalEmail: '',
    bookTitle: '',
    chapterNumber: '',
    editors: '',
    nationalInternational: '' as '' | 'national' | 'international',
    isbn: '',
    facultyRemarks: '',
    // Conference-specific fields
    conferenceSubType: '' as '' | 'paper_indexed_scopus' | 'paper_not_indexed' | 'keynote_speaker_invited_talks' | 'organizer_coordinator_member',
    conferenceName: '',
    conferenceType: '' as '' | 'national' | 'international',
    proceedingsTitle: '',
    proceedingsQuartile: '' as '' | 'q1' | 'q2' | 'q3' | 'q4' | 'na',
    indexedIn: '',
    conferenceHeldLocation: '',
    eventCategory: '',
    totalPresenters: '',
    isPresenter: '' as '' | 'yes' | 'no',
    fullPaper: '' as '' | 'yes' | 'no',
    paperDoi: '',
    issnIsbnIssueNo: '',
    priorityFundingArea: '',
    conferenceDate: '',
    conferenceBestPaperAward: '' as '' | 'yes' | 'no',
    virtualConference: '' as '' | 'yes' | 'no',
    conferenceHeldAtSgt: '' as '' | 'yes' | 'no',
    interdisciplinaryFromSgt: '' as '' | 'yes' | 'no',
    studentsFromSgt: '' as '' | 'yes' | 'no',
    industryCollaboration: '' as '' | 'yes' | 'no',
    centralFacilityUsed: '' as '' | 'yes' | 'no',
    conferenceRole: '',
    venue: '',
    topic: '',
    organizerRole: '',
    attendedVirtual: '' as '' | 'yes' | 'no',
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
        const sdgGoalsData = (response.data as any).sdg_goals;
        const sdgArray = Array.isArray(sdgGoalsData) 
          ? sdgGoalsData 
          : (typeof sdgGoalsData === 'string' ? sdgGoalsData.split(',').map((s: string) => s.trim()).filter((s: string) => s) : []);
        
        // Map quartile values (handle both Prisma enum names and display values)
        let mappedQuartile = response.data.quartile || '';
        if (mappedQuartile === 'Top_1_' || mappedQuartile === 'Top 1%') mappedQuartile = 'top1';
        else if (mappedQuartile === 'Top_5_' || mappedQuartile === 'Top 5%') mappedQuartile = 'top5';
        else if (mappedQuartile) mappedQuartile = mappedQuartile.toLowerCase();
        
        setFormData({
          title: response.data.title || '',
          targetedResearchType: response.data.targetedResearchType || 'scopus',
          hasInternationalAuthor: response.data.internationalAuthor ? 'yes' : 'no',
          numForeignUniversities: response.data.foreignCollaborationsCount?.toString() || '',
          impactFactor: response.data.impactFactor?.toString() || '',
          sjr: response.data.sjr?.toString() || '',
          quartile: mappedQuartile as any,
          isInterdisciplinary: response.data.interdisciplinaryFromSgt ? 'yes' : 'no',
          hasLpuStudents: response.data.studentsFromSgt ? 'yes' : 'no',
          journalName: response.data.journalName || '',
          sdgGoals: sdgArray,
          weblink: (response.data as any).weblink || response.data.publisherName || '',
          volume: response.data.volume || '',
          issue: response.data.issue || '',
          pageNumbers: response.data.pageNumbers || '',
          doi: response.data.doi || '',
          issn: response.data.issn || '',
          publisherName: response.data.publisherName || '',
          publisherLocation: response.data.publisherLocation || '',
          publicationDate: response.data.publicationDate ? new Date(response.data.publicationDate).toISOString().split('T')[0] : '',
          publicationStatus: response.data.publicationStatus || 'published',
          // Book-specific fields
          bookIndexingType: (response.data as any).bookIndexingType || '',
          bookPublicationType: (response.data as any).bookPublicationType || '',
          communicatedWithOfficialId: (response.data as any).communicatedWithOfficialId || 'yes',
          personalEmail: (response.data as any).personalEmail || '',
          bookTitle: (response.data as any).bookTitle || '',
          chapterNumber: (response.data as any).chapterNumber || '',
          editors: (response.data as any).editors || '',
          nationalInternational: (response.data as any).nationalInternational || '',
          isbn: (response.data as any).isbn || '',
          facultyRemarks: (response.data as any).facultyRemarks || '',
          // Conference-specific fields
          conferenceSubType: (response.data as any).conferenceSubType || '',
          conferenceName: (response.data as any).conferenceName || '',
          conferenceType: (response.data as any).conferenceType || '',
          proceedingsTitle: (response.data as any).proceedingsTitle || '',
          proceedingsQuartile: (response.data as any).proceedingsQuartile || '',
          indexedIn: (response.data as any).indexedIn || '',
          conferenceHeldLocation: (response.data as any).conferenceHeldLocation || '',
          eventCategory: (response.data as any).eventCategory || '',
          totalPresenters: (response.data as any).totalPresenters?.toString() || '',
          isPresenter: (response.data as any).isPresenter || '',
          fullPaper: (response.data as any).fullPaper || '',
          paperDoi: (response.data as any).paperDoi || '',
          issnIsbnIssueNo: (response.data as any).issnIsbnIssueNo || '',
          priorityFundingArea: (response.data as any).priorityFundingArea || '',
          conferenceDate: (response.data as any).conferenceDate ? new Date((response.data as any).conferenceDate).toISOString().split('T')[0] : '',
          conferenceBestPaperAward: (response.data as any).conferenceBestPaperAward || '',
          virtualConference: (response.data as any).virtualConference || '',
          conferenceHeldAtSgt: (response.data as any).conferenceHeldAtSgt || '',
          interdisciplinaryFromSgt: (response.data as any).interdisciplinaryFromSgt ? 'yes' : 'no',
          studentsFromSgt: (response.data as any).studentsFromSgt ? 'yes' : 'no',
          industryCollaboration: (response.data as any).industryCollaboration || '',
          centralFacilityUsed: (response.data as any).centralFacilityUsed || '',
          conferenceRole: (response.data as any).conferenceRole || '',
          venue: (response.data as any).venue || '',
          topic: (response.data as any).topic || '',
          organizerRole: (response.data as any).organizerRole || '',
          attendedVirtual: (response.data as any).attendedVirtual || '',
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
      
      // Only proceed if this specific suggestion is still pending
      if (suggestion.status !== 'pending') {
        console.log('Suggestion already processed:', suggestion.id);
        return;
      }
      
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
        'sdg_goals': 'sdgGoals',
        'weblink': 'weblink',
        // Book fields
        'bookIndexingType': 'bookIndexingType',
        'bookPublicationType': 'bookPublicationType',
        'communicatedWithOfficialId': 'communicatedWithOfficialId',
        'personalEmail': 'personalEmail',
        'bookTitle': 'bookTitle',
        'chapterNumber': 'chapterNumber',
        'editors': 'editors',
        'nationalInternational': 'nationalInternational',
        'isbn': 'isbn',
        'facultyRemarks': 'facultyRemarks',
        // Conference fields
        'conferenceSubType': 'conferenceSubType',
        'conferenceName': 'conferenceName',
        'conferenceType': 'conferenceType',
        'proceedingsTitle': 'proceedingsTitle',
        'proceedingsQuartile': 'proceedingsQuartile',
        'indexedIn': 'indexedIn',
        'conferenceHeldLocation': 'conferenceHeldLocation',
        'eventCategory': 'eventCategory',
        'totalPresenters': 'totalPresenters',
        'isPresenter': 'isPresenter',
        'fullPaper': 'fullPaper',
        'paperDoi': 'paperDoi',
        'issnIsbnIssueNo': 'issnIsbnIssueNo',
        'priorityFundingArea': 'priorityFundingArea',
        'conferenceDate': 'conferenceDate',
        'conferenceBestPaperAward': 'conferenceBestPaperAward',
        'virtualConference': 'virtualConference',
        'conferenceHeldAtSgt': 'conferenceHeldAtSgt',
        'interdisciplinaryFromSgt': 'interdisciplinaryFromSgt',
        'studentsFromSgt': 'studentsFromSgt',
        'industryCollaboration': 'industryCollaboration',
        'centralFacilityUsed': 'centralFacilityUsed',
        'conferenceRole': 'conferenceRole',
        'venue': 'venue',
        'topic': 'topic',
        'organizerRole': 'organizerRole',
        'attendedVirtual': 'attendedVirtual',
      };
      
      const formFieldName = fieldMapping[suggestion.fieldName] || suggestion.fieldName;
      let valueToApply = suggestion.suggestedValue;
      
      // Convert boolean string values to yes/no for radio buttons
      if (['hasInternationalAuthor', 'isInterdisciplinary', 'hasLpuStudents'].includes(formFieldName)) {
        valueToApply = suggestion.suggestedValue === 'true' || suggestion.suggestedValue === 'Yes' ? 'yes' : 'no';
      }
      // Convert targetedResearchType display values to form values
      else if (formFieldName === 'targetedResearchType') {
        const displayToFormMap: Record<string, string> = {
          'Scopus': 'scopus',
          'SCI/SCIE': 'wos',
          'Both': 'both',
        };
        valueToApply = displayToFormMap[suggestion.suggestedValue] || suggestion.suggestedValue.toLowerCase();
        
        // Clear dependent fields
        if (valueToApply === 'scopus') {
          // Clear impact factor for scopus
          setFormData(prev => ({ ...prev, impactFactor: '' }));
        } else if (valueToApply === 'wos') {
          // Clear SJR and quartile for WOS
          setFormData(prev => ({ ...prev, sjr: '', quartile: '' }));
        }
      }
      // Convert quartile display values to form values
      else if (formFieldName === 'quartile') {
        const displayToFormMap: Record<string, string> = {
          'Top 1%': 'top1',
          'Top 5%': 'top5',
          'Q1': 'q1',
          'Q2': 'q2',
          'Q3': 'q3',
          'Q4': 'q4',
        };
        valueToApply = displayToFormMap[suggestion.suggestedValue] || suggestion.suggestedValue.toLowerCase();
      }
      // Convert SDG goals string to array
      else if (formFieldName === 'sdgGoals') {
        valueToApply = typeof suggestion.suggestedValue === 'string' 
          ? suggestion.suggestedValue.split(',').map(s => s.trim()).filter(s => s)
          : suggestion.suggestedValue;
      }
      
      // Update the form field
      handleFieldChange(formFieldName, valueToApply);
      
      // Send accept request to backend
      await researchService.respondToSuggestion(suggestion.id, { accept: true });
      
      // Refresh to get updated suggestions list
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
    // Normalize quartile value for backend (convert form values to backend format)
    let normalizedQuartile = formData.quartile;
    if (formData.quartile === 'top1') normalizedQuartile = 'Top_1_';
    else if (formData.quartile === 'top5') normalizedQuartile = 'Top_5_';
    else if (formData.quartile) normalizedQuartile = formData.quartile.toUpperCase();
    
    const baseData = {
      title: formData.title,
      journalName: formData.journalName,
      targetedResearchType: formData.targetedResearchType,
      internationalAuthor: formData.hasInternationalAuthor === 'yes',
      foreignCollaborationsCount: formData.numForeignUniversities ? Number(formData.numForeignUniversities) : 0,
      impactFactor: formData.impactFactor ? Number(formData.impactFactor) : undefined,
      sjr: formData.sjr ? Number(formData.sjr) : undefined,
      quartile: normalizedQuartile || undefined,
      interdisciplinaryFromSgt: formData.isInterdisciplinary === 'yes',
      studentsFromSgt: formData.hasLpuStudents === 'yes',
      sdg_goals: formData.sdgGoals.length > 0 ? formData.sdgGoals : undefined,
      weblink: formData.weblink || undefined,
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

    // Add book-specific fields if it's a book or book_chapter
    if (contribution?.publicationType === 'book' || contribution?.publicationType === 'book_chapter') {
      return {
        ...baseData,
        bookIndexingType: formData.bookIndexingType || undefined,
        bookPublicationType: formData.bookPublicationType || undefined,
        communicatedWithOfficialId: formData.communicatedWithOfficialId || undefined,
        personalEmail: formData.personalEmail || undefined,
        bookTitle: formData.bookTitle || undefined,
        chapterNumber: formData.chapterNumber || undefined,
        editors: formData.editors || undefined,
        nationalInternational: formData.nationalInternational || undefined,
        isbn: formData.isbn || undefined,
        facultyRemarks: formData.facultyRemarks || undefined,
      };
    }

    return baseData;
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
                  {[{v:'scopus',l:'Scopus'},{v:'wos',l:'SCI/SCIE'},{v:'both',l:'Both'}].map(({v,l}) => (
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
                      {[{v:'top1',l:'Top 1%'},{v:'top5',l:'Top 5%'},{v:'q1',l:'Q1'},{v:'q2',l:'Q2'},{v:'q3',l:'Q3'},{v:'q4',l:'Q4'}].map(({v,l}) => (
                        <label key={v} className="inline-flex items-center">
                          <input 
                            type="radio" 
                            name="quartile" 
                            value={v} 
                            checked={formData.quartile === v} 
                            onChange={handleInputChange} 
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" 
                          />
                          <span className="ml-2 text-sm text-gray-700">{l}</span>
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

              {/* Weblink */}
              <div className={`${hasSuggestion('weblink') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weblink:
                  {hasSuggestion('weblink') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <input 
                  type="url" 
                  name="weblink" 
                  value={formData.weblink} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="https://example.com" 
                />
                {renderSuggestionCard('weblink')}
              </div>

              {/* SDG Goals */}
              <div className={`${hasSuggestion('sdg_goals') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  UN Sustainable Development Goals (SDGs)
                  {hasSuggestion('sdg_goals') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <details className="group">
                  <summary className="cursor-pointer px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 hover:bg-white flex justify-between items-center transition-colors">
                    <span className="text-gray-600">
                      {formData.sdgGoals.length > 0 
                        ? `${formData.sdgGoals.length} SDG${formData.sdgGoals.length !== 1 ? 's' : ''} selected`
                        : 'Click to select relevant SDGs'}
                    </span>
                    <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-2 p-4 border border-gray-200 rounded-xl bg-white shadow-lg max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        { value: 'sdg1', label: 'SDG 1: No Poverty' },
                        { value: 'sdg2', label: 'SDG 2: Zero Hunger' },
                        { value: 'sdg3', label: 'SDG 3: Good Health and Well-being' },
                        { value: 'sdg4', label: 'SDG 4: Quality Education' },
                        { value: 'sdg5', label: 'SDG 5: Gender Equality' },
                        { value: 'sdg6', label: 'SDG 6: Clean Water and Sanitation' },
                        { value: 'sdg7', label: 'SDG 7: Affordable and Clean Energy' },
                        { value: 'sdg8', label: 'SDG 8: Decent Work and Economic Growth' },
                        { value: 'sdg9', label: 'SDG 9: Industry, Innovation and Infrastructure' },
                        { value: 'sdg10', label: 'SDG 10: Reduced Inequalities' },
                        { value: 'sdg11', label: 'SDG 11: Sustainable Cities and Communities' },
                        { value: 'sdg12', label: 'SDG 12: Responsible Consumption and Production' },
                        { value: 'sdg13', label: 'SDG 13: Climate Action' },
                        { value: 'sdg14', label: 'SDG 14: Life Below Water' },
                        { value: 'sdg15', label: 'SDG 15: Life on Land' },
                        { value: 'sdg16', label: 'SDG 16: Peace, Justice and Strong Institutions' },
                        { value: 'sdg17', label: 'SDG 17: Partnerships for the Goals' },
                      ].map((sdg) => (
                        <label key={sdg.value} className="flex items-center space-x-2 px-3 py-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.sdgGoals.includes(sdg.value)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                sdgGoals: isChecked
                                  ? [...prev.sdgGoals, sdg.value]
                                  : prev.sdgGoals.filter(g => g !== sdg.value)
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm">{sdg.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
                {formData.sdgGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.sdgGoals.map(sdgValue => {
                      const sdg = [
                        { value: 'sdg1', label: 'SDG 1: No Poverty' },
                        { value: 'sdg2', label: 'SDG 2: Zero Hunger' },
                        { value: 'sdg3', label: 'SDG 3: Good Health and Well-being' },
                        { value: 'sdg4', label: 'SDG 4: Quality Education' },
                        { value: 'sdg5', label: 'SDG 5: Gender Equality' },
                        { value: 'sdg6', label: 'SDG 6: Clean Water and Sanitation' },
                        { value: 'sdg7', label: 'SDG 7: Affordable and Clean Energy' },
                        { value: 'sdg8', label: 'SDG 8: Decent Work and Economic Growth' },
                        { value: 'sdg9', label: 'SDG 9: Industry, Innovation and Infrastructure' },
                        { value: 'sdg10', label: 'SDG 10: Reduced Inequalities' },
                        { value: 'sdg11', label: 'SDG 11: Sustainable Cities and Communities' },
                        { value: 'sdg12', label: 'SDG 12: Responsible Consumption and Production' },
                        { value: 'sdg13', label: 'SDG 13: Climate Action' },
                        { value: 'sdg14', label: 'SDG 14: Life Below Water' },
                        { value: 'sdg15', label: 'SDG 15: Life on Land' },
                        { value: 'sdg16', label: 'SDG 16: Peace, Justice and Strong Institutions' },
                        { value: 'sdg17', label: 'SDG 17: Partnerships for the Goals' },
                      ].find(s => s.value === sdgValue);
                      return sdg ? (
                        <span key={sdgValue} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {sdg.label.replace('SDG ', '')}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              sdgGoals: prev.sdgGoals.filter(g => g !== sdgValue)
                            }))}
                            className="hover:text-blue-900 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                {renderSuggestionCard('sdg_goals')}
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

        {/* Book and Book Chapter Details */}
        {(contribution.publicationType === 'book' || contribution.publicationType === 'book_chapter') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {contribution.publicationType === 'book' ? 'Book Details' : 'Book Chapter Details'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Book Title (for book_chapter only) */}
              {contribution.publicationType === 'book_chapter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book Title</label>
                  <input
                    type="text"
                    name="bookTitle"
                    value={formData.bookTitle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {renderSuggestionCard('bookTitle')}
                </div>
              )}

              {/* Publisher Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Publisher Name *</label>
                <input
                  type="text"
                  name="publisherName"
                  value={formData.publisherName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {renderSuggestionCard('publisherName')}
              </div>

              {/* ISBN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ISBN *</label>
                <input
                  type="text"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {renderSuggestionCard('isbn')}
              </div>

              {/* Publication Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Publication Date *</label>
                <input
                  type="date"
                  name="publicationDate"
                  value={formData.publicationDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {renderSuggestionCard('publicationDate')}
              </div>

              {/* National/International */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">National/International *</label>
                <select
                  name="nationalInternational"
                  value={formData.nationalInternational}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="national">National</option>
                  <option value="international">International</option>
                </select>
                {renderSuggestionCard('nationalInternational')}
              </div>

              {/* Book Publication Type (for book only) */}
              {contribution.publicationType === 'book' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book Publication Type *</label>
                  <select
                    name="bookPublicationType"
                    value={formData.bookPublicationType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select</option>
                    <option value="authored">Authored</option>
                    <option value="edited">Edited</option>
                  </select>
                  {renderSuggestionCard('bookPublicationType')}
                </div>
              )}

              {/* Book Indexing Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Publication Type *</label>
                <select
                  name="bookIndexingType"
                  value={formData.bookIndexingType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="scopus_indexed">Scopus Indexed</option>
                  <option value="non_indexed">Non-Indexed</option>
                  <option value="sgt_publication_house">SGT Publication House</option>
                </select>
                {renderSuggestionCard('bookIndexingType')}
              </div>

              {/* Chapter Number (for book_chapter only) */}
              {contribution.publicationType === 'book_chapter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chapter Number</label>
                  <input
                    type="text"
                    name="chapterNumber"
                    value={formData.chapterNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {renderSuggestionCard('chapterNumber')}
                </div>
              )}

              {/* Page Numbers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Numbers</label>
                <input
                  type="text"
                  name="pageNumbers"
                  value={formData.pageNumbers}
                  onChange={handleInputChange}
                  placeholder="e.g., 123-145"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {renderSuggestionCard('pageNumbers')}
              </div>

              {/* Editors (for book_chapter only) */}
              {contribution.publicationType === 'book_chapter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Editors</label>
                  <input
                    type="text"
                    name="editors"
                    value={formData.editors}
                    onChange={handleInputChange}
                    placeholder="Editor names"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {renderSuggestionCard('editors')}
                </div>
              )}

              {/* Interdisciplinary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interdisciplinary (SGT) *</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isInterdisciplinary"
                      value="yes"
                      checked={formData.isInterdisciplinary === 'yes'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="isInterdisciplinary"
                      value="no"
                      checked={formData.isInterdisciplinary === 'no'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                {renderSuggestionCard('interdisciplinaryFromSgt')}
              </div>

              {/* Communicated with Official ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Communicated with Official ID *</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="communicatedWithOfficialId"
                      value="yes"
                      checked={formData.communicatedWithOfficialId === 'yes'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="communicatedWithOfficialId"
                      value="no"
                      checked={formData.communicatedWithOfficialId === 'no'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                {renderSuggestionCard('communicatedWithOfficialId')}
              </div>

              {/* Personal Email (conditional) */}
              {formData.communicatedWithOfficialId === 'no' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Personal Email *</label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {renderSuggestionCard('personalEmail')}
                </div>
              )}

              {/* Faculty Remarks */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Remarks</label>
                <textarea
                  name="facultyRemarks"
                  value={formData.facultyRemarks}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional remarks..."
                />
                {renderSuggestionCard('facultyRemarks')}
              </div>

              {/* SDG Goals */}
              <div className={`md:col-span-2 ${hasSuggestion('sdg_goals') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UN Sustainable Development Goals (SDGs)
                  {hasSuggestion('sdg_goals') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <details className="group">
                  <summary className="cursor-pointer list-none px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {formData.sdgGoals.length > 0 
                          ? `${formData.sdgGoals.length} goal${formData.sdgGoals.length > 1 ? 's' : ''} selected`
                          : 'Select SDG Goals'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {[
                        { value: 'sdg1', label: 'SDG 1: No Poverty' },
                        { value: 'sdg2', label: 'SDG 2: Zero Hunger' },
                        { value: 'sdg3', label: 'SDG 3: Good Health and Well-being' },
                        { value: 'sdg4', label: 'SDG 4: Quality Education' },
                        { value: 'sdg5', label: 'SDG 5: Gender Equality' },
                        { value: 'sdg6', label: 'SDG 6: Clean Water and Sanitation' },
                        { value: 'sdg7', label: 'SDG 7: Affordable and Clean Energy' },
                        { value: 'sdg8', label: 'SDG 8: Decent Work and Economic Growth' },
                        { value: 'sdg9', label: 'SDG 9: Industry, Innovation and Infrastructure' },
                        { value: 'sdg10', label: 'SDG 10: Reduced Inequalities' },
                        { value: 'sdg11', label: 'SDG 11: Sustainable Cities and Communities' },
                        { value: 'sdg12', label: 'SDG 12: Responsible Consumption and Production' },
                        { value: 'sdg13', label: 'SDG 13: Climate Action' },
                        { value: 'sdg14', label: 'SDG 14: Life Below Water' },
                        { value: 'sdg15', label: 'SDG 15: Life on Land' },
                        { value: 'sdg16', label: 'SDG 16: Peace, Justice and Strong Institutions' },
                        { value: 'sdg17', label: 'SDG 17: Partnerships for the Goals' },
                      ].map((sdg) => (
                        <label key={sdg.value} className="flex items-center space-x-2 px-3 py-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.sdgGoals.includes(sdg.value)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                sdgGoals: isChecked
                                  ? [...prev.sdgGoals, sdg.value]
                                  : prev.sdgGoals.filter(g => g !== sdg.value)
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm">{sdg.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
                {formData.sdgGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.sdgGoals.map(sdgValue => {
                      const sdg = [
                        { value: 'sdg1', label: 'SDG 1: No Poverty' },
                        { value: 'sdg2', label: 'SDG 2: Zero Hunger' },
                        { value: 'sdg3', label: 'SDG 3: Good Health and Well-being' },
                        { value: 'sdg4', label: 'SDG 4: Quality Education' },
                        { value: 'sdg5', label: 'SDG 5: Gender Equality' },
                        { value: 'sdg6', label: 'SDG 6: Clean Water and Sanitation' },
                        { value: 'sdg7', label: 'SDG 7: Affordable and Clean Energy' },
                        { value: 'sdg8', label: 'SDG 8: Decent Work and Economic Growth' },
                        { value: 'sdg9', label: 'SDG 9: Industry, Innovation and Infrastructure' },
                        { value: 'sdg10', label: 'SDG 10: Reduced Inequalities' },
                        { value: 'sdg11', label: 'SDG 11: Sustainable Cities and Communities' },
                        { value: 'sdg12', label: 'SDG 12: Responsible Consumption and Production' },
                        { value: 'sdg13', label: 'SDG 13: Climate Action' },
                        { value: 'sdg14', label: 'SDG 14: Life Below Water' },
                        { value: 'sdg15', label: 'SDG 15: Life on Land' },
                        { value: 'sdg16', label: 'SDG 16: Peace, Justice and Strong Institutions' },
                        { value: 'sdg17', label: 'SDG 17: Partnerships for the Goals' },
                      ].find(s => s.value === sdgValue);
                      return sdg ? (
                        <span key={sdgValue} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {sdg.label.replace('SDG ', '')}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              sdgGoals: prev.sdgGoals.filter(g => g !== sdgValue)
                            }))}
                            className="hover:text-blue-900 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                {renderSuggestionCard('sdg_goals')}
              </div>
            </div>
          </div>
        )}

        {/* Conference Paper Details */}
        {contribution.publicationType === 'conference_paper' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conference Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Conference Sub Type */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Conference Type *</label>
                <select
                  name="conferenceSubType"
                  value={formData.conferenceSubType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled
                  required
                >
                  <option value="">-- Please Select --</option>
                  <option value="paper_not_indexed">Papers in Conferences (not Indexed) / Seminars / Workshops</option>
                  <option value="paper_indexed_scopus">Paper in conference proceeding indexed in Scopus</option>
                  <option value="keynote_speaker_invited_talks">Keynote Speaker / Session chair / Invited Talks (Outside SGT)</option>
                  <option value="organizer_coordinator_member">Organizer / Coordinator / Member of conference held at SGT</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Conference type cannot be changed after submission</p>
                {renderSuggestionCard('conferenceSubType')}
              </div>

              {/* Common fields for all conference types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conference Name *</label>
                <input
                  type="text"
                  name="conferenceName"
                  value={formData.conferenceName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter conference name"
                  required
                />
                {renderSuggestionCard('conferenceName')}
              </div>

              {/* Fields for indexed/non-indexed papers only */}
              {['paper_indexed_scopus', 'paper_not_indexed'].includes(formData.conferenceSubType) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">National/International *</label>
                    <select
                      name="conferenceType"
                      value={formData.conferenceType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select</option>
                      <option value="national">National</option>
                      <option value="international">International</option>
                    </select>
                    {renderSuggestionCard('conferenceType')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proceedings Title</label>
                    <input
                      type="text"
                      name="proceedingsTitle"
                      value={formData.proceedingsTitle}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter proceedings title"
                    />
                    {renderSuggestionCard('proceedingsTitle')}
                  </div>

                  {formData.conferenceSubType === 'paper_indexed_scopus' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Proceedings Quartile *</label>
                      <select
                        name="proceedingsQuartile"
                        value={formData.proceedingsQuartile}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="na">NA</option>
                        <option value="q1">Q1</option>
                        <option value="q2">Q2</option>
                        <option value="q3">Q3</option>
                        <option value="q4">Q4</option>
                      </select>
                      {renderSuggestionCard('proceedingsQuartile')}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Presenters</label>
                    <input
                      type="number"
                      name="totalPresenters"
                      value={formData.totalPresenters}
                      onChange={handleInputChange}
                      min="1"
                      max="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {renderSuggestionCard('totalPresenters')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Are you a Presenter?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isPresenter"
                          value="yes"
                          checked={formData.isPresenter === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isPresenter"
                          value="no"
                          checked={formData.isPresenter === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('isPresenter')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Paper</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fullPaper"
                          value="yes"
                          checked={formData.fullPaper === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fullPaper"
                          value="no"
                          checked={formData.fullPaper === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('fullPaper')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Virtual Conference?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="virtualConference"
                          value="yes"
                          checked={formData.virtualConference === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="virtualConference"
                          value="no"
                          checked={formData.virtualConference === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('virtualConference')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conference held at SGT?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="conferenceHeldAtSgt"
                          value="yes"
                          checked={formData.conferenceHeldAtSgt === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="conferenceHeldAtSgt"
                          value="no"
                          checked={formData.conferenceHeldAtSgt === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('conferenceHeldAtSgt')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Best Paper Award?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="conferenceBestPaperAward"
                          value="yes"
                          checked={formData.conferenceBestPaperAward === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="conferenceBestPaperAward"
                          value="no"
                          checked={formData.conferenceBestPaperAward === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('conferenceBestPaperAward')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interdisciplinary (from SGT)?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="interdisciplinaryFromSgt"
                          value="yes"
                          checked={formData.interdisciplinaryFromSgt === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="interdisciplinaryFromSgt"
                          value="no"
                          checked={formData.interdisciplinaryFromSgt === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('interdisciplinaryFromSgt')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student(s) (from SGT)?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="studentsFromSgt"
                          value="yes"
                          checked={formData.studentsFromSgt === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="studentsFromSgt"
                          value="no"
                          checked={formData.studentsFromSgt === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('studentsFromSgt')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Industry Collaboration?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="industryCollaboration"
                          value="yes"
                          checked={formData.industryCollaboration === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="industryCollaboration"
                          value="no"
                          checked={formData.industryCollaboration === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('industryCollaboration')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Central Facility Used?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="centralFacilityUsed"
                          value="yes"
                          checked={formData.centralFacilityUsed === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="centralFacilityUsed"
                          value="no"
                          checked={formData.centralFacilityUsed === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('centralFacilityUsed')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Communicated with Official ID? *</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="communicatedWithOfficialId"
                          value="yes"
                          checked={formData.communicatedWithOfficialId === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="communicatedWithOfficialId"
                          value="no"
                          checked={formData.communicatedWithOfficialId === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('communicatedWithOfficialId')}
                  </div>

                  {formData.communicatedWithOfficialId === 'no' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Personal Email *</label>
                      <input
                        type="email"
                        name="personalEmail"
                        value={formData.personalEmail}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      {renderSuggestionCard('personalEmail')}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conference Date</label>
                    <input
                      type="date"
                      name="conferenceDate"
                      value={formData.conferenceDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {renderSuggestionCard('conferenceDate')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publication Date *</label>
                    <input
                      type="date"
                      name="publicationDate"
                      value={formData.publicationDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    {renderSuggestionCard('publicationDate')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Volume No</label>
                    <input
                      type="text"
                      name="volume"
                      value={formData.volume}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Vol 5"
                    />
                    {renderSuggestionCard('volume')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ISSN/ISBN/Issue No</label>
                    <input
                      type="text"
                      name="issnIsbnIssueNo"
                      value={formData.issnIsbnIssueNo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter ISSN/ISBN/Issue No"
                    />
                    {renderSuggestionCard('issnIsbnIssueNo')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Numbers</label>
                    <input
                      type="text"
                      name="pageNumbers"
                      value={formData.pageNumbers}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. 100-125"
                    />
                    {renderSuggestionCard('pageNumbers')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DOI of Paper</label>
                    <input
                      type="text"
                      name="paperDoi"
                      value={formData.paperDoi}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter DOI"
                    />
                    {renderSuggestionCard('paperDoi')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weblink</label>
                    <input
                      type="url"
                      name="weblink"
                      value={formData.weblink}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://..."
                    />
                    {renderSuggestionCard('weblink')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority Funding Area</label>
                    <input
                      type="text"
                      name="priorityFundingArea"
                      value={formData.priorityFundingArea}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter priority funding area"
                    />
                    {renderSuggestionCard('priorityFundingArea')}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Remarks</label>
                    <textarea
                      name="facultyRemarks"
                      value={formData.facultyRemarks}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Please mention the date and venue of conference..."
                    />
                    {renderSuggestionCard('facultyRemarks')}
                  </div>
                </>
              )}

              {/* Fields for keynote speakers and organizers only */}
              {['keynote_speaker_invited_talks', 'organizer_coordinator_member'].includes(formData.conferenceSubType) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conference Role</label>
                    <input
                      type="text"
                      name="conferenceRole"
                      value={formData.conferenceRole}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Keynote Speaker, Session Chair"
                    />
                    {renderSuggestionCard('conferenceRole')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue *</label>
                    <input
                      type="text"
                      name="venue"
                      value={formData.venue}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter venue"
                      required
                    />
                    {renderSuggestionCard('venue')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topic *</label>
                    <input
                      type="text"
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter topic"
                      required
                    />
                    {renderSuggestionCard('topic')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conference Date *</label>
                    <input
                      type="date"
                      name="conferenceDate"
                      value={formData.conferenceDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    {renderSuggestionCard('conferenceDate')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attended Virtual Conference?</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="attendedVirtual"
                          value="yes"
                          checked={formData.attendedVirtual === 'yes'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Yes
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="attendedVirtual"
                          value="no"
                          checked={formData.attendedVirtual === 'no'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        No
                      </label>
                    </div>
                    {renderSuggestionCard('attendedVirtual')}
                  </div>

                  {formData.conferenceSubType === 'organizer_coordinator_member' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Category</label>
                      <select
                        name="eventCategory"
                        value={formData.eventCategory}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select</option>
                        <option value="conference">Conference</option>
                        <option value="seminar_symposia">Seminar/Symposia</option>
                      </select>
                      {renderSuggestionCard('eventCategory')}
                    </div>
                  )}
                </>
              )}

              {/* SDG Goals - Common for all conference types */}
              <div className={`md:col-span-2 ${hasSuggestion('sdg_goals') ? 'ring-2 ring-orange-300 rounded-lg p-3 bg-orange-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UN Sustainable Development Goals (SDGs)
                  {hasSuggestion('sdg_goals') && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"><Sparkles className="w-3 h-3 mr-1" />Suggestion</span>}
                </label>
                <details className="group">
                  <summary className="cursor-pointer list-none px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {formData.sdgGoals.length > 0 
                          ? `${formData.sdgGoals.length} goal${formData.sdgGoals.length > 1 ? 's' : ''} selected`
                          : 'Select SDG Goals'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {[
                        { value: 'sdg1', label: 'SDG 1: No Poverty' },
                        { value: 'sdg2', label: 'SDG 2: Zero Hunger' },
                        { value: 'sdg3', label: 'SDG 3: Good Health and Well-being' },
                        { value: 'sdg4', label: 'SDG 4: Quality Education' },
                        { value: 'sdg5', label: 'SDG 5: Gender Equality' },
                        { value: 'sdg6', label: 'SDG 6: Clean Water and Sanitation' },
                        { value: 'sdg7', label: 'SDG 7: Affordable and Clean Energy' },
                        { value: 'sdg8', label: 'SDG 8: Decent Work and Economic Growth' },
                        { value: 'sdg9', label: 'SDG 9: Industry, Innovation and Infrastructure' },
                        { value: 'sdg10', label: 'SDG 10: Reduced Inequalities' },
                        { value: 'sdg11', label: 'SDG 11: Sustainable Cities and Communities' },
                        { value: 'sdg12', label: 'SDG 12: Responsible Consumption and Production' },
                        { value: 'sdg13', label: 'SDG 13: Climate Action' },
                        { value: 'sdg14', label: 'SDG 14: Life Below Water' },
                        { value: 'sdg15', label: 'SDG 15: Life on Land' },
                        { value: 'sdg16', label: 'SDG 16: Peace, Justice and Strong Institutions' },
                        { value: 'sdg17', label: 'SDG 17: Partnerships for the Goals' },
                      ].map((sdg) => (
                        <label key={sdg.value} className="flex items-center space-x-2 px-3 py-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.sdgGoals.includes(sdg.value)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                sdgGoals: isChecked
                                  ? [...prev.sdgGoals, sdg.value]
                                  : prev.sdgGoals.filter(g => g !== sdg.value)
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm">{sdg.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
                {formData.sdgGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.sdgGoals.map(sdgValue => {
                      const sdg = [
                        { value: 'sdg1', label: 'SDG 1: No Poverty' },
                        { value: 'sdg2', label: 'SDG 2: Zero Hunger' },
                        { value: 'sdg3', label: 'SDG 3: Good Health and Well-being' },
                        { value: 'sdg4', label: 'SDG 4: Quality Education' },
                        { value: 'sdg5', label: 'SDG 5: Gender Equality' },
                        { value: 'sdg6', label: 'SDG 6: Clean Water and Sanitation' },
                        { value: 'sdg7', label: 'SDG 7: Affordable and Clean Energy' },
                        { value: 'sdg8', label: 'SDG 8: Decent Work and Economic Growth' },
                        { value: 'sdg9', label: 'SDG 9: Industry, Innovation and Infrastructure' },
                        { value: 'sdg10', label: 'SDG 10: Reduced Inequalities' },
                        { value: 'sdg11', label: 'SDG 11: Sustainable Cities and Communities' },
                        { value: 'sdg12', label: 'SDG 12: Responsible Consumption and Production' },
                        { value: 'sdg13', label: 'SDG 13: Climate Action' },
                        { value: 'sdg14', label: 'SDG 14: Life Below Water' },
                        { value: 'sdg15', label: 'SDG 15: Life on Land' },
                        { value: 'sdg16', label: 'SDG 16: Peace, Justice and Strong Institutions' },
                        { value: 'sdg17', label: 'SDG 17: Partnerships for the Goals' },
                      ].find(s => s.value === sdgValue);
                      return sdg ? (
                        <span key={sdgValue} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {sdg.label.replace('SDG ', '')}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              sdgGoals: prev.sdgGoals.filter(g => g !== sdgValue)
                            }))}
                            className="hover:text-blue-900 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                {renderSuggestionCard('sdg_goals')}
              </div>

            </div>
          </div>
        )}

        {/* Grant message */}
        {contribution.publicationType === 'grant' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Grant Details</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Note:</p>
                  <p className="mt-1">Grant contributions can only be edited through the review suggestions system. If you need to make changes, please contact the reviewer or admin.</p>
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
