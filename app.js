/* Meu 2027: 10 dias com o Claude para fechar 2026 e planejar 2027 */
const CFG = window.MEU2027_CONFIG || {};
const params = new URLSearchParams(location.search);
const DEMO = params.has("previa") || !CFG.firebase || !CFG.firebase.apiKey;
const LS_KEY = "meu2027-previa-v1";
const INICIO = CFG.inicio || "2026-12-22";
const DIA_MS = 86400000;

const $ = (s, el = document) => el.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const novoId = () => "i" + Math.random().toString(36).slice(2, 10);
const CORES = ["#8a4a64", "#5D6C7E", "#b5803a", "#6f8a6a", "#9a6fb0", "#c0606e", "#3f7f8c", "#a38a4a", "#7a5c4a", "#4f6aa3", "#b06a8f", "#5f8f7f"];

/* ---------- conteúdo ---------- */
const AREAS_PADRAO = ["Trabalho e carreira", "Dinheiro", "Saúde e corpo", "Mente e emoções", "Família", "Relacionamentos e amizades", "Lazer e diversão", "Estudos e crescimento", "Casa", "Espiritualidade"];
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const PERIODOS = ["Manhã", "Tarde", "Noite"];
const TIPOS = { faco: "Eu faço", delego: "Delego", automatizo: "Automatizo" };
const NIVEIS = [
  { pts: 0, nome: "Semente" },
  { pts: 50, nome: "Broto" },
  { pts: 150, nome: "Muda" },
  { pts: 300, nome: "Árvore" },
  { pts: 500, nome: "Floresta" }
];
const PONTOS_TAREFA = 10;

const DIAS = [
  { t: "Quem sou eu hoje", ideia: "Antes de planejar 2027, é preciso saber onde você está. Escreva como está cada área da sua vida hoje, do jeito que sair. Você pode criar partes dentro de cada área e também acrescentar ou tirar áreas.", claude: "Leia o meu retrato de quem eu sou hoje e me faça 3 perguntas sobre o que ficou faltando." },
  { t: "A retrospectiva de 2026", ideia: "Olhar para 2026 com honestidade: o que deu certo, o que não deu, o que você aprendeu e do que você se orgulha.", claude: "A partir da minha retrospectiva de 2026, me ajude a enxergar os padrões que se repetem." },
  { t: "A roda da vida", ideia: "Dar uma nota de 0 a 10 para cada área da sua vida hoje. Clique na roda ou escolha a nota na lista e conte o motivo de cada nota.", claude: "Olhando as notas da minha roda da vida, quais áreas estão puxando as outras para baixo?" },
  { t: "Onde dói", ideia: "Escolher as 3 áreas que mais pedem atenção em 2027. As áreas com as notas mais baixas aparecem primeiro.", claude: "Me ajude a entender a raiz de cada uma das 3 dores que eu escolhi." },
  { t: "A visão de 2027", ideia: "Imaginar que é dezembro de 2027 e escrever uma carta para você mesma contando como foi o seu ano.", claude: "Leia a minha carta de 2027 e me diga o que ela revela sobre o que eu mais quero." },
  { t: "Os objetivos", ideia: "Transformar a visão em 3 a 5 objetivos claros, ligados às áreas que mais pedem atenção.", claude: "Revise os meus objetivos e me diga se algum está vago demais para eu saber se cheguei lá." },
  { t: "Dos objetivos às microtarefas", ideia: "Quebrar cada objetivo em etapas por trimestre e em tarefas pequenas, decidindo o que você faz, o que delega e o que automatiza.", claude: "Pegue as minhas tarefas marcadas como Delego e Automatizo e me ajude a montar o primeiro passo de cada uma." },
  { t: "O painel do ano", ideia: "O painel do ano reúne as suas tarefas, soma pontos a cada tarefa feita e mostra o seu nível. Defina uma recompensa para cada nível que você alcançar.", claude: "Construa comigo uma versão deste painel do ano do meu jeito, com as cores e os níveis que eu escolher." },
  { t: "Hábitos e semana ideal", ideia: "Escolher os hábitos que sustentam os seus objetivos e desenhar a sua semana ideal de 2027.", claude: "Monte comigo lembretes para os meus hábitos dentro da minha semana ideal." },
  { t: "O ritual de revisão", ideia: "Combinar com você mesma quando e como vai revisar o plano, para ele continuar vivo depois de janeiro, e escolher o primeiro passo.", claude: "Transforme o meu ritual de revisão num roteiro que eu possa repetir toda semana." }
];

const PERGUNTAS_VISAO = [
  "Como você acorda num dia comum de dezembro de 2027?",
  "O que mudou no seu trabalho ou nos seus estudos?",
  "Como está o seu dinheiro?",
  "Como você cuida do seu corpo e da sua cabeça?",
  "Quem está perto de você?",
  "Do que você mais se orgulha em 2027?"
];

/* ---------- estado ---------- */
const novoObjetivo = () => ({ id: novoId(), titulo: "", area: "", sinal: "", porque: "", trimestre: "" });
const novoHabito = () => ({ id: novoId(), nome: "", area: "", freq: "Todos os dias", horario: "" });

