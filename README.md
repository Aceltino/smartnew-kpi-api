# SmartNew KPI API

Uma API backend segura, de alta performance e focada em compliance OWASP para relatórios de indicadores de desempenho de manutenção.

## 🏗️ Arquitetura Escolhida

### Padrões Aplicados
- **SOLID**: Responsabilidade única (Controller para HTTP, Service para negócio, DTOs para validação)
- **Clean Architecture**: Separação clara entre camadas (Presentation, Business, Data)
- **Dependency Injection**: Injeção automática via NestJS
- **Repository Pattern**: Abstração de acesso a dados via Prisma ORM

### Tecnologias
- **NestJS**: Framework estruturado com módulos, guards, interceptors e filtros
- **Prisma**: ORM type-safe com $queryRaw para queries complexas
- **Zod**: Validação de schemas rigorosa e type-safe
- **Docker**: Containerização para consistência entre ambientes

## ⚡ Otimizações de Performance

### Estratégias Implementadas
- **Query Otimizada**: Subqueries agregadas no SQL para evitar N+1 e explosão de linhas
- **Índices Sargable**: Uso de `BETWEEN datetime` sem funções `DATE()` para aproveitamento de índices
- **Read-Only DB**: Operações exclusivamente SELECT, sem locks de escrita
- **Caching Implícito**: Agregações calculadas no banco, reduzindo processamento Node.js

### KPIs de Performance
- **Tempo Médio**: ~115ms por query (vs. 60s inicial)
- **Throughput**: Suporte a múltiplas requisições simultâneas
- **Memória**: Baixo consumo via streams e queries eficientes

### Monitoramento
- **Logs de Query**: Duração exata via Prisma events
- **Performance.now()**: Medição de tempo total no Service
- **Error Handling**: Logs detalhados sem exposição de dados sensíveis

## 🔐 Recursos de Segurança

- ✅ **Helmet** - Proteção de headers HTTP
- ✅ **CORS** - Restrito a `http://localhost:3001`
- ✅ **AuthGuard** - Validação de Bearer Token (`test-token-123`)
- ✅ **Zod Schema Validation** - Zero Trust, validação rigorosa de entrada
- ✅ **SQL Injection Protection** - Prepared statements via Prisma.$queryRaw com parametrização
- ✅ **Error Handling** - Sem exposição de detalhes internos
- ✅ **Pre-commit Hooks** - Lint, build e testes obrigatórios
- ✅ **ESLint** - Validação de qualidade de código

## 📋 Pré-requisitos

- Node.js 18+
- MySQL 8.0+
- npm 9+

## 🚀 Configuração Rápida

\`\`\`bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais reais

# 3. Iniciar servidor
npm run start:dev

# 4. Acessar Swagger
open http://localhost:3001/api/docs
\`\`\`

## 👨‍💻 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| \`npm run start:dev\` | Iniciar em modo desenvolvimento (hot-reload) |
| \`npm run build\` | Compilar para produção |
| \`npm run start\` | Executar servidor compilado |
| \`npm run lint\` | ESLint com correção automática |
| \`npm run test\` | Executar testes unitários |
| \`npm run test:watch\` | Testes em watch mode |
| \`npm run prisma:generate\` | Gerar cliente Prisma |

## 🔗 Endpoints Principais

### GET /
Health check da API
\`\`\`bash
curl -H "Authorization: Bearer test-token-123" http://localhost:3001/
\`\`\`

### GET /api/maintenance/reports/performance-indicator
Relatório de KPIs por família de equipamento

**Query Parameters:**
- \`startDate\` (YYYY-MM-DD, opcional)
- \`endDate\` (YYYY-MM-DD, opcional)
- \`typeMaintenance\` (comma-separated IDs, opcional)

\`\`\`bash
curl -H "Authorization: Bearer test-token-123" \
  "http://localhost:3001/api/maintenance/reports/performance-indicator?startDate=2024-03-02&endDate=2024-04-02"
\`\`\`

## 📊 Indicadores KPI

- **DF**: ((tempo_prev - tempo_corretiva) / tempo_prev) * 100
- **MTBF**: (tempo_prev - tempo_corretiva) / Paradas
- **MTTR**: tempo_corretiva / Paradas

## 🐳 Docker

\`\`\`bash
# Build e run
docker-compose up --build

# API em http://localhost:3001
\`\`\`

## 🔒 Segurança em Produção

1. Altere o BEARER_TOKEN para um valor seguro
2. Configure DATABASE_URL com banco real
3. Adicione rate limiting (@nestjs/throttler)
4. Implemente centralized logging
5. Configure HTTPS/TLS
6. Habilite monitoring e alertas

## ✅ Qualidade de Código

- ESLint validação automática
- TypeScript strict mode
- Jest tests com pre-commit hooks
- Pre-commit hooks impedem commits sem passar validação

\`\`\`bash
# Executar as validações manualmente
npm run lint && npm run build && npm run test
\`\`\`

---

**Desenvolvido com 🔐 Segurança em Mente**

