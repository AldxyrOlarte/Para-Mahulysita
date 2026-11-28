// Nuestro pequeño universo — libro con plantillas
// Firebase Auth (Google) + Firestore en tiempo real

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, ESCRITORES, LECTORES } from "./firebase-config.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js";

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
  lista: { nombre: "Lista",         emoji: "✅", info: "Cosas por hacer o soñar",  ph: "☐ Escribe y pulsa Enter", inicio: "☐ " },
  dibujo:{ nombre: "Dibujo",        emoji: "🎨", info: "Dibujen juntos",           ph: "Cuéntame de este dibujo…", inicio: "" },
  poema: { nombre: "Poema",         emoji: "🌹", info: "Versos para ti",           ph: "Rosas son rojas…", inicio: "" },
  sueno: { nombre: "Sueño juntos",  emoji: "🌙", info: "Un deseo para los dos",    ph: "Algún día quiero que…", inicio: "" }
};
const TEMAS = { rosa: "#ffeaf3", lila: "#eadcff", menta: "#d3f5e3", crema: "#ffedc2", atardecer: "#ffcfb8", noche: "#2b2350" };

/* ---------- Detalles románticos ---------- */
const EMAIL_ELLA = "mahulyr@gmail.com";
const NOMBRE = { ella: "Mahuly", el: "Thiago" };
const INICIO_RELACION = new Date(2026, 4, 28); // 28 de mayo de 2026
const FRASES_DIA = [
  "Eres mi lugar favorito en el mundo.", "Contigo hasta el silencio es bonito.", "Mi corazón te eligió y sigue eligiéndote.",
  "Gracias por existir en mi vida.", "Cada día contigo es mi día favorito.", "Eres mi casualidad más bonita.",
  "Contigo aprendí que el amor sí es tranquilo y bonito.", "Tu sonrisa arregla mi día entero.", "Si me preguntan por la felicidad, pienso en ti.",
  "No importa la distancia, estás en mi pensamiento.", "Eres mi persona favorita.", "Quiero muchos 'para siempre' contigo.",
  "Eres lo mejor que me ha pasado.", "Mi lugar seguro tiene tu nombre.", "Te quiero hoy, mañana y siempre.",
  "Todo es más lindo si estás tú.", "Contigo el tiempo se pasa volando.", "Eres mi sueño hecho realidad.",
  "Te pienso más de lo que imaginas.", "Qué suerte la mía de tenerte."
];
const IDEAS = [
  "Escribe tres cosas que te hicieron sonreír hoy por mí.", "Cuéntame tu recuerdo favorito de nosotros.", "¿Cómo imaginas nuestra primera casa?",
  "Escribe qué fue lo primero que pensaste al conocerme.", "Dime algo que nunca te he dicho.", "Describe nuestra cita perfecta.",
  "¿Qué canción te recuerda a mí y por qué?", "Escribe una promesa pequeña pero sincera.", "¿Qué lugar sueñas visitar conmigo?",
  "Cuéntame algo que te dio miedo y cómo lo superaste.", "Escribe cinco cosas que amas de mí.", "¿Qué te gustaría que hagamos en un año?",
  "Imagina nuestro domingo ideal, hora por hora.", "Escribe una carta para la versión de nosotros de dentro de 10 años.",
  "¿Qué es lo que más te hace reír de mí?", "Cuéntame un sueño que tuviste con nosotros.", "Dime qué te hace sentir querida/o de verdad.",
  "Escribe un mensaje para leer en un día difícil.", "¿Qué apodo nuevo me pondrías hoy?", "Describe cómo se siente abrazarme."
];
const PEGATINAS = ["💗","💕","💘","💌","🌹","🌸","🦋","✨","🌙","⭐","🍓","🧸","🎀","☀️","🌈","😘","🥰","💋","🫶","🐻","🍫","🎶","📸","🏡"];
const SELLOS = ["💗","🌹","⭐","🦋","🍓","🧸","😘","🌸"];
const COLORES_DIB = ["#e0197d","#ff7ab8","#ff8a3d","#ffd23f","#3bb273","#2f9de0","#7a4fe0","#5a2b43","#000000","#ffffff"];

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
let dibujoActual = "", dibujoPintado = null, dibujando = false, ultimaCargada = null, pilaUndo = [];

