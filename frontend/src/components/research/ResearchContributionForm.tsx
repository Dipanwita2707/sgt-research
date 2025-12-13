'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  X
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
  
  // Schools and departments for selection
  const [schools, setSchools] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
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
  
  // Helper function to get allowed user roles based on counts
  // UNIVERSAL PATTERN for Research Paper:
  // - Solo author (Total=1, SGT=1, Co-Authors=0): Must be first_and_corresponding
  // - SGT=1 with 1 internal co-author: User must be co_author, colleague is first/corresponding
  // - All other cases: All roles available
  const getAllowedUserRoles = () => {
    // Case 1: Solo author - must be first and corresponding
    if (totalAuthors === 1 && totalInternalAuthors === 1 && totalInternalCoAuthors === 0) {
      return ['first_and_corresponding'];
    }
    
    // Case 2: SGT=1 and 1 internal co-author (UNIVERSAL - any total author count)
    // User must be co_author, the internal colleague will be first/corresponding
    if (totalInternalAuthors === 1 && totalInternalCoAuthors === 1) {
      return ['co_author'];
    }
    
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
    
    // Special case: User is co-author with only 2 total authors
    // The other author MUST be First & Corresponding Author
    if (totalAuthors === 2 && userAuthorType === 'co_author') {
      return [
        { value: 'first_and_corresponding', label: 'First and Corresponding Author' },
      ];
    }
    
    // Special case: SGT=1 & Internal Co-Authors=1 and adding Internal author
    // The internal colleague MUST be first/corresponding (user is co_author)
    if (totalInternalAuthors === 1 && totalInternalCoAuthors === 1 && newAuthor.authorCategory === 'Internal') {
      return [
        { value: 'first_and_corresponding', label: 'First and Corresponding Author' },
        { value: 'first_author', label: 'First Author' },
        { value: 'corresponding_author', label: 'Corresponding Author' },
      ];
    }
    
    const allRoles = [
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
        // Internal co-authors limit is based on totalInternalCoAuthors
        if (internalAdded >= totalInternalCoAuthors) {
          setError(`You can only add ${totalInternalCoAuthors} internal co-author(s). You've already added ${internalAdded}.`);
          return;
        }
      } else {
        // External authors = total co-authors - internal co-authors
        const maxExternalAuthors = maxCoAuthors - totalInternalCoAuthors;
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
      if (currentId) {
        response = await researchService.updateContribution(currentId, data);
      } else {
        response = await researchService.createContribution(data);
        if (response.data?.id) {
          setCurrentId(response.data.id);
        }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {contributionId ? 'Edit' : 'New'} {getPublicationTypeLabel()}
        </h1>
        <p className="text-gray-600">Fill in the details of your publication</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-5 h-5 text-red-600" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Research Paper Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Title of Paper */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title of Paper: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter paper title"
            />
          </div>

          {/* Targeted Research Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Targeted Research Type: <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="targetedResearchType"
                  value="scopus"
                  checked={formData.targetedResearchType === 'scopus'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">Scopus</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="targetedResearchType"
                  value="wos"
                  checked={formData.targetedResearchType === 'wos'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">SCI/SCIF</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="targetedResearchType"
                  value="both"
                  checked={formData.targetedResearchType === 'both'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">Both</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="targetedResearchType"
                  value="ugc"
                  checked={formData.targetedResearchType === 'ugc'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">UGC</span>
              </label>
            </div>
          </div>

          {/* International Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              International Author: <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="hasInternationalAuthor"
                  value="yes"
                  checked={formData.hasInternationalAuthor === 'yes'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="hasInternationalAuthor"
                  value="no"
                  checked={formData.hasInternationalAuthor === 'no'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">No</span>
              </label>
            </div>
          </div>

          {/* Number of foreign Universities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of foreign Universities/Research organizations collaborated:
            </label>
            <input
              type="number"
              name="numForeignUniversities"
              value={formData.numForeignUniversities}
              onChange={handleInputChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Conditional Fields Based on Targeted Research Type */}
          {(formData.targetedResearchType === 'scopus' || formData.targetedResearchType === 'both') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SJR:
                </label>
                <input
                  type="text"
                  name="sjr"
                  value={formData.sjr}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter SJR value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quartile: <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="quartile"
                      value="q1"
                      checked={formData.quartile === 'q1'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Q1</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="quartile"
                      value="q2"
                      checked={formData.quartile === 'q2'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Q2</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="quartile"
                      value="q3"
                      checked={formData.quartile === 'q3'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Q3</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="quartile"
                      value="q4"
                      checked={formData.quartile === 'q4'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">Q4</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="quartile"
                      value="na"
                      checked={formData.quartile === 'na'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2">N/A</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {(formData.targetedResearchType === 'wos' || formData.targetedResearchType === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Impact Factor: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="impactFactor"
                value={formData.impactFactor}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Impact Factor"
              />
            </div>
          )}

          {/* Interdisciplinary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interdisciplinary(from SGT): <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="isInterdisciplinary"
                  value="yes"
                  checked={formData.isInterdisciplinary === 'yes'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="isInterdisciplinary"
                  value="no"
                  checked={formData.isInterdisciplinary === 'no'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">No</span>
              </label>
            </div>
          </div>

          {/* Student(s) from SGT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student(s) (from SGT): <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="hasLpuStudents"
                  value="yes"
                  checked={formData.hasLpuStudents === 'yes'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">Yes</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="hasLpuStudents"
                  value="no"
                  checked={formData.hasLpuStudents === 'no'}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2">No</span>
              </label>
            </div>
          </div>

          {/* Journal Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Journal Name: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="journalName"
              value={formData.journalName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter journal name"
            />
          </div>

          {/* Publication Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume Number
              </label>
              <input
                type="text"
                name="volume"
                value={formData.volume}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 45"
              />
            </div>

            {/* Issue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Number
              </label>
              <input
                type="text"
                name="issue"
                value={formData.issue}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 3"
              />
            </div>

            {/* Page Numbers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Numbers
              </label>
              <input
                type="text"
                name="pageNumbers"
                value={formData.pageNumbers}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 123-145"
              />
            </div>
          </div>

          {/* DOI and ISSN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DOI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DOI (Digital Object Identifier)
              </label>
              <input
                type="text"
                name="doi"
                value={formData.doi}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 10.1234/example.2024"
              />
            </div>

            {/* ISSN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISSN
              </label>
              <input
                type="text"
                name="issn"
                value={formData.issn}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 1234-5678"
              />
            </div>
          </div>

          {/* Publisher Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Publisher Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher Name
              </label>
              <input
                type="text"
                name="publisherName"
                value={formData.publisherName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter publisher name"
              />
            </div>

            {/* Publisher Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher Location
              </label>
              <input
                type="text"
                name="publisherLocation"
                value={formData.publisherLocation}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., New York, USA"
              />
            </div>
          </div>

          {/* Publication Date and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Publication Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publication Date
              </label>
              <input
                type="date"
                name="publicationDate"
                value={formData.publicationDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Publication Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publication Status
              </label>
              <select
                name="publicationStatus"
                value={formData.publicationStatus}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="published">Published</option>
                <option value="in_press">In Press</option>
                <option value="accepted">Accepted</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
          </div>
        </div>
      </div>



      {/* Authors Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Author Information</h2>
        
        {/* Author Counts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Number of Authors <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={totalAuthors}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value < 1) {
                  setError('Total authors must be at least 1');
                  return;
                }
                setTotalAuthors(value);
                // Adjust internal authors if needed
                if (totalInternalAuthors > value) {
                  setTotalInternalAuthors(value);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total No. of SGT Affiliated Author(s) (including you) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={totalAuthors}
              value={totalInternalAuthors}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value < 1) {
                  setError('SGT affiliated authors must be at least 1 (you)');
                  return;
                }
                if (value > totalAuthors) {
                  setError('SGT affiliated authors cannot exceed total authors');
                  return;
                }
                setTotalInternalAuthors(value);
                // Adjust co-authors if needed
                if (totalInternalCoAuthors >= value) {
                  setTotalInternalCoAuthors(value - 1);
                }
                setError(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total No. of Internal Co Authors <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max={totalInternalAuthors - 1}
              value={totalInternalCoAuthors}
              onChange={(e) => {
                const value = Number(e.target.value);
                const maxCoAuthors = totalInternalAuthors - 1;
                if (value < 0) {
                  setError('Internal co-authors cannot be negative');
                  return;
                }
                if (value > maxCoAuthors) {
                  setError(`Internal co-authors cannot exceed ${maxCoAuthors} (total internal - you)`);
                  return;
                }
                setTotalInternalCoAuthors(value);
                setError(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={totalInternalAuthors === 1 && totalAuthors === 1}
            />
            {totalInternalAuthors === 1 && totalAuthors === 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Must be 0 when you are the only SGT affiliated author
              </p>
            )}
          </div>
        </div>
        
        {/* User's Author Role */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Author Role: <span className="text-red-500">*</span>
          </label>
          {getAllowedUserRoles().length === 1 ? (
            <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
              {userAuthorType === 'first_and_corresponding' && 'First and Corresponding Author'}
              {userAuthorType === 'corresponding' && 'Corresponding Author'}
              {userAuthorType === 'first' && 'First Author'}
              {userAuthorType === 'co_author' && 'Co-Author'}
              <span className="text-sm text-gray-500 ml-2">(Determined by author counts)</span>
            </div>
          ) : (
            <select
              value={userAuthorType}
              onChange={(e) => setUserAuthorType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {getAllowedUserRoles().includes('first_and_corresponding') && (
                <option value="first_and_corresponding">First and Corresponding Author</option>
              )}
              {getAllowedUserRoles().includes('corresponding') && (
                <option value="corresponding">Corresponding Author</option>
              )}
              {getAllowedUserRoles().includes('first') && (
                <option value="first">First Author</option>
              )}
              {getAllowedUserRoles().includes('co_author') && (
                <option value="co_author">Co-Author</option>
              )}
            </select>
          )}
        </div>
        
        {/* Add Other Author's Detail - Show if there are co-author slots or if there are external authors to add */}
        {(totalAuthors > 1) && (
          <div className="border-2 border-orange-300 bg-orange-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Other Author's Detail {editingAuthorIndex !== null && <span className="text-sm text-blue-600">(Editing)</span>}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {(() => {
                const maxCoAuthors = totalAuthors - 1;
                const currentAdded = coAuthors.filter(a => a.name).length;
                const internalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
                const externalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'External').length;
                const maxExternal = maxCoAuthors - totalInternalCoAuthors;
                
                if (totalInternalAuthors === 1 && totalInternalCoAuthors === 1) {
                  return `You must add 1 internal co-author who will be the First/Corresponding Author. You are fixed as Co-Author. ${currentAdded} added.`;
                }
                
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
                      checked={newAuthor.authorCategory === 'Internal' || (totalInternalAuthors === 1 && totalInternalCoAuthors === 1)}
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
                      disabled={totalInternalAuthors === 1 && totalInternalCoAuthors === 1}
                    />
                    <span className="ml-2">Internal {totalInternalAuthors === 1 && totalInternalCoAuthors === 1 && '(Required)'}</span>
                  </label>
                )}
                {/* Show External option only when NOT in the SGT=1 & Internal Co-Authors=1 scenario */}
                {!(totalInternalAuthors === 1 && totalInternalCoAuthors === 1) && (
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
  );
}
