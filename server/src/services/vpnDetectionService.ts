const cache = new Map<string, { isVpn: boolean; expires: number }>();

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  return false;
}

export async function checkIsVpn(rawIp: string): Promise<{ isVpn: boolean; ip: string }> {
  // Extract real client IP
  const ip = (rawIp || '').split(',')[0].trim().replace(/^::ffff:/, '');

  if (!ip || isPrivateIp(ip)) {
    return { isVpn: false, ip: ip || '127.0.0.1' };
  }

  const cached = cache.get(ip);
  if (cached && cached.expires > Date.now()) {
    return { isVpn: cached.isVpn, ip };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,countryCode`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as { status: string; proxy?: boolean; hosting?: boolean };
      if (data.status === 'success') {
        const isVpn = Boolean(data.proxy || data.hosting);
        cache.set(ip, { isVpn, expires: Date.now() + 1000 * 60 * 60 * 12 }); // 12 hours cache
        return { isVpn, ip };
      }
    }
  } catch {
    // If external service fails or timeout, fallback to safe false
  }

  return { isVpn: false, ip };
}
