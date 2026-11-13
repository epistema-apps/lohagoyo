// App Check: prova invisível (reCAPTCHA Enterprise) de que o pedido vem do site num navegador real.
import type { FirebaseApp } from 'firebase/app';
import { RECAPTCHA_SITE_KEY } from './config-firebase';

let ligado = false;
export async function ligarAppCheck(app: FirebaseApp): Promise<void> {
  if (ligado || !RECAPTCHA_SITE_KEY || import.meta.env.PUBLIC_EMULADOR === '1') return;
  ligado = true;
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
}
