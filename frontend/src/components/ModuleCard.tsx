'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import * as Icons from 'lucide-react';

interface ModuleCardProps {
  name: string;
  description: string;
  icon: string;
  route: string;
  permissionCount?: number;
}

export default function ModuleCard({ 
  name, 
  description, 
  icon, 
  route, 
  permissionCount 
}: ModuleCardProps) {
  // Dynamically get icon component
  const IconComponent = (Icons as any)[icon] || Icons.FileText;

  return (
    <Link
      href={route}
      className="block group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 hover:border-primary-200"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition">
            <IconComponent className="w-6 h-6 text-primary-600" />
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition">
          {name}
        </h3>
        
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {description}
        </p>
        
        {permissionCount !== undefined && (
          <div className="flex items-center text-xs text-gray-500">
            <span className="px-2 py-1 bg-gray-100 rounded">
              {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
