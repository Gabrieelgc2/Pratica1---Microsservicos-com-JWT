# Prática 1 — Protegendo Chamadas entre Microsserviços com JWT

## Objetivo
Implementar proteção entre microsserviços utilizando JSON Web Tokens (JWT). Você usará o API Gateway para validar tokens e bloquear chamadas não autenticadas.

---

## Resumo dos Pré-requisitos e guia passo-a-passo
Abaixo há instruções passo a passo para levantar um ambiente mínimo contendo:
- Dois microserviços de exemplo (Service A e Service B) em Node.js/Express
- API Gateway usando **Express Gateway** (fácil para demos)
- Ferramentas para gerar JWT (Node.js / Python / jwt.io)
- Cliente HTTP: **curl** (linha de comando) e instruções para Postman/Insomnia

> Todas as instruções assumem que você tem **Node.js (v16+), npm, e git** instalados. Para executar em contêineres, o Docker é opcional.

---

## 1) Criando os microsserviços de exemplo
Vamos criar dois serviços simples em Node.js.

### Estrutura de pastas (exemplo)
```
pratica-jwt/
  ├─ service-a/
  └─ service-b/
  └─ gateway/
```

### service-b (API protegida)
1. Crie a pasta `service-b` e inicialize:
```sh
mkdir -p pratica-jwt/service-b && cd pratica-jwt/service-b
npm init -y
npm install express
```
2. Crie `index.js` com o conteúdo:
```js
const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

app.get('/minha-rota', (req, res) => {
  res.json({ message: 'Acesso autorizado ao service-b' });
});

app.listen(port, () => console.log(`service-b ouvindo na porta ${port}`));
```
3. Inicie o serviço:
```sh
node index.js
# ou: npx nodemon index.js (se tiver nodemon)
```
O service-b ficará disponível em `http://localhost:4000/minha-rota`.

---

### service-a (cliente que chama service-b)
1. Crie `service-a`:
```sh
mkdir -p ../service-a && cd ../service-a
npm init -y
npm install express node-fetch
```
2. `index.js` do service-a (exemplo de chamada):
```js
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

app.get('/call', async (req, res) => {
  // Exemplo simples de requisição para service-b (sem token aqui)
  const r = await fetch('http://localhost:4000/minha-rota');
  const body = await r.json();
  res.json({ from: 'service-a', serviceB: body });
});

app.listen(port, () => console.log(`service-a ouvindo na porta ${port}`));
```
3. Inicie:
```sh
node index.js
```
Acesse `http://localhost:3000/call` para testar a integração direta (sem gateway).

---

## 2) Instalando e configurando o API Gateway (Express Gateway)
Para demonstração rápida, **Express Gateway** é simples e possui plugin JWT.

### Instalação global (opcional)
```sh
npm i -g express-gateway
```
Ou usar localmente com `npx`.

### Criar um novo gateway
No diretório raiz `pratica-jwt`:
```sh
cd ../.. # volta para pratica-jwt
npx express-gateway create --name gateway
# escolha as opções default; será criada a pasta gateway
```

### Configurar rota e política JWT
Edite `gateway/config/system.config.yml` e `gateway/config/gateway.config.yml` conforme necessário. Para simplificar, vamos usar uma política customizada no `gateway/config/gateway.config.yml` (trecho relevante):

```yaml
http:
  port: 8000

apiEndpoints:
  api:
    path: /minha-rota
    target: http://localhost:4000
    methods: GET

policies:
  - proxy
  - jwt

pipelines:
  default:
    apiEndpoints:
      - api
    policies:
      - jwt:
          - action:
              secretOrPublicKey: 'MINHA_CHAVE_DE_ASSINATURA'
              checkCredentialExists: false
      - proxy:
          - action:
              serviceEndpoint: httpbin

serviceEndpoints:
  httpbin:
    url: 'http://localhost:4000'
```

> Nota: A configuração exata do Express Gateway pode variar por versão. A ideia é ativar a política `jwt` para a rota `/minha-rota` e setar a chave compartilhada usada para assinar tokens (no exemplo `MINHA_CHAVE_DE_ASSINATURA`).

### Iniciar o Gateway
```sh
cd gateway
npm install
npm start
```
O Gateway ficará em `http://localhost:8000/minha-rota` e irá encaminhar para `service-b` apenas se o JWT estiver válido (conforme a política configurada).

---

## 3) Gerar JWTs para teste
Você pode gerar tokens de várias formas.

### Usando jwt.io (web)
1. Acesse https://jwt.io
2. No campo "Payload" coloque por exemplo:
```json
{ "service": "service-a", "exp": <timestamp ou use a interface> }
```
3. Em "Verify Signature" escolha algoritmo `HS256` e no campo `secret` coloque `MINHA_CHAVE_DE_ASSINATURA`.
4. Copie o token gerado.

### Usando Node.js (script)
Crie `generate-token.js` em qualquer lugar:
```js
const jwt = require('jsonwebtoken');
const token = jwt.sign({ service: 'service-a' }, 'MINHA_CHAVE_DE_ASSINATURA', { expiresIn: '30s' });
console.log(token);
```
Execute:
```sh
npm install jsonwebtoken
node generate-token.js
```

### Usando Python
```py
# pip install pyjwt
import jwt
print(jwt.encode({'service':'service-a'}, 'MINHA_CHAVE_DE_ASSINATURA', algorithm='HS256'))
```

---

## 4) Testes com curl / Postman
### Teste sem token (esperado 401)
```sh
curl -i http://localhost:8000/minha-rota
```
Resposta esperada:
```
HTTP/1.1 401 Unauthorized
{ "error": "Missing or invalid token" }
```

### Teste com token válido
```sh
curl -i -H "Authorization: Bearer SEU_TOKEN_AQUI" http://localhost:8000/minha-rota
```
Resposta esperada:
```
HTTP/1.1 200 OK
{ "message": "Acesso autorizado ao service-b" }
```

### Testando expiração curta
1. Gere token com `expiresIn: '10s'`.
2. Chame imediatamente — deve retornar 200.
3. Aguarde 10s e chame novamente — deve retornar 401 com mensagem de token expirado.

---

## 5) Boas práticas rápidas
- Nunca commit a `MINHA_CHAVE_DE_ASSINATURA` no código. Use um secret manager (Vault, AWS Secrets Manager, etc.).
- Tokens JWT devem ter expiração curta para cenários entre serviços.
- Considere mTLS para segurança ainda mais forte (especialmente em produção).
- Habilite logs e métricas no gateway para detectar chamadas inválidas.

---

## 6) Alternativas e next steps
- Em ambientes mais reais, use **OAuth2 (Client Credentials)** e um Authorization Server (Keycloak, Auth0, IdentityServer).
- Para grandes malhas de serviço, adote um **service mesh** (Istio, Linkerd) que ofereça mTLS automático.

---

## 7) Recursos úteis
- https://express-gateway.io
- https://jwt.io
- https://github.com/auth0/node-jsonwebtoken


Boa prática! Se quiser, posso transformar este README em um **script automatizado (bash)** ou em um **docker-compose** pronto.