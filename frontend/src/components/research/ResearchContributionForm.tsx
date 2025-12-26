'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  Search, 
  User, 
  Building,
  Award,
  Coins,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  FileText
} from 'lucide-react';
import { researchService, ResearchPublicationType, ResearchContributionAuthor } from '@/services/research.service';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface Props {
  publicationType: ResearchPublicationType;
  contributionId?: string;
  onSuccess?: () => void;
}

const INDEXING_OPTIONS = [
  { value: 'scopus', label: 'Scopus' },
  { value: 'wos', label: 'Web of Science (WoS)' },
  { value: 'ugc', label: 'UGC Care List' },
  { value: 'pubmed', label: 'PubMed' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'other', label: 'Other' },
];

const AUTHOR_TYPES = [
  { value: 'internal_faculty', label: 'Internal - Faculty' },
  { value: 'internal_student', label: 'Internal - Student' },
  { value: 'external_academic', label: 'External - Academic' },
  { value: 'external_industry', label: 'External - Industry' },
  { value: 'external_other', label: 'External - Other' },
];

const AUTHOR_ROLES = [
  { value: 'first_author', label: 'First Author' },
  { value: 'corresponding_author', label: 'Corresponding Author' },
  { value: 'co_author', label: 'Co-Author' },
  { value: 'senior_author', label: 'Senior Author' },
];

const TARGETED_RESEARCH_TYPES = [
  { value: 'research_based_journal', label: 'Research-based Journal' },
  { value: 'community_based_journal', label: 'Community-based Journal' },
  { value: 'na', label: 'N/A' },
];

const CONFERENCE_TYPES = [
  { value: 'international', label: 'International' },
  { value: 'national', label: 'National' },
  { value: 'regional', label: 'Regional' },
];

const GRANT_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'sanctioned', label: 'Sanctioned' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

const SDG_GOALS = [
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
];

interface Author {
  id?: string;
  authorType: string;
  authorCategory?: string;
  authorRole: string;
  name: string;
  email?: string;
  affiliation?: string;
  registrationNumber?: string;
  isCorresponding: boolean;
  orderNumber: number;
  linkedForPhd?: boolean;
  usePublicationAddress?: boolean;
  usePermanentAddress?: boolean;
  userId?: string;
}

