import { useEffect, useRef } from 'react';

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; theme?: string; callback: (token: string) => void; 'expired-callback'?: () => void }) => string;
      reset: (id?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  reset?: number;
}

export default function TurnstileWidget({ onToken, reset }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!SITE_KEY) return;

    function render() {
      if (!window.turnstile || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: onToken,
        'expired-callback': () => onToken(''),
      });
    }

    if (window.turnstile) {
      render();
    } else {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.onload = render;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (reset === undefined) return;
    if (window.turnstile && widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
  }, [reset]);

  if (!SITE_KEY) {
    return (
      <p className="text-[11px] text-amber-500">
        Chưa cấu hình VITE_TURNSTILE_SITE_KEY — widget Captcha sẽ không hiển thị.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
