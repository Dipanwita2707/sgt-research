'use client';

import dynamic from 'next/dynamic';

const BookPolicyManagement = dynamic(
  () => import('@/components/admin/BookPolicyManagement'),
  { ssr: false }
);

export default function BookPoliciesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <BookPolicyManagement />
    </div>
  );
}
