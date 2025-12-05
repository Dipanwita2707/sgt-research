'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { iprService, drdReviewService } from '@/services/ipr.service';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  FileText,
  Download,
  User,
  Building,
  Calendar,
  CreditCard,
  MessageSquare,
  Eye,
  RefreshCw,
  Award,
  TrendingUp,
  Coins,
  Users,
} from 'lucide-react';

// Incentive Policy - Expected rewards based on IPR type
// This will be managed by admin in the future
const INCENTIVE_POLICY = {
  patent: {
    basePoints: 50,
    baseIncentive: 50000,
    description: 'Patent Filing',
    splitPolicy: 'Equal split among all inventors',
  },
  copyright: {
    basePoints: 20,
    baseIncentive: 15000,
    description: 'Copyright Registration',
    splitPolicy: 'Equal split among all creators',
  },
  trademark: {
    basePoints: 15,
    baseIncentive: 10000,
    description: 'Trademark Registration',
    splitPolicy: 'Equal split among all owners',
  },
  design: {
    basePoints: 25,
    baseIncentive: 20000,
    description: 'Design Registration',
    splitPolicy: 'Equal split among all designers',
  },
};

interface IprApplicationDetailsProps {
  applicationId: string;
}

export default function IprApplicationDetails({ applicationId }: IprApplicationDetailsProps) {
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAcceptChangesModal, setShowAcceptChangesModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reviewComments, setReviewComments] = useState('');

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const data = await iprService.getApplicationById(applicationId);
      setApplication(data);
    } catch (error: any) {
      console.error('Error fetching application:', error);
      setError(error.response?.data?.message || 'Failed to fetch application details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      under_drd_review: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      under_dean_review: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      published: { color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
      changes_required: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      resubmitted: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      drd_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      dean_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      drd_rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      dean_rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      // Kept for backward compatibility with old records
      under_finance_review: { color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
      finance_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      finance_rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  const handleAcceptChanges = async () => {
    if (!application) return;

    try {
      setSubmitting(true);
      await drdReviewService.requestChanges(application.id, reviewComments);
      
      alert('Changes accepted and application resubmitted successfully!');
      setShowAcceptChangesModal(false);
      fetchApplicationDetails(); // Refresh data
    } catch (error: any) {
      console.error('Error accepting changes:', error);
      alert(error.response?.data?.message || 'Failed to accept changes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!application) return;

    try {
      setSubmitting(true);
      await iprService.resubmitApplication(application.id);
      alert('Application resubmitted successfully!');
      fetchApplicationDetails(); // Refresh data
    } catch (error: any) {
      console.error('Error resubmitting:', error);
      alert(error.response?.data?.message || 'Failed to resubmit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getDrdReview = () => {
    if (!application?.reviews) return null;
    return application.reviews.find((r: any) => r.reviewerRole === 'drd_member');
  };

  const getDeanReview = () => {
    if (!application?.reviews) return null;
    return application.reviews.find((r: any) => r.reviewerRole === 'drd_dean');
  };

  const getFinanceReview = () => {
    if (!application?.financeRecords) return null;
    return application.financeRecords[0];
  };

  // Calculate expected incentive based on IPR type and number of inventors
  const getExpectedIncentive = () => {
    if (!application) return null;
    
    const iprType = application.iprType?.toLowerCase() || 'patent';
    const policy = INCENTIVE_POLICY[iprType as keyof typeof INCENTIVE_POLICY] || INCENTIVE_POLICY.patent;
    
    // Count inventors (from contributors or default to 1)
    const inventorCount = application.contributors?.filter((c: any) => c.contributorType === 'inventor')?.length || 1;
    
    // Calculate per-person share (equal split)
    const pointsPerPerson = Math.floor(policy.basePoints / inventorCount);
    const incentivePerPerson = Math.floor(policy.baseIncentive / inventorCount);
    
    return {
      totalPoints: policy.basePoints,
      totalIncentive: policy.baseIncentive,
      pointsPerPerson,
      incentivePerPerson,
      inventorCount,
      description: policy.description,
      splitPolicy: policy.splitPolicy,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Application</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Application not found</p>
        </div>
      </div>
    );
  }

  const drdReview = getDrdReview();
  const deanReview = getDeanReview();
  const financeReview = getFinanceReview();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{application.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            {getStatusBadge(application.status)}
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
              {application.iprType.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              Application ID: {application.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">IPR Type</label>
                <p className="mt-1 text-gray-900">{application.iprType.toUpperCase()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Type</label>
                <p className="mt-1 text-gray-900">{application.projectType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Filing Type</label>
                <p className="mt-1 text-gray-900">{application.filingType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Submitted Date</label>
                <p className="mt-1 text-gray-900">
                  {application.submittedAt 
                    ? new Date(application.submittedAt).toLocaleDateString()
                    : 'Not submitted'}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-gray-900">{application.description}</p>
            </div>

            {application.remarks && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <p className="mt-1 text-gray-900">{application.remarks}</p>
              </div>
            )}

            {application.sdgs && application.sdgs.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">SDGs</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {application.sdgs.map((sdg: any) => (
                    <span key={sdg.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {sdg.sdgCode}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Applicant Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Applicant Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {application.applicantDetails?.uid ? (
                // Internal Applicant
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">UID</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails.uid}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails.universityDeptName || 'N/A'}</p>
                  </div>
                </>
              ) : (
                // External Applicant
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails?.externalName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails?.externalEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails?.companyUniversityName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Option</label>
                    <p className="mt-1 text-gray-900">{application.applicantDetails?.externalOption || 'N/A'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* DRD Review Section */}
          {drdReview && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                DRD Review
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Decision</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      drdReview.decision === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : drdReview.decision === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {drdReview.decision.toUpperCase()}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Comments</label>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">
                    {drdReview.comments || 'No comments provided'}
                  </p>
                </div>

                {drdReview.edits && Object.keys(drdReview.edits).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Suggested Edits</label>
                    <div className="mt-1 bg-orange-50 border border-orange-200 rounded-md p-3">
                      <pre className="text-sm text-orange-900 whitespace-pre-wrap">
                        {JSON.stringify(drdReview.edits, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reviewed By</label>
                  <p className="mt-1 text-gray-900">
                    {drdReview.reviewer?.employeeDetails?.displayName || 'Unknown Reviewer'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Review Date</label>
                  <p className="mt-1 text-gray-900">
                    {drdReview.reviewedAt 
                      ? new Date(drdReview.reviewedAt).toLocaleString()
                      : 'Not reviewed yet'}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Changes Required */}
              {application.status === 'changes_required' && drdReview.decision === 'changes_required' && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Action Required</h3>
                  <p className="text-orange-800 mb-4">
                    The DRD reviewer has requested changes to your application. Please review the comments and edits above, then choose an action below.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAcceptChangesModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      Accept Changes & Resubmit
                    </button>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      Edit Application
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dean Review Section */}
          {deanReview && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Dean Review
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Decision</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      deanReview.decision === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {deanReview.decision.toUpperCase()}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Comments</label>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">
                    {deanReview.comments || 'No comments provided'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reviewed By</label>
                  <p className="mt-1 text-gray-900">
                    {deanReview.reviewer?.employeeDetails?.displayName || 'Unknown Dean'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Review Date</label>
                  <p className="mt-1 text-gray-900">
                    {deanReview.reviewedAt 
                      ? new Date(deanReview.reviewedAt).toLocaleString()
                      : 'Not reviewed yet'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Finance Review Section */}
          {financeReview && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Finance Review
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Audit Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      financeReview.auditStatus === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {financeReview.auditStatus.toUpperCase()}
                    </span>
                  </p>
                </div>

                {financeReview.auditStatus === 'approved' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Incentive Amount</label>
                      <p className="mt-1 text-2xl font-bold text-green-600">
                        ₹{financeReview.incentiveAmount?.toLocaleString()}
                      </p>
                    </div>

                    {financeReview.pointsAwarded && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Points Awarded</label>
                        <p className="mt-1 text-xl font-semibold text-blue-600">
                          {financeReview.pointsAwarded} points
                        </p>
                      </div>
                    )}

                    {financeReview.paymentReference && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Reference</label>
                        <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                          {financeReview.paymentReference}
                        </p>
                      </div>
                    )}

                    {financeReview.creditedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Credited Date</label>
                        <p className="mt-1 text-gray-900">
                          {new Date(financeReview.creditedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Comments</label>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">
                    {financeReview.auditComments || 'No comments provided'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Processed By</label>
                  <p className="mt-1 text-gray-900">
                    {financeReview.financeReviewer?.employeeDetails?.displayName || 'Unknown Finance Officer'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
            <div className="space-y-3">
              {application.statusHistory && application.statusHistory.length > 0 ? (
                application.statusHistory.map((history: any, index: number) => (
                  <div key={history.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {history.toStatus.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(history.changedAt).toLocaleString()}
                      </p>
                      {history.comments && (
                        <p className="text-xs text-gray-700 mt-1">{history.comments}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No status history available</p>
              )}
            </div>
          </div>

          {/* Application Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Info</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">School</label>
                <p className="text-sm text-gray-900">{application.school?.facultyName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Department</label>
                <p className="text-sm text-gray-900">{application.department?.departmentName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Created Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(application.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {new Date(application.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {application.status === 'draft' && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Edit Application
                </button>
              )}
              
              {application.status === 'changes_required' && (
                <>
                  <button
                    onClick={() => setShowAcceptChangesModal(true)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Accept Changes & Resubmit
                  </button>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Edit & Resubmit
                  </button>
                </>
              )}

              {(application.status === 'completed' || application.status === 'finance_approved') && application.incentiveAmount && (
                <div className="text-center p-4 bg-green-50 rounded-md">
                  <CreditCard className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-900">Incentive Credited</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ₹{application.incentiveAmount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accept Changes Modal */}
      {showAcceptChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Accept Changes & Resubmit
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to accept the DRD reviewer's suggested changes and resubmit your application? 
                This will move your application to the next review stage.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional comments about accepting these changes..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAcceptChangesModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptChanges}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Accept & Resubmit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal Placeholder */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Application</h3>
            <p className="text-gray-600 mb-4">
              Editing functionality would redirect to the edit form for this application.
            </p>
            <button
              onClick={() => setShowEditModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}