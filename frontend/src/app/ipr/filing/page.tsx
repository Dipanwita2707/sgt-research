import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import IPRIdeaRequestForm from '@/components/ipr/IPRIdeaRequestForm';

export default function IPRFilingPage() {
  return (
    <ProtectedRoute>
      <IPRIdeaRequestForm />
    </ProtectedRoute>
  );
}