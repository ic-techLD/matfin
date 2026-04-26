# Matfin — Guia de Configuração Firebase

## O que mudou nesta versão

Os dados agora ficam salvos na **nuvem (Firebase)** em vez do navegador.
Isso significa:
- A conta e todos os dados são permanentes
- Funcionam em qualquer dispositivo (celular, computador, tablet)
- Não são perdidos ao limpar o cache ou trocar de navegador

---

## Passo 1 — Criar projeto no Firebase (gratuito)

1. Acesse https://console.firebase.google.com
2. Clique em "Adicionar projeto"
3. Dê um nome (ex: `matfin-app`) e clique em "Continuar"
4. Desative o Google Analytics se quiser (não é necessário) e clique em "Criar projeto"

---

## Passo 2 — Ativar Authentication

1. No menu lateral, clique em **Authentication**
2. Clique em "Primeiros passos"
3. Na aba "Sign-in method", clique em **E-mail/senha**
4. Ative o primeiro toggle e clique em **Salvar**

---

## Passo 3 — Ativar Firestore

1. No menu lateral, clique em **Firestore Database**
2. Clique em "Criar banco de dados"
3. Selecione **Iniciar no modo de produção** e clique em "Avançar"
4. Escolha a região mais próxima (ex: `southamerica-east1`) e clique em "Ativar"

---

## Passo 4 — Configurar as Regras de Segurança

1. No Firestore, clique na aba **Regras**
2. Apague o conteúdo atual
3. Copie e cole o conteúdo do arquivo `REGRAS_FIRESTORE.txt`
4. Clique em **Publicar**

---

## Passo 5 — Obter as credenciais do projeto

1. No menu lateral, clique na engrenagem (Configurações do projeto)
2. Desça até "Seus aplicativos" e clique em `</> Web`
3. Dê um apelido (ex: `matfin-web`) e clique em "Registrar app"
4. Você verá um bloco de código com `firebaseConfig`. Copie os valores.

---

## Passo 6 — Colar as credenciais no app

Abra o arquivo `js/database.js` e localize:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "COLE_AQUI_SUA_API_KEY",
  authDomain:        "COLE_AQUI.firebaseapp.com",
  projectId:         "COLE_AQUI_SEU_PROJECT_ID",
  storageBucket:     "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId:             "COLE_AQUI_SEU_APP_ID",
};
```

Substitua cada valor pelos dados do seu projeto Firebase.

Exemplo de como vai ficar:
```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAbc123...",
  authDomain:        "matfin-app.firebaseapp.com",
  projectId:         "matfin-app",
  storageBucket:     "matfin-app.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

---

## Passo 7 — Publicar no GitHub Pages (link público gratuito)

1. Crie um repositório no GitHub (público)
2. Faça upload de todos os arquivos desta pasta
3. Vá em Settings → Pages → Source: main → / (root)
4. Aguarde alguns minutos e acesse:
   `https://seu-usuario.github.io/nome-do-repositorio/`

Ou use o **Netlify Drop** (mais rápido):
1. Acesse https://app.netlify.com/drop
2. Arraste esta pasta inteira
3. Link gerado instantaneamente

---

## Testar localmente (VS Code)

Use a extensão **Live Server**:
1. Clique com botão direito em `index.html`
2. "Open with Live Server"
3. Acesse http://127.0.0.1:5500

**Atenção:** o app precisa de internet para se conectar ao Firebase.
O modo offline funciona para leitura de dados já carregados, mas o login
e o registro exigem conexão.

---

## Estrutura dos arquivos

```
matfin/
  index.html              → Página principal (todas as telas)
  css/style.css           → Estilos (tema azul escuro + claro)
  js/database.js          → Conexão com Firebase (EDITE AQUI as credenciais)
  js/finance.js           → Cálculos financeiros (juros, consignado, etc.)
  js/app.js               → Lógica e renderização do app
  REGRAS_FIRESTORE.txt    → Regras de segurança para o Firestore
  README.md               → Este arquivo
```

---

## Plano gratuito do Firebase (Spark)

O plano gratuito inclui:
- 50.000 leituras por dia
- 20.000 escritas por dia
- 1 GB de armazenamento no Firestore
- Autenticação ilimitada

Para um app educacional com dezenas ou centenas de usuários, o plano
gratuito é mais que suficiente.
