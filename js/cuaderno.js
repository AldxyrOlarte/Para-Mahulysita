// Nuestro pequeño universo — libro con plantillas
// Firebase Auth (Google) + Firestore en tiempo real

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, ESCRITORES, LECTORES } from "./firebase-config.js";

/* ---------- Constantes ---------- */
const MENSAJE_BIENVENIDA = "Este es tu pequeño espacio, puedes escribir todo lo que quieras";
const MENSAJE_LECTURA = "Aquí puedes leer lo que ella escribe. Las páginas se actualizan solas.";
const RETRASO_AUTOGUARDADO = 900;
const EMOJIS = ["📝","💗","🌸","✨","🌙","☀️","🌷","🦋","🍓","🎀","🧸","🎶","📸","🌈","☕","🍰","🌹","💌","🥰","😊","😢","🎂","✈️","🏡"];

// Para añadir una plantilla nueva: agrégala aquí y estílala en cuaderno-extra.css con .hoja[data-tipo="clave"]
const TIPOS = {
  texto: { nombre: "Página libre",  emoji: "📝", info: "Escribe lo que quieras",   ph: "Escribe aquí lo que quieras…", inicio: "" },
  carta: { nombre: "Carta",         emoji: "💌", info: "Con letra de carta",       ph: "Querida…", inicio: "" },
  foto:  { nombre: "Recuerdo",      emoji: "📸", info: "Foto tipo polaroid",       ph: "¿Qué recuerdas de este momento?", inicio: "" },
  cita:  { nombre: "Frase",         emoji: "✨", info: "Una frase grande",         ph: "Una frase que quieras guardar…", inicio: "" },
  lista: { nombre: "Lista",         emoji: "✅", info: "Cosas por hacer o soñar",  ph: "☐ Escribe y pulsa Enter", inicio: "☐ " }
};
const TEMAS = { rosa: "#ffeaf3", lila: "#eadcff", menta: "#d3f5e3", crema: "#ffedc2" };

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const [vistaLogin, vistaCuaderno, loginAviso, btnEntrar, btnSalir, libro, portada, portadaMensaje, btnAbrir,
  lateral, telon, btnMenu, btnNueva, contador, listaPaginas, insigniaModo, hojaZona, hojaVacia, vaciaMensaje,
  hoja, btnEmoji, emojiPanel, inputTitulo, hojaMeta, areaTexto, estado, btnGuardar, btnEliminar, modal,
  modalCancelar, modalConfirmar, modalTipos, tiposGrid, tiposCancelar, fotoImg, fotoVacia, btnFoto, inputFoto,
  btnMarcar, temasEl, btnPrev, btnNext, paginarInfo] =
  ["vistaLogin","vistaCuaderno","loginAviso","btnEntrar","btnSalir","libro","portada","portadaMensaje","btnAbrir",
   "lateral","telon","btnMenu","btnNueva","contador","listaPaginas","insigniaModo","hojaZona","hojaVacia","vaciaMensaje",
   "hoja","btnEmoji","emojiPanel","inputTitulo","hojaMeta","areaTexto","estado","btnGuardar","btnEliminar","modal",
   "modalCancelar","modalConfirmar","modalTipos","tiposGrid","tiposCancelar","fotoImg","fotoVacia","btnFoto","inputFoto",
   "btnMarcar","temas","btnPrev","btnNext","paginarInfo"].map($);

/* ---------- Estado ---------- */
let rol = "lectura", paginas = [], paginaActualId = null, hayCambios = false, contadorCambios = 0;
let temporizador = null, cancelarSuscripcion = null, avisoLogin = "";
let fotoActual = "", temaActual = "rosa";

/* ---------- Corazones de fondo ---------- */
(function () {
  const simbolos = ["💗", "💕", "🩷", "♡"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.textContent = simbolos[i % 4];
    s.style.left = Math.random() * 100 + "%";
    s.style.fontSize = 12 + Math.random() * 16 + "px";
    s.style.animationDuration = 12 + Math.random() * 14 + "s";
    s.style.animationDelay = -Math.random() * 20 + "s";
    $("corazonesFondo").appendChild(s);
  }
})();

