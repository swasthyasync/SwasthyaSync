// packages/api/src/services/smsService.ts
export const smsService = {
  async sendOTP(phone: string, otp: string) {
    const provider = process.env.SMS_PROVIDER || 'dev';

    // Normalize phone digits for logging/sending
    const cleaned = String(phone).replace(/\D/g, '');
    const normalized = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned.substring(2) : cleaned;

    if (provider === 'dev') {
      // Development mode - just log the OTP
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 SMS OTP (Development Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Phone: +91 ${normalized}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Time: ${new Date().toLocaleString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💡 Use this OTP in the verification screen');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return { success: true, messageId: 'dev-' + Date.now() };
    }

    // Production mode - integrate with actual SMS provider
    throw new Error('SMS provider not configured');
  },

  async sendAppointmentReminder(phone: string, appointmentDetails: any) {
    const provider = process.env.SMS_PROVIDER || 'dev';
    const cleaned = String(phone).replace(/\D/g, '');
    const normalized = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned.substring(2) : cleaned;

    if (provider === 'dev') {
      console.log('📅 Appointment Reminder (Dev Mode)');
      console.log(`Phone: +91 ${normalized}`);
      console.log(`Details:`, appointmentDetails);
      return { success: true };
    }

    // Production implementation here
    throw new Error('SMS provider not configured');
  }
};