function estadoInicial() {
  return {
    d1: { areas: AREAS_PADRAO.map(n => ({ id: novoId(), nome: n, texto: "", subs: [] })) },
    d2: { certo: [""], errado: [""], aprendi: [""], orgulho: [""], palavra: "", desabafo: "" },
    d3: { notas: {}, motivos: {} },
    d4: { escolhidas: [], detalhes: {} },
    d5: { carta: "", palavra: "", frases: ["", "", ""] },
    d6: { objetivos: [novoObjetivo(), novoObjetivo(), novoObjetivo()] },
    d7: { plano: {} },
    d8: { recompensas: ["", "", "", ""] },
    d9: { habitos: [novoHabito()], semana: {} },
    d10: {
      diaRevisao: "Domingo",
      semanal: ["Olhar o painel do ano e marcar as tarefas feitas", "Escolher as 3 tarefas mais importantes da semana", "Conferir os hábitos da semana que passou"],
      mensal: ["Rever o progresso de cada objetivo", "Ajustar as tarefas do mês seguinte", "Comemorar uma conquista do mês"],
      trimestral: ["Refazer a roda da vida", "Decidir se algum objetivo precisa mudar", "Planejar as etapas do próximo trimestre"],
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
let timer = null, salvando = false, pendente = false;

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

/* ---------- datas ---------- */
function abertura(i) { return new Date(new Date(`${INICIO}T00:00:00-03:00`).getTime() + i * DIA_MS); }
function aberto(i) { return DEMO || admin || Date.now() >= abertura(Math.min(i, 9)).getTime(); }
const fmtData = d => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

/* ---------- ajudantes de dados ---------- */
const areas = () => S.d1.areas.filter(a => a.nome.trim());
const areaNome = id => (S.d1.areas.find(a => a.id === id) || {}).nome || "";
const nota = id => { const v = S.d3.notas[id]; return v === "" || v == null ? null : Number(v); };
function plano(id) {
  if (!S.d7.plano[id]) S.d7.plano[id] = { etapas: ["", "", "", ""], tarefas: [] };
  return S.d7.plano[id];
}
const objetivos = () => S.d6.objetivos;
function todasTarefas() {
  const out = [];
  objetivos().forEach(o => (plano(o.id).tarefas || []).forEach(t => { if (t.texto.trim()) out.push({ ...t, obj: o }); }));
  return out;
}
function nivelDe(pts) {
  let i = 0;
  NIVEIS.forEach((n, k) => { if (pts >= n.pts) i = k; });
  return i;
}

/* ---------- salvar ---------- */
function mudou() {
  pendente = true;
  status(DEMO ? "Salvo neste navegador" : "Salvando");
  clearTimeout(timer);
  timer = setTimeout(salvar, 900);
}
async function salvar() {
  if (!pendente) return;
  if (DEMO) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { }
    pendente = false; return;
  }
  if (salvando) { clearTimeout(timer); timer = setTimeout(salvar, 800); return; }
  salvando = true; pendente = false;
  try {
    await fs.setDoc(fs.doc(db, "participantes", usuario.uid), {
      dados: JSON.stringify(S), nome: usuario.displayName || "", email: usuario.email || "", atualizado: fs.serverTimestamp()
    }, { merge: true });
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
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 2600); }

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
const areaOpts = () => areas().map(a => [a.id, a.nome]);

function arco(cx, cy, r1, r2, a1, a2) {
  const p = (r, a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
  const g = a2 - a1 > Math.PI ? 1 : 0;
  const [x1, y1] = p(r2, a1), [x2, y2] = p(r2, a2), [x3, y3] = p(r1, a2), [x4, y4] = p(r1, a1);
  return `M${x1} ${y1}A${r2} ${r2} 0 ${g} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${g} 0 ${x4} ${y4}Z`;
}
function rodaSVG(interativa) {
  const as = areas();
  if (as.length < 3) return `<p class="note">Escreva pelo menos 3 áreas no dia 1 para desenhar a roda.</p>`;
  const W = 480, c = W / 2, R = 150, r0 = 16, n = as.length, ang = (2 * Math.PI) / n, ini = -Math.PI / 2;
  const rk = k => r0 + ((R - r0) * k) / 10;
  let segs = "", labels = "", grade = "";
  for (let k = 2; k <= 10; k += 2) grade += `<circle cx="${c}" cy="${c}" r="${rk(k)}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  as.forEach((a, i) => {
    const a1 = ini + i * ang + 0.012, a2 = ini + (i + 1) * ang - 0.012, v = nota(a.id) ?? 0, cor = CORES[i % CORES.length];
    for (let k = 1; k <= 10; k++) {
      const cheio = k <= v;
      segs += `<path class="${interativa ? "seg" : ""}" d="${arco(c, c, rk(k - 1) + 0.6, rk(k) - 0.6, a1, a2)}" fill="${cheio ? cor : "var(--soft)"}" ${interativa ? `data-act="nota" data-a="${a.id}" data-v="${k}"` : ""}><title>${esc(a.nome)}: ${k}</title></path>`;
    }
    const am = ini + (i + 0.5) * ang, lx = c + (R + 14) * Math.cos(am), ly = c + (R + 14) * Math.sin(am);
    const anchor = Math.abs(Math.cos(am)) < 0.2 ? "middle" : Math.cos(am) > 0 ? "start" : "end";
    const curto = a.nome.split(" ")[0].slice(0, 15);
    labels += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-family="Sofia Sans Condensed, Arial Narrow, sans-serif" font-size="16" fill="var(--ink)">${esc(curto)} <tspan fill="var(--muted)">${nota(a.id) ?? "–"}</tspan></text>`;
  });
  return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Roda da vida">${grade}${segs}${labels}</svg>`;
}

function resumoHTML(texto) {
  return texto.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
    if (/^#{1,3}\s/.test(l)) return `<h3>${esc(l.replace(/^#{1,3}\s*/, ""))}</h3>`;
    return `<p>${esc(l.replace(/\*\*/g, ""))}</p>`;
  }).join("");
}

