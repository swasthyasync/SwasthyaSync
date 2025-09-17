// apps/web/src/utils/api.ts
const API_URL = (process.env.REACT_APP_API_URL as string) || 'http://localhost:4000';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${path}`;

    console.log('[ApiService] Request URL:', url);

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...(options.headers as Record<string, string> | undefined),
      },
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (networkErr: any) {
      console.error('[ApiService] Network error for', url, networkErr);
      throw new Error(`Network error: ${networkErr?.message || networkErr}`);
    }

    let body: any = null;
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    try {
      body = isJson ? await response.json() : await response.text();
    } catch {
      body = await response.text().catch(() => null);
    }

    if (!response.ok) {
      console.error('[ApiService] API error', response.status, body);
      throw new Error(`API Error ${response.status}: ${JSON.stringify(body)}`);
    }

    return body;
  }

  // ✅ Auth endpoints
  async sendOTPByPhone(phone: string) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async sendOTPByEmail(email: string) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyOTPByPhone(phone: string, otp: string) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async verifyOTPByEmail(email: string, otp: string) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async register(data: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // ✅ Questionnaire endpoints
  async submitQuestionnaire(userId: string, answers: any) {
    return this.request('/questionnaire/submit', {
      method: 'POST',
      body: JSON.stringify({ userId, answers }),
    });
  }

  async getQuestionnaire(userId: string) {
    return this.request(`/questionnaire/${userId}`);
  }

  // ✅ Profile endpoints
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(data: any) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ✅ NEW: Appointment endpoints
  async getDoctors() {
    return this.request('/appointments/doctors');
  }

  async getDoctorAvailability(doctorId: string, date: string) {
    return this.request(`/appointments/doctors/${doctorId}/availability?date=${date}`);
  }

  async bookAppointment(appointmentData: any) {
    return this.request('/appointments/book', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async getUserAppointments(userId: string) {
    return this.request(`/appointments/user/${userId}`);
  }

  async getAppointment(appointmentId: string) {
    return this.request(`/appointments/${appointmentId}`);
  }

  async cancelAppointment(appointmentId: string, reason?: string) {
    return this.request(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async rescheduleAppointment(appointmentId: string, newDate: string, newTime: string) {
    return this.request(`/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ newDate, newTime }),
    });
  }

  // ✅ NEW: Payment endpoints
  async createPaymentOrder(appointmentData: any) {
    return this.request('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async verifyPayment(paymentData: any) {
    return this.request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentHistory(userId: string) {
    return this.request(`/payments/user/${userId}`);
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    return this.request(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  // ✅ NEW: Health Records endpoints
  async getHealthRecords(userId: string) {
    return this.request(`/health-records/${userId}`);
  }

  async updateHealthRecord(userId: string, recordData: any) {
    return this.request(`/health-records/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(recordData),
    });
  }

  // ✅ NEW: Consultation endpoints
  async getConsultationHistory(userId: string) {
    return this.request(`/consultations/user/${userId}`);
  }

  async submitConsultationNotes(appointmentId: string, notes: any) {
    return this.request(`/consultations/${appointmentId}/notes`, {
      method: 'POST',
      body: JSON.stringify(notes),
    });
  }

  // ✅ NEW: Notification endpoints
  async getUserNotifications(userId: string) {
    return this.request(`/notifications/user/${userId}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async updateNotificationPreferences(userId: string, preferences: any) {
    return this.request(`/notifications/preferences/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // ✅ NEW: Analytics endpoints
  async getDashboardStats(userId: string) {
    return this.request(`/analytics/dashboard/${userId}`);
  }

  async getHealthProgress(userId: string, timeframe?: string) {
    return this.request(`/analytics/health-progress/${userId}?timeframe=${timeframe || '3months'}`);
  }
}

export default new ApiService();