/* ---------- Firebase ---------- */
const configurado = !Object.values(firebaseConfig).some((v) => String(v).startsWith("PEGA"));
let auth = null, db = null, coleccion = null;
if (configurado) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  coleccion = collection(db, "cuaderno");
} else {
  mostrarAvisoLogin("Falta configurar Firebase en js/firebase-config.js.");
}

/* ---------- Utilidades ---------- */
const formatoFecha = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const formatoCorto = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const aFecha = (ts) => (ts && typeof ts.toDate === "function" ? ts.toDate() : null);
const normalizar = (l) => l.map((c) => c.trim().toLowerCase());
const indiceActual = () => paginas.findIndex((p) => p.id === paginaActualId);
const tipoDe = (p) => (TIPOS[p.tipo] ? p.tipo : "texto");

function mostrarAvisoLogin(t) { loginAviso.textContent = t; loginAviso.hidden = !t; }
function setEstado(t, c = "") { estado.textContent = t; estado.className = "estado " + c; }
function corazonGuardado() {
  const c = document.createElement("span");
  c.className = "corazon-guardado";
  c.textContent = "💗";
  estado.parentElement.style.position = "relative";
  estado.parentElement.appendChild(c);
  c.addEventListener("animationend", () => c.remove());
}

/* ---------- Autenticación ---------- */
btnEntrar.addEventListener("click", async () => {
  if (!configurado) return;
  mostrarAvisoLogin("");
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: "select_account" });
  try { await signInWithPopup(auth, proveedor); }
  catch (err) {
    if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") signInWithRedirect(auth, proveedor);
    else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request")
      mostrarAvisoLogin("No se pudo iniciar sesión (" + err.code + "). Revisa que el dominio esté autorizado en Firebase.");
  }
});
btnSalir.addEventListener("click", async () => { await guardar(true); await signOut(auth); });

if (auth) onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    detenerCuaderno();
    vistaCuaderno.classList.add("oculto");
    vistaLogin.classList.remove("oculto");
    mostrarAvisoLogin(avisoLogin); avisoLogin = "";
    return;
  }
  const correo = (usuario.email || "").toLowerCase();
  if (normalizar(ESCRITORES).includes(correo)) rol = "escritura";
  else if (normalizar(LECTORES).includes(correo)) rol = "lectura";
  else { avisoLogin = "Esta cuenta (" + correo + ") no tiene acceso al cuaderno."; signOut(auth); return; }
  iniciarCuaderno();
});

function iniciarCuaderno() {
  document.body.dataset.modo = rol;
  insigniaModo.textContent = rol === "escritura" ? "✏️ Modo escritura" : "👀 Modo lectura";
  portadaMensaje.textContent = rol === "escritura" ? MENSAJE_BIENVENIDA : MENSAJE_LECTURA;
  const solo = rol !== "escritura";
  inputTitulo.readOnly = solo; areaTexto.readOnly = solo; btnEmoji.disabled = solo;
  libro.classList.remove("abierto"); portada.classList.remove("oculto");
  vistaLogin.classList.add("oculto"); vistaCuaderno.classList.remove("oculto");
  mostrarAvisoLogin("");
  suscribirPaginas();
}
function detenerCuaderno() {
  clearTimeout(temporizador);
  if (cancelarSuscripcion) { cancelarSuscripcion(); cancelarSuscripcion = null; }
  paginas = []; paginaActualId = null; hayCambios = false;
}
btnAbrir.addEventListener("click", () => { libro.classList.add("abierto"); setTimeout(() => portada.classList.add("oculto"), 1200); });

/* ---------- Firestore en tiempo real (la página 1 es la más antigua) ---------- */
function suscribirPaginas() {
  cancelarSuscripcion = onSnapshot(query(coleccion, orderBy("creadoEn", "asc")),
    (snap) => { paginas = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })); alRecibirPaginas(); },
    (err) => { console.error(err); setEstado("No se pudo leer el cuaderno (revisa las reglas de Firestore)", "error"); });
}
function alRecibirPaginas() {
  renderLista(); renderContador();
  let actual = paginas.find((p) => p.id === paginaActualId);
  if (!actual) {
    paginaActualId = paginas.length ? paginas[0].id : null;
    mostrarPagina(paginas.find((p) => p.id === paginaActualId), false);
    renderLista();
    return;
  }
  const editando = document.activeElement === inputTitulo || document.activeElement === areaTexto;
  if (hayCambios || (rol === "escritura" && editando)) { actualizarMeta(actual); actualizarNav(); }
  else cargarEnEditor(actual);
}

