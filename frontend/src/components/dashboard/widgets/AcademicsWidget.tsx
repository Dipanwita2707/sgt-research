'use client';

import { BookOpen, Calendar, FileText, Award, ChevronRight } from 'lucide-react';

export default function AcademicsWidget() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sgt border border-gray-100 card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-sgt-gradient rounded-xl flex items-center justify-center shadow-sgt">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Academics</h3>
            <p className="text-xs text-gray-500">Course management</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-sgt-50 rounded-xl p-4 border border-sgt-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-sgt-600 uppercase tracking-wider">Courses</p>
              <p className="text-2xl font-bold text-sgt-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-sgt-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-sgt-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Programs</p>
              <p className="text-2xl font-bold text-purple-800 mt-1">0</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-sgt-gradient hover:shadow-lg hover:shadow-sgt-500/25 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
          Manage Courses
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" />
          Timetable
        </button>
      </div>
    </div>
  );
}
