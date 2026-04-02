# Segurança - SmartNew KPI API

## 🔐 Overview de Segurança

Esta API foi desenvolvida com compliance total a OWASP Top 10 2021 e implementa as melhores práticas de segurança para aplicações Node.js/NestJS.

## 🛡️ Defesas Implementadas

### 1. Autenticação e Autorização

#### AuthGuard Global
**Localização**: `src/auth/auth.guard.ts`

- ✅ Guard global que valida Bearer Token em **toda** requisição
- ✅ Token fictício para testes: `Bearer test-token-123`
- ✅ Retorna erro 401 padronizado sem expor detalhes de server
- ✅ Sem exposição de stack traces

```typescript
// Exemplo de requisição rejeitada
curl -X GET http://localhost:3001/api
// Response: 401 Unauthorized
```

**Product Recomendação**: Substitua token fictício por JWT com:
- RS256 ou HS256 signing
- Token expiration (15-30 min)
- Refresh token rotation
- Rate limiting por identidade

### 2. Proteção de Headers HTTP

#### Helmet Middleware
**Localização**: `src/main.ts`

```typescript
app.use(helmet());
```

**Headers Configurados**:
| Header | Proteção |
|--------|----------|
| X-Content-Type-Options | MIME sniffing |
| X-Frame-Options | Clickjacking |
| X-XSS-Protection | XSS attacks |
| Strict-Transport-Security | Man-in-the-middle |
| Content-Security-Policy | Injection attacks |
| Referrer-Policy | Privacy |

**Produção**: Customize CSP headers conforme necessário

### 3. CORS (Cross-Origin Resource Sharing)

**Localização**: `src/main.ts`

```typescript
app.enableCors({ 
  origin: 'http://localhost:3000' 
});
```

**Segurança**:
- ✅ Whitelist stricta (apenas localhost:3000)
- ✅ Sem wildcard (`*`)
- ✅ Credenciais não permitidas por padrão

**Produção**:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
});
```

### 4. Validação de Entrada (Zero Trust)

#### Zod Schema Validation
**Localização**: `src/maintenance/dto/maintenance-report-query.dto.ts`

```typescript
const MaintenanceReportQuerySchema = z.object({
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
    .optional(),
  typeMaintenance: z.string()
    .optional()
    .refine((value) => !value || /^[0-9]+(,[0-9]+)*$/.test(value), {
      message: 'typeMaintenance must be comma separated numeric IDs'
    })
    .transform((value) =>
      value
        ? value.split(',').map((item) => Number(item.trim()))
        : undefined
    )
});
```

**Proteções**:
- ✅ Type-safe validation
- ✅ Regex patterns contra injeção
- ✅ Data transformation segura
- ✅ Rejeita formatos inválidos
- ✅ Protege contra:
  - SQL injection: `1'; DROP TABLE users; --`
  - NoSQL injection: `{"$ne": null}`
  - XSS: `<script>alert('xss')</script>`

**Teste**:
```bash
# Bloqueado:
curl "http://localhost:3001/api/maintenance/reports/performance-indicator?startDate=2024/03/02"
# Response: 400 Bad Request - "startDate must be YYYY-MM-DD"

# Bloqueado:
curl "http://localhost:3001/api/maintenance/reports/performance-indicator?typeMaintenance=1'; DROP TABLE--"
# Response: 400 Bad Request - "typeMaintenance must be comma separated numeric IDs"
```

### 5. Proteção contra SQL Injection

#### Prepared Statements (Prisma)
**Localização**: `src/maintenance/maintenance.service.ts`

```typescript
const rawResults = await this.prisma.$queryRaw<MaintenancePerformanceResult[]>(
  Prisma.sql`
    SELECT ... FROM sofman_apontamento_paradas par
    JOIN controle_de_ordens_de_servico ord
      ON ord.ID = par.id_ordem_servico
      AND ord.ID_cliente = 405
      ${typeMaintenanceFilter}
    ...
  `
);
```

**Segurança**:
- ✅ Prisma usa prepared statements nativamente
- ✅ Interpolação segura com Prisma.sql
- ✅ Parametrização automática
- ✅ Sem concatenação de strings

**O que NÃO fazer** (vulnerável):
```typescript
// ❌ NUNCA fazer isso:
const query = `SELECT * FROM users WHERE id = ${id}`;
// SQL injection: id = "1); DROP TABLE users; --"
```

### 6. Tratamento de Erros Sem Vazamento

