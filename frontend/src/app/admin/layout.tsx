'use client';

import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
