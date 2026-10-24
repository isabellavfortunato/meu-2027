/* Meu 2027: 10 dias com o Claude para fechar 2026 e planejar 2027 */
const CFG = window.MEU2027_CONFIG || {};
const params = new URLSearchParams(location.search);
const DEMO = params.has("previa") || !CFG.firebase || !CFG.firebase.apiKey;
const LS_KEY = "meu2027-previa-v2";
const LS_OBRA = "meu2027-construcao-v1";
const INICIO = CFG.inicio || "2026-12-10";
const DIA_MS = 86400000;

const $ = (s, el = document) => el.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const novoId = () => "i" + Math.random().toString(36).slice(2, 10);

/* ---------- conteúdo ---------- */
const AREAS_PADRAO = ["Trabalho e carreira", "Dinheiro", "Saúde e corpo", "Mente e emoções", "Família", "Relacionamentos e amizades", "Lazer e diversão", "Estudos e crescimento"];
const PERGUNTAS_D1 = [
  { grupo: "Sobre você", itens: [
    ["quem", "Quem é você?", "Conte como se estivesse se apresentando para alguém que você acabou de conhecer."],
    ["rotina", "Como é a sua rotina?", "Como é um dia comum seu, do momento em que você acorda até a hora de dormir."],
    ["crencas", "Em que você acredita?", "Os valores e as crenças que guiam as suas escolhas."],
    ["gosta", "Do que você gosta e do que você não gosta?", "No dia a dia, nas pessoas, no trabalho e em você."],
    ["objetivos", "O que você quer da vida?", "Os seus objetivos de vida, grandes e pequenos."]
  ] },
  { grupo: "A sua vida profissional", itens: [
    ["faz", "O que você faz?", "O seu trabalho, o seu negócio ou os seus estudos."],
    ["como", "Como você faz?", "Como o seu trabalho acontece na prática, quem está com você e quais ferramentas você usa."],
    ["hoje", "Quais resultados você tem hoje?", "O que já está dando certo e onde você está agora."],
    ["quer", "Quais resultados você pretende ter?", "Onde você quer chegar."]
  ] }
];
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const INICIAIS = ["S", "T", "Q", "Q", "S", "S", "D"];
const PERIODOS = ["Manhã", "Tarde", "Noite"];
const NIVEIS = [{ pts: 0, nome: "Semente" }, { pts: 50, nome: "Broto" }, { pts: 150, nome: "Muda" }, { pts: 300, nome: "Árvore" }, { pts: 500, nome: "Floresta" }];
const PONTOS_TAREFA = 10;

// t vazio = dia em aberto
const DIAS = [
  { t: "Antes de começar", ideia: "Deixe a ferramenta pronta no seu celular: entre com a sua conta Google e coloque a ferramenta na tela de início, para usar como um aplicativo e aproveitar o microfone.", claude: "" },
  { t: "Primeiras coisas que você precisa fazer para usar a inteligência artificial", ideia: "", claude: "Organize numa ordem lógica tudo o que eu contei sobre mim e me diga o que ficou faltando para você me conhecer melhor." },
  { t: "A retrospectiva de 2026", ideia: "Olhar para 2026 com honestidade: o que deu certo, o que não deu, o que você aprendeu e do que você se orgulha.", claude: "A partir da minha retrospectiva de 2026, me ajude a enxergar os padrões que se repetem." },
  { t: "A roda da vida", ideia: "Marque de 0 a 10 como está cada uma das 8 áreas da sua vida hoje. A roda muda de cor conforme o nível de cada área.", claude: "Olhando as notas da minha roda da vida, indique as 3 áreas que estão puxando as outras para baixo. E as 3 áreas, se você melhorar, puxam as outras para cima?" },
  { t: "", ideia: "", claude: "" },
  { t: "", ideia: "", claude: "" },
  { t: "Os objetivos", ideia: "Escreva de 3 a 5 objetivos claros para 2027.", claude: "Revise os meus objetivos e me diga se algum está vago demais para eu saber se cheguei lá." },
  { t: "Dos objetivos aos projetos", ideia: "Os seus objetivos viram projetos, e cada projeto é quebrado em ações pequenas para você ir marcando ao longo do ano.", claude: "Pegue um dos meus projetos e me ajude a montar o primeiro passo de cada ação." },
  { t: "A semana ideal", ideia: "Desenhe a sua semana ideal de 2027, de segunda a domingo, com manhã, tarde e noite.", claude: "Monte comigo a minha semana ideal a partir dos meus projetos e da minha rotina." },
  { t: "Os hábitos", ideia: "Anote os lembretes dos hábitos que sustentam os seus objetivos e marque em quais dias da semana cada um vale.", claude: "Monte comigo lembretes para os meus hábitos dentro da minha semana ideal." },
  { t: "O painel de 2027", ideia: "Veja num único painel os objetivos, os projetos, as ações e os hábitos que você construiu nos 10 dias.", claude: "" }
];
const obraVal = (i, k) => { const o = (typeof OBRA !== "undefined" && OBRA[obraId(i)]) || {}; return VER_OBRA() && typeof o[k] === "string" ? o[k] : null; };
const FINAL = () => DIAS.length; // a página O meu 2027
const ULT = () => DIAS.length - 1; // o último dia
const tituloDia = i => (obraVal(i, "titulo") ?? DIAS[i].t).trim() || "Dia em aberto";
const ideiaDia = i => (obraVal(i, "ideia") ?? DIAS[i].ideia).trim();

/* ---------- estado ---------- */
const novoObjetivo = () => ({ id: novoId(), titulo: "", area: "", sinal: "", porque: "", trimestre: "" });
const novaTarefa = () => ({ id: novoId(), texto: "", feita: false });
const novoProjeto = (nome = "", objetivo = "") => ({ id: novoId(), nome, objetivo, tarefas: [novaTarefa(), novaTarefa(), novaTarefa()] });
const novoLembrete = () => ({ id: novoId(), texto: "", dias: [false, false, false, false, false, false, false] });

function estadoInicial() {
  return {
    d0: { feito: [false, false, false] },
    d1: { areas: AREAS_PADRAO.map(n => ({ id: novoId(), nome: n, texto: "", subs: [] })), respostas: {} },
    d2: { certo: [""], errado: [""], aprendi: [""], orgulho: [""], palavra: "", desabafo: "" },
    d3: { notas: {} },
    d6: { objetivos: [novoObjetivo(), novoObjetivo(), novoObjetivo()] },
    d7: { projetos: [], extras: [] },
    d8: { recompensas: ["", "", "", ""] },
    d9: { semana: {}, lembretes: [novoLembrete(), novoLembrete(), novoLembrete()] },
    d10: {
      diaRevisao: "Domingo",
      semanal: ["Olhar os projetos e marcar as ações feitas", "Escolher as 3 tarefas mais importantes da semana", "Conferir os lembretes da semana que passou"],
      mensal: ["Rever o progresso de cada projeto", "Ajustar as tarefas do mês seguinte", "Comemorar uma conquista do mês"],
      trimestral: ["Refazer a roda da vida", "Decidir se algum objetivo precisa mudar", "Planejar os projetos do próximo trimestre"],
      primeiroPasso: "", dataPasso: ""
    },
    resumos: { dia1: "", final: "" },
    concluidos: {}
  };
}
function mesclar(dados) {
  const base = estadoInicial();
  if (!dados || typeof dados !== "object") return base;
  for (const k of Object.keys(base)) {
    if (dados[k] && typeof dados[k] === "object" && !Array.isArray(dados[k])) base[k] = Object.assign(base[k], dados[k]);
  }
  return base;
}

let S = estadoInicial();
let usuario = null, admin = false, db = null, fs = null, auth = null, authMod = null;
let cur = 0; // 0 a 9 = dias, 10 = final
let timer = null, salvando = false, pendente = false, confirmarProjetos = false;