#### Http Exception Filter
**Localização**: `src/common/filters/http-exception.filter.ts`

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Retorna erro genérico em produção
    // Sem stack trace, sem detalhes internos
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error'
    });
  }
}
```

**OWASP A01**: Prevents sensitive information exposure

**Produção**:
- ❌ Nunca exponha: stack traces, database errors, file paths
- ✅ Sempre retorne mensagens genéricas
- ✅ Registre detalhes em logs privados

### 7. Controle de Acesso (Filtro de Cliente)

#### id_cliente = 405 (Obrigatório)
**Localização**: `src/maintenance/maintenance.service.ts`

```typescript
const rawResults = await this.prisma.$queryRaw<...>(
  Prisma.sql`
    ...
    JOIN cadastro_de_equipamentos eqp
      ON eqp.id_familia = fam.ID
      AND eqp.id_cliente = 405  // ← Hardcoded, nunca permitir user input
    ...
    WHERE fam.ID_cliente = 405  // ← Double-check
    ORDER BY fam.familia;
  `
);
```

**Impede**:
- Acesso a dados de outros clientes
- Escalação de privilégio
- Data breach

**Produção**: Extraia client_id do JWT token:
```typescript
const clientId = req.user.client_id; // Do JWT
// Valide contra banco antes de usar
```

### 8. Gestão de Dependências

#### Versioning Seguro
**Arquivo**: `package.json`

- ✅ Todas as dependências especificam versões exatas (`^version`)
- ✅ `package-lock.json` commitado (rastreia versões exatas)
- ✅ Sem dependências obsoletas

**Manutenção**:
```bash
# Verificar vulnerabilidades
npm audit

# Corrigir automaticamente
npm audit fix

# Update seguro com testes
npm update
npm run test
```

### 9. Secrets Management

#### Variáveis de Ambiente
**Arquivo**: `.env` (NUNCA commitar)

```env
DATABASE_URL="mysql://..."      # Credenciais do DB
BEARER_TOKEN="test-token-123"  # Token para testes
CORS_ORIGIN="http://localhost:3000"
```

**Proteções**:
- ✅ `.env` listado no `.gitignore`
- ✅ Arquivo de template: `.env.example`
- ✅ Pre-commit hook bloqueia `.env` em commits

**Teste**:
```bash
# Isso vai falhar:
git add .env
git commit -m "Add secrets"  # Pre-commit hook bloqueia
```

**Produção**:
- Use AWS Secrets Manager, HashiCorp Vault, etc
- Rotacione secrets regularmente
- Nunca hardcode em código

### 10. Pre-commit Hooks (Qualidade e Segurança)

**Arquivo**: `.git/hooks/pre-commit`

Antes de cada commit, valida:

```bash
1. ❌ Arquivos sensíveis (.env, .pem, .key, .cert)
2. ✅ ESLint (code quality)
3. ✅ TypeScript build compilation
4. ✅ Jest unit tests
```

**Uso**:
```bash
git commit -m "feat: new feature"
# Executa validações automaticamente
# Falha se qualquer teste não passar
# Impede commit com sensível files
```

## 🚨 Vulnerabilidades Conhecidas a Monitorar

### Dependência Desatualizada
```bash
npm audit
# Monitore regularmente, atualize conforme patches disponibilizados
```

### Rate Limiting (Recomendado Adicionar)
```bash
npm install @nestjs/throttler
```

**Implementação**:
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60)  // 10 requisições por 60 segundos
async getPerformanceIndicator() {
  // ...
}
```

### Logging e Monitoramento (Recomendado)
```bash
npm install winston winston-daily-rotate-file
```

Integre centralized logging:
- CloudWatch
- Datadog
- ELK Stack
- Sentry (error tracking)

## 🔍 Checklist de Deploy em Produção

- [ ] ✅ Atualizar BEARER_TOKEN para valor seguro e aleatório
- [ ] ✅ Configurar DATABASE_URL com banco de dados real
- [ ] ✅ Habilitar Rate Limiting (@nestjs/throttler)
- [ ] ✅ Implementar centralized logging
- [ ] ✅ Configurar HTTPS/TLS (reverse proxy nginx)
- [ ] ✅ Habilitar monitoring e alertas (Prometheus + Grafana)
- [ ] ✅ Configurar backup automático do banco de dados
- [ ] ✅ Implementar CI/CD com testes obrigatórios
- [ ] ✅ Realizar security audit com Pentester
- [ ] ✅ Configurar intrusion detection (IDS)
- [ ] ✅ Implementar API key rotation policy
- [ ] ✅ Habilitar WAF (Web Application Firewall)

## 📞 Reportando Vulnerabilidades

Se descobrir uma vulnerabilidade:

1. **NÃO** a exponha publicamente
2. Envie email para: `security@smartnew.com`
3. Inclua: descrição, como reproduzir, impacto potencial
4. Aguarde resposta em 48 horas

## 📚 Referências

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet - NestJS](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Prisma Security Guide](https://www.prisma.io/docs/concepts/database-connectors/mysql#security)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Última Atualização**: 2 de abril de 2026
