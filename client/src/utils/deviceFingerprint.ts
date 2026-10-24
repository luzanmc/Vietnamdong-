let cachedFp: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFp) return cachedFp;
  try {
    const data = [
      navigator.userAgent || '',
      navigator.language || '',
      Intl?.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`,
      navigator.hardwareConcurrency || 0,
      navigator.platform || '',
    ].join('|||');

    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    cachedFp = hashHex;
    return hashHex;
  } catch {
    return 'generic-device-fallback';
  }
}
