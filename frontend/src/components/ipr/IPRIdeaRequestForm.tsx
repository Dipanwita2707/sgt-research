'use client';

import React, { useState, useEffect, useRef } from 'react';
import { iprService, fileUploadService } from '@/services/ipr.service';
import { schoolService } from '@/services/school.service';
import { FileText, Upload, X, Plus, AlertCircle, CheckCircle, Eye, Download } from 'lucide-react';

// Define field configurations for each IPR type
const IPR_FIELD_CONFIG = {
  patent: {
    title: 'Patent Idea Request',
    showType: true,
    showTypeOfFiling: true,
    showSDG: true,
    typeOptions: [
      { value: 'phd', label: 'PhD' },
      { value: 'pg_project', label: 'PG Project' },
      { value: 'ug_project', label: 'UG Project' },
      { value: 'faculty_research', label: 'Faculty Research' },
      { value: 'industry_collaboration', label: 'Industry Collaboration' },
      { value: 'any_other', label: 'Any other' },
    ],
    filingTypes: [
      { value: 'provisional', label: 'Provisional' },
      { value: 'complete', label: 'Complete' },
    ],
    uploadLabel: 'Upload Annexure 1',
    uploadNote: 'Upload Only MS Word File *'
  },
  copyright: {
    title: 'Copyright Idea Request',
    showType: true,
    showTypeOfFiling: false,
    showSDG: false,
    typeOptions: [
      { value: 'literary_work', label: 'Literary Work' },
      { value: 'artistic_work', label: 'Artistic Work' },
      { value: 'musical_work', label: 'Musical Work' },
      { value: 'software', label: 'Computer Software' },
    ],
    filingTypes: [],
    uploadLabel: 'Upload Multiple Files in Zip',
    uploadNote: 'Upload Multiple Files in Zip like Annexures, Flag Report and Noc'
  },
  design: {
    title: 'Design Idea Request',
    showType: true,
    showTypeOfFiling: true,
    showSDG: false,
    typeOptions: [
      { value: 'product_design', label: 'Product Design' },
      { value: 'industrial_design', label: 'Industrial Design' },
      { value: 'ui_ux_design', label: 'UI/UX Design' },
      { value: 'architectural_design', label: 'Architectural Design' },
      { value: 'other', label: 'Other' },
    ],
    filingTypes: [
      { value: 'provisional', label: 'Provisional' },
      { value: 'complete', label: 'Complete' },
    ],
    uploadLabel: 'Upload Design Documents',
    uploadNote: 'Upload design drawings, images, or documentation'
  },
  trademark: {
    title: 'Trademark Idea Request',
    showType: true,
    showTypeOfFiling: false,
    showSDG: false,
    typeOptions: [
      { value: 'word_mark', label: 'Word Mark' },
      { value: 'logo_mark', label: 'Logo Mark' },
      { value: 'combined_mark', label: 'Combined Mark' },
      { value: 'service_mark', label: 'Service Mark' },
    ],
    filingTypes: [],
    uploadLabel: 'Upload Trademark Documents',
    uploadNote: 'Upload logo images and trademark documentation'
  },
};

const SDG_OPTIONS = [
  { value: 'sdg1', label: 'SDG1(No Poverty)' },
  { value: 'sdg2', label: 'SDG2(Zero Hunger)' },
  { value: 'sdg3', label: 'SDG3(Good Health and Well Being)' },
  { value: 'sdg4', label: 'SDG4(Quality Education)' },
  { value: 'sdg5', label: 'SDG5(Gender Equality)' },
  { value: 'sdg6', label: 'SDG6(Clean Water and Sanitation)' },
  { value: 'sdg7', label: 'SDG7(Affordable and Clean Energy)' },
  { value: 'sdg8', label: 'SDG8(Decent Work and Economic Growth)' },
  { value: 'sdg9', label: 'SDG9(Industry, Innovation and Infrastructure)' },
  { value: 'sdg10', label: 'SDG10(Reduced Inequalities)' },
  { value: 'sdg11', label: 'SDG11(Sustainable Cities and Communities)' },
  { value: 'sdg12', label: 'SDG12(Responsible Consumption and Production)' },
  { value: 'sdg13', label: 'SDG13(Climate Action)' },
  { value: 'sdg14', label: 'SDG14(Life Below Water)' },
  { value: 'sdg15', label: 'SDG15(Life on Land)' },
  { value: 'sdg16', label: 'SDG16(Peace, Justice and Strong Institutions)' },
  { value: 'sdg17', label: 'SDG17(Partnerships for the Goals)' },
];

const EMPLOYEE_TYPES = [
  { value: 'staff', label: 'Staff' },
  { value: 'student', label: 'Student' },
];

