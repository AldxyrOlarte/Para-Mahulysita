// =========================================================
// Nuestro pequeño universo — lógica del cuaderno
// Firebase Authentication (Google) + Cloud Firestore en tiempo real
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig, ESCRITORES, LECTORES } from "./firebase-config.js";

/* ---------------------------------------------------------
   Constantes
--------------------------------------------------------- */
const MENSAJE_BIENVENIDA = "Este es tu pequeño espacio, puedes escribir todo lo que quieras";
const MENSAJE_LECTURA = "Aquí puedes leer lo que ella escribe. Las páginas se actualizan solas.";
const RETRASO_AUTOGUARDADO = 900; // ms sin escribir antes de guardar
const EMOJIS = ["📝", "💗", "🌸", "✨", "🌙", "☀️", "🌷", "🦋", "🍓", "🎀", "🧸", "🎶",
                "📸", "🌈", "☕", "🍰", "🌹", "💌", "🥰", "😊", "😢", "🎂", "✈️", "🏡"];

/* ---------------------------------------------------------
   Referencias al DOM
--------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const vistaLogin = $("vistaLogin");
const vistaCuaderno = $("vistaCuaderno");
const loginAviso = $("loginAviso");
const btnEntrar = $("btnEntrar");
const btnSalir = $("btnSalir");
const libro = $("libro");
const portada = $("portada");
const portadaMensaje = $("portadaMensaje");
const btnAbrir = $("btnAbrir");
const lateral = $("lateral");
const telon = $("telon");
const btnMenu = $("btnMenu");
const btnNueva = $("btnNueva");
const contador = $("contador");
const listaPaginas = $("listaPaginas");
const insigniaModo = $("insigniaModo");
const hojaVacia = $("hojaVacia");
const vaciaMensaje = $("vaciaMensaje");
const hoja = $("hoja");
const btnEmoji = $("btnEmoji");
const emojiPanel = $("emojiPanel");
const inputTitulo = $("inputTitulo");
const hojaMeta = $("hojaMeta");
const areaTexto = $("areaTexto");
const estado = $("estado");
const btnGuardar = $("btnGuardar");
const btnEliminar = $("btnEliminar");
const modal = $("modal");
const modalCancelar = $("modalCancelar");
const modalConfirmar = $("modalConfirmar");

/* ---------------------------------------------------------
   Estado de la aplicación
--------------------------------------------------------- */
let rol = "lectura";          // "escritura" | "lectura" (lo define el correo; Firestore lo hace cumplir)
let paginas = [];             // páginas recibidas de Firestore
let paginaActualId = null;
let hayCambios = false;       // hay texto escrito aún sin guardar
let contadorCambios = 0;      // para saber si se escribió algo mientras se guardaba
let temporizador = null;
let cancelarSuscripcion = null;
let avisoLogin = "";

/* ---------------------------------------------------------
   Decoración: corazones flotando al fondo
--------------------------------------------------------- */
(function crearCorazonesFondo() {
  const cont = $("corazonesFondo");
  const simbolos = ["💗", "💕", "🩷", "♡"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.textContent = simbolos[i % simbolos.length];
    s.style.left = Math.random() * 100 + "%";
    s.style.fontSize = 12 + Math.random() * 16 + "px";
    s.style.animationDuration = 12 + Math.random() * 14 + "s";
    s.style.animationDelay = -Math.random() * 20 + "s";
    cont.appendChild(s);
  }
})();

/* ---------------------------------------------------------
   Inicialización de Firebase
--------------------------------------------------------- */
const configurado = !Object.values(firebaseConfig).some((v) => String(v).startsWith("PEGA"));
const correosConfigurados = ![...ESCRITORES, ...LECTORES].some((c) => c.startsWith("PEGA"));

let auth = null;
let db = null;
let coleccion = null;

if (configurado) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Caché local: permite ver lo ya cargado sin internet y guarda cambios pendientes
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  coleccion = collection(db, "cuaderno");
} else {
  mostrarAvisoLogin("Falta configurar Firebase: abre js/firebase-config.js y pega los datos de tu proyecto.");
}

/* ---------------------------------------------------------
   Utilidades
--------------------------------------------------------- */
const formatoFecha = new Intl.DateTimeFormat("es", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
});
const formatoCorto = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

