import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface MeetingData {
  attendeeEmails: string;
  subject: string;
  description: string;
  duration: string;
  date: string;
  time: string;
}

export const api = {
  async checkAuthStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/status`);
      return response.data.isAuthenticated;
    } catch (error) {
      console.error('Auth status check failed');
      return false;
    }
  },

  async createMeeting(meetingData: MeetingData): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/meetings/create`, meetingData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.detail || 'Failed to create meeting');
      }
      throw new Error('Failed to create meeting');
    }
  }
};