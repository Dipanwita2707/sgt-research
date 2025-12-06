'use client';

import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function DRDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
