import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface DocumentChange {
  id: string;
  iprApplicationId: string;
  fieldName: string;
  type: 'insert' | 'delete' | 'replace';
  originalText: string;
  newText: string;
  position: number;
  reviewerId: string;
  reviewerName: string;
  comment?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  iprApplicationId: string;
  fieldName: string;
  originalContent: string;
  currentContent: string;
  version: number;
  changes: DocumentChange[];
  lastModifiedBy: string;
  lastModifiedAt: string;
}

class GoogleDocsService {
  // Get document version with changes
  async getDocumentVersion(
    iprApplicationId: string,
    fieldName: string
  ): Promise<DocumentVersion> {
    const response = await axios.get(
      `${API_BASE_URL}/collaborative-editing/document/${iprApplicationId}/${fieldName}`,
      { withCredentials: true }
    );
    return response.data.data;
  }

  // Submit changes to a field
  async submitChanges(
    iprApplicationId: string,
    fieldName: string,
    originalText: string,
    newText: string,
    comment?: string
  ): Promise<DocumentChange> {
    const response = await axios.post(
      `${API_BASE_URL}/collaborative-editing/submit-change`,
      {
        iprApplicationId,
        fieldName,
        originalText,
        newText,
        comment,
        type: 'replace',
        position: 0
      },
      { withCredentials: true }
    );
    return response.data.data;
  }

  // Accept a change (for applicants)
  async acceptChange(changeId: string): Promise<DocumentChange> {
    const response = await axios.post(
      `${API_BASE_URL}/collaborative-editing/accept-change/${changeId}`,
      {},
      { withCredentials: true }
    );
    return response.data.data;
  }

  // Reject a change (for applicants)
  async rejectChange(changeId: string): Promise<DocumentChange> {
    const response = await axios.post(
      `${API_BASE_URL}/collaborative-editing/reject-change/${changeId}`,
      {},
      { withCredentials: true }
    );
    return response.data.data;
  }

  // Apply all accepted changes and update document
  async applyAcceptedChanges(
    iprApplicationId: string,
    fieldName: string
  ): Promise<DocumentVersion> {
    const response = await axios.post(
      `${API_BASE_URL}/collaborative-editing/apply-changes`,
      { iprApplicationId, fieldName },
      { withCredentials: true }
    );
    return response.data.data;
  }

  // Get all pending changes for an application (for notifications)
  async getPendingChanges(iprApplicationId: string): Promise<DocumentChange[]> {
    const response = await axios.get(
      `${API_BASE_URL}/collaborative-editing/pending-changes/${iprApplicationId}`,
      { withCredentials: true }
    );
    return response.data.data;
  }

  // Auto-save draft changes (for real-time collaboration)
  async saveDraft(
    iprApplicationId: string,
    fieldName: string,
    content: string
  ): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/collaborative-editing/save-draft`,
      { iprApplicationId, fieldName, content },
      { withCredentials: true }
    );
  }

  // Get live document status (for real-time updates)
  async getDocumentStatus(iprApplicationId: string): Promise<{
    isBeingEdited: boolean;
    editedBy?: string;
    lastActivity: string;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/collaborative-editing/status/${iprApplicationId}`,
      { withCredentials: true }
    );
    return response.data.data;
  }
}

export const googleDocsService = new GoogleDocsService();
export default googleDocsService;