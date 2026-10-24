import 'dotenv/config';

function resolveClientUrl(): string {
  const custom = process.env.CLIENT_URL?.trim();
  if (custom && !custom.includes('your-project.vercel.app')) {
    return custom.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }
  return 'https://vietnamdong.vercel.app';
}

export const env = {
  appName: process.env.APP_NAME || 'VietnamDong',
  port: Number(process.env.PORT || process.env.SERVER_PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  clientUrl: resolveClientUrl(),
  ipHashSalt: process.env.IP_HASH_SALT || 'vnd-default-ip-salt',
  cspReportOnly: process.env.CSP_REPORT_ONLY === '1' || process.env.CSP_REPORT_ONLY === 'true',
  payoutEncKey: process.env.PAYOUT_ENC_KEY || '',
  cronSecret: process.env.CRON_SECRET || '',

  mail: {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || 'VietnamDong <no-reply@vietnamdong.local>',
  },

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.DISCORD_REDIRECT_URI,
    botToken: process.env.DISCORD_BOT_TOKEN,
    logChannelId: process.env.DISCORD_LOG_CHANNEL_ID,
    alertWebhookUrl: process.env.DISCORD_ALERT_WEBHOOK_URL || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },

  shortlinkTokens: {
    yeumoney: process.env.YEUMONEY_API_TOKEN,
    link4m: process.env.LINK4M_API_TOKEN,
    nhapma: process.env.NHAPMA_API_TOKEN,
    taplayma: process.env.TAPLAYMA_API_TOKEN,
    linktop: process.env.LINKTOP_API_TOKEN,
    bbmkts: process.env.BBMKTS_API_TOKEN,
    traffic68: process.env.TRAFFIC68_API_TOKEN,
    phienchoso: process.env.PHIENCHOSO_API_TOKEN,
  },

  turnstile: {
    siteKey: process.env.TURNSTILE_SITE_KEY,
    secretKey: process.env.TURNSTILE_SECRET_KEY,
  },

  cardswap: {
    partnerId: process.env.CARDSWAP_PARTNER_ID,
    partnerKey: process.env.CARDSWAP_PARTNER_KEY,
    sandbox: process.env.CARDSWAP_SANDBOX === 'true',
  },

  security: {
    maxRegistrationsPerIpPerDay: Number(process.env.MAX_REGISTRATIONS_PER_IP_PER_DAY || 3),
    anomalyTaskCountThreshold: Number(process.env.ANOMALY_TASK_COUNT_THRESHOLD || 30),
    anomalyWindowMinutes: Number(process.env.ANOMALY_WINDOW_MINUTES || 10),
  },

  economy: {
    novaToVnd: Number(process.env.NOVA_TO_VND_RATE || 1800),
    minWithdrawNova: Number(process.env.MIN_WITHDRAW_NOVA || 50),
    dailyRewardBase: Number(process.env.DAILY_REWARD_BASE || 1),
  },
} as const;
