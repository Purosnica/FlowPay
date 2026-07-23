/**
 * Preferencias locales del formulario de login.
 * Solo persiste el email (nunca la contraseña).
 */

export const LOGIN_PREF_KEYS = {
  rememberEmail: 'flowpay_login_remember_email',
  savedEmail: 'flowpay_login_saved_email',
} as const;

export type LoginEmailPrefs = {
  remember: boolean;
  email: string;
};

export function leerLoginEmailPrefs(): LoginEmailPrefs {
  if (typeof window === 'undefined') {
    return { remember: false, email: '' };
  }
  try {
    const remember =
      localStorage.getItem(LOGIN_PREF_KEYS.rememberEmail) === '1';
    const email = remember
      ? (localStorage.getItem(LOGIN_PREF_KEYS.savedEmail) ?? '')
      : '';
    return { remember, email };
  } catch {
    return { remember: false, email: '' };
  }
}

export function guardarLoginEmailPrefs(
  remember: boolean,
  email: string,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (!remember) {
      localStorage.removeItem(LOGIN_PREF_KEYS.rememberEmail);
      localStorage.removeItem(LOGIN_PREF_KEYS.savedEmail);
      return;
    }
    localStorage.setItem(LOGIN_PREF_KEYS.rememberEmail, '1');
    localStorage.setItem(LOGIN_PREF_KEYS.savedEmail, email.trim());
  } catch {
    // localStorage no disponible (modo privado, cuota, etc.)
  }
}
