'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Server, 
  Shield, 
  Network, 
  HardDrive,
  Monitor,
  Wifi,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Database,
  Lock
} from 'lucide-react';
import Link from 'next/link';

export default function ITDashboardPage() {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For now, just simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          IT Department
        </h1>
        <p className="text-gray-600">
          Manage infrastructure, networks, security, and IT operations
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Infrastructure</h3>
          <p className="text-sm text-gray-600 mb-4">Manage servers and IT infrastructure</p>
          <Link
            href="/it/infrastructure"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Manage Infrastructure →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Network className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Network Management</h3>
          <p className="text-sm text-gray-600 mb-4">Monitor and manage network infrastructure</p>
          <Link
            href="/it/networks"
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Manage Networks →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Management</h3>
          <p className="text-sm text-gray-600 mb-4">Monitor security and access controls</p>
          <Link
            href="/it/security"
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Manage Security →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
          <p className="text-sm text-gray-600 mb-4">Manage user accounts and permissions</p>
          <Link
            href="/it/users"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            Manage Users →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">System Health</h3>
          <p className="text-sm text-gray-600 mb-4">Monitor system performance and health</p>
          <Link
            href="/it/system-health"
            className="text-orange-600 hover:text-orange-800 text-sm font-medium"
          >
            View System Health →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Backup Management</h3>
          <p className="text-sm text-gray-600 mb-4">Manage data backups and recovery</p>
          <Link
            href="/it/backups"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Manage Backups →
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 mb-8">
        <h2 className="text-xl font-semibold text-green-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-green-800">All systems operational</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-green-800">Network stable</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-green-800">Security active</span>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600 mb-4">
          IT management features are currently under development. Full functionality will be available soon.
        </p>
        <p className="text-sm text-gray-500">
          In the meantime, you can use existing system administration tools.
        </p>
      </div>
    </div>
  );
}