# Deployment & Infrastructure - SmartNew KPI API

## 🚀 Estratégias de Deploy

### 1. Docker Compose (Desenvolvimento Local)

```bash
# Clone repositório
git clone <repo>
cd smartnew-kpi-api

# Build e run
docker-compose up --build

# Acesse
open http://localhost:3001/api/docs
```

**Arquivo**: `docker-compose.yml`
- MySQL 8.0 com volume persistente
- Node.js Alpine (imagem otimizada)
- Network isolada via Docker

### 2. Docker Image (Staging/Production)

#### Build
```bash
docker build -t smartnew-kpi-api:1.0.0 .
```

#### Run
```bash
docker run -d \
  --name smartnew-api \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="mysql://..." \
  smartnew-kpi-api:1.0.0
```

#### Registry Push
```bash
# DockerHub
docker tag smartnew-kpi-api:1.0.0 youruser/smartnew-kpi-api:1.0.0
docker push youruser/smartnew-kpi-api:1.0.0

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag smartnew-kpi-api:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/smartnew-kpi-api:1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/smartnew-kpi-api:1.0.0

# GCP Artifact Registry
docker tag smartnew-kpi-api:1.0.0 us-central1-docker.pkg.dev/project-id/smartnew/smartnew-kpi-api:1.0.0
docker push us-central1-docker.pkg.dev/project-id/smartnew/smartnew-kpi-api:1.0.0
```

### 3. Kubernetes Deployment

#### manifests/deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smartnew-kpi-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: smartnew-kpi-api
  template:
    metadata:
      labels:
        app: smartnew-kpi-api
    spec:
      containers:
      - name: api
        image: smartnew-kpi-api:1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: BEARER_TOKEN
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: token
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: smartnew-kpi-api
  namespace: production
spec:
  selector:
    app: smartnew-kpi-api
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: smartnew-kpi-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: smartnew-kpi-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Deploy
```bash
# Create secrets
kubectl create secret generic db-credentials \
  --from-literal=url="mysql://user:pass@mysql:3306/softwareman"

kubectl create secret generic api-secrets \
  --from-literal=token="your-secure-token-here"

# Deploy
kubectl apply -f manifests/deployment.yaml

# Verify
kubectl get pods -n production
kubectl logs -n production -f deployment/smartnew-kpi-api
```

### 4. AWS ECS (Fargate)

#### Dockerfile (otimizado para ECS)
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /usr/src/app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package.json ./
RUN npm ci --production
COPY --from=builder /usr/src/app/dist ./dist
USER appuser
EXPOSE 3001
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node /health.js || exit 1
CMD ["node", "dist/main.js"]
```

#### AWS CloudFormation Template
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: smartnew-cluster

  ECSService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      LaunchType: FARGATE
      TaskDefinition: !Ref ECSTaskDefinition
      DesiredCount: 3
      LoadBalancers:
        - ContainerName: smartnew-api
          ContainerPort: 3001
          TargetGroupArn: !Ref TargetGroup

  ECSTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: smartnew-kpi-api
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: '256'
      Memory: '512'
      ContainerDefinitions:
        - Name: smartnew-api
          Image: !Sub '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/smartnew-kpi-api:latest'
          PortMappings:
            - ContainerPort: 3001
          Environment:
            - Name: NODE_ENV
              Value: production
            - Name: DATABASE_URL
              Value: !Sub 'mysql://${DBUser}:${DBPassword}@${DBEndpoint}:3306/smartnew'
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: /ecs/smartnew-kpi-api
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: ecs

  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Scheme: internet-facing
      Type: application
      Subnets:
        - subnet-xxxxxx
        - subnet-yyyyyy

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Port: 3001
      Protocol: HTTP
      TargetType: ip
      VpcId: vpc-xxxxxx
      HealthCheckPath: /
      HealthCheckProtocol: HTTP
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 5
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3
```

### 5. Railway / Render / Heroku

#### Railway (Recommended)
```yaml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npx prisma generate && npm run build && npm start"
```

**Deploy**:
```bash
npm install -g @railway/cli
railway init
railway service add mysql
railway variables set DATABASE_URL=$DATABASE_URL
railway up
```

#### Heroku
```bash
# Login
heroku login

# Create app
heroku create smartnew-kpi-api

# Add MySQL addon
heroku addons:create cleardb:ignite

# Deploy
git push heroku main

# View logs
heroku logs -t
```

## 🔄 CI/CD Pipeline

### GitHub Actions (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist

  docker-build-push:
    needs: [lint, test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/smartnew-kpi-api:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/smartnew-kpi-api:${{ github.sha }}

  deploy:
    needs: docker-build-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Production
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: |
          curl -X POST https://deploy.railway.app/deploy \
            -H "Authorization: Bearer $DEPLOY_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"imageName":"smartnew-kpi-api:${{ github.sha }}"}'
```

## 📊 Monitoramento e Observabilidade

### Prometheus + Grafana

#### Prometheus Config (prometheus.yml)
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'smartnew-kpi-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

#### Grafana Dashboard
- Request rate
- Error rate
- Response time (p50, p95, p99)
- CPU/Memory usage
- Database connection pool

### ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
# Add Winston logger
npm install winston elasticsearch

# Configure in src/main.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
const logger = WinstonModule.createLogger({
  // config
});
```

### Alerting (PagerDuty, Opsgenie)

Alertas automáticos para:
- Error rate > 5%
- Response time > 1s (p95)
- CPU > 80%
- Memory > 85%
- Database connection failures

## 🔐 Infrastructure Security

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: smartnew-kpi-api
spec:
  podSelector:
    matchLabels:
      app: smartnew-kpi-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: mysql
    ports:
    - protocol: TCP
      port: 3306
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

### Pod Security Policy
```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: smartnew-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'MustRunAs'
    seLinuxOptions:
      level: "s0:c123,c456"
```

## 🔄 Backup e Disaster Recovery

### Database Backups
```bash
# Daily backup to S3
0 2 * * * mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip | aws s3 cp - s3://backups/smartnew-$(date +%Y%m%d).sql.gz

# Restore
aws s3 cp s3://backups/smartnew-20240402.sql.gz - | gunzip | mysql -u $DB_USER -p$DB_PASS
```

### RTO/RPO Targets
| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 1 hour |
| RPO (Recovery Point Objective) | 15 minutes |
| Backup Retention | 30 days |
| Test Recovery | Monthly |

## 📋 Checklist de Deploy

- [ ] ESLint passou ✅
- [ ] Testes passaram ✅
- [ ] Build successful ✅
- [ ] Secrets configurados
- [ ] Database migrations rodadas
- [ ] Health checks configurados
- [ ] Monitoring ativo
- [ ] Alertas configurados
- [ ] Backup testado
- [ ] Rollback plan documentado
- [ ] Load tests executados
- [ ] Security audit completed
- [ ] Pentesting completed
- [ ] Documentation updated

---

**Verifique também**: [SECURITY.md](./SECURITY.md) para hardening

