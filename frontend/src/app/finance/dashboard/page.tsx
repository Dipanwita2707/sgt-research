'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  FileText,
  Calculator,
  PieChart,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function FinanceDashboardPage() {
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
          Finance Department
        </h1>
        <p className="text-gray-600">
          Manage accounts, transactions, budgets, and financial operations
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Accounts Management</h3>
          <p className="text-sm text-gray-600 mb-4">Manage financial accounts and balances</p>
          <Link
            href="/finance/accounts"
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            View Accounts →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Transactions</h3>
          <p className="text-sm text-gray-600 mb-4">View and approve financial transactions</p>
          <Link
            href="/finance/transactions"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Manage Transactions →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Fee Management</h3>
          <p className="text-sm text-gray-600 mb-4">Manage student fees and collections</p>
          <Link
            href="/finance/fees"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            Manage Fees →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoices</h3>
          <p className="text-sm text-gray-600 mb-4">Generate and manage invoices</p>
          <Link
            href="/finance/invoices"
            className="text-orange-600 hover:text-orange-800 text-sm font-medium"
          >
            View Invoices →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Budget Management</h3>
          <p className="text-sm text-gray-600 mb-4">Plan and monitor departmental budgets</p>
          <Link
            href="/finance/budget"
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Manage Budget →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Reports</h3>
          <p className="text-sm text-gray-600 mb-4">Generate financial reports and analytics</p>
          <Link
            href="/finance/reports"
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            View Reports →
          </Link>
        </div>
      </div>

      {/* IPR Finance Processing */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-8">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">IPR Finance Processing</h2>
        <p className="text-blue-700 mb-4">
          Process and approve financial aspects of IPR applications including incentives and reimbursements.
        </p>
        <Link
          href="/finance/ipr-processing"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Process IPR Finance
        </Link>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600 mb-4">
          Finance management features are currently under development. Full functionality will be available soon.
        </p>
        <p className="text-sm text-gray-500">
          IPR finance processing is available through the IPR workflow system.
        </p>
      </div>
    </div>
  );
}