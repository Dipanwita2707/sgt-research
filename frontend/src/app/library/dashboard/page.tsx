'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Book, 
  Users, 
  Calendar, 
  Search,
  Plus,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

export default function LibraryDashboardPage() {
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
          Library Management
        </h1>
        <p className="text-gray-600">
          Manage books, resources, memberships, and library operations
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Book className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Books Management</h3>
          <p className="text-sm text-gray-600 mb-4">Add, edit, and manage library books</p>
          <Link
            href="/library/books"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Manage Books →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Members Management</h3>
          <p className="text-sm text-gray-600 mb-4">Manage library members and registrations</p>
          <Link
            href="/library/members"
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Manage Members →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Issue/Return Books</h3>
          <p className="text-sm text-gray-600 mb-4">Process book issues and returns</p>
          <Link
            href="/library/circulation"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            Book Circulation →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Catalog Search</h3>
          <p className="text-sm text-gray-600 mb-4">Search and browse library catalog</p>
          <Link
            href="/library/search"
            className="text-orange-600 hover:text-orange-800 text-sm font-medium"
          >
            Search Catalog →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Reservations</h3>
          <p className="text-sm text-gray-600 mb-4">Manage book reservations and holds</p>
          <Link
            href="/library/reservations"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            View Reservations →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Library Reports</h3>
          <p className="text-sm text-gray-600 mb-4">Generate usage and statistical reports</p>
          <Link
            href="/library/reports"
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            View Reports →
          </Link>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600 mb-4">
          Library management features are currently under development. Full functionality will be available soon.
        </p>
        <p className="text-sm text-gray-500">
          In the meantime, you can use the existing systems for basic library operations.
        </p>
      </div>
    </div>
  );
}