function getPath(path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), S); }
function setPath(path, v) {
  const ks = path.split(".");
  let o = S;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[k];
  }
  o[ks[ks.length - 1]] = v;
}

/* ---------- espaço de construção (prévia do dia e roteiro do vídeo) ---------- */
const OBRA = {}; // { d01: {previa, roteiro} }
const obraId = i => "d" + String(i).padStart(2, "0");
const VER_OBRA = () => DEMO || admin;
let obraDb = null;
const obraTimers = {}, obraGravando = new Set(), obraSujos = new Set();

const PREVIAS_PADRAO = {
  d00: "Ela entra na ferramenta com a conta Google, coloca a ferramenta na tela de início do celular para usar como um aplicativo e testa o microfone do teclado numa caixa de texto.",
  d01: "A página é uma série de perguntas, as mesmas do roteiro do vídeo, para ela preencher e também se inspirar para responder pelo microfone numa conversa com o Claude.",
  d02: "Ela olha para 2026: o que deu certo, o que não deu, o que aprendeu e do que se orgulha, a palavra que resume o ano e um desabafo livre.",
  d03: "A roda da vida com 8 áreas. Embaixo da roda, uma barra de 0 a 10 para cada área. A cor de cada área na roda muda conforme o nível que ela marca.",
  d06: "Ela estabelece de 3 a 5 objetivos claros para 2027, com a área, o prazo, como vai saber que conseguiu e por que isso importa.",
  d07: "O Claude, dentro da ferramenta, transforma os objetivos em projetos. Cada projeto é um card com o objetivo em cima, o nome do projeto embaixo e as ações para marcar. São 8 cards em 2 colunas, um embaixo do outro, e cada card começa com 3 ações e tem o botão para acrescentar mais.",
  d08: "A semana ideal em forma de calendário, de segunda a domingo, com manhã, tarde e noite.",
  d09: "Os lembretes dos hábitos, cada um com 7 círculos para marcar os dias da semana em que ele vale.",
  d10: "Ela vê num único painel os objetivos, os projetos, as ações e os hábitos e abre O meu 2027, onde o Claude cruza tudo e faz a análise do ano."
};
let obraNuvem = false; // true quando a construção fica no Firestore da administradora
function carregarObraLocal() { try { const raw = localStorage.getItem(LS_OBRA); if (raw) Object.assign(OBRA, JSON.parse(raw)); } catch (e) { } }
async function iniciarObra() {
  if (!DEMO && admin && fs && usuario) {
    obraNuvem = true;
    try {
      const snap = await fs.getDoc(fs.doc(db, "participantes", usuario.uid));
      const c = snap.exists() && snap.data().construcao;
      if (c) { const nuvem = JSON.parse(c); Object.keys(nuvem).forEach(k => { if (!obraSujos.has(k)) OBRA[k] = nuvem[k]; }); }
    } catch (e) { console.error(e); }
    renderTrail(); renderSheet();
    return;
  }
  try { obraDb = window.claude && window.claude.use ? await window.claude.use("db") : null; } catch (e) { obraDb = null; }
  if (!obraDb) return;
  obraDb.collection("construcao").onSnapshot(snap => {
    snap.docs.forEach(d => {
      if (!d.exists || obraSujos.has(d.id) || obraGravando.has(d.id)) return;
      OBRA[d.id] = { ...(d.data() || {}) };
      if (cur < FINAL() && obraId(cur) === d.id) {
        const foco = document.activeElement;
        ["titulo", "ideia", "previa", "roteiro"].forEach(k => { const t = document.getElementById(`obra-${k}`); if (t && t !== foco && typeof OBRA[d.id][k] === "string" && t.value !== OBRA[d.id][k]) t.value = OBRA[d.id][k]; });
        const h = $("#sheet h2.day"); if (h) h.textContent = tituloDia(cur);
        const pi = $("#ideia-dia"); if (pi) { pi.textContent = ideiaDia(cur); pi.hidden = !ideiaDia(cur); }
      }
    });
    renderTrail();
  }, () => { });
}
function mudouObra(id) {
  obraSujos.add(id);
  try { localStorage.setItem(LS_OBRA, JSON.stringify(OBRA)); } catch (e) { }
  const s = $("#obra-salvo"); if (s) s.textContent = (obraDb || obraNuvem) ? "Salvando" : "Salvo neste navegador";
  clearTimeout(obraTimers[id]); obraTimers[id] = setTimeout(() => gravarObra(id), 900);
}
async function gravarObra(id) {
  if (obraNuvem) {
    obraSujos.delete(id);
    try { await fs.setDoc(fs.doc(db, "participantes", usuario.uid), { construcao: JSON.stringify(OBRA) }, { merge: true }); const s = $("#obra-salvo"); if (s) s.textContent = "Salvo"; }
    catch (e) { obraSujos.add(id); const s = $("#obra-salvo"); if (s) s.textContent = "Não consegui salvar, tentando de novo"; obraTimers[id] = setTimeout(() => gravarObra(id), 4000); }
    return;
  }
  if (!obraDb) { obraSujos.delete(id); return; }
  if (obraGravando.has(id)) { clearTimeout(obraTimers[id]); obraTimers[id] = setTimeout(() => gravarObra(id), 600); return; }
  obraGravando.add(id); obraSujos.delete(id);
  try { await obraDb.doc("construcao/" + id).set({ ...(OBRA[id] || {}) }); const s = $("#obra-salvo"); if (s) s.textContent = "Salvo"; }
  catch (e) { obraSujos.add(id); const s = $("#obra-salvo"); if (s) s.textContent = "Não consegui salvar, tentando de novo"; obraTimers[id] = setTimeout(() => gravarObra(id), 4000); }
  obraGravando.delete(id);
}
function textoObra() {
  return DIAS.map((_, i) => { const o = OBRA[obraId(i)] || {}; return `DIA ${i}. ${tituloDia(i).toUpperCase()}\nTexto de abertura: ${ideiaDia(i) || "(em branco)"}\nPrévia do dia: ${(o.previa ?? PREVIAS_PADRAO[obraId(i)] ?? "").trim() || "(em branco)"}\nRoteiro do vídeo: ${(o.roteiro || "").trim() || "(em branco)"}`; }).join("\n\n");
}
function obraHTML(i) {
  if (!VER_OBRA()) return "";
  const o = OBRA[obraId(i)] || {};
  return `<div class="obra noprint"><h3>Construção do dia ${i}</h3><p class="quem">Só você vê esta parte. As participantes não veem. <span class="salvo" id="obra-salvo"></span></p>
  <label class="lab"><span>Título do dia</span><input type="text" id="obra-titulo" data-obra="titulo" value="${esc(o.titulo ?? DIAS[i].t)}"></label>
  <label class="lab"><span>Texto de abertura</span><textarea id="obra-ideia" data-obra="ideia">${esc(o.ideia ?? DIAS[i].ideia)}</textarea></label>
  <label class="lab"><span>Prévia do dia</span><textarea id="obra-previa" data-obra="previa">${esc(o.previa ?? PREVIAS_PADRAO[obraId(i)] ?? "")}</textarea></label>
  <label class="lab"><span>Roteiro do vídeo</span><textarea id="obra-roteiro" data-obra="roteiro">${esc(o.roteiro || "")}</textarea></label>
  <button class="btn small" data-act="copiar-obra">Copiar a construção dos 10 dias</button></div>`;
}

/* ---------- datas ---------- */
function abertura(i) { return new Date(new Date(`${INICIO}T00:00:00-03:00`).getTime() + (Math.max(i, 1) - 1) * DIA_MS); }
function aberto(i) { return i === 0 || DEMO || admin || Date.now() >= abertura(Math.min(i, ULT())).getTime(); }
const fmtData = d => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

