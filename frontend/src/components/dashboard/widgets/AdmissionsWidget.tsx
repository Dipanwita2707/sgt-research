'use client';

import { UserPlus, FileText, CheckCircle, Clock, ChevronRight, UserCog } from 'lucide-react';

export default function AdmissionsWidget() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
            <UserCog className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Admissions</h3>
            <p className="text-xs text-gray-500">New enrollments</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-orange-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-lg hover:shadow-orange-500/25 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" />
          New Application
        </button>
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-xl transition-all">
          View All
        </button>
      </div>
    </div>
  );
}
