import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { LEGAL, type LegalKind } from '../content/legal.js';
import Footer from '../components/Footer.js';

const ICONS: Record<LegalKind, string> = {
  terms: 'bi-file-earmark-text',
  privacy: 'bi-shield-lock',
  about: 'bi-info-circle',
};

export default function Legal({ kind }: { kind: LegalKind }) {
  const { lang, toggle: toggleLang, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const doc = LEGAL[lang][kind];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${doc.title} | VietnamDong`;
    return () => {
      document.title = 'VietnamDong';
    };
  }, [doc.title]);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="border-b border-line sticky top-0 z-30 bg-bg/90 backdrop-blur">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="VietnamDong" className="w-7 h-7" />
            <span className="font-display font-semibold tracking-tight">VietnamDong</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface2 transition"
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
            </button>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink transition px-2.5 py-1.5 rounded-md hover:bg-surface2 border border-line"
            >
              <i className="bi bi-translate text-sm" />
              <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 page-enter">
        <nav className="flex flex-wrap gap-2 mb-6">
          {(['terms', 'privacy', 'about'] as LegalKind[]).map((k) => (
            <Link
              key={k}
              to={`/${k}`}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                k === kind
                  ? 'bg-indigo/10 border-indigo/40 text-indigo'
                  : 'border-line text-muted hover:text-ink hover:bg-surface2'
              }`}
            >
              <i className={`bi ${ICONS[k]}`} /> {LEGAL[lang][k].title}
            </Link>
          ))}
        </nav>

        <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-2xl p-5 sm:p-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <i className={`bi ${ICONS[kind]} text-indigo`} /> {doc.title}
          </h1>
          {doc.updated && <p className="text-xs text-muted mt-2">{doc.updated}</p>}
          <p className="text-sm text-muted leading-relaxed mt-5">{doc.intro}</p>

          <div className="mt-6 space-y-7">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display font-semibold text-base mb-2.5">{section.heading}</h2>
                {section.paragraphs?.map((p) => (
                  <p key={p} className="text-sm text-muted leading-relaxed mb-2">{p}</p>
                ))}
                {section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-muted leading-relaxed">
                        <i className="bi bi-dot text-indigo text-xl leading-none -mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-indigo hover:underline">
            <i className="bi bi-arrow-left" /> {t('legal.back_home')}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