/* ---------- ajudantes ---------- */
const areas = () => S.d1.areas;
const areaNome = id => (S.d1.areas.find(a => a.id === id) || {}).nome || "";
const nota = id => { const v = S.d3.notas[id]; return v === "" || v == null ? null : Number(v); };
const projetos = () => S.d7.projetos;
const EXTRAS = ["Inbox", "Lista Avulsa"];
function extras() {
  if (!Array.isArray(S.d7.extras)) S.d7.extras = [];
  EXTRAS.forEach((tipo, k) => { if (!S.d7.extras[k]) S.d7.extras[k] = { ...novoProjeto(), tipo }; S.d7.extras[k].tipo = tipo; });
  return S.d7.extras;
}
const listaProj = nome => (nome === "extras" ? extras() : projetos());
function todasTarefas() {
  const out = [];
  [...projetos(), ...extras()].forEach(p => p.tarefas.forEach(t => { if (t.texto.trim()) out.push({ ...t, projeto: p }); }));
  return out;
}
function nivelDe(pts) { let i = 0; NIVEIS.forEach((n, k) => { if (pts >= n.pts) i = k; }); return i; }
function corNivel(v) { if (v == null) return "var(--line)"; if (v <= 3) return "var(--nivel-baixo)"; if (v <= 6) return "var(--nivel-medio)"; return "var(--nivel-alto)"; }

/* ---------- salvar ---------- */
function mudou() {
  pendente = true;
  status(DEMO ? "Salvo neste navegador" : "Salvando");
  clearTimeout(timer);
  timer = setTimeout(salvar, 900);
}
async function salvar() {
  if (!pendente) return;
  if (DEMO) { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { } pendente = false; return; }
  if (salvando) { clearTimeout(timer); timer = setTimeout(salvar, 800); return; }
  salvando = true; pendente = false;
  try {
    await fs.setDoc(fs.doc(db, "participantes", usuario.uid), { dados: JSON.stringify(S), nome: usuario.displayName || "", email: usuario.email || "", atualizado: fs.serverTimestamp() }, { merge: true });
    status("Salvo");
  } catch (e) {
    console.error(e); pendente = true; status("Não consegui salvar, vou tentar de novo");
    clearTimeout(timer); timer = setTimeout(salvar, 4000);
  }
  salvando = false;
}
window.addEventListener("beforeunload", e => { if (pendente && !DEMO) { e.preventDefault(); e.returnValue = ""; } });
function status(t) { const el = $("#status"); if (el) el.textContent = t; }
let toastT;
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 2800); }

/* ---------- componentes ---------- */
const ta = (path, rows = 4, ph = "") => `<textarea data-p="${path}" rows="${rows}" placeholder="${esc(ph)}">${esc(getPath(path) || "")}</textarea>`;
const inp = (path, ph = "") => `<input type="text" data-p="${path}" value="${esc(getPath(path) || "")}" placeholder="${esc(ph)}">`;
function sel(path, opts, vazio) {
  const v = getPath(path) ?? "";
  return `<select data-p="${path}">${vazio !== undefined ? `<option value="">${esc(vazio)}</option>` : ""}${opts.map(o => {
    const [val, lab] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(val)}" ${String(v) === String(val) ? "selected" : ""}>${esc(lab)}</option>`;
  }).join("")}</select>`;
}
function lista(path, ph, addLabel = "Acrescentar") {
  const arr = getPath(path) || [];
  return `${arr.map((_, i) => `<div class="row">${inp(`${path}.${i}`, ph)}<button class="x" data-act="rm-item" data-list="${path}" data-i="${i}" aria-label="Tirar">×</button></div>`).join("")}
  <button class="btn small addrow" data-act="add-item" data-list="${path}">${esc(addLabel)}</button>`;
}
const areaOpts = () => areas().filter(a => a.nome.trim()).map(a => [a.id, a.nome]);

function arco(cx, cy, r1, r2, a1, a2) {
  const p = (r, a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
  const g = a2 - a1 > Math.PI ? 1 : 0;
  const [x1, y1] = p(r2, a1), [x2, y2] = p(r2, a2), [x3, y3] = p(r1, a2), [x4, y4] = p(r1, a1);
  return `M${x1} ${y1}A${r2} ${r2} 0 ${g} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${g} 0 ${x4} ${y4}Z`;
}
function rodaSVG(interativa) {
  const as = areas().slice(0, 8);
  const W = 720, c = W / 2, R = 200, r0 = 20, n = as.length, ang = (2 * Math.PI) / n, ini = -Math.PI / 2;
  const rk = k => r0 + ((R - r0) * k) / 10;
  let segs = "", labels = "";
  as.forEach((a, i) => {
    const a1 = ini + i * ang + 0.012, a2 = ini + (i + 1) * ang - 0.012, v = nota(a.id), cor = corNivel(v);
    for (let k = 1; k <= 10; k++) {
      const cheio = v != null && k <= v;
      segs += `<path class="${interativa ? "seg" : ""}" d="${arco(c, c, rk(k - 1) + 0.7, rk(k) - 0.7, a1, a2)}" fill="${cheio ? cor : "var(--soft)"}" stroke="var(--line)" stroke-width="0.6" ${interativa ? `data-act="nota" data-a="${a.id}" data-v="${k}"` : ""}><title>${esc(a.nome)}: ${k}</title></path>`;
    }
    const am = ini + (i + 0.5) * ang, lx = c + (R + 18) * Math.cos(am), ly = c + (R + 18) * Math.sin(am);
    const anchor = Math.abs(Math.cos(am)) < 0.2 ? "middle" : Math.cos(am) > 0 ? "start" : "end";
    const curto = a.nome.split(" ")[0].slice(0, 16);
    const dy = Math.sin(am) > 0.8 ? 14 : Math.sin(am) < -0.8 ? -2 : 6;
    labels += `<text x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}" text-anchor="${anchor}" font-family="Sofia Sans Condensed, Arial Narrow, sans-serif" font-size="22" fill="var(--ink)">${esc(curto)} <tspan font-weight="700">${v ?? "–"}</tspan></text>`;
  });
  return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Roda da vida">${segs}${labels}</svg>`;
}
const legenda = () => `<div class="legenda"><span style="--c:var(--nivel-baixo)">0 a 3</span><span style="--c:var(--nivel-medio)">4 a 6</span><span style="--c:var(--nivel-alto)">7 a 10</span></div>`;

function resumoHTML(texto) {
  return texto.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => /^#{1,3}\s/.test(l) ? `<h3>${esc(l.replace(/^#{1,3}\s*/, ""))}</h3>` : `<p>${esc(l.replace(/\*\*/g, ""))}</p>`).join("");
}