export default function ResearchContributionForm({ publicationType, contributionId, onSuccess }: Props) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'entry' | 'process'>('entry');
  const [myContributions, setMyContributions] = useState<any[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  
  // Schools and departments for selection
  const [schools, setSchools] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Mentor selection (for students)
  const [mentorSuggestions, setMentorSuggestions] = useState<any[]>([]);
  const [showMentorSuggestions, setShowMentorSuggestions] = useState(false);
  const mentorSuggestionsRef = useRef<HTMLDivElement>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    publicationType,
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
    sdgGoals: [] as string[],
    
    // Publication Details
    volume: '',
    issue: '',
    pageNumbers: '',
    doi: '',
    issn: '',
    publisherName: '',
    publisherLocation: '',
    publicationDate: '',
    publicationStatus: 'published' as 'published' | 'in_press' | 'accepted' | 'under_review',
    
    // School/Department (auto-filled)
    schoolId: '',
    departmentId: '',
    
    // Mentor (optional for students)
    mentorUid: '',
    mentorName: '',
  });
  
  // Author counts and configuration
  const [totalAuthors, setTotalAuthors] = useState<number>(1);
  const [totalInternalAuthors, setTotalInternalAuthors] = useState<number>(1);
  const [totalInternalCoAuthors, setTotalInternalCoAuthors] = useState<number>(0);
  const [userAuthorType, setUserAuthorType] = useState<string>('first_and_corresponding');
  
  // Co-authors list (excluding current user)
  const [coAuthors, setCoAuthors] = useState<Array<{
    uid: string;
    name: string;
    authorType: string;
    authorCategory: string;
    email?: string;
    affiliation?: string;
    authorRole?: string;
  }>>([]);
  
  // Document upload state
  const [researchDocument, setResearchDocument] = useState<File | null>(null);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  
  // Current author being edited (index)
  const [editingAuthorIndex, setEditingAuthorIndex] = useState<number | null>(null);
  
  // New author form state
  const [newAuthor, setNewAuthor] = useState({
    uid: '',
    name: '',
    authorType: 'Faculty',
    authorCategory: 'Internal',
    email: '',
    affiliation: 'SGT University',
    authorRole: 'co_author',
  });
  
  // Update newAuthor category when totalInternalAuthors/totalInternalCoAuthors changes
  useEffect(() => {
    // If only external authors can be added (totalInternalAuthors=1 and totalInternalCoAuthors=0)
    // Default to External category
    if (totalInternalAuthors === 1 && totalInternalCoAuthors === 0) {
      const availableRoles = getAvailableOtherAuthorRoles();
      setNewAuthor(prev => ({
        ...prev,
        authorCategory: 'External',
        authorType: 'Academic',
        affiliation: '',
        uid: '',
        authorRole: availableRoles.length > 0 ? availableRoles[0].value : 'co_author'
      }));
    }
    // If only internal authors can be added (totalInternalAuthors=1 and totalInternalCoAuthors=1)
    // Default to Internal category
    else if (totalInternalAuthors === 1 && totalInternalCoAuthors === 1) {
      const availableRoles = getAvailableOtherAuthorRoles();
      setNewAuthor(prev => ({
        ...prev,
        authorCategory: 'Internal',
        authorType: 'Faculty',
        affiliation: 'SGT University',
        uid: '',
        authorRole: availableRoles.length > 0 ? availableRoles[0].value : 'first_and_corresponding'
      }));
    }
  }, [totalInternalAuthors, totalInternalCoAuthors]);
  
  // Fetch my contributions for the "Already in Process" tab
  useEffect(() => {
    if (activeTab === 'process' && user) {
      fetchMyContributions();
    }
  }, [activeTab, user]);
  
  const fetchMyContributions = async () => {
    try {
      setLoadingContributions(true);
      const response = await researchService.getMyContributions();
      setMyContributions(response.data?.contributions || []);
    } catch (error) {
      console.error('Error fetching contributions:', error);
    } finally {
      setLoadingContributions(false);
    }
  };
  
  // Handle mentor UID change and fetch suggestions
  const handleMentorUidChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const mentorUid = e.target.value;
    setFormData(prev => ({ ...prev, mentorUid, mentorName: '' }));
    
    // Fetch mentor suggestions if UID is at least 3 characters
    if (mentorUid.length >= 3) {
      try {
        const response = await fetch(`/api/v1/users/suggestions/${mentorUid}?role=faculty`, {
          headers: {
            'Content-Type': 'application/json'
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setMentorSuggestions(result.data);
            setShowMentorSuggestions(true);
          }
        }
      } catch (error) {
        console.error('Error fetching mentor suggestions:', error);
      }
    } else {
      setMentorSuggestions([]);
      setShowMentorSuggestions(false);
    }
  };
  
  // Select a mentor from suggestions
  const selectMentorSuggestion = async (suggestion: any) => {
    setShowMentorSuggestions(false);
    setFormData(prev => ({
      ...prev,
      mentorUid: suggestion.uid,
      mentorName: suggestion.name,
    }));
  };
  
  // Helper function to get allowed user roles based on counts
  // ROLE DETERMINATION LOGIC:
  // Rule 1: Solo author (Total=1, Internal=1, Co-Authors=0) -> Must be First & Corresponding
  // Rule 2: All internal are co-authors (Internal = Co-Authors) -> User MUST be Co-Author
  // Rule 3: Two internal, no co-authors -> Can be First OR Corresponding (not both, no co-author option)
  // Rule 4: Flexible scenarios -> User can choose their role
  const getAllowedUserRoles = () => {
    // Rule 1: Solo author - must be first and corresponding
    if (totalAuthors === 1 && totalInternalAuthors === 1 && totalInternalCoAuthors === 0) {
      return ['first_and_corresponding'];
    }
    
    // Rule 2: All internal authors are co-authors (Internal = Co-Authors)
    // User MUST be co-author, external author(s) will have First/Corresponding
    if (totalInternalAuthors === totalInternalCoAuthors && totalInternalCoAuthors > 0) {
      return ['co_author'];
    }
    
    // Rule 3: Two internal authors, zero co-authors - can be first OR corresponding (not both, not co-author)
    // This means both are primary authors, not co-authors
    if (totalInternalAuthors === 2 && totalInternalCoAuthors === 0) {
      return ['first', 'corresponding'];
    }
    
    // Rule 4: Flexible scenarios - user can choose their role
    // All other cases: all roles available
    return ['first_and_corresponding', 'corresponding', 'first', 'co_author'];
  };
  
  // Helper function to get roles already taken
  const getUsedRoles = () => {
    const used: string[] = [];
    
    // Add user's role
    if (userAuthorType === 'first_and_corresponding') {
      used.push('first_author', 'corresponding_author');
    } else if (userAuthorType === 'corresponding') {
      used.push('corresponding_author');
    } else if (userAuthorType === 'first') {
      used.push('first_author');
    }
    
    // Add co-authors' roles (excluding the one being edited)
    coAuthors.forEach((author, idx) => {
      if (author.name && idx !== editingAuthorIndex) {
        if (author.authorRole === 'first_author') {
          used.push('first_author');
        } else if (author.authorRole === 'corresponding_author') {
          used.push('corresponding_author');
        }
      }
    });
    
    return used;
  };
  
  // Helper function to get available roles for other authors
  const getAvailableOtherAuthorRoles = () => {
    const usedRoles = getUsedRoles();
    
    // Special case: When all internal authors are co-authors (Internal = Co-Authors)
    // ALL internal authors (including others being added) MUST be co-authors
    if (totalInternalAuthors === totalInternalCoAuthors && totalInternalCoAuthors > 0 && newAuthor.authorCategory === 'Internal') {
      return [
        { value: 'co_author', label: 'Co-Author' },
      ];
    }
    
    // Special case: User selected Co-Author and there's only 1 internal co-author slot (Total Internal Co-Authors = 1)
    // This means the user IS that co-author, so other internal authors CANNOT be co-authors
    if (totalInternalCoAuthors === 1 && userAuthorType === 'co_author' && newAuthor.authorCategory === 'Internal') {
      const roles = [
        { value: 'first_and_corresponding', label: 'First and Corresponding Author' },
        { value: 'first_author', label: 'First Author' },
        { value: 'corresponding_author', label: 'Corresponding Author' },
      ];
      // Filter out already used roles
      return roles.filter(role => {
        if (role.value === 'first_and_corresponding') {
          // Can use if neither first nor corresponding is taken
          return !usedRoles.includes('first_author') && !usedRoles.includes('corresponding_author');
        }
        return !usedRoles.includes(role.value);
      });
    }
    
    // Special case: User selected First/Corresponding Author and there's only 1 internal co-author slot
    // The other internal author MUST be the co-author
    if (totalInternalCoAuthors === 1 && userAuthorType !== 'co_author' && newAuthor.authorCategory === 'Internal') {
      return [
        { value: 'co_author', label: 'Co-Author' },
      ];
    }
    
    // Special case: User is co-author with only 2 total authors
    // The other author MUST be First & Corresponding Author
    if (totalAuthors === 2 && userAuthorType === 'co_author') {
      return [
        { value: 'first_and_corresponding', label: 'First and Corresponding Author' },
      ];
    }
    
    const allRoles = [
      { value: 'first_and_corresponding', label: 'First and Corresponding Author' },
      { value: 'first_author', label: 'First Author' },
      { value: 'corresponding_author', label: 'Corresponding Author' },
      { value: 'co_author', label: 'Co-Author' },
    ];
    
    // Filter out roles that are already used
    return allRoles.filter(role => {
      // Co-author can be used multiple times
      if (role.value === 'co_author') {
        return true;
      }
      // First and Corresponding Author - can use if neither role is taken
      if (role.value === 'first_and_corresponding') {
        return !usedRoles.includes('first_author') && !usedRoles.includes('corresponding_author');
      }
      // First author and corresponding author can only be used once
      return !usedRoles.includes(role.value);
    });
  };
  
  // Search suggestions
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Incentive calculation preview
  const [incentivePreview, setIncentivePreview] = useState({
    baseIncentive: 0,
    basePoints: 0,
    multiplier: 1,
    totalIncentive: 0,
    totalPoints: 0,
  });
  
  // Current contribution ID (after first save)
  const [currentId, setCurrentId] = useState<string | null>(contributionId || null);
  
  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
    if (contributionId) {
      fetchContribution();
    } else {
      // Auto-populate school and department from logged-in user
      if (user?.employeeDetails?.department?.school?.id) {
        setFormData(prev => ({
          ...prev,
          schoolId: user.employeeDetails!.department!.school!.id,
          departmentId: user.employeeDetails!.department?.id || '',
        }));
      }
    }
    // Don't auto-add current user - let them add authors manually
  }, [contributionId, user]);

  useEffect(() => {
    if (formData.schoolId) {
      fetchDepartments(formData.schoolId);
    }
  }, [formData.schoolId]);
  
  // Auto-save every 15 seconds when form has changes
  useEffect(() => {
    let autoSaveInterval: NodeJS.Timeout;
    
    if (autoSaveEnabled && isFormDirty && formData.title) {
      autoSaveInterval = setInterval(async () => {
        console.log('[Auto-save] Starting auto-save. Current ID:', currentId);
        try {
          setAutoSaving(true);
          const data = buildSubmitData();
          
          if (currentId) {
            console.log('[Auto-save] Updating existing contribution:', currentId);
            await researchService.updateContribution(currentId, data);
            setIsFormDirty(false);
            setLastAutoSave(new Date());
          } else {
            console.log('[Auto-save] Creating new contribution');
            const response = await researchService.createContribution(data);
            if (response.data?.id) {
              console.log('[Auto-save] New contribution created with ID:', response.data.id);
              setCurrentId(response.data.id);
              setIsFormDirty(false);
              setLastAutoSave(new Date());
            } else {
              console.error('[Auto-save] No ID returned from create');
            }
          }
        } catch (error) {
          console.error('[Auto-save] Auto-save failed:', error);
        } finally {
          setAutoSaving(false);
        }
      }, 15000); // 15 seconds
    }
    
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [autoSaveEnabled, isFormDirty, formData.title, currentId]);
  
  // Mark form as dirty when any field changes
  useEffect(() => {
    if (formData.title) {
      setAutoSaveEnabled(true);
      setIsFormDirty(true);
    }
  }, [formData, totalAuthors, totalInternalAuthors, totalInternalCoAuthors, userAuthorType, coAuthors]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data.data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchDepartments = async (schoolId: string) => {
    try {
      const response = await api.get(`/departments?schoolId=${schoolId}`);
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchContribution = async () => {
    if (!contributionId) return;
    try {
      setLoading(true);
      const response = await researchService.getContributionById(contributionId);
      if (response.data) {
        const contrib = response.data;
        
        // Map backend fields to frontend form fields
        setFormData({
          ...formData,
          title: contrib.title || '',
          targetedResearchType: contrib.targetedResearchType || 'scopus',
          hasInternationalAuthor: contrib.internationalAuthor ? 'yes' : 'no',
          numForeignUniversities: contrib.foreignCollaborationsCount?.toString() || '',
          impactFactor: contrib.impactFactor?.toString() || '',
          sjr: contrib.sjr?.toString() || '',
          quartile: contrib.quartile || '',
          isInterdisciplinary: contrib.interdisciplinaryFromSgt ? 'yes' : 'no',
          hasLpuStudents: contrib.studentsFromSgt ? 'yes' : 'no',
          journalName: contrib.journalName || '',
          schoolId: contrib.schoolId || '',
          departmentId: contrib.departmentId || '',
        });
        
        // Load author counts
        if (contrib.totalAuthors) setTotalAuthors(contrib.totalAuthors);
        if (contrib.sgtAffiliatedAuthors) setTotalInternalAuthors(contrib.sgtAffiliatedAuthors);
        if (contrib.internalCoAuthors) setTotalInternalCoAuthors(contrib.internalCoAuthors);
        
        // Load co-authors (excluding current user)
        if (contrib.authors && contrib.authors.length > 1) {
          const otherAuthors = contrib.authors.slice(1).map((a: any) => {
            const isInternal = a.authorCategory === 'faculty' || a.authorCategory === 'student' || a.isInternal;
            let authorType = 'Faculty';
            if (a.authorCategory === 'student') authorType = 'Student';
            else if (!isInternal) {
              if (a.affiliation?.toLowerCase().includes('university') || a.affiliation?.toLowerCase().includes('institute')) {
                authorType = 'Academic';
              } else {
                authorType = 'Industry';
              }
            }
            
            return {
              uid: a.registrationNo || a.uid || '',
              name: a.name || '',
              authorType: authorType,
              authorCategory: isInternal ? 'Internal' : 'External',
              email: a.email || '',
              affiliation: a.affiliation || (isInternal ? 'SGT University' : ''),
              authorRole: a.authorType || 'co_author', // authorType from backend is the role enum
            };
          });
          setCoAuthors(otherAuthors);
        }
      }
    } catch (error) {
      console.error('Error fetching contribution:', error);
      setError('Failed to load contribution');
    } finally {
      setLoading(false);
    }
  };

  // No longer needed - removed

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Removed - no longer needed for simplified form

  // Removed - no longer using count-based role determination

  const handleCoAuthorChange = (index: number, field: string, value: string) => {
    setCoAuthors(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleResearchDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResearchDocument(e.target.files[0]);
    }
  };

  const handleSupportingDocumentsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSupportingDocuments(Array.from(e.target.files));
    }
  };

  const removeResearchDocument = () => {
    setResearchDocument(null);
  };

  const removeSupportingDocument = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const searchAuthors = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      // Search based on author type (student or faculty)
      const role = newAuthor.authorType === 'Student' ? 'student' : 'faculty';
      const response = await researchService.searchUsers(searchTerm, role);
      
      if (response.success && response.data && response.data.length > 0) {
        setSearchSuggestions(response.data);
        setShowSuggestions(true);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  const selectAuthorFromSuggestion = async (userData: any) => {
    // Validate that user is not adding their own account
    if (userData.uid === user?.uid) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setError('You cannot add yourself as a co-author. You are already the primary author.');
      setNewAuthor({
        uid: '',
        name: '',
        authorType: newAuthor.authorType,
        authorCategory: 'Internal',
        email: '',
        affiliation: 'SGT University',
        authorRole: newAuthor.authorRole
      });
      return;
    }
    
    // userData from search has: uid, name, role, department, designation
    const authorType = userData.role === 'student' ? 'Student' : 'Faculty';
    
    // Check if interdisciplinary is no and user is from different school
    if (formData.isInterdisciplinary === 'no' && user?.employeeDetails?.department?.school?.id) {
      const userSchoolId = user.employeeDetails.department.school.id;
      const userSchoolName = user.employeeDetails.department.school.name;
      
      // Check if searched user is from same school
      if (userData.schoolId && userData.schoolId !== userSchoolId) {
        setError(`For non-interdisciplinary research, co-authors must be from your school (${userSchoolName})`);
        return;
      }
    }
    
    // Fetch full details using lookup for email
    try {
      const fullData = await researchService.lookupByRegistration(userData.uid);
      const fullUser = fullData.data;
      
      // Extract email from the correct location based on user type
      let userEmail = '';
      if (fullUser) {
        // Try UserLogin email first (primary)
        userEmail = fullUser.email || '';
        
        // If not found, try employeeDetails or studentDetails
        if (!userEmail && fullUser.employeeDetails) {
          userEmail = fullUser.employeeDetails.email || '';
        }
        if (!userEmail && fullUser.studentProfile) {
          userEmail = fullUser.studentProfile.email || '';
        }
      }
      
      setNewAuthor({
        uid: userData.uid,
        name: userData.name || fullUser?.displayName || '',
        authorType: authorType,
        authorCategory: 'Internal',
        email: userEmail,
        affiliation: 'SGT University',
        authorRole: newAuthor.authorRole
      });
    } catch (error) {
      // Fallback if full lookup fails
      setNewAuthor({
        uid: userData.uid,
        name: userData.name,
        authorType: authorType,
        authorCategory: 'Internal',
        email: '',
        affiliation: 'SGT University',
        authorRole: newAuthor.authorRole
      });
    }
    
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  };
  
  const lookupAuthor = async (uid: string) => {
    if (!uid) return;
    
    // Validate that user is not adding their own account
    if (uid === user?.uid) {
      setNewAuthor({
        uid: '',
        name: '',
        authorType: newAuthor.authorType,
        authorCategory: 'Internal',
        email: '',
        affiliation: 'SGT University',
        authorRole: newAuthor.authorRole
      });
      setError('You cannot add yourself as a co-author. You are already the primary author.');
      return;
    }
    
    try {
      const response = await researchService.lookupByRegistration(uid);
      if (response.data) {
        const userData = response.data;
        const userType = userData.userType;
        let authorType = userType === 'student' ? 'Student' : 'Faculty';
        
        // Extract email from the correct location based on user type
        let userEmail = '';
        // Try UserLogin email first (primary)
        userEmail = userData.email || '';
        
        // If not found, try employeeDetails or studentProfile
        if (!userEmail && userData.employeeDetails) {
          userEmail = userData.employeeDetails.email || '';
        }
        if (!userEmail && userData.studentProfile) {
          userEmail = userData.studentProfile.email || '';
        }
        
        setNewAuthor({
          uid: uid,
          name: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          authorType: authorType,
          authorCategory: 'Internal',
          email: userEmail,
          affiliation: 'SGT University',
          authorRole: newAuthor.authorRole
        });
        
        setSearchSuggestions([]);
        setShowSuggestions(false);
        setError(null);
      }
    } catch (error) {
      // Clear the author data if lookup fails
      setNewAuthor({
        uid: uid,
        name: '',
        authorType: newAuthor.authorType,
        authorCategory: 'Internal',
        email: '',
        affiliation: 'SGT University',
        authorRole: newAuthor.authorRole
      });
      setError(`User not found with that ${newAuthor.authorType === 'Student' ? 'Registration Number' : 'UID'}`);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  const addOrUpdateAuthor = () => {
    if (!newAuthor.name) {
      setError('Author name is required');
      return;
    }
    
    if (newAuthor.authorCategory === 'Internal' && !newAuthor.uid) {
      setError(`${newAuthor.authorType === 'Student' ? 'Registration Number' : 'UID'} is required for internal authors`);
      return;
    }
    
    // Validate external author fields
    if (newAuthor.authorCategory === 'External') {
      if (!newAuthor.email) {
        setError('Email is required for external authors');
        return;
      }
      if (!newAuthor.affiliation) {
        setError('Organization/Institute is required for external authors');
        return;
      }
    }
    
    // Validate that user is not adding their own account
    if (newAuthor.authorCategory === 'Internal' && newAuthor.uid === user?.uid) {
      setError('You cannot add yourself as a co-author. You are already the primary author.');
      return;
    }
    
    if (editingAuthorIndex !== null) {
      // Update existing author
      setCoAuthors(prev => {
        const updated = [...prev];
        updated[editingAuthorIndex] = { ...newAuthor };
        return updated;
      });
      setEditingAuthorIndex(null);
    } else {
      // Add new author
      const currentCount = coAuthors.filter(a => a.name).length;
      
      // Calculate max co-authors based on total authors (totalAuthors - 1 because applicant is already counted)
      const maxCoAuthors = totalAuthors - 1;
      
      // Count internal and external authors already added
      const internalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
      const externalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'External').length;
      
      // Check if we've reached overall limit
      if (currentCount >= maxCoAuthors) {
        setError(`You can only add ${maxCoAuthors} co-author(s) based on your total author count of ${totalAuthors}`);
        return;
      }
      
      // Check specific limits based on author category being added
      if (newAuthor.authorCategory === 'Internal') {
        // When all internal are co-authors (Internal = Co-Authors), you need to add (Co-Authors - 1) internal
        // Otherwise, you need to add Co-Authors internal
        const maxInternalToAdd = (totalInternalAuthors === totalInternalCoAuthors && totalInternalCoAuthors > 0)
          ? totalInternalCoAuthors - 1  // Exclude yourself
          : totalInternalCoAuthors;
        
        if (internalAdded >= maxInternalToAdd) {
          setError(`You can only add ${maxInternalToAdd} internal co-author(s). You've already added ${internalAdded}.`);
          return;
        }
      } else {
        // External authors calculation:
        // When all internal are co-authors: external = total - internal
        // Otherwise: external = total - 1 (you) - internal co-authors
        const maxExternalAuthors = (totalInternalAuthors === totalInternalCoAuthors && totalInternalCoAuthors > 0)
          ? totalAuthors - totalInternalAuthors
          : maxCoAuthors - totalInternalCoAuthors;
        
        if (externalAdded >= maxExternalAuthors) {
          setError(`You can only add ${maxExternalAuthors} external author(s). You've already added ${externalAdded}.`);
          return;
        }
      }
      
      setCoAuthors(prev => {
        const updated = [...prev];
        const emptyIndex = updated.findIndex(a => !a.name);
        if (emptyIndex !== -1) {
          updated[emptyIndex] = { ...newAuthor };
        } else {
          updated.push({ ...newAuthor });
        }
        return updated;
      });
    }
    
    // Reset form - set default role and category based on scenario
    const defaultRole = (totalInternalAuthors === 1 && totalInternalCoAuthors === 1)
      ? 'first_and_corresponding'
      : 'co_author';
    
    // Determine default category: External if only external can be added, otherwise Internal
    const defaultCategory = (totalInternalAuthors === 1 && totalInternalCoAuthors === 0) ? 'External' : 'Internal';
    const defaultType = defaultCategory === 'External' ? 'Academic' : 'Faculty';
    const defaultAffiliation = defaultCategory === 'External' ? '' : 'SGT University';
    
    setNewAuthor({
      uid: '',
      name: '',
      authorType: defaultType,
      authorCategory: defaultCategory,
      email: '',
      affiliation: defaultAffiliation,
      authorRole: defaultRole,
    });
    
    setError(null);
  };
  
  const editAuthor = (index: number) => {
    const author = coAuthors[index];
    setNewAuthor({
      uid: author.uid,
      name: author.name,
      authorType: author.authorType,
      authorCategory: author.authorCategory,
      email: author.email || '',
      affiliation: author.affiliation || 'SGT University',
      authorRole: author.authorRole || 'co_author',
    });
    setEditingAuthorIndex(index);
  };
  
  const removeAuthor = (index: number) => {
    setCoAuthors(prev => {
      const updated = [...prev];
      updated[index] = {
        uid: '',
        name: '',
        authorType: 'Faculty',
        authorCategory: 'Internal',
        email: '',
        affiliation: 'SGT University',
        authorRole: 'co_author',
      };
      return updated;
    });
  };

  // Update co-authors list when counts change
  useEffect(() => {
    // Special case: SGT=1 & Internal Co-Authors=1 -> need exactly 1 slot for internal author
    const newCount = (totalInternalAuthors === 1 && totalInternalCoAuthors === 1) 
      ? 1 
      : totalInternalAuthors - 1; // Exclude current user
    
    if (newCount !== coAuthors.length) {
      const defaultRole = (totalInternalAuthors === 1 && totalInternalCoAuthors === 1)
        ? 'first_and_corresponding'
        : 'co_author';
      
      if (newCount > coAuthors.length) {
        // Add more empty slots
        setCoAuthors(prev => [
          ...prev,
          ...Array(newCount - prev.length).fill(null).map(() => ({ 
            uid: '', 
            name: '', 
            authorType: 'Faculty',
            authorCategory: 'Internal',
            email: '',
            affiliation: 'SGT University',
            authorRole: defaultRole,
          }))
        ]);
      } else {
        // Remove excess slots
        setCoAuthors(prev => prev.slice(0, newCount));
      }
    }
  }, [totalInternalAuthors, totalInternalCoAuthors]);
  
  // Auto-set user author type based on allowed roles
  useEffect(() => {
    const allowedRoles = getAllowedUserRoles();
    if (allowedRoles.length === 1 && !allowedRoles.includes(userAuthorType)) {
      setUserAuthorType(allowedRoles[0]);
    }
  }, [totalAuthors, totalInternalAuthors, totalInternalCoAuthors]);
  
  // Auto-set newAuthor category to Internal when in SGT=1 & Co-Authors=1 scenario
  useEffect(() => {
    if (totalInternalAuthors === 1 && totalInternalCoAuthors === 1) {
      setNewAuthor(prev => ({
        ...prev,
        authorCategory: 'Internal',
        affiliation: 'SGT University',
        authorRole: 'first_and_corresponding'
      }));
    }
  }, [totalInternalAuthors, totalInternalCoAuthors]);

  const buildSubmitData = () => {
    // Build authors array from counts and co-authors list
    const authors: any[] = [];
    
    // Add current user as first author
    const userDisplayName = (user as any)?.employeeDetails?.displayName || 
                           (user as any)?.employee?.displayName ||
                           `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
                           user?.email || '';
    
    const userType = user?.userType === 'student' ? 'internal_student' : 'internal_faculty';
    
    let currentUserRole = 'first_author';
    let isCorresponding = false;
    
    if (userAuthorType === 'first_and_corresponding') {
      currentUserRole = 'first_author';
      isCorresponding = true;
    } else if (userAuthorType === 'corresponding') {
      currentUserRole = 'corresponding_author';
      isCorresponding = true;
    } else if (userAuthorType === 'first') {
      currentUserRole = 'first_author';
    } else {
      currentUserRole = 'co_author';
    }
    
    authors.push({
      authorType: userType,
      authorRole: currentUserRole,
      name: userDisplayName,
      email: user?.email,
      registrationNumber: user?.uid,
      isCorresponding: isCorresponding,
      orderNumber: 1,
      userId: user?.id,
    });
    
    // Add co-authors from the added contributors list
    coAuthors.forEach((coAuthor, index) => {
      if (coAuthor.name) {
        let authorType = '';
        if (coAuthor.authorCategory === 'Internal') {
          authorType = coAuthor.authorType === 'Student' ? 'internal_student' : 'internal_faculty';
        } else {
          // External authors - Academic, Industry, or Other
          if (coAuthor.authorType === 'Academic') authorType = 'external_academic';
          else if (coAuthor.authorType === 'Industry') authorType = 'external_industry';
          else if (coAuthor.authorType === 'Other') authorType = 'external_other';
          else authorType = 'external_other'; // Fallback
        }
        
        authors.push({
          authorType: authorType,
          authorRole: (coAuthor as any).authorRole || 'co_author',
          name: coAuthor.name,
          registrationNumber: coAuthor.uid || null,
          email: coAuthor.email || null,
          affiliation: coAuthor.affiliation || (coAuthor.authorCategory === 'Internal' ? 'SGT University' : null),
          isCorresponding: false,
          orderNumber: index + 2,
        });
      }
    });
    
    // Calculate author counts dynamically
    const totalAuthorsCount = authors.length;
    const internalAuthorsCount = authors.filter(a => a.authorType?.startsWith('internal_')).length;
    const internalCoAuthorsCount = internalAuthorsCount - 1; // Exclude current user
    
    const data: any = {
      publicationType: formData.publicationType,
      title: formData.title,
      schoolId: formData.schoolId || null,
      departmentId: formData.departmentId || null,
      mentorUid: formData.mentorUid || null,
      authors,
      // Add author counts for backend (map to schema field names)
      totalAuthors: totalAuthorsCount,
      sgtAffiliatedAuthors: internalAuthorsCount,
      internalCoAuthors: internalCoAuthorsCount,
      // Research paper specific fields (map to schema field names and convert types)
      journalName: formData.journalName,
      targetedResearchType: formData.targetedResearchType,
      internationalAuthor: formData.hasInternationalAuthor === 'yes',
      foreignCollaborationsCount: formData.numForeignUniversities ? Number(formData.numForeignUniversities) : 0,
      impactFactor: formData.impactFactor ? Number(formData.impactFactor) : null,
      sjr: formData.sjr ? Number(formData.sjr) : null,
      quartile: formData.quartile || null,
      interdisciplinaryFromSgt: formData.isInterdisciplinary === 'yes',
      studentsFromSgt: formData.hasLpuStudents === 'yes',
      // Publication details
      volume: formData.volume || null,
      issue: formData.issue || null,
      pageNumbers: formData.pageNumbers || null,
      doi: formData.doi || null,
      issn: formData.issn || null,
      publisherName: formData.publisherName || null,
      publisherLocation: formData.publisherLocation || null,
      publicationDate: formData.publicationDate ? new Date(formData.publicationDate).toISOString() : null,
      publicationStatus: formData.publicationStatus || null,
      // SDG Goals
      sdgGoals: formData.sdgGoals.length > 0 ? formData.sdgGoals : null,
    };
    
    return data;
  };

  const handleSaveDraft = async () => {
    if (!formData.title) {
      setError('Title is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const data = buildSubmitData();
      
      let response;
      let contributionId = currentId;
      
      if (currentId) {
        response = await researchService.updateContribution(currentId, data);
      } else {
        response = await researchService.createContribution(data);
        if (response.data?.id) {
          contributionId = response.data.id;
          setCurrentId(contributionId);
        }
      }
      
      // Upload documents if any
      if (contributionId && (researchDocument || supportingDocuments.length > 0)) {
        const formData = new FormData();
        
        if (researchDocument) {
          formData.append('researchDocument', researchDocument);
        }
        
        supportingDocuments.forEach((file, index) => {
          formData.append('supportingDocuments', file);
        });
        
        await researchService.uploadDocuments(contributionId, formData);
      }
      
      setSuccess('Draft saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving draft:', error);
      setError(error.response?.data?.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title) {
      setError('Title is required');
      return;
    }
    
    // Validate required co-authors are filled
    const filledAuthors = coAuthors.filter(a => a.name).length;
    const requiredAuthors = totalInternalAuthors - 1; // Exclude current user
    
    if (filledAuthors < requiredAuthors) {
      setError(`Please add all ${requiredAuthors} co-author(s). Currently ${filledAuthors} added.`);
      return;
    }
    
    if (!formData.journalName) {
      setError('Journal name is required');
      return;
    }
    
    // Validate research document is uploaded
    if (!researchDocument && !currentId) {
      setError('Please upload the research document before submitting');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const data = buildSubmitData();
      
      // First save/create
      let id = currentId;
      if (!id) {
        const createResponse = await researchService.createContribution(data);
        id = createResponse.data?.id;
        setCurrentId(id);
      } else {
        await researchService.updateContribution(id, data);
      }
      
      if (!id) {
        throw new Error('Failed to create contribution');
      }
      
      // Upload documents if any
      if (researchDocument || supportingDocuments.length > 0) {
        const formData = new FormData();
        
        if (researchDocument) {
          formData.append('researchDocument', researchDocument);
        }
        
        supportingDocuments.forEach((file, index) => {
          formData.append('supportingDocuments', file);
        });
        
        await researchService.uploadDocuments(id, formData);
      }
      
      // Then submit
      await researchService.submitContribution(id);
      
      setSuccess('Contribution submitted successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('Error submitting contribution:', error);
      setError(error.response?.data?.message || 'Failed to submit contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const getPublicationTypeLabel = () => {
    const labels: Record<ResearchPublicationType, string> = {
      research_paper: 'Research Paper Publication',
      book: 'Book / Book Chapter',
      book_chapter: 'Book Chapter',
      conference_paper: 'Conference Paper',
      grant: 'Grant / Funding',
    };
    return labels[publicationType] || publicationType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header - Professional */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {contributionId ? 'Edit' : 'New'} {getPublicationTypeLabel()}
        </h1>
        <p className="text-gray-500 mt-1">Fill in the details of your publication</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <nav className="flex border-b border-gray-200">
          <button
            className={`py-3.5 px-6 font-medium text-sm transition-all ${activeTab === 'entry'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('entry')}
          >
            Contribution Entry
          </button>
          <button
            className={`py-3.5 px-6 font-medium text-sm transition-all ${activeTab === 'process'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('process')}
          >
            Already in Process
          </button>
        </nav>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <p className="text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="ml-2 p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center shadow-sm">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {activeTab === 'entry' && (
        <>
          {/* Research Paper Form - Professional */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Publication Details</h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Title of Paper */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title of Paper <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                  placeholder="Enter the complete title of your research paper"
                />
              </div>

          {/* Row 1: Options Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 p-5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Targeted Research <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {[{v:'scopus',l:'Scopus'},{v:'wos',l:'SCI/SCIE'},{v:'both',l:'Both'}].map(opt => (
                  <label key={opt.v} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="targetedResearchType" value={opt.v}
                      checked={formData.targetedResearchType === opt.v}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-1.5 text-gray-700">{opt.l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                International Author <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {['yes','no'].map(v => (
                  <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="hasInternationalAuthor" value={v}
                      checked={formData.hasInternationalAuthor === v}
                      onChange={(e) => { handleInputChange(e); setError(null); }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interdisciplinary(SGT) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {['yes','no'].map(v => (
                  <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="isInterdisciplinary" value={v}
                      checked={formData.isInterdisciplinary === v}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student(s) from SGT <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {['yes','no'].map(v => (
                  <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="hasLpuStudents" value={v}
                      checked={formData.hasLpuStudents === v}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Conditional: Foreign Universities count */}
          {formData.hasInternationalAuthor === 'yes' && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="text-sm font-medium text-gray-700">
                Foreign Universities Collaborated:
              </label>
              <input
                type="number"
                name="numForeignUniversities"
                value={formData.numForeignUniversities}
                onChange={handleInputChange}
                min="0"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          )}

          {/* Conditional Fields: SJR + Quartile + Impact Factor */}
          {(formData.targetedResearchType === 'scopus' || formData.targetedResearchType === 'both' || formData.targetedResearchType === 'wos') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(formData.targetedResearchType === 'scopus' || formData.targetedResearchType === 'both') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SJR</label>
                    <input type="text" name="sjr" value={formData.sjr} onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-colors"
                      placeholder="e.g. 0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quartile <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-3">
                      {['q1','q2','q3','q4','na'].map(q => (
                        <label key={q} className="inline-flex items-center text-sm cursor-pointer">
                          <input type="radio" name="quartile" value={q}
                            checked={formData.quartile === q}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="ml-1 uppercase text-gray-700">{q === 'na' ? 'N/A' : q}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {(formData.targetedResearchType === 'wos' || formData.targetedResearchType === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Impact Factor <span className="text-red-500">*</span></label>
                  <input type="text" name="impactFactor" value={formData.impactFactor} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-colors"
                    placeholder="e.g. 2.5"
                  />
                </div>
              )}
            </div>
          )}

          {/* Journal Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Journal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="journalName"
              value={formData.journalName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-white transition-colors"
              placeholder="Enter the journal name"
            />
          </div>

          {/* SDG Goals */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              UN Sustainable Development Goals (SDGs)
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
                  {SDG_GOALS.map((sdg) => (
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
                  const sdg = SDG_GOALS.find(s => s.value === sdgValue);
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
          </div>

          {/* Publication Details Grid */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Publication Information</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Volume</label>
                <input type="text" name="volume" value={formData.volume} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" placeholder="Vol"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Issue</label>
                <input type="text" name="issue" value={formData.issue} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" placeholder="Iss"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Pages</label>
                <input type="text" name="pageNumbers" value={formData.pageNumbers} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" placeholder="1-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">DOI</label>
                <input type="text" name="doi" value={formData.doi} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" placeholder="10.xxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">ISSN</label>
                <input type="text" name="issn" value={formData.issn} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" placeholder="1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Pub. Date</label>
                <input type="date" name="publicationDate" value={formData.publicationDate} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">Publisher Name</label>
              <input type="text" name="publisherName" value={formData.publisherName} onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" placeholder="Enter publisher name"
              />
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-100 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Upload Documents</h3>
                <p className="text-sm text-gray-500">Upload all documents as a single ZIP file (Max 5 MB)</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      setError('File size must not exceed 5 MB');
                      e.target.value = '';
                      return;
                    }
                    handleResearchDocumentUpload(e);
                  }
                }}
                className="w-full file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:font-medium file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 file:cursor-pointer cursor-pointer border border-dashed border-amber-300 rounded-xl p-3 bg-white"
              />
              {researchDocument && (
                <div className="mt-3 flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                  <span className="text-green-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {researchDocument.name} ({(researchDocument.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button type="button" onClick={removeResearchDocument}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mentor Selection (Only for Students) - Compact */}
      {user?.userType === 'student' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Mentor Details (Optional)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Mentor UID with Autocomplete */}
            <div className="relative" ref={mentorSuggestionsRef}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mentor UID (Faculty)
              </label>
              <input
                type="text"
                name="mentorUid"
                value={formData.mentorUid}
                onChange={handleMentorUidChange}
                onFocus={() => formData.mentorUid.length >= 3 && setShowMentorSuggestions(true)}
                placeholder="Enter Mentor's UID"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Autocomplete Suggestions Dropdown */}
              {showMentorSuggestions && mentorSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                  {mentorSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => selectMentorSuggestion(suggestion)}
                      className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 text-sm">{suggestion.uid}</div>
                      <div className="text-xs text-gray-600">{suggestion.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Mentor Name (Auto-filled) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mentor Name</label>
              <input
                type="text"
                name="mentorName"
                value={formData.mentorName}
                readOnly
                placeholder="Auto-filled"
                className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Authors Section - Professional */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3">
          <h2 className="text-lg font-semibold text-white">Author Information</h2>
        </div>
        <div className="p-5">
        
        {/* Author Counts */}
        <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-gradient-to-r from-gray-50 to-emerald-50 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Authors <span className="text-red-500">*</span></label>
            <input type="number" min="1" value={totalAuthors}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value < 1) { setError('Total authors must be at least 1'); return; }
                setTotalAuthors(value);
                if (totalInternalAuthors > value) { setTotalInternalAuthors(value); }
              }}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500" placeholder="1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">SGT Authors <span className="text-red-500">*</span></label>
            <input type="number" min="1" max={totalAuthors} value={totalInternalAuthors}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value < 1) { setError('SGT affiliated authors must be at least 1 (you)'); return; }
                if (value > totalAuthors) { setError('SGT affiliated authors cannot exceed total authors'); return; }
                setTotalInternalAuthors(value);
                const maxCoAuthors = totalAuthors === value ? value - 1 : value;
                if (totalInternalCoAuthors > maxCoAuthors) { setTotalInternalCoAuthors(maxCoAuthors); }
                setError(null);
              }}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500" placeholder="1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Internal Co-Authors <span className="text-red-500">*</span>
              <span className="text-gray-400 ml-1 font-normal">(Max: {totalAuthors === totalInternalAuthors ? totalInternalAuthors - 1 : totalInternalAuthors})</span>
            </label>
            <input type="number" min="0"
              max={totalAuthors === totalInternalAuthors ? totalInternalAuthors - 1 : totalInternalAuthors}
              value={totalInternalCoAuthors}
              onChange={(e) => {
                const value = Number(e.target.value);
                const maxCoAuthors = totalAuthors === totalInternalAuthors ? totalInternalAuthors - 1 : totalInternalAuthors;
                if (value < 0) { setError('Internal co-authors cannot be negative'); return; }
                if (value > maxCoAuthors) { setError(`Internal co-authors cannot exceed ${maxCoAuthors}.`); return; }
                setTotalInternalCoAuthors(value);
                setError(null);
              }}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500" placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Your Role <span className="text-red-500">*</span></label>
            {getAllowedUserRoles().length === 1 ? (
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
                {userAuthorType === 'first_and_corresponding' && 'First & Corresponding'}
                {userAuthorType === 'corresponding' && 'Corresponding'}
                {userAuthorType === 'first' && 'First Author'}
                {userAuthorType === 'co_author' && 'Co-Author'}
              </div>
            ) : (
              <select value={userAuthorType} onChange={(e) => setUserAuthorType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {getAllowedUserRoles().includes('first_and_corresponding') && <option value="first_and_corresponding">First & Corresponding</option>}
                {getAllowedUserRoles().includes('corresponding') && <option value="corresponding">Corresponding</option>}
                {getAllowedUserRoles().includes('first') && <option value="first">First Author</option>}
                {getAllowedUserRoles().includes('co_author') && <option value="co_author">Co-Author</option>}
              </select>
            )}
          </div>
        </div>
        
        {/* Add Other Author's Detail - Compact */}
        {(totalAuthors > 1) && (
          <div className="border border-orange-300 bg-orange-50 rounded p-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Add Other Authors {editingAuthorIndex !== null && <span className="text-xs text-blue-600">(Editing)</span>}
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              {(() => {
                const maxCoAuthors = totalAuthors - 1;
                const currentAdded = coAuthors.filter(a => a.name).length;
                const internalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
                const externalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'External').length;
                
                // When all internal are co-authors (Internal = Co-Authors)
                if (totalInternalAuthors === totalInternalCoAuthors && totalInternalCoAuthors > 0) {
                  const internalToAdd = totalInternalCoAuthors - 1; // Exclude yourself
                  const externalToAdd = maxCoAuthors - internalToAdd;
                  const parts = [];
                  if (internalToAdd > 0) {
                    parts.push(`${internalToAdd} internal co-author(s) [${internalAdded} added]`);
                  }
                  if (externalToAdd > 0) {
                    parts.push(`${externalToAdd} external author(s) [${externalAdded} added]`);
                  }
                  return `All ${totalInternalCoAuthors} internal (including you) are co-authors. Add ${parts.join(' and ')}. Total: ${currentAdded}/${maxCoAuthors}.`;
                }
                
                const maxExternal = maxCoAuthors - totalInternalCoAuthors;
                
                const parts = [];
                if (totalInternalCoAuthors > 0) {
                  parts.push(`${totalInternalCoAuthors} internal co-author(s) [${internalAdded} added]`);
                }
                if (maxExternal > 0) {
                  parts.push(`${maxExternal} external author(s) [${externalAdded} added]`);
                }
                
                return `You can add ${parts.join(' and ')}. Total: ${currentAdded}/${maxCoAuthors} co-author(s) added.`;
              })()}
            </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Author Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author Type: <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                {/* Show Internal option when: SGT > 1, OR when SGT=1 and Internal Co-Authors=1 */}
                {(totalInternalAuthors > 1 || (totalInternalAuthors === 1 && totalInternalCoAuthors === 1)) && (
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Internal"
                      checked={newAuthor.authorCategory === 'Internal' || (totalInternalAuthors === 1 && totalInternalCoAuthors === 1) || totalAuthors === totalInternalAuthors}
                      onChange={(e) => {
                        const availableRoles = getAvailableOtherAuthorRoles();
                        setNewAuthor(prev => ({ 
                          ...prev, 
                          authorCategory: e.target.value,
                          authorType: 'Faculty', // Default to Faculty for internal authors
                          affiliation: 'SGT University',
                          uid: '',
                          name: '',
                          email: '',
                          authorRole: availableRoles.length > 0 ? availableRoles[0].value : 'first_and_corresponding'
                        }));
                        setSearchSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="w-4 h-4 text-blue-600"
                      disabled={totalInternalAuthors === 1 && totalInternalCoAuthors === 1 || totalAuthors === totalInternalAuthors}
                    />
                    <span className="ml-2">Internal {(totalInternalAuthors === 1 && totalInternalCoAuthors === 1 || totalAuthors === totalInternalAuthors) && '(Required)'}</span>
                  </label>
                )}
                {/* Show External option only when there are external authors (totalAuthors > totalInternalAuthors) */}
                {totalAuthors > totalInternalAuthors && !(totalInternalAuthors === 1 && totalInternalCoAuthors === 1) && (
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="External"
                      checked={newAuthor.authorCategory === 'External' || (totalInternalAuthors === 1 && totalInternalCoAuthors === 0)}
                      onChange={(e) => {
                        const availableRoles = getAvailableOtherAuthorRoles();
                        setNewAuthor(prev => ({ 
                          ...prev, 
                          authorCategory: e.target.value,
                          authorType: 'Academic', // Default to Academic for external authors
                          affiliation: '',
                          uid: '',
                          name: '',
                          email: '',
                          authorRole: availableRoles.length > 0 ? availableRoles[0].value : 'co_author'
                        }));
                        setSearchSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="w-4 h-4 text-blue-600"
                      disabled={totalInternalAuthors === 1 && totalInternalCoAuthors === 0}
                    />
                    <span className="ml-2">External</span>
                  </label>
                )}
              </div>
              {totalInternalAuthors === 1 && totalInternalCoAuthors === 1 && (
                <p className="text-xs text-orange-600 mt-1">
                  You must add an Internal co-author who will be First/Corresponding Author
                </p>
              )}
              {totalAuthors === totalInternalAuthors && totalAuthors > 1 && (
                <p className="text-xs text-blue-600 mt-1">
                  All authors are internal (SGT affiliated). External option is hidden.
                </p>
              )}
            </div>
            
            {/* Author Category Type - Different options for Internal vs External */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author category: <span className="text-red-500">*</span>
              </label>
              {newAuthor.authorCategory === 'Internal' ? (
                <div className="flex gap-6">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Student"
                      checked={newAuthor.authorType === 'Student'}
                      onChange={(e) => {
                        setNewAuthor(prev => ({ 
                          ...prev, 
                          authorType: e.target.value,
                          uid: '',
                          name: '',
                          email: ''
                        }));
                        setSearchSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Student</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Faculty"
                      checked={newAuthor.authorType === 'Faculty'}
                      onChange={(e) => {
                        setNewAuthor(prev => ({ 
                          ...prev, 
                          authorType: e.target.value,
                          uid: '',
                          name: '',
                          email: ''
                        }));
                        setSearchSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Faculty</span>
                  </label>
                </div>
              ) : (
                <div className="flex gap-6">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Academic"
                      checked={newAuthor.authorType === 'Academic'}
                      onChange={(e) => {
                        setNewAuthor(prev => ({ 
                          ...prev, 
                          authorType: e.target.value
                        }));
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Academic</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Industry"
                      checked={newAuthor.authorType === 'Industry'}
                      onChange={(e) => {
                        setNewAuthor(prev => ({ 
                          ...prev, 
                          authorType: e.target.value
                        }));
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Industry</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="Other"
                      checked={newAuthor.authorType === 'Other'}
                      onChange={(e) => {
                        setNewAuthor(prev => ({ 
                          ...prev, 
                          authorType: e.target.value
                        }));
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Other</span>
                  </label>
                </div>
              )}
            </div>
            
            {/* Author Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author Role: <span className="text-red-500">*</span>
              </label>
              <select
                value={newAuthor.authorRole}
                onChange={(e) => setNewAuthor(prev => ({ ...prev, authorRole: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {getAvailableOtherAuthorRoles().map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              {getAvailableOtherAuthorRoles().length < 4 && (
                <p className="text-xs text-gray-500 mt-1">
                  Some roles are already assigned
                </p>
              )}
            </div>
            
            {/* Registration Number / UID - Only show for Internal authors */}
            {newAuthor.authorCategory === 'Internal' && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newAuthor.authorType === 'Student' ? 'Enter Reg No:' : 'Enter UID:'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAuthor.uid}
                  onChange={(e) => {
                    const newUid = e.target.value;
                    
                    // Clear suggestions immediately
                    setSearchSuggestions([]);
                    setShowSuggestions(false);
                    
                    // Get available roles to maintain the role
                    const availableRoles = getAvailableOtherAuthorRoles();
                    const currentRole = availableRoles.length > 0 ? availableRoles[0].value : 'co_author';
                    
                    setNewAuthor({
                      uid: newUid,
                      name: '',
                      authorType: newAuthor.authorType,
                      authorCategory: 'Internal',
                      email: '',
                      affiliation: 'SGT University',
                      authorRole: newAuthor.authorRole || currentRole
                    });
                    
                    // Start search if enough characters
                    if (newUid.length >= 3) {
                      searchAuthors(newUid);
                    }
                  }}
                  onBlur={(e) => {
                    // Delay to allow clicking on suggestions
                    setTimeout(() => {
                      if (e.target.value && !showSuggestions) {
                        lookupAuthor(e.target.value);
                      }
                    }, 200);
                  }}
                  onFocus={() => {
                    if (newAuthor.uid.length >= 3 && searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder={newAuthor.authorType === 'Student' ? 'e.g., 12345678' : 'e.g., STF12345'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectAuthorFromSuggestion(suggestion)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {suggestion.uid} - {suggestion.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {suggestion.designation || suggestion.role} • {suggestion.department}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Name - auto-filled for Internal, manual entry for External */}
            <div className={newAuthor.authorCategory === 'External' ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newAuthor.name}
                onChange={(e) => setNewAuthor(prev => ({ ...prev, name: e.target.value }))}
                placeholder={newAuthor.authorCategory === 'Internal' ? 'Auto-filled after entering UID' : 'Enter full name'}
                readOnly={newAuthor.authorCategory === 'Internal' && !!newAuthor.uid}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${newAuthor.authorCategory === 'Internal' && !!newAuthor.uid ? 'bg-gray-50' : ''}`}
              />
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail: <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={newAuthor.email}
                onChange={(e) => setNewAuthor(prev => ({ ...prev, email: e.target.value }))}
                placeholder={newAuthor.authorCategory === 'Internal' ? 'Auto-filled after entering UID' : 'email@example.com'}
                readOnly={newAuthor.authorCategory === 'Internal' && !!newAuthor.uid}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${newAuthor.authorCategory === 'Internal' && !!newAuthor.uid ? 'bg-gray-50' : ''}`}
              />
            </div>
            
            {/* Affiliation/Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {newAuthor.authorCategory === 'Internal' ? 'University:' : 'Organization/Institute:'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newAuthor.affiliation}
                onChange={(e) => setNewAuthor(prev => ({ ...prev, affiliation: e.target.value }))}
                placeholder={newAuthor.authorCategory === 'Internal' ? 'SGT University' : 'Enter organization/institute name'}
                readOnly={newAuthor.authorCategory === 'Internal'}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${newAuthor.authorCategory === 'Internal' ? 'bg-gray-50' : ''}`}
              />
            </div>
          </div>
          
          {/* Add Button */}
          <div className="mt-4 flex justify-end gap-3">
            {editingAuthorIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingAuthorIndex(null);
                  // Reset to appropriate defaults based on what authors can be added
                  const defaultCategory = (totalInternalAuthors === 1 && totalInternalCoAuthors === 0) ? 'External' : 'Internal';
                  const defaultType = defaultCategory === 'External' ? 'Academic' : 'Faculty';
                  const defaultAffiliation = defaultCategory === 'External' ? '' : 'SGT University';
                  const availableRoles = getAvailableOtherAuthorRoles();
                  setNewAuthor({
                    uid: '',
                    name: '',
                    authorType: defaultType,
                    authorCategory: defaultCategory,
                    email: '',
                    affiliation: defaultAffiliation,
                    authorRole: availableRoles.length > 0 ? availableRoles[0].value : 'co_author',
                  });
                }}
                className="inline-flex items-center px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={addOrUpdateAuthor}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              {editingAuthorIndex !== null ? 'Update Author' : 'Add Other Details'}
            </button>
          </div>
        </div>
        )}
        
        {/* Added Contributors Table - Show when any co-authors are added */}
        {coAuthors.some(a => a.name) && (
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">Added Contributors</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r">
                      UID/Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r">
                      Affiliation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {coAuthors.filter(a => a.name).map((coAuthor, index) => {
                    const actualIndex = coAuthors.findIndex(a => a === coAuthor);
                    return (
                      <tr key={actualIndex}>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {coAuthor.authorCategory}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {coAuthor.authorType}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {coAuthor.uid ? `${coAuthor.uid} - ${coAuthor.name}` : coAuthor.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {coAuthor.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {coAuthor.affiliation}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editAuthor(actualIndex)}
                              className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAuthor(actualIndex)}
                              className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

          {/* Submit Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {autoSaving ? (
              <span className="flex items-center text-blue-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Auto-saving...
              </span>
            ) : lastAutoSave ? (
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                Auto-saved at {lastAutoSave.toLocaleTimeString()}
              </span>
            ) : currentId ? (
              'Draft saved'
            ) : (
              <span>Auto-save enabled (every 15 seconds when filling form)</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting || autoSaving}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || submitting || autoSaving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              Submit for Review
            </button>
          </div>
        </div>
      </div>
        </div>
        </>
      )}

      {/* Already in Process Tab */}
      {activeTab === 'process' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">My Research Contributions</h2>
          {loadingContributions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : myContributions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No contributions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">App Number</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myContributions.map((contrib: any, index: number) => {
                    const isApplicant = contrib.applicantUserId === user?.id;
                    return (
                      <tr key={contrib.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border text-sm text-center">{index + 1}</td>
                        <td className="px-4 py-2 border text-sm font-mono">
                          {contrib.applicationNumber || contrib.id.slice(-8)}
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          <div className="font-medium text-gray-900">{contrib.title}</div>
                          {contrib.journalName && (
                            <div className="text-xs text-gray-500 mt-1">{contrib.journalName}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded uppercase font-medium">
                            {contrib.publicationType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium ${
                            contrib.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            contrib.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                            contrib.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                            contrib.status === 'approved' ? 'bg-green-100 text-green-800' :
                            contrib.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {contrib.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 border text-sm text-center">
                          {isApplicant ? (
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                              Applicant
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                              {(() => {
                                const userAuthor = contrib.authors?.find((a: any) => a.userId === user?.id);
                                if (userAuthor?.authorType === 'first_and_corresponding_author') return 'First & Corresponding';
                                if (userAuthor?.authorType === 'first_author') return 'First Author';
                                if (userAuthor?.authorType === 'corresponding_author') return 'Corresponding Author';
                                if (userAuthor?.authorType === 'co_author') return 'Co-Author';
                                if (userAuthor?.authorType === 'senior_author') return 'Senior Author';
                                return 'Co-Author';
                              })()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          {contrib.submittedAt 
                            ? new Date(contrib.submittedAt).toLocaleDateString('en-IN')
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          <a
                            href={`/research/contribution/${contrib.id}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View Details
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
