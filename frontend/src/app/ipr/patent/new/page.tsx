import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import IPRIdeaRequestForm from '@/components/ipr/IPRIdeaRequestForm';

export default function PatentFilingPage() {
  return (
    <ProtectedRoute>
      <IPRIdeaRequestForm />
    </ProtectedRoute>
  );
}
