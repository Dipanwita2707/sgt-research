'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  User, 
  Calendar,
  Building,
  Lightbulb,
  ArrowLeft,
  AlertCircle,
  CheckCheck,
  MessageSquare
} from 'lucide-react';
import { iprService, IprApplication } from '@/services/ipr.service';

const IPR_TYPE_CONFIG = {
  patent: { label: 'Patent', icon: Lightbulb, color: 'bg-blue-500' },
  copyright: { label: 'Copyright', icon: FileText, color: 'bg-purple-500' },
  trademark: { label: 'Trademark', icon: Building, color: 'bg-green-500' },
  design: { label: 'Design', icon: FileText, color: 'bg-orange-500' },
};

export default function MentorApprovalsPage() {
  const [applications, setApplications] = useState<IprApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApp, setSelectedApp] = useState<IprApplication | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComments, setRejectComments] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await iprService.getPendingMentorApprovals();
      setApplications(data);
    } catch (err: any) {
      console.error('Error fetching pending approvals:', err);
      setError(err.response?.data?.message || 'Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    
    try {
      setSubmitting(true);
      await iprService.approveMentorApplication(selectedApp.id, approvalComments);
      setShowApprovalModal(false);
      setSelectedApp(null);
      setApprovalComments('');
      fetchPendingApprovals();
    } catch (err: any) {
      console.error('Error approving application:', err);
      alert(err.response?.data?.message || 'Failed to approve application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    
    if (!rejectComments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      setSubmitting(true);
      await iprService.rejectMentorApplication(selectedApp.id, rejectComments);
      setShowRejectModal(false);
      setSelectedApp(null);
      setRejectComments('');
      fetchPendingApprovals();
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      alert(err.response?.data?.message || 'Failed to reject application');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getApplicantName = (app: IprApplication) => {
    if (app.applicantUser?.studentDetails) {
      const { firstName, lastName } = app.applicantUser.studentDetails;
      return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown Student';
    }
    if (app.applicantUser?.employeeDetails) {
      const { firstName, lastName } = app.applicantUser.employeeDetails;
      return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
    }
    return 'Unknown Applicant';
  };

  const getIprTypeConfig = (type: string) => {
    return IPR_TYPE_CONFIG[type as keyof typeof IPR_TYPE_CONFIG] || IPR_TYPE_CONFIG.patent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/ipr" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to IPR Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Mentor Approvals</h1>
        <p className="mt-1 text-gray-600">
          Review and approve IPR applications from your mentee students
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
          <p className="text-gray-600">
            You don't have any IPR applications waiting for your approval.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {applications.map((app) => {
            const typeConfig = getIprTypeConfig(app.iprType);
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg ${typeConfig.color} flex items-center justify-center`}>
                        <TypeIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {app.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {app.applicationNumber} • {typeConfig.label}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending Approval
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="text-sm">
                        <strong>Student:</strong> {getApplicantName(app)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        <strong>Submitted:</strong> {formatDate(app.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="w-4 h-4" />
                      <span className="text-sm">
                        <strong>School:</strong> {app.school?.name || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {app.description && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {app.description}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex items-center gap-3 justify-end">
                    <Link
                      href={`/ipr/application/${app.id}`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setShowRejectModal(true);
                      }}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setShowApprovalModal(true);
                      }}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Approve IPR Application
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                You are approving "{selectedApp.title}"
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Add any comments or recommendations..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-2">
                Once approved, this application will be submitted for DRD review.
              </p>
            </div>
            <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedApp(null);
                  setApprovalComments('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Request Changes
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Send "{selectedApp.title}" back to the student for revision
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback / Reason for Changes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Please provide detailed feedback on what changes are needed..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                The student will receive this feedback and can make changes before resubmitting.
              </p>
            </div>
            <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedApp(null);
                  setRejectComments('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectComments.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Request Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
