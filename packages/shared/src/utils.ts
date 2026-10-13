// Common utility functions

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters
  let normalized = phoneNumber.replace(/\D/g, '');
  
  // Add country code if missing (assuming India +91 as default for this use case)
  if (normalized.length === 10) {
    normalized = '91' + normalized;
  }
  
  return normalized;
}

export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length < 4) return phoneNumber;
  const last4 = phoneNumber.slice(-4);
  const masked = '*'.repeat(phoneNumber.length - 4);
  return masked + last4;
}

export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!domain) return email;
  
  const visibleChars = Math.min(3, Math.floor(username.length / 2));
  const masked = username.slice(0, visibleChars) + '*'.repeat(username.length - visibleChars);
  return `${masked}@${domain}`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function exponentialBackoff(attempt: number, baseDelay: number = 1000): number {
  const jitter = Math.random() * 0.3 * baseDelay;
  return Math.min(baseDelay * Math.pow(2, attempt) + jitter, 30000);
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const value = String(item[key]);
    if (!groups[value]) {
      groups[value] = [];
    }
    groups[value].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
  const normalized = normalizePhoneNumber(phoneNumber);
  return normalized.length >= 10 && normalized.length <= 15;
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string, locale: string = 'en-IN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: string = 'en-IN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d);
}

export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function redactSensitiveData(obj: any): any {
  const sensitive = ['password', 'token', 'secret', 'key', 'credentials', 'authorization'];
  
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some((s) => lowerKey.includes(s))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