/* ---------- textos para o Claude ---------- */
function textoDia(i) {
  const L = [`DIA ${i}. ${tituloDia(i).toUpperCase()}`];
  const v = s => (s || "").trim() || "(em branco)";
  if (i === 1) PERGUNTAS_D1.forEach(g => {
    L.push(`\n${g.grupo.toUpperCase()}`);
    g.itens.forEach(([k, q]) => L.push(`\n${q}\n${v(S.d1.respostas[k])}`));
  });
  if (i === 2) {
    [["certo", "O que deu certo em 2026"], ["errado", "O que não deu certo"], ["aprendi", "O que eu aprendi"], ["orgulho", "Do que eu me orgulho"]].forEach(([k, t]) => {
      const it = S.d2[k].filter(x => x.trim()); L.push(`\n${t}:`); L.push(it.length ? it.map(x => `- ${x}`).join("\n") : "(em branco)");
    });
    L.push(`\nA palavra que resume 2026: ${v(S.d2.palavra)}`, `\nDesabafo: ${v(S.d2.desabafo)}`);
  }
  if (i === 3) {
    areas().slice(0, 8).forEach(a => L.push(`${a.nome}: ${nota(a.id) ?? "sem nota"}`));
    L.push(`\nAs 3 áreas que puxam as outras para baixo:\n${v(S.d3.baixo)}`, `\nAs 3 áreas que, melhorando, puxam as outras para cima:\n${v(S.d3.cima)}`);
  }
  if (i === 6) S.d6.objetivos.forEach((o, k) => {
    if (!o.titulo.trim()) return;
    L.push(`\nObjetivo ${k + 1}: ${o.titulo}`, `Área: ${areaNome(o.area) || "sem área"}`, `Como vou saber que consegui: ${v(o.sinal)}`, `Por que importa: ${v(o.porque)}`, `Prazo: ${o.trimestre ? o.trimestre + "º trimestre" : "sem prazo"}`);
  });
  if (i === 7) [...projetos(), ...extras()].forEach(p => {
    if (!p.nome.trim() && !p.tarefas.some(t => t.texto.trim())) return;
    L.push(`\n${p.tipo ? p.tipo + ": " : "Projeto: "}${v(p.nome)}${p.objetivo ? ` (objetivo: ${p.objetivo})` : ""}`);
    p.tarefas.filter(t => t.texto.trim()).forEach(t => L.push(`- [${t.feita ? "x" : " "}] ${t.texto}`));
  });
  if (i === 8) {
    L.push("Semana ideal:");
    DIAS_SEMANA.forEach((d, a) => {
      const ps = PERIODOS.map((p, b) => { const t = (S.d9.semana[`d${a}p${b}`] || "").trim(); return t ? `${p}: ${t}` : ""; }).filter(Boolean);
      if (ps.length) L.push(`${d}: ${ps.join("; ")}`);
    });
  }
  if (i === 9) {
    L.push("Lembretes:");
    S.d9.lembretes.filter(l => l.texto.trim()).forEach(l => L.push(`- ${l.texto} (${DIAS_SEMANA.filter((_, k) => l.dias[k]).join(", ") || "sem dias marcados"})`));
  }
  if (i === 10) {
    S.d6.objetivos.filter(o => o.titulo.trim()).forEach(o => L.push(`Objetivo: ${o.titulo}`));
    [...S.d7.projetos, ...(S.d7.extras || [])].filter(p => p.nome.trim()).forEach(p => {
      const ts = p.tarefas.filter(t => t.texto.trim());
      L.push(`\nProjeto: ${p.nome}${p.objetivo ? ` (objetivo: ${p.objetivo})` : ""}\n${ts.map(t => `- [${t.feita ? "x" : " "}] ${t.texto}`).join("\n")}`);
    });
    const hs = S.d9.lembretes.filter(l => l.texto.trim());
    if (hs.length) L.push(`\nHábitos:\n${hs.map(l => `- ${l.texto}`).join("\n")}`);
  }
  return L.join("\n");
}
const textoTudo = () => DIAS.map((d, i) => d.t && i > 0 ? textoDia(i) : "").filter(Boolean).join("\n\n");

