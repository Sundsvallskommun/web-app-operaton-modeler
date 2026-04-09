# Sundsvalls kommun - Operaton BPMN/DMN Modeler

En webbapp för att rita och publicera BPMN-processer och DMN-beslut till
[`api-service-operaton`](https://github.com/Sundsvallskommun/api-service-operaton).
Bygger på [`bpmn-js`](https://bpmn.io/toolkit/bpmn-js/) och
[`dmn-js`](https://bpmn.io/toolkit/dmn-js/) med Camunda properties-panel +
element-templates som hämtas i runtime från backend så att varje
`@TopicWorker` syns som drag-och-släpp-byggblock i editorn.

## APIer som används

| API      | Version |
| -------- | ------: |
| Operaton |     1.0 |

## Utveckling

### Krav

- Node >= 20 LTS
- Yarn

### Steg för steg

1. Klona ner repot

```
git clone git@github.com:Sundsvallskommun/web-operaton-modeler.git
```

2. Installera dependencies för både `backend` och `frontend`

```
cd web-operaton-modeler/frontend
yarn install

cd web-operaton-modeler/backend
yarn install
```

3. Skapa .env-fil för `frontend`

```
cd web-operaton-modeler/frontend
cp .env-example .env
```

Redigera `.env` utefter behov, för utveckling bör exempelvärden fungera (BFF
körs på `http://localhost:3001/api`).

4. Skapa .env-fil för `backend`

```
cd web-operaton-modeler/backend
cp .env.example.local .env.development.local
cp .env.example.local .env.test.local
```

Redigera `.env.development.local` utefter behov, URLer, nycklar och cert
behöver fyllas i korrekt.

- `CLIENT_KEY` och `CLIENT_SECRET` måste fyllas i för att APIerna ska fungera,
  du måste ha en applikation från WSO2-portalen som abonnerar på api-service-operaton
- `TOKEN_URL` och `API_BASE_URL` pekar på WSO2-instansens token-endpoint
  respektive bas-URL för operaton-tjänsten
- `MUNICIPALITY_ID` är kommun-id som propageras till alla operaton-anrop (default `2281`)
- `SAML_ENTRY_SSO` behöver pekas till en SAML IDP
- `SAML_IDP_PUBLIC_CERT` ska stämma överens med IDPens cert
- `SAML_PRIVATE_KEY` och `SAML_PUBLIC_KEY` behöver bara fyllas i korrekt om man kör mot en riktig IDP
- `SECRET_KEY` används för att signera session-cookien — slumpmässig, lång sträng, roteras per miljö

### Köra appen

I varsin terminal:

```
cd web-operaton-modeler/backend
yarn dev

cd web-operaton-modeler/frontend
yarn dev
```

Frontend startar på <http://localhost:3000>, backend på
<http://localhost:3001>. Surfar man till frontend utan att vara inloggad så
redirektas man till `/login` som triggar SAML-rundturen via IDPen.

För Docker-baserad utveckling:

```
docker compose up -d --build
```

## Workshop-demos

Workshop-material (BPMN/DMN-demos, scripts, WireMock-stubs och en
`docker-compose.yml` som drar igång hela demo-stacken inklusive caremanagement
och e-signing-workern) finns i syskon-repot
[`web-operaton-modeler-workshop`](../web-operaton-modeler-workshop/).
