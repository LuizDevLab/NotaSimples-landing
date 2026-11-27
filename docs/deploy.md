# Publicar o site: Cloudflare Pages

O site fica no Cloudflare Pages, ligado ao repositório do GitHub. Cada `git push` no
`main` publica uma nova versão sozinho, em 1 a 2 minutos.

Tempo estimado: 15 minutos (sem contar a lista de espera e o domínio).

---

## 1. Criar a conta no Cloudflare

1. Crie a conta grátis em [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Confirme o e-mail. Não precisa cadastrar cartão nem domínio.

## 2. Criar o projeto Pages

1. No painel, menu **Workers & Pages** → **Create** (ou **Create application**).
2. Escolha a aba/opção **Pages** (não **Workers**) → **Import an existing Git repository**
   (ou **Connect to Git**).
3. Conecte sua conta do GitHub e autorize só o repositório `NotaSimples-landing`.
4. Preencha:

   | Campo | Valor |
   |---|---|
   | Project name | `notasimples` |
   | Production branch | `main` |
   | Framework preset | `Astro` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

5. Abra **Environment variables (advanced)** e adicione `NODE_VERSION` = `24`.
6. Clique em **Save and Deploy**.

O endereço fica `https://notasimples.pages.dev`.

> **Se o nome `notasimples` estiver ocupado**, o Cloudflare oferece outro (por exemplo
> `notasimples-abc.pages.dev`). Me avise o endereço: ele precisa ir para o `site` do
> `astro.config.mjs` e para os hostnames do Turnstile.

A pasta `functions/` (o envio do formulário) é detectada sozinha. Não precisa configurar nada.

## 3. Ligar a lista de espera

Siga o [docs/lista-de-espera.md](lista-de-espera.md): planilha, conta de serviço, Turnstile
e as variáveis em **Settings** → **Variables and Secrets**.

Depois de salvar as variáveis, refaça o deploy: **Deployments** → no último deploy, **⋯** →
**Retry deployment**. As variáveis só valem a partir do próximo build.

## 4. Ligar o Web Analytics

1. No projeto do Pages: **Metrics** → **Web Analytics** → **Enable**.
2. Refaça o deploy, como no passo 3.

O Cloudflare insere o script de medição sozinho. Não usa cookies, por isso não precisa de
banner (a política de privacidade já menciona o Web Analytics).

## 5. Conferir

- [ ] O site abre em `https://notasimples.pages.dev`.
- [ ] O log do build **não** mostra o aviso `PUBLIC_TURNSTILE_SITE_KEY ausente`.
- [ ] Um cadastro de teste aparece na planilha e o card verde aparece na página.
- [ ] Em **Web Analytics**, as visitas começam a aparecer (pode levar alguns minutos).

Enquanto o site estiver no `*.pages.dev`, todas as páginas saem com `noindex`: o Google
não indexa o endereço provisório. Isso é de propósito.

---

## Depois: o domínio notasimples.com.br

1. Registre `notasimples.com.br` no [Registro.br](https://registro.br).
2. No Cloudflare: **Add a domain** (plano Free). Ele mostra dois *nameservers*.
3. No Registro.br, no domínio → **DNS** → **Alterar servidores DNS**, cole os dois
   *nameservers* do Cloudflare. A troca pode levar algumas horas.
4. No projeto do Pages: **Custom domains** → **Set up a custom domain** →
   `notasimples.com.br`. Repita com `www.notasimples.com.br`, se quiser.
5. No Turnstile, adicione `notasimples.com.br` aos hostnames do widget.
6. No código, troque o `site` do `astro.config.mjs` para `https://notasimples.com.br`
   e faça o push. **Isso libera a indexação no Google**, então só faça depois da revisão
   final dos textos e do FAQ.
7. E-mail: **Email** → **Email Routing** → crie `contato@notasimples.com.br`
   encaminhando para o seu Gmail.
8. Cadastre o site no [Google Search Console](https://search.google.com/search-console)
   e envie o `https://notasimples.com.br/sitemap-index.xml`.
