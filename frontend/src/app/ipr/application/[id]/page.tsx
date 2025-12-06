'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import IprApplicationDetails from '@/components/ipr/IprApplicationDetails';

export default function ApplicationDetailsPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <IprApplicationDetails applicationId={params.id} />
    </ProtectedRoute>
  );
}
