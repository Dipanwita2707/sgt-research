import api from '@/lib/api';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  userType: string;
  firstName: string | null;
  lastName: string | null;
  uid: string;
  role: {
    id: string;
    name: string;
    displayName?: string;
  } | null;
  employeeDetails: {
    id: string;
    employeeId?: string;
    phone?: string;
    email?: string;
    joiningDate?: string;
    department?: {
      id: string;
      name: string;
      code?: string;
      school?: {
        id: string;
        name: string;
        code?: string;
      };
    };
    designation?: {
      id: string;
      name: string;
    };
  } | null;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  iprUpdates: boolean;
  taskReminders: boolean;
  systemAlerts: boolean;
  weeklyDigest: boolean;
  theme: string;
  language: string;
  compactView: boolean;
  showTips: boolean;
}

export interface UpdateSettingsData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  iprUpdates?: boolean;
  taskReminders?: boolean;
  systemAlerts?: boolean;
  weeklyDigest?: boolean;
  theme?: string;
  language?: string;
  compactView?: boolean;
  showTips?: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

class ProfileService {
  async updateProfile(data: UpdateProfileData): Promise<{ user: UserProfile; message: string }> {
    const response = await api.put('/auth/profile', data);
    return response.data;
  }

  async getSettings(): Promise<UserSettings> {
    const response = await api.get('/auth/settings');
    return response.data.settings;
  }

  async updateSettings(data: UpdateSettingsData): Promise<{ settings: UserSettings; message: string }> {
    const response = await api.put('/auth/settings', data);
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  }
}

export const profileService = new ProfileService();
