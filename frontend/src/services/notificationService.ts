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

  async getAnnouncements(): Promise<ServerAnnouncement[]> {
    const response = await fetch(`${this.baseUrl}/notifications/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to fetch announcements');
    }
    const result = await response.json();
    return Array.isArray(result?.data) ? result.data : result;
  }

  async createAnnouncement(payload: CreateAnnouncementPayload): Promise<ServerAnnouncement> {
    const response = await fetch(`${this.baseUrl}/notifications/send-announcement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to create announcement');
    }
    const result = await response.json();
    return result?.data ?? result;
  }

  async deleteNotification(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to delete announcement');
    }
  }
}

export const notificationService = new NotificationService();