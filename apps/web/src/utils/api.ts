// apps/web/src/utils/api.ts
import { supabase, authService } from './supabase';

const API_URL = (process.env.REACT_APP_API_URL as string) || 'http://localhost:4000';

// allow callers to pass `body` as `any` (we stringify later in request)
type AnyRequestInit = Omit<RequestInit, 'body'> & { body?: any; headers?: HeadersInit };

class ApiService {
  constructor() {
    console.log('[ApiService] Initialized with API URL:', API_URL);
    console.log('[ApiService] Using Supabase for authentication');
  }

  /**
   * Try to retrieve an access token.
   * Priority:
   *  1) Supabase session.access_token (preferred)
   *  2) localStorage fallback keys (authToken, token, accessToken) for backward compat
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const session = await supabase.auth.getSession();
      if (session?.data?.session?.access_token) {
        console.log('[ApiService] Using Supabase session token');
        return session.data.session.access_token;
      }
      // Fall back to checking current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.access_token) {
        console.log('[ApiService] Using current session token');
        return currentSession.access_token;
      }

      // Backwards compatibility: some code paths still store a backend token in localStorage
      const fallback =
        localStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        null;
      return fallback;
    } catch (error) {
      console.warn(
        '[ApiService] getAuthToken failed to read supabase session, checking fallback storage',
        error
      );
      const fallback =
        localStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        null;
      return fallback;
    }
  }

  // Legacy methods for backward compatibility - now deprecated
  setToken(token: string) {
    console.log(
      '[ApiService] setToken called (deprecated - using Supabase auth). Saving as fallback for legacy endpoints.'
    );
    try {
      localStorage.setItem('authToken', token);
    } catch (e) {
      /* ignore storage errors */
    }
  }

  clearToken() {
    console.log(
      '[ApiService] clearToken called - signing out from Supabase and clearing fallback tokens'
    );
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    } catch (e) {
      /* ignore */
    }

    if (authService && typeof authService.signOut === 'function') {
      return authService.signOut();
    }
    if (supabase && typeof supabase.auth.signOut === 'function') {
      return supabase.auth.signOut();
    }
    return Promise.resolve();
  }

  refreshToken() {
    console.log('[ApiService] refreshToken called (handled automatically by Supabase)');
    return true; // Supabase handles token refresh automatically
  }

  // Central request method with Supabase auth
 // Central request method with Supabase auth
