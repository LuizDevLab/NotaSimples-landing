# Lista de espera: como configurar

O formulário da landing grava cada cadastro numa planilha do Google. Para isso funcionar
em produção, você precisa de três coisas: a planilha, uma "conta de serviço" do Google
(um usuário-robô que escreve na planilha) e o Turnstile do Cloudflare (o anti-robô).

Tempo estimado: 20 minutos.

---

## 1. Criar a planilha

1. Abra o [Google Sheets](https://sheets.google.com) e crie uma planilha em branco.
   Sugestão de nome: **NotaSimples — Lista de espera**.
2. Renomeie a aba de baixo (Página1) para **Lista**. O nome precisa ser exatamente esse.
3. Na linha 1, escreva os títulos das colunas, de A a H:

   | A | B | C | D | E | F | G | H |
   |---|---|---|---|---|---|---|---|
   | Data | Nome | E-mail | WhatsApp | utm_source | utm_medium | utm_campaign | Referrer |

4. Copie o **ID da planilha** da barra de endereço. É o trecho entre `/d/` e `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`1AbC...xyz`**`/edit`

## 2. Criar a conta de serviço do Google

1. Entre no [Google Cloud Console](https://console.cloud.google.com) com a mesma conta Google.
2. No topo, clique no seletor de projetos e em **Novo projeto**. Nome: `notasimples-landing`. Crie e selecione o projeto.
3. Menu ☰ → **APIs e serviços** → **Biblioteca**. Busque **Google Sheets API** e clique em **Ativar**.
4. Menu ☰ → **IAM e administrador** → **Contas de serviço** → **Criar conta de serviço**.
   - Nome: `lista-de-espera`. Clique em **Criar e continuar**.
   - Pule as etapas de papéis e de acesso (não precisa de nenhum). Clique em **Concluir**.
5. Clique na conta criada → aba **Chaves** → **Adicionar chave** → **Criar nova chave** → **JSON**.
   Um arquivo `.json` será baixado.

> **Cuidado:** esse arquivo funciona como uma senha. Não coloque na pasta do projeto
> (ela está no OneDrive e no Git). Depois de copiar os valores no passo 5, apague o arquivo.

6. Do arquivo JSON, você vai precisar de dois campos:
   - `client_email` (algo como `lista-de-espera@notasimples-landing.iam.gserviceaccount.com`)
   - `private_key` (começa com `-----BEGIN PRIVATE KEY-----`)

## 3. Dar acesso à planilha

1. Volte à planilha e clique em **Compartilhar**.
2. Cole o `client_email` da conta de serviço, escolha **Editor**, desmarque "Notificar pessoas" e clique em **Compartilhar**.

## 4. Criar o Turnstile no Cloudflare

1. No [painel do Cloudflare](https://dash.cloudflare.com), menu **Turnstile** → **Add widget**.
2. Preencha:
   - Nome: `NotaSimples lista de espera`
   - Hostnames: `notasimples.pages.dev` (e depois `notasimples.com.br`, quando o domínio existir)
   - Modo: **Managed**
3. Copie a **Site Key** (pública) e a **Secret Key** (secreta).

## 5. Colocar as variáveis no Cloudflare Pages

No projeto do Pages: **Settings** → **Variables and Secrets**. Adicione em **Production** e em **Preview**:

| Nome | Valor | Tipo |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | Site Key do Turnstile | Texto (é pública e entra no build) |
| `TURNSTILE_SECRET_KEY` | Secret Key do Turnstile | Secret |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` do JSON | Secret |
| `GOOGLE_PRIVATE_KEY` | `private_key` do JSON, inteira, do jeito que está (com os `\n`) | Secret |
| `GOOGLE_SHEET_ID` | ID da planilha | Secret |

**Não** crie a variável `AMBIENTE` no Cloudflare. Ela só existe no computador.

Depois de salvar, faça um novo deploy (as variáveis só valem a partir do próximo build).

> Sem a `PUBLIC_TURNSTILE_SITE_KEY`, o build usa a chave de teste do Turnstile e
> todos os envios em produção serão recusados. O log do build avisa quando isso acontece.

---

## Testar no computador

```bash
cp .dev.vars.example .dev.vars   # só na primeira vez
npm run dev:pages                # abre em http://localhost:8788
```

- Com as variáveis do Google **vazias** no `.dev.vars`, a linha aparece no terminal em vez de ir para a planilha (modo de teste).
- Para testar gravando de verdade, preencha as três variáveis do Google no `.dev.vars`. Coloque a chave entre aspas:
  `GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`
- Para simular o Turnstile recusando, troque `TURNSTILE_SECRET_KEY` por `2x0000000000000000000000000000000AA`.

## Se algo der errado

O formulário mostra "Não conseguimos enviar agora" e o motivo aparece no log da Function
(Cloudflare → Pages → projeto → Functions → Real-time logs). Os mais comuns:

| Mensagem no log | O que fazer |
|---|---|
| `Credenciais do Google não configuradas` | Falta alguma variável `GOOGLE_*` no Cloudflare. |
| `Sheets respondeu 403` | A planilha não foi compartilhada com o `client_email`, ou a Sheets API não foi ativada. |
| `Sheets respondeu 400 ... Unable to parse range` | A aba não se chama **Lista**. |
| `Google OAuth respondeu 400 ... invalid_grant` | A `GOOGLE_PRIVATE_KEY` foi colada pela metade ou sem os `\n`. |
| `Turnstile recusou: invalid-input-secret` | `TURNSTILE_SECRET_KEY` errada. |
| `Turnstile recusou: ...` com hostname | Falta o domínio na lista de hostnames do widget. |