/* ---------- textos para o Claude e para o resumo ---------- */
function textoDia(i) {
  const L = [`DIA ${i + 1}. ${DIAS[i].t.toUpperCase()}`];
  const v = s => (s || "").trim() || "(em branco)";
  if (i === 0) S.d1.areas.forEach(a => {
    if (!a.nome.trim()) return;
    L.push(`\n${a.nome}: ${v(a.texto)}`);
    a.subs.forEach(s => { if (s.nome.trim() || s.texto.trim()) L.push(`  ${s.nome || "Parte"}: ${v(s.texto)}`); });
  });
  if (i === 1) {
    [["certo", "O que deu certo em 2026"], ["errado", "O que não deu certo"], ["aprendi", "O que eu aprendi"], ["orgulho", "Do que eu me orgulho"]].forEach(([k, t]) => {
      const it = S.d2[k].filter(x => x.trim());
      L.push(`\n${t}:`); L.push(it.length ? it.map(x => `- ${x}`).join("\n") : "(em branco)");
    });
    L.push(`\nA palavra que resume 2026: ${v(S.d2.palavra)}`, `\nDesabafo: ${v(S.d2.desabafo)}`);
  }
  if (i === 2) areas().forEach(a => L.push(`${a.nome}: nota ${nota(a.id) ?? "sem nota"}. Motivo: ${v(S.d3.motivos[a.id])}`));
  if (i === 3) S.d4.escolhidas.forEach(id => {
    const d = S.d4.detalhes[id] || {};
    L.push(`\n${areaNome(id)} (nota ${nota(id) ?? "sem nota"})`, `O que dói: ${v(d.dor)}`, `Como eu quero que esteja no fim de 2027: ${v(d.quero)}`, `Nota que eu quero alcançar: ${d.meta || "sem meta"}`);
  });
  if (i === 4) {
    L.push(`Palavra de 2027: ${v(S.d5.palavra)}`, `\nCarta de dezembro de 2027:\n${v(S.d5.carta)}`);
    const fr = S.d5.frases.filter(x => x.trim());
    if (fr.length) L.push(`\nFrases que eu quero dizer em dezembro de 2027:\n${fr.map(x => `- ${x}`).join("\n")}`);
  }
  if (i === 5) objetivos().forEach((o, k) => {
    if (!o.titulo.trim()) return;
    L.push(`\nObjetivo ${k + 1}: ${o.titulo}`, `Área: ${areaNome(o.area) || "sem área"}`, `Como vou saber que consegui: ${v(o.sinal)}`, `Por que importa: ${v(o.porque)}`, `Prazo: ${o.trimestre ? o.trimestre + "º trimestre" : "sem prazo"}`);
  });
  if (i === 6) objetivos().forEach(o => {
    if (!o.titulo.trim()) return;
    const p = plano(o.id);
    L.push(`\n${o.titulo}`);
    p.etapas.forEach((e, k) => L.push(`  ${k + 1}º trimestre: ${v(e)}`));
    p.tarefas.filter(t => t.texto.trim()).forEach(t => L.push(`  - ${t.texto} (${TIPOS[t.tipo] || "Eu faço"}, ${t.tri || "?"}º trimestre)`));
  });
  if (i === 7) {
    const ts = todasTarefas(), feitas = ts.filter(t => t.feita).length;
    L.push(`Tarefas: ${ts.length}. Feitas: ${feitas}. Pontos: ${feitas * PONTOS_TAREFA}.`);
    NIVEIS.slice(1).forEach((n, k) => L.push(`Recompensa do nível ${n.nome}: ${v(S.d8.recompensas[k])}`));
  }
  if (i === 8) {
    S.d9.habitos.filter(h => h.nome.trim()).forEach(h => L.push(`- ${h.nome} (${areaNome(h.area) || "sem área"}, ${h.freq}${h.horario ? ", " + h.horario : ""})`));
    L.push("\nSemana ideal:");
    DIAS_SEMANA.forEach((d, a) => {
      const ps = PERIODOS.map((p, b) => { const t = (S.d9.semana[`d${a}p${b}`] || "").trim(); return t ? `${p}: ${t}` : ""; }).filter(Boolean);
      if (ps.length) L.push(`${d}: ${ps.join("; ")}`);
    });
  }
  if (i === 9) {
    L.push(`Dia da revisão semanal: ${S.d10.diaRevisao}`);
    [["semanal", "Revisão semanal"], ["mensal", "Revisão mensal"], ["trimestral", "Revisão trimestral"]].forEach(([k, t]) => L.push(`\n${t}:\n${S.d10[k].filter(x => x.trim()).map(x => `- ${x}`).join("\n")}`));
    L.push(`\nPrimeiro passo de janeiro: ${v(S.d10.primeiroPasso)}${S.d10.dataPasso ? ` (${S.d10.dataPasso.split("-").reverse().join("/")})` : ""}`);
  }
  return L.join("\n");
}
const textoTudo = () => DIAS.map((_, i) => textoDia(i)).join("\n\n");

