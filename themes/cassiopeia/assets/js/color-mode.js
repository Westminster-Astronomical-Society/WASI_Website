// Bootstrap color mode: honor 'auto' and system preference.
(() => {
  const stored = localStorage.getItem('theme'); // optional user override: 'light' | 'dark' | 'auto'

  const getPreferred = () => {
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const apply = (mode) => {
    const theme = mode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    document.documentElement.setAttribute('data-bs-theme', theme);
  };

  // Initial apply (runs before CSS is loaded if included early in <head>)
  apply(getPreferred());

  // React to OS theme changes (only when no explicit override or override is 'auto')
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem('theme');
    if (!current || current === 'auto') apply(getPreferred());
  });
})();