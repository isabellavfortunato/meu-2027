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
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const INICIAIS = ["S", "T", "Q", "Q", "S", "S", "D"];
const PERIODOS = ["Manhã", "Tarde", "Noite"];
const NIVEIS = [{ pts: 0, nome: "Semente" }, { pts: 50, nome: "Broto" }, { pts: 150, nome: "Muda" }, { pts: 300, nome: "Árvore" }, { pts: 500, nome: "Floresta" }];
const PONTOS_TAREFA = 10;

// t vazio = dia em aberto
const DIAS = [
  { t: "Quem sou eu hoje", ideia: "Antes de planejar 2027, é preciso saber onde você está. Escreva como está cada área da sua vida hoje, do jeito que sair. Se uma área tem partes diferentes, crie uma parte para cada uma.", claude: "Leia o meu retrato de quem eu sou hoje e me faça 3 perguntas sobre o que ficou faltando." },
  { t: "A retrospectiva de 2026", ideia: "Olhar para 2026 com honestidade: o que deu certo, o que não deu, o que você aprendeu e do que você se orgulha.", claude: "A partir da minha retrospectiva de 2026, me ajude a enxergar os padrões que se repetem." },
  { t: "A roda da vida", ideia: "Marque de 0 a 10 como está cada uma das 8 áreas da sua vida hoje. A roda muda de cor conforme o nível de cada área.", claude: "Olhando as notas da minha roda da vida, quais áreas estão puxando as outras para baixo?" },
  { t: "", ideia: "", claude: "" },
  { t: "", ideia: "", claude: "" },
  { t: "Os objetivos", ideia: "Escreva de 3 a 5 objetivos claros para 2027.", claude: "Revise os meus objetivos e me diga se algum está vago demais para eu saber se cheguei lá." },
  { t: "Dos objetivos aos projetos", ideia: "Os seus objetivos viram projetos, e cada projeto é quebrado em tarefas pequenas para você ir marcando.", claude: "Pegue um dos meus projetos e me ajude a montar o primeiro passo de cada tarefa." },
  { t: "O painel do ano", ideia: "O painel reúne as tarefas dos seus projetos, soma pontos a cada tarefa feita e mostra o seu nível. Defina uma recompensa para cada nível.", claude: "Construa comigo uma versão deste painel do ano do meu jeito, com as cores e os níveis que eu escolher." },
  { t: "Hábitos e semana ideal", ideia: "Desenhe a sua semana ideal de 2027 e anote os lembretes dos hábitos que sustentam os seus objetivos, marcando em quais dias cada um vale.", claude: "Monte comigo lembretes para os meus hábitos dentro da minha semana ideal." },
  { t: "O ritual de revisão", ideia: "Combine com você mesma quando e como vai revisar o plano, para ele continuar vivo depois de janeiro, e escolha o primeiro passo.", claude: "Transforme o meu ritual de revisão num roteiro que eu possa repetir toda semana." }
];
const tituloDia = i => DIAS[i].t || "Dia em aberto";

/* ---------- estado ---------- */
const novoObjetivo = () => ({ id: novoId(), titulo: "", area: "", sinal: "", porque: "", trimestre: "" });
const novaTarefa = () => ({ id: novoId(), texto: "", feita: false });
const novoProjeto = (nome = "", objetivo = "") => ({ id: novoId(), nome, objetivo, tarefas: [novaTarefa(), novaTarefa(), novaTarefa()] });
const novoLembrete = () => ({ id: novoId(), texto: "", dias: [false, false, false, false, false, false, false] });