const EXTERNAL_OPTIONS = [
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'industry', label: 'Industry' },
];

const INSTITUTE_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'industry', label: 'Industry' },
  { value: 'government', label: 'Government' },
  { value: 'ngo', label: 'NGO' },
];

interface IPRIdeaRequestFormProps {
  initialType?: string;
}

export default function IPRIdeaRequestForm({ initialType = 'patent' }: IPRIdeaRequestFormProps) {
  const [activeTab, setActiveTab] = useState<'entry' | 'process'>('entry');
  const [formData, setFormData] = useState({
    ideaFor: initialType,
    type: '',
    typeOfFiling: '',
    sdg: [] as string[],
    title: '',
    description: '',
    remarks: '',
    
    // Employee Category
    employeeCategory: 'internal',
    
    // Internal Employee Fields
    employeeType: 'staff',
    uid: '',
    name: '',
    email: '',
    phone: '',
    universityDeptName: '',
    
    // Mentor details (only for students)
    mentorName: '',
    mentorUid: '',
    

    
    // External Employee Fields
    externalName: '',
    externalOption: 'national',
    instituteType: 'academic',
    companyName: '',
    externalEmail: '',
    externalPhone: '',
    
    // File
    annexureFile: null as File | null,
  });

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [sdgDropdownOpen, setSdgDropdownOpen] = useState(false);
  const [isCurrentUserStudent, setIsCurrentUserStudent] = useState(false);
  const [contributors, setContributors] = useState<any[]>([]);
  const [uidSuggestions, setUidSuggestions] = useState<any[]>([]);
  const [mentorSuggestions, setMentorSuggestions] = useState<any[]>([]);
  const [showUidSuggestions, setShowUidSuggestions] = useState(false);
  const [showMentorSuggestions, setShowMentorSuggestions] = useState(false);
  const sdgDropdownRef = useRef<HTMLDivElement>(null);
  const uidSuggestionsRef = useRef<HTMLDivElement>(null);
  const mentorSuggestionsRef = useRef<HTMLDivElement>(null);

  const config = IPR_FIELD_CONFIG[formData.ideaFor as keyof typeof IPR_FIELD_CONFIG] || IPR_FIELD_CONFIG.patent;

  useEffect(() => {
    if (activeTab === 'process') {
      fetchApplications();
    }
  }, [activeTab]);

  // Check if current user is a student
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsCurrentUserStudent(payload.role === 'student');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    checkUserRole();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sdgDropdownRef.current && !sdgDropdownRef.current.contains(event.target as Node)) {
        setSdgDropdownOpen(false);
      }
      if (uidSuggestionsRef.current && !uidSuggestionsRef.current.contains(event.target as Node)) {
        setShowUidSuggestions(false);
      }
      if (mentorSuggestionsRef.current && !mentorSuggestionsRef.current.contains(event.target as Node)) {
        setShowMentorSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await iprService.getMyApplications();
      setApplications(data.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };





  // Auto-fill user details when UID is entered
  const handleUidChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uid = e.target.value;
    setFormData(prev => ({ ...prev, uid }));

    // Show suggestions when typing 3+ characters
    if (uid.length >= 3) {
      try {
        const response = await fetch(`/api/v1/users/suggestions/${uid}`, {
          headers: {
            'Content-Type': 'application/json'
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUidSuggestions(result.data);
            setShowUidSuggestions(true);
          }
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setUidSuggestions([]);
      setShowUidSuggestions(false);
    }
  };

  // Select a user from suggestions
  const selectUserSuggestion = async (suggestion: any) => {
    setShowUidSuggestions(false);
    setFormData(prev => ({ ...prev, uid: suggestion.uid }));
    
    // Fetch full user details
    try {
      const response = await fetch(`/api/v1/users/search/${suggestion.uid}`, {
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const userData = result.data;
          setFormData(prev => ({
            ...prev,
            uid: suggestion.uid,
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            employeeType: userData.role === 'faculty' ? 'staff' : userData.role,
            universityDeptName: userData.department || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleMentorUidChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const mentorUid = e.target.value;
    setFormData(prev => ({ ...prev, mentorUid }));

    // Show suggestions when typing 3+ characters (only faculty for mentors)
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

  // Add contributor to the list and clear form fields
  const addContributor = () => {
    if (formData.employeeCategory === 'internal' && (!formData.uid || !formData.name)) {
      setError('Please fill UID and Name for internal contributors');
      return;
    }
    if (formData.employeeCategory === 'external' && (!formData.externalName || !formData.externalEmail)) {
      setError('Please fill Name and Email for external contributors');
      return;
    }

    const newContributor = {
      id: Date.now(),
      employeeCategory: formData.employeeCategory,
      employeeType: formData.employeeType,
      uid: formData.uid,
      name: formData.employeeCategory === 'internal' ? formData.name : formData.externalName,
      email: formData.employeeCategory === 'internal' ? formData.email : formData.externalEmail,
      phone: formData.employeeCategory === 'internal' ? formData.phone : formData.externalPhone,
      universityDeptName: formData.universityDeptName,
      externalOption: formData.externalOption,
      instituteType: formData.instituteType,
      companyName: formData.companyName,
    };

    setContributors(prev => [...prev, newContributor]);
    
    // Clear form fields for next contributor
    setFormData(prev => ({
      ...prev,
      uid: '',
      name: '',
      email: '',
      phone: '',
      universityDeptName: '',
      externalName: '',
      externalEmail: '',
      externalPhone: '',
      companyName: '',
    }));
    
    setError('');
  };

  // Remove contributor from list
  const removeContributor = (id: number) => {
    setContributors(prev => prev.filter(c => c.id !== id));
  };



  const handleSDGChange = (sdgValue: string) => {
    setFormData(prev => ({
      ...prev,
      sdg: prev.sdg.includes(sdgValue)
        ? prev.sdg.filter(s => s !== sdgValue)
        : [...prev.sdg, sdgValue]
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, annexureFile: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consentChecked) {
      setError('Please confirm that the work has been done at SGT University');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let annexureFilePath = '';
      if (formData.annexureFile) {
        setUploading(true);
        try {
          annexureFilePath = await fileUploadService.uploadFile(formData.annexureFile, 'ipr/annexures');
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          setUploading(false);
          setError('File upload failed. AWS S3 service is not configured. Your application will be saved without the file attachment.');
          // Continue without file upload
        }
        setUploading(false);
      }

      const applicationData = {
        applicantType: 'internal_faculty',
        iprType: formData.ideaFor as 'patent' | 'copyright' | 'trademark',
        projectType: formData.type || 'faculty_research',
        filingType: formData.typeOfFiling || 'provisional',
        title: formData.title,
        description: formData.description,
        remarks: formData.remarks,
        
        sdgs: formData.sdg.map(code => ({
          code,
          title: SDG_OPTIONS.find(s => s.value === code)?.label || ''
        })),
        
        applicantDetails: formData.employeeCategory === 'internal' ? {
          employeeCategory: 'teaching',
          employeeType: formData.employeeType,
          uid: formData.uid,
          email: formData.email,
          phone: formData.phone,
          universityDeptName: formData.universityDeptName,
          mentorName: formData.mentorName,
          mentorUid: formData.mentorUid,
        } : {
          externalName: formData.externalName,
          externalOption: formData.externalOption,
          instituteType: formData.instituteType,
          companyUniversityName: formData.companyName,
          externalEmail: formData.externalEmail,
          externalPhone: formData.externalPhone,
        },
        
        contributors: contributors,
        
        annexureFilePath,
        supportingDocsFilePaths: [],
      };

      const application = await iprService.createApplication(applicationData);
      await iprService.submitApplication(application.id);
      
      setSuccess(`${config.title} submitted successfully!`);
      
      // Reset form
      setFormData({
        ideaFor: initialType,
        type: '',
        typeOfFiling: '',
        sdg: [],
        title: '',
        description: '',
        remarks: '',
        employeeCategory: 'internal',
        employeeType: 'staff',
        uid: '',
        name: '',
        email: '',
        phone: '',
        universityDeptName: '',
        mentorName: '',
        mentorUid: '',
        externalName: '',
        externalOption: 'national',
        instituteType: 'academic',
        companyName: '',
        externalEmail: '',
        externalPhone: '',
        annexureFile: null,
      });
      setConsentChecked(false);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit IPR request');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-orange-600">{config.title}</h1>
                <p className="text-gray-600 text-sm">SGT University</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-gray-100 px-2 py-1 rounded">🏠 UMS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-300 mb-6">
          <nav className="flex space-x-8">
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'entry'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('entry')}
            >
              Idea Request Entry
            </button>
            <button
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'process'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('process')}
            >
              Already in Process
            </button>
          </nav>
        </div>

        {activeTab === 'entry' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Row - 4 columns */}
            <div className="grid grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Idea For<span className="text-red-500">*</span>
                </label>
                <select
                  name="ideaFor"
                  value={formData.ideaFor}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                >
                  <option value="patent">Patent</option>
                  <option value="copyright">Copyright</option>
                  <option value="design">Design</option>
                  <option value="trademark">Trademark</option>
                </select>
              </div>

              {config.showType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type<span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Type</option>
                    {config.typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {config.showTypeOfFiling && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type of Filing<span className="text-red-500">*</span>
                  </label>
                  <select
                    name="typeOfFiling"
                    value={formData.typeOfFiling}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Filing Type</option>
                    {config.filingTypes.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {config.showSDG && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SDG<span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={sdgDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setSdgDropdownOpen(!sdgDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-left bg-white flex justify-between items-center"
                    >
                      <span>
                        {formData.sdg.length > 0 
                          ? `${formData.sdg.length} SDG${formData.sdg.length > 1 ? 's' : ''} selected`
                          : 'Select SDG*'
                        }
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${sdgDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {sdgDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                        {SDG_OPTIONS.map(sdg => (
                          <label key={sdg.value} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.sdg.includes(sdg.value)}
                              onChange={() => handleSDGChange(sdg.value)}
                              className="mr-2"
                            />
                            <span className="text-sm">{sdg.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Second Row - Title, Description, Remarks, Upload */}
            <div className="grid grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title<span className="text-red-500">*</span></label>
                <textarea
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description<span className="text-red-500">*</span></label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks<span className="text-red-500">*</span></label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{config.uploadLabel}</label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                  <button type="button" className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm mb-2">
                    Download Annexure 1 Sample
                  </button>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="w-full text-sm"
                    accept={formData.ideaFor === 'patent' ? '.doc,.docx' : '.zip,.pdf,.doc,.docx'}
                  />
                  <p className="text-xs text-red-600 mt-1">{config.uploadNote}</p>
                </div>
              </div>
            </div>

            {/* Employee Details Section - Add Other Inventor Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Other Inventor Details</h3>
              <div className="grid grid-cols-4 gap-6 mb-4">
                {/* Employee Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Category<span className="text-red-500">*</span></label>
                  <select
                    name="employeeCategory"
                    value={formData.employeeCategory}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  >
                    <option value="internal">INTERNAL</option>
                    <option value="external">EXTERNAL</option>
                  </select>
                </div>

                {/* Conditional Fields based on Employee Category */}
                {formData.employeeCategory === 'internal' ? (
                  <>
                    {/* Internal Employee Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type<span className="text-red-500">*</span></label>
                      <select
                        name="employeeType"
                        value={formData.employeeType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {EMPLOYEE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative" ref={uidSuggestionsRef}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.employeeType === 'student' ? 'Registration Number' : 'UID/VID'}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="uid"
                        value={formData.uid}
                        onChange={handleUidChange}
                        onFocus={() => formData.uid.length >= 3 && setShowUidSuggestions(true)}
                        placeholder={formData.employeeType === 'student' ? 'Enter Registration Number' : 'Enter UID/VID'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        autoComplete="off"
                      />
                      {/* UID Suggestions Dropdown */}
                      {showUidSuggestions && uidSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                          {uidSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              onClick={() => selectUserSuggestion(suggestion)}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{suggestion.uid}</div>
                              <div className="text-xs text-gray-600">{suggestion.name} - {suggestion.department}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Auto-filled from UID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        readOnly
                      />
                    </div>

                  </>
                ) : (
                  <>
                    {/* External Employee Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="externalName"
                        value={formData.externalName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option<span className="text-red-500">*</span></label>
                      <select
                        name="externalOption"
                        value={formData.externalOption}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {EXTERNAL_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name<span className="text-red-500">*</span></label>
                      <select
                        name="instituteType"
                        value={formData.instituteType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {INSTITUTE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>


                  </>
                )}
              </div>

              {/* Second row of fields */}
              <div className="grid grid-cols-3 gap-6">
                {formData.employeeCategory === 'internal' ? (
                  <>
                    {/* Internal Employee Fields Row 2 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail<span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone<span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University/Department Name<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="universityDeptName"
                        value={formData.universityDeptName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* External Employee Fields Row 2 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail<span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        name="externalEmail"
                        value={formData.externalEmail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone<span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        name="externalPhone"
                        value={formData.externalPhone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name/University<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Mentor section - only for logged-in students */}
              {isCurrentUserStudent && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Mentor Details (Optional for Students)</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="relative" ref={mentorSuggestionsRef}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mentor UID (Faculty Only)</label>
                      <input
                        type="text"
                        name="mentorUid"
                        value={formData.mentorUid}
                        onChange={handleMentorUidChange}
                        onFocus={() => formData.mentorUid.length >= 3 && setShowMentorSuggestions(true)}
                        placeholder="Enter Mentor's UID (Faculty)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        autoComplete="off"
                      />
                      {/* Mentor Suggestions Dropdown - Only Faculty */}
                      {showMentorSuggestions && mentorSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                          {mentorSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              onClick={() => selectMentorSuggestion(suggestion)}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{suggestion.uid}</div>
                              <div className="text-xs text-gray-600">{suggestion.name} - {suggestion.department}</div>
                              <div className="text-xs text-green-600">{suggestion.designation}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Name</label>
                      <input
                        type="text"
                        name="mentorName"
                        value={formData.mentorName}
                        onChange={handleInputChange}
                        placeholder="Auto-filled from UID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Add Other Details Button */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={addContributor}
                  className="bg-orange-500 text-white px-6 py-2 rounded-md hover:bg-orange-600"
                >
                  Add Other Details
                </button>
              </div>

              {/* Contributors Table */}
              {contributors.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Added Contributors</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 bg-white rounded-md">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 border text-sm font-medium text-gray-700">Category</th>
                          <th className="px-4 py-2 border text-sm font-medium text-gray-700">Type</th>
                          <th className="px-4 py-2 border text-sm font-medium text-gray-700">UID/Name</th>
                          <th className="px-4 py-2 border text-sm font-medium text-gray-700">Email</th>
                          <th className="px-4 py-2 border text-sm font-medium text-gray-700">Phone</th>
                          <th className="px-4 py-2 border text-sm font-medium text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributors.map((contributor) => (
                          <tr key={contributor.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border text-sm">{contributor.employeeCategory.toUpperCase()}</td>
                            <td className="px-4 py-2 border text-sm">{contributor.employeeType || contributor.externalOption}</td>
                            <td className="px-4 py-2 border text-sm">
                              {contributor.uid ? `${contributor.uid} - ${contributor.name}` : contributor.name}
                            </td>
                            <td className="px-4 py-2 border text-sm">{contributor.email}</td>
                            <td className="px-4 py-2 border text-sm">{contributor.phone}</td>
                            <td className="px-4 py-2 border text-sm">
                              <button
                                type="button"
                                onClick={() => removeContributor(contributor.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded-sm hover:bg-red-600 text-xs"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Section */}
            <div className="border-t pt-6">
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mr-3 mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I here by confirm that the work has been done in SGT University and I give my full consent for the filing of Intellectual Property Rights from SGT University.
                  </span>
                </label>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  type="submit"
                  disabled={loading || uploading || !consentChecked}
                  className="bg-green-600 text-white px-8 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300"
                >
                  {uploading ? 'Uploading...' : loading ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type="button"
                  className="bg-gray-600 text-white px-8 py-2 rounded-md hover:bg-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'process' && (
          <div className="bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Serial No</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Id</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Entry Date</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">IdeaForType</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">Incentives</th>
                    <th className="px-4 py-2 border text-xs font-medium text-gray-500 uppercase">View Details</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No applications found
                      </td>
                    </tr>
                  ) : (
                    applications.filter(app => app && app.id).map((app, index) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border text-sm text-center">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 border text-sm font-mono">
                          {app.id ? app.id.slice(-8) : 'N/A'}
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded uppercase font-medium">
                            {app.iprType}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {app.filingType} • {app.projectType?.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-gray-700 font-medium mt-1 truncate" title={app.title}>
                            {app.title}
                          </div>
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium ${
                            app.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            app.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                            app.status === 'under_drd_review' ? 'bg-yellow-100 text-yellow-800' :
                            app.status === 'drd_approved' ? 'bg-green-100 text-green-800' :
                            app.status === 'under_dean_review' ? 'bg-purple-100 text-purple-800' :
                            app.status === 'dean_approved' ? 'bg-green-100 text-green-800' :
                            app.status === 'completed' ? 'bg-green-100 text-green-800' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            app.status === 'changes_required' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {app.status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                          {app.submittedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Submitted: {new Date(app.submittedAt).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 border text-sm">
                          {app.pointsAwarded || app.incentiveAmount ? (
                            <div className="space-y-1">
                              <div className="flex items-center text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span className="font-medium text-xs">
                                  {app.pointsAwarded || 0} Points
                                </span>
                              </div>
                              <div className="text-xs text-green-600 font-medium">
                                ₹{app.incentiveAmount || 0}
                              </div>
                              {app.creditedAt && (
                                <div className="text-xs text-gray-500">
                                  Credited: {new Date(app.creditedAt).toLocaleDateString('en-IN')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic">
                              {app.status === 'drd_approved' || app.status === 'completed' ? 'Processing...' : 'Pending approval'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 border text-sm text-center">
                          <button
                            onClick={() => window.location.href = `/ipr/applications/${app.id}`}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}