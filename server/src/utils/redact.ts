export function redactEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '***';
  const firstChar = trimmed[0];
  const domain = trimmed.slice(atIndex);
  return `${firstChar}***${domain}`;
}

export function redactToken(token: string): string {
  if (!token || typeof token !== 'string') return '';
  const trimmed = token.trim();
  if (trimmed.length <= 8) return '***';
  return `${trimmed.slice(0, 4)}...***`;
}

export function redactAccountNumber(accountNumber: string): string {
  if (!accountNumber || typeof accountNumber !== 'string') return '';
  const cleaned = accountNumber.trim();
  if (cleaned.length <= 4) return '****';
  return `******${cleaned.slice(-4)}`;
}

export function redactPassword(_password: string): string {
  return '[REDACTED_PASSWORD]';
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const JWT_REGEX = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

export function redactString(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(EMAIL_REGEX, (match) => redactEmail(match))
    .replace(JWT_REGEX, (match) => redactToken(match));
}

export function redactSensitive(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return redactString(data);
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Error) {
    const cleanErr: Record<string, any> = {
      name: data.name,
      message: redactString(data.message),
    };
    if (data.stack) {
      cleanErr.stack = redactString(data.stack);
    }
    for (const key of Object.keys(data)) {
      cleanErr[key] = redactSensitive((data as any)[key]);
    }
    return cleanErr;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitive(item));
  }

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('passwd') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('credential') ||
      lowerKey.includes('totp') ||
      lowerKey.includes('cookie')
    ) {
      result[key] = '[REDACTED]';
    } else if (lowerKey.includes('email') && typeof val === 'string') {
      result[key] = redactEmail(val);
    } else if (
      (lowerKey.includes('account') || lowerKey.includes('stk') || lowerKey.includes('destination')) &&
      typeof val === 'string'
    ) {
      result[key] = redactAccountNumber(val);
    } else {
      result[key] = redactSensitive(val);
    }
  }
  return result;
}
