'use client';

import { useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';

interface AuthorSectionProps {
  publicationType: 'research_paper' | 'book' | 'book_chapter' | 'conference_paper';
  conferenceSubType?: string;
  onAuthorDataChange: (data: AuthorData) => void;
}

export interface AuthorData {
  totalAuthors: number;
  totalInternalAuthors: number;
  totalInternalCoAuthors?: number;
  userAuthorRole?: string;
  hasInternationalAuthor?: 'yes' | 'no';
  hasLpuStudents?: 'yes' | 'no';
  numForeignUniversities?: number;
}

export default function AuthorSection({ publicationType, conferenceSubType, onAuthorDataChange }: AuthorSectionProps) {
  // For conferences, only show author section for paper types
  const shouldShowAuthors = publicationType !== 'conference_paper' || 
    conferenceSubType === 'paper_not_indexed' || 
    conferenceSubType === 'paper_indexed_scopus';

  const [totalAuthors, setTotalAuthors] = useState(1);
  const [totalInternalAuthors, setTotalInternalAuthors] = useState(1);
  const [totalInternalCoAuthors, setTotalInternalCoAuthors] = useState(0);
  const [userAuthorRole, setUserAuthorRole] = useState('first_and_corresponding');
  const [hasInternationalAuthor, setHasInternationalAuthor] = useState<'yes' | 'no'>('yes');
  const [hasLpuStudents, setHasLpuStudents] = useState<'yes' | 'no'>('yes');
  const [numForeignUniversities, setNumForeignUniversities] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Show detailed fields for research papers AND conference papers with author requirements
  const isResearchOrScopusConference = 
    publicationType === 'research_paper' || 
    (publicationType === 'conference_paper' && (conferenceSubType === 'paper_not_indexed' || conferenceSubType === 'paper_indexed_scopus'));
  const isBookOrChapter = publicationType === 'book' || publicationType === 'book_chapter';
  const hasExternalAuthors = totalAuthors > totalInternalAuthors;

  const updateData = (updates: Partial<AuthorData>) => {
    const data: AuthorData = {
      totalAuthors,
      totalInternalAuthors,
      ...(isResearchOrScopusConference && { 
        totalInternalCoAuthors,
        userAuthorRole 
      }),
      ...(isResearchOrScopusConference && hasExternalAuthors && { 
        hasInternationalAuthor,
        numForeignUniversities: hasInternationalAuthor === 'yes' ? numForeignUniversities : 0
      }),
      ...(isResearchOrScopusConference && { hasLpuStudents }),
      ...updates
    };
    onAuthorDataChange(data);
  };

  const handleTotalAuthorsChange = (value: number) => {
    if (value < 1) {
      setError('Total authors must be at least 1');
      return;
    }
    setTotalAuthors(value);
    if (totalInternalAuthors > value) {
      setTotalInternalAuthors(value);
    }
    setError(null);
    updateData({ totalAuthors: value });
  };

  const handleInternalAuthorsChange = (value: number) => {
    if (value < 1) {
      setError('SGT authors must be at least 1 (you)');
      return;
    }
    if (value > totalAuthors) {
      setError('SGT authors cannot exceed total authors');
      return;
    }
    setTotalInternalAuthors(value);
    const maxCoAuthors = value - 1;
    if (totalInternalCoAuthors > maxCoAuthors) {
      setTotalInternalCoAuthors(maxCoAuthors);
    }
    setError(null);
    updateData({ totalInternalAuthors: value });
  };

  const handleInternalCoAuthorsChange = (value: number) => {
    const maxCoAuthors = totalInternalAuthors - 1;
    if (value < 0) {
      setError('Internal co-authors cannot be negative');
      return;
    }
    if (value > maxCoAuthors) {
      setError(`Internal co-authors cannot exceed ${maxCoAuthors}`);
      return;
    }
    setTotalInternalCoAuthors(value);
    setError(null);
    updateData({ totalInternalCoAuthors: value });
  };

  const handleForeignUniversitiesChange = (value: number) => {
    const maxExternal = totalAuthors - totalInternalAuthors;
    if (value < 0) {
      setError('Foreign universities cannot be negative');
      return;
    }
    if (value > maxExternal) {
      setError(`Foreign universities cannot exceed ${maxExternal} (external authors)`);
      return;
    }
    setNumForeignUniversities(value);
    setError(null);
    updateData({ numForeignUniversities: value });
  };

  // If conference type doesn't need authors, show message
  if (!shouldShowAuthors) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Author information is not required for this conference type.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Basic Author Counts */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Authors <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={totalAuthors}
            onChange={(e) => handleTotalAuthorsChange(Number(e.target.value))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SGT Authors <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max={totalAuthors}
            value={totalInternalAuthors}
            onChange={(e) => handleInternalAuthorsChange(Number(e.target.value))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="1"
          />
        </div>

        {/* Internal Co-Authors - Only for Research Papers */}
        {isResearchOrScopusConference && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Co-Authors <span className="text-red-500">*</span>
              <span className="text-gray-400 text-xs ml-1">(Max: {totalInternalAuthors - 1})</span>
            </label>
            <input
              type="number"
              min="0"
              max={totalInternalAuthors - 1}
              value={totalInternalCoAuthors}
              onChange={(e) => handleInternalCoAuthorsChange(Number(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
        )}
      </div>

      {/* Your Role - Only for Research Papers */}
      {isResearchOrScopusConference && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Role <span className="text-red-500">*</span>
          </label>
          <select
            value={userAuthorRole}
            onChange={(e) => {
              setUserAuthorRole(e.target.value);
              updateData({ userAuthorRole: e.target.value });
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="first_and_corresponding">First & Corresponding Author</option>
            <option value="corresponding">Corresponding Author</option>
            <option value="first">First Author</option>
            <option value="co_author">Co-Author</option>
          </select>
        </div>
      )}

      {/* Additional Info for Books/Chapters */}
      {isBookOrChapter && (
        <div className="flex items-center text-sm text-teal-700 bg-teal-50 px-4 py-3 rounded-lg border border-teal-200">
          <Users className="w-5 h-5 mr-2 flex-shrink-0" />
          Incentive will be distributed equally among all SGT authors
        </div>
      )}

      {/* Additional Author Information - Only for Research Papers and when there are external authors */}
      {isResearchOrScopusConference && (
        <>
          <div className="border-t border-gray-200 pt-4"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* International Author - Only show when there are external authors */}
            {hasExternalAuthors && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  International Author <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {['yes', 'no'].map((v) => (
                    <label key={v} className="inline-flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="hasInternationalAuthor"
                        value={v}
                        checked={hasInternationalAuthor === v}
                        onChange={(e) => {
                          const value = e.target.value as 'yes' | 'no';
                          setHasInternationalAuthor(value);
                          if (value === 'no') {
                            setNumForeignUniversities(0);
                          }
                          updateData({ hasInternationalAuthor: value, numForeignUniversities: value === 'no' ? 0 : numForeignUniversities });
                        }}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="ml-2 capitalize text-gray-700">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student(s) from SGT <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {['yes', 'no'].map((v) => (
                  <label key={v} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="hasLpuStudents"
                      value={v}
                      checked={hasLpuStudents === v}
                      onChange={(e) => {
                        const value = e.target.value as 'yes' | 'no';
                        setHasLpuStudents(value);
                        updateData({ hasLpuStudents: value });
                      }}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="ml-2 capitalize text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Foreign Universities - Only show when International Author is Yes */}
            {hasInternationalAuthor === 'yes' && hasExternalAuthors && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foreign Universities Collaborated
                  {numForeignUniversities > 0 && (
                    <span className="text-orange-600 text-xs ml-1">
                      (Requires {numForeignUniversities} external author{numForeignUniversities > 1 ? 's' : ''})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalAuthors - totalInternalAuthors}
                  value={numForeignUniversities}
                  onChange={(e) => handleForeignUniversitiesChange(Number(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
