// Cloudflare Pages Function: recebe o cadastro da lista de espera, confere o Turnstile
// e grava uma linha no Google Sheets. Rota: POST /api/lista
//
// Variáveis de ambiente (painel do Cloudflare; no computador, arquivo .dev.vars):
//   TURNSTILE_SECRET_KEY          chave secreta do Turnstile
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  e-mail da conta de serviço
//   GOOGLE_PRIVATE_KEY            chave privada da conta de serviço (com \n)
//   GOOGLE_SHEET_ID               ID da planilha (o trecho entre /d/ e /edit na URL)
//   GOOGLE_SHEET_RANGE            opcional; padrão "Lista!A:H"
//   AMBIENTE                      "local" só no computador: sem credenciais do Google,
//                                 mostra a linha no terminal em vez de gravar

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_SHEET_ID?: string;
  GOOGLE_SHEET_RANGE?: string;
  AMBIENTE?: string;
}

interface Contexto {
  request: Request;
  env: Env;
}

type Campo = 'nome' | 'email' | 'whatsapp' | 'consentimento';

const LIMITE_CORPO = 10_000; // bytes

function responder(status: number, corpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Tira espaços das pontas, caracteres de controle e corta no tamanho máximo. */
function limpar(valor: unknown, max: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

/** Retorna só os dígitos com DDI 55, ou "" se vazio. null = inválido. */
function normalizarWhatsApp(valor: string): string | null {
  let d = valor.replace(/\D/g, '');
  if (!d) return '';
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (Number(d.slice(0, 2)) < 11) return null; // DDD válido vai de 11 a 99
  return `55${d}`;
}

export async function onRequestPost({ request, env }: Contexto): Promise<Response> {
  // Só aceita envios vindos do próprio site.
  const origem = request.headers.get('origin');
  if (origem && new URL(origem).host !== new URL(request.url).host) {
    return responder(403, { ok: false, erro: 'origem' });
  }

  const texto = await request.text();
  if (texto.length > LIMITE_CORPO) return responder(413, { ok: false, erro: 'validacao', campos: [] });

  let dados: Record<string, unknown>;
  try {
    dados = JSON.parse(texto);
  } catch {
    return responder(400, { ok: false, erro: 'validacao', campos: [] });
  }

  // Campo-isca: gente de verdade não vê nem preenche. Robô recebe "ok" e nada é gravado.
  if (limpar(dados.empresa, 200)) return responder(200, { ok: true });

  const nome = limpar(dados.nome, 100);
  const email = limpar(dados.email, 254).toLowerCase();
  const whatsapp = normalizarWhatsApp(limpar(dados.whatsapp, 30));

  const invalidos: Campo[] = [];
  if (!nome) invalidos.push('nome');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) invalidos.push('email');
  if (whatsapp === null) invalidos.push('whatsapp');
  if (dados.consentimento !== true) invalidos.push('consentimento');
  if (invalidos.length) return responder(400, { ok: false, erro: 'validacao', campos: invalidos });

  // Turnstile
  const token = limpar(dados.turnstile, 2048);
  if (!token || !env.TURNSTILE_SECRET_KEY) {
    if (!env.TURNSTILE_SECRET_KEY) console.error('TURNSTILE_SECRET_KEY não configurada');
    return responder(403, { ok: false, erro: 'verificacao' });
  }
  const verificado = await verificarTurnstile(token, env.TURNSTILE_SECRET_KEY, request);
  if (!verificado) return responder(403, { ok: false, erro: 'verificacao' });

  const quando = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  const linha = [
    quando,
    nome,
    email,
    whatsapp ?? '',
    limpar(dados.utm_source, 200),
    limpar(dados.utm_medium, 200),
    limpar(dados.utm_campaign, 200),
    limpar(dados.referrer, 500),
  ];

  try {
    await gravarNaPlanilha(linha, env);
  } catch (erro) {
    console.error('Falha ao gravar na planilha:', erro);
    return responder(500, { ok: false, erro: 'servidor' });
  }

  return responder(200, { ok: true });
}

// Qualquer outro método (GET, PUT...) é recusado em vez de cair na página estática.
export function onRequest(): Response {
  return new Response('Método não permitido', { status: 405, headers: { allow: 'POST' } });
}

async function verificarTurnstile(token: string, segredo: string, request: Request): Promise<boolean> {
  const corpo = new FormData();
  corpo.append('secret', segredo);
  corpo.append('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) corpo.append('remoteip', ip);

  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: corpo,
    });
    const resultado = (await resp.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!resultado.success) console.warn('Turnstile recusou:', resultado['error-codes']);
    return resultado.success === true;
  } catch (erro) {
    console.error('Falha ao falar com o Turnstile:', erro);
    return false;
  }
}

// ---------- Google Sheets ----------

async function gravarNaPlanilha(linha: string[], env: Env): Promise<void> {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL: conta, GOOGLE_PRIVATE_KEY: chave, GOOGLE_SHEET_ID: planilha } = env;

  if (!conta || !chave || !planilha) {
    if (env.AMBIENTE === 'local') {
      console.log('[modo de teste] linha que iria para a planilha:', linha);
      return;
    }
    throw new Error('Credenciais do Google não configuradas');
  }

  const acesso = await tokenGoogle(conta, chave);
  const intervalo = encodeURIComponent(env.GOOGLE_SHEET_RANGE || 'Lista!A:H');
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${planilha}/values/${intervalo}:append` +
    '?valueInputOption=RAW&insertDataOption=INSERT_ROWS';

  // RAW: o texto é gravado como está, então um "=" digitado nunca vira fórmula.
  const resp = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${acesso}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [linha] }),
  });
  if (!resp.ok) throw new Error(`Sheets respondeu ${resp.status}: ${await resp.text()}`);
}

let tokenEmCache: { valor: string; expira: number } | null = null;

/** Troca um JWT assinado com a chave da conta de serviço por um token de acesso do Google. */
async function tokenGoogle(conta: string, chavePem: string): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  if (tokenEmCache && tokenEmCache.expira - 60 > agora) return tokenEmCache.valor;

  const cabecalho = { alg: 'RS256', typ: 'JWT' };
  const afirmacoes = {
    iss: conta,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora,
    exp: agora + 3600,
  };
  const naoAssinado = `${base64url(JSON.stringify(cabecalho))}.${base64url(JSON.stringify(afirmacoes))}`;

  const chave = await crypto.subtle.importKey(
    'pkcs8',
    pemParaBytes(chavePem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(naoAssinado));
  const jwt = `${naoAssinado}.${base64url(new Uint8Array(assinatura))}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!resp.ok) throw new Error(`Google OAuth respondeu ${resp.status}: ${await resp.text()}`);
  const { access_token, expires_in } = (await resp.json()) as { access_token: string; expires_in: number };

  tokenEmCache = { valor: access_token, expira: agora + expires_in };
  return access_token;
}

function base64url(dados: string | Uint8Array): string {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : dados;
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemParaBytes(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}
