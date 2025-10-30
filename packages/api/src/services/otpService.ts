import crypto from 'crypto';
import { supabase } from '../db/supabaseClient';

type Identifier = { phone?: string; email?: string };

// In-memory fallback storage for development
const memoryOtpStore = new Map<string, {
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}>();

export const otpService = {
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  hashOTP(otp: string): string {
    const salt = process.env.OTP_SALT || 'dev-salt-change-in-production';
    return crypto.createHash('sha256').update(otp + salt).digest('hex');
  },

  normalizeIdentifier(identifier: string): Identifier {
    const trimmed = String(identifier).trim();
    if (trimmed.includes('@')) {
      return { email: trimmed.toLowerCase() };
    }
    const digits = trimmed.replace(/\D/g, '');
    return { phone: digits };
  },

  validatePhoneNumber(phone: string): boolean {
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) return /^[6-9]\d{9}$/.test(cleaned);
    if (cleaned.length === 12) return /^91[6-9]\d{9}$/.test(cleaned);
    return false;
  },

  formatPhoneForStorage(phone: string): string {
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned.substring(2);
    return cleaned;
  },

  async storeOTP(keyRaw: string, otp: string): Promise<boolean> {
    const key = String(keyRaw).trim();
    const isEmail = key.includes('@');
    const phone = !isEmail ? this.formatPhoneForStorage(key) : null;
    const email = isEmail ? key.toLowerCase() : null;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    console.log(`[otpService] 📦 Storing OTP for key=${key}, phone=${phone}, email=${email}`);

    try {
      if (phone) {
        await supabase.from('otp_tokens').delete().eq('phone', phone);
      } else if (email) {
        await supabase.from('otp_tokens').delete().eq('email', email);
      }

      const insertResult = await supabase
        .from('otp_tokens')
        .insert({
          otp_hash: this.hashOTP(otp),
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          attempts: 0,
          phone,
          email
        })
        .select()
        .single();

      if (insertResult.error) {
        console.error('[otpService] ❌ Supabase insert error:', insertResult.error);
        throw insertResult.error;
      }

      console.log(`[otpService] ✅ OTP stored for ${key} exp=${expiresAt.toISOString()}`);
      return true;
    } catch (err) {
      console.warn('[otpService] ⚠️ DB failed, using memory fallback:', err);

      memoryOtpStore.set(key, {
        otpHash: this.hashOTP(otp),
        expiresAt,
        attempts: 0,
        createdAt: new Date()
      });

      return true;
    }
  },

  async verifyOTP(keyRaw: string, inputOtp: string): Promise<boolean> {
    const key = String(keyRaw).trim();
    const isEmail = key.includes('@');
    const phone = !isEmail ? this.formatPhoneForStorage(key) : null;
    const email = isEmail ? key.toLowerCase() : null;
    const hashedOTP = this.hashOTP(inputOtp);

    console.log(`[otpService] 🔍 Verifying OTP for key=${key}, phone=${phone}, email=${email}`);

    try {
      let query = supabase.from('otp_tokens').select('*').eq('otp_hash', hashedOTP);
      if (phone) query = query.eq('phone', phone);
      if (email) query = query.eq('email', email);

      const res: any = await query.maybeSingle();
      const data = res?.data ?? res;

      if (data) {
        const expiry = new Date(data.expires_at);
        if (expiry < new Date()) {
          console.log('[otpService] ❌ OTP expired (db)');
          await supabase.from('otp_tokens').delete().eq('id', data.id);
          return false;
        }
        await supabase.from('otp_tokens').delete().eq('id', data.id);
        console.log('[otpService] ✅ OTP verified (db)');
        return true;
      }
    } catch (err) {
      console.warn('[otpService] ⚠️ DB verify failed, fallback to memory:', err);
    }

    // Memory fallback
    const record = memoryOtpStore.get(key);
    if (!record) return false;
    if (record.otpHash !== hashedOTP) return false;
    if (record.expiresAt < new Date()) {
      memoryOtpStore.delete(key);
      return false;
    }

    memoryOtpStore.delete(key);
    console.log('[otpService] ✅ OTP verified (memory)');
    return true;
  }
};