function aFecha(ts) {
  return ts && typeof ts.toDate === "function" ? ts.toDate() : null;
}

function normalizar(lista) {
  return lista.map((c) => c.trim().toLowerCase());
}

function mostrarAvisoLogin(texto) {
  loginAviso.textContent = texto;
  loginAviso.hidden = !texto;
}

function setEstado(texto, clase = "") {
  estado.textContent = texto;
  estado.className = "estado " + clase;
}

/** Corazoncito que sube al guardar */
function corazonGuardado() {
  const c = document.createElement("span");
  c.className = "corazon-guardado";
  c.textContent = "💗";
  estado.parentElement.appendChild(c);
  c.addEventListener("animationend", () => c.remove());
}

/* ---------------------------------------------------------
   Autenticación
--------------------------------------------------------- */
btnEntrar.addEventListener("click", async () => {
  if (!configurado) return;
  mostrarAvisoLogin("");
  const proveedor = new GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, proveedor);
  } catch (err) {
    // Algunos celulares bloquean ventanas emergentes: usamos redirección
    if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
      signInWithRedirect(auth, proveedor);
    } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
      mostrarAvisoLogin("No se pudo iniciar sesión (" + err.code + "). Revisa que el dominio esté autorizado en Firebase.");
    }
  }
});

btnSalir.addEventListener("click", async () => {
  await guardar(true);
  await signOut(auth);
});

if (auth) {
  onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
      detenerCuaderno();
      vistaCuaderno.classList.add("oculto");
      vistaLogin.classList.remove("oculto");
      mostrarAvisoLogin(avisoLogin);
      avisoLogin = "";
      return;
    }

    const correo = (usuario.email || "").toLowerCase();

    if (!correosConfigurados) {
      avisoLogin = "Falta escribir los correos autorizados en js/firebase-config.js.";
      signOut(auth);
      return;
    }
    if (normalizar(ESCRITORES).includes(correo)) {
      rol = "escritura";
    } else if (normalizar(LECTORES).includes(correo)) {
      rol = "lectura";
    } else {
      avisoLogin = "Esta cuenta (" + correo + ") no tiene acceso al cuaderno.";
      signOut(auth);
      return;
    }
    iniciarCuaderno();
  });
}

/* ---------------------------------------------------------
   Arranque / cierre del cuaderno
--------------------------------------------------------- */
function iniciarCuaderno() {
  document.body.dataset.modo = rol;
  insigniaModo.textContent = rol === "escritura" ? "✏️ Modo escritura" : "👀 Modo lectura";
  portadaMensaje.textContent = rol === "escritura" ? MENSAJE_BIENVENIDA : MENSAJE_LECTURA;

  // Controles de edición según el modo
  const soloLectura = rol !== "escritura";
  inputTitulo.readOnly = soloLectura;
  areaTexto.readOnly = soloLectura;
  btnEmoji.disabled = soloLectura;

  // Portada cerrada otra vez
  libro.classList.remove("abierto");
  portada.classList.remove("oculto");

  vistaLogin.classList.add("oculto");
  vistaCuaderno.classList.remove("oculto");
  mostrarAvisoLogin("");

  suscribirPaginas();
}

function detenerCuaderno() {
  clearTimeout(temporizador);
  if (cancelarSuscripcion) { cancelarSuscripcion(); cancelarSuscripcion = null; }
  paginas = [];
  paginaActualId = null;
  hayCambios = false;
}

btnAbrir.addEventListener("click", () => {
  libro.classList.add("abierto");
  setTimeout(() => portada.classList.add("oculto"), 1200);
});

/* ---------------------------------------------------------
   Sincronización en tiempo real con Firestore
--------------------------------------------------------- */
function suscribirPaginas() {
  const consulta = query(coleccion, orderBy("creadoEn", "desc"));
  cancelarSuscripcion = onSnapshot(
    consulta,
    (snap) => {
      paginas = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
      alRecibirPaginas();
    },
    (err) => {
      console.error(err);
      setEstado("No se pudo leer el cuaderno (revisa las reglas de Firestore)", "error");
    }
  );
}