const $$ = (id) => document.getElementById(id);
const [btnPegatinas, pegatinasPanel, btnIdea, ideaBurbuja, dibujoBloque, lienzo, dibColores, dibGrosor, dibSello,
  dibDeshacer, dibLimpiar, dibDescargar, btnCorazon, corazonOtro, vistoTxt, margenOtro, margenMia,
  portadaExtra, portadaDias, portadaFrase, portadaRacha] =
  ["btnPegatinas","pegatinasPanel","btnIdea","ideaBurbuja","dibujoBloque","lienzo","dibColores","dibGrosor","dibSello",
   "dibDeshacer","dibLimpiar","dibDescargar","btnCorazon","corazonOtro","vistoTxt","margenOtro","margenMia",
   "portadaExtra","portadaDias","portadaFrase","portadaRacha"].map($$);
let yo = "el", libroAbierto = false, temporizadorNota = null;

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
  initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6LdHQywuAAAAAN_2F9twpaXHwu4W5jHQqka1o3ms"),
  isTokenAutoRefreshEnabled: true
});
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
  yo = correo === EMAIL_ELLA ? "ella" : "el";
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
  libro.classList.remove("abierto"); portada.classList.remove("oculto"); libroAbierto = false;
  pintarPortadaExtra();
  vistaLogin.classList.add("oculto"); vistaCuaderno.classList.remove("oculto");
  mostrarAvisoLogin("");
  suscribirPaginas();
}
function detenerCuaderno() {
  clearTimeout(temporizador);
  if (cancelarSuscripcion) { cancelarSuscripcion(); cancelarSuscripcion = null; }
  paginas = []; paginaActualId = null; hayCambios = false;
}
btnAbrir.addEventListener("click", () => {
  libro.classList.add("abierto"); setTimeout(() => portada.classList.add("oculto"), 1200);
  libroAbierto = true; lluviaPetalos();
  const actual = paginas.find((p) => p.id === paginaActualId);
  if (actual) marcarVisto(actual);
});

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
  const escribiendoNota = document.activeElement === margenMia;
  if (hayCambios || (rol === "escritura" && editando) || escribiendoNota || dibujando) { actualizarMeta(actual); actualizarNav(); pintarSocial(actual); }
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
    const otroK = yo === "ella" ? "el" : "ella";
    const marcas = (p["corazon" + C(otroK)] ? " 💗" : "") + (p["nota" + C(otroK)] ? " 💌" : "");
    f.textContent = (i + 1) + " · " + TIPOS[tipoDe(p)].nombre + (fecha ? " · " + formatoCorto.format(fecha) : "") + marcas;
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
  if (p.id !== ultimaCargada) { pilaUndo = []; ideaBurbuja.hidden = true; ultimaCargada = p.id; }
  dibujoActual = p.dibujo || "";
  if (tipo === "dibujo") pintarDibujo(dibujoActual);
  pintarFoto(); pintarTema(); actualizarMeta(p); actualizarNav(); pintarSocial(p);
  if (libroAbierto) marcarVisto(p);
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
      dibujo: "", por: yo,
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
      foto: fotoActual, dibujo: dibujoActual, tema: temaActual, modificadoEn: serverTimestamp()
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
  if (ev.key === "Escape") { pegatinasPanel.hidden = true; modal.hidden = true; modalTipos.hidden = true; emojiPanel.hidden = true; cerrarMenu(); }
});

/* ---------- Menú lateral en celular ---------- */
function abrirMenu() { lateral.classList.add("abierto"); telon.classList.add("visible"); }
function cerrarMenu() { lateral.classList.remove("abierto"); telon.classList.remove("visible"); }
btnMenu.addEventListener("click", abrirMenu);
telon.addEventListener("click", cerrarMenu);

/* =========================================================
   Extras románticos: dibujo, corazones, notitas, pegatinas…
   ========================================================= */
const C = (k) => (k === "ella" ? "Ella" : "El");
const otroDe = () => (yo === "ella" ? "el" : "ella");

function hace(d) {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 90) return "ahora mismo";
  if (s < 3600) return "hace " + Math.round(s / 60) + " min";
  if (s < 86400) return "hace " + Math.round(s / 3600) + " h";
  return "hace " + Math.round(s / 86400) + " d";
}