async request(endpoint: string, options: AnyRequestInit = {}) {
  // API prefix (can be set in .env as REACT_APP_API_PREFIX). Default to '/api'
  const API_PREFIX = (process.env.REACT_APP_API_PREFIX as string) || '/api';

  // Use a single variable `route` (mutable) so we don't redeclare or reassign a const
  let route = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If endpoint doesn't already include the API prefix, add it
  if (!route.startsWith(API_PREFIX)) {
    route = `${API_PREFIX}${route}`;
  }

const url = `${API_URL}${route}`;

console.log('[ApiService] Making request to:', url);

    const token = await this.getAuthToken();
    console.log('[ApiService] Has token:', !!token);

    // Build headers (case-insensitive)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge provided headers (support Headers instance too)
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((v, k) => {
          headers[k] = v;
        });
      } else {
        Object.assign(headers, options.headers as Record<string, string>);
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[ApiService] Authorization header added');
    } else {
      console.warn('[ApiService] No token available for authenticated request');
    }

    // If body is present and not a string, stringify it when content-type is application/json
    let bodyToSend: BodyInit | undefined = undefined;
    const contentType = (headers['Content-Type'] || headers['content-type'] || '').toLowerCase();

    if (options.body !== undefined && options.body !== null) {
      if (typeof options.body === 'string' || options.body instanceof FormData || options.body instanceof URLSearchParams || options.body instanceof Blob) {
        // It's already a valid BodyInit
        bodyToSend = options.body as BodyInit;
      } else if (contentType.includes('application/json')) {
        try {
          bodyToSend = JSON.stringify(options.body);
        } catch (err) {
          console.warn('[ApiService] Could not stringify request body, sending as-is', err);
          // fallback: try to coerce to string
          bodyToSend = String(options.body) as BodyInit;
        }
      } else {
        // If content-type not JSON, try JSON.stringify as last resort
        try {
          bodyToSend = JSON.stringify(options.body);
        } catch {
          bodyToSend = String(options.body) as BodyInit;
        }
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
      body: bodyToSend,
    };

    // Client-side timeout via AbortController
    const controller = new AbortController();
    const timeoutMs = 12000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    (config as any).signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (networkErr: any) {
      clearTimeout(timeoutId);
      if (networkErr && networkErr.name === 'AbortError') {
        console.error('[ApiService] Request aborted (timeout) for', url);
        throw new Error('Request timeout: server took too long to respond. Please try again.');
      }
      console.error('[ApiService] Network error for', url, networkErr);
      throw new Error(`Network error: ${networkErr?.message || networkErr}`);
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[ApiService] Response status:', response.status, response.statusText);

    // Parse body defensively
    let body: any = null;
    const respContentType = response.headers.get('content-type') || '';
    const respIsJson = respContentType.toLowerCase().includes('application/json');

    try {
      body = respIsJson ? await response.json() : await response.text();
    } catch (e) {
      try {
        body = await response.text();
      } catch {
        body = null;
      }
    }

    if (!response.ok) {
      console.error('[ApiService] API error', response.status, body);

      if (response.status === 401 || response.status === 403) {
        console.error(
          '[ApiService] Authentication error - signing out from Supabase and clearing fallback tokens'
        );
        try {
          localStorage.removeItem('authToken');
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
        } catch (e) {
          /* ignore */
        }

        try {
          if (authService && typeof authService.signOut === 'function') {
            await authService.signOut();
          } else if (supabase && typeof supabase.auth.signOut === 'function') {
            await supabase.auth.signOut();
          }
        } catch (signErr) {
          console.warn('[ApiService] Error during signOut after 401:', signErr);
        }
      }

      const errPayload = typeof body === 'string' ? body : JSON.stringify(body);
      throw new Error(`API Error ${response.status}: ${errPayload}`);
    }

    console.log('[ApiService] Request successful');
    return body;
  }

  // HTTP method helpers - they accept `data` (any) and request() will stringify where needed
  async get(endpoint: string, options: AnyRequestInit = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  async post(endpoint: string, data?: any, options: AnyRequestInit = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data === undefined ? undefined : data,
      ...options,
    });
  }

  async put(endpoint: string, data?: any, options: AnyRequestInit = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data === undefined ? undefined : data,
      ...options,
    });
  }

  async patch(endpoint: string, data?: any, options: AnyRequestInit = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data === undefined ? undefined : data,
      ...options,
    });
  }

  async delete(endpoint: string, options: AnyRequestInit = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // Auth / high-level helpers (now using .post which stringifies)
  async sendOTPByPhone(phone: string) {
    console.log('[ApiService] Sending phone OTP via backend API:', phone);
    try {
      return this.post('/auth/send-otp', { phone });
    } catch (error: any) {
      console.error('[ApiService] Phone OTP error:', error);
      throw error;
    }
  }

  async sendOTPByEmail(email: string) {
    console.log('[ApiService] Sending email OTP via backend API:', email);
    try {
      return this.post('/auth/send-otp', { email });
    } catch (error: any) {
      console.error('[ApiService] Email OTP error:', error);
      throw error;
    }
  }

  async verifyOTPByPhone(phone: string, otp: string) {
    console.log('[ApiService] Verifying phone OTP via backend API');
    try {
      return this.post('/auth/verify-otp', { phone, otp });
    } catch (error: any) {
      console.error('[ApiService] Phone OTP verification error:', error);
      throw error;
    }
  }

  async verifyOTPByEmail(email: string, otp: string) {
    console.log('[ApiService] Verifying email OTP via backend API');
    try {
      return this.post('/auth/verify-otp', { email, otp });
    } catch (error: any) {
      console.error('[ApiService] Email OTP verification error:', error);
      throw error;
    }
  }

  async register(data: any) {
    console.log('[ApiService] Starting registration process...');
    console.log('[ApiService] Registration data:', {
      hasFirstName: !!data.firstName,
      hasLastName: !!data.lastName,
      hasEmail: !!data.email,
      hasPhone: !!data.phone,
      hasConsent: !!data.consent,
    });

    try {
      return this.post('/auth/register', data);
    } catch (error: any) {
      console.error('[ApiService] Registration failed:', error);
      throw error;
    }
  }

  async login(email: string, password: string) {
    console.log('[ApiService] Login attempt for email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Get user profile from database
      let user = null;
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!userError && userData) {
          user = userData;
        }
      }

      return {
        success: true,
        user: user,
        token: data.session?.access_token,
        message: 'Login successful',
      };
    } catch (error: any) {
      console.error('[ApiService] Login failed:', error);
      throw error;
    }
  }

  async submitQuestionnaire(userId: string, answers: any[]) {
    console.log('[ApiService] Submitting questionnaire for user:', userId);
    console.log('[ApiService] Answers count:', answers.length);

    if (!userId) {
      throw new Error('User ID is required for questionnaire submission');
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      throw new Error('Valid answers array is required');
    }

    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const formattedAnswers = answers.map((answer) => ({
      questionId: answer.questionId,
      optionId: answer.optionId,
      trait: answer.trait,
      weight: answer.weight,
      ...(answer.value && { value: answer.value }),
      ...(answer.text && { text: answer.text }),
    }));

    const payload = {
      userId,
      answers: formattedAnswers,
    };

    // use post helper which will stringify payload
    return this.post('/questionnaire/submit', payload);
  }

  async getQuestionnaire(userId?: string) {
    const endpoint = userId ? `/questionnaire/${userId}` : '/questionnaire/me';
    console.log('[ApiService] Getting questionnaire:', endpoint);
    return this.get(endpoint);
  }

  async checkAuth() {
    try {
      if (authService && typeof authService.getCurrentUser === 'function') {
        return authService.getCurrentUser();
      }
    } catch {
      /* ignore */
    }

    const { data } = await supabase.auth.getSession();
    return (data as any)?.session?.user ?? null;
  }

  // NOTE: backend auth profile endpoint is under /auth; call that route explicitly
  async updateProfile(data: any) {
    return this.put('/auth/profile', data);
  }

  // Domain APIs (using helpers that stringify)
  async getDoctors() {
    return this.get('/appointments/doctors');
  }

  async getDoctorAvailability(doctorId: string, date: string) {
    return this.get(`/appointments/doctors/${doctorId}/availability?date=${encodeURIComponent(date)}`);
  }

  async bookAppointment(appointmentData: any) {
    return this.post('/appointments/book', appointmentData);
  }

  async getUserAppointments() {
    return this.get(`/appointments/my`);
  }

  async getAppointment(appointmentId: string) {
    return this.get(`/appointments/${appointmentId}`);
  }

  async cancelAppointment(appointmentId: string, reason?: string) {
    return this.patch(`/appointments/${appointmentId}/cancel`, { reason });
  }

  async rescheduleAppointment(appointmentId: string, newDate: string, newTime: string) {
    return this.patch(`/appointments/${appointmentId}/reschedule`, { newDate, newTime });
  }

  async createPaymentOrder(appointmentData: any) {
    return this.post('/payments/create-order', appointmentData);
  }

  async verifyPayment(paymentData: any) {
    return this.post('/payments/verify', paymentData);
  }

  async getPaymentHistory() {
    return this.get(`/payments/my`);
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    return this.post(`/payments/${paymentId}/refund`, { amount, reason });
  }

  async getHealthRecords() {
    return this.get(`/health-records/my`);
  }

  async updateHealthRecord(recordData: any) {
    return this.put(`/health-records/my`, recordData);
  }

  async getConsultationHistory() {
    return this.get(`/consultations/my`);
  }

  async submitConsultationNotes(appointmentId: string, notes: any) {
    return this.post(`/consultations/${appointmentId}/notes`, notes);
  }

  async getUserNotifications() {
    return this.get(`/notifications/my`);
  }

  async markNotificationRead(notificationId: string) {
    return this.patch(`/notifications/${notificationId}/read`);
  }

  async updateNotificationPreferences(preferences: any) {
    return this.put(`/notifications/preferences/my`, preferences);
  }

  async getDashboardStats() {
    return this.get(`/analytics/dashboard/my`);
  }

  async getHealthProgress(timeframe?: string) {
    return this.get(`/analytics/health-progress/my?timeframe=${timeframe || '3months'}`);
  }
}

export default new ApiService();
