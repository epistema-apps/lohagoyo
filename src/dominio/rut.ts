// RUT chileno: normalização e validação do dígito verificador (módulo 11).

/** "12.345.678-5" / "123456785" → "12345678-5" (sem pontos, K maiúsculo). Vazio se não parecer RUT. */
export function normalizarRut(entrada: string): string {
  const s = entrada.replace(/[^0-9kK]/g, '').toUpperCase();
  if (s.length < 2) return '';
  return `${s.slice(0, -1)}-${s.slice(-1)}`;
}

export function digitoVerificador(corpo: string): string {
  let soma = 0;
  let mult = 2;
  for (let i = corpo.length - 1; i >= 0; i--) {
    soma += Number(corpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (soma % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}

export function rutValido(entrada: string): boolean {
  const n = normalizarRut(entrada);
  const m = /^(\d{7,8})-([0-9K])$/.exec(n);
  return !!m && digitoVerificador(m[1]) === m[2];
}

/** "12345678-5" → "12.345.678-5" para exibir. */
export function formatarRut(entrada: string): string {
  const n = normalizarRut(entrada);
  const [corpo, dv] = n.split('-');
  if (!corpo) return entrada;
  return `${corpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}