/* ----- Portada: días juntos, frase del día y racha ----- */
function pintarPortadaExtra() {
  const hoy = new Date();
  const dias = Math.floor((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - INICIO_RELACION) / 864e5);
  portadaDias.textContent = dias >= 0 ? "💗 Llevamos " + dias + (dias === 1 ? " día" : " días") + " juntos" : "";
  const n = Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 864e5);
  portadaFrase.textContent = "“" + FRASES_DIA[n % FRASES_DIA.length] + "”";
  let racha = 1;
  try {
    const hoyStr = hoy.toISOString().slice(0, 10).replace(/-.*/, "") + "-" + n;
    const g = JSON.parse(localStorage.getItem("mahu_racha") || "null");
    if (g && g.n === n) racha = g.r;
    else if (g && g.n === n - 1) racha = g.r + 1;
    localStorage.setItem("mahu_racha", JSON.stringify({ n, r: racha, k: hoyStr }));
  } catch (e) { /* sin almacenamiento */ }
  portadaRacha.textContent = racha > 1 ? "🔥 " + racha + " días seguidos entrando al cuaderno" : "";
  portadaExtra.hidden = false;
}

function lluviaPetalos() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const simbolos = ["🌸", "🌹", "💗", "🌷"];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement("span");
    p.className = "petalo";
    p.textContent = simbolos[i % simbolos.length];
    p.style.left = Math.random() * 100 + "vw";
    p.style.fontSize = 14 + Math.random() * 16 + "px";
    p.style.animationDuration = 3.5 + Math.random() * 3 + "s";
    p.style.animationDelay = Math.random() * 1.2 + "s";
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

/* ----- Corazón, visto y notita en el margen ----- */
function pintarSocial(p) {
  const o = otroDe();
  const mio = !!p["corazon" + C(yo)], suyo = !!p["corazon" + C(o)];
  btnCorazon.textContent = mio ? "💗 Corazón dejado" : "🤍 Dejar un corazón";
  btnCorazon.setAttribute("aria-pressed", String(mio));
  corazonOtro.hidden = !suyo;
  corazonOtro.textContent = suyo ? "💗 " + NOMBRE[o] + " dejó un corazón aquí" : "";
  const nota = p["nota" + C(o)] || "";
  margenOtro.hidden = !nota;
  margenOtro.textContent = nota ? "💌 " + NOMBRE[o] + " escribió: " + nota : "";
  const mia = p["nota" + C(yo)] || "";
  if (document.activeElement !== margenMia && margenMia.value !== mia) margenMia.value = mia;
  const v = aFecha(p["visto" + C(o)]);
  vistoTxt.textContent = v ? "👀 " + NOMBRE[o] + " vio esta página " + hace(v) : "";
}

const marcadoVisto = new Map();
function marcarVisto(p) {
  if (rol !== "escritura" || !db) return;
  const antes = marcadoVisto.get(p.id) || 0;
  if (Date.now() - antes < 300000) return;
  marcadoVisto.set(p.id, Date.now());
  updateDoc(doc(db, "cuaderno", p.id), { ["visto" + C(yo)]: serverTimestamp() }).catch(() => {});
}

btnCorazon.addEventListener("click", async () => {
  if (rol !== "escritura" || !paginaActualId) return;
  const p = paginas.find((x) => x.id === paginaActualId);
  if (!p) return;
  const nuevo = !p["corazon" + C(yo)];
  if (nuevo) lluviaPetalos();
  try { await updateDoc(doc(db, "cuaderno", p.id), { ["corazon" + C(yo)]: nuevo }); }
  catch (err) { console.error(err); setEstado("No se pudo dejar el corazón", "error"); }
});

margenMia.addEventListener("input", () => {
  if (rol !== "escritura" || !paginaActualId) return;
  const id = paginaActualId, texto = margenMia.value.trim().slice(0, 140);
  clearTimeout(temporizadorNota);
  temporizadorNota = setTimeout(() => {
    updateDoc(doc(db, "cuaderno", id), { ["nota" + C(yo)]: texto }).catch((e) => console.error(e));
  }, 800);
});

/* ----- Pegatinas e ideas ----- */
PEGATINAS.forEach((e) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = e;
  b.addEventListener("click", () => {
    if (rol !== "escritura") return;
    const pos = areaTexto.selectionEnd ?? areaTexto.value.length;
    areaTexto.setRangeText(e, pos, pos, "end");
    alEscribir();
  });
  pegatinasPanel.appendChild(b);
});
btnPegatinas.addEventListener("click", (ev) => { ev.stopPropagation(); pegatinasPanel.hidden = !pegatinasPanel.hidden; });
document.addEventListener("click", (ev) => { if (!pegatinasPanel.contains(ev.target)) pegatinasPanel.hidden = true; });

btnIdea.addEventListener("click", () => {
  const idea = IDEAS[Math.floor(Math.random() * IDEAS.length)];
  ideaBurbuja.textContent = "💭 " + idea;
  ideaBurbuja.hidden = false;
  if (rol === "escritura" && !inputTitulo.value.trim() && hoja.dataset.tipo !== "dibujo") {
    inputTitulo.value = idea.length > 80 ? idea.slice(0, 77) + "…" : idea; alEscribir();
  }
});

