export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function getTelegramWebApp(): any {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
}

export function isTelegramMiniApp(): boolean {
  return Boolean(getTelegramWebApp());
}

export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  return null;
}

export function initTelegramWebApp(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand?.();
    } catch (e) {
      console.error('[Telegram WebApp Init Error]', e);
    }
  }
}

export function getTelegramInitData(): string {
  const tg = getTelegramWebApp();
  return tg?.initData || '';
}

export function setupTelegramBackButton(callback: () => void, show: boolean = false): () => void {
  const tg = getTelegramWebApp();
  if (tg?.BackButton) {
    if (show) {
      tg.BackButton.show();
      tg.BackButton.onClick(callback);
    } else {
      tg.BackButton.hide();
    }
    return () => {
      tg.BackButton.offClick(callback);
      tg.BackButton.hide();
    };
  }
  return () => {};
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch {}
  }
}

export function openTelegramLink(url: string) {
  const tg = getTelegramWebApp();
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}
