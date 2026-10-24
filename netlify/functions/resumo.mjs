// Função da Netlify que gera os resumos do Meu 2027 com a API do Claude.
// Variáveis de ambiente necessárias na Netlify:
//   ANTHROPIC_API_KEY   chave da API da Anthropic
//   FIREBASE_PROJECT_ID identificador do projeto do Firebase
// Opcionais:
//   ANTHROPIC_MODEL     modelo usado (padrão claude-sonnet-5-5)
//   LIMITE_RESUMOS      quantos resumos cada participante pode gerar (padrão 12)
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getStore } from "@netlify/blobs";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

const REGRAS = `Escreva em português brasileiro correto, com todos os acentos, falando diretamente com a pessoa em segunda pessoa ("você"). Use um tom acolhedor, honesto e direto. Regras de escrita: não use emojis; não use travessões; não use vírgula antes de "e" nem de "ou"; escreva os números em numeral, menos "um" e "uma"; não use reduções como "pra", "pro" ou "tá"; não escreva títulos com todas as palavras em maiúscula; não use a estrutura "não é isso, é aquilo". Baseie-se só no que está nas respostas, sem inventar fatos sobre a pessoa. Não faça diagnósticos de saúde física ou mental.`;

const INSTRUCOES = {
  dia1: `A seguir estão as respostas de uma mulher a perguntas sobre ela e sobre a vida profissional dela: quem ela é, a rotina, as crenças, do que gosta e do que não gosta, os objetivos de vida, o que faz, como faz, os resultados de hoje e os resultados que pretende ter. As respostas podem estar soltas e fora de ordem. Organize tudo numa ordem lógica, num retrato de quem ela é hoje, em 3 a 5 parágrafos curtos, usando as palavras dela sempre que possível. Não dê conselhos nem faça planos ainda. Não use subtítulos.`,
  final: `A seguir estão todas as respostas de uma mulher a um desafio de 10 dias para fechar 2026 e planejar 2027: quem ela é hoje, a retrospectiva de 2026, a roda da vida com notas de 0 a 10, as 3 áreas que mais doem, a carta de visão de dezembro de 2027, os objetivos, as etapas e as microtarefas, o painel de pontos, os hábitos, a semana ideal e o ritual de revisão. Cruze os dados e escreva uma análise com estas partes, cada uma começando por uma linha de subtítulo iniciada por "## ", com só a primeira letra maiúscula:
## Quem você é hoje (1 parágrafo)
## O que 2026 te ensinou (1 parágrafo)
## Os objetivos e as dores (diga se os objetivos estão ligados às áreas com as notas mais baixas e às dores escolhidas e aponte o que ficou de fora)
## As tarefas e os hábitos (diga se as tarefas e os hábitos sustentam os objetivos e aponte as lacunas, como objetivos sem tarefas ou trimestres vazios)
## Os 3 pontos de atenção para 2027 (3 parágrafos curtos)
## Uma frase para levar para 2027 (1 frase, ligada à palavra e à carta dela)
Se alguma parte das respostas estiver em branco, diga isso com delicadeza em vez de inventar.`,
  projetos: `A seguir estão os objetivos de uma mulher para 2027. Transforme cada objetivo em 1 projeto e quebre cada projeto em 3 a 6 tarefas pequenas, concretas e que caibam em poucas horas cada uma, em ordem de execução. Responda só com JSON válido, sem nenhum texto antes ou depois, neste formato: {"projetos":[{"nome":"nome curto do projeto","objetivo":"o objetivo de origem, como ela escreveu","tarefas":["tarefa 1","tarefa 2","tarefa 3"]}]}. Os nomes e as tarefas seguem as regras de escrita acima e começam com verbo no infinitivo.`
};

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default async req => {
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!projectId || !chave) return json({ erro: "O resumo automático ainda não foi configurado." }, 500);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  let uid;
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${projectId}`, audience: projectId });
    uid = payload.sub;
  } catch (e) {
    return json({ erro: "A sua sessão expirou. Saia e entre de novo." }, 401);
  }

  let corpo;
  try { corpo = await req.json(); } catch (e) { return json({ erro: "Pedido inválido." }, 400); }
  const tipo = corpo && corpo.tipo;
  const texto = String((corpo && corpo.texto) || "").slice(0, 40000);
  if (!INSTRUCOES[tipo]) return json({ erro: "Tipo de resumo desconhecido." }, 400);
  if (texto.replace(/\(em branco\)/g, "").replace(/\s+/g, " ").trim().length < (tipo === "projetos" ? 30 : 120)) return json({ erro: "Escreva um pouco mais antes de gerar o resumo." }, 400);

  const limite = Number(process.env.LIMITE_RESUMOS || 12);
  const store = getStore("uso-resumos");
  const uso = (await store.get(uid, { type: "json" })) || { total: 0 };
  if (uso.total >= limite) return json({ erro: `Você já gerou ${limite} resumos, que é o limite do desafio.` }, 429);

  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: tipo === "dia1" ? 1200 : 2500,
        system: `${REGRAS}\n\n${INSTRUCOES[tipo]}`,
        messages: [{ role: "user", content: texto }]
      })
    });
  } catch (e) {
    return json({ erro: "Não consegui falar com o Claude agora. Tente de novo em alguns minutos." }, 502);
  }
  if (!r.ok) {
    console.error("Erro da API", r.status, await r.text());
    return json({ erro: "Não consegui gerar o resumo agora. Tente de novo em alguns minutos." }, 502);
  }
  const dados = await r.json();
  const saida = (dados.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
  if (!saida) return json({ erro: "O resumo veio vazio. Tente de novo." }, 502);

  await store.setJSON(uid, { total: uso.total + 1, ultimo: new Date().toISOString() });
  if (tipo === "projetos") {
    try {
      const bruto = saida.slice(saida.indexOf("{"), saida.lastIndexOf("}") + 1);
      const obj = JSON.parse(bruto);
      const projetos = (Array.isArray(obj.projetos) ? obj.projetos : []).slice(0, 9).map(p => ({
        nome: String(p.nome || "").slice(0, 120),
        objetivo: String(p.objetivo || "").slice(0, 300),
        tarefas: (Array.isArray(p.tarefas) ? p.tarefas : []).slice(0, 12).map(t => String(t).slice(0, 200))
      }));
      return json({ projetos });
    } catch (e) {
      return json({ erro: "O Claude devolveu os projetos num formato que eu não consegui ler. Tente de novo." }, 502);
    }
  }
  return json({ texto: saida });
};

export const config = { path: "/api/resumo" };
