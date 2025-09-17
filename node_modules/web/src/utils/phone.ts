// apps/web/src/utils/phone.ts
export const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle Indian phone numbers
  if (digits.startsWith('91') && digits.length === 12) {
    return digits; // Already has country code
  } else if (digits.length === 10) {
    return `91${digits}`; // Add Indian country code
  }
  
  return digits;
};

export const formatPhone = (phone: string): string => {
  const normalized = normalizePhone(phone);
  
  if (normalized.startsWith('91') && normalized.length === 12) {
    // Format as +91 XXXXX XXXXX
    return `+${normalized.slice(0, 2)} ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
  }
  
  return phone;
};

export const validatePhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  
  // Check for Indian phone number (10 digits or 12 with country code)
  return (normalized.length === 10 && /^[6-9]\d{9}$/.test(normalized)) ||
         (normalized.length === 12 && /^91[6-9]\d{9}$/.test(normalized));
};