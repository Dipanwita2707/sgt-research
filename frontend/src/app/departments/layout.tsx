'use client';

import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
