'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import ResearchContributionForm from '@/components/research/ResearchContributionForm';
import ResearchTypeSelector from '@/components/research/ResearchTypeSelector';

export default function ResearchApplyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type');
  const { user } = useAuthStore();
  const [canFileResearch, setCanFileResearch] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFilePermission();
  }, [user]);

  const checkFilePermission = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Get role name
    const roleName = typeof user.role === 'object' ? user.role?.name : user.userType;
    
    // Faculty and Student have inherent research filing rights
    if (roleName === 'faculty' || roleName === 'student') {
      setCanFileResearch(true);
      setLoading(false);
      return;
    }
    
    // Staff/Admin need to check for explicit research_file_new permission
    try {
      const response = await api.get('/dashboard/staff');
      if (response.data.success && response.data.data.permissions) {
        const hasPermission = response.data.data.permissions.some((dept: any) => {
          return dept.permissions?.some((p: string) => {
            const pLower = p.toLowerCase();
            return pLower === 'research_file_new';
          });
        });
        setCanFileResearch(hasPermission);
      } else {
        setCanFileResearch(false);
      }
    } catch (error) {
      console.error('Error checking file permission:', error);
      setCanFileResearch(false);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (canFileResearch === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You do not have permission to file research contributions.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // No type selected - show type selector
  if (!type) {
    return <ResearchTypeSelector />;
  }

  // Valid type - show form
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/research/apply"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Type Selection
        </Link>

        <ResearchContributionForm 
          publicationType={type as any}
          onSuccess={() => router.push('/research/my-contributions')}
        />
      </div>
    </div>
  );
}
