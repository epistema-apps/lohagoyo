// App Check: prova invisível (reCAPTCHA Enterprise) de que o pedido vem do site num navegador real.
import type { FirebaseApp } from 'firebase/app';
import type { AppCheck } from 'firebase/app-check';
import { RECAPTCHA_SITE_KEY } from './config-firebase';

let _ac: Promise<AppCheck | null> | null = null;

/** Liga o App Check (uma vez). Sem chave ou no emulador, não faz nada. */
export function ligarAppCheck(app: FirebaseApp): Promise<AppCheck | null> {
  if (!_ac) {
    _ac = !RECAPTCHA_SITE_KEY || import.meta.env.PUBLIC_EMULADOR === '1'
      ? Promise.resolve(null)
      : import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) =>
          initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }));
  }
  return _ac;
}

/** Garante um token válido antes de um envio (espera o reCAPTCHA carregar; desiste em 10 s). */
export async function esperarToken(app: FirebaseApp): Promise<void> {
  const ac = await ligarAppCheck(app);
  if (!ac) return;
  const { getToken } = await import('firebase/app-check');
  await Promise.race([getToken(ac).catch(() => undefined), new Promise((r) => setTimeout(r, 10000))]);
}
