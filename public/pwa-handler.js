/* One shared installation controller: capture the browser event before React mounts. */
(() => {
  if (window.dearlyPwa) return;
  let pending = null;
  const mode = window.matchMedia('(display-mode: standalone)');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installed = mode.matches || navigator.standalone === true;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('pwa-dismissed') === 'true'; } catch {}
  const notify = () => window.dispatchEvent(new Event('dearly:pwa-change'));
  window.dearlyPwa = {
    state: () => ({ installed, dismissed, ios, available: !!pending }),
    dismiss() { dismissed = true; try { sessionStorage.setItem('pwa-dismissed', 'true'); } catch {} notify(); },
    async install() {
      if (!pending) return 'guide';
      const event = pending; pending = null; notify();
      try { await event.prompt(); const choice = await event.userChoice; return choice.outcome; }
      catch { return 'guide'; }
    }
  };
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pending = event; notify(); });
  window.addEventListener('appinstalled', () => { installed = true; pending = null; notify(); });
  mode.addEventListener('change', () => { installed = mode.matches || navigator.standalone === true; notify(); });
  notify();
})();
