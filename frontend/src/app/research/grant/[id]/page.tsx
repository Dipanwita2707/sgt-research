'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { researchService, GrantApplication } from '@/services/research.service';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  Building2, 
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Send,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  submitted: { label: 'Submitted', icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  under_review: { label: 'Under Review', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  changes_required: { label: 'Changes Required', icon: AlertCircle, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  resubmitted: { label: 'Resubmitted', icon: RefreshCw, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
};

export default function GrantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [grant, setGrant] = useState<GrantApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchGrant(params.id as string);
    }
  }, [params.id]);

  const fetchGrant = async (id: string) => {
    try {
      setLoading(true);
      const response = await researchService.getGrantApplicationById(id);
      setGrant(response.data);
    } catch (err: any) {
      console.error('Error fetching grant:', err);
      setError(err.response?.data?.message || 'Failed to load grant application');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading grant application...</p>
        </div>
      </div>
    );
  }

  if (error || !grant) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Grant</h3>
          <p className="text-red-700 mb-4">{error || 'Grant application not found'}</p>
          <Link
            href="/research/my-contributions"
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Contributions
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[grant.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/research/my-contributions"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Contributions
        </Link>
        
        {grant.status === 'draft' && (
          <Link
            href={`/research/apply-grant?edit=${grant.id}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Draft
          </Link>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-gray-600">Application #{grant.applicationNumber || 'Draft'}</span>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig.borderColor} ${statusConfig.bgColor} ${statusConfig.color}`}>
                  <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                  {statusConfig.label}
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{grant.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {grant.agencyName && (
                  <span className="inline-flex items-center">
                    <Building2 className="w-4 h-4 mr-1.5" />
                    {grant.agencyName}
                  </span>
                )}
                <span className="inline-flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {new Date(grant.dateOfSubmission || grant.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grant.submittedAmount && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm text-gray-600 block mb-1">Submitted Amount</label>
                  <p className="font-semibold text-gray-900 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    ₹{Number(grant.submittedAmount).toLocaleString()}
                  </p>
                </div>
              )}
              
              {grant.projectType && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm text-gray-600 block mb-1">Project Type</label>
                  <p className="font-semibold text-gray-900">
                    {grant.projectType === 'indian' ? 'Indian Project' : 'International Project'}
                  </p>
                </div>
              )}
              
              {grant.projectStatus && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm text-gray-600 block mb-1">Project Status</label>
                  <p className="font-semibold text-gray-900 capitalize">{grant.projectStatus}</p>
                </div>
              )}
              
              {grant.projectCategory && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm text-gray-600 block mb-1">Project Category</label>
                  <p className="font-semibold text-gray-900 capitalize">{grant.projectCategory}</p>
                </div>
              )}
              
              {grant.fundingAgencyType && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm text-gray-600 block mb-1">Funding Agency Type</label>
                  <p className="font-semibold text-gray-900 uppercase">{grant.fundingAgencyType}</p>
                </div>
              )}

              {grant.fundingAgencyName && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm text-gray-600 block mb-1">Funding Agency Name</label>
                  <p className="font-semibold text-gray-900">{grant.fundingAgencyName}</p>
                </div>
              )}
              
              {grant.myRole && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm text-gray-600 block mb-1">My Role in Project</label>
                  <p className="font-semibold text-gray-900 capitalize">
                    {grant.myRole === 'pi' ? 'Principal Investigator (PI)' : 'Co-Principal Investigator (Co-PI)'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SDGs */}
          {grant.sdgGoals && grant.sdgGoals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Sustainable Development Goals</h3>
              <div className="flex flex-wrap gap-2">
                {grant.sdgGoals.map((sdg: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                  >
                    SDG {sdg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Consortium Organizations */}
          {grant.consortiumOrganizations && grant.consortiumOrganizations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Consortium Organizations
              </h3>
              <div className="space-y-3">
                {grant.consortiumOrganizations.map((org, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Organization Name</label>
                        <p className="font-medium text-gray-900">{org.organizationName}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Country</label>
                        <p className="font-medium text-gray-900">{org.country}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Members</label>
                        <p className="font-medium text-gray-900">{org.numberOfMembers}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investigators */}
          {grant.investigators && grant.investigators.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Investigators
              </h3>
              <div className="space-y-3">
                {grant.investigators.map((inv, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Name</label>
                        <p className="font-medium text-gray-900">{inv.name}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Affiliation</label>
                        <p className="font-medium text-gray-900">{inv.affiliation || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Role</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          inv.roleType === 'pi' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {inv.roleType === 'pi' ? 'Principal Investigator' : 'Co-Principal Investigator'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(grant.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {grant.updatedAt && grant.updatedAt !== grant.createdAt && (
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {new Date(grant.updatedAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
