// Configuração pública do app web (não é segredo: a segurança está nas regras).
export const CONFIG_FIREBASE = {
  "projectId": "lohagoyo-prod",
  "appId": "1:600929690300:web:b1a8f4d95ea391ad0766b9",
  "storageBucket": "lohagoyo-prod.firebasestorage.app",
  "apiKey": "AIzaSyAJb2tpDM1vMwuQ5uLcaNBRqlKPsI1Cy1g",
  "authDomain": "lohagoyo-prod.firebaseapp.com",
  "messagingSenderId": "600929690300"
};

// Chave do site reCAPTCHA Enterprise para o App Check (pública, não é segredo).
// Vazia = App Check desligado. Ao preencher, ligar também APP_CHECK=1 em functions/.env.
export const RECAPTCHA_SITE_KEY = '6LdooB0uAAAAAPBmD5m-_AAUsjMOch0gEaHCgxWi';
