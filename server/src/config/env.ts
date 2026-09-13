import 'dotenv/config';

export const env = {
  appName: process.env.APP_NAME || 'VietnamDong',
  port: Number(process.env.PORT || process.env.SERVER_PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

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
    apiBase: process.env.CARDSWAP_API_BASE,
    apiKey: process.env.CARDSWAP_API_KEY,
    apiSecret: process.env.CARDSWAP_API_SECRET,
  },

  economy: {
    novaToVnd: Number(process.env.NOVA_TO_VND_RATE || 1800),
    minWithdrawNova: Number(process.env.MIN_WITHDRAW_NOVA || 50),
    dailyRewardBase: Number(process.env.DAILY_REWARD_BASE || 1),
  },
} as const;