/* ----- Dibujo ----- */
const ctx = lienzo.getContext("2d", { willReadFrequently: true });
const PAPEL_DIB = "#fffdfe";
let herr = "lapiz", colorDib = COLORES_DIB[0], grosor = 6, sello = SELLOS[0], ultimo = null, matiz = 0;

function limpiarLienzo() { ctx.fillStyle = PAPEL_DIB; ctx.fillRect(0, 0, lienzo.width, lienzo.height); }
limpiarLienzo();

COLORES_DIB.forEach((c, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "dib-color"; b.style.background = c;
  b.setAttribute("aria-label", "Color " + c); b.setAttribute("aria-pressed", String(i === 0));
  b.addEventListener("click", () => {
    colorDib = c; if (herr === "goma" || herr === "arcoiris") elegirHerr("lapiz");
    [...dibColores.children].forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  dibColores.appendChild(b);
});
function elegirHerr(h) {
  herr = h;
  document.querySelectorAll(".dib-btn[data-herr]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.herr === h)));
}
document.querySelectorAll(".dib-btn[data-herr]").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.herr === "sello" && herr === "sello") {
    sello = SELLOS[(SELLOS.indexOf(sello) + 1) % SELLOS.length]; dibSello.textContent = sello;
  }
  elegirHerr(b.dataset.herr);
}));
dibGrosor.addEventListener("input", () => { grosor = Number(dibGrosor.value); });

function exportarDibujo() {
  let q = 0.85, u = lienzo.toDataURL("image/jpeg", q);
  while (u.length > 700000 && q > 0.4) { q -= 0.1; u = lienzo.toDataURL("image/jpeg", q); }
  return u;
}
function pintarDibujo(url) {
  if (dibujando || url === dibujoPintado) return;
  dibujoPintado = url; limpiarLienzo();
  if (!url) return;
  const im = new Image();
  im.onload = () => { if (dibujoPintado === url && !dibujando) { limpiarLienzo(); ctx.drawImage(im, 0, 0, lienzo.width, lienzo.height); } };
  im.src = url;
}
function guardarUndo() {
  pilaUndo.push(ctx.getImageData(0, 0, lienzo.width, lienzo.height));
  if (pilaUndo.length > 12) pilaUndo.shift();
}
function terminarTrazo() {
  dibujoActual = exportarDibujo(); dibujoPintado = dibujoActual; alEscribir();
}
function posLienzo(e) {
  const r = lienzo.getBoundingClientRect();
  return { x: (e.clientX - r.left) * lienzo.width / r.width, y: (e.clientY - r.top) * lienzo.height / r.height };
}
function segmento(a, b) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.lineWidth = herr === "goma" ? grosor * 2.5 : grosor;
  ctx.strokeStyle = herr === "goma" ? PAPEL_DIB : herr === "arcoiris" ? "hsl(" + ((matiz += 5) % 360) + " 90% 58%)" : colorDib;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x + 0.01, b.y); ctx.stroke();
}
lienzo.addEventListener("pointerdown", (e) => {
  if (rol !== "escritura") return;
  e.preventDefault();
  try { lienzo.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
  guardarUndo(); ultimo = posLienzo(e);
  if (herr === "sello") {
    ctx.font = (grosor * 4 + 24) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(sello, ultimo.x, ultimo.y); terminarTrazo(); return;
  }
  dibujando = true; segmento(ultimo, ultimo);
});
lienzo.addEventListener("pointermove", (e) => {
  if (!dibujando) return;
  const p = posLienzo(e); segmento(ultimo, p); ultimo = p;
});
["pointerup", "pointercancel"].forEach((ev) => lienzo.addEventListener(ev, () => {
  if (!dibujando) return;
  dibujando = false; terminarTrazo();
}));
dibDeshacer.addEventListener("click", () => {
  const prev = pilaUndo.pop();
  if (!prev || rol !== "escritura") return;
  ctx.putImageData(prev, 0, 0); terminarTrazo();
});
dibLimpiar.addEventListener("click", () => {
  if (rol !== "escritura" || !confirm("¿Borrar todo el dibujo?")) return;
  guardarUndo(); limpiarLienzo(); terminarTrazo();
});
dibDescargar.addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = lienzo.toDataURL("image/png"); a.download = "dibujo-" + (inputTitulo.value.trim() || "nuestro") + ".png";
  document.body.appendChild(a); a.click(); a.remove();
});