/* ---------- dias ---------- */
function dia1() {
  return `<section class="sec"><h3>As áreas da sua vida</h3>
  <p class="note">Escreva como cada área está hoje. Se uma área tem partes diferentes, como o trabalho na empresa e o trabalho por fora, crie uma parte para cada uma.</p>
  ${S.d1.areas.map((a, i) => `<div class="card">
    <div class="cardhead">${inp(`d1.areas.${i}.nome`, "Nome da área")}<button class="x" data-act="rm-area" data-i="${i}" aria-label="Tirar a área">×</button></div>
    ${ta(`d1.areas.${i}.texto`, 3, "Como esta área está hoje?")}
    ${a.subs.map((s, j) => `<div class="subcard"><div class="cardhead">${inp(`d1.areas.${i}.subs.${j}.nome`, "Nome da parte")}<button class="x" data-act="rm-sub" data-i="${i}" data-j="${j}" aria-label="Tirar a parte">×</button></div>${ta(`d1.areas.${i}.subs.${j}.texto`, 2, "Como esta parte está hoje?")}</div>`).join("")}
    <button class="btn small addrow" data-act="add-sub" data-i="${i}">Acrescentar uma parte</button>
  </div>`).join("")}
  <button class="btn" data-act="add-area">Acrescentar uma área</button></section>
  <section class="sec"><h3>O resumo de quem você é hoje</h3>
  <p class="note">Quando terminar de escrever, peça o resumo. Ele é feito por inteligência artificial a partir do que você escreveu e fica guardado aqui.</p>
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
function dia3() {
  return `<section class="sec"><h3>A sua roda da vida</h3>
  <div class="roda"><div id="rodabox">${rodaSVG(true)}</div>
  <div class="lista">${areas().map((a, i) => `<div class="notarow"><span class="sw" style="background:${CORES[i % CORES.length]}"></span><span>${esc(a.nome)}</span>${sel(`d3.notas.${a.id}`, Array.from({ length: 11 }, (_, k) => [k, String(k)]), "Nota")}</div>`).join("")}</div></div></section>
  <section class="sec"><h3>O motivo de cada nota</h3>
  ${areas().map(a => `<label class="lab"><span>${esc(a.nome)}</span>${ta(`d3.motivos.${a.id}`, 2, "Por que esta nota?")}</label>`).join("")}</section>`;
}
function dia4() {
  const ord = areas().slice().sort((a, b) => (nota(a.id) ?? 11) - (nota(b.id) ?? 11));
  return `<section class="sec"><h3>Escolha 3 áreas</h3>
  ${ord.map(a => `<label class="chk"><input type="checkbox" data-act="escolher" data-a="${a.id}" ${S.d4.escolhidas.includes(a.id) ? "checked" : ""}><span>${esc(a.nome)} <span class="tag">nota ${nota(a.id) ?? "sem nota"}</span></span></label>`).join("")}</section>
  ${S.d4.escolhidas.map(id => `<section class="sec"><h3>${esc(areaNome(id))}</h3>
    <label class="lab"><span>O que dói hoje</span>${ta(`d4.detalhes.${id}.dor`, 3)}</label>
    <label class="lab"><span>Como eu quero que esteja no fim de 2027</span>${ta(`d4.detalhes.${id}.quero`, 3)}</label>
    <label class="lab"><span>A nota que eu quero alcançar</span>${sel(`d4.detalhes.${id}.meta`, Array.from({ length: 11 }, (_, k) => [k, String(k)]), "Escolha")}</label></section>`).join("")}`;
}
function dia5() {
  return `<section class="sec"><h3>Perguntas para guiar a carta</h3><ul>${PERGUNTAS_VISAO.map(p => `<li>${esc(p)}</li>`).join("")}</ul></section>
  <section class="sec"><h3>A sua carta de dezembro de 2027</h3>
  ${ta("d5.carta", 12, "Querida eu, 2027 foi o ano em que...")}
  <label class="lab"><span>A palavra de 2027</span>${inp("d5.palavra")}</label>
  <div class="sub">3 frases que eu quero dizer em dezembro de 2027</div>
  ${S.d5.frases.map((_, k) => `<div class="row">${inp(`d5.frases.${k}`, `Frase ${k + 1}`)}</div>`).join("")}</section>`;
}
function dia6() {
  const esc4 = S.d4.escolhidas.map(areaNome).filter(Boolean);
  return `<section class="sec"><h3>De 3 a 5 objetivos</h3>
  ${esc4.length ? `<p class="note">As áreas que você escolheu no dia 4: ${esc(esc4.join(", "))}.</p>` : ""}
  ${objetivos().map((o, i) => `<div class="card">
    <div class="cardhead">${inp(`d6.objetivos.${i}.titulo`, `Objetivo ${i + 1}`)}${objetivos().length > 1 ? `<button class="x" data-act="rm-obj" data-i="${i}" aria-label="Tirar o objetivo">×</button>` : ""}</div>
    <div class="grid2"><label class="lab"><span>Área</span>${sel(`d6.objetivos.${i}.area`, areaOpts(), "Escolha a área")}</label>
    <label class="lab"><span>Prazo</span>${sel(`d6.objetivos.${i}.trimestre`, [["1", "1º trimestre"], ["2", "2º trimestre"], ["3", "3º trimestre"], ["4", "4º trimestre"]], "Escolha o prazo")}</label></div>
    <label class="lab"><span>Como eu vou saber que consegui</span>${ta(`d6.objetivos.${i}.sinal`, 2)}</label>
    <label class="lab"><span>Por que isso importa para mim</span>${ta(`d6.objetivos.${i}.porque`, 2)}</label>
  </div>`).join("")}
  ${objetivos().length < 5 ? `<button class="btn" data-act="add-obj">Acrescentar um objetivo</button>` : ""}</section>`;
}
function dia7() {
  const os = objetivos().filter(o => o.titulo.trim());
  if (!os.length) return `<section class="sec"><p class="note">Escreva pelo menos um objetivo no dia 6 para quebrar em tarefas.</p></section>`;
  return os.map(o => {
    const p = plano(o.id), oi = objetivos().indexOf(o);
    return `<section class="sec"><h3>${esc(o.titulo)}</h3>
    <div class="sub">As etapas por trimestre</div>
    <div class="grid2">${p.etapas.map((_, k) => `<label class="lab"><span>${k + 1}º trimestre</span>${inp(`d7.plano.${o.id}.etapas.${k}`, "O que precisa estar pronto")}</label>`).join("")}</div>
    <div class="sub">As microtarefas</div>
    ${p.tarefas.map((t, k) => `<div class="tarefa">${inp(`d7.plano.${o.id}.tarefas.${k}.texto`, "Uma tarefa pequena")}
      ${sel(`d7.plano.${o.id}.tarefas.${k}.tipo`, Object.entries(TIPOS))}
      ${sel(`d7.plano.${o.id}.tarefas.${k}.tri`, [["1", "1º trimestre"], ["2", "2º trimestre"], ["3", "3º trimestre"], ["4", "4º trimestre"]])}
      <button class="x" data-act="rm-tarefa" data-o="${o.id}" data-i="${k}" aria-label="Tirar a tarefa">×</button></div>`).join("")}
    <button class="btn small addrow" data-act="add-tarefa" data-o="${o.id}" data-oi="${oi}">Acrescentar uma tarefa</button></section>`;
  }).join("");
}
function painelResumo() {
  const ts = todasTarefas(), feitas = ts.filter(t => t.feita).length, pts = feitas * PONTOS_TAREFA, ni = nivelDe(pts);
  const prox = NIVEIS[ni + 1];
  const pct = prox ? Math.round(((pts - NIVEIS[ni].pts) * 100) / (prox.pts - NIVEIS[ni].pts)) : 100;
  return `<div class="cards">
    <div class="kpi"><small>Pontos</small><b>${pts}</b></div>
    <div class="kpi"><small>Nível</small><b>${esc(NIVEIS[ni].nome)}</b></div>
    <div class="kpi"><small>Tarefas feitas</small><b>${feitas}</b><span> de ${ts.length}</span></div>
    <div class="kpi"><small>Próximo nível</small><b>${prox ? esc(prox.nome) : "Completo"}</b>${prox ? `<span> faltam ${prox.pts - pts} pontos</span>` : ""}</div>
  </div><div class="prog" aria-label="Progresso até o próximo nível"><i style="width:${pct}%"></i></div>`;
}
function dia8() {
  const os = objetivos().filter(o => o.titulo.trim());
  return `<section class="sec"><h3>O seu painel</h3><div id="painelbox">${painelResumo()}</div>
  <p class="note">Cada tarefa feita vale ${PONTOS_TAREFA} pontos. Marque aqui as tarefas ao longo do ano.</p></section>
  ${os.map(o => {
    const ts = plano(o.id).tarefas.filter(t => t.texto.trim()), f = ts.filter(t => t.feita).length, pc = ts.length ? Math.round((f * 100) / ts.length) : 0;
    return `<section class="sec"><h3>${esc(o.titulo)}</h3><div class="prog"><i style="width:${pc}%"></i></div><p class="note">${f} de ${ts.length} tarefas feitas</p>
    ${plano(o.id).tarefas.map((t, k) => t.texto.trim() ? `<label class="chk ${t.feita ? "feita" : ""}"><input type="checkbox" data-act="feita" data-o="${o.id}" data-i="${k}" ${t.feita ? "checked" : ""}><span>${esc(t.texto)}<span class="tag">${esc(TIPOS[t.tipo] || "Eu faço")}</span><span class="tag">${esc(t.tri || "?")}º tri</span></span></label>` : "").join("") || `<p class="note">Este objetivo ainda não tem tarefas. Acrescente no dia 7.</p>`}</section>`;
  }).join("")}
  <section class="sec"><h3>As recompensas de cada nível</h3>
  ${NIVEIS.slice(1).map((n, k) => `<label class="lab"><span>${esc(n.nome)}, a partir de ${n.pts} pontos</span>${inp(`d8.recompensas.${k}`, "O que você vai se dar de presente?")}</label>`).join("")}</section>`;
}
function dia9() {
  return `<section class="sec"><h3>Os hábitos de 2027</h3>
  ${S.d9.habitos.map((h, i) => `<div class="card"><div class="cardhead">${inp(`d9.habitos.${i}.nome`, "Um hábito")}<button class="x" data-act="rm-habito" data-i="${i}" aria-label="Tirar o hábito">×</button></div>
    <div class="grid2"><label class="lab"><span>Área</span>${sel(`d9.habitos.${i}.area`, areaOpts(), "Escolha a área")}</label>
    <label class="lab"><span>Frequência</span>${sel(`d9.habitos.${i}.freq`, ["Todos os dias", "Dias úteis", "3 vezes por semana", "1 vez por semana"])}</label>
    <label class="lab"><span>Quando</span>${inp(`d9.habitos.${i}.horario`, "Por exemplo, depois do café")}</label></div></div>`).join("")}
  <button class="btn" data-act="add-habito">Acrescentar um hábito</button></section>
  <section class="sec"><h3>A sua semana ideal</h3><p class="note">Escreva o que acontece em cada período, de forma curta.</p>
  <div class="semana"><table><thead><tr><th></th>${DIAS_SEMANA.map(d => `<th>${d}</th>`).join("")}</tr></thead><tbody>
  ${PERIODOS.map((p, b) => `<tr><th>${p}</th>${DIAS_SEMANA.map((_, a) => `<td>${ta(`d9.semana.d${a}p${b}`, 2)}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div></section>`;
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
const RENDER = [dia1, dia2, dia3, dia4, dia5, dia6, dia7, dia8, dia9, dia10];

function finalView() {
  const os = objetivos().filter(o => o.titulo.trim());
  const ts = todasTarefas();
  const dores = S.d4.escolhidas.map(areaNome).filter(Boolean);
  const sem = areas().filter(a => nota(a.id) != null);
  const media = sem.length ? (sem.reduce((s, a) => s + nota(a.id), 0) / sem.length).toFixed(1).replace(".", ",") : "–";
  return `<div class="eyebrow">O resultado dos 10 dias</div><h2 class="day">O meu 2027</h2>
  <div class="cards">
    <div class="kpi"><small>Nota média da roda</small><b>${media}</b></div>
    <div class="kpi"><small>Objetivos</small><b>${os.length}</b></div>
    <div class="kpi"><small>Microtarefas</small><b>${ts.length}</b></div>
    <div class="kpi"><small>Hábitos</small><b>${S.d9.habitos.filter(h => h.nome.trim()).length}</b></div>
  </div>
  <section class="sec"><h3>A análise do seu ano</h3>
  <p class="note">A análise é feita por inteligência artificial, cruzando quem você é hoje, a retrospectiva, a roda da vida, as dores, a visão, os objetivos, as tarefas, os hábitos e o ritual de revisão.</p>
  ${S.resumos.final ? `<div class="resumo">${resumoHTML(S.resumos.final)}</div>` : ""}
  <div class="noprint"><button class="btn primary" data-act="resumo" data-tipo="final">${S.resumos.final ? "Gerar a análise de novo" : "Gerar a análise do meu 2027"}</button></div></section>
  ${S.resumos.dia1 ? `<section class="sec"><h3>Quem eu sou hoje</h3><div class="resumo">${resumoHTML(S.resumos.dia1)}</div></section>` : ""}
  <section class="sec"><h3>A roda da vida</h3><div class="roda">${rodaSVG(false)}</div>
  ${dores.length ? `<p><b>As áreas que mais pedem atenção:</b> ${esc(dores.join(", "))}.</p>` : ""}</section>
  ${S.d5.palavra.trim() || S.d5.carta.trim() ? `<section class="sec"><h3>A visão</h3>${S.d5.palavra.trim() ? `<p><b>A palavra de 2027:</b> ${esc(S.d5.palavra)}</p>` : ""}${S.d5.carta.trim() ? `<div class="resumo">${resumoHTML(S.d5.carta)}</div>` : ""}</section>` : ""}
  ${os.length ? `<section class="sec"><h3>Os objetivos e as etapas</h3>${os.map(o => `<div class="card"><b>${esc(o.titulo)}</b>${o.area ? `<span class="tag">${esc(areaNome(o.area))}</span>` : ""}
    <ul>${plano(o.id).etapas.map((e, k) => e.trim() ? `<li>${k + 1}º trimestre: ${esc(e)}</li>` : "").join("")}</ul></div>`).join("")}</section>` : ""}
  ${S.d9.habitos.some(h => h.nome.trim()) ? `<section class="sec"><h3>Os hábitos</h3><ul>${S.d9.habitos.filter(h => h.nome.trim()).map(h => `<li>${esc(h.nome)}, ${esc(h.freq.toLowerCase())}${h.horario ? `, ${esc(h.horario)}` : ""}</li>`).join("")}</ul></section>` : ""}
  <section class="sec"><h3>O ritual de revisão</h3><p>Revisão semanal: ${esc(S.d10.diaRevisao.toLowerCase())}.</p>
  ${S.d10.primeiroPasso.trim() ? `<p><b>O primeiro passo de janeiro:</b> ${esc(S.d10.primeiroPasso)}${S.d10.dataPasso ? `, em ${esc(S.d10.dataPasso.split("-").reverse().join("/"))}` : ""}.</p>` : ""}</section>
  <div class="foot noprint"><button class="btn" data-act="ir" data-d="9">Voltar para o dia 10</button><button class="btn" data-act="imprimir">Salvar em PDF</button></div>`;
}

/* ---------- tela ---------- */
function concluidosN() { return DIAS.filter((_, i) => S.concluidos[i]).length; }
function renderTrail() {
  const el = $("#trail"); if (!el) return;
  el.innerHTML = DIAS.map((d, i) => {
    const ab = aberto(i), ok = S.concluidos[i];
    return `<button class="daybtn${i === cur ? " on" : ""}${ok ? " done" : ""}${ab ? "" : " locked"}" data-act="ir" data-d="${i}" aria-current="${i === cur ? "page" : "false"}"><span class="n">${i + 1}</span><span class="t">${esc(d.t)}</span><span class="st">${ok ? "feito" : ab ? "" : esc(fmtData(abertura(i)).replace(" de ", " "))}</span></button>`;
  }).join("") + `<button class="daybtn final${cur === 10 ? " on" : ""}${aberto(9) ? "" : " locked"}" data-act="ir" data-d="10"><span class="n">★</span><span class="t">O meu 2027</span><span class="st"></span></button>`;
  const n = concluidosN();
  $("#ovbar").style.width = n * 10 + "%"; $("#ovpct").textContent = `${n} de 10`;
}
function renderSheet() {
  const sh = $("#sheet");
  if (cur === 10) {
    sh.innerHTML = aberto(9) ? finalView() : bloqueado(9, "O meu 2027");
    return;
  }
  const d = DIAS[cur];
  if (!aberto(cur)) { sh.innerHTML = bloqueado(cur, d.t); return; }
  sh.innerHTML = `<div class="eyebrow">Dia ${cur + 1}${DEMO ? "" : ` · ${esc(fmtData(abertura(cur)))}`}</div><h2 class="day">${esc(d.t)}</h2><p class="ideia">${esc(d.ideia)}</p>
  ${RENDER[cur]()}
  <div class="claude"><h3>Leve para o Claude</h3><p>${esc(d.claude)}</p><p class="note">O botão copia a mensagem junto com as suas respostas deste dia. Cole no seu projeto do Claude.</p>
  <button class="btn" data-act="copiar" data-d="${cur}">Copiar para o Claude</button></div>
  <div class="foot"><button class="btn" data-act="ir" data-d="${cur - 1}" ${cur === 0 ? "disabled" : ""}>Dia anterior</button>
  <button class="btn ${S.concluidos[cur] ? "" : "primary"}" data-act="concluir" data-d="${cur}">${S.concluidos[cur] ? "Dia concluído" : "Marcar o dia como concluído"}</button>
  <button class="btn" data-act="ir" data-d="${cur + 1}">${cur === 9 ? "O meu 2027" : "Próximo dia"}</button></div>`;
}
function bloqueado(i, titulo) {
  return `<div class="lock"><div class="eyebrow">${i === 9 && titulo === "O meu 2027" ? "Abre junto com o dia 10" : `Dia ${i + 1}`}</div><p class="big">${esc(titulo)}</p><p>Este dia abre em ${esc(fmtData(abertura(i)))}.</p></div>`;
}
function renderApp() {
  $("#app").innerHTML = `<div class="wrap">
  <header class="top"><div class="brand"><small>10 dias com o Claude</small><h1>Meu 2027</h1></div>
  <div class="topright"><div class="overall"><div class="bar"><i id="ovbar"></i></div><b id="ovpct">0 de 10</b></div><span class="status" id="status">${DEMO ? "Prévia" : "Salvo"}</span>
  ${usuario ? `<button class="linkbtn" data-act="sair">Sair</button>` : ""}</div></header>
  ${DEMO ? `<p class="aviso">Você está vendo a prévia. Todos os dias estão abertos, as respostas ficam só neste navegador e o resumo automático não funciona.</p>` : ""}
  ${admin && !DEMO ? `<p class="aviso">Você vê todos os dias abertos porque é administradora. As participantes veem cada dia na data dele.</p>` : ""}
  <div class="layout"><nav class="trail" id="trail" aria-label="Dias"></nav><main class="sheet" id="sheet"></main></div></div>`;
  renderTrail(); renderSheet();
}
function ir(i) {
  if (i < 0 || i > 10) return;
  cur = i;
  try { history.replaceState(null, "", i === 10 ? "#meu2027" : `#dia${i + 1}`); } catch (e) { }
  renderTrail(); renderSheet();
  $("#sheet").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- eventos ---------- */
document.addEventListener("input", e => {
  const p = e.target.dataset && e.target.dataset.p;
  if (!p) return;
  setPath(p, e.target.value);
  mudou();
  if (p.startsWith("d3.notas.")) { const b = $("#rodabox"); if (b) b.innerHTML = rodaSVG(true); }
  if (p.startsWith("d1.areas.") && p.endsWith(".nome")) { /* nomes mudam outras telas, sem redesenhar esta */ }
});
document.addEventListener("change", e => {
  const t = e.target, act = t.dataset && t.dataset.act;
  if (act === "escolher") {
    const id = t.dataset.a;
    if (t.checked) {
      if (S.d4.escolhidas.length >= 3) { t.checked = false; toast("Escolha no máximo 3 áreas. Tire uma para escolher outra."); return; }
      S.d4.escolhidas.push(id);
    } else S.d4.escolhidas = S.d4.escolhidas.filter(x => x !== id);
    mudou(); renderSheet();
  }
  if (act === "feita") {
    const tk = plano(t.dataset.o).tarefas[+t.dataset.i];
    if (tk) { tk.feita = t.checked; mudou(); renderSheet(); if (t.checked) toast(`Mais ${PONTOS_TAREFA} pontos`); }
  }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "INPUT") return;
  const act = b.dataset.act, i = +b.dataset.i;
  switch (act) {
    case "ir": ir(+b.dataset.d); return;
    case "nota": setPath(`d3.notas.${b.dataset.a}`, b.dataset.v); mudou(); renderSheet(); return;
    case "add-area": S.d1.areas.push({ id: novoId(), nome: "", texto: "", subs: [] }); break;
    case "rm-area":
      if (S.d1.areas.length <= 3) { toast("A roda da vida precisa de pelo menos 3 áreas."); return; }
      if ((S.d1.areas[i].texto || "").trim() && !confirmar("Tirar esta área e o que você escreveu nela?")) return;
      S.d1.areas.splice(i, 1); break;
    case "add-sub": S.d1.areas[i].subs.push({ id: novoId(), nome: "", texto: "" }); break;
    case "rm-sub": S.d1.areas[i].subs.splice(+b.dataset.j, 1); break;
    case "add-item": getPath(b.dataset.list).push(""); break;
    case "rm-item": { const arr = getPath(b.dataset.list); arr.splice(i, 1); if (!arr.length) arr.push(""); break; }
    case "add-obj": if (objetivos().length < 5) S.d6.objetivos.push(novoObjetivo()); break;
    case "rm-obj": S.d6.objetivos.splice(i, 1); break;
    case "add-tarefa": plano(b.dataset.o).tarefas.push({ id: novoId(), texto: "", tipo: "faco", tri: S.d6.objetivos[+b.dataset.oi]?.trimestre || "1", feita: false }); break;
    case "rm-tarefa": plano(b.dataset.o).tarefas.splice(i, 1); break;
    case "add-habito": S.d9.habitos.push(novoHabito()); break;
    case "rm-habito": S.d9.habitos.splice(i, 1); if (!S.d9.habitos.length) S.d9.habitos.push(novoHabito()); break;
    case "concluir": S.concluidos[+b.dataset.d] = !S.concluidos[+b.dataset.d]; mudou(); renderTrail(); renderSheet(); if (S.concluidos[+b.dataset.d]) toast("Dia concluído"); return;
    case "copiar": copiar(`${DIAS[+b.dataset.d].claude}\n\n${textoDia(+b.dataset.d)}`); return;
    case "resumo": gerarResumo(b.dataset.tipo, b); return;
    case "imprimir": window.print(); return;
    case "sair": await salvar(); await authMod.signOut(auth); location.reload(); return;
    default: return;
  }
  mudou(); renderSheet();
});
function confirmar(msg) { try { return window.confirm(msg); } catch (e) { return true; } }

function copiar(texto) {
  const fallback = () => {
    const t = document.createElement("textarea"); t.value = texto; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); toast("Copiado. Agora cole no seu projeto do Claude."); } catch (e) { toast("Não consegui copiar automaticamente."); }
    t.remove();
  };
  try { navigator.clipboard.writeText(texto).then(() => toast("Copiado. Agora cole no seu projeto do Claude."), fallback); } catch (e) { fallback(); }
}