/* ---------- Pintado ---------- */
function renderContador() {
  const n = paginas.filter((p) => (p.contenido || "").trim() || p.foto).length;
  contador.textContent = n === 1 ? "1 página escrita" : n + " páginas escritas";
}
function renderLista() {
  listaPaginas.replaceChildren();
  paginas.forEach((p, i) => {
    const li = document.createElement("li"), b = document.createElement("button");
    b.type = "button";
    b.className = "pagina-item" + (p.id === paginaActualId ? " activa" : "");
    const e = document.createElement("span"); e.className = "pagina-emoji"; e.textContent = p.emoji || TIPOS[tipoDe(p)].emoji;
    const t = document.createElement("span"); t.className = "pagina-titulo" + (p.titulo ? "" : " sin-titulo"); t.textContent = p.titulo || "Sin título";
    const f = document.createElement("span"); f.className = "pagina-fecha";
    const fecha = aFecha(p.modificadoEn) || aFecha(p.creadoEn);
    f.textContent = (i + 1) + " · " + TIPOS[tipoDe(p)].nombre + (fecha ? " · " + formatoCorto.format(fecha) : "");
    b.append(e, t, f);
    b.addEventListener("click", () => { seleccionarPagina(p.id); cerrarMenu(); });
    li.appendChild(b); listaPaginas.appendChild(li);
  });
}
function actualizarMeta(p) {
  const c = aFecha(p.creadoEn), m = aFecha(p.modificadoEn);
  hojaMeta.textContent = "Creada: " + (c ? formatoFecha.format(c) : "…") + "  ·  Última modificación: " + (m ? formatoFecha.format(m) : "…");
}
function actualizarNav() {
  const i = indiceActual();
  paginarInfo.textContent = i < 0 ? "" : "Página " + (i + 1) + " de " + paginas.length;
  btnPrev.disabled = i <= 0;
  btnNext.disabled = i < 0 || i >= paginas.length - 1;
}
function pintarFoto() {
  fotoImg.hidden = !fotoActual; fotoVacia.hidden = !!fotoActual;
  if (fotoActual) fotoImg.src = fotoActual;
}
function pintarTema() {
  hojaZona.dataset.tema = temaActual;
  [...temasEl.children].forEach((b) => b.setAttribute("aria-pressed", b.dataset.tema === temaActual));
}
function cargarEnEditor(p) {
  const tipo = tipoDe(p);
  hoja.dataset.tipo = tipo;
  areaTexto.placeholder = TIPOS[tipo].ph;
  btnEmoji.textContent = p.emoji || TIPOS[tipo].emoji;
  if (inputTitulo.value !== (p.titulo || "")) inputTitulo.value = p.titulo || "";
  if (areaTexto.value !== (p.contenido || "")) areaTexto.value = p.contenido || "";
  fotoActual = p.foto || ""; temaActual = TEMAS[p.tema] ? p.tema : "rosa";
  pintarFoto(); pintarTema(); actualizarMeta(p); actualizarNav();
}
function mostrarPagina(p, animar, dir = "next") {
  if (!p) {
    hoja.hidden = true; hojaVacia.hidden = false;
    vaciaMensaje.textContent = rol === "escritura"
      ? MENSAJE_BIENVENIDA + ". Pulsa «Nueva página» para empezar."
      : "Todavía no hay páginas escritas. Cuando ella escriba, aparecerán aquí.";
    actualizarNav();
    return;
  }
  hojaVacia.hidden = true; hoja.hidden = false; emojiPanel.hidden = true;
  if (!animar) { cargarEnEditor(p); return; }
  hoja.dataset.dir = dir;
  hoja.classList.remove("pasando-entrada"); hoja.classList.add("pasando-salida");
  setTimeout(() => {
    cargarEnEditor(p);
    hoja.classList.remove("pasando-salida"); hoja.classList.add("pasando-entrada");
    setTimeout(() => hoja.classList.remove("pasando-entrada"), 400);
  }, 260);
}
function seleccionarPagina(id) {
  if (id === paginaActualId) return;
  if (hayCambios) guardar(true);
  const dir = paginas.findIndex((p) => p.id === id) < indiceActual() ? "prev" : "next";
  paginaActualId = id;
  renderLista();
  mostrarPagina(paginas.find((p) => p.id === id), true, dir);
  setEstado(rol === "escritura" ? "Todo guardado" : "Modo lectura", "ok");
}
const navegar = (d) => { const i = indiceActual() + d; if (paginas[i]) seleccionarPagina(paginas[i].id); };
btnPrev.addEventListener("click", () => navegar(-1));
btnNext.addEventListener("click", () => navegar(1));
document.addEventListener("keydown", (ev) => {
  if (ev.altKey && ev.key === "ArrowLeft") navegar(-1);
  if (ev.altKey && ev.key === "ArrowRight") navegar(1);
});
// Deslizar el dedo en el celular para pasar de página
let toqueX = null;
hojaZona.addEventListener("touchstart", (e) => { toqueX = e.target === areaTexto ? null : e.touches[0].clientX; }, { passive: true });
hojaZona.addEventListener("touchend", (e) => {
  if (toqueX === null) return;
  const dx = e.changedTouches[0].clientX - toqueX;
  if (Math.abs(dx) > 70) navegar(dx < 0 ? 1 : -1);
  toqueX = null;
});

