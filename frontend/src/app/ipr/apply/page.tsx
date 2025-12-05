'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import IPRIdeaRequestForm from '@/components/ipr/IPRIdeaRequestForm';
import IPRTypeSelector from '@/components/ipr/IPRTypeSelector';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function DynamicIPRPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type');
  const { user } = useAuthStore();
  const [canFileIpr, setCanFileIpr] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFilePermission();
  }, [user]);

  const checkFilePermission = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Get role name - role can be an object { name, displayName } or userType is the role string
    const roleName = typeof user.role === 'object' ? user.role?.name : user.userType;
    
    // Faculty and Student have inherent IPR filing rights
    if (roleName === 'faculty' || roleName === 'student') {
      setCanFileIpr(true);
      setLoading(false);
      return;
    }
    
    // Staff/Admin need to check for explicit ipr_file_new permission
    try {
      const response = await api.get('/dashboard/staff');
      if (response.data.success && response.data.data.permissions) {
        const hasPermission = response.data.data.permissions.some((dept: any) => {
          return dept.permissions?.some((p: string) => {
            const pLower = p.toLowerCase();
            // Check for exact ipr_file_new permission
            return pLower === 'ipr_file_new' || 
                   pLower === 'ipr_file' || 
                   pLower === 'drd_ipr_file';
          });
        });
        setCanFileIpr(hasPermission);
      } else {
        setCanFileIpr(false);
      }
    } catch (error) {
      console.error('Error checking file permission:', error);
      setCanFileIpr(false);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (canFileIpr === false) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You do not have permission to file IPR applications. 
              {((typeof user?.role === 'object' ? user?.role?.name : user?.userType) === 'staff' || 
                (typeof user?.role === 'object' ? user?.role?.name : user?.userType) === 'admin') && (
                <span className="block mt-2 text-sm">
                  {(typeof user?.role === 'object' ? user?.role?.name : user?.userType) === 'admin' 
                    ? 'Admin accounts manage users and permissions. To file IPR, you need the "File New IPR Applications" permission assigned.'
                    : 'Staff members require the "File New IPR Applications" permission from an administrator.'}
                </span>
              )}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {type ? (
        <IPRIdeaRequestForm initialType={type as 'patent' | 'copyright' | 'design' | 'trademark'} />
      ) : (
        <IPRTypeSelector />
      )}
    </ProtectedRoute>
  );
}