import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext.js';
import { api } from '../api/client.js';

export interface CardPreset {
  n: string;
  v: string;
}

export const CARD_PRESETS: CardPreset[] = [
  { n: 'Đen', v: '#050505' },
  { n: 'Chàm – cyan', v: 'linear-gradient(135deg,#312e81 0%,#4f46e5 45%,#0891b2 100%)' },
  { n: 'Xanh đêm', v: 'linear-gradient(135deg,#020617,#0f172a 50%,#1e3a8a)' },
  { n: 'Tím', v: 'linear-gradient(135deg,#2e1065,#7c3aed 60%,#c026d3)' },
  { n: 'Đỏ rượu', v: 'linear-gradient(135deg,#1c0a0a,#7f1d1d 55%,#dc2626)' },
  { n: 'Lục bảo', v: 'linear-gradient(135deg,#022c22,#047857 60%,#34d399)' },
  { n: 'Hoàng hôn', v: 'linear-gradient(135deg,#1e1b4b,#be185d 55%,#f59e0b)' },
];

export const DEFAULT_CARD_BG = "#050505 url('/card-background.png') center/cover no-repeat";

interface CardContextValue {
  cardBg: string;
  showWatermark: boolean;
  isCustomizerOpen: boolean;
  openCustomizer: () => void;
  closeCustomizer: () => void;
  setCardBg: (bg: string) => void;
  setShowWatermark: (show: boolean) => void;
  resetToDefault: () => void;
  effectiveBackground: string;
}

const CardContext = createContext<CardContextValue | null>(null);

export function CardProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();

  // Load initial from localStorage
  const [cardBg, setCardBgState] = useState<string>(() => {
    return localStorage.getItem('vnd_card_bg') || '';
  });

  const [showWatermark, setShowWatermarkState] = useState<boolean>(() => {
    const stored = localStorage.getItem('vnd_card_wm');
    return stored !== null ? stored === 'true' : true;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Sync with user profile once authenticated
  useEffect(() => {
    if (me) {
      if (me.card_bg !== undefined && me.card_bg !== null) {
        setCardBgState(me.card_bg);
        localStorage.setItem('vnd_card_bg', me.card_bg);
      }
      if (me.card_show_wm !== undefined) {
        setShowWatermarkState(Boolean(me.card_show_wm));
        localStorage.setItem('vnd_card_wm', String(Boolean(me.card_show_wm)));
      }
    }
  }, [me]);

  const setCardBg = (bg: string) => {
    setCardBgState(bg);
    localStorage.setItem('vnd_card_bg', bg);
    if (me) {
      api.updateCardConfig({ card_bg: bg, card_show_wm: showWatermark }).catch(() => {});
    }
  };

  const setShowWatermark = (show: boolean) => {
    setShowWatermarkState(show);
    localStorage.setItem('vnd_card_wm', String(show));
    if (me) {
      api.updateCardConfig({ card_bg: cardBg || null, card_show_wm: show }).catch(() => {});
    }
  };

  const resetToDefault = () => {
    setCardBgState('');
    setShowWatermarkState(true);
    localStorage.removeItem('vnd_card_bg');
    localStorage.setItem('vnd_card_wm', 'true');
    if (me) {
      api.updateCardConfig({ card_bg: null, card_show_wm: true }).catch(() => {});
    }
  };

  const effectiveBackground = cardBg ? cardBg : DEFAULT_CARD_BG;

  return (
    <CardContext.Provider
      value={{
        cardBg,
        showWatermark,
        isCustomizerOpen,
        openCustomizer: () => setIsCustomizerOpen(true),
        closeCustomizer: () => setIsCustomizerOpen(false),
        setCardBg,
        setShowWatermark,
        resetToDefault,
        effectiveBackground,
      }}
    >
      {children}
    </CardContext.Provider>
  );
}

export function useCardTheme(): CardContextValue {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error('useCardTheme must be used within CardProvider');
  return ctx;
}
