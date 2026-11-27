// Formulário da lista de espera: validação, máscara do WhatsApp, Turnstile e envio.
// Os textos das mensagens vêm do landing.yaml, pelo atributo data-erros do <form>.

type Campo = 'nome' | 'email' | 'whatsapp' | 'consentimento';

interface Turnstile {
  render(el: HTMLElement, opcoes: Record<string, unknown>): string;
  reset(id?: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
    aoCarregarTurnstile?: () => void;
  }
}

const SCRIPT_TURNSTILE =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=aoCarregarTurnstile';

const form = document.querySelector<HTMLFormElement>('[data-formulario]');
if (form) iniciar(form);

function iniciar(form: HTMLFormElement) {
  const erros = JSON.parse(form.dataset.erros ?? '{}') as Record<Campo | 'geral', string>;
  const sitekey = form.dataset.sitekey ?? '';
  const textoEnviando = form.dataset.enviando ?? '';

  const campos = {
    nome: form.elements.namedItem('nome') as HTMLInputElement,
    email: form.elements.namedItem('email') as HTMLInputElement,
    whatsapp: form.elements.namedItem('whatsapp') as HTMLInputElement,
    consentimento: form.elements.namedItem('consentimento') as HTMLInputElement,
  };
  const isca = form.elements.namedItem('empresa') as HTMLInputElement;
  const botao = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const textoBotao = botao.textContent ?? '';
  const erroGeral = form.querySelector<HTMLElement>('.erro-geral')!;
  const caixaTurnstile = form.querySelector<HTMLElement>('[data-turnstile]')!;
  const sucesso = form.parentElement?.querySelector<HTMLElement>('[data-sucesso]');

  // ---------- Validação ----------

  const validadores: Record<Campo, () => boolean> = {
    nome: () => campos.nome.value.trim().length > 0,
    email: () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(campos.email.value.trim()),
    whatsapp: () => {
      const d = campos.whatsapp.value.replace(/\D/g, '');
      return d.length === 0 || ((d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11);
    },
    consentimento: () => campos.consentimento.checked,
  };

  function marcar(campo: Campo, invalido: boolean) {
    const el = campos[campo];
    const msg = document.getElementById(`erro-${campo}`);
    el.setAttribute('aria-invalid', String(invalido));
    if (invalido) el.setAttribute('aria-describedby', `erro-${campo}`);
    else el.removeAttribute('aria-describedby');
    if (msg) {
      msg.textContent = erros[campo];
      msg.hidden = !invalido;
    }
  }

  function validarTudo(): Campo[] {
    const invalidos = (Object.keys(validadores) as Campo[]).filter((c) => !validadores[c]());
    (Object.keys(validadores) as Campo[]).forEach((c) => marcar(c, invalidos.includes(c)));
    return invalidos;
  }

  // Depois da primeira tentativa, o erro some assim que o campo fica certo.
  let tentou = false;
  (Object.keys(campos) as Campo[]).forEach((c) => {
    const evento = c === 'consentimento' ? 'change' : 'input';
    campos[c].addEventListener(evento, () => {
      if (tentou) marcar(c, !validadores[c]());
    });
  });

  // ---------- Máscara do WhatsApp: (83) 98796-6691 ----------

  function mascarar(valor: string): string {
    let d = valor.replace(/\D/g, '');
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  campos.whatsapp.addEventListener('input', (e) => {
    // Ao apagar, não reformata, para o cursor não "brigar" com os parênteses e o hífen.
    if ((e as InputEvent).inputType?.startsWith('delete')) return;
    campos.whatsapp.value = mascarar(campos.whatsapp.value);
  });
  campos.whatsapp.addEventListener('blur', () => {
    campos.whatsapp.value = mascarar(campos.whatsapp.value);
  });

  // ---------- Turnstile (carrega na primeira interação com o formulário) ----------

  let widget: string | undefined;
  let token = '';
  let esperando: ((t: string) => void)[] = [];
  let carregamento: Promise<void> | null = null;

  function receberToken(t: string) {
    token = t;
    esperando.forEach((r) => r(t));
    esperando = [];
  }

  function carregarTurnstile(): Promise<void> {
    if (carregamento) return carregamento;
    carregamento = new Promise<void>((resolver, rejeitar) => {
      window.aoCarregarTurnstile = () => {
        widget = window.turnstile!.render(caixaTurnstile, {
          sitekey,
          language: 'pt-BR',
          appearance: 'interaction-only', // só aparece se precisar de um clique
          size: 'flexible',
          callback: receberToken,
          'expired-callback': () => (token = ''),
          'error-callback': () => {
            token = '';
          },
        });
        resolver();
      };
      const script = document.createElement('script');
      script.src = SCRIPT_TURNSTILE;
      script.async = true;
      script.onerror = () => {
        carregamento = null;
        rejeitar(new Error('Turnstile não carregou'));
      };
      document.head.appendChild(script);
    });
    return carregamento;
  }

  function aguardarToken(ms: number): Promise<string> {
    if (token) return Promise.resolve(token);
    return new Promise((resolver, rejeitar) => {
      const espera = setTimeout(() => rejeitar(new Error('Turnstile sem resposta')), ms);
      esperando.push((t) => {
        clearTimeout(espera);
        resolver(t);
      });
    });
  }

  const aoInteragir = () => {
    carregarTurnstile().catch(() => {});
  };
  form.addEventListener('focusin', aoInteragir, { once: true });
  form.addEventListener('pointerdown', aoInteragir, { once: true });

  // ---------- Envio ----------

  function enviando(sim: boolean) {
    botao.disabled = sim;
    botao.setAttribute('aria-busy', String(sim));
    botao.textContent = sim ? textoEnviando : textoBotao;
  }

  function falhar() {
    erroGeral.textContent = erros.geral;
    erroGeral.hidden = false;
    token = '';
    if (widget !== undefined) window.turnstile?.reset(widget);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    tentou = true;
    erroGeral.hidden = true;

    const invalidos = validarTudo();
    if (invalidos.length) {
      campos[invalidos[0]].focus();
      return;
    }

    enviando(true);
    try {
      await carregarTurnstile();
      const turnstile = await aguardarToken(30_000);
      const busca = new URLSearchParams(location.search);

      const resp = await fetch('/api/lista', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nome: campos.nome.value,
          email: campos.email.value,
          whatsapp: campos.whatsapp.value,
          consentimento: campos.consentimento.checked,
          empresa: isca.value,
          turnstile,
          utm_source: busca.get('utm_source') ?? '',
          utm_medium: busca.get('utm_medium') ?? '',
          utm_campaign: busca.get('utm_campaign') ?? '',
          referrer: document.referrer,
        }),
      });
      const dados = (await resp.json().catch(() => ({}))) as { ok?: boolean; erro?: string; campos?: Campo[] };

      if (resp.ok && dados.ok) {
        form.hidden = true;
        if (sucesso) {
          sucesso.hidden = false;
          sucesso.focus();
        }
        return;
      }

      if (dados.erro === 'validacao' && dados.campos?.length) {
        dados.campos.forEach((c) => c in campos && marcar(c, true));
        campos[dados.campos[0]]?.focus();
        token = '';
        if (widget !== undefined) window.turnstile?.reset(widget);
        return;
      }

      falhar();
    } catch {
      falhar();
    } finally {
      enviando(false);
    }
  });
}

export {};
