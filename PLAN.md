# NotaSimples — Plano da landing page (v1)

Fonte da verdade visual e de tom: `BRAND.md`. Este plano cobre o que o BRAND não decide.

## 1. Objetivo e estágio
- Produto em **pré-lançamento**. Objetivo da página: **captar cadastros na lista de espera** e começar a ranquear no Google para NFS-e nacional.
- Público: empresário do **Simples Nacional** prestador de serviço (foco) **e MEI** prestador de serviço (também citado em textos, FAQ e palavras-chave).
- Marca **totalmente neutra**: não menciona escritório de contabilidade nem quem criou o produto.

## 2. Stack e hospedagem
- **Astro** estático, CSS próprio com as cores do BRAND como variáveis CSS (`--coral`, `--coral-queimado`, ...). Zero JS além do formulário.
- Fontes: Bricolage Grotesque (600–800) e Plus Jakarta Sans (400–700), **hospedadas no próprio site** via Fontsource (versões variáveis), sem chamar o servidor do Google Fonts. É mais rápido e não envia o IP do visitante ao Google (LGPD).
- Node 24 LTS (`.nvmrc`), exigido pelo Astro 7.
- **Só tema claro** na v1.
- **Cloudflare Pages** com deploy automático pelo Git. Até registrar o domínio, usa `*.pages.dev`.
- Domínio: registrar **notasimples.com.br** no Registro.br antes do lançamento. Criar `contato@notasimples.com.br` (ex.: Cloudflare Email Routing → Gmail).

## 3. Chamada principal (CTA)
- CTA único e repetido: **"Entrar na lista de espera"** (hero, depois de Funcionalidades, Planos e CTA final). Todos rolam até o formulário.
- Vantagem de quem se cadastra: **"Quem entra na lista testa primeiro e garante uma condição especial de lançamento."** Sem valores.

## 4. Formulário da lista de espera
- Campos, com rótulos em forma de pergunta:
  - "Como podemos te chamar?" (nome, obrigatório)
  - "Qual o seu melhor e-mail?" (obrigatório)
  - "Qual o seu WhatsApp?" (opcional, máscara BR)
  - Caixa de consentimento LGPD com link para `/privacidade` (obrigatória)
- Envio: **Cloudflare Pages Function** (`functions/api/lista.ts`) que valida, checa o **Turnstile** e grava uma linha no **Google Sheets** (data, nome, e-mail, WhatsApp, origem/UTM).
- Segredos (chave do Turnstile, credencial do Sheets) ficam nas variáveis de ambiente do Cloudflare e nunca vão para o repositório.
- Depois do envio, o formulário vira um **card de sucesso na própria página**, com o check verde: "Pronto! Você está na lista. Avisamos no seu e-mail e no WhatsApp quando abrir." Sem e-mail automático na v1.
- Estados de erro e de carregamento com mensagens humanas. Funciona por teclado e leitor de tela.

## 5. Seções (ordem do BRAND), com as decisões aplicadas
1. **Hero:** promessa do BRAND ("Sua NFS-e emitida em 1 minuto, sem precisar entender o Portal Nacional."), subtítulo citando Simples e MEI, CTA e **mockup da tela "Nova NFS-e" em HTML/CSS** (rótulos-pergunta, uma dica campo a campo em pêssego e o selo verde "nota emitida").
2. **A dor:** o Portal Nacional confuso × o fluxo do NotaSimples.
3. **Como funciona** em 3 passos.
4. **Funcionalidades:** emissão guiada, modelos de nota, envio ao cliente, dashboard, relatórios, assistente com IA com o selo "em breve".
5. **Suporte humano:** "Fale com uma pessoa de verdade pelo WhatsApp, de segunda a sexta, das 9h às 18h." Sem citar o escritório.
6. **Prova social:** componente pronto, mas **escondido** até haver depoimentos reais do beta.
7. **Planos sem preços:** o que estará incluído e o aviso "Preços no lançamento", com o CTA da lista.
8. **FAQ** com 8 a 10 perguntas sobre a obrigatoriedade da NFS-e nacional (Simples e MEI), em acordeão `<details>`.
9. **CTA final + rodapé:** "É contador? Fale com a gente" (link de WhatsApp com mensagem pronta + e-mail), link para a política de privacidade e o ano.

## 6. Textos
- Todos os textos são redigidos no tom do BRAND (direto, caloroso, "você", sem contabilês), em arquivos de conteúdo separados (`src/content/`).
- **Revisão do dono antes de qualquer deploy.** As respostas do FAQ sobre legislação exigem conferência técnica.

## 7. SEO (página única)
- `<title>` e meta description com foco em "emitir NFS-e nacional", "NFS-e Portal Nacional", "NFS-e Simples Nacional" e "NFS-e MEI".
- Um único H1 e hierarquia de headings limpa. `lang="pt-BR"`, URL canônica.
- Open Graph e Twitter Card, com imagem de compartilhamento 1200×630 na marca.
- Dados estruturados JSON-LD: `SoftwareApplication` (sem preço) e `FAQPage`.
- `sitemap.xml` (@astrojs/sitemap), `robots.txt` e favicon a partir do ícone do BRAND (SVG + PNG + apple-touch).
- Meta: Lighthouse ≥ 95 em Performance, Acessibilidade, SEO e Boas práticas, no mobile.
- Blog e artigos ficam para depois do lançamento.

## 8. Medição e LGPD
- **Cloudflare Web Analytics**, sem cookies e sem banner. Os cadastros são contados na planilha, com UTM.
- Página **/privacidade** em nome do responsável (pessoa física), com o e-mail de contato, os dados coletados, a finalidade (avisar sobre o lançamento), o compartilhamento (Google e Cloudflare) e os direitos do titular. Atualizar quando houver CNPJ.
- Se no futuro houver anúncios com pixels, adicionar o banner de consentimento.

## 9. Estrutura prevista do projeto
```
landing/
  src/pages/index.astro, privacidade.astro
  src/components/  (Hero, MockupNfse, Dor, ComoFunciona, Funcionalidades, Suporte, ProvaSocial, Planos, Faq, CtaFinal, Rodape, FormularioLista, Logo)
  src/content/     (textos e FAQ)
  src/styles/tokens.css, global.css
  functions/api/lista.ts
  public/          (favicons, og-image, robots.txt)
```

## 10. Pendências do dono
- Registrar o domínio e criar o e-mail de contato.
- O número de WhatsApp para suporte e contadores.
- Criar a planilha Google e a conta de serviço (com passo a passo).
- Criar a conta no Cloudflare (Pages, Turnstile e Web Analytics).
- O nome completo para a política de privacidade.
- Revisar os textos e o FAQ.

## 11. Ordem de execução
1. Criar o projeto Astro e os tokens de cor e fonte. Mostrar o plano antes, conforme o CLAUDE.md.
2. Redigir os textos e enviar para revisão.
3. Montar as seções e o mockup, com layout mobile primeiro.
4. Formulário, Function, Turnstile e Sheets.
5. SEO, política de privacidade e favicons.
6. Deploy no `pages.dev`, Lighthouse e teste do formulário de ponta a ponta. Depois, o domínio.

## 12. Verificação
- `npm run build` sem erros. `npm run preview` e checagem visual em 360px, 768px e 1280px.
- Lighthouse mobile ≥ 95 nas quatro categorias. Contraste conferido em 4.5:1.
- Enviar o formulário de teste, ver a linha na planilha e ver o card de sucesso. Testar sem Turnstile (deve recusar) e com e-mail inválido.
- Validar o JSON-LD no Rich Results Test e conferir o sitemap e o robots.
