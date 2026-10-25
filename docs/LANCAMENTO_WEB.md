# Lançamento gratuito: Render + Neon

A configuração usa um **Web Service Free no Render** e **PostgreSQL Free no Neon**. O banco fica no Neon, separado do disco temporário do Render. O plano gratuito do servidor pode suspender a aplicação quando não há uso; a primeira abertura pode levar mais tempo. Os dois serviços têm cotas e condições próprias: confirme **Free** nas telas de contratação. Não é necessário domínio próprio, disco pago ou banco pago no Render.

## 1. Colocar esta versão no GitHub

O Render precisa receber o código com `render.yaml`, `server/database.js` e as novas telas. Mescle a branch de lançamento na `main` do repositório `jvnakachima-dev/shinobi-system` ou selecione explicitamente a branch de lançamento no Render. Não conecte a versão antiga do GitHub Pages achando que ela contém o backend.

As alterações no ambiente em nuvem não atualizam automaticamente a pasta `C:\Users\Naka\Documents\sistema naruto\shinobi-system`. Depois que o código estiver na `main` do GitHub, use `git pull --ff-only` nessa pasta se ela estiver sem alterações locais; se houver trabalho local, preserve-o antes de integrar. Essa pasta não precisa ficar aberta para o site funcionar.

## 2. Criar o banco gratuito

1. Entre em [Neon](https://console.neon.tech/) e crie um projeto chamado `shinobi-system`, mantendo o plano **Free**.
2. Escolha uma região próxima da aplicação no Render; o arquivo prepara o Render na Virgínia (EUA).
3. Abra **Connect** e copie a conexão PostgreSQL com **Connection pooling** ativado. Ela contém usuário, senha, host e banco.
4. Guarde essa conexão para o próximo passo. Não publique a conexão em commits, capturas de tela ou no chat.

Não é preciso criar tabelas manualmente: o servidor prepara o esquema ao iniciar. O projeto Neon usado em produção deve ser diferente de qualquer banco de testes.

## 3. Publicar a aplicação

1. Entre em [Render](https://dashboard.render.com/) com sua conta e autorize acesso ao repositório `jvnakachima-dev/shinobi-system`.
2. Selecione **New → Blueprint**, escolha o repositório e a branch com a versão nova. O Render deve ler o `render.yaml` da raiz.
3. Confira que existe somente o **Web Service shinobi-system**, plano **Free**, sem disco e sem banco Render pagos.
4. No campo **DATABASE_URL**, cole a conexão do Neon usando a área segura de variáveis do serviço. Ela pertence apenas ao servidor; não crie uma variável `VITE_DATABASE_URL`.
5. Aplique o Blueprint. O build instala dependências, executa testes e lint e gera o frontend. O servidor só fica saudável depois de conseguir acessar o banco.
6. Quando o serviço ficar **Live**, abra a URL HTTPS fornecida pelo Render. A raiz redireciona para `/shinobi-system/`.

Se a interface não oferecer Blueprints para o seu plano, crie **New → Web Service** com o mesmo repositório e use:

| Campo | Valor |
| --- | --- |
| Runtime | Node |
| Instance Type | Free |
| Build Command | `npm ci --include=dev && npm test && npm run lint && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| `NODE_VERSION` | `24.19.0` |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Conexão pooled do Neon, preenchida de forma segura |

O Render injeta `PORT` e `RENDER_EXTERNAL_URL`. A aplicação usa essa URL como origem HTTPS permitida; não é necessário adivinhar o endereço antes do primeiro deploy. Para domínio próprio, configure `APP_ORIGIN` com a origem HTTPS final, sem caminho nem barra no fim, e reinicie o serviço. A aplicação valida certificados TLS ao conectar ao PostgreSQL externo.

## 4. Conferir pelo telefone

1. Abra a URL HTTPS e crie sua conta.
2. Crie um personagem, altere PV/chakra e toque em **Salvar ficha**.
3. Volte ao painel e use **Preparar próximo encontro**. Altere e salve a nova cópia; confirme que a anterior manteve seus valores.
4. Saia e entre novamente, ou abra em outro aparelho com a mesma conta. As duas fichas devem reaparecer.
5. Compartilhe a URL pública do Render com os jogadores. Cada pessoa cria a própria conta; as fichas são privadas.

O aplicativo precisa de internet. Ainda não há recuperação de senha por e-mail nem compartilhamento de mesa com o mestre; esta primeira versão serve para contas individuais e cópias por encontro.

## Atualizações e dados

Atualize o código pelo GitHub e acompanhe o deploy no Render. Não remova o projeto Neon nem troque `DATABASE_URL` por outro banco para corrigir uma falha de build. Reiniciar ou republicar o servidor mantém as fichas porque o PostgreSQL está fora do disco temporário. A aplicação não copia os dados SQLite antigos automaticamente para o Neon; é possível importar uma ficha antiga do navegador pela opção do painel.

Dados persistentes não substituem backup. Antes de alterações importantes, faça uma exportação PostgreSQL em local privado com uma ferramenta compatível, como `pg_dump`, ou use os recursos de recuperação disponíveis no seu plano Neon. Não foi configurado um serviço de backup externo pago.

## Diagnóstico

- **Build falhou:** consulte o primeiro erro de instalação/teste/build nos logs do Render.
- **Servidor não fica saudável:** confirme `DATABASE_URL`, projeto Neon ativo, conexão pooled e Node 24. Nunca publique o valor da variável ao pedir ajuda.
- **Login retorna “Origem não permitida”:** confira `APP_ORIGIN` se foi definida manualmente. Com o domínio padrão Render, prefira a origem automática `RENDER_EXTERNAL_URL`.
- **Site demora para abrir após inatividade:** aguarde o despertar do serviço gratuito; isso é diferente de perder as fichas.
- **Só aparece a versão antiga:** confira a branch conectada e use a URL do Render, em vez da URL antiga do GitHub Pages.

Documentação dos serviços: [Render Free](https://render.com/docs/free), [Render Blueprints](https://render.com/docs/infrastructure-as-code), [Planos do Neon](https://neon.com/pricing).
