import type { } from 'react'; // noop import to keep TS happy if not used elsewhere

export type ServerAnnouncement = {
  id: number;
  title: string;
  content: string;
  date_posted: string;
  created_by: number;
  created_at: string;
  updated_at?: string | null;
  expires_at?: string | null;
};

export type CreateAnnouncementPayload = {
  title: string;
  content: string;
  created_by?: number;
};

class NotificationService {
  private baseUrl = '/api/v1';

  private buildHeaders(token?: string, extra: Record<string, string> = {}) {
    const base: Record<string, string> = { Accept: 'application/json', ...extra };
    if (token) base['Authorization'] = `Bearer ${token}`;
    return base;
  }

  async getAnnouncements(token?: string): Promise<ServerAnnouncement[]> {
    const response = await fetch(`${this.baseUrl}/notifications/`, {
      method: 'GET',
      headers: this.buildHeaders(token),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to fetch announcements');
    }
    const result = await response.json();
    return Array.isArray(result?.data) ? result.data : result;
  }

  async createAnnouncement(payload: CreateAnnouncementPayload, token?: string): Promise<ServerAnnouncement> {
    const response = await fetch(`${this.baseUrl}/notifications/send-announcement`, {
      method: 'POST',
      headers: this.buildHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to create announcement');
    }
    const result = await response.json();
    return result?.data ?? result;
  }

  async deleteNotification(id: number, token?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/${id}`, {
      method: 'DELETE',
      headers: this.buildHeaders(token),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to delete announcement');
    }
  }
}

export const notificationService = new NotificationService();