/* ---------- Plantillas: nueva página ---------- */
Object.entries(TIPOS).forEach(([clave, t]) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "tipo-card";
  b.innerHTML = "<b></b><span></span><small></small>";
  b.children[0].textContent = t.emoji; b.children[1].textContent = t.nombre; b.children[2].textContent = t.info;
  b.addEventListener("click", () => crearPagina(clave));
  tiposGrid.appendChild(b);
});
btnNueva.addEventListener("click", () => { if (rol === "escritura") modalTipos.hidden = false; });
tiposCancelar.addEventListener("click", () => { modalTipos.hidden = true; });
modalTipos.addEventListener("click", (ev) => { if (ev.target === modalTipos) modalTipos.hidden = true; });

async function crearPagina(tipo) {
  modalTipos.hidden = true;
  if (rol !== "escritura") return;
  try {
    if (hayCambios) await guardar(true);
    const ref = await addDoc(coleccion, {
      tipo, titulo: "", contenido: TIPOS[tipo].inicio, emoji: TIPOS[tipo].emoji, tema: "rosa", foto: "",
      creadoEn: serverTimestamp(), modificadoEn: serverTimestamp()
    });
    seleccionarPagina(ref.id);
    cerrarMenu();
    setTimeout(() => inputTitulo.focus(), 500);
  } catch (err) { console.error(err); setEstado("No se pudo crear la página", "error"); }
}

/* ---------- Edición y guardado ---------- */
function alEscribir() {
  if (rol !== "escritura" || !paginaActualId) return;
  hayCambios = true; contadorCambios++;
  setEstado("Escribiendo…", "guardando");
  clearTimeout(temporizador);
  temporizador = setTimeout(() => guardar(false), RETRASO_AUTOGUARDADO);
}
inputTitulo.addEventListener("input", alEscribir);
areaTexto.addEventListener("input", alEscribir);

// Lista: Enter crea otra casilla
areaTexto.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter" || hoja.dataset.tipo !== "lista" || rol !== "escritura") return;
  ev.preventDefault();
  const pos = areaTexto.selectionStart;
  areaTexto.setRangeText("\n☐ ", pos, areaTexto.selectionEnd, "end");
  alEscribir();
});
btnMarcar.addEventListener("click", () => {
  const v = areaTexto.value, pos = areaTexto.selectionStart;
  const ini = v.lastIndexOf("\n", pos - 1) + 1;
  const m = v.slice(ini).match(/^(☐|☑) ?/);
  if (m) {
    areaTexto.setRangeText((m[1] === "☐" ? "☑" : "☐") + " ", ini, ini + m[0].length, "preserve");
  } else {
    areaTexto.setRangeText("☐ ", ini, ini, "preserve");
  }
  alEscribir();
});

