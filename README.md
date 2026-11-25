# API didática de pagamentos

API REST em Node.js, Express, Prisma e PostgreSQL (Neon), com cadastro, login e pagamentos simulados. Ela não se conecta a adquirentes e não cobra dinheiro real.

## Requisitos

- Git
- Node.js 22.12 ou superior
- Uma instância PostgreSQL no [Neon](https://neon.tech/)
- Uma conta no [Sentry](https://sentry.io/) (opcional; necessária para receber telemetria)

## Clonar e executar localmente

1. Clone o repositório, substituindo o endereço pelo URL do projeto:

   ```powershell
   git clone <URL_DO_REPOSITORIO>
   cd <PASTA_DO_PROJETO>
   ```

2. Confira as versões instaladas e instale as dependências:

   ```powershell
   node --version
   npm --version
   npm ci
   ```

   Use Node.js 22.12 ou superior. A instalação também gera o Prisma Client.

3. Crie o arquivo local de configuração:

   ```powershell
   Copy-Item .env.example .env
   ```

4. No painel do Neon, crie um projeto PostgreSQL e copie a connection string. Abra `.env` e configure `DATABASE_URL` com essa string; mantenha `sslmode=require`.

5. Gere um segredo JWT com o Node.js:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Copie o resultado para `JWT_SECRET` no `.env`. Não compartilhe nem versione esse arquivo. Para a primeira execução, mantenha `JWT_EXPIRES_IN=1h`.

6. Aplique ao Neon as migrações já incluídas no projeto:

   ```powershell
   npm run migrate
   ```

   Use `npm run migrate:dev` durante o desenvolvimento de alterações no schema.

7. Inicie a API:

   ```powershell
   npm run dev
   ```

   Ela fica disponível em `http://localhost:3000`. Abra `http://localhost:3000/health`; uma resposta bem-sucedida confirma que a API alcançou o banco. Para executar os testes, use `npm test` em outro terminal.

O arquivo `.env.example` lista as variáveis esperadas. Não coloque credenciais no código nem faça commit do `.env`.

## Organização do código

```text
src/
  controllers/    recebem a requisição e montam a resposta HTTP
  middleware/     autenticação e validações transversais
  repositories/   consultas e gravações por meio do Prisma Client
  routes/         métodos, caminhos e middlewares das rotas
  services/       regras de negócio de usuários e pagamentos
  utils/          erros compartilhados
prisma/
  migrations/     histórico versionado do banco
  schema.prisma   modelos e configuração PostgreSQL
```

O projeto usa ES Modules (`import`/`export`). O caminho de uma requisição segue `app.js → routes → controllers → services → repositories → Prisma/PostgreSQL`. Cada camada chama somente a próxima; controllers não acessam o banco diretamente. Nas rotas privadas, o middleware valida o JWT e o usuário antes de encaminhar a requisição ao controller.

## Monitoramento com Sentry

O SDK é inicializado antes do Express por `src/instrument.js`, carregado pelos scripts `npm run dev` e `npm start`. Ele envia traces amostrados e registra erros. O middleware também envia logs estruturados e métricas de cada requisição.

### Criar o projeto e conectar a API

1. Entre no [Sentry](https://sentry.io/), crie uma organização se necessário e crie um projeto escolhendo a plataforma **Node.js**.
2. Abra as configurações do projeto e copie a **DSN**. A DSN identifica o projeto para envio de eventos; não é necessário criar um token de integração para esta API.
3. Abra o `.env` local e configure:

   ```dotenv
   SENTRY_DSN=<DSN_DO_PROJETO>
   SENTRY_ENVIRONMENT=development
   SENTRY_TRACES_SAMPLE_RATE=1
   ```

   `SENTRY_TRACES_SAMPLE_RATE` aceita valores de `0` a `1`. Use `1` temporariamente para observar todos os traces durante a demonstração local; em ambientes com tráfego real, escolha uma taxa menor conforme o volume e os limites da sua conta.

4. Salve o `.env` e reinicie a API (`npm run dev`). Gere algumas requisições, por exemplo, abra `/health` e faça uma chamada de cadastro ou login.
5. No projeto do Sentry, confira os traces e eventos e abra **Explore → Logs** e **Explore → Metrics**. Pode haver um pequeno atraso até os dados aparecerem; confira também o intervalo de tempo e o ambiente selecionados.

O middleware `src/middleware/requestMetrics.js` envia:

- `api_requests`: contador de requisições. Consulte com agregação `sum` para ver o volume.
- `api_request_duration`: duração em milissegundos. Consulte com `p95` para observar a latência no percentil 95.

As métricas incluem método, rota e status HTTP; rotas não reconhecidas são agrupadas como `unmatched`. Os logs usam a mensagem `API request completed` e incluem método, rota, status, duração e, quando disponível, o ID do usuário. No payload, somente `amount` e `currency` de pagamentos são mantidos; os demais valores são mascarados. A coleta automática de identidade, cookies, cabeçalhos, corpos e parâmetros de URL está desativada.

`SENTRY_TRACES_SAMPLE_RATE` controla a amostragem de traces; as chamadas do middleware para logs e métricas são independentes dessa taxa. Se `SENTRY_DSN` estiver vazio, a API continua funcionando localmente, mas não envia dados ao Sentry. Não publique a DSN em repositórios públicos; se ela for exposta, gere uma nova nas configurações do projeto.

### Problemas comuns

- **A aplicação encerra ao iniciar:** confirme que `JWT_SECRET` está definido e possui pelo menos 32 caracteres.
- **Erro de conexão com o banco:** confira a connection string em `DATABASE_URL`, a senha, o endereço do projeto Neon e `sslmode=require`; depois rode `npm run migrate` novamente.
- **Nada aparece no Sentry:** confira se a DSN pertence ao projeto correto, reinicie o processo após editar `.env` e inicie com `npm run dev` ou `npm start` para carregar o SDK. Verifique também o intervalo de tempo e o ambiente na interface.
- **Não aparecem traces:** para testar localmente, use `SENTRY_TRACES_SAMPLE_RATE=1`. Isso não é necessário para habilitar as métricas ou os logs do middleware.

## Rotas

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Público | Cadastra usuário (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Público | Autentica e devolve token JWT |
| `GET` | `/api/payments` | JWT | Lista os últimos 100 pagamentos do usuário |
| `GET` | `/api/payments/:id` | JWT | Consulta pagamento próprio |
| `POST` | `/api/payments` | JWT | Cria pagamento simulado |

O token deve ser enviado no cabeçalho `Authorization: Bearer <token>`. Nas rotas privadas, o middleware valida o JWT e confirma que o usuário ainda existe no banco; o usuário autenticado fica disponível em `req.user`. Valores são números positivos e a moeda usa três letras maiúsculas, por exemplo `BRL`.

## Exemplo de uso

Cadastre um usuário:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Silva","email":"ana@example.com","password":"senha-segura"}'
```

Faça login e copie o valor de `token` da resposta:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"senha-segura"}'
```

Crie um pagamento usando o token recebido:

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"amount":49.90,"currency":"BRL","description":"Livro"}'
```

## Material para discussão em aula

- Compare o comportamento esperado e observado após uma implantação: erros HTTP 500, p95 de latência e o momento em que a regressão começou.
- Use os detalhes e traces no Sentry para localizar a rota e as operações lentas. `/health` ajuda a verificar a dependência do PostgreSQL.
- Em produção, acrescente alertas, logs estruturados, rate limiting, testes de integração, migrações versionadas e integração segura com um provedor de pagamentos.
- A autenticação usa hash bcrypt e JWT de curta duração como exemplo. Para produção, revise rotação de chaves, política de tokens, controles de abuso e requisitos de privacidade.
