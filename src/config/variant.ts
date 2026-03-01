export const SITE_VARIANT: string = (() => {
  const env = import.meta.env.VITE_VARIANT || 'full';

  // Prioritize local storage over build env so the user can natively select environments
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('worldmonitor-variant');
    if (stored === 'tech' || stored === 'full' || stored === 'finance' || stored === 'happy') return stored;
  }
  return env;
})();