// Foto: se reduce y se guarda dentro de la página (no necesita Firebase Storage)
btnFoto.addEventListener("click", () => inputFoto.click());
inputFoto.addEventListener("change", async () => {
  const f = inputFoto.files[0]; inputFoto.value = "";
  if (!f) return;
  try {
    const img = await createImageBitmap(f);
    const k = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    let url = c.toDataURL("image/jpeg", 0.72);
    if (url.length > 900000) url = c.toDataURL("image/jpeg", 0.5);
    fotoActual = url; pintarFoto(); alEscribir();
  } catch (err) { console.error(err); setEstado("No se pudo leer la foto", "error"); }
});

// Colores de papel
Object.entries(TEMAS).forEach(([clave, color]) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "tema-punto"; b.dataset.tema = clave;
  b.style.background = color; b.setAttribute("aria-label", "Papel " + clave);
  b.addEventListener("click", () => { temaActual = clave; pintarTema(); alEscribir(); });
  temasEl.appendChild(b);
});

async function guardar(forzar) {
  clearTimeout(temporizador);
  if (rol !== "escritura" || !paginaActualId) return;
  if (!hayCambios && !forzar) return;
  const id = paginaActualId, version = contadorCambios;
  setEstado("Guardando…", "guardando");
  try {
    await updateDoc(doc(db, "cuaderno", id), {
      titulo: inputTitulo.value.trim(), contenido: areaTexto.value, emoji: btnEmoji.textContent,
      foto: fotoActual, tema: temaActual, modificadoEn: serverTimestamp()
    });
    if (version === contadorCambios) hayCambios = false;
    setEstado("Guardado ✓", "ok"); corazonGuardado();
  } catch (err) { console.error(err); setEstado("No se pudo guardar. Reintentando al seguir escribiendo", "error"); }
}
btnGuardar.addEventListener("click", () => guardar(true));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && hayCambios) guardar(true); });
window.addEventListener("beforeunload", () => { if (hayCambios) guardar(true); });
window.addEventListener("offline", () => setEstado("Sin conexión: se guardará al volver", "error"));
window.addEventListener("online", () => setEstado("De nuevo en línea ✓", "ok"));

/* ---------- Emojis ---------- */
EMOJIS.forEach((e) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = e;
  b.addEventListener("click", () => { btnEmoji.textContent = e; emojiPanel.hidden = true; alEscribir(); });
  emojiPanel.appendChild(b);
});
btnEmoji.addEventListener("click", (ev) => { ev.stopPropagation(); if (rol === "escritura") emojiPanel.hidden = !emojiPanel.hidden; });
document.addEventListener("click", (ev) => { if (!emojiPanel.contains(ev.target)) emojiPanel.hidden = true; });

/* ---------- Eliminar ---------- */
btnEliminar.addEventListener("click", () => { if (rol === "escritura" && paginaActualId) modal.hidden = false; });
modalCancelar.addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.hidden = true; });
modalConfirmar.addEventListener("click", async () => {
  modal.hidden = true;
  if (rol !== "escritura" || !paginaActualId) return;
  clearTimeout(temporizador); hayCambios = false;
  try { await deleteDoc(doc(db, "cuaderno", paginaActualId)); setEstado("Página eliminada", "ok"); }
  catch (err) { console.error(err); setEstado("No se pudo eliminar la página", "error"); }
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { modal.hidden = true; modalTipos.hidden = true; emojiPanel.hidden = true; cerrarMenu(); }
});

/* ---------- Menú lateral en celular ---------- */
function abrirMenu() { lateral.classList.add("abierto"); telon.classList.add("visible"); }
function cerrarMenu() { lateral.classList.remove("abierto"); telon.classList.remove("visible"); }
btnMenu.addEventListener("click", abrirMenu);
telon.addEventListener("click", cerrarMenu);
