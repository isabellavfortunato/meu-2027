# Meu 2027

Ferramenta do desafio de 10 dias com o Claude para fechar 2026 e planejar 2027. Cada participante entra com a conta Google, cada dia abre numa data fixa e o resumo de quem ela é hoje e a análise final são gerados pelo Claude.

## Os arquivos

| Arquivo | O que faz |
|---|---|
| index.html | A página |
| estilo.css | As cores, as letras e o desenho |
| app.js | Os 10 dias, a roda da vida, o painel e o cruzamento dos dados |
| config.js | O único arquivo que você edita: o Firebase, a data de início e os e-mails de administradora |
| netlify/functions/resumo.mjs | A função que pede os resumos ao Claude |
| package.json e netlify.toml | A configuração da Netlify |
| firestore.rules | As regras de segurança do banco de dados |

## Como colocar no ar

Nenhum passo usa o Terminal.

### 1. GitHub

1. Entre em github.com, clique em "New repository" e dê o nome meu-2027.
2. Na página do repositório, clique em "uploading an existing file" e arraste todos os arquivos e a pasta netlify.
3. Clique em "Commit changes".

### 2. Firebase

1. Entre em console.firebase.google.com e escolha o projeto que vai guardar as respostas (o ideal é o projeto empresarial das ferramentas de clientes).
2. Em Authentication, clique em "Sign-in method" e ative o Google.
3. Em Firestore Database, crie o banco de dados, se ainda não existir.
4. Em Firestore Database, abra a aba "Regras", apague o que estiver lá, cole o conteúdo do arquivo firestore.rules e clique em "Publicar". Se o projeto já tiver regras de outros aplicativos, junte as regras em vez de apagar.
5. Em Configurações do projeto, na parte "Seus apps", crie um app da Web e copie os 6 valores da configuração (apiKey, authDomain, projectId, storageBucket, messagingSenderId e appId).
6. No GitHub, abra o arquivo config.js, clique no lápis, cole os 6 valores entre as aspas e clique em "Commit changes".

### 3. Netlify

1. Em app.netlify.com, clique em "Add new project", escolha "Import an existing project" e depois o GitHub e o repositório meu-2027. Não precisa preencher comando de build.
2. Em Project configuration, abra "Environment variables" e crie 2 variáveis:
   - ANTHROPIC_API_KEY, com a chave da API da Anthropic, criada em console.anthropic.com.
   - FIREBASE_PROJECT_ID, com o projectId do Firebase.
3. Faça um novo deploy, para a função passar a enxergar as variáveis.
4. Volte ao Firebase, em Authentication, aba "Settings", "Authorized domains", e acrescente o endereço da Netlify (por exemplo, meu-2027.netlify.app) e o subdomínio que você usar.

### 4. Testar

1. Abra o endereço da Netlify numa aba privada e entre com o Google. Como o seu e-mail está em admins no config.js, você vê todos os dias abertos.
2. Preencha o dia 1 e gere o resumo.
3. Peça para alguém que não é administradora entrar e confira se só o dia certo aparece aberto.

## O que dá para mudar no config.js

- **inicio:** a data em que o dia 1 abre. Hoje está 10 de dezembro de 2026, com o dia 10 em 19 de dezembro.
- **admins:** os e-mails que veem todos os dias abertos.

## Os custos

- Cada resumo é uma chamada à API do Claude, cobrada por uso na conta da Anthropic.
- Cada participante pode gerar até 12 resumos. Para mudar, crie na Netlify a variável LIMITE_RESUMOS com outro número.
- O modelo padrão é o claude-sonnet-5-5. Para mudar, crie a variável ANTHROPIC_MODEL.

## A prévia

Enquanto o apiKey do config.js estiver vazio, a ferramenta abre em modo prévia: todos os dias abertos, respostas guardadas só no navegador e sem resumo automático. Com o Firebase configurado, a prévia continua disponível acrescentando ?previa ao endereço.
