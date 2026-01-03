'use client';

import dynamic from 'next/dynamic';

const ConferencePolicyManagement = dynamic(
  () => import('@/components/admin/ConferencePolicyManagement'),
  { ssr: false }
);

export default function ConferencePoliciesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ConferencePolicyManagement />
    </div>
  );
}