function alRecibirPaginas() {
  renderLista();
  renderContador();

  // ¿La página abierta sigue existiendo?
  let actual = paginas.find((p) => p.id === paginaActualId);
  if (!actual) {
    paginaActualId = paginas.length ? paginas[0].id : null;
    actual = paginas.find((p) => p.id === paginaActualId);
    mostrarPagina(actual, false);
    renderLista();
    return;
  }

  // Actualiza la hoja con los cambios llegados de otro dispositivo,
  // sin pisar lo que se está escribiendo ahora mismo.
  const editando = document.activeElement === inputTitulo || document.activeElement === areaTexto;
  if (hayCambios || (rol === "escritura" && editando)) {
    actualizarMeta(actual);
  } else {
    cargarEnEditor(actual);
  }
}

/* ---------------------------------------------------------
   Pintado de la interfaz
--------------------------------------------------------- */
function renderContador() {
  const escritas = paginas.filter((p) => (p.contenido || "").trim().length > 0).length;
  contador.textContent = escritas === 1 ? "1 página escrita" : escritas + " páginas escritas";
}

function renderLista() {
  listaPaginas.replaceChildren();
  paginas.forEach((p) => {
    const li = document.createElement("li");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "pagina-item" + (p.id === paginaActualId ? " activa" : "");

    const emoji = document.createElement("span");
    emoji.className = "pagina-emoji";
    emoji.textContent = p.emoji || "📝";

    const titulo = document.createElement("span");
    titulo.className = "pagina-titulo" + (p.titulo ? "" : " sin-titulo");
    titulo.textContent = p.titulo || "Sin título";

    const fecha = document.createElement("span");
    fecha.className = "pagina-fecha";
    const f = aFecha(p.modificadoEn) || aFecha(p.creadoEn);
    fecha.textContent = f ? formatoCorto.format(f) : "";

    boton.append(emoji, titulo, fecha);
    boton.addEventListener("click", () => {
      seleccionarPagina(p.id);
      cerrarMenu();
    });
    li.appendChild(boton);
    listaPaginas.appendChild(li);
  });
}

function actualizarMeta(p) {
  const creada = aFecha(p.creadoEn);
  const modificada = aFecha(p.modificadoEn);
  hojaMeta.textContent =
    "Creada: " + (creada ? formatoFecha.format(creada) : "…") +
    "  ·  Última modificación: " + (modificada ? formatoFecha.format(modificada) : "…");
}

function cargarEnEditor(p) {
  btnEmoji.textContent = p.emoji || "📝";
  if (inputTitulo.value !== (p.titulo || "")) inputTitulo.value = p.titulo || "";
  if (areaTexto.value !== (p.contenido || "")) areaTexto.value = p.contenido || "";
  actualizarMeta(p);
}

function mostrarPagina(p, animar) {
  if (!p) {
    hoja.hidden = true;
    hojaVacia.hidden = false;
    vaciaMensaje.textContent = rol === "escritura"
      ? MENSAJE_BIENVENIDA + ". Pulsa «Nueva página» para empezar."
      : "Todavía no hay páginas escritas. Cuando ella escriba, aparecerán aquí.";
    return;
  }
  hojaVacia.hidden = true;
  hoja.hidden = false;
  emojiPanel.hidden = true;

  if (!animar) { cargarEnEditor(p); return; }

  // Animación de pasar de página
  hoja.classList.remove("pasando-entrada");
  hoja.classList.add("pasando-salida");
  setTimeout(() => {
    cargarEnEditor(p);
    hoja.classList.remove("pasando-salida");
    hoja.classList.add("pasando-entrada");
    setTimeout(() => hoja.classList.remove("pasando-entrada"), 360);
  }, 240);
}

function seleccionarPagina(id) {
  if (id === paginaActualId) return;
  if (hayCambios) guardar(true); // no se pierde nada al cambiar de página
  paginaActualId = id;
  renderLista();
  mostrarPagina(paginas.find((p) => p.id === id), true);
  setEstado(rol === "escritura" ? "Todo guardado" : "Modo lectura", "ok");
}

