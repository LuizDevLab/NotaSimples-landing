// Contatos usados na página. Troque aqui e vale para todos os botões.
export const WHATSAPP = '5583987966691'; // DDI + DDD + número, só dígitos
export const EMAIL = 'contato@notasimples.com.br';

export function linkWhatsApp(mensagem?: string): string {
  const base = `https://wa.me/${WHATSAPP}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
