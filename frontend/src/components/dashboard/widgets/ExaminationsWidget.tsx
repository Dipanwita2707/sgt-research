'use client';

import { FileText, Calendar, Award, ClipboardCheck, ChevronRight } from 'lucide-react';

export default function ExaminationsWidget() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/25">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Examinations</h3>
            <p className="text-xs text-gray-500">Tests & results</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Scheduled</p>
              <p className="text-2xl font-bold text-rose-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Results</p>
              <p className="text-2xl font-bold text-orange-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-lg hover:shadow-rose-500/25 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
          Schedule Exam
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-xl transition-all">
          View Results
        </button>
      </div>
    </div>
  );
}