function estadoInicial() {
  return {
    d1: { areas: AREAS_PADRAO.map(n => ({ id: novoId(), nome: n, texto: "", subs: [] })) },
    d2: { certo: [""], errado: [""], aprendi: [""], orgulho: [""], palavra: "", desabafo: "" },
    d3: { notas: {} },
    d6: { objetivos: [novoObjetivo(), novoObjetivo(), novoObjetivo()] },
    d7: { projetos: [] },
    d8: { recompensas: ["", "", "", ""] },
    d9: { semana: {}, lembretes: [novoLembrete(), novoLembrete(), novoLembrete()] },
    d10: {
      diaRevisao: "Domingo",
      semanal: ["Olhar o painel do ano e marcar as tarefas feitas", "Escolher as 3 tarefas mais importantes da semana", "Conferir os lembretes da semana que passou"],
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
const obraId = i => "d" + String(i + 1).padStart(2, "0");
const VER_OBRA = () => DEMO || admin;
let obraDb = null;
const obraTimers = {}, obraGravando = new Set(), obraSujos = new Set();

const PREVIAS_PADRAO = {
  d01: "Ela escreve como está cada uma das 8 áreas da vida hoje, do jeito que sair, e pode dividir cada área em partes. No fim, o Claude gera o resumo de quem ela é hoje.",
  d02: "Ela olha para 2026: o que deu certo, o que não deu, o que aprendeu e do que se orgulha, a palavra que resume o ano e um desabafo livre.",
  d03: "A roda da vida com 8 áreas. Embaixo da roda, uma barra de 0 a 10 para cada área. A cor de cada área na roda muda conforme o nível que ela marca.",
  d06: "Ela estabelece de 3 a 5 objetivos claros para 2027, com a área, o prazo, como vai saber que conseguiu e por que isso importa.",
  d07: "O Claude, dentro da ferramenta, transforma os objetivos em projetos e preenche as tarefas de cada um. Os projetos aparecem em 3 colunas, com 6 visíveis na página. Cada projeto começa com 3 tarefas para marcar e tem o botão Acrescentar uma tarefa. No celular, um embaixo do outro.",
  d08: "O painel reúne as tarefas dos projetos, soma 10 pontos por tarefa feita, mostra o nível (Semente, Broto, Muda, Árvore e Floresta) e tem uma recompensa para cada nível.",
  d09: "A página tem o calendário da semana ideal, de segunda a domingo, com manhã, tarde e noite. Do lado direito, os lembretes, cada um com 7 círculos para marcar os dias da semana em que ele vale.",
  d10: "Ela combina o dia da revisão semanal e os passos das revisões semanal, mensal e trimestral, escolhe o primeiro passo de janeiro e abre O meu 2027, onde o Claude cruza tudo e faz a análise do ano."
};
let obraNuvem = false; // true quando a construção fica no Firestore da administradora
async function iniciarObra() {
  try { const raw = localStorage.getItem(LS_OBRA); if (raw) Object.assign(OBRA, JSON.parse(raw)); } catch (e) { }
  if (!DEMO && admin && fs && usuario) {
    obraNuvem = true;
    try {
      const snap = await fs.getDoc(fs.doc(db, "participantes", usuario.uid));
      const c = snap.exists() && snap.data().construcao;
      if (c) Object.assign(OBRA, JSON.parse(c));
    } catch (e) { console.error(e); }
    renderSheet();
    return;
  }
  try { obraDb = window.claude && window.claude.use ? await window.claude.use("db") : null; } catch (e) { obraDb = null; }
  if (!obraDb) return;
  obraDb.collection("construcao").onSnapshot(snap => {
    snap.docs.forEach(d => {
      if (!d.exists || obraSujos.has(d.id) || obraGravando.has(d.id)) return;
      OBRA[d.id] = { ...(d.data() || {}) };
      if (cur < 10 && obraId(cur) === d.id) {
        const foco = document.activeElement;
        ["previa", "roteiro"].forEach(k => { const t = document.getElementById(`obra-${k}`); if (t && t !== foco && t.value !== (OBRA[d.id][k] || "")) t.value = OBRA[d.id][k] || ""; });
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
  return DIAS.map((_, i) => { const o = OBRA[obraId(i)] || {}; return `DIA ${i + 1}. ${tituloDia(i).toUpperCase()}\nPrévia do dia: ${(o.previa ?? PREVIAS_PADRAO[obraId(i)] ?? "").trim() || "(em branco)"}\nRoteiro do vídeo: ${(o.roteiro || "").trim() || "(em branco)"}`; }).join("\n\n");
}
function obraHTML(i) {
  if (!VER_OBRA()) return "";
  const o = OBRA[obraId(i)] || {};
  return `<div class="obra noprint"><h3>Construção do dia ${i + 1}</h3><p class="quem">Só você vê esta parte. As participantes não veem. <span class="salvo" id="obra-salvo"></span></p>
  <label class="lab"><span>Prévia do dia</span><textarea id="obra-previa" data-obra="previa" placeholder="Como vai ser este dia: o que ela faz, o que aparece na página e o que o Claude faz.">${esc(o.previa ?? PREVIAS_PADRAO[obraId(i)] ?? "")}</textarea></label>
  <label class="lab"><span>Roteiro do vídeo</span><textarea id="obra-roteiro" data-obra="roteiro" placeholder="O roteiro do vídeo que vai junto com este dia.">${esc(o.roteiro || "")}</textarea></label>
  <button class="btn small" data-act="copiar-obra">Copiar a construção dos 10 dias</button></div>`;
}

/* ---------- datas ---------- */
function abertura(i) { return new Date(new Date(`${INICIO}T00:00:00-03:00`).getTime() + i * DIA_MS); }
function aberto(i) { return DEMO || admin || Date.now() >= abertura(Math.min(i, 9)).getTime(); }
const fmtData = d => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

/* ---------- ajudantes ---------- */
const areas = () => S.d1.areas;
const areaNome = id => (S.d1.areas.find(a => a.id === id) || {}).nome || "";
const nota = id => { const v = S.d3.notas[id]; return v === "" || v == null ? null : Number(v); };
const projetos = () => S.d7.projetos;
function todasTarefas() {
  const out = [];
  projetos().forEach(p => p.tarefas.forEach(t => { if (t.texto.trim()) out.push({ ...t, projeto: p }); }));
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
  const L = [`DIA ${i + 1}. ${tituloDia(i).toUpperCase()}`];
  const v = s => (s || "").trim() || "(em branco)";
  if (i === 0) areas().forEach(a => {
    if (!a.nome.trim()) return;
    L.push(`\n${a.nome}: ${v(a.texto)}`);
    a.subs.forEach(s => { if (s.nome.trim() || s.texto.trim()) L.push(`  ${s.nome || "Parte"}: ${v(s.texto)}`); });
  });
  if (i === 1) {
    [["certo", "O que deu certo em 2026"], ["errado", "O que não deu certo"], ["aprendi", "O que eu aprendi"], ["orgulho", "Do que eu me orgulho"]].forEach(([k, t]) => {
      const it = S.d2[k].filter(x => x.trim()); L.push(`\n${t}:`); L.push(it.length ? it.map(x => `- ${x}`).join("\n") : "(em branco)");
    });
    L.push(`\nA palavra que resume 2026: ${v(S.d2.palavra)}`, `\nDesabafo: ${v(S.d2.desabafo)}`);
  }
  if (i === 2) areas().slice(0, 8).forEach(a => L.push(`${a.nome}: ${nota(a.id) ?? "sem nota"}`));
  if (i === 5) S.d6.objetivos.forEach((o, k) => {
    if (!o.titulo.trim()) return;
    L.push(`\nObjetivo ${k + 1}: ${o.titulo}`, `Área: ${areaNome(o.area) || "sem área"}`, `Como vou saber que consegui: ${v(o.sinal)}`, `Por que importa: ${v(o.porque)}`, `Prazo: ${o.trimestre ? o.trimestre + "º trimestre" : "sem prazo"}`);
  });
  if (i === 6) projetos().forEach(p => {
    L.push(`\nProjeto: ${v(p.nome)}${p.objetivo ? ` (objetivo: ${p.objetivo})` : ""}`);
    p.tarefas.filter(t => t.texto.trim()).forEach(t => L.push(`- [${t.feita ? "x" : " "}] ${t.texto}`));
  });
  if (i === 7) {
    const ts = todasTarefas(), f = ts.filter(t => t.feita).length;
    L.push(`Tarefas: ${ts.length}. Feitas: ${f}. Pontos: ${f * PONTOS_TAREFA}.`);
    NIVEIS.slice(1).forEach((n, k) => L.push(`Recompensa do nível ${n.nome}: ${v(S.d8.recompensas[k])}`));
  }
  if (i === 8) {
    L.push("Semana ideal:");
    DIAS_SEMANA.forEach((d, a) => {
      const ps = PERIODOS.map((p, b) => { const t = (S.d9.semana[`d${a}p${b}`] || "").trim(); return t ? `${p}: ${t}` : ""; }).filter(Boolean);
      if (ps.length) L.push(`${d}: ${ps.join("; ")}`);
    });
    L.push("\nLembretes:");
    S.d9.lembretes.filter(l => l.texto.trim()).forEach(l => L.push(`- ${l.texto} (${DIAS_SEMANA.filter((_, k) => l.dias[k]).join(", ") || "sem dias marcados"})`));
  }
  if (i === 9) {
    L.push(`Dia da revisão semanal: ${S.d10.diaRevisao}`);
    [["semanal", "Revisão semanal"], ["mensal", "Revisão mensal"], ["trimestral", "Revisão trimestral"]].forEach(([k, t]) => L.push(`\n${t}:\n${S.d10[k].filter(x => x.trim()).map(x => `- ${x}`).join("\n")}`));
    L.push(`\nPrimeiro passo de janeiro: ${v(S.d10.primeiroPasso)}${S.d10.dataPasso ? ` (${S.d10.dataPasso.split("-").reverse().join("/")})` : ""}`);
  }
  return L.join("\n");
}
const textoTudo = () => DIAS.map((d, i) => d.t ? textoDia(i) : "").filter(Boolean).join("\n\n");

/* ---------- dias ---------- */
function dia1() {
  return `<section class="sec"><h3>As áreas da sua vida</h3>
  ${areas().map((a, i) => `<div class="card">
    <div class="cardhead">${inp(`d1.areas.${i}.nome`, "Nome da área")}</div>
    ${ta(`d1.areas.${i}.texto`, 3, "Como esta área está hoje?")}
    ${a.subs.map((s, j) => `<div class="subcard"><div class="cardhead">${inp(`d1.areas.${i}.subs.${j}.nome`, "Nome da parte")}<button class="x" data-act="rm-sub" data-i="${i}" data-j="${j}" aria-label="Tirar a parte">×</button></div>${ta(`d1.areas.${i}.subs.${j}.texto`, 2, "Como esta parte está hoje?")}</div>`).join("")}
    <button class="btn small addrow" data-act="add-sub" data-i="${i}">Acrescentar uma parte</button>
  </div>`).join("")}</section>
  <section class="sec"><h3>O resumo de quem você é hoje</h3>
  <p class="note">Quando terminar de escrever, peça o resumo. Ele é feito pelo Claude a partir do que você escreveu e fica guardado aqui.</p>
  ${S.resumos.dia1 ? `<div class="resumo">${resumoHTML(S.resumos.dia1)}</div>` : ""}
  <button class="btn primary" data-act="resumo" data-tipo="dia1">${S.resumos.dia1 ? "Gerar o resumo de novo" : "Gerar o resumo de quem eu sou hoje"}</button></section>`;
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
  <div class="barras">${areas().slice(0, 8).map(barraHTML).join("")}</div></section>`;
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
function dia7() {
  const ps = projetos();
  return `<section class="sec"><h3>Os seus projetos</h3>
  <p class="note">O Claude transforma os objetivos do dia 6 em projetos com tarefas. Depois, você muda o que quiser e vai marcando as tarefas feitas.</p>
  <button class="btn primary" data-act="gerar-projetos">${confirmarProjetos ? "Clique de novo para substituir os projetos" : ps.length ? "Gerar os projetos de novo" : "Transformar os meus objetivos em projetos"}</button>
  <div class="projetos">${ps.map((p, i) => `<div class="projeto">
    <div class="cardhead"><textarea class="auto pnome" rows="1" data-p="d7.projetos.${i}.nome" placeholder="Nome do projeto">${esc(p.nome)}</textarea><button class="x" data-act="rm-proj" data-i="${i}" aria-label="Tirar o projeto">×</button></div>
    ${p.objetivo ? `<p class="origem">Objetivo: ${esc(p.objetivo)}</p>` : ""}
    ${p.tarefas.map((t, k) => `<div class="tarefa${t.feita ? " feita" : ""}"><input type="checkbox" data-act="feita" data-pi="${i}" data-k="${k}" ${t.feita ? "checked" : ""} aria-label="Tarefa feita"><textarea class="auto" rows="1" data-p="d7.projetos.${i}.tarefas.${k}.texto" placeholder="Tarefa ${k + 1}">${esc(t.texto)}</textarea><button class="x" data-act="rm-tarefa" data-pi="${i}" data-k="${k}" aria-label="Tirar a tarefa">×</button></div>`).join("")}
    <button class="btn small" data-act="add-tarefa" data-pi="${i}">Acrescentar uma tarefa</button>
  </div>`).join("")}</div>
  <button class="btn addrow" data-act="add-proj" style="margin-top:16px">Acrescentar um projeto</button></section>`;
}
function painelResumo() {
  const ts = todasTarefas(), feitas = ts.filter(t => t.feita).length, pts = feitas * PONTOS_TAREFA, ni = nivelDe(pts), prox = NIVEIS[ni + 1];
  const pct = prox ? Math.round(((pts - NIVEIS[ni].pts) * 100) / (prox.pts - NIVEIS[ni].pts)) : 100;
  return `<div class="cards">
    <div class="kpi"><small>Pontos</small><b>${pts}</b></div>
    <div class="kpi"><small>Nível</small><b>${esc(NIVEIS[ni].nome)}</b></div>
    <div class="kpi"><small>Tarefas feitas</small><b>${feitas}</b><span> de ${ts.length}</span></div>
    <div class="kpi"><small>Próximo nível</small><b>${prox ? esc(prox.nome) : "Completo"}</b>${prox ? `<span> faltam ${prox.pts - pts} pontos</span>` : ""}</div>
  </div><div class="prog" aria-label="Progresso até o próximo nível"><i style="width:${pct}%"></i></div>`;
}
function dia8() {
  return `<section class="sec"><h3>O seu painel</h3>${painelResumo()}<p class="note">Cada tarefa feita vale ${PONTOS_TAREFA} pontos. Marque as tarefas aqui ou nos projetos do dia 7.</p></section>
  ${projetos().map((p, i) => {
    const ts = p.tarefas.filter(t => t.texto.trim()), f = ts.filter(t => t.feita).length, pc = ts.length ? Math.round((f * 100) / ts.length) : 0;
    return `<section class="sec"><h3>${esc(p.nome || "Projeto sem nome")}</h3><div class="prog"><i style="width:${pc}%"></i></div><p class="note">${f} de ${ts.length} tarefas feitas</p>
    ${p.tarefas.map((t, k) => t.texto.trim() ? `<label class="chk ${t.feita ? "feita" : ""}"><input type="checkbox" data-act="feita" data-pi="${i}" data-k="${k}" ${t.feita ? "checked" : ""}><span>${esc(t.texto)}</span></label>` : "").join("") || `<p class="note">Este projeto ainda não tem tarefas.</p>`}</section>`;
  }).join("")}
  <section class="sec"><h3>As recompensas de cada nível</h3>
  ${NIVEIS.slice(1).map((n, k) => `<label class="lab"><span>${esc(n.nome)}, a partir de ${n.pts} pontos</span>${inp(`d8.recompensas.${k}`, "O que você vai se dar de presente?")}</label>`).join("")}</section>`;
}
function dia9() {
  return `<section class="sec"><div class="semanal">
  <div><h3 style="font-family:var(--display);font-weight:600;font-size:34px;margin:0 0 8px">A sua semana ideal</h3>
  <div class="cal"><table><thead><tr><th></th>${DIAS_SEMANA.map(d => `<th>${d}</th>`).join("")}</tr></thead><tbody>
  ${PERIODOS.map((p, b) => `<tr><th>${p}</th>${DIAS_SEMANA.map((_, a) => `<td>${ta(`d9.semana.d${a}p${b}`, 3)}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div></div>
  <div class="lembretes"><h3 style="font-family:var(--display);font-weight:600;font-size:34px;margin:0 0 8px">Lembretes</h3>
  ${S.d9.lembretes.map((l, i) => `<div class="lembrete"><div class="row">${inp(`d9.lembretes.${i}.texto`, "Um lembrete")}<button class="x" data-act="rm-lembrete" data-i="${i}" aria-label="Tirar o lembrete">×</button></div>
    <div class="dias">${l.dias.map((on, k) => `<span class="dia"><button class="circ${on ? " on" : ""}" data-act="circ" data-i="${i}" data-k="${k}" aria-pressed="${on}" aria-label="${DIAS_SEMANA[k]}"></button><small>${INICIAIS[k]}</small></span>`).join("")}</div></div>`).join("")}
  <button class="btn small addrow" data-act="add-lembrete">Acrescentar um lembrete</button>
  <p class="note">Marque os dias da semana em que cada lembrete vale.</p></div>
  </div></section>`;
}
function dia10() {
  return `<section class="sec"><h3>Quando você revisa</h3>
  <label class="lab"><span>O dia da revisão semanal</span>${sel("d10.diaRevisao", DIAS_SEMANA)}</label>
  <div class="sub">Revisão semanal</div>${lista("d10.semanal", "Um passo da revisão")}
  <div class="sub">Revisão mensal</div>${lista("d10.mensal", "Um passo da revisão")}
  <div class="sub">Revisão trimestral</div>${lista("d10.trimestral", "Um passo da revisão")}</section>
  <section class="sec"><h3>O primeiro passo de janeiro</h3>
  <label class="lab"><span>O que você vai fazer primeiro</span>${ta("d10.primeiroPasso", 2)}</label>
  <label class="lab"><span>Quando</span><input type="date" data-p="d10.dataPasso" value="${esc(S.d10.dataPasso)}" min="2027-01-01" max="2027-01-31"></label></section>
  <section class="sec"><h3>O seu plano completo</h3><p class="note">Agora a ferramenta cruza tudo o que você escreveu nos 10 dias.</p>
  <button class="btn primary" data-act="ir" data-d="10">Ver o meu 2027</button></section>`;
}
const RENDER = [dia1, dia2, dia3, diaAberto, diaAberto, dia6, dia7, dia8, dia9, dia10];

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
  <section class="sec"><h3>O ritual de revisão</h3><p>Revisão semanal: ${esc(S.d10.diaRevisao.toLowerCase())}.</p>
  ${S.d10.primeiroPasso.trim() ? `<p><b>O primeiro passo de janeiro:</b> ${esc(S.d10.primeiroPasso)}${S.d10.dataPasso ? `, em ${esc(S.d10.dataPasso.split("-").reverse().join("/"))}` : ""}.</p>` : ""}</section>
  <div class="foot noprint"><button class="btn" data-act="ir" data-d="9">Voltar para o dia 10</button>${dentroDoClaude ? "" : `<button class="btn" data-act="imprimir">Salvar em PDF</button>`}</div>`;
}

/* ---------- tela ---------- */
function concluidosN() { return DIAS.filter((_, i) => S.concluidos[i]).length; }
function renderTrail() {
  const el = $("#trail"); if (!el) return;
  el.innerHTML = DIAS.map((d, i) => {
    const ab = aberto(i), ok = S.concluidos[i];
    return `<button class="daybtn${i === cur ? " on" : ""}${ok ? " done" : ""}${ab ? "" : " locked"}${d.t ? "" : " aberto"}" data-act="ir" data-d="${i}" aria-current="${i === cur ? "page" : "false"}"><span class="n">${i + 1}</span><span class="t">${esc(tituloDia(i))}</span><span class="st">${ok ? "feito" : ab ? "" : esc(fmtData(abertura(i)).replace(" de ", " "))}</span></button>`;
  }).join("") + `<button class="daybtn final${cur === 10 ? " on" : ""}${aberto(9) ? "" : " locked"}" data-act="ir" data-d="10"><span class="n">★</span><span class="t">O meu 2027</span><span class="st"></span></button>`;
  const n = concluidosN(); $("#ovbar").style.width = n * 10 + "%"; $("#ovpct").textContent = `${n} de 10`;
}
function crescer(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
function crescerTodos() { document.querySelectorAll("textarea.auto").forEach(crescer); }
function renderSheet() {
  const sh = $("#sheet");
  requestAnimationFrame(crescerTodos);
  if (cur === 10) { sh.innerHTML = aberto(9) ? finalView() : bloqueado(9, "O meu 2027"); return; }
  const d = DIAS[cur];
  if (!aberto(cur)) { sh.innerHTML = bloqueado(cur, tituloDia(cur)); return; }
  sh.innerHTML = `<div class="eyebrow">Dia ${cur + 1}${DEMO ? "" : ` · ${esc(fmtData(abertura(cur)))}`}</div><h2 class="day">${esc(tituloDia(cur))}</h2>${d.ideia ? `<p class="ideia">${esc(d.ideia)}</p>` : ""}
  ${obraHTML(cur)}
  ${RENDER[cur]()}
  ${d.claude ? `<div class="claude"><h3>Leve para o Claude</h3><p>${esc(d.claude)}</p><p class="note">O botão copia a mensagem junto com as suas respostas deste dia. Cole no seu projeto do Claude.</p>
  <button class="btn" data-act="copiar" data-d="${cur}">Copiar para o Claude</button></div>` : ""}
  <div class="foot"><button class="btn" data-act="ir" data-d="${cur - 1}" ${cur === 0 ? "disabled" : ""}>Dia anterior</button>
  ${d.t ? `<button class="btn ${S.concluidos[cur] ? "" : "primary"}" data-act="concluir" data-d="${cur}">${S.concluidos[cur] ? "Dia concluído" : "Marcar o dia como concluído"}</button>` : ""}
  <button class="btn" data-act="ir" data-d="${cur + 1}">${cur === 9 ? "O meu 2027" : "Próximo dia"}</button></div>`;
}
function bloqueado(i, titulo) {
  return `<div class="lock"><div class="eyebrow">${titulo === "O meu 2027" ? "Abre junto com o dia 10" : `Dia ${i + 1}`}</div><p class="big">${esc(titulo)}</p><p>Este dia abre em ${esc(fmtData(abertura(i)))}.</p></div>`;
}
function renderApp() {
  $("#app").innerHTML = `<div class="wrap">
  <header class="top"><div class="brand"><small>10 dias com o Claude</small><h1>Meu 2027</h1></div>
  <div class="topright"><div class="overall"><div class="bar"><i id="ovbar"></i></div><b id="ovpct">0 de 10</b></div><span class="status" id="status">${DEMO ? "Prévia" : "Salvo"}</span>
  ${usuario ? `<button class="linkbtn" data-act="sair">Sair</button>` : ""}</div></header>
  ${DEMO ? `<p class="aviso">Você está vendo a prévia. Todos os dias estão abertos e o resumo automático não funciona.</p>` : ""}
  ${admin && !DEMO ? `<p class="aviso">Você vê todos os dias abertos porque é administradora. As participantes veem cada dia na data dele.</p>` : ""}
  <div class="layout"><nav class="trail" id="trail" aria-label="Dias"></nav><main class="sheet" id="sheet"></main></div></div>`;
  renderTrail(); renderSheet();
}
function ir(i) {
  if (i < 0 || i > 10) return;
  cur = i; confirmarProjetos = false;
  try { history.replaceState(null, "", i === 10 ? "#meu2027" : `#dia${i + 1}`); } catch (e) { }
  renderTrail(); renderSheet();
  $("#sheet").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- eventos ---------- */
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.obra && cur < 10) { const id = obraId(cur); OBRA[id] = { ...(OBRA[id] || {}), [t.dataset.obra]: t.value }; mudouObra(id); return; }
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
  if (t.dataset && t.dataset.act === "feita") {
    const tk = projetos()[+t.dataset.pi]?.tarefas[+t.dataset.k];
    if (tk) { tk.feita = t.checked; mudou(); renderSheet(); if (t.checked) toast(`Mais ${PONTOS_TAREFA} pontos`); }
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
    case "add-tarefa": projetos()[+b.dataset.pi].tarefas.push(novaTarefa()); break;
    case "rm-tarefa": projetos()[+b.dataset.pi].tarefas.splice(+b.dataset.k, 1); break;
    case "add-lembrete": S.d9.lembretes.push(novoLembrete()); break;
    case "rm-lembrete": S.d9.lembretes.splice(i, 1); if (!S.d9.lembretes.length) S.d9.lembretes.push(novoLembrete()); break;
    case "circ": { const l = S.d9.lembretes[i]; l.dias[+b.dataset.k] = !l.dias[+b.dataset.k]; b.classList.toggle("on"); b.setAttribute("aria-pressed", l.dias[+b.dataset.k]); mudou(); return; }
    case "concluir": S.concluidos[+b.dataset.d] = !S.concluidos[+b.dataset.d]; mudou(); renderTrail(); renderSheet(); if (S.concluidos[+b.dataset.d]) toast("Dia concluído"); return;
    case "copiar-obra": copiar(textoObra()); return;
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
    const j = await chamarClaude(tipo, tipo === "dia1" ? textoDia(0) : textoTudo());
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
    S.d7.projetos = (os.length ? os : [{ titulo: "" }]).map(o => novoProjeto(o.titulo ? `Projeto: ${o.titulo}` : "", o.titulo));
    mudou(); renderSheet(); toast("Na prévia, os projetos aparecem vazios. Com o login ativado, o Claude preenche as tarefas.");
    return;
  }
  if (!S.d6.objetivos.some(o => o.titulo.trim())) { toast("Escreva pelo menos um objetivo no dia 6."); return; }
  btn.disabled = true; btn.textContent = "O Claude está montando os projetos";
  try {
    const j = await chamarClaude("projetos", textoDia(5));
    const lst = Array.isArray(j.projetos) ? j.projetos : [];
    if (!lst.length) throw new Error("O Claude não devolveu projetos. Tente de novo.");
    S.d7.projetos = lst.map(p => {
      const ts = (Array.isArray(p.tarefas) ? p.tarefas : []).map(t => ({ id: novoId(), texto: String(t), feita: false }));
      while (ts.length < 3) ts.push(novaTarefa());
      return { id: novoId(), nome: String(p.nome || ""), objetivo: String(p.objetivo || ""), tarefas: ts };
    });
    pendente = true; await salvar(); renderSheet();
  } catch (err) { toast(err.message); renderSheet(); }
}

/* ---------- início ---------- */
function diaInicial() {
  const m = /^#dia(\d+)$/.exec(location.hash || "");
  if (m) { const i = +m[1] - 1; if (i >= 0 && i < 10) return i; }
  if (location.hash === "#meu2027") return 10;
  let ult = 0;
  for (let i = 0; i < 10; i++) if (aberto(i)) ult = i;
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
    usuario = u; admin = (CFG.admins || []).map(x => x.toLowerCase()).includes((u.email || "").toLowerCase());
    try {
      const snap = await fs.getDoc(fs.doc(db, "participantes", u.uid));
      if (snap.exists() && snap.data().dados) S = mesclar(JSON.parse(snap.data().dados));
    } catch (e) { console.error(e); toast("Não consegui carregar as suas respostas. Recarregue a página."); }
    cur = diaInicial(); renderApp(); if (admin) iniciarObra();
  });
}
iniciar();