/* ---------- dias ---------- */
function dia0() {
  const passos = ["Entrei na ferramenta com a minha conta Google", "Coloquei a ferramenta na tela de início do celular", "Testei o microfone numa caixa de texto"];
  return `<section class="sec"><h3>1. Entre com a sua conta Google</h3>
  <p>Toque em "Entrar com o Google" e escolha a sua conta. As suas respostas ficam guardadas nessa conta, e você encontra tudo de novo em qualquer aparelho em que entrar com ela.</p></section>
  <section class="sec"><h3>2. Coloque a ferramenta na tela de início</h3>
  <p>Assim ela abre como um aplicativo, com o ícone do 27, sem você precisar procurar o endereço.</p>
  <div class="passos"><div class="passo"><h4>No iPhone</h4><ol>
    <li>Abra a ferramenta no Safari.</li>
    <li>Toque no botão de compartilhar, o quadrado com a seta para cima.</li>
    <li>Desça a lista e toque em "Adicionar à Tela de Início".</li>
    <li>Toque em "Adicionar".</li></ol></div>
  <div class="passo"><h4>No Android</h4><ol>
    <li>Abra a ferramenta no Chrome.</li>
    <li>Toque nos 3 pontinhos, no canto de cima.</li>
    <li>Toque em "Adicionar à tela inicial" (em alguns celulares aparece "Instalar app").</li>
    <li>Confirme em "Adicionar" ou "Instalar".</li></ol></div></div></section>
  <section class="sec"><h3>3. Use o microfone para responder</h3>
  <p>Nos próximos dias, você pode falar em vez de escrever. Toque numa caixa de texto e, no teclado do celular, toque no microfone. Fale do seu jeito, sem se preocupar com a ordem, e o texto aparece na caixa.</p>
  <label class="lab"><span>Teste aqui: fale qualquer coisa pelo microfone</span>${ta("d0.teste", 3, "Toque aqui e use o microfone do teclado")}</label></section>
  <section class="sec"><h3>Tudo pronto?</h3>
  ${passos.map((t, k) => `<label class="chk ${S.d0.feito[k] ? "feita" : ""}"><input type="checkbox" data-act="d0" data-k="${k}" ${S.d0.feito[k] ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</section>`;
}
function textoPerguntasD1() {
  return `Vou me apresentar para você. Me faça estas perguntas, uma de cada vez, e espere a minha resposta antes de seguir. No fim, organize tudo o que eu contei numa ordem lógica.\n\n${PERGUNTAS_D1.map(g => `${g.grupo}:\n${g.itens.map(q => `- ${q[1]}`).join("\n")}`).join("\n\n")}`;
}
function dia1() {
  return `<div class="dica-mic">
    <h3>Responda falando</h3>
    <p>A inteligência artificial trabalha a partir das informações que você dá a ela. Você pode escrever as respostas aqui ou abrir o Claude, tocar no microfone e responder em voz alta, sem ordem e sem caprichar. O Claude organiza tudo numa ordem lógica para você.</p>
    <button class="btn" data-act="copiar-perguntas">Copiar as perguntas para o Claude</button>
  </div>
  ${PERGUNTAS_D1.map(g => `<section class="sec"><h3>${esc(g.grupo)}</h3>
    ${g.itens.map(([k, q, dica]) => `<div class="pergunta"><label for="d1-${k}">${esc(q)}</label><p class="note">${esc(dica)}</p><textarea id="d1-${k}" data-p="d1.respostas.${k}" rows="4">${esc(S.d1.respostas[k] || "")}</textarea></div>`).join("")}
  </section>`).join("")}
  <section class="sec"><h3>O Claude organiza as suas respostas</h3>
  <p class="note">Quando terminar, peça ao Claude para juntar tudo num retrato de quem você é hoje. Ele fica guardado aqui.</p>
  ${S.resumos.dia1 ? `<div class="resumo">${resumoHTML(S.resumos.dia1)}</div>` : ""}
  <button class="btn primary" data-act="resumo" data-tipo="dia1">${S.resumos.dia1 ? "Organizar de novo" : "Pedir ao Claude para organizar as minhas respostas"}</button></section>`;
}
function dia2() {
  return `<section class="sec"><h3>O que 2026 trouxe</h3>
  <div class="sub">O que deu certo em 2026</div>${lista("d2.certo", "Uma coisa que deu certo")}
  <div class="sub">O que não deu certo</div>${lista("d2.errado", "Uma coisa que não deu certo")}
  <div class="sub">O que eu aprendi</div>${lista("d2.aprendi", "Um aprendizado")}
  <div class="sub">Do que eu me orgulho</div>${lista("d2.orgulho", "Um orgulho")}
  <label class="lab"><span>A palavra que resume 2026</span>${inp("d2.palavra")}</label>
  <label class="lab"><span>Desabafo livre sobre 2026</span>${ta("d2.desabafo", 6, "Escreva sem organizar, do jeito que sair.")}</label></section>`;
}
function barraHTML(a) {
  const v = nota(a.id);
  return `<div class="barra" style="--cor:${corNivel(v ?? 0)}"><label for="b-${a.id}">${esc(a.nome)}</label><output id="o-${a.id}">${v ?? "–"}</output>
  <input type="range" id="b-${a.id}" min="0" max="10" step="1" value="${v ?? 0}" data-nota="${a.id}" aria-label="Nível de ${esc(a.nome)}"></div>`;
}
function dia3() {
  return `<section class="sec"><div class="roda" id="rodabox">${rodaSVG(true)}</div>${legenda()}
  <div class="barras">${areas().slice(0, 8).map(barraHTML).join("")}</div></section>
  <section class="sec"><h3>As suas listas</h3>
  <p class="note">Depois de conversar com o Claude, anote aqui as 3 áreas de cada lista.</p>
  <div class="duas">
    <label class="lab"><span>As 3 áreas que puxam as outras para baixo</span>${ta("d3.baixo", 5)}</label>
    <label class="lab"><span>As 3 áreas que, melhorando, puxam as outras para cima</span>${ta("d3.cima", 5)}</label>
  </div></section>`;
}
function diaAberto() { return VER_OBRA() ? "" : `<p class="vazio-dia">Este dia ainda está sendo preparado.</p>`; }
function dia6() {
  const os = S.d6.objetivos;
  return `<section class="sec"><h3>De 3 a 5 objetivos</h3>
  ${os.map((o, i) => `<div class="card">
    <div class="cardhead">${inp(`d6.objetivos.${i}.titulo`, `Objetivo ${i + 1}`)}${os.length > 1 ? `<button class="x" data-act="rm-obj" data-i="${i}" aria-label="Tirar o objetivo">×</button>` : ""}</div>
    <div class="grid2"><label class="lab"><span>Área</span>${sel(`d6.objetivos.${i}.area`, areaOpts(), "Escolha a área")}</label>
    <label class="lab"><span>Prazo</span>${sel(`d6.objetivos.${i}.trimestre`, [["1", "1º trimestre"], ["2", "2º trimestre"], ["3", "3º trimestre"], ["4", "4º trimestre"]], "Escolha o prazo")}</label></div>
    <label class="lab"><span>Como eu vou saber que consegui</span>${ta(`d6.objetivos.${i}.sinal`, 2)}</label>
    <label class="lab"><span>Por que isso importa para mim</span>${ta(`d6.objetivos.${i}.porque`, 2)}</label>
  </div>`).join("")}
  ${os.length < 5 ? `<button class="btn" data-act="add-obj">Acrescentar um objetivo</button>` : ""}</section>`;
}
const TOTAL_PROJETOS = 8;
function garantirProjetos() { while (S.d7.projetos.length < TOTAL_PROJETOS) S.d7.projetos.push(novoProjeto()); }
function dia7() {
  garantirProjetos();
  const ps = projetos(), ts = todasTarefas(), f = ts.filter(t => t.feita).length;
  const temConteudo = ps.some(p => p.nome.trim() || p.tarefas.some(t => t.texto.trim()));
  return `<section class="sec"><h3>O seu painel do ano</h3>
  <p class="note">O Claude transforma os objetivos do dia 6 em projetos com ações. Depois, você muda o que quiser e vai marcando as ações feitas ao longo do ano.</p>
  <div class="painel-topo"><button class="btn primary" data-act="gerar-projetos">${confirmarProjetos ? "Clique de novo para substituir os projetos" : temConteudo ? "Gerar os projetos de novo" : "Transformar os meus objetivos em projetos"}</button>
  <span class="contagem">${f} de ${ts.length} ações feitas</span></div>
  <div class="projetos">${ps.map((p, i) => cardEditavel(p, i, "projetos")).join("")}${extras().map((p, i) => cardEditavel(p, i, "extras")).join("")}</div></section>`;
}
function cardEditavel(p, i, nomeLista) {
  const base = `d7.${nomeLista}.${i}`, dl = `data-lista="${nomeLista}"`;
  const pts = p.tarefas.filter(t => t.texto.trim()), pf = pts.filter(t => t.feita).length, pc = pts.length ? Math.round((pf * 100) / pts.length) : 0;
  return `<div class="projeto${p.tipo ? " extra" : ""}">
    <div class="cardhead">${p.tipo ? `<p class="ptipo">${esc(p.tipo)}</p>` : `<textarea class="auto pobj" rows="1" data-p="${base}.objetivo" placeholder="Objetivo">${esc(p.objetivo)}</textarea>`}<button class="x" data-act="limpar-proj" ${dl} data-i="${i}" aria-label="Limpar o projeto">×</button></div>
    <textarea class="auto pnome" rows="1" data-p="${base}.nome" placeholder="Nome do projeto">${esc(p.nome)}</textarea>
    <div class="prog" aria-label="Ações feitas"><i style="width:${pc}%"></i></div>
    ${p.tarefas.map((t, k) => `<div class="tarefa${t.feita ? " feita" : ""}"><input type="checkbox" data-act="feita" ${dl} data-pi="${i}" data-k="${k}" ${t.feita ? "checked" : ""} aria-label="Ação feita"><textarea class="auto" rows="1" data-p="${base}.tarefas.${k}.texto" placeholder="Ação ${k + 1}">${esc(t.texto)}</textarea><button class="x" data-act="rm-tarefa" ${dl} data-pi="${i}" data-k="${k}" aria-label="Tirar a ação">×</button></div>`).join("")}
    <button class="btn small" data-act="add-tarefa" ${dl} data-pi="${i}">Acrescentar uma ação</button>
  </div>`;
}
function dia8() {
  return `<section class="sec"><div class="cal"><table><thead><tr><th></th>${DIAS_SEMANA.map(d => `<th>${d}</th>`).join("")}</tr></thead><tbody>
  ${PERIODOS.map((p, b) => `<tr><th>${p}</th>${DIAS_SEMANA.map((_, a) => `<td>${ta(`d9.semana.d${a}p${b}`, 3)}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div></section>`;
}
function dia9() {
  return `<section class="sec lembretes">
  ${S.d9.lembretes.map((l, i) => `<div class="lembrete"><div class="row">${inp(`d9.lembretes.${i}.texto`, "Um lembrete")}<button class="x" data-act="rm-lembrete" data-i="${i}" aria-label="Tirar o lembrete">×</button></div>
    <div class="dias">${l.dias.map((on, k) => `<span class="dia"><button class="circ${on ? " on" : ""}" data-act="circ" data-i="${i}" data-k="${k}" aria-pressed="${on}" aria-label="${DIAS_SEMANA[k]}"></button><small>${INICIAIS[k]}</small></span>`).join("")}</div></div>`).join("")}
  <button class="btn small addrow" data-act="add-lembrete">Acrescentar um lembrete</button>
  <p class="note">Marque os dias da semana em que cada lembrete vale.</p></section>`;
}
function projetoCard(p, i, comObjetivo, nomeLista = "projetos") {
  const pts = p.tarefas.filter(t => t.texto.trim()), pf = pts.filter(t => t.feita).length, pc = pts.length ? Math.round((pf * 100) / pts.length) : 0;
  return `<div class="pcard">${comObjetivo && p.objetivo ? `<p class="pobj-txt">${esc(p.objetivo)}</p>` : ""}
    <p class="pnome-txt">${esc(p.nome || "Projeto sem nome")}</p>
    <div class="prog"><i style="width:${pc}%"></i></div><p class="note">${pf} de ${pts.length} ações feitas</p>
    ${p.tarefas.map((t, k) => t.texto.trim() ? `<label class="chk ${t.feita ? "feita" : ""}"><input type="checkbox" data-act="feita" data-lista="${nomeLista}" data-pi="${i}" data-k="${k}" ${t.feita ? "checked" : ""}><span>${esc(t.texto)}</span></label>` : "").join("")}
  </div>`;
}
function painelRevisao() {
  const norm = t => (t || "").trim().toLowerCase();
  const objs = S.d6.objetivos.filter(o => o.titulo.trim());
  const ps = projetos().map((p, i) => ({ p, i })).filter(x => x.p.nome.trim() || x.p.tarefas.some(t => t.texto.trim()));
  const usados = new Set();
  const ts = todasTarefas(), feitas = ts.filter(t => t.feita).length;
  const habs = S.d9.lembretes.filter(l => l.texto.trim());
  const blocos = objs.map(o => {
    const meus = ps.filter(x => norm(x.p.objetivo) && norm(x.p.objetivo) === norm(o.titulo));
    meus.forEach(x => usados.add(x.i));
    return `<div class="pobjetivo"><div class="pobj-topo"><h4>${esc(o.titulo)}</h4>
      ${o.area ? `<span class="tag">${esc(areaNome(o.area))}</span>` : ""}${o.trimestre ? `<span class="tag">${esc(o.trimestre)}º trimestre</span>` : ""}</div>
      ${o.sinal.trim() ? `<p class="note">Como vou saber que consegui: ${esc(o.sinal)}</p>` : ""}
      <div class="pcards">${meus.map(x => projetoCard(x.p, x.i, false)).join("") || `<p class="note">Nenhum projeto ligado a este objetivo no dia 7.</p>`}</div></div>`;
  }).join("");
  const soltos = ps.filter(x => !usados.has(x.i));
  return `<section class="sec painel-rev"><h3>O seu painel</h3>
  <div class="cards">
    <div class="kpi"><small>Objetivos</small><b>${objs.length}</b></div>
    <div class="kpi"><small>Projetos</small><b>${ps.length}</b></div>
    <div class="kpi"><small>Ações feitas</small><b>${feitas}</b><span> de ${ts.length}</span></div>
    <div class="kpi"><small>Hábitos</small><b>${habs.length}</b></div>
  </div>
  ${blocos}
  ${soltos.length ? `<div class="pobjetivo"><div class="pobj-topo"><h4>Outros projetos</h4></div><div class="pcards">${soltos.map(x => projetoCard(x.p, x.i, true)).join("")}</div></div>` : ""}
  ${extras().some(p => p.nome.trim() || p.tarefas.some(t => t.texto.trim())) ? `<div class="pobjetivo"><div class="pobj-topo"><h4>Inbox e Lista Avulsa</h4></div><div class="pcards">${extras().map((p, i) => (p.nome.trim() || p.tarefas.some(t => t.texto.trim())) ? projetoCard({ ...p, objetivo: p.tipo }, i, true, "extras") : "").join("")}</div></div>` : ""}
  ${!objs.length && !ps.length ? `<p class="note">Os objetivos do dia 6 e os projetos do dia 7 aparecem aqui.</p>` : ""}
  <div class="pobjetivo"><div class="pobj-topo"><h4>Os hábitos</h4></div>
  ${habs.length ? S.d9.lembretes.map((l, i) => l.texto.trim() ? `<div class="hab"><span>${esc(l.texto)}</span><span class="dias">${l.dias.map((on, k) => `<span class="dia"><button class="circ${on ? " on" : ""}" data-act="circ" data-i="${i}" data-k="${k}" aria-pressed="${on}" aria-label="${DIAS_SEMANA[k]}"></button><small>${INICIAIS[k]}</small></span>`).join("")}</span></div>` : "").join("") : `<p class="note">Os hábitos do dia 9 aparecem aqui.</p>`}</div>
  </section>`;
}
function dia10() {
  return `${painelRevisao()}<section class="sec"><h3>O seu plano completo</h3><p class="note">Agora a ferramenta cruza tudo o que você escreveu nos 10 dias.</p>
  <button class="btn primary" data-act="ir" data-d="${FINAL()}">Ver o meu 2027</button></section>`;
}
const RENDER = [dia0, dia1, dia2, dia3, diaAberto, diaAberto, dia6, dia7, dia8, dia9, dia10];

function finalView() {
  const ps = projetos().filter(p => p.nome.trim());
  const comNota = areas().slice(0, 8).filter(a => nota(a.id) != null);
  const media = comNota.length ? (comNota.reduce((s, a) => s + nota(a.id), 0) / comNota.length).toFixed(1).replace(".", ",") : "–";
  const dentroDoClaude = !!(window.claude && window.claude.use);
  return `<div class="eyebrow">O resultado dos 10 dias</div><h2 class="day">O meu 2027</h2>
  <div class="cards">
    <div class="kpi"><small>Nota média da roda</small><b>${media}</b></div>
    <div class="kpi"><small>Objetivos</small><b>${S.d6.objetivos.filter(o => o.titulo.trim()).length}</b></div>
    <div class="kpi"><small>Projetos</small><b>${ps.length}</b></div>
    <div class="kpi"><small>Tarefas</small><b>${todasTarefas().length}</b></div>
  </div>
  <section class="sec"><h3>A análise do seu ano</h3>
  <p class="note">A análise é feita pelo Claude, cruzando tudo o que você escreveu nos 10 dias.</p>
  ${S.resumos.final ? `<div class="resumo">${resumoHTML(S.resumos.final)}</div>` : ""}
  <div class="noprint"><button class="btn primary" data-act="resumo" data-tipo="final">${S.resumos.final ? "Gerar a análise de novo" : "Gerar a análise do meu 2027"}</button></div></section>
  ${S.resumos.dia1 ? `<section class="sec"><h3>Quem eu sou hoje</h3><div class="resumo">${resumoHTML(S.resumos.dia1)}</div></section>` : ""}
  <section class="sec"><h3>A roda da vida</h3><div class="roda">${rodaSVG(false)}</div>${legenda()}</section>
  ${ps.length ? `<section class="sec"><h3>Os projetos</h3><div class="projetos">${ps.map(p => {
    const ts = p.tarefas.filter(t => t.texto.trim());
    return `<div class="projeto"><b style="font-family:var(--display);font-size:24px">${esc(p.nome)}</b><ul>${ts.map(t => `<li>${esc(t.texto)}</li>`).join("")}</ul></div>`;
  }).join("")}</div></section>` : ""}
  ${S.d9.lembretes.some(l => l.texto.trim()) ? `<section class="sec"><h3>Os lembretes</h3><ul>${S.d9.lembretes.filter(l => l.texto.trim()).map(l => `<li>${esc(l.texto)}: ${esc(DIAS_SEMANA.filter((_, k) => l.dias[k]).join(", ").toLowerCase() || "sem dias marcados")}</li>`).join("")}</ul></section>` : ""}
  <div class="foot noprint"><button class="btn" data-act="ir" data-d="${ULT()}">Voltar para o dia ${ULT()}</button>${dentroDoClaude ? "" : `<button class="btn" data-act="imprimir">Salvar em PDF</button>`}</div>`;
}

/* ---------- tela ---------- */
function concluidosN() { return DIAS.filter((d, i) => d.t && S.concluidos[i]).length; }
const totalDias = () => DIAS.filter(d => d.t).length;
function renderTrail() {
  const el = $("#trail"); if (!el) return;
  el.innerHTML = DIAS.map((d, i) => {
    const ab = aberto(i), ok = S.concluidos[i];
    return `<button class="daybtn${i === cur ? " on" : ""}${ok ? " done" : ""}${ab ? "" : " locked"}${d.t ? "" : " aberto"}" data-act="ir" data-d="${i}" aria-current="${i === cur ? "page" : "false"}"><span class="n">${i}</span><span class="t">${esc(tituloDia(i))}</span><span class="st">${ok ? "feito" : ab ? "" : esc(fmtData(abertura(i)).replace(" de ", " "))}</span></button>`;
  }).join("") + `<button class="daybtn final${cur === FINAL() ? " on" : ""}${aberto(ULT()) ? "" : " locked"}" data-act="ir" data-d="${FINAL()}"><span class="n">★</span><span class="t">O meu 2027</span><span class="st"></span></button>`;
  const n = concluidosN(); $("#ovbar").style.width = Math.round((n * 100) / totalDias()) + "%"; $("#ovpct").textContent = `${n} de ${totalDias()}`;
}
function crescer(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
function crescerTodos() { document.querySelectorAll("textarea.auto").forEach(crescer); }
function renderSheet() {
  const f = document.activeElement, sh0 = $("#sheet");
  const chave = f && sh0 && sh0.contains(f) && (f.dataset.p ? `[data-p="${f.dataset.p}"]` : f.dataset.obra ? `[data-obra="${f.dataset.obra}"]` : f.id ? `#${f.id}` : null);
  const sel = chave && typeof f.selectionStart === "number" ? [f.selectionStart, f.selectionEnd] : null;
  desenharFolha();
  // pede para extensões de correção (Grammarly, LanguageTool) não se meterem nas caixas, porque elas costumam engolir colagens
  document.querySelectorAll('#sheet textarea, #sheet input[type=text]').forEach(el => { el.setAttribute('data-gramm', 'false'); el.setAttribute('data-gramm_editor', 'false'); el.setAttribute('data-enable-grammarly', 'false'); el.setAttribute('data-lt-active', 'false'); el.setAttribute('autocomplete', 'off'); });
  if (chave) { const n = document.querySelector(chave); if (n) { n.focus({ preventScroll: true }); if (sel) try { n.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
}
function desenharFolha() {
  const sh = $("#sheet");
  requestAnimationFrame(crescerTodos);
  if (cur === FINAL()) { sh.innerHTML = aberto(ULT()) ? finalView() : bloqueado(ULT(), "O meu 2027"); return; }
  const d = DIAS[cur];
  if (!aberto(cur)) { sh.innerHTML = bloqueado(cur, tituloDia(cur)); return; }
  sh.innerHTML = `<div class="eyebrow">Dia ${cur}${DEMO || cur === 0 ? "" : ` · ${esc(fmtData(abertura(cur)))}`}</div><h2 class="day">${esc(tituloDia(cur))}</h2><p class="ideia" id="ideia-dia" ${ideiaDia(cur) ? "" : "hidden"}>${esc(ideiaDia(cur))}</p>
  ${obraHTML(cur)}
  ${RENDER[cur]()}
  ${d.claude ? `<div class="claude"><h3>Leve para o Claude</h3><p>${esc(d.claude)}</p><p class="note">O botão copia a mensagem junto com as suas respostas deste dia. Cole no seu projeto do Claude.</p>
  <button class="btn" data-act="copiar" data-d="${cur}">Copiar para o Claude</button></div>` : ""}
  <div class="foot"><button class="btn" data-act="ir" data-d="${cur - 1}" ${cur === 0 ? "disabled" : ""}>Dia anterior</button>
  ${d.t ? `<button class="btn ${S.concluidos[cur] ? "" : "primary"}" data-act="concluir" data-d="${cur}">${S.concluidos[cur] ? "Dia concluído" : "Marcar o dia como concluído"}</button>` : ""}
  <button class="btn" data-act="ir" data-d="${cur + 1}">${cur === ULT() ? "O meu 2027" : "Próximo dia"}</button></div>`;
}
function bloqueado(i, titulo) {
  return `<div class="lock"><div class="eyebrow">${titulo === "O meu 2027" ? `Abre junto com o dia ${ULT()}` : `Dia ${i}`}</div><p class="big">${esc(titulo)}</p><p>Este dia abre em ${esc(fmtData(abertura(i)))}.</p></div>`;
}
function renderApp() {
  $("#app").innerHTML = `<div class="wrap">
  <header class="top"><div class="brand"><small>10 dias com o Claude</small><h1>Meu 2027</h1></div>
  <div class="topright"><div class="overall"><div class="bar"><i id="ovbar"></i></div><b id="ovpct"></b></div><span class="status" id="status">${DEMO ? "Prévia" : "Salvo"}</span>
  ${usuario ? `<button class="linkbtn" data-act="sair">Sair</button>` : ""}</div></header>
  ${DEMO ? `<p class="aviso">Você está vendo a prévia. Todos os dias estão abertos e o resumo automático não funciona.</p>` : ""}
  ${admin && !DEMO ? `<p class="aviso">Você vê todos os dias abertos porque é administradora. As participantes veem cada dia na data dele.</p>` : ""}
  <div class="layout"><nav class="trail" id="trail" aria-label="Dias"></nav><main class="sheet" id="sheet"></main></div></div>`;
  renderTrail(); renderSheet();
}
function ir(i) {
  if (i < 0 || i > FINAL()) return;
  cur = i; confirmarProjetos = false;
  try { history.replaceState(null, "", i === FINAL() ? "#meu2027" : `#dia${i}`); } catch (e) { }
  renderTrail(); renderSheet();
  $("#sheet").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- eventos ---------- */
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.obra && cur < FINAL()) {
    const id = obraId(cur); OBRA[id] = { ...(OBRA[id] || {}), [t.dataset.obra]: t.value }; mudouObra(id);
    return;
  }
  if (t.dataset.nota) {
    const id = t.dataset.nota, v = Number(t.value);
    S.d3.notas[id] = v; mudou();
    const o = document.getElementById("o-" + id); if (o) o.textContent = v;
    t.closest(".barra").style.setProperty("--cor", corNivel(v));
    const b = $("#rodabox"); if (b) b.innerHTML = rodaSVG(true);
    return;
  }
  const p = t.dataset && t.dataset.p;
  if (!p) return;
  if (t.classList.contains("auto")) crescer(t);
  setPath(p, t.value); mudou();
});
document.addEventListener("change", e => {
  const t = e.target;
  // título e abertura só atualizam a página quando a pessoa sai do campo, para nada se mexer enquanto ela dita
  if (t.dataset && t.dataset.obra === "titulo") { const h = $("#sheet h2.day"); if (h) h.textContent = tituloDia(cur); renderTrail(); return; }
  if (t.dataset && t.dataset.obra === "ideia") { const p = $("#ideia-dia"); if (p) { p.textContent = ideiaDia(cur); p.hidden = !ideiaDia(cur); } return; }
  if (t.dataset && t.dataset.act === "d0") { S.d0.feito[+t.dataset.k] = t.checked; mudou(); t.closest(".chk").classList.toggle("feita", t.checked); return; }
  if (t.dataset && t.dataset.act === "feita") {
    const tk = listaProj(t.dataset.lista)[+t.dataset.pi]?.tarefas[+t.dataset.k];
    if (tk) { tk.feita = t.checked; mudou(); renderSheet(); if (t.checked) toast("Ação feita"); }
  }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "INPUT") return;
  const act = b.dataset.act, i = +b.dataset.i;
  switch (act) {
    case "ir": ir(+b.dataset.d); return;
    case "nota": S.d3.notas[b.dataset.a] = Number(b.dataset.v); mudou(); renderSheet(); return;
    case "add-sub": S.d1.areas[i].subs.push({ id: novoId(), nome: "", texto: "" }); break;
    case "rm-sub": S.d1.areas[i].subs.splice(+b.dataset.j, 1); break;
    case "add-item": getPath(b.dataset.list).push(""); break;
    case "rm-item": { const arr = getPath(b.dataset.list); arr.splice(i, 1); if (!arr.length) arr.push(""); break; }
    case "add-obj": if (S.d6.objetivos.length < 5) S.d6.objetivos.push(novoObjetivo()); break;
    case "rm-obj": S.d6.objetivos.splice(i, 1); break;
    case "gerar-projetos": gerarProjetos(b); return;
    case "add-proj": projetos().push(novoProjeto()); break;
    case "rm-proj": projetos().splice(i, 1); break;
    case "limpar-proj": if (b.dataset.lista === "extras") extras()[i] = { ...novoProjeto(), tipo: EXTRAS[i] }; else projetos()[i] = novoProjeto(); break;
    case "add-tarefa": listaProj(b.dataset.lista)[+b.dataset.pi].tarefas.push(novaTarefa()); break;
    case "rm-tarefa": listaProj(b.dataset.lista)[+b.dataset.pi].tarefas.splice(+b.dataset.k, 1); break;
    case "add-lembrete": S.d9.lembretes.push(novoLembrete()); break;
    case "rm-lembrete": S.d9.lembretes.splice(i, 1); if (!S.d9.lembretes.length) S.d9.lembretes.push(novoLembrete()); break;
    case "circ": { const l = S.d9.lembretes[i]; l.dias[+b.dataset.k] = !l.dias[+b.dataset.k]; b.classList.toggle("on"); b.setAttribute("aria-pressed", l.dias[+b.dataset.k]); mudou(); return; }
    case "concluir": S.concluidos[+b.dataset.d] = !S.concluidos[+b.dataset.d]; mudou(); renderTrail(); renderSheet(); if (S.concluidos[+b.dataset.d]) toast("Dia concluído"); return;
    case "copiar-obra": copiar(textoObra()); return;
    case "copiar-perguntas": copiar(textoPerguntasD1()); return;
    case "copiar": copiar(`${DIAS[+b.dataset.d].claude}\n\n${textoDia(+b.dataset.d)}`); return;
    case "resumo": gerarResumo(b.dataset.tipo, b); return;
    case "imprimir": window.print(); return;
    case "sair": await salvar(); await authMod.signOut(auth); location.reload(); return;
    default: return;
  }
  mudou(); renderSheet();
});

function copiar(texto) {
  const fallback = () => {
    const t = document.createElement("textarea"); t.value = texto; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); toast("Copiado. Agora cole no seu projeto do Claude."); } catch (e) { toast("Não consegui copiar automaticamente."); }
    t.remove();
  };
  try { navigator.clipboard.writeText(texto).then(() => toast("Copiado. Agora cole no seu projeto do Claude."), fallback); } catch (e) { fallback(); }
}

async function chamarClaude(tipo, texto) {
  const token = await usuario.getIdToken();
  const r = await fetch("/api/resumo", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ tipo, texto }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Não consegui falar com o Claude agora. Tente de novo em alguns minutos.");
  return j;
}
async function gerarResumo(tipo, btn) {
  if (DEMO) { toast("Na prévia, o resumo automático não funciona. Ele funciona com o login ativado."); return; }
  btn.disabled = true; const orig = btn.textContent; btn.textContent = "Gerando, pode levar até 1 minuto";
  try {
    const j = await chamarClaude(tipo, tipo === "dia1" ? textoDia(1) : textoTudo());
    if (!j.texto) throw new Error("O resumo veio vazio. Tente de novo.");
    S.resumos[tipo] = j.texto; pendente = true; await salvar(); renderSheet();
  } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = orig; }
}
async function gerarProjetos(btn) {
  const temConteudo = projetos().some(p => p.nome.trim() || p.tarefas.some(t => t.texto.trim()));
  if (temConteudo && !confirmarProjetos) { confirmarProjetos = true; renderSheet(); return; }
  confirmarProjetos = false;
  if (DEMO) {
    const os = S.d6.objetivos.filter(o => o.titulo.trim());
    S.d7.projetos = os.slice(0, TOTAL_PROJETOS).map(o => novoProjeto("", o.titulo)); garantirProjetos();
    mudou(); renderSheet(); toast("Na prévia, os projetos aparecem vazios. Com o login ativado, o Claude preenche as tarefas.");
    return;
  }
  if (!S.d6.objetivos.some(o => o.titulo.trim())) { toast("Escreva pelo menos um objetivo no dia 6."); return; }
  btn.disabled = true; btn.textContent = "O Claude está montando os projetos";
  try {
    const j = await chamarClaude("projetos", textoDia(6));
    const lst = Array.isArray(j.projetos) ? j.projetos : [];
    if (!lst.length) throw new Error("O Claude não devolveu projetos. Tente de novo.");
    S.d7.projetos = lst.slice(0, TOTAL_PROJETOS).map(p => {
      const ts = (Array.isArray(p.tarefas) ? p.tarefas : []).map(t => ({ id: novoId(), texto: String(t), feita: false }));
      while (ts.length < 3) ts.push(novaTarefa());
      return { id: novoId(), nome: String(p.nome || ""), objetivo: String(p.objetivo || ""), tarefas: ts };
    });
    garantirProjetos(); pendente = true; await salvar(); renderSheet();
  } catch (err) { toast(err.message); renderSheet(); }
}

