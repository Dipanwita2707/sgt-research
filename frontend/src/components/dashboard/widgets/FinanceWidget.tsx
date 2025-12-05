'use client';

import { DollarSign, CreditCard, TrendingUp, FileText, ChevronRight, Receipt } from 'lucide-react';

export default function FinanceWidget() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Finance</h3>
            <p className="text-xs text-gray-500">Fee management</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Collected</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">₹0</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-red-800 mt-1">₹0</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/25 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
          Collect Fee
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-xl transition-all">
          View Reports
        </button>
      </div>
    </div>
  );
}
