interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_DISCORD_URL?: string;
  readonly VITE_FACEBOOK_URL?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
