// Lê os textos de src/content/landing.yaml na hora do build. Nada disso vai para o navegador.
import { parse } from 'yaml';
import bruto from '../content/landing.yaml?raw';

interface Item {
  titulo: string;
  texto: string;
}

interface CampoMockup {
  pergunta: string;
  valor: string;
  detalhe?: string;
}

interface Pergunta {
  pergunta: string;
  resposta: string;
}

interface Depoimento {
  nome: string;
  negocio?: string;
  texto: string;
}

export interface Conteudo {
  seo: { titulo: string; descricao: string };
  cta: { botao: string; botao_curto: string; vantagem: string };
  hero: {
    selo: string;
    titulo: string;
    subtitulo: string;
    apoio: string;
    mockup: {
      titulo_tela: string;
      campos: CampoMockup[];
      dica: string;
      botao: string;
      sucesso: string;
    };
  };
  dor: {
    titulo: string;
    subtitulo: string;
    portal: { rotulo: string; itens: string[] };
    notasimples: { rotulo: string; itens: string[] };
  };
  como_funciona: { titulo: string; passos: Item[] };
  funcionalidades: { titulo: string; itens: (Item & { em_breve?: boolean })[] };
  suporte: { titulo: string; texto: string; horario: string; botao: string };
  prova_social: { ativo: boolean; titulo: string; depoimentos: Depoimento[] };
  planos: {
    titulo: string;
    aviso: string;
    texto: string;
    incluido_titulo: string;
    incluido: string[];
  };
  faq: { titulo: string; perguntas: Pergunta[] };
  formulario: {
    titulo: string;
    texto: string;
    campos: {
      nome: { rotulo: string; placeholder: string };
      email: { rotulo: string; placeholder: string };
      whatsapp: { rotulo: string; opcional: string; placeholder: string };
      consentimento: string;
    };
    botao: string;
    enviando: string;
    sucesso: { titulo: string; texto: string };
    erros: Record<'nome' | 'email' | 'whatsapp' | 'consentimento' | 'geral', string>;
  };
  cta_final: { titulo: string; texto: string };
  rodape: {
    contador: { titulo: string; texto: string; whatsapp_mensagem: string };
    email: string;
    privacidade: string;
    direitos: string;
  };
}

export const conteudo = parse(bruto) as Conteudo;

/** Converte links no formato [texto](url) em HTML, escapando o resto do texto. */
export function comLinks(texto: string): string {
  const escapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escapado.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}
