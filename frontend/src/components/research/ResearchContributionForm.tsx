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
  FileText,
  BookOpen,
  Globe,
  Trophy
} from 'lucide-react';
import { researchService, ResearchPublicationType, ResearchContributionAuthor } from '@/services/research.service';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface Props {
  publicationType: ResearchPublicationType;
  contributionId?: string;
  trackerId?: string;
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

export default function ResearchContributionForm({ publicationType, contributionId, trackerId, onSuccess }: Props) {
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
  
  // Policy state - fetch from backend
  const [policyData, setPolicyData] = useState<{
    quartileIncentives: Array<{ quartile: string; incentiveAmount: number; points: number }>;
    sjrRanges: Array<{ minSJR: number; maxSJR: number; incentiveAmount: number; points: number }>;
    rolePercentages: Array<{ role: string; percentage: number }>;
  } | null>(null);
  
  // Book and Book Chapter policy states
  const [bookPolicy, setBookPolicy] = useState<any>(null);
  const [bookChapterPolicy, setBookChapterPolicy] = useState<any>(null);
  const [conferencePolicy, setConferencePolicy] = useState<any>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    publicationType,
    title: '',
    targetedResearchType: 'scopus' as 'scopus' | 'wos' | 'both' | 'ugc',
    hasInternationalAuthor: 'yes' as 'yes' | 'no',
    numForeignUniversities: 0,
    impactFactor: '',
    sjr: '',
    quartile: '' as '' | 'top1' | 'top5' | 'q1' | 'q2' | 'q3' | 'q4',
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
    
    // Book/Book Chapter Specific Fields
    bookTitle: '',       // For book_chapter: name of the parent book
    isbn: '',
    edition: '',
    chapterName: '',     // For book_chapter: name of the chapter
    chapterNumber: '',   // For book_chapter
    editors: '',         // For book_chapter: editors of the book
    nationalInternational: 'national' as 'national' | 'international',
    bookPublicationType: 'authored' as 'authored' | 'edited',  // Authored Book, Edited Book
    bookIndexingType: 'scopus_indexed' as 'scopus_indexed' | 'non_indexed' | 'sgt_publication_house',  // Scopus-indexed, Non-indexed, or SGT Publication House
    bookLetter: 'yes' as 'yes' | 'no',  // Letter - Yes by default (for non-indexed)
    communicatedWithOfficialId: 'yes' as 'yes' | 'no',   // Have you communicated with official ID
    personalEmail: '',   // Personal email if not communicated with official ID
    facultyRemarks: '',  // Faculty remarks/comments
    
    // Conference Specific Fields
    conferenceSubType: '' as '' | 'paper_not_indexed' | 'paper_indexed_scopus' | 'keynote_speaker_invited_talks' | 'organizer_coordinator_member',
    conferenceName: '',
    conferenceLocation: '',
    conferenceDate: '',
    proceedingsTitle: '',
    proceedingsQuartile: 'na' as 'na' | 'q1' | 'q2' | 'q3' | 'q4',
    totalPresenters: 1,
    isPresenter: 'no' as 'yes' | 'no',
    virtualConference: 'no' as 'yes' | 'no',
    fullPaper: 'yes' as 'yes' | 'no',
    conferenceHeldAtSgt: 'no' as 'yes' | 'no',
    conferenceBestPaperAward: 'no' as 'yes' | 'no',
    industryCollaboration: 'no' as 'yes' | 'no',
    centralFacilityUsed: 'no' as 'yes' | 'no',
    issnIsbnIssueNo: '',
    paperDoi: '',
    weblink: '',
    paperweblink: '',
    priorityFundingArea: '',
    conferenceRole: '' as '' | 'keynote_speaker' | 'session_chair' | 'invited_speaker' | 'invited_panel_member',
    indexedIn: 'scopus' as 'wos' | 'scopus' | 'both' | 'non_index',
    conferenceHeldLocation: 'india' as 'india' | 'abroad',
    venue: '',
    topic: '',
    attendedVirtual: 'no' as 'yes' | 'no',
    eventCategory: 'conference' as 'conference' | 'seminar_symposia',
    organizerRole: '' as '' | 'chairman_chairperson' | 'joint_secretary' | 'committee_coordinators' | 'committee_members' | 'session_chair' | 'seminar_organizing_secretary' | 'seminar_joint_organizing_secretary' | 'seminar_committee_coordinator' | 'seminar_committee_member',
    conferenceType: 'national' as 'national' | 'international',
    
    // Additional Conference Requirements (Scopus Indexed)
    takeholderContents: 'no' as 'yes' | 'no',
    frontPageWithAuthorAffiliation: 'no' as 'yes' | 'no',
    nameContainsSpecialCharacters: 'no' as 'yes' | 'no',
    confDatesVenue: 'no' as 'yes' | 'no',
    
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
    designation?: string;
  }>>([]);
  
  // Check if any authors have been added (to lock author count fields)
  const hasAuthorsAdded = coAuthors.some(a => a.name);
  
  // Helper function to analyze author composition for incentive calculation
  const analyzeAuthorCompositionFrontend = () => {
    let internalCoAuthorCount = 0;
    let internalEmployeeCoAuthorCount = 0; // NEW: Track employee co-authors separately
    let externalCoAuthorCount = 0;
    let externalFirstCorrespondingPct = 0;
    
    // Role percentages from policy (default)
    const firstAuthorPct = 35;
    const correspondingAuthorPct = 30;

    // Check if applicant (you) is a co-author - if so, count them
    const applicantIsCoAuthor = userAuthorType === 'co_author';
    const applicantIsStudent = user?.userType === 'student';
    if (applicantIsCoAuthor) {
      internalCoAuthorCount++;
      if (!applicantIsStudent) {
        internalEmployeeCoAuthorCount++;
      }
    }

    // Analyze all OTHER co-authors (not including applicant)
    for (const author of coAuthors) {
      if (!author.name) continue;
      
      const isInternal = author.authorCategory === 'Internal';
      const isStudent = author.authorType === 'Student';
      const role = author.authorRole;
      
      if (isInternal) {
        if (role === 'co_author' || role === 'co') {
          internalCoAuthorCount++;
          // Track employee co-authors separately (exclude students)
          if (!isStudent) {
            internalEmployeeCoAuthorCount++;
          }
        }
      } else {
        if (role === 'co_author' || role === 'co') {
          externalCoAuthorCount++;
        }
        // Check if external author is first/corresponding - their share is LOST
        if (role === 'first_and_corresponding_author' || role === 'first_and_corresponding') {
          externalFirstCorrespondingPct += firstAuthorPct + correspondingAuthorPct;
        } else if (role === 'first_author' || role === 'first') {
          externalFirstCorrespondingPct += firstAuthorPct;
        } else if (role === 'corresponding_author' || role === 'corresponding') {
          externalFirstCorrespondingPct += correspondingAuthorPct;
        }
      }
    }

    return {
      internalCoAuthorCount,
      internalEmployeeCoAuthorCount, // NEW: Return employee co-author count
      externalCoAuthorCount,
      externalFirstCorrespondingPct
    };
  };
  
  // Helper function to calculate incentive and points for an author
  // Updated with NEW RULES:
  // - External authors get ZERO incentives and points
  // - Students get incentives but ZERO points
  // - External first/corresponding author percentages are LOST (not redistributed)
  // - External co-author percentages are redistributed to internal co-authors
  // ============================================
  // SEPARATE CALCULATION FUNCTIONS FOR EACH TYPE
  // ============================================

  /**
   * Calculate incentive for CONFERENCE PAPER authors
   */
  const calculateConferenceIncentive = (authorType: string, authorCategory: string, authorRole: string) => {
    // External authors get ZERO
    if (authorCategory === 'External') {
      return { incentive: 0, points: 0 };
    }

    // Check if we have conference policy
    if (!conferencePolicy) {
      return { incentive: 0, points: 0 };
    }

    const subType = formData.conferenceSubType;
    let totalIncentive = 0;
    let totalPoints = 0;

    // For Scopus-indexed conferences - use quartile-based calculation
    if (subType === 'paper_indexed_scopus') {
      const proceedingsQuartile = formData.proceedingsQuartile?.toUpperCase() || '';
      
      if (proceedingsQuartile && conferencePolicy.quartileIncentives) {
        const quartileMatch = conferencePolicy.quartileIncentives.find(
          (q: any) => q.quartile.toUpperCase() === proceedingsQuartile
        );
        if (quartileMatch) {
          totalIncentive = Number(quartileMatch.incentiveAmount) || 0;
          totalPoints = Number(quartileMatch.points) || 0;
        }
      }

      // Apply bonuses
      if (formData.conferenceType === 'international' && conferencePolicy.internationalBonus) {
        totalIncentive += Number(conferencePolicy.internationalBonus);
      }
      if (formData.conferenceBestPaperAward === 'yes' && conferencePolicy.bestPaperAwardBonus) {
        totalIncentive += Number(conferencePolicy.bestPaperAwardBonus);
      }

      // Use role percentages for distribution
      const firstAuthorPct = conferencePolicy.rolePercentages?.find((r: any) => r.role === 'first_author')?.percentage || 35;
      const correspondingAuthorPct = conferencePolicy.rolePercentages?.find((r: any) => r.role === 'corresponding_author')?.percentage || 30;
      const coAuthorTotalPct = 100 - firstAuthorPct - correspondingAuthorPct;

      const composition = analyzeAuthorCompositionFrontend();
      const otherAuthorsCount = coAuthors.filter(a => a.name).length;
      const totalAuthorCount = otherAuthorsCount + 1;

      let rolePercentage = 0;
      if (totalAuthorCount === 1) {
        rolePercentage = 100;
      } else if (authorRole === 'first_and_corresponding_author' || authorRole === 'first_and_corresponding') {
        rolePercentage = firstAuthorPct + correspondingAuthorPct;
      } else if (authorRole === 'first_author' || authorRole === 'first') {
        rolePercentage = firstAuthorPct;
      } else if (authorRole === 'corresponding_author' || authorRole === 'corresponding') {
        rolePercentage = correspondingAuthorPct;
      } else if (authorRole === 'co_author' || authorRole === 'co') {
        const effectiveInternalCoAuthorCount = Math.max(composition.internalCoAuthorCount, 1);
        rolePercentage = coAuthorTotalPct / effectiveInternalCoAuthorCount;
      }

      const authorIncentive = Math.round((totalIncentive * rolePercentage) / 100);
      const authorPoints = Math.round((totalPoints * rolePercentage) / 100);

      if (authorType === 'Student') {
        return { incentive: authorIncentive, points: 0 };
      }
      return { incentive: authorIncentive, points: authorPoints };
    } 
    // For other conference types - use flat incentive
    else {
      // Special handling for paper_not_indexed: If not a presenter, no incentives
      if (subType === 'paper_not_indexed' && formData.isPresenter === 'no') {
        return { incentive: 0, points: 0 };
      }

      // Default incentives based on national vs international
      const defaultFlatIncentive: Record<string, { national: { incentiveAmount: number, points: number }, international: { incentiveAmount: number, points: number } }> = {
        'paper_not_indexed': {
          national: { incentiveAmount: 10000, points: 10 },
          international: { incentiveAmount: 15000, points: 15 }
        },
        'keynote_speaker_invited_talks': {
          national: { incentiveAmount: 10000, points: 10 },
          international: { incentiveAmount: 20000, points: 20 }
        },
        'organizer_coordinator_member': {
          national: { incentiveAmount: 5000, points: 5 },
          international: { incentiveAmount: 10000, points: 10 }
        }
      };

      // Check if international based on conferenceType or conferenceHeldLocation
      const isInternational = 
        formData.conferenceType === 'international' ||
        formData.conferenceHeldLocation === 'abroad';

      // Use policy if available, otherwise use defaults
      if (conferencePolicy && conferencePolicy.flatIncentiveAmount && conferencePolicy.flatPoints) {
        totalIncentive = Number(conferencePolicy.flatIncentiveAmount) || 0;
        totalPoints = Number(conferencePolicy.flatPoints) || 0;
        
        // Apply international bonus from policy
        if (isInternational && conferencePolicy.internationalBonus) {
          totalIncentive += Number(conferencePolicy.internationalBonus);
        }
      } else {
        // Use defaults based on sub-type and national/international status
        const subTypeDefaults = defaultFlatIncentive[subType];
        if (subTypeDefaults) {
          const levelDefaults = isInternational ? subTypeDefaults.international : subTypeDefaults.national;
          totalIncentive = levelDefaults.incentiveAmount;
          totalPoints = levelDefaults.points;
        } else {
          // Fallback
          const levelDefaults = isInternational ? 
            defaultFlatIncentive['paper_not_indexed'].international : 
            defaultFlatIncentive['paper_not_indexed'].national;
          totalIncentive = levelDefaults.incentiveAmount;
          totalPoints = levelDefaults.points;
        }
      }

      // For keynote speakers and organizers: single person gets full amount (no split)
      // For paper_not_indexed: split equally among all authors
      let authorIncentive = 0;
      let authorPoints = 0;

      if (subType === 'keynote_speaker_invited_talks' || subType === 'organizer_coordinator_member') {
        // Single presenter/organizer gets full amount
        authorIncentive = totalIncentive;
        authorPoints = totalPoints;
      } else {
        // paper_not_indexed: divide equally among all authors
        const otherAuthorsCount = coAuthors.filter(a => a.name).length;
        const totalAuthorCount = otherAuthorsCount + 1;
        authorIncentive = Math.round(totalIncentive / totalAuthorCount);
        authorPoints = Math.round(totalPoints / totalAuthorCount);
      }

      if (authorType === 'Student') {
        return { incentive: authorIncentive, points: 0 };
      }
      return { incentive: authorIncentive, points: authorPoints };
    }
  };

  /**
   * Calculate incentive for BOOK authors
   */
  const calculateBookIncentive = (authorType: string, authorCategory: string) => {
    // External authors get ZERO
    if (authorCategory === 'External') {
      return { incentive: 0, points: 0 };
    }

    if (!bookPolicy) {
      return { incentive: 0, points: 0 };
    }

    const bookType = formData.bookPublicationType || 'authored';
    let baseIncentive = bookType === 'authored' 
      ? Number(bookPolicy.authoredIncentiveAmount) || 0
      : Number(bookPolicy.editedIncentiveAmount) || 0;
    let basePoints = bookType === 'authored'
      ? Number(bookPolicy.authoredPoints) || 0
      : Number(bookPolicy.editedPoints) || 0;

    // Apply indexing bonuses
    if (formData.bookIndexingType === 'scopus_indexed' && bookPolicy.indexingBonuses?.scopus_indexed) {
      baseIncentive += Number(bookPolicy.indexingBonuses.scopus_indexed);
    } else if (formData.bookIndexingType === 'sgt_publication_house' && bookPolicy.indexingBonuses?.sgt_publication_house) {
      baseIncentive += Number(bookPolicy.indexingBonuses.sgt_publication_house);
    }

    // Apply international bonus
    if (formData.nationalInternational === 'international' && bookPolicy.internationalBonus) {
      baseIncentive += Number(bookPolicy.internationalBonus);
    }

    // Divide among all authors
    const otherAuthorsCount = coAuthors.filter(a => a.name).length;
    const totalAuthorCount = otherAuthorsCount + 1;
    const authorIncentive = Math.round(baseIncentive / totalAuthorCount);
    const authorPoints = Math.round(basePoints / totalAuthorCount);

    if (authorType === 'Student') {
      return { incentive: authorIncentive, points: 0 };
    }
    return { incentive: authorIncentive, points: authorPoints };
  };

  /**
   * Calculate incentive for BOOK CHAPTER authors
   */
  const calculateBookChapterIncentive = (authorType: string, authorCategory: string) => {
    // External authors get ZERO
    if (authorCategory === 'External') {
      return { incentive: 0, points: 0 };
    }

    if (!bookChapterPolicy) {
      return { incentive: 0, points: 0 };
    }

    const bookType = formData.bookPublicationType || 'authored';
    let baseIncentive = bookType === 'authored'
      ? Number(bookChapterPolicy.authoredIncentiveAmount) || 0
      : Number(bookChapterPolicy.editedIncentiveAmount) || 0;
    let basePoints = bookType === 'authored'
      ? Number(bookChapterPolicy.authoredPoints) || 0
      : Number(bookChapterPolicy.editedPoints) || 0;

    // Apply indexing bonuses
    if (formData.bookIndexingType === 'scopus_indexed' && bookChapterPolicy.indexingBonuses?.scopus_indexed) {
      baseIncentive += Number(bookChapterPolicy.indexingBonuses.scopus_indexed);
    } else if (formData.bookIndexingType === 'sgt_publication_house' && bookChapterPolicy.indexingBonuses?.sgt_publication_house) {
      baseIncentive += Number(bookChapterPolicy.indexingBonuses.sgt_publication_house);
    }

    // Apply international bonus
    if (formData.nationalInternational === 'international' && bookChapterPolicy.internationalBonus) {
      baseIncentive += Number(bookChapterPolicy.internationalBonus);
    }

    // Divide among all authors
    const otherAuthorsCount = coAuthors.filter(a => a.name).length;
    const totalAuthorCount = otherAuthorsCount + 1;
    const authorIncentive = Math.round(baseIncentive / totalAuthorCount);
    const authorPoints = Math.round(basePoints / totalAuthorCount);

    if (authorType === 'Student') {
      return { incentive: authorIncentive, points: 0 };
    }
    return { incentive: authorIncentive, points: authorPoints };
  };

  /**
   * Calculate incentive for RESEARCH PAPER authors
   */
  const calculateResearchPaperIncentive = (authorType: string, authorCategory: string, authorRole: string) => {
    // External authors get ZERO
    if (authorCategory === 'External') {
      return { incentive: 0, points: 0 };
    }

    // Default quartile-based incentives (fallback if policy not loaded)
    const defaultQuartileIncentives: Record<string, { incentiveAmount: number; points: number }> = {
      'TOP1': { incentiveAmount: 50000, points: 50 },
      'TOP5': { incentiveAmount: 50000, points: 50 },
      'Q1': { incentiveAmount: 50000, points: 50 },
      'Q2': { incentiveAmount: 30000, points: 30 },
      'Q3': { incentiveAmount: 15000, points: 15 },
      'Q4': { incentiveAmount: 5000, points: 5 },
    };

    // Use policy data if available, otherwise use defaults
    const quartileIncentives: Record<string, { incentiveAmount: number; points: number }> = {};
    if (policyData?.quartileIncentives && policyData.quartileIncentives.length > 0) {
      policyData.quartileIncentives.forEach(q => {
        quartileIncentives[q.quartile.toUpperCase()] = {
          incentiveAmount: q.incentiveAmount,
          points: q.points
        };
      });
      // TOP1, TOP5, and TOP10 use same incentives as Q1 from policy
      if (quartileIncentives['Q1']) {
        quartileIncentives['TOP1'] = { ...quartileIncentives['Q1'] };
        quartileIncentives['TOP5'] = { ...quartileIncentives['Q1'] };
        quartileIncentives['TOP10'] = { ...quartileIncentives['Q1'] };
      }
    } else {
      Object.assign(quartileIncentives, defaultQuartileIncentives);
    }

    // SJR-based incentives from policy (or default)
    const defaultSJRRanges = [
      { minSJR: 2.0, maxSJR: 999, incentiveAmount: 50000, points: 50 },
      { minSJR: 1.0, maxSJR: 1.99, incentiveAmount: 30000, points: 30 },
      { minSJR: 0.5, maxSJR: 0.99, incentiveAmount: 15000, points: 15 },
      { minSJR: 0.0, maxSJR: 0.49, incentiveAmount: 5000, points: 5 },
    ];
    const sjrRanges = policyData?.sjrRanges && policyData.sjrRanges.length > 0 
      ? policyData.sjrRanges 
      : defaultSJRRanges;

    // Role percentages for distribution from policy (or default)
    const defaultFirstAuthorPct = 35;
    const defaultCorrespondingAuthorPct = 30;
    
    let firstAuthorPct = defaultFirstAuthorPct;
    let correspondingAuthorPct = defaultCorrespondingAuthorPct;
    
    if (policyData?.rolePercentages && policyData.rolePercentages.length > 0) {
      const firstRole = policyData.rolePercentages.find(r => r.role === 'first_author');
      const corrRole = policyData.rolePercentages.find(r => r.role === 'corresponding_author');
      if (firstRole) firstAuthorPct = firstRole.percentage;
      if (corrRole) correspondingAuthorPct = corrRole.percentage;
    }
    
    const coAuthorTotalPct = 100 - firstAuthorPct - correspondingAuthorPct;
    
    // Get quartile and SJR values from form data
    const quartile = formData.quartile?.toUpperCase() || '';
    const sjrValue = Number(formData.sjr) || 0;
    
    // Determine base amounts - quartile is PRIMARY, SJR is FALLBACK
    let totalIncentive = 0;
    let totalPoints = 0;
    
    // Check quartile first (PRIMARY)
    if (quartile && quartileIncentives[quartile]) {
      totalIncentive = quartileIncentives[quartile].incentiveAmount;
      totalPoints = quartileIncentives[quartile].points;
      console.log(`[Calculation] Quartile ${quartile}: Total Pool = ₹${totalIncentive}, ${totalPoints} pts`);
    }
    // SJR is FALLBACK - only use if NO quartile provided
    else if (sjrValue > 0 && sjrRanges.length > 0) {
      const matchingRange = sjrRanges.find(range => sjrValue >= range.minSJR && sjrValue <= range.maxSJR);
      if (matchingRange) {
        totalIncentive = matchingRange.incentiveAmount;
        totalPoints = matchingRange.points;
        console.log(`[Calculation] SJR ${sjrValue}: Total Pool = ₹${totalIncentive}, ${totalPoints} pts`);
      }
    }
    
    // Final fallback if no quartile and no SJR match
    if (totalIncentive === 0 && sjrValue > 0 && sjrRanges.length > 0) {
      const fallbackRange = sjrRanges.find(range => sjrValue >= range.minSJR && sjrValue <= range.maxSJR) 
        || sjrRanges[sjrRanges.length - 1];
      totalIncentive = fallbackRange.incentiveAmount;
      totalPoints = fallbackRange.points;
    }
    
    // Analyze author composition
    const composition = analyzeAuthorCompositionFrontend();
    
    // Calculate percentage based on role
    let rolePercentage = 0;
    
    // Get total authors count (including applicant)
    const otherAuthorsCount = coAuthors.filter(a => a.name).length;
    const totalAuthorCount = otherAuthorsCount + 1; // +1 for applicant (you)
    
    // Check if we have exactly First + Corresponding (2 authors, no co-authors)
    // Need to check both the current author, co-authors array, AND the applicant's role
    const hasFirstAuthor = authorRole === 'first_author' || authorRole === 'first' || 
                          userAuthorType === 'first_author' || userAuthorType === 'first' ||
                          coAuthors.some(a => a.name && (a.authorRole === 'first_author' || a.authorRole === 'first'));
    const hasCorrespondingAuthor = authorRole === 'corresponding_author' || authorRole === 'corresponding' || 
                                   userAuthorType === 'corresponding_author' || userAuthorType === 'corresponding' ||
                                   coAuthors.some(a => a.name && (a.authorRole === 'corresponding_author' || a.authorRole === 'corresponding'));
    const hasCoAuthors = authorRole === 'co_author' || authorRole === 'co' ||
                        userAuthorType === 'co_author' || userAuthorType === 'co' ||
                        coAuthors.some(a => a.name && (a.authorRole === 'co_author' || a.authorRole === 'co'));
    const hasFirstAndCorresponding = authorRole === 'first_and_corresponding_author' || authorRole === 'first_and_corresponding' ||
                                     userAuthorType === 'first_and_corresponding_author' || userAuthorType === 'first_and_corresponding' ||
                                     coAuthors.some(a => a.name && (a.authorRole === 'first_and_corresponding_author' || a.authorRole === 'first_and_corresponding'));
    
    // Special case: exactly 2 authors (First + Corresponding, no co-authors) = 50-50 split
    const isTwoAuthorFirstCorrSplit = totalAuthorCount === 2 && hasFirstAuthor && hasCorrespondingAuthor && !hasCoAuthors && !hasFirstAndCorresponding;
    
    // Single internal author gets 100% (minus any lost external first/corresponding share)
    if (totalAuthorCount === 1) {
      rolePercentage = 100 - composition.externalFirstCorrespondingPct;
    }
    // Special case: Two authors only (First + Corresponding) = 50-50 split
    else if (isTwoAuthorFirstCorrSplit && (authorRole === 'first_author' || authorRole === 'first' || authorRole === 'corresponding_author' || authorRole === 'corresponding')) {
      rolePercentage = 50;
      console.log(`[Calculation] Two-author First+Corresponding split: 50-50`);
    }
    // First and Corresponding author (same person) gets BOTH percentages combined
    else if (authorRole === 'first_and_corresponding_author' || authorRole === 'first_and_corresponding') {
      rolePercentage = firstAuthorPct + correspondingAuthorPct;
    }
    // First author gets their percentage (when co-authors exist)
    else if (authorRole === 'first_author' || authorRole === 'first') {
      rolePercentage = firstAuthorPct;
    }
    // Corresponding author gets their percentage (when co-authors exist)
    else if (authorRole === 'corresponding_author' || authorRole === 'corresponding') {
      rolePercentage = correspondingAuthorPct;
    }
    // Co-authors split the remainder equally among INTERNAL co-authors only
    else if (authorRole === 'co_author' || authorRole === 'co') {
      // External co-author shares are redistributed to internal co-authors
      const effectiveInternalCoAuthorCount = Math.max(composition.internalCoAuthorCount, 1);
      rolePercentage = coAuthorTotalPct / effectiveInternalCoAuthorCount;
    }
    // Default fallback
    else {
      const effectiveInternalCoAuthorCount = Math.max(composition.internalCoAuthorCount, 1);
      rolePercentage = coAuthorTotalPct / effectiveInternalCoAuthorCount;
    }
    
    // Calculate this author's share based on role percentage
    // For incentives: use internalCoAuthorCount (includes students)
    const authorIncentive = Math.round((totalIncentive * rolePercentage) / 100);
    console.log(`[Calculation] ${authorRole}: ${rolePercentage}% of ₹${totalIncentive} = ₹${authorIncentive}`);
    
    // For points: use internalEmployeeCoAuthorCount (excludes students)
    // This ensures students don't reduce employee point shares
    let pointRolePercentage = rolePercentage;
    if (authorRole === 'co_author' || authorRole === 'co') {
      const effectiveEmployeeCoAuthorCount = Math.max(composition.internalEmployeeCoAuthorCount, 1);
      pointRolePercentage = coAuthorTotalPct / effectiveEmployeeCoAuthorCount;
    }
    const authorPoints = Math.round((totalPoints * pointRolePercentage) / 100);
    
    // RULE 2: Students get only incentives, no points (employees get both)
    if (authorType === 'Student') {
      return { incentive: authorIncentive, points: 0 };
    }
    
    // Faculty/Employees get both incentives and points
    return { incentive: authorIncentive, points: authorPoints };
  };

  /**
   * MAIN DISPATCHER: Routes to appropriate calculation function based on publication type
   */
  const calculateAuthorIncentivePoints = (authorType: string, authorCategory: string, authorRole: string) => {
    const pubType = formData.publicationType;

    // Route to appropriate calculation function
    if (pubType === 'conference_paper') {
      return calculateConferenceIncentive(authorType, authorCategory, authorRole);
    } else if (pubType === 'book') {
      return calculateBookIncentive(authorType, authorCategory);
    } else if (pubType === 'book_chapter') {
      return calculateBookChapterIncentive(authorType, authorCategory);
    } else if (pubType === 'research_paper') {
      return calculateResearchPaperIncentive(authorType, authorCategory, authorRole);
    }

    // Fallback: no calculation possible
    return { incentive: 0, points: 0 };
  };
  
  // Document upload state
  const [researchDocument, setResearchDocument] = useState<File | null>(null);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [presenterCertificate, setPresenterCertificate] = useState<File | null>(null);
  
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
    designation: '',
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
    // NEW: When Internal Co-Authors = 0 but there are internal authors to add (totalInternalAuthors > 1)
    // Reset authorRole to available role (should be First/Corresponding based on what user selected)
    else if (totalInternalCoAuthors === 0 && totalInternalAuthors > 1) {
      const availableRoles = getAvailableOtherAuthorRoles();
      setNewAuthor(prev => ({
        ...prev,
        authorCategory: 'Internal',
        authorType: 'Faculty',
        affiliation: 'SGT University',
        uid: '',
        authorRole: availableRoles.length > 0 ? availableRoles[0].value : 'corresponding_author'
      }));
    }
  }, [totalInternalAuthors, totalInternalCoAuthors, userAuthorType]);
  
  // Ensure authorCategory is set to Internal when all authors are internal
  useEffect(() => {
    if (totalAuthors === totalInternalAuthors && totalAuthors > 1) {
      setNewAuthor(prev => ({
        ...prev,
        authorCategory: 'Internal',
        authorType: 'Faculty',
        affiliation: 'SGT University'
      }));
    }
  }, [totalAuthors, totalInternalAuthors]);
  
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
    
    // Rule 3.5: 1 SGT author, 0 co-authors, and only 1 total author - must be First & Corresponding
    // For multiple authors: allow First, Corresponding, or both
    if (totalInternalAuthors === 1 && totalInternalCoAuthors === 0) {
      if (totalAuthors === 1) {
        return ['first_and_corresponding'];
      }
      // Multiple authors: user can be First, Corresponding, or Both
      return ['first_and_corresponding', 'first', 'corresponding'];
    }
    
    // Rule 3.6: Only 2 total authors AND both from SGT - one must be First & Corresponding, one must be Co-Author
    // This enforces proper role distribution for 2-author papers with both authors from SGT
    if (totalAuthors === 2 && totalInternalAuthors === 2) {
      return ['first_and_corresponding', 'co_author'];
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
    
    // Special case: Internal Co-Authors = 0, meaning NO co-authors allowed
    // The other internal author must be First or Corresponding (whichever the user didn't take)
    if (totalInternalCoAuthors === 0 && newAuthor.authorCategory === 'Internal') {
      const roles = [];
      
      // If user is First Author only, other must be Corresponding
      if (userAuthorType === 'first' || userAuthorType === 'first_author') {
        if (!usedRoles.includes('corresponding_author')) {
          roles.push({ value: 'corresponding_author', label: 'Corresponding Author' });
        }
      }
      // If user is Corresponding Author only, other must be First
      else if (userAuthorType === 'corresponding' || userAuthorType === 'corresponding_author') {
        if (!usedRoles.includes('first_author')) {
          roles.push({ value: 'first_author', label: 'First Author' });
        }
      }
      // If user is First & Corresponding, no more internal authors should be added
      // (This shouldn't happen since Internal Co-Authors should be 0)
      
      return roles;
    }
    
    // Special case: User selected First/Corresponding Author, there's only 1 internal co-author slot, AND only 2 total authors
    // The other internal author MUST be a co-author
    if (totalAuthors === 2 && totalInternalCoAuthors === 1 && userAuthorType !== 'co_author' && newAuthor.authorCategory === 'Internal') {
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
    fetchPolicy(); // Fetch policy on component mount
    if (contributionId) {
      fetchContribution();
    } else if (trackerId) {
      fetchTrackerData();
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
  }, [contributionId, trackerId, user]);

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

  const fetchPolicy = async () => {
    try {
      setPolicyLoading(true);
      
      // Fetch policy based on publication type
      if (publicationType === 'research_paper') {
        const response = await api.get('/research-policies/active/research_paper');
        if (response.data.success && response.data.data) {
          const policy = response.data.data;
          if (policy.indexingBonuses) {
            setPolicyData({
              quartileIncentives: policy.indexingBonuses.quartileIncentives || [],
              sjrRanges: policy.indexingBonuses.sjrRanges || [],
              rolePercentages: policy.indexingBonuses.rolePercentages || []
            });
            console.log('Research policy loaded:', policy.indexingBonuses);
          }
        }
      } else if (publicationType === 'book') {
        const response = await api.get('/book-policies/active');
        if (response.data.success && response.data.data) {
          setBookPolicy(response.data.data);
          console.log('Book policy loaded:', response.data.data);
        }
      } else if (publicationType === 'book_chapter') {
        const response = await api.get('/book-chapter-policies/active');
        if (response.data.success && response.data.data) {
          setBookChapterPolicy(response.data.data);
          console.log('Book chapter policy loaded:', response.data.data);
        }
      } else if (publicationType === 'conference_paper') {
        // Conference policies are loaded when conferenceSubType is selected
        // Set initial null state
        setConferencePolicy(null);
      }
    } catch (error) {
      console.error('Error fetching policy:', error);
      // Keep defaults if policy fetch fails
    } finally {
      setPolicyLoading(false);
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

  // Fetch conference policy when conferenceSubType changes
  const fetchConferencePolicy = async (subType: string) => {
    if (!subType || publicationType !== 'conference_paper') return;
    
    try {
      setPolicyLoading(true);
      const response = await api.get(`/conference-policies/active/${subType}`);
      if (response.data.success && response.data.data) {
        setConferencePolicy(response.data.data);
        console.log('Conference policy loaded:', response.data.data);
      } else {
        setConferencePolicy(null);
      }
    } catch (error) {
      console.error('Error fetching conference policy:', error);
      setConferencePolicy(null);
    } finally {
      setPolicyLoading(false);
    }
  };

  // Effect to fetch conference policy when conferenceSubType changes
  useEffect(() => {
    if (formData.conferenceSubType && publicationType === 'conference_paper') {
      fetchConferencePolicy(formData.conferenceSubType);
    }
  }, [formData.conferenceSubType, publicationType]);

  // Auto-set isPresenter to 'yes' when totalPresenters is 1
  useEffect(() => {
    if (formData.totalPresenters === 1 && formData.isPresenter !== 'yes') {
      setFormData(prev => ({ ...prev, isPresenter: 'yes' }));
    }
  }, [formData.totalPresenters]);

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
          numForeignUniversities: contrib.foreignCollaborationsCount || 0,
          impactFactor: contrib.impactFactor?.toString() || '',
          sjr: contrib.sjr?.toString() || '',
          quartile: contrib.quartile || '',
          isInterdisciplinary: contrib.interdisciplinaryFromSgt ? 'yes' : 'no',
          hasLpuStudents: contrib.studentsFromSgt ? 'yes' : 'no',
          journalName: contrib.journalName || '',
          // Conference fields
          conferenceSubType: contrib.conferenceSubType || '',
          conferenceName: contrib.conferenceName || '',
          proceedingsQuartile: contrib.proceedingsQuartile || 'na',
          conferenceType: contrib.conferenceType || 'national',
          conferenceBestPaperAward: contrib.conferenceBestPaperAward ? 'yes' : 'no',
          // Common fields
          issue: contrib.issue || '',
          pageNumbers: contrib.pageNumbers || '',
          doi: contrib.doi || '',
          issn: contrib.issn || '',
          publisherName: contrib.publisherName || '',
          publisherLocation: contrib.publisherLocation || '',
          publicationDate: contrib.publicationDate ? new Date(contrib.publicationDate).toISOString().split('T')[0] : '',
          publicationStatus: contrib.publicationStatus || 'published',
          sdgGoals: contrib.sdgGoals || [],
          schoolId: contrib.schoolId || '',
          departmentId: contrib.departmentId || '',
          mentorUid: contrib.mentorUid || '',
          mentorName: contrib.mentor?.displayName || '',
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

  const fetchTrackerData = async () => {
    if (!trackerId) return;
    try {
      setLoading(true);
      const response = await api.get(`/research-progress/${trackerId}`);
      if (response.data?.data) {
        const tracker = response.data.data;
        const typeData = tracker.researchPaperData || tracker.bookData || tracker.bookChapterData || tracker.conferencePaperData;
        
        if (!typeData) {
          setError('Tracker data not found');
          return;
        }

        // Map tracker data to form data based on publication type
        setFormData(prev => ({
          ...prev,
          title: tracker.title || '',
          schoolId: tracker.schoolId || '',
          departmentId: tracker.departmentId || '',
          // Research paper specific
          journalName: typeData.targetJournal || '',
          quartile: typeData.targetQuartile || '',
          targetedResearchType: typeData.targetIndexing || 'scopus', // Default to scopus if not specified
          // Conference specific
          conferenceName: typeData.targetConference || typeData.conferenceName || '',
          conferenceSubType: typeData.conferenceSubType || '',
          conferenceType: typeData.conferenceType || '',
          // Book specific
          bookTitle: typeData.bookTitle || typeData.title || '',
          bookPublicationType: typeData.bookType || 'authored',
          chapterTitle: typeData.chapterTitle || '',
          bookIndexingType: typeData.indexingType || '',
          // Common fields
          publicationStatus: 'published', // Tracker is marked published
          nationalInternational: typeData.hasInternationalCollaboration ? 'international' : 'national',
          hasLpuStudents: typeData.hasStudentInvolvement ? 'yes' : 'no',
          isInterdisciplinary: typeData.isInterdisciplinary ? 'yes' : 'no',
        }));

        // Map co-authors if they exist and are in array format
        if (typeData.coAuthors && Array.isArray(typeData.coAuthors)) {
          const mappedAuthors = typeData.coAuthors.map((author: any) => ({
            uid: author.uid || '',
            name: author.name || '',
            authorType: author.authorType || 'Faculty',
            authorCategory: author.authorCategory || 'Internal',
            email: author.email || '',
            affiliation: author.affiliation || 'SGT University',
            designation: author.designation || '',
            authorRole: 'co_author', // Default to co-author
          }));
          setCoAuthors(mappedAuthors);
          
          // Update counts based on mapped authors
          const internalCount = mappedAuthors.filter((a: any) => a.authorCategory === 'Internal').length;
          setTotalInternalCoAuthors(internalCount);
          setTotalAuthors(mappedAuthors.length + 1); // +1 for current user
          setTotalInternalAuthors(internalCount + 1); // +1 for current user
        }
      }
    } catch (error) {
      console.error('Error fetching tracker data:', error);
      setError('Failed to load tracker data');
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
      // For books/book chapters with 'Author' type, search both faculty and students
      let role: string;
      if (newAuthor.authorType === 'Author') {
        // Search all (will return both faculty and students)
        role = 'all';
      } else if (newAuthor.authorType === 'Student') {
        role = 'student';
      } else {
        role = 'faculty';
      }
      
      console.log('[searchAuthors] Searching for:', searchTerm, 'role:', role);
      const response = await researchService.searchUsers(searchTerm, role);
      console.log('[searchAuthors] Response received:', response);
      
      // Handle different response formats
      let userData = [];
      if (response && typeof response === 'object') {
        // Check if response has data property
        if (response.data && Array.isArray(response.data)) {
          userData = response.data;
        } 
        // Check if response has users property
        else if (response.users && Array.isArray(response.users)) {
          userData = response.users;
        }
        // Check if response itself is an array
        else if (Array.isArray(response)) {
          userData = response;
        }
      }
      
      console.log('[searchAuthors] Parsed user data:', userData);
      
      if (userData.length > 0) {
        setSearchSuggestions(userData);
        setShowSuggestions(true);
        console.log('[searchAuthors] Suggestions set, showing dropdown');
      } else {
        console.log('[searchAuthors] No users found');
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('[searchAuthors] Search error:', error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  const selectAuthorFromSuggestion = async (userData: any) => {
    console.log('[selectAuthorFromSuggestion] Selected user:', userData);
    
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
        authorRole: newAuthor.authorRole,
        designation: '',
      });
      return;
    }
    
    // userData from search has: uid, name, role, department, designation
    // Handle different property names (name vs displayName)
    const userName = userData.name || userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    const authorType = userData.role === 'student' ? 'Student' : 'Faculty';
    
    console.log('[selectAuthorFromSuggestion] Extracted name:', userName, 'authorType:', authorType);
    
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
      console.log('[selectAuthorFromSuggestion] Fetching full details for:', userData.uid);
      const fullData = await researchService.lookupByRegistration(userData.uid);
      console.log('[selectAuthorFromSuggestion] Full data response:', fullData);
      
      const fullUser = fullData.data || fullData; // Handle both wrapped and unwrapped responses
      
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
      
      console.log('[selectAuthorFromSuggestion] Setting author with email:', userEmail);
      
      setNewAuthor({
        uid: userData.uid,
        name: userName || fullUser?.displayName || '',
        authorType: authorType,
        authorCategory: 'Internal',
        email: userEmail,
        affiliation: 'SGT University',
        authorRole: newAuthor.authorRole,
        designation: userData.designation || '',
      });
    } catch (error) {
      console.error('[selectAuthorFromSuggestion] Error fetching full details:', error);
      // Fallback if full lookup fails - use data from search
      setNewAuthor({
        uid: userData.uid,
        name: userName,
        authorType: authorType,
        authorCategory: 'Internal',
        email: userData.email || '', // Try to use email from search if available
        affiliation: 'SGT University',
        authorRole: newAuthor.authorRole,
        designation: '',
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
        authorRole: newAuthor.authorRole,
        designation: '',
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
          authorRole: newAuthor.authorRole,
          designation: '',
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
        authorRole: newAuthor.authorRole,
        designation: '',
      });
      setError(`User not found with that ${newAuthor.authorType === 'Student' ? 'Registration Number' : 'UID'}`);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  const addOrUpdateAuthor = () => {
    console.log('[addOrUpdateAuthor] Attempting to add/update:', newAuthor);
    console.log('[addOrUpdateAuthor] Current state:', {
      totalAuthors,
      totalInternalAuthors,
      totalInternalCoAuthors,
      coAuthorsTotal: coAuthors.filter(a => a.name).length,
      internalCoAuthorsAdded: coAuthors.filter(a => a.name && a.authorCategory === 'Internal' && a.authorRole === 'co_author').length,
      internalTotal: coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length,
      externalAdded: coAuthors.filter(a => a.name && a.authorCategory === 'External').length
    });
    
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
      if (!newAuthor.designation) {
        setError('Designation is required for external authors');
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
      
      // Count internal CO-AUTHORS specifically (not all internal authors)
      const internalCoAuthorsAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal' && a.authorRole === 'co_author').length;
      const externalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'External').length;
      
      // Check if we've reached overall limit
      if (currentCount >= maxCoAuthors) {
        setError(`You can only add ${maxCoAuthors} co-author(s) based on your total author count of ${totalAuthors}`);
        return;
      }
      
      // For books and book chapters, skip role-based validation - all authors are equal
      const isBook = publicationType === 'book' || publicationType === 'book_chapter';
      
      // Check specific limits based on author category being added
      if (newAuthor.authorCategory === 'Internal') {
        // For books: simple check - just verify total internal authors don't exceed limit
        if (isBook) {
          const totalInternalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
          const maxInternalAuthors = totalInternalAuthors - 1; // Minus applicant
          
          if (totalInternalAdded >= maxInternalAuthors) {
            setError(`You can only add ${maxInternalAuthors} SGT author(s) total (based on SGT Authors = ${totalInternalAuthors}). You've already added ${totalInternalAdded}.`);
            console.log('[addOrUpdateAuthor] Total internal author limit reached:', { maxInternalAuthors, totalInternalAdded });
            return;
          }
        }
        // For research/conference papers: role-based validation
        else {
          // If adding a co-author, check against co-author limit
          if (newAuthor.authorRole === 'co_author') {
            // Internal Co-Authors field specifies how many internal co-authors are allowed
            const maxInternalCoAuthors = totalInternalCoAuthors;
            
            if (internalCoAuthorsAdded >= maxInternalCoAuthors) {
              const remaining = totalAuthors - 1 - currentCount; // Total slots minus applicant minus all added
              setError(`You can only add ${maxInternalCoAuthors} internal co-author(s). You've already added ${internalCoAuthorsAdded}. You can add ${remaining} more author(s) as External authors or Internal authors with other roles (First/Corresponding).`);
              console.log('[addOrUpdateAuthor] Internal co-author limit reached:', { maxInternalCoAuthors, internalCoAuthorsAdded, remaining });
              return;
            }
          }
          // For other internal roles (First, Corresponding), just check total SGT authors
          else {
            const totalInternalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
            // SGT Authors = total internal authors including applicant
            const maxInternalAuthors = totalInternalAuthors - 1; // Minus applicant
            
            if (totalInternalAdded >= maxInternalAuthors) {
              setError(`You can only add ${maxInternalAuthors} internal author(s) total (based on SGT Authors = ${totalInternalAuthors}). You've already added ${totalInternalAdded}.`);
              console.log('[addOrUpdateAuthor] Total internal author limit reached:', { maxInternalAuthors, totalInternalAdded });
              return;
            }
          }
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
      designation: '',
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
      designation: author.designation || '',
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
        designation: '',
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
            designation: '',
          }))
        ]);
      } else {
        // Remove excess slots
        setCoAuthors(prev => prev.slice(0, newCount));
      }
    }
  }, [totalInternalAuthors, totalInternalCoAuthors]);
  
  // Auto-switch to External when internal slots are full
  useEffect(() => {
    const totalInternalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
    const maxInternalToAdd = totalInternalAuthors - 1; // Minus applicant
    const internalSlotsFull = totalInternalAdded >= maxInternalToAdd;
    
    // If internal slots are full and currently set to Internal, switch to External
    if (internalSlotsFull && newAuthor.authorCategory === 'Internal' && totalAuthors > totalInternalAuthors) {
      console.log('[Auto-switch] Internal slots full, switching to External');
      const availableRoles = getAvailableOtherAuthorRoles();
      setNewAuthor(prev => ({
        ...prev,
        authorCategory: 'External',
        authorType: 'Academic',
        affiliation: '',
        uid: '',
        name: '',
        email: '',
        authorRole: availableRoles.length > 0 ? availableRoles[0].value : 'co_author',
        designation: '',
        isInternational: false,
      }));
      setError(`Internal author limit reached (${maxInternalToAdd} of ${maxInternalToAdd}). Remaining authors must be External.`);
    }
  }, [coAuthors, totalInternalAuthors, totalAuthors, newAuthor.authorCategory]);
  
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
          // External authors - Academic, Industry, or International Author
          if (coAuthor.authorType === 'Academic') authorType = 'external_academic';
          else if (coAuthor.authorType === 'Industry') authorType = 'external_industry';
          else if (coAuthor.authorType === 'International Author') authorType = 'external_international';
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
          designation: coAuthor.designation || null,
        });
      }
    });
    
    // Calculate author counts dynamically
    const totalAuthorsCount = authors.length;
    const internalAuthorsCount = authors.filter(a => a.authorType?.startsWith('internal_')).length;
    const internalCoAuthorsCount = internalAuthorsCount - 1; // Exclude current user
    
    console.log('[Frontend Submission] Conference fields being sent:', {
      conferenceSubType: formData.conferenceSubType,
      conferenceSubType_length: formData.conferenceSubType?.length,
      conferenceSubType_type: typeof formData.conferenceSubType,
      conferenceSubType_JSON: JSON.stringify(formData.conferenceSubType),
      proceedingsQuartile: formData.proceedingsQuartile,
      conferenceType: formData.conferenceType,
      conferenceBestPaperAward: formData.conferenceBestPaperAward
    });

    console.log('[Frontend Submission] Full formData state:', {
      publicationType: formData.publicationType,
      conferenceSubType: formData.conferenceSubType,
      conferenceName: formData.conferenceName,
      proceedingsQuartile: formData.proceedingsQuartile,
      conferenceType: formData.conferenceType
    });

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
      // Book/Book Chapter specific fields
      isbn: formData.isbn || null,
      edition: formData.edition || null,
      bookTitle: formData.bookTitle || null,
      chapterNumber: formData.chapterNumber || null,
      editors: formData.editors || null,
      nationalInternational: formData.nationalInternational || null,
      bookPublicationType: formData.bookPublicationType || null,
      bookIndexingType: formData.bookIndexingType || null,
      bookLetter: formData.bookLetter || null,
      communicatedWithOfficialId: formData.communicatedWithOfficialId,
      personalEmail: formData.personalEmail || null,
      facultyRemarks: formData.facultyRemarks || null,
      // Conference specific fields
      conferenceSubType: formData.conferenceSubType || null,
      conferenceName: formData.conferenceName || null,
      conferenceLocation: formData.conferenceLocation || null,
      conferenceDate: formData.conferenceDate ? new Date(formData.conferenceDate).toISOString() : null,
      proceedingsTitle: formData.proceedingsTitle || null,
      proceedingsQuartile: formData.proceedingsQuartile || null,
      totalPresenters: formData.totalPresenters ? Number(formData.totalPresenters) : null,
      isPresenter: formData.isPresenter,
      virtualConference: formData.virtualConference,
      fullPaper: formData.fullPaper,
      conferenceHeldAtSgt: formData.conferenceHeldAtSgt,
      conferenceBestPaperAward: formData.conferenceBestPaperAward,
      industryCollaboration: formData.industryCollaboration,
      centralFacilityUsed: formData.centralFacilityUsed,
      issnIsbnIssueNo: formData.issnIsbnIssueNo || null,
      paperDoi: formData.paperDoi || null,
      weblink: formData.weblink || null,
      paperweblink: formData.paperweblink || null,
      priorityFundingArea: formData.priorityFundingArea || null,
      conferenceRole: formData.conferenceRole || null,
      indexedIn: formData.indexedIn || null,
      conferenceHeldLocation: formData.conferenceHeldLocation || null,
      venue: formData.venue || null,
      topic: formData.topic || null,
      attendedVirtual: formData.attendedVirtual,
      eventCategory: formData.eventCategory || null,
      organizerRole: formData.organizerRole || null,
      conferenceType: formData.conferenceType || null,
      // SDG Goals
      sdgGoals: formData.sdgGoals.length > 0 ? formData.sdgGoals : null,
    };
    
    console.log('[Frontend buildSubmitData] Final data object:', {
      conferenceSubType: data.conferenceSubType,
      conferenceSubType_JSON: JSON.stringify(data.conferenceSubType),
      conferenceSubType_fromFormData: formData.conferenceSubType,
      proceedingsQuartile: data.proceedingsQuartile,
      conferenceType: data.conferenceType,
      publicationType: data.publicationType,
      conferenceName: data.conferenceName
    });

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
      if (contributionId && (researchDocument || supportingDocuments.length > 0 || presenterCertificate)) {
        const formData = new FormData();
        
        if (researchDocument) {
          formData.append('researchDocument', researchDocument);
        }
        
        supportingDocuments.forEach((file, index) => {
          formData.append('supportingDocuments', file);
        });

        if (presenterCertificate) {
          formData.append('presenterCertificate', presenterCertificate);
        }
        
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
    
    // Research paper specific validations
    if (publicationType === 'research_paper') {
      // Validate foreign universities vs external authors
      const numForeignUnis = Number(formData.numForeignUniversities) || 0;
      if (numForeignUnis > 0) {
        const externalAuthorsAdded = coAuthors.filter(a => a.name && a.authorCategory === 'External').length;
        if (externalAuthorsAdded < numForeignUnis) {
          setError(`You specified ${numForeignUnis} foreign universit${numForeignUnis > 1 ? 'ies' : 'y'} but only added ${externalAuthorsAdded} external author(s). Please add at least ${numForeignUnis} external author(s).`);
          return;
        }
      }
      
      if (!formData.journalName) {
        setError('Journal name is required');
        return;
      }
      
      // Validate weblink URL if provided (for research papers, publisherName is used for URL)
      if (formData.publisherName && !formData.publisherName.startsWith('https://')) {
        setError('Weblink URL must start with https://');
        return;
      }
    }
    
    // Book/Book Chapter specific validations
    if (publicationType === 'book' || publicationType === 'book_chapter') {
      if (!formData.isbn) {
        setError('ISBN is required for books');
        return;
      }
      
      if (!formData.publisherName) {
        setError('Publisher is required');
        return;
      }
      
      if (!formData.publicationDate) {
        setError('Publication date is required');
        return;
      }
      
      // Book chapter specific: require bookTitle
      if (publicationType === 'book_chapter' && !formData.bookTitle) {
        setError('Book title is required for book chapters');
        return;
      }
    }
    
    // Validate research document is uploaded
    if (!researchDocument && !currentId) {
      setError('Please upload the research document before submitting');
      return;
    }

    // Validate presenter certificate for paper_not_indexed when isPresenter = yes
    if (publicationType === 'conference_paper' && 
        formData.conferenceSubType === 'paper_not_indexed' && 
        formData.isPresenter === 'yes' && 
        !presenterCertificate) {
      setError('Please upload presenter certificate before submitting');
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
      if (researchDocument || supportingDocuments.length > 0 || presenterCertificate) {
        const formData = new FormData();
        
        if (researchDocument) {
          formData.append('researchDocument', researchDocument);
        }
        
        supportingDocuments.forEach((file, index) => {
          formData.append('supportingDocuments', file);
        });

        if (presenterCertificate) {
          formData.append('presenterCertificate', presenterCertificate);
        }
        
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
      book: 'Book Publication',
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
          {/* Publication Form - Professional */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Publication Details</h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Title - Changes based on publication type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {publicationType === 'book' ? 'Title of Book' : 
                   publicationType === 'book_chapter' ? 'Title of Chapter' : 'Title of Paper'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                  placeholder={publicationType === 'book' ? 'Enter the complete title of your book' : 
                               publicationType === 'book_chapter' ? 'Enter the complete title of your chapter' : 
                               'Enter the complete title of your research paper'}
                />
              </div>

          {/* Research Paper Specific Fields */}
          {publicationType === 'research_paper' && (
          <>
          {/* Research Details - All in One Box */}
          <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 space-y-5">
            {/* Row 1: Targeted Research & Interdisciplinary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Row 2: Conditional Fields (SJR, Quartile, Impact Factor) */}
            {(formData.targetedResearchType === 'scopus' || formData.targetedResearchType === 'both' || formData.targetedResearchType === 'wos') && (
              <div className="pt-3 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(formData.targetedResearchType === 'scopus' || formData.targetedResearchType === 'both') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SJR</label>
                        <input type="text" name="sjr" value={formData.sjr} onChange={handleInputChange}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="e.g. 0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quartile <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { value: 'top1', label: 'Top 1%' },
                            { value: 'top5', label: 'Top 5%' },
                            { value: 'q1', label: 'Q1' },
                            { value: 'q2', label: 'Q2' },
                            { value: 'q3', label: 'Q3' },
                            { value: 'q4', label: 'Q4' },
                          ].map(q => (
                            <label key={q.value} className="inline-flex items-center text-sm cursor-pointer">
                              <input type="radio" name="quartile" value={q.value}
                                checked={formData.quartile === q.value}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="ml-1 text-gray-700">{q.label}</span>
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
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="e.g. 2.5"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
          </>
          )}

          {/* Book / Book Chapter Specific Fields */}
          {(publicationType === 'book' || publicationType === 'book_chapter') && (
          <>
          {/* Policy Information Display */}
          {(publicationType === 'book' && bookPolicy) || (publicationType === 'book_chapter' && bookChapterPolicy) ? (
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Current {publicationType === 'book' ? 'Book' : 'Book Chapter'} Policy
                </h3>
              </div>
              
              {publicationType === 'book' && bookPolicy && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Authored Book</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Incentive:</span>
                        <span className="font-semibold text-green-600">₹{bookPolicy.authoredIncentiveAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points:</span>
                        <span className="font-semibold text-purple-600">{bookPolicy.authoredPoints}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Edited Book</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Incentive:</span>
                        <span className="font-semibold text-green-600">₹{bookPolicy.editedIncentiveAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points:</span>
                        <span className="font-semibold text-purple-600">{bookPolicy.editedPoints}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                    <h4 className="font-medium text-gray-700 mb-2">Bonuses</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <span className="block text-gray-600 mb-1">Scopus Indexed</span>
                        <span className="font-semibold text-blue-600">₹{bookPolicy.indexingBonuses?.scopus_indexed?.toLocaleString()}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-gray-600 mb-1">SGT Publication</span>
                        <span className="font-semibold text-blue-600">₹{bookPolicy.indexingBonuses?.sgt_publication_house?.toLocaleString()}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-gray-600 mb-1">International</span>
                        <span className="font-semibold text-blue-600">₹{bookPolicy.internationalBonus?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {publicationType === 'book_chapter' && bookChapterPolicy && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Authored Chapter</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Incentive:</span>
                        <span className="font-semibold text-green-600">₹{bookChapterPolicy.authoredIncentiveAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points:</span>
                        <span className="font-semibold text-purple-600">{bookChapterPolicy.authoredPoints}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Edited Chapter</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Incentive:</span>
                        <span className="font-semibold text-green-600">₹{bookChapterPolicy.editedIncentiveAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points:</span>
                        <span className="font-semibold text-purple-600">{bookChapterPolicy.editedPoints}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                    <h4 className="font-medium text-gray-700 mb-2">Bonuses</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <span className="block text-gray-600 mb-1">Scopus Indexed</span>
                        <span className="font-semibold text-blue-600">₹{bookChapterPolicy.indexingBonuses?.scopus_indexed?.toLocaleString()}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-gray-600 mb-1">SGT Publication</span>
                        <span className="font-semibold text-blue-600">₹{bookChapterPolicy.indexingBonuses?.sgt_publication_house?.toLocaleString()}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-gray-600 mb-1">International</span>
                        <span className="font-semibold text-blue-600">₹{bookChapterPolicy.internationalBonus?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-600 mt-2">
                <strong>Note:</strong> Final incentives will be calculated based on this policy and split among authors according to the split policy.
              </p>
            </div>
          ) : policyLoading ? (
            <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading policy information...</p>
            </div>
          ) : (
            <div className="p-5 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">No active policy found</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please contact the administrator to set up a {publicationType === 'book' ? 'book' : 'book chapter'} policy before submitting.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Book Details - All in One Box */}
          <div className="p-5 bg-gradient-to-r from-slate-50 to-green-50 rounded-xl border border-slate-200 space-y-5">
            {/* Row 1: Publication Type (Scopus/Non-indexed/SGT Publication House) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="bookIndexingType"
                  value={formData.bookIndexingType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  required
                >
                  <option value="scopus_indexed">Scopus Indexed</option>
                  <option value="non_indexed">Non-Indexed</option>
                  <option value="sgt_publication_house">SGT Publication House</option>
                </select>
              </div>

              {/* Show Our Authorized Publications only for non_indexed */}
              {formData.bookIndexingType === 'non_indexed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Our Authorized Publications <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="bookLetter" value="yes"
                      checked={formData.bookLetter === 'yes'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-green-600"
                      readOnly
                    />
                    <span className="ml-1.5 text-gray-700">Yes</span>
                  </label>
                  <label className="inline-flex items-center text-sm cursor-not-allowed opacity-50">
                    <input type="radio" name="bookLetter" value="no"
                      disabled
                      className="w-4 h-4 text-gray-400"
                    />
                    <span className="ml-1.5 text-gray-400">No</span>
                  </label>
                </div>
              </div>
              )}

              {/* Author Type - Not Applicable for book_chapter */}
              {publicationType === 'book' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="bookPublicationType"
                  value={formData.bookPublicationType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  required
                >
                  <option value="authored">Authored</option>
                  <option value="edited">Edited</option>
                </select>
              </div>
              )}
            </div>

            {/* Row 2: Interdisciplinary & Official ID Communication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Have you communicated the publication with official ID? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="communicatedWithOfficialId" value={v}
                        checked={formData.communicatedWithOfficialId === v}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Personal Email - Show only if not communicated with official ID */}
            {formData.communicatedWithOfficialId === 'no' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Personal Email ID <span className="text-red-500">*</span>
                </label>
                <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="Enter your personal email address"
                  required
                />
                <p className="text-xs text-orange-600 mt-1">Since you haven't communicated with official ID, please provide your personal email.</p>
              </div>
            )}

            {/* Book Chapter Specific: Book Title and Chapter Details */}
            {publicationType === 'book_chapter' && (
              <div className="pt-3 border-t border-slate-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Book Title <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="bookTitle" value={formData.bookTitle} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="Enter the title of the book containing your chapter"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chapter Number</label>
                    <input type="text" name="chapterNumber" value={formData.chapterNumber} onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                      placeholder="e.g. Chapter 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Numbers</label>
                    <input type="text" name="pageNumbers" value={formData.pageNumbers} onChange={handleInputChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                      placeholder="e.g. 100-125"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Editors</label>
                  <input type="text" name="editors" value={formData.editors} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="Enter editor names (comma separated)"
                  />
                </div>
              </div>
            )}

            {/* Publisher Details & National/International */}
            <div className="pt-3 border-t border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publisher <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="publisherName" value={formData.publisherName} onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="Enter publisher name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    National / International <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="nationalInternational"
                    value={formData.nationalInternational}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                    required
                  >
                    <option value="">-- Select --</option>
                    <option value="national">National</option>
                    <option value="international">International</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ISBN and Publication Date (removed Edition) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISBN <span className="text-red-500">*</span>
                </label>
                <input type="text" name="isbn" value={formData.isbn} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  placeholder="978-xxx-xxx-xxxx-x"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Date <span className="text-red-500">*</span>
                </label>
                <input type="date" name="publicationDate" value={formData.publicationDate} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  required
                />
                
              </div>
            </div>

            {/* Faculty Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Remarks</label>
              <textarea 
                name="facultyRemarks" 
                value={formData.facultyRemarks} 
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white resize-none"
                placeholder="Any additional remarks or comments about the publication..."
              />
            </div>
          </div>
          </>
          )}

          {/* Conference Paper Specific Fields */}
          {publicationType === 'conference_paper' && (
          <>
          {/* Conference Type Selection */}
          <div className="p-5 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border border-slate-200 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Please Select Conference Type <span className="text-red-500">*</span>
              </label>
              <select
                name="conferenceSubType"
                value={formData.conferenceSubType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                required
              >
                <option value="">-- Please Select --</option>
                <option value="paper_not_indexed">Papers in Conferences (not Indexed) / Seminars / Workshops</option>
                <option value="paper_indexed_scopus">Paper in conference proceeding indexed in Scopus</option>
                <option value="keynote_speaker_invited_talks">Keynote Speaker / Session chair / Invited Talks (Outside SGT)</option>
                <option value="organizer_coordinator_member">Organizer / Coordinator / Member of conference held at SGT</option>
              </select>
            </div>
            
            {/* Conference Policy Display */}
            {formData.conferenceSubType && conferencePolicy && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Current Incentive Policy</h4>
                </div>
                
                {formData.conferenceSubType === 'paper_indexed_scopus' && conferencePolicy.quartileIncentives ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-2">Quartile-based incentives (based on proceedings quartile):</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {conferencePolicy.quartileIncentives.map((qi: any) => (
                        <div key={qi.quartile} className="text-center p-2 bg-purple-50 rounded-lg">
                          <div className="text-xs font-medium text-purple-600">{qi.quartile}</div>
                          <div className="text-sm font-semibold text-gray-900">₹{Number(qi.incentiveAmount).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{qi.points} pts</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      {conferencePolicy.internationalBonus && (
                        <span className="text-gray-600">
                          <Globe className="w-4 h-4 inline mr-1 text-purple-500" />
                          International Bonus: <span className="font-medium text-green-600">₹{Number(conferencePolicy.internationalBonus).toLocaleString()}</span>
                        </span>
                      )}
                      {conferencePolicy.bestPaperAwardBonus && (
                        <span className="text-gray-600">
                          <Trophy className="w-4 h-4 inline mr-1 text-amber-500" />
                          Best Paper Award: <span className="font-medium text-green-600">₹{Number(conferencePolicy.bestPaperAwardBonus).toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600">Incentive Amount:</span>
                        <span className="font-semibold text-green-600">₹{Number(conferencePolicy.flatIncentiveAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-purple-600" />
                        <span className="text-gray-600">Points:</span>
                        <span className="font-semibold text-purple-600">{conferencePolicy.flatPoints || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      {conferencePolicy.internationalBonus && (
                        <span className="text-gray-600">
                          <Globe className="w-4 h-4 inline mr-1 text-purple-500" />
                          International Bonus: <span className="font-medium text-green-600">₹{Number(conferencePolicy.internationalBonus).toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {formData.conferenceSubType && !conferencePolicy && !policyLoading && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  No active policy configured for this conference type. Default incentives will be applied.
                </p>
              </div>
            )}
          </div>

          {/* Type 1 & 2: Paper in Conference (Not Indexed or Indexed in Scopus) */}
          {(formData.conferenceSubType === 'paper_not_indexed' || formData.conferenceSubType === 'paper_indexed_scopus') && (
          <div className="p-5 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border border-slate-200 space-y-5">
            {/* Title of Paper - Already covered by main title field */}
            
            {/* Conference Name & Proceedings Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name of Conference <span className="text-red-500">*</span>
                </label>
                <input type="text" name="conferenceName" value={formData.conferenceName} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Enter conference name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title of the Proceedings of Conference
                </label>
                <input type="text" name="proceedingsTitle" value={formData.proceedingsTitle} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Enter proceedings title"
                />
              </div>
            </div>

            {/* Priority Funding Area & Quartile (only for indexed) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority Areas of Funding</label>
                <input type="text" name="priorityFundingArea" value={formData.priorityFundingArea} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Enter priority funding area"
                />
              </div>
              {formData.conferenceSubType === 'paper_indexed_scopus' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please Mention the Proceedings Quartile <span className="text-red-500">*</span>
                </label>
                <select name="proceedingsQuartile" value={formData.proceedingsQuartile} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  required
                >
                  <option value="na">NA</option>
                  <option value="q1">Q1</option>
                  <option value="q2">Q2</option>
                  <option value="q3">Q3</option>
                  <option value="q4">Q4</option>
                </select>
              </div>
              )}
            </div>

            {/* Presenters & Role */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total No. of Presenter's</label>
                <input 
                  type="number" 
                  name="totalPresenters" 
                  value={formData.totalPresenters} 
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value > 2) {
                      setError('Maximum 2 presenters allowed');
                      return;
                    }
                    setError(null);
                    // If presenters = 1, auto-set isPresenter to 'yes'
                    if (value === 1) {
                      setFormData(prev => ({ ...prev, totalPresenters: value, isPresenter: 'yes' }));
                    } else {
                      handleInputChange(e);
                    }
                  }}
                  min="1" 
                  max="2"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Whether you are a Presenter?
                  {formData.totalPresenters === 1 && <span className="text-xs text-green-600 ml-1">(Auto-set to Yes)</span>}
                </label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className={`inline-flex items-center text-sm ${formData.totalPresenters === 1 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input 
                        type="radio" 
                        name="isPresenter" 
                        value={v}
                        checked={formData.isPresenter === v} 
                        onChange={handleInputChange}
                        disabled={formData.totalPresenters === 1}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>

                {/* Warning message when not a presenter */}
                {formData.conferenceSubType === 'paper_not_indexed' && formData.isPresenter === 'no' && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">No Incentive Policy Applicable</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Since you are not a presenter, this submission will follow the approval process but <strong>no incentive or research points will be awarded</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Presenter certificate upload when presenter = yes */}
                {formData.conferenceSubType === 'paper_not_indexed' && formData.isPresenter === 'yes' && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Presenter Certificate <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Please upload your presenter certificate to validate your participation.</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPresenterCertificate(e.target.files[0]);
                        }
                      }}
                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                    />
                    {presenterCertificate && (
                      <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>{presenterCertificate.name}</span>
                        <button
                          type="button"
                          onClick={() => setPresenterCertificate(null)}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Virtual Conference?</label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="virtualConference" value={v}
                        checked={formData.virtualConference === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Full Paper & National/International */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Paper</label>
                <div className="flex gap-4 mt-1">
                  <label className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="fullPaper" value="yes"
                      checked={formData.fullPaper === 'yes'} onChange={handleInputChange}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="ml-1.5 text-gray-700">Full Paper</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">National / International <span className="text-red-500">*</span></label>
                <div className="flex gap-4 mt-1">
                  {['national','international'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="conferenceType" value={v}
                        checked={formData.conferenceType === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Conference Location & Award */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Whether conference held at SGT?</label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="conferenceHeldAtSgt" value={v}
                        checked={formData.conferenceHeldAtSgt === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conference best paper Award?</label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="conferenceBestPaperAward" value={v}
                        checked={formData.conferenceBestPaperAward === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Interdisciplinary, Students, Industry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interdisciplinary (from SGT)?</label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="isInterdisciplinary" value={v}
                        checked={formData.isInterdisciplinary === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry?</label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="industryCollaboration" value={v}
                        checked={formData.industryCollaboration === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>



            {/* Official ID & Central Facility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Have you communicated the publication with official ID? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="communicatedWithOfficialId" value={v}
                        checked={formData.communicatedWithOfficialId === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Have you used the facility of Central Instrumentation Facility of SGT?</label>
                <div className="flex gap-4 mt-1">
                  {['yes','no'].map(v => (
                    <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="centralFacilityUsed" value={v}
                        checked={formData.centralFacilityUsed === v} onChange={handleInputChange}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Personal Email - Show only if not communicated with official ID */}
            {formData.communicatedWithOfficialId === 'no' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Personal Email ID <span className="text-red-500">*</span>
                </label>
                <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Enter your personal email address"
                  required
                />
                <p className="text-xs text-orange-600 mt-1">Since you haven't communicated with official ID, please provide your personal email.</p>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conference Date</label>
                <input type="date" name="conferenceDate" value={formData.conferenceDate} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Date <span className="text-red-500">*</span>
                </label>
                <input type="date" name="publicationDate" value={formData.publicationDate} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  required
                />
              
              </div>
            </div>

            {/* Publication Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ISSN/ISBN/Issue No</label>
                <input type="text" name="issnIsbnIssueNo" value={formData.issnIsbnIssueNo} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Enter ISSN/ISBN/Issue No"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page No</label>
                <input type="text" name="pageNumbers" value={formData.pageNumbers} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="e.g. 100-125"
                />
              </div>
            </div>

            {/* DOI & Weblinks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DOIs of Paper</label>
                <input type="text" name="paperDoi" value={formData.paperDoi} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Enter DOI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WebLink</label>
                <input type="url" name="weblink" value={formData.weblink} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Paper WebLink */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paper WebLink</label>
              <input type="url" name="paperweblink" value={formData.paperweblink} onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                placeholder="https://..."
              />
            </div>

            {/* Faculty Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Remarks</label>
              <textarea name="facultyRemarks" value={formData.facultyRemarks} onChange={handleInputChange}
                rows={3} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white resize-none"
                placeholder="Please mention the date and venue of conference..."
              />
            </div>
          </div>
          )}

          {/* Type 3: Keynote Speaker / Session Chair / Invited Talks */}
          {formData.conferenceSubType === 'keynote_speaker_invited_talks' && (
          <div className="p-5 bg-gradient-to-r from-slate-50 to-orange-50 rounded-xl border border-slate-200 space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'keynote_speaker', label: 'Keynote Speaker' },
                  { value: 'session_chair', label: 'Session Chair' },
                  { value: 'invited_speaker', label: 'Invited Speaker in Conference' },
                  { value: 'invited_panel_member', label: 'Invited Panel Member' },
                ].map(role => (
                  <label key={role.value} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="conferenceRole" value={role.value}
                      checked={formData.conferenceRole === role.value} onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="ml-1.5 text-gray-700">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Indexed In */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Indexed in <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'wos', label: 'WoS' },
                  { value: 'scopus', label: 'Scopus' },
                  { value: 'both', label: 'Both' },
                  { value: 'non_index', label: 'Non Index' },
                ].map(opt => (
                  <label key={opt.value} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="indexedIn" value={opt.value}
                      checked={formData.indexedIn === opt.value} onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="ml-1.5 text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Conference Held Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Conference Held <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'india', label: 'India' },
                  { value: 'abroad', label: 'Abroad' },
                ].map(opt => (
                  <label key={opt.value} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="conferenceHeldLocation" value={opt.value}
                      checked={formData.conferenceHeldLocation === opt.value} onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="ml-1.5 text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Conference Name & Venue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name of Conference <span className="text-red-500">*</span>
                </label>
                <input type="text" name="conferenceName" value={formData.conferenceName} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  placeholder="Enter conference name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input type="text" name="venue" value={formData.venue} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  placeholder="Enter venue"
                  required
                />
              </div>
            </div>

            {/* Date & Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Conference <span className="text-red-500">*</span>
                </label>
                <input type="date" name="conferenceDate" value={formData.conferenceDate} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  required
                />
                
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <input type="text" name="topic" value={formData.topic} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  placeholder="Enter topic"
                  required
                />
              </div>
            </div>

            {/* Virtual Conference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Whether you have attended Virtual Conference?</label>
              <div className="flex gap-4 mt-1">
                {['yes','no'].map(v => (
                  <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="attendedVirtual" value={v}
                      checked={formData.attendedVirtual === v} onChange={handleInputChange}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Type 4: Organizer/Coordinator/Member of Conference held at SGT */}
          {formData.conferenceSubType === 'organizer_coordinator_member' && (
          <div className="p-5 bg-gradient-to-r from-slate-50 to-cyan-50 rounded-xl border border-slate-200 space-y-5">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'conference', label: 'Conference' },
                  { value: 'seminar_symposia', label: 'Seminar/Symposia' },
                ].map(cat => (
                  <label key={cat.value} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="eventCategory" value={cat.value}
                      checked={formData.eventCategory === cat.value} onChange={handleInputChange}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <span className="ml-1.5 text-gray-700">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Role Selection based on Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {formData.eventCategory === 'seminar_symposia' ? 'Seminar/Symposia Role' : 'Role'} <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {formData.eventCategory === 'conference' ? (
                  // Conference roles
                  [
                    { value: 'chairman_chairperson', label: 'Chairman/Chairperson/Convener/Organizing Secretary' },
                    { value: 'joint_secretary', label: 'Joint Secretary' },
                    { value: 'committee_coordinators', label: 'Committee Coordinators' },
                    { value: 'committee_members', label: 'Committee Members' },
                    { value: 'session_chair', label: 'Session Chair' },
                  ].map(role => (
                    <label key={role.value} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="organizerRole" value={role.value}
                        checked={formData.organizerRole === role.value} onChange={handleInputChange}
                        className="w-4 h-4 text-cyan-600"
                      />
                      <span className="ml-1.5 text-gray-700">{role.label}</span>
                    </label>
                  ))
                ) : (
                  // Seminar/Symposia roles
                  [
                    { value: 'seminar_organizing_secretary', label: 'Seminar Organizing Secretary' },
                    { value: 'seminar_joint_organizing_secretary', label: 'Seminar Joint Organizing Secretary' },
                    { value: 'seminar_committee_coordinator', label: 'Seminar Committee Co-ordinator' },
                    { value: 'seminar_committee_member', label: 'Seminar Committee Member' },
                  ].map(role => (
                    <label key={role.value} className="inline-flex items-center text-sm cursor-pointer">
                      <input type="radio" name="organizerRole" value={role.value}
                        checked={formData.organizerRole === role.value} onChange={handleInputChange}
                        className="w-4 h-4 text-cyan-600"
                      />
                      <span className="ml-1.5 text-gray-700">{role.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Conference Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Conference Type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'national', label: 'National' },
                  { value: 'international', label: 'International' },
                ].map(opt => (
                  <label key={opt.value} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="conferenceType" value={opt.value}
                      checked={formData.conferenceType === opt.value} onChange={handleInputChange}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <span className="ml-1.5 text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Conference Name & Venue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name of Conference <span className="text-red-500">*</span>
                </label>
                <input type="text" name="conferenceName" value={formData.conferenceName} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  placeholder="Enter conference name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input type="text" name="venue" value={formData.venue} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  placeholder="Enter venue"
                  required
                />
              </div>
            </div>

            {/* Date & Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Conference <span className="text-red-500">*</span>
                </label>
                <input type="date" name="conferenceDate" value={formData.conferenceDate} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  required
                />
                
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topic
                </label>
                <input type="text" name="topic" value={formData.topic} onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  placeholder="Enter topic"
                />
              </div>
            </div>

            {/* Virtual Conference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Whether you have attended Virtual Conference?</label>
              <div className="flex gap-4 mt-1">
                {['yes','no'].map(v => (
                  <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="attendedVirtual" value={v}
                      checked={formData.attendedVirtual === v} onChange={handleInputChange}
                      className="w-4 h-4 text-cyan-600"
                    />
                    <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          )}
          </>
          )}

          {/* SDG Goals - Shown for all types */}
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

          {/* Publication Details Grid - Only for Research Papers */}
          {publicationType === 'research_paper' && (
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
              <label className="block text-sm font-medium text-gray-600 mb-2">Weblink (Publication URL)</label>
              <input type="url" name="weblink" value={formData.publisherName} onChange={(e) => {
                  const url = e.target.value;
                  // Allow empty or valid https URLs
                  if (url === '' || url.startsWith('https://') || url.startsWith('http://')) {
                    setFormData(prev => ({ ...prev, publisherName: url }));
                  }
                }}
                pattern="https://.*"
                className={`w-full px-3 py-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 ${formData.publisherName && !formData.publisherName.startsWith('https://') ? 'border-red-300' : 'border-gray-300'}`} 
                placeholder="https://doi.org/10.xxxx/xxxxx"
              />
              {formData.publisherName && !formData.publisherName.startsWith('https://') && (
                <p className="text-xs text-red-500 mt-1">URL must start with https://</p>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Author Information Section - For Research Papers, Conference Papers (Scopus), Books, and Book Chapters */}
      {(formData.publicationType === 'research_paper' || 
        (formData.publicationType === 'conference_paper' && formData.conferenceSubType === 'paper_indexed_scopus') ||
        formData.publicationType === 'book' ||
        formData.publicationType === 'book_chapter') && (
      <div>
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
        <div className={`bg-gradient-to-r ${formData.publicationType === 'conference_paper' ? 'from-purple-600 to-purple-700' : (formData.publicationType === 'book' || formData.publicationType === 'book_chapter') ? 'from-teal-600 to-teal-700' : 'from-emerald-600 to-emerald-700'} px-5 py-3`}>
          <h2 className="text-lg font-semibold text-white">Author Information</h2>
        </div>
        <div className="p-5">
        
        {/* Author Counts and Additional Info - All in One Box */}
        <div className={`p-5 bg-gradient-to-r ${formData.publicationType === 'conference_paper' ? 'from-gray-50 to-purple-50' : (formData.publicationType === 'book' || formData.publicationType === 'book_chapter') ? 'from-gray-50 to-teal-50' : 'from-gray-50 to-emerald-50'} rounded-xl border border-gray-100 space-y-5`}>
          {/* Row 1: Basic Author Counts */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Authors <span className="text-red-500">*</span></label>
              <input type="number" min="1" value={totalAuthors}
                onChange={(e) => {
                  if (hasAuthorsAdded) return;
                  const value = Number(e.target.value);
                  if (value < 1) { setError('Total authors must be at least 1'); return; }
                  setTotalAuthors(value);
                  if (totalInternalAuthors > value) { setTotalInternalAuthors(value); }
                }}
                disabled={hasAuthorsAdded}
                className={`w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 ${publicationType === 'book' || publicationType === 'book_chapter' ? 'focus:ring-teal-500' : 'focus:ring-emerald-500'} ${hasAuthorsAdded ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} placeholder="1"
                title={hasAuthorsAdded ? 'Remove all authors to change this field' : ''}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">SGT Authors <span className="text-red-500">*</span></label>
              <input type="number" min="1" max={totalAuthors} value={totalInternalAuthors}
                onChange={(e) => {
                  if (hasAuthorsAdded) return;
                  const value = Number(e.target.value);
                  if (value < 1) { setError('SGT affiliated authors must be at least 1 (you)'); return; }
                  if (value > totalAuthors) { setError('SGT affiliated authors cannot exceed total authors'); return; }
                  setTotalInternalAuthors(value);
                  const maxCoAuthors = totalAuthors === value ? value - 1 : value;
                  if (totalInternalCoAuthors > maxCoAuthors) { setTotalInternalCoAuthors(maxCoAuthors); }
                  setError(null);
                }}
                disabled={hasAuthorsAdded}
                className={`w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 ${publicationType === 'book' || publicationType === 'book_chapter' ? 'focus:ring-teal-500' : 'focus:ring-emerald-500'} ${hasAuthorsAdded ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} placeholder="1"
                title={hasAuthorsAdded ? 'Remove all authors to change this field' : ''}
              />
            </div>
            
            {/* Internal Co-Authors and Your Role - For Research Papers and Scopus Conference Papers */}
            {(publicationType === 'research_paper' || 
              (publicationType === 'conference_paper' && formData.conferenceSubType === 'paper_indexed_scopus')) && (
            <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Internal Co-Authors <span className="text-red-500">*</span>
                <span className="text-gray-400 ml-1 font-normal">(Max: {totalAuthors === totalInternalAuthors ? totalInternalAuthors - 1 : totalInternalAuthors})</span>
              </label>
              <input type="number" min="0"
                max={totalAuthors === totalInternalAuthors ? totalInternalAuthors - 1 : totalInternalAuthors}
                value={totalInternalCoAuthors}
                onChange={(e) => {
                  if (hasAuthorsAdded) return;
                  const value = Number(e.target.value);
                  const maxCoAuthors = totalAuthors === totalInternalAuthors ? totalInternalAuthors - 1 : totalInternalAuthors;
                  if (value < 0) { setError('Internal co-authors cannot be negative'); return; }
                  if (value > maxCoAuthors) { setError(`Internal co-authors cannot exceed ${maxCoAuthors}.`); return; }
                  
                  // Remove strict role-based validation during initial setup
                  // Only validate the basic count constraints
                  setTotalInternalCoAuthors(value);
                  setError(null);
                }}
                disabled={hasAuthorsAdded}
                className={`w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 ${publicationType === 'conference_paper' ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'} ${hasAuthorsAdded ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} placeholder="0"
                title={hasAuthorsAdded ? 'Remove all authors to change this field' : ''}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Your Role <span className="text-red-500">*</span></label>
              {getAllowedUserRoles().length === 1 || hasAuthorsAdded ? (
                <div className={`px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 ${hasAuthorsAdded ? 'cursor-not-allowed' : ''}`}
                  title={hasAuthorsAdded ? 'Remove all authors to change this field' : ''}
                >
                  {userAuthorType === 'first_and_corresponding' && 'First & Corresponding'}
                  {userAuthorType === 'corresponding' && 'Corresponding'}
                  {userAuthorType === 'first' && 'First Author'}
                  {userAuthorType === 'co_author' && 'Co-Author'}
                </div>
              ) : (
                <select value={userAuthorType} onChange={(e) => {
                  const newRole = e.target.value;
                  setUserAuthorType(newRole);
                  
                  // Auto-adjust Internal Co-Authors based on role selection
                  const remainingInternalAuthors = totalInternalAuthors - 1;
                  if (newRole === 'first_and_corresponding' || newRole === 'first_and_corresponding_author') {
                    // All remaining internal authors must be co-authors
                    setTotalInternalCoAuthors(remainingInternalAuthors);
                    setError(null);
                  }
                }}
                  className={`px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 ${publicationType === 'conference_paper' ? 'focus:ring-purple-500' : 'focus:ring-emerald-500'}`}
                >
                  {getAllowedUserRoles().includes('first_and_corresponding') && <option value="first_and_corresponding">First & Corresponding</option>}
                  {getAllowedUserRoles().includes('corresponding') && <option value="corresponding">Corresponding</option>}
                  {getAllowedUserRoles().includes('first') && <option value="first">First Author</option>}
                  {getAllowedUserRoles().includes('co_author') && <option value="co_author">Co-Author</option>}
                </select>
              )}
            </div>
            </>
            )}
            
            {/* For Books - Show equal distribution note */}
            {(publicationType === 'book' || publicationType === 'book_chapter') && (
              <div className="flex items-center text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-lg border border-teal-200">
                <Coins className="w-4 h-4 mr-2" />
                Incentive will be distributed equally among all SGT authors
              </div>
            )}
            
            {hasAuthorsAdded && (
              <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 mr-2" />
                Remove all added authors to modify these fields
              </div>
            )}
          </div>
          
          {/* Divider - Only for Research Papers and Conference Papers */}
          {(formData.publicationType === 'research_paper' || formData.publicationType === 'conference_paper') && (
          <>
          <div className="border-t border-gray-200"></div>
          
          {/* Row 2: Additional Author Information - Only for Research Papers and Conference Papers */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* International Author - Only show when there are external authors (Total > SGT) */}
            {totalAuthors > totalInternalAuthors && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                International Author <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {['yes','no'].map(v => (
                  <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                    <input type="radio" name="hasInternationalAuthor" value={v}
                      checked={formData.hasInternationalAuthor === v}
                      onChange={(e) => { 
                        handleInputChange(e); 
                        setError(null);
                        // Reset foreign universities if selecting No
                        if (v === 'no') {
                          setFormData(prev => ({ ...prev, numForeignUniversities: 0 }));
                        }
                      }}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Student(s) from SGT <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {['yes','no'].map(v => (
                  <label key={v} className="inline-flex items-center text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="hasLpuStudents" 
                      value={v}
                      checked={formData.hasLpuStudents === v}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span className="ml-1.5 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Foreign Universities - Only show when International Author is Yes */}
            {formData.hasInternationalAuthor === 'yes' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Foreign Universities Collaborated:
                  {formData.numForeignUniversities > 0 && (
                    <span className="text-orange-600 text-xs ml-1">
                      (Requires {formData.numForeignUniversities} external author{formData.numForeignUniversities > 1 ? 's' : ''})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  name="numForeignUniversities"
                  value={formData.numForeignUniversities}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;
                    const maxExternal = totalAuthors - totalInternalAuthors;
                    if (value < 0) {
                      setError('Foreign universities cannot be negative');
                      return;
                    }
                    if (value > maxExternal) {
                      setError(`Foreign universities cannot exceed ${maxExternal} (your total external authors)`);
                      return;
                    }
                    setFormData(prev => ({ ...prev, numForeignUniversities: value }));
                    setError(null);
                  }}
                  min="0"
                  max={totalAuthors - totalInternalAuthors}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="0"
                />
              </div>
            )}
          </div>
          </>
          )}
        </div>
        
        {/* Add Other Author's Detail - Compact */}
        {(totalAuthors > 1) && (
          <div className={`border ${publicationType === 'book' || publicationType === 'book_chapter' ? 'border-teal-300 bg-teal-50' : 'border-orange-300 bg-orange-50'} rounded p-3 mb-4`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Add Other Authors {editingAuthorIndex !== null && <span className="text-xs text-blue-600">(Editing)</span>}
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              {(() => {
                const maxCoAuthors = totalAuthors - 1;
                const currentAdded = coAuthors.filter(a => a.name).length;
                const internalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
                const externalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'External').length;
                
                // Calculate how many internal authors to add (excluding yourself)
                // Total SGT people = totalInternalAuthors (user) + totalInternalCoAuthors (additional SGT co-authors)
                const totalSGTPeople = totalInternalAuthors + totalInternalCoAuthors;
                const maxInternalToAdd = totalSGTPeople - 1;  // Exclude user
                const maxExternalToAdd = totalAuthors - totalSGTPeople;
                
                const parts = [];
                if (maxInternalToAdd > 0) {
                  parts.push(`${maxInternalToAdd} SGT author(s) [${internalAdded} added]`);
                }
                if (maxExternalToAdd > 0) {
                  parts.push(`${maxExternalToAdd} external author(s) [${externalAdded} added]`);
                }
                
                if (parts.length === 0) {
                  return `You are the only author.`;
                }
                
                return `You need to add ${parts.join(' and ')}. Total: ${currentAdded}/${maxCoAuthors} author(s) added.`;
              })()}
            </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Author Category - Internal/External */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {publicationType === 'book' || publicationType === 'book_chapter' ? 'Author From:' : 'Author Type:'} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                {(() => {
                  // Check if internal slots are full
                  const totalInternalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
                  // Total SGT people = totalInternalAuthors (user) + totalInternalCoAuthors (additional SGT co-authors)
                  const totalSGTPeople = totalInternalAuthors + totalInternalCoAuthors;
                  // Max internal to add = total SGT people - 1 (excluding the user)
                  const maxInternalToAdd = totalSGTPeople - 1;
                  const internalSlotsFull = totalInternalAdded >= maxInternalToAdd;
                  
                  // For books, simplified logic - just show Internal/External based on counts
                  const isBook = publicationType === 'book' || publicationType === 'book_chapter';
                  
                  return (
                    <>
                      {/* Show Internal option when there are internal slots available (maxInternalToAdd > 0) */}
                      {maxInternalToAdd > 0 && (
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="Internal"
                            checked={newAuthor.authorCategory === 'Internal' && !internalSlotsFull}
                            onChange={(e) => {
                              const availableRoles = getAvailableOtherAuthorRoles();
                              setNewAuthor(prev => ({ 
                                ...prev, 
                                authorCategory: e.target.value,
                                authorType: isBook ? 'Author' : 'Faculty',
                                affiliation: 'SGT University',
                                uid: '',
                                name: '',
                                email: '',
                                authorRole: isBook ? 'author' : (availableRoles.length > 0 ? availableRoles[0].value : 'first_and_corresponding')
                              }));
                              setSearchSuggestions([]);
                              setShowSuggestions(false);
                            }}
                            className={`w-4 h-4 ${isBook ? 'text-teal-600' : 'text-blue-600'}`}
                            disabled={internalSlotsFull}
                          />
                          <span className="ml-2">
                            {isBook ? 'SGT University' : 'Internal'}
                            {internalSlotsFull && <span className="text-red-600 text-xs ml-1">(Limit reached: {totalInternalAdded}/{maxInternalToAdd})</span>}
                          </span>
                        </label>
                      )}
                      {/* Show External option when there are external authors (totalAuthors > totalSGTPeople) */}
                      {totalAuthors > totalSGTPeople && (
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="External"
                            checked={newAuthor.authorCategory === 'External' || internalSlotsFull}
                            onChange={(e) => {
                              const availableRoles = getAvailableOtherAuthorRoles();
                              setNewAuthor(prev => ({ 
                                ...prev, 
                                authorCategory: e.target.value,
                                authorType: isBook ? 'Author' : 'Academic',
                                affiliation: '',
                                uid: '',
                                name: '',
                                email: '',
                                authorRole: isBook ? 'author' : (availableRoles.length > 0 ? availableRoles[0].value : 'co_author')
                              }));
                              setSearchSuggestions([]);
                              setShowSuggestions(false);
                            }}
                            className={`w-4 h-4 ${isBook ? 'text-teal-600' : 'text-blue-600'}`}
                          />
                          <span className="ml-2">
                            External
                            {internalSlotsFull && <span className="text-green-600 text-xs ml-1">(Auto-selected)</span>}
                          </span>
                        </label>
                      )}
                    </>
                  );
                })()}
              </div>
              {totalAuthors === (totalInternalAuthors + totalInternalCoAuthors) && totalAuthors > 1 && (
                <p className="text-xs text-blue-600 mt-1">
                  All authors are from SGT. External option is hidden.
                </p>
              )}
            </div>
            
            {/* Author Category Type - Different options for Internal vs External */}
            {/* Show for research papers and conference papers, not for books */}
            {(formData.publicationType === 'research_paper' || formData.publicationType === 'conference_paper') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {newAuthor.authorCategory === 'Internal' ? 'Select Type:' : 'Author category:'} <span className="text-red-500">*</span>
              </label>
              {newAuthor.authorCategory === 'Internal' ? (
                <div className="flex gap-6">
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
                      className={`w-4 h-4 ${formData.publicationType === 'conference_paper' ? 'text-purple-600' : 'text-blue-600'}`}
                    />
                    <span className="ml-2">Teacher</span>
                  </label>
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
                      className={`w-4 h-4 ${formData.publicationType === 'conference_paper' ? 'text-purple-600' : 'text-blue-600'}`}
                    />
                    <span className="ml-2">Student</span>
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
                  {formData.hasInternationalAuthor === 'yes' && (
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="International Author"
                        checked={newAuthor.authorType === 'International Author'}
                        onChange={(e) => {
                          setNewAuthor(prev => ({ 
                            ...prev, 
                            authorType: e.target.value
                          }));
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-2">International Author</span>
                    </label>
                  )}
                </div>
              )}
            </div>
            )}
            
            {/* Author Role - Only for Research Papers and Conference Papers */}
            {(formData.publicationType === 'research_paper' || formData.publicationType === 'conference_paper') && (
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
            )}
            
            {/* Registration Number / UID - Only show for Internal authors */}
            {newAuthor.authorCategory === 'Internal' && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newAuthor.authorType === 'Student' ? 'Reg No:' : (newAuthor.authorType === 'Author' ? 'UID/Reg No:' : 'UID:')} <span className="text-red-500">*</span>
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
                      authorRole: newAuthor.authorRole || currentRole,
                      designation: '',
                    });
                    
                    // Start search if enough characters
                    if (newUid.length >= 3) {
                      searchAuthors(newUid);
                    }
                  }}
                  onBlur={(e) => {
                    // Delay to allow clicking on suggestions
                    setTimeout(() => {
                      const uid = e.target.value;
                      // Only lookup if UID is complete (at least 5 characters) and no suggestions are showing
                      if (uid && uid.length >= 5 && !showSuggestions) {
                        lookupAuthor(uid);
                      }
                    }, 200);
                  }}
                  onFocus={() => {
                    if (newAuthor.uid.length >= 3 && searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder={newAuthor.authorType === 'Student' ? 'e.g., 12345678' : (newAuthor.authorType === 'Author' ? 'e.g., STF12345 or 12345678' : 'e.g., STF12345')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => {
                      // Handle different field names from backend
                      const displayName = suggestion.name || suggestion.displayName || `${suggestion.firstName || ''} ${suggestion.lastName || ''}`.trim();
                      const displayRole = suggestion.designation || suggestion.role || 'User';
                      const displayDept = suggestion.department || suggestion.departmentName || '';
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => selectAuthorFromSuggestion(suggestion)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {suggestion.uid} - {displayName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {displayRole} {displayDept && `• ${displayDept}`}
                          </div>
                        </div>
                      );
                    })}
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
                {newAuthor.authorCategory === 'Internal' ? 'Institute:' : 'Organization/Institute:'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newAuthor.affiliation}
                onChange={(e) => setNewAuthor(prev => ({ ...prev, affiliation: e.target.value }))}
                placeholder={newAuthor.authorCategory === 'Internal' ? 'SGT University' : 'Enter organization/institute name'}
                readOnly={newAuthor.authorCategory === 'Internal'}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${newAuthor.authorCategory === 'Internal' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
            
            {/* Designation - Only for External Authors */}
            {newAuthor.authorCategory === 'External' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAuthor.designation}
                  onChange={(e) => setNewAuthor(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g. Professor, Researcher, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          
          {/* Add Button */}
          <div className="mt-4 flex justify-end gap-3">
            {editingAuthorIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingAuthorIndex(null);
                  // Reset to appropriate defaults based on what authors can be added
                  const totalSGTPeople = totalInternalAuthors + totalInternalCoAuthors;
                  const maxInternalToAdd = totalSGTPeople - 1;
                  const internalAdded = coAuthors.filter(a => a.name && a.authorCategory === 'Internal').length;
                  const hasInternalSlots = internalAdded < maxInternalToAdd;
                  const defaultCategory = hasInternalSlots ? 'Internal' : 'External';
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
                    designation: '',
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
        
        {/* Incentive Preview Table - Show for Research Papers with quartile/sjr OR Conference Papers with proceedings quartile */}
        {((formData.publicationType === 'research_paper' && (formData.quartile || formData.sjr)) || 
          (formData.publicationType === 'conference_paper' && formData.conferenceSubType === 'paper_indexed_scopus' && formData.proceedingsQuartile)) && (
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className={`w-5 h-5 ${formData.publicationType === 'conference_paper' ? 'text-purple-600' : 'text-blue-600'}`} />
              Incentive & Points Preview
            </h3>
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
                      Role
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r">
                      <div className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-green-600" />
                        Incentive
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r">
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-blue-600" />
                        Points
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Applicant Row (Current User) - Always shown first */}
                  {(() => {
                    const applicantType = user?.userType === 'student' ? 'Student' : 'Faculty';
                    const { incentive, points } = calculateAuthorIncentivePoints(
                      applicantType,
                      'Internal',
                      userAuthorType
                    );
                    const roleLabel = 
                      userAuthorType === 'first_and_corresponding' ? 'First & Corresponding' :
                      userAuthorType === 'corresponding' ? 'Corresponding' :
                      userAuthorType === 'first' ? 'First Author' : 'Co-Author';
                    
                    return (
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r">
                          Internal
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r">
                          {applicantType}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 border-r">
                          {roleLabel}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r">
                          {user?.uid} - {user?.employee?.displayName || user?.student?.registrationNo || user?.firstName || 'You'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {user?.employeeDetails?.email || user?.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          SGT University
                        </td>
                        <td className="px-4 py-3 text-sm border-r">
                          <span className="text-green-600 font-bold">₹{incentive.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-sm border-r">
                          {applicantType !== 'Student' ? (
                            <span className="text-blue-600 font-bold">{points}</span>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium">No Points</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 italic">
                          (You)
                        </td>
                      </tr>
                    );
                  })()}
                  
                  {/* Other Authors */}
                  {coAuthors.filter(a => a.name).map((coAuthor, index) => {
                    const actualIndex = coAuthors.findIndex(a => a === coAuthor);
                    const { incentive, points } = calculateAuthorIncentivePoints(
                      coAuthor.authorType,
                      coAuthor.authorCategory,
                      coAuthor.authorRole || 'co_author'
                    );
                    const roleLabel = 
                      (coAuthor.authorRole === 'first_and_corresponding' || coAuthor.authorRole === 'first_and_corresponding_author') ? 'First & Corresponding' :
                      (coAuthor.authorRole === 'corresponding' || coAuthor.authorRole === 'corresponding_author') ? 'Corresponding' :
                      (coAuthor.authorRole === 'first' || coAuthor.authorRole === 'first_author') ? 'First Author' : 'Co-Author';
                    
                    return (
                      <tr key={actualIndex}>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {coAuthor.authorCategory}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {coAuthor.authorType}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r">
                          {roleLabel}
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
                        <td className="px-4 py-3 text-sm border-r">
                          {coAuthor.authorCategory === 'Internal' ? (
                            <span className="text-green-600 font-medium">₹{incentive.toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">₹0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm border-r">
                          {coAuthor.authorCategory === 'Internal' && coAuthor.authorType !== 'Student' ? (
                            <span className="text-blue-600 font-medium">{points}</span>
                          ) : coAuthor.authorCategory === 'Internal' && coAuthor.authorType === 'Student' ? (
                            <span className="text-gray-400 text-xs">No Points</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
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
                  
                  {/* Total Row */}
                  {(() => {
                    const applicantType = user?.userType === 'student' ? 'Student' : 'Faculty';
                    const applicantCalc = calculateAuthorIncentivePoints(applicantType, 'Internal', userAuthorType);
                    
                    let totalIncentive = applicantCalc.incentive;
                    let totalPoints = applicantCalc.points;
                    
                    coAuthors.filter(a => a.name).forEach(coAuthor => {
                      const { incentive, points } = calculateAuthorIncentivePoints(
                        coAuthor.authorType,
                        coAuthor.authorCategory,
                        coAuthor.authorRole || 'co_author'
                      );
                      totalIncentive += incentive;
                      totalPoints += points;
                    });
                    
                    return (
                      <tr className="bg-gray-100 font-bold">
                        <td colSpan={6} className="px-4 py-3 text-sm text-right border-r">
                          TOTAL
                        </td>
                        <td className="px-4 py-3 text-sm border-r">
                          <span className="text-green-700 font-bold">₹{totalIncentive.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-sm border-r">
                          <span className="text-blue-700 font-bold">{totalPoints}</span>
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Incentive Distribution Rules:</span><br/>
              • <strong>Single Author:</strong> Gets 100%<br/>
              • <strong>Exactly 2 Authors (no co-authors):</strong> Split 50-50<br/>
              • <strong>Same Person = First + Corresponding:</strong> Gets both percentages combined<br/>
              • <strong>Internal Faculty/Employees:</strong> Receive both Incentives (₹) and Points<br/>
              • <strong>Internal Students:</strong> Receive Incentives only (no Points)<br/>
              • <strong>External Authors:</strong> Receive neither Incentives nor Points<br/>
              • <strong>External First/Corresponding Author:</strong> Their share is forfeited (not redistributed)<br/>
              • <strong>External Co-Authors:</strong> Their share goes to Internal Co-Authors
            </p>
          </div>
        )}
      </div>
      </div>
      </div>
      )}



      {/* Document Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

          {/* Document Requirements Checklist for Scopus Conference Papers */}
          {publicationType === 'conference_paper' && formData.conferenceSubType === 'paper_indexed_scopus' && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">Document Submission Checklist (Mark before submit)</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="takeholderContents"
                    checked={formData.takeholderContents === 'yes'}
                    onChange={(e) => setFormData(prev => ({ ...prev, takeholderContents: e.target.checked ? 'yes' : 'no' }))}
                    className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <label className="text-sm text-gray-700">i. Takeholder Contents</label>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="frontPageWithAuthorAffiliation"
                    checked={formData.frontPageWithAuthorAffiliation === 'yes'}
                    onChange={(e) => setFormData(prev => ({ ...prev, frontPageWithAuthorAffiliation: e.target.checked ? 'yes' : 'no' }))}
                    className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <label className="text-sm text-gray-700">ii. Front page of the paper with author affiliation to be included</label>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="nameContainsSpecialCharacters"
                    checked={formData.nameContainsSpecialCharacters === 'yes'}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameContainsSpecialCharacters: e.target.checked ? 'yes' : 'no' }))}
                    className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <label className="text-sm text-gray-700">iii. Please ensure the name contains no special characters (accents, unicode, etc.)</label>
                </div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="confDatesVenue"
                    checked={formData.confDatesVenue === 'yes'}
                    onChange={(e) => setFormData(prev => ({ ...prev, confDatesVenue: e.target.checked ? 'yes' : 'no' }))}
                    className="w-4 h-4 mt-0.5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <label className="text-sm text-gray-700">iv. Please mention the date and venue of conference</label>
                </div>
              </div>
            </div>
          )}

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
