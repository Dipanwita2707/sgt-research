'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { iprService, fileUploadService } from '@/services/ipr.service';
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

// SDG Options
const SDG_OPTIONS = [
  { code: '1', title: 'No Poverty' },
  { code: '2', title: 'Zero Hunger' },
  { code: '3', title: 'Good Health and Well-being' },
  { code: '4', title: 'Quality Education' },
  { code: '5', title: 'Gender Equality' },
  { code: '6', title: 'Clean Water and Sanitation' },
  { code: '7', title: 'Affordable and Clean Energy' },
  { code: '8', title: 'Decent Work and Economic Growth' },
  { code: '9', title: 'Industry, Innovation and Infrastructure' },
  { code: '10', title: 'Reduced Inequalities' },
  { code: '11', title: 'Sustainable Cities and Communities' },
  { code: '12', title: 'Responsible Consumption and Production' },
  { code: '13', title: 'Climate Action' },
  { code: '14', title: 'Life Below Water' },
  { code: '15', title: 'Life on Land' },
  { code: '16', title: 'Peace, Justice and Strong Institutions' },
  { code: '17', title: 'Partnerships for the Goals' },
];

interface EditApplicationPageProps {
  params: { id: string };
}

export default function EditApplicationPage({ params }: EditApplicationPageProps) {
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    remarks: '',
    projectType: '',
    filingType: '',
    selectedSdgs: [] as string[],
  });
  
  const [annexureFile, setAnnexureFile] = useState<File | null>(null);

  useEffect(() => {
    fetchApplication();
  }, [params.id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const data = await iprService.getMyApplicationById(params.id);
      setApplication(data);
      
      // Populate form with existing data
      setFormData({
        title: data.title || '',
        description: data.description || '',
        remarks: data.remarks || '',
        projectType: data.projectType || '',
        filingType: data.filingType || '',
        selectedSdgs: data.sdgs?.map((s: any) => s.code) || [],
      });
    } catch (error: any) {
      console.error('Error fetching application:', error);
      setError(error.response?.data?.message || 'Failed to load application. You may not have permission to edit this application.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSdgToggle = (code: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSdgs: prev.selectedSdgs.includes(code)
        ? prev.selectedSdgs.filter(s => s !== code)
        : [...prev.selectedSdgs, code]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Upload new annexure if provided
      let annexureFilePath = application?.annexureFilePath;
      if (annexureFile) {
        annexureFilePath = await fileUploadService.uploadFile(annexureFile, 'ipr/annexures');
      }

      // Prepare update data
      const updateData = {
        title: formData.title,
        description: formData.description,
        remarks: formData.remarks,
        projectType: formData.projectType,
        filingType: formData.filingType,
        sdgs: formData.selectedSdgs.map(code => ({
          code,
          title: SDG_OPTIONS.find(s => s.code === code)?.title || ''
        })),
        annexureFilePath,
      };

      await iprService.updateApplication(params.id, updateData);
      setSuccess('Application updated successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/ipr/applications/${params.id}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error updating application:', error);
      setError(error.response?.data?.message || 'Failed to update application');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cannot Edit Application</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/ipr/my-applications"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Applications
          </Link>
        </div>
      </div>
    );
  }

  // Check if application can be edited
  const canEdit = application?.status === 'draft' || application?.status === 'pending_mentor_approval' || application?.status === 'changes_required';
  
  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cannot Edit</h2>
          <p className="text-gray-600 mb-6">
            This application cannot be edited in its current status ({application?.status}).
          </p>
          <Link
            href={`/ipr/applications/${params.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            View Application
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/ipr/applications/${params.id}`}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Edit Application</h1>
                <p className="text-sm text-gray-500">
                  {application?.applicationNumber} • {application?.iprType?.toUpperCase()}
                </p>
              </div>
            </div>
            {application?.status === 'pending_mentor_approval' && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                Pending Mentor Approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the title of your IPR"
              required
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your invention/work in detail"
              required
            />
          </div>

          {/* Project Type & Filing Type */}
          <div className="bg-white rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type
              </label>
              <select
                name="projectType"
                value={formData.projectType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select project type</option>
                <option value="phd">PhD Research</option>
                <option value="pg_project">PG Project</option>
                <option value="ug_project">UG Project</option>
                <option value="faculty_research">Faculty Research</option>
                <option value="industry_collaboration">Industry Collaboration</option>
                <option value="any_other">Any Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filing Type
              </label>
              <select
                name="filingType"
                value={formData.filingType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select filing type</option>
                <option value="provisional">Provisional</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          </div>

          {/* SDGs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Sustainable Development Goals (SDGs)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SDG_OPTIONS.map((sdg) => (
                <button
                  key={sdg.code}
                  type="button"
                  onClick={() => handleSdgToggle(sdg.code)}
                  className={`p-3 rounded-lg border text-left text-sm transition-all ${
                    formData.selectedSdgs.includes(sdg.code)
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">SDG {sdg.code}</span>
                  <p className="text-xs mt-1 opacity-75">{sdg.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information or remarks"
            />
          </div>

          {/* Annexure Upload */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annexure Document
            </label>
            
            {application?.annexureFilePath && !annexureFile && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-700">Current document attached</span>
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/file-upload/download/${application.annexureFilePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Current
                </a>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="annexure"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setAnnexureFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="annexure" className="cursor-pointer">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                {annexureFile ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{annexureFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="text-blue-600 font-medium">Upload new document</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC up to 10MB</p>
                  </div>
                )}
              </label>
            </div>
            
            {annexureFile && (
              <button
                type="button"
                onClick={() => setAnnexureFile(null)}
                className="mt-3 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Remove new file
              </button>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href={`/ipr/applications/${params.id}`}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
