# Shinobi System

Fichas de personagem com contas privadas e uma cópia independente para cada encontro. O frontend usa React/Vite; a API usa Node.js com SQLite local e PostgreSQL em produção. O lançamento gratuito está preparado para Render + Neon.

## Desenvolvimento

Requer Node.js 24 ou superior (usa `node:sqlite`).

```sh
npm ci
npm run server
```

Em outro terminal:

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

A aplicação usa o caminho `/shinobi-system/`. O Vite encaminha `/api` para a API na porta 3001. Inicie ambos os processos para cadastrar contas e usar as fichas. O banco fica em `data/shinobi.sqlite`, ignorado pelo Git; não o apague ao reiniciar ou atualizar o código.

## Fluxo de uso

1. Crie uma conta com e-mail e senha de pelo menos 10 caracteres.
2. Em **Criar personagem**, informe personagem, mesa e encontro; escolha atributos, clã, antecedente, classe e perícias e revise PV/chakra. Os valores iniciais devem seguir as regras da mesa; não há cálculo inventado de recursos.
3. Abra a ficha, edite e clique em **Salvar ficha**. Alterações pendentes são sinalizadas; sair da ficha ou fechar a página pede confirmação se houver mudanças não salvas.
4. Use **Preparar próximo encontro** no painel para copiar o estado salvo. A nova ficha herda recursos, itens, notas e histórico, mas alterações posteriores não afetam a anterior. Abra e salve a ficha de origem antes de copiá-la.
5. Busque fichas por personagem, mesa ou encontro. É possível excluir uma cópia sem excluir as demais.

Uma ficha antiga em `localStorage` pode ser importada explicitamente para a conta, sem apagar o original. Essa importação precisa ser feita no navegador e na origem onde a ficha antiga foi criada. Ela não transfere automaticamente dados de outra máquina.

As mesas são rótulos para organização privada: não há convite, compartilhamento com mestre/jogadores ou edição colaborativa. A criação de cópias não bloqueia a edição das fichas anteriores. Recuperação de senha e confirmação de e-mail ainda não estão implementadas.

## Perícias e custos de jutsu

Percepção usa INT e aparece também em fichas criadas antes da atualização. Bom equivale a 50% do valor Normal e Extremo a 20%, arredondados para baixo; os bônus de Extremo são somados depois. O cálculo usa o Normal exibido, inclusive quando editado manualmente. Limites Bom/Extremo preenchidos manualmente continuam sendo respeitados; o botão Auto restaura o cálculo automático. Na aba Perícias, filtre todas, somente treinadas ou não treinadas; a ordenação padrão mostra o maior valor Normal primeiro, incluindo ajustes manuais, e permite alternar para ordem alfabética.

Novos jutsus exigem um custo em dados, como `1d8`, `2d6` ou `1d8+2`. A expressão é salva como texto, sem rolagem nem conversão para custo fixo. Custos numéricos antigos ficam identificados para revisão; ao editar a ficha, é possível corrigir o custo de cada jutsu sem excluí-lo. Fichas antigas continuam abrindo sem perda dos dados. Cada jutsu também possui os campos opcionais Resistência (por exemplo, `DEX — metade do dano no sucesso`) e Dano (por exemplo, `2d6+3 de fogo` ou `Sem dano`), disponíveis no cadastro e na edição de técnicas existentes. Essas informações acompanham o salvamento e a cópia para outro encontro.

## Verificação

```sh
npm test
npm run lint
npm run build
```

Os testes da API usam bancos temporários e verificam cadastro/login, isolamento entre contas, cópias independentes, conflitos de versão, persistência após reinício e expiração/logout. Nenhuma conta ou ficha de exemplo é instalada no banco de uso real.

## Lançamento gratuito na web

Siga o [passo a passo de lançamento](docs/LANCAMENTO_WEB.md). O `render.yaml` prepara um Web Service **Free**, sem disco pago. Crie um projeto **Free** no Neon e preencha `DATABASE_URL` de forma segura no Render. O servidor cria as tabelas automaticamente e mantém as fichas no PostgreSQL externo, inclusive após reinícios do Render.

Em produção, o servidor exige `DATABASE_URL` e uma origem HTTPS: usa `RENDER_EXTERNAL_URL` automaticamente no Render, ou `APP_ORIGIN` em outra hospedagem. Ele não usa SQLite no disco temporário de produção. O GitHub Pages anterior não executa a API.

Variáveis: `HOST` (padrão `127.0.0.1`), `PORT` (3001), `DATABASE_PATH` (SQLite somente em desenvolvimento), `DATABASE_URL` (PostgreSQL; segredo apenas do servidor), `APP_ORIGIN` (origem HTTPS sem caminho), `NODE_ENV` (`production` habilita cookies seguros e cabeçalhos de proteção). Copie `.env.example` para `.env` se precisar de configuração local; `npm start` e `npm run server` carregam esse arquivo sem substituir variáveis já injetadas pela hospedagem.

## Validação de PostgreSQL e telefone

Com um PostgreSQL de teste separado, configure `TEST_DATABASE_URL` apontando para um banco cujo nome contenha `test`, e execute `npm test`. A integração exercita os dois bancos, incluindo persistência após reinício e isolamento entre contas. O CI já prepara esse PostgreSQL temporário; nenhuma conta de exemplo é instalada no banco real.

Para o teste móvel, gere o build e instale o navegador de teste:

```sh
npm run build
npx playwright install chromium
npm run test:mobile
```

O script abre seu próprio servidor com banco em memória e verifica cadastro, criação guiada, edição, navegação, salvamento e cópias por encontro em 320, 360, 390, 430 e 768 pixels, com emulação de toque. Usa Chromium de teste; não equivale a testar todos os aparelhos físicos ou Safari. Também pode usar um Chromium já instalado, indicado por `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Os planos gratuitos têm limites e o servidor pode demorar para despertar após inatividade. A conta de hospedagem, a conexão real com o Neon e o domínio público precisam ser configurados pelo proprietário antes da validação online.
