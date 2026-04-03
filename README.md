# SmartNew KPI API

Uma API backend segura, de alta performance e focada em compliance OWASP para relatórios de indicadores de desempenho de manutenção.

## 1. Visão Geral

- **Framework**: NestJS 11
- **ORM**: Prisma 5
- **Validação**: Zod (nestjs-zod)
- **Segurança**: Helmet, CORS restrito, AuthGuard, HttpExceptionFilter
- **Docs**: Swagger em `/api/docs`
- **Container**: Docker multi-stage (Node 20 + Alpine)

## 2. Arquitetura e Qualidade

### 2.1 Princípios aplicados
- **SOLID** (SRP, OCP, DIP)
- **Clean Architecture**: separação de responsabilidades
- **Dependency Injection** com NestJS
- **Testes**: Jest + E2E

### 2.2 Padrões
- Controller: roteamento e resposta
- Service: regra de negócio e query SQL otimizada
- DTO: validação de input com Zod
- Filtro de erros: tratamento centralizado com HttpExceptionFilter

## 3. Dados e KPIs

### 3.1 Endpoint principal
`GET /api/maintenance/reports/performance-indicator`

Parâmetros:
- `startDate` (YYYY-MM-DD, opcional)
- `endDate` (YYYY-MM-DD, opcional)
- `typeMaintenance` (csv de IDs, opcional)

Formato de retorno:
```json
{ "success": true, "data": [ { "Familia": "...", "DF": 80, "MTBF": 120, "MTTR": 30, "Paradas": 3, "tempo_prev": 3600, "tempo_corretiva": 900 } ] }
```

### 3.2 Cálculos no banco
- `tempo_prev`: SUM(TIMESTAMPDIFF(SECOND, inicio, termino))
- `tempo_corretiva`: SUM(TIMESTAMPDIFF(SECOND, data_hora_start, data_hora_stop))
- `paradas`: COUNT(*)
- `DF`, `MTBF`, `MTTR` com COALESCE e NULLIF para evitar divisão por zero

## 4. Segurança (Read-Only e Prevenção)

- Operações somente `SELECT` (DB read-only para produção)
- Parâmetros always via binding (Prisma.$queryRaw + Prisma.sql)
- CORS restrito para `http://localhost:3001`
- Token Bearer em `AuthGuard`
- Proteção `helmet` e filtros de exceção

## 5. Performance

- Query sargable (sem DATE() em colunas) com `BETWEEN 'yyyy-mm-dd 00:00:00' AND 'yyyy-mm-dd 23:59:59'`
- Subqueries agregadas para evitar explosão de join
- Monitoramento via `this.logger` + Prisma query duration
- Meta: ~2s (ideal) / 115ms observado em local

## 6. Setup e execução

### 6.1 Pré-requisitos
- Node 20+
- MySQL 8+
- Docker + Docker Compose

### 6.2 Instalação
```bash
npm install
cp .env.example .env
# editar .env
npm run prisma:generate
npm run build
npm run start
```

### 6.3 Docker
```bash
docker compose up -d --build
```

## 7. CI/CD

- `.github/workflows/main.yml`:
  - checkout
  - install
  - lint
  - build
  - test

### package.json
- `engines.node` definido para `>=20`
- `postinstall` faz `prisma generate`

## 8. Checklist antes do deploy

- [x] Modelos e migrations não alteram schema de produção (consultas read-only)
- [x] Validação Zod para entrada
- [x] AuthGuard ativo
- [x] CORS configurado
- [x] Error handling com detalhes seguros
- [x] Dockerfile otimizado
- [x] Readme e documentação atualizados

## 9. Push final
```bash
git add README.md
git commit -m "docs: clareza da documentação final para deploy"
git push origin main
```