/* ---------------------------------------------------------
   Escritura: crear, editar, guardar, eliminar
--------------------------------------------------------- */
btnNueva.addEventListener("click", async () => {
  if (rol !== "escritura") return;
  try {
    if (hayCambios) await guardar(true);
    const ref = await addDoc(coleccion, {
      titulo: "",
      contenido: "",
      emoji: "📝",
      creadoEn: serverTimestamp(),
      modificadoEn: serverTimestamp()
    });
    paginaActualId = null; // fuerza a cargar la nueva hoja con animación
    seleccionarPagina(ref.id);
    cerrarMenu();
    setTimeout(() => inputTitulo.focus(), 400);
  } catch (err) {
    console.error(err);
    setEstado("No se pudo crear la página", "error");
  }
});

// Cada vez que escribe, se programa un guardado automático
function alEscribir() {
  if (rol !== "escritura" || !paginaActualId) return;
  hayCambios = true;
  contadorCambios++;
  setEstado("Escribiendo…", "guardando");
  clearTimeout(temporizador);
  temporizador = setTimeout(() => guardar(false), RETRASO_AUTOGUARDADO);
}
inputTitulo.addEventListener("input", alEscribir);
areaTexto.addEventListener("input", alEscribir);

/** Envía los cambios de la página abierta a Firestore */
async function guardar(forzar) {
  clearTimeout(temporizador);
  if (rol !== "escritura" || !paginaActualId) return;
  if (!hayCambios && !forzar) return;

  const id = paginaActualId;
  const version = contadorCambios;
  setEstado("Guardando…", "guardando");
  try {
    await updateDoc(doc(db, "cuaderno", id), {
      titulo: inputTitulo.value.trim(),
      contenido: areaTexto.value,
      emoji: btnEmoji.textContent,
      modificadoEn: serverTimestamp()
    });
    if (version === contadorCambios) hayCambios = false; // nada nuevo mientras se guardaba
    setEstado("Guardado ✓", "ok");
    corazonGuardado();
  } catch (err) {
    console.error(err);
    setEstado("No se pudo guardar. Reintentando al seguir escribiendo", "error");
  }
}

btnGuardar.addEventListener("click", () => guardar(true));

// Guarda si se cierra o se oculta la pestaña
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && hayCambios) guardar(true);
});
window.addEventListener("beforeunload", () => { if (hayCambios) guardar(true); });

// Aviso de conexión
window.addEventListener("offline", () => setEstado("Sin conexión: se guardará al volver", "error"));
window.addEventListener("online", () => setEstado("De nuevo en línea ✓", "ok"));

/* ---------- Emojis ---------- */
EMOJIS.forEach((e) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = e;
  b.addEventListener("click", () => {
    btnEmoji.textContent = e;
    emojiPanel.hidden = true;
    alEscribir();
  });
  emojiPanel.appendChild(b);
});
btnEmoji.addEventListener("click", (ev) => {
  ev.stopPropagation();
  if (rol !== "escritura") return;
  emojiPanel.hidden = !emojiPanel.hidden;
});
document.addEventListener("click", (ev) => {
  if (!emojiPanel.contains(ev.target)) emojiPanel.hidden = true;
});

/* ---------- Eliminar ---------- */
btnEliminar.addEventListener("click", () => {
  if (rol === "escritura" && paginaActualId) modal.hidden = false;
});
modalCancelar.addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.hidden = true; });
modalConfirmar.addEventListener("click", async () => {
  modal.hidden = true;
  if (rol !== "escritura" || !paginaActualId) return;
  clearTimeout(temporizador);
  hayCambios = false;
  try {
    await deleteDoc(doc(db, "cuaderno", paginaActualId));
    setEstado("Página eliminada", "ok");
  } catch (err) {
    console.error(err);
    setEstado("No se pudo eliminar la página", "error");
  }
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { modal.hidden = true; emojiPanel.hidden = true; cerrarMenu(); }
});

/* ---------------------------------------------------------
   Menú lateral en celular
--------------------------------------------------------- */
function abrirMenu() { lateral.classList.add("abierto"); telon.classList.add("visible"); }
function cerrarMenu() { lateral.classList.remove("abierto"); telon.classList.remove("visible"); }
btnMenu.addEventListener("click", abrirMenu);
telon.addEventListener("click", cerrarMenu);
