import api from '@/lib/api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: {
    actionUrl?: string;
    actionLabel?: string;
    reviewerName?: string;
    applicantResponse?: string;
    comments?: string;
    fieldName?: string;
    suggestionId?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

class NotificationService {
  async getNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<NotificationResponse> {
    const { page = 1, limit = 20, unreadOnly = false } = params || {};
    const response = await api.get('/notifications', {
      params: { page, limit, unreadOnly }
    });
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return response.data.unreadCount;
  }

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/mark-all-read');
  }

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  }
}

export const notificationService = new NotificationService();