async function gerarResumo(tipo, btn) {
  if (DEMO) { toast("Na prévia, o resumo automático não funciona. Ele funciona com o login ativado."); return; }
  const texto = tipo === "dia1" ? textoDia(0) : textoTudo();
  btn.disabled = true; const orig = btn.textContent; btn.textContent = "Gerando, pode levar até 1 minuto";
  try {
    const token = await usuario.getIdToken();
    const r = await fetch("/api/resumo", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ tipo, texto }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.texto) throw new Error(j.erro || "Não consegui gerar agora. Tente de novo em alguns minutos.");
    S.resumos[tipo] = j.texto; pendente = true; await salvar(); renderSheet();
  } catch (err) {
    toast(err.message); btn.disabled = false; btn.textContent = orig;
  }
}

/* ---------- início ---------- */
function diaInicial() {
  const m = /^#dia(\d+)$/.exec(location.hash || "");
  if (m) { const i = +m[1] - 1; if (i >= 0 && i < 10) return i; }
  if (location.hash === "#meu2027") return 10;
  let ult = 0;
  for (let i = 0; i < 10; i++) if (aberto(i)) ult = i;
  for (let i = 0; i <= ult; i++) if (!S.concluidos[i]) return i;
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
    cur = diaInicial(); renderApp(); return;
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
    cur = diaInicial(); renderApp();
  });
}
iniciar();
