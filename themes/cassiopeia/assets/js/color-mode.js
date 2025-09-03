// Bootstrap color mode: honor 'auto', server-rendered default, localStorage, and system preference.
(function () {
  // localStorage override (explicit user setting stored in-browser)
  const stored = localStorage.getItem('theme'); // 'light' | 'dark' | 'auto' | null

  // server-rendered default from data-bs-theme on <html>
  const serverTheme = document.documentElement.getAttribute('data-bs-theme'); // could be 'light', 'dark', or 'auto'

  // Resolve the preferred mode in this priority:
  // 1. localStorage stored value (if present)
  // 2. serverTheme (if present and not empty)
  // 3. system preference
  const getPreferred = () => {
    if (stored) return stored;
    if (serverTheme) {
      return serverTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const resolveMode = (mode) => {
    if (mode === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  };

  const apply = (mode) => {
    const theme = resolveMode(mode);
    document.documentElement.setAttribute('data-bs-theme', theme);
  };

  // Initial apply: respect localStorage or server-rendered theme; fall back to system.
  apply(getPreferred());

  // React to OS theme changes only when the effective source allows it:
  // - If localStorage has an explicit non-'auto' value, do nothing.
  // - If localStorage is 'auto', follow system.
  // - If no localStorage but serverTheme === 'auto', follow system.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem('theme');
    const serverIsAuto = serverTheme === 'auto';
    if (current === 'auto' || (!current && serverIsAuto)) {
      apply(getPreferred());
    }
  });
})();