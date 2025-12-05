'use client';

import { BarChart3, FileText, Download, TrendingUp, PieChart, ChevronRight } from 'lucide-react';

export default function ReportsWidget() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Reports & Analytics</h3>
            <p className="text-xs text-gray-500">Insights & data</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Reports</p>
              <p className="text-2xl font-bold text-violet-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Analytics</p>
              <p className="text-2xl font-bold text-purple-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          Generate
        </button>
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-xl transition-all">
          View All
        </button>
      </div>
    </div>
  );
}
