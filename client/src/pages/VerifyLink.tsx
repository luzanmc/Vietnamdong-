import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

interface Attempt {
  taskName: string;
  rewardNova: number;
}
interface VerifyResult {
  rewardNova: number;
}

export default function VerifyLink() {
  const { token } = useParams<{ token: string }>();
  const widgetRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    fetch(`/api/tasks/attempt/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setAttempt(data);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  useEffect(() => {
    if (!attempt || result) return;

    function render() {
      if (!window.turnstile || !widgetRef.current) return;
      window.turnstile.render(widgetRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (captchaToken) => submitVerify(captchaToken),
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
  }, [attempt, result]);

  async function submitVerify(captchaToken: string) {
    setVerifying(true);
    try {
      const res = await fetch(`/api/tasks/attempt/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#0A0A0B] border border-[#232326] rounded-2xl p-6 text-center">
        <div className="text-[10px] text-[#8A8A93] font-mono mb-3 break-all">/vuotlinkthanhcong/{token}/</div>

        {error && <p className="text-sm text-[#F5455C] mb-3">{error}</p>}
        {!error && !attempt && <p className="text-sm text-[#8A8A93]">Đang tải...</p>}

        {!error && attempt && !result && (
          <>
            <div className="text-sm text-[#8A8A93] mb-1">Nhiệm vụ</div>
            <div className="font-semibold mb-4">{attempt.taskName} (+{attempt.rewardNova} Nova)</div>

            {!SITE_KEY && (
              <p className="text-xs text-amber-400 mb-3">
                Chưa cấu hình VITE_TURNSTILE_SITE_KEY — widget sẽ không hiển thị. Lấy site key tại Cloudflare Dashboard → Turnstile.
              </p>
            )}
            <div ref={widgetRef} className="flex justify-center mb-3" />
            {verifying && <p className="text-xs text-[#8A8A93]">Đang xác thực & đối soát với máy chủ...</p>}
          </>
        )}

        {result && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-[#0f2418] border border-[#12B76A]/30 flex items-center justify-center mb-3">
              <i className="bi bi-check-circle-fill text-2xl text-[#12B76A]" />
            </div>
            <div className="font-bold mb-1">🎉 Chúc mừng vượt link thành công!</div>
            <p className="text-sm text-[#8A8A93] mb-3">
              Bạn đã nhận được <span className="font-mono font-semibold text-[#12B76A]">+{result.rewardNova} Nova</span>
            </p>
            <a href="/dashboard" className="inline-block bg-white text-black text-sm font-semibold px-5 py-2 rounded-lg">
              Quay lại trang chủ
            </a>
          </>
        )}
      </div>
    </div>
  );
}
