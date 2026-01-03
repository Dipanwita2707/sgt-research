'use client';

import dynamic from 'next/dynamic';

const BookChapterPolicyManagement = dynamic(
  () => import('@/components/admin/BookChapterPolicyManagement'),
  { ssr: false }
);

export default function BookChapterPoliciesPage() {
  return <BookChapterPolicyManagement />;
}
