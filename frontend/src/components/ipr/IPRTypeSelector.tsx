'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, FileText, Palette, Briefcase } from 'lucide-react';

interface IPRType {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const IPR_TYPES: IPRType[] = [
  {
    id: 'patent',
    title: 'Patent Filing',
    description: 'Protect your inventions and technical innovations',
    icon: Lightbulb,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'copyright',
    title: 'Copyright Filing',
    description: 'Protect your original works of authorship',
    icon: FileText,
    color: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  {
    id: 'design',
    title: 'Design Filing',
    description: 'Protect the visual design of your products',
    icon: Palette,
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    id: 'trademark',
    title: 'Trademark Filing',
    description: 'Protect your brand names, logos, and symbols',
    icon: Briefcase,
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  }
];

export default function IPRTypeSelector() {
  const router = useRouter();

  const handleTypeSelection = (type: string) => {
    router.push(`/ipr/apply?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Intellectual Property Rights (IPR) Application
          </h1>
          <p className="text-lg text-gray-600">
            Select the type of IPR you want to apply for
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {IPR_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                onClick={() => handleTypeSelection(type.id)}
                className={`${type.color} border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 transform hover:scale-105 hover:shadow-lg`}
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm mr-4">
                    <Icon className="w-8 h-8 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {type.title}
                    </h3>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {type.description}
                </p>
                <div className="mt-4 flex justify-end">
                  <button className="bg-white px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors text-gray-700 font-medium">
                    Apply Now →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-xl shadow-sm p-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Need Help Choosing?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Patents</h4>
              <p className="text-gray-600">
                For new inventions, processes, or improvements to existing technology
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Copyrights</h4>
              <p className="text-gray-600">
                For original works like software, literature, art, or music
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Design Rights</h4>
              <p className="text-gray-600">
                For the visual appearance of products, including shape, pattern, or ornamentation
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Entrepreneurship</h4>
              <p className="text-gray-600">
                For business innovations, startup ideas, and commercial applications
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}