/* ---------- início ---------- */
function diaInicial() {
  const m = /^#dia(\d+)$/.exec(location.hash || "");
  if (m) { const i = +m[1]; if (i >= 0 && i <= ULT()) return i; }
  if (location.hash === "#meu2027") return FINAL();
  let ult = 0;
  for (let i = 0; i <= ULT(); i++) if (aberto(i)) ult = i;
  for (let i = 0; i <= ult; i++) if (!S.concluidos[i] && DIAS[i].t) return i;
  return ult;
}
function telaLogin(erro) {
  $("#app").innerHTML = `<div class="wrap"><div class="login"><h1>Meu 2027</h1>
  <p>10 dias com o Claude para fechar 2026 e planejar 2027. Entre com a sua conta Google para começar. As suas respostas ficam guardadas e só você vê.</p>
  <button class="btn primary" id="entrar">Entrar com o Google</button>
  ${erro ? `<p class="note">${esc(erro)}</p>` : ""}</div></div>`;
  $("#entrar").onclick = async () => {
    const prov = new authMod.GoogleAuthProvider();
    try { await authMod.signInWithPopup(auth, prov); }
    catch (err) {
      if (err && (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment")) authMod.signInWithRedirect(auth, prov);
      else if (!(err && err.code === "auth/popup-closed-by-user")) telaLogin("Não consegui entrar. Tente de novo.");
    }
  };
}
async function iniciar() {
  carregarObraLocal();
  if (DEMO) {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) S = mesclar(JSON.parse(raw)); } catch (e) { }
    cur = diaInicial(); renderApp(); iniciarObra(); return;
  }
  const V = "10.12.2";
  const appMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  authMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app = appMod.initializeApp(CFG.firebase);
  auth = authMod.getAuth(app); db = fs.getFirestore(app);
  authMod.onAuthStateChanged(auth, async u => {
    if (!u) { usuario = null; telaLogin(); return; }
    if (usuario && usuario.uid === u.uid) return;
    usuario = u; admin = (CFG.admins || []).map(x => x.toLowerCase()).includes((u.email || "").toLowerCase());
    try {
      const snap = await fs.getDoc(fs.doc(db, "participantes", u.uid));
      if (snap.exists() && snap.data().dados) S = mesclar(JSON.parse(snap.data().dados));
    } catch (e) { console.error(e); toast("Não consegui carregar as suas respostas. Recarregue a página."); }
    cur = diaInicial(); renderApp(); if (admin) iniciarObra();
  });
}
iniciar();
