/* =========================================================
   Sorpresas de Mahuly  ->  js/sorpresas.js  (type="module")
   - Mahuly crea, edita, previsualiza y borra sorpresas para Thiago.
   - Thiago ve que existen (con cuenta regresiva) pero NO puede leer
     nada hasta la fecha: lo bloquean las reglas de Firestore.
   - Tipos: carta, foto, canción, vale canjeable, adivinanza,
     tarjeta para rascar, ramo de flores y cacería de pistas.
   - Thiago puede reaccionar, responder y canjear vales.
   ========================================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc, collection, onSnapshot, query, orderBy,
    Timestamp, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Busca tu firebase-config.js en las carpetas más comunes
let cfg = {};
for (const ruta of ["./firebase-config.js", "../firebase-config.js", "../pag/firebase-config.js"]) {
    try { cfg = await import(ruta); break; } catch (e) { /* prueba la siguiente ruta */ }
}

const configExistente = cfg.firebaseConfig || cfg.config || cfg.default;
if (!(cfg.db || cfg.app || (configExistente && configExistente.apiKey))) {
    const e = document.getElementById("acc-error");
    if (e) e.textContent = "No encontré firebase-config.js en la carpeta js/.";
    throw new Error("sorpresas.js: falta firebase-config.js");
}

/* ---------- Configuración ---------- */

const EMAIL_ELLA = "mahulyr@gmail.com";                // crea las sorpresas
const EMAIL_EL = "thiagoolartejimenez@gmail.com";      // las recibe

const TITULO_OCULTO = "Una sorpresa 🎁";

// icono: [cerrada, abierta]
const TIPOS = {
    carta:      { nombre: "💌 Carta de amor",         icono: ["🔒", "💌"] },
    foto:       { nombre: "📸 Foto con dedicatoria",  icono: ["🔒", "📸"] },
    cancion:    { nombre: "🎵 Canción para ti",       icono: ["🔒", "🎵"] },
    vale:       { nombre: "🎟️ Vale canjeable",        icono: ["🔒", "🎟️"] },
    adivinanza: { nombre: "🧩 Adivinanza",            icono: ["🔒", "🧩"] },
    raspar:     { nombre: "✨ Tarjeta para rascar",   icono: ["🔒", "✨"] },
    flores:     { nombre: "💐 Ramo de flores",        icono: ["🔒", "💐"] },
    pistas:     { nombre: "🗺️ Cacería de pistas",     icono: ["🔒", "🗺️"] },
    sorpresa:   { nombre: "🎁 Sorpresa",              icono: ["🔒", "🎉"] },
    capsula:    { nombre: "⏳ Cápsula del tiempo",    icono: ["🔒", "💌"] },
    secreto:    { nombre: "🤫 Mensaje secreto",       icono: ["🤫", "💗"] }
};

const REACCIONES = ["❤️", "🥹", "😂", "😍", "🔥", "🤗"];

const LS_VISTAS = "mahu_sorpresasVistas";
const LS_RESP = "mahu_respVista";

/* ---------- Firebase ---------- */

let appCache;
const obtenerApp = () => (appCache = appCache || cfg.app || getApps()[0] || initializeApp(configExistente));
const db = cfg.db || getFirestore(obtenerApp());
const auth = cfg.auth || getAuth(obtenerApp());

/* ---------- Utilidades ---------- */

const $ = (id) => document.getElementById(id);
const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

const toast = el("div", "toast");
document.body.appendChild(toast);
let toastTimer;
function avisar(texto) {
    toast.textContent = texto;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 4500);
}

function rafaga(x, y, lista) {
    if (reducir) return;
    for (let i = 0; i < 12; i++) {
        const c = el("span", "corazon-toque", lista[Math.floor(Math.random() * lista.length)]);
        const ang = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 80;
        c.style.left = x + "px";
        c.style.top = y + "px";
        c.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        c.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 1000);
    }
}

function centroDe(e) {
    const r = e.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
}

function mensajeError(er) {
    const c = er && er.code ? er.code : "";
    if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") {
        return "Correo o contraseña incorrectos.";
    }
    if (c === "permission-denied") return "Sin permiso (todavía no se puede o faltan las reglas de Firestore).";
    return (er && er.message) || "Ocurrió un error.";
}

function formatoFecha(f) {
    return f.toLocaleString("es", { dateStyle: "long", timeStyle: "short" });
}

function aInputLocal(f) {
    const p = (n) => String(n).padStart(2, "0");
    return f.getFullYear() + "-" + p(f.getMonth() + 1) + "-" + p(f.getDate()) +
        "T" + p(f.getHours()) + ":" + p(f.getMinutes());
}

function normalizar(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function enlaceSeguro(s) {
    try {
        const u = new URL(String(s || "").trim());
        return u.protocol === "https:" ? u.href : "";
    } catch (e) { return ""; }
}

function imagenSegura(s) {
    return typeof s === "string" && s.startsWith("data:image/") ? s : "";
}

function leerLS(clave, defecto) {
    try { const v = JSON.parse(localStorage.getItem(clave)); return v == null ? defecto : v; } catch (e) { return defecto; }
}
function guardarLS(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}

function marcarVista(id) {
    const v = leerLS(LS_VISTAS, []);
    if (!v.includes(id)) { v.push(id); guardarLS(LS_VISTAS, v); }
}

function cargarImagen(f) {
    return new Promise((ok, mal) => {
        const url = URL.createObjectURL(f);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); ok(img); };
        img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("No pude leer esa foto.")); };
        img.src = url;
    });
}

// Reduce la foto para que quepa en Firestore (menos de ~650 KB)
async function comprimir(f) {
    const img = await cargarImagen(f);
    let max = 900;
    let calidad = 0.82;
    for (let i = 0; i < 5; i++) {
        const esc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * esc));
        c.height = Math.max(1, Math.round(img.naturalHeight * esc));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/jpeg", calidad);
        if (data.length < 650000) return data;
        max *= 0.8;
        calidad -= 0.08;
    }
    throw new Error("La foto es muy pesada, prueba con otra.");
}

/* ---------- Ventanas (edición y vista previa) ---------- */

const modal = el("div", "modal");
modal.innerHTML = '<div class="modal-caja"><h3 id="m-titulo"></h3><form id="m-form" autocomplete="off" novalidate></form></div>';
document.body.appendChild(modal);
modal.addEventListener("pointerdown", (e) => e.stopPropagation());
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });
function cerrarModal() { modal.classList.remove("visible"); }

const vista = el("div", "modal");
vista.innerHTML =
    '<div class="modal-caja vista-caja"><p class="vista-aviso">👁️ Así lo verá él</p>' +
    '<div class="vista-icono" id="v-icono"></div><h3 id="v-titulo"></h3>' +
    '<div class="cap-contenido" id="v-cont"></div>' +
    '<div class="m-botones"><button type="button" class="m-cancelar" id="v-cerrar">Cerrar</button></div></div>';
document.body.appendChild(vista);
vista.addEventListener("pointerdown", (e) => e.stopPropagation());
vista.addEventListener("click", (e) => { if (e.target === vista) cerrarVista(); });
$("v-cerrar").addEventListener("click", cerrarVista);
function cerrarVista() { vista.classList.remove("visible"); $("v-cont").innerHTML = ""; }

// campos: [{nombre,label,tipo,valor,filas,opciones,solo,etiquetas,rapidas}]
function abrirModal({ titulo, campos, onSubmit }) {
    $("m-titulo").textContent = titulo;
    const form = $("m-form");
    form.innerHTML = "";

    const error = el("p", "m-error");
    const refs = {};

    campos.forEach((c) => {
        const lab = el("label", "m-campo");
        const etiqueta = el("span", "m-label", c.label);
        lab.appendChild(etiqueta);
        let entrada;

        if (c.tipo === "select") {
            entrada = document.createElement("select");
            c.opciones.forEach(([v, t]) => {
                const o = el("option", "", t);
                o.value = v;
                entrada.appendChild(o);
            });
            entrada.name = c.nombre;
            entrada.value = c.valor || c.opciones[0][0];
            lab.appendChild(entrada);
        } else if (c.tipo === "textarea") {
            entrada = document.createElement("textarea");
            entrada.rows = c.filas || 5;
            entrada.name = c.nombre;
            entrada.value = c.valor || "";
            lab.appendChild(entrada);
        } else if (c.tipo === "imagen") {
            entrada = document.createElement("input");
            entrada.type = "hidden";
            entrada.name = c.nombre;
            entrada.value = c.valor || "";
            const miniatura = el("img", "m-vista");
            miniatura.alt = "";
            miniatura.hidden = !entrada.value;
            if (entrada.value) miniatura.src = entrada.value;
            const archivo = document.createElement("input");
            archivo.type = "file";
            archivo.accept = "image/*";
            archivo.hidden = true;
            const boton = el("button", "btn-mini", entrada.value ? "📷 Cambiar foto" : "📷 Elegir foto");
            boton.type = "button";
            boton.addEventListener("click", () => archivo.click());
            archivo.addEventListener("change", async () => {
                const f = archivo.files && archivo.files[0];
                archivo.value = "";
                if (!f) return;
                boton.textContent = "Preparando…";
                error.textContent = "";
                try {
                    const d = await comprimir(f);
                    entrada.value = d;
                    miniatura.src = d;
                    miniatura.hidden = false;
                    boton.textContent = "📷 Cambiar foto";
                } catch (er) {
                    boton.textContent = entrada.value ? "📷 Cambiar foto" : "📷 Elegir foto";
                    error.textContent = er.message || "No pude preparar la foto.";
                }
            });
            lab.append(boton, miniatura, archivo, entrada);
        } else {
            entrada = document.createElement("input");
            entrada.type = c.tipo || "text";
            entrada.name = c.nombre;
            entrada.value = c.valor || "";
            lab.appendChild(entrada);
        }

        if (c.rapidas) {
            const fila = el("div", "m-rapidas");
            c.rapidas.forEach(([txt, fn]) => {
                const b = el("button", "btn-mini", txt);
                b.type = "button";
                b.addEventListener("click", () => { entrada.value = aInputLocal(fn()); });
                fila.appendChild(b);
            });
            lab.appendChild(fila);
        }

        form.appendChild(lab);
        refs[c.nombre] = { c, lab, etiqueta, entrada };
    });

    // Muestra u oculta campos según el tipo elegido
    const selTipo = refs.tipo && refs.tipo.entrada;
    function aplicar() {
        const t = selTipo ? selTipo.value : "";
        Object.values(refs).forEach((r) => {
            if (r.c.solo) r.lab.hidden = !r.c.solo.includes(t);
            if (r.c.etiquetas) r.etiqueta.textContent = r.c.etiquetas[t] || r.c.etiquetas._ || r.c.label;
        });
    }
    if (selTipo) selTipo.addEventListener("change", aplicar);
    aplicar();

    const fila = el("div", "m-botones");
    const ok = el("button", "m-ok", "Guardar");
    ok.type = "submit";
    const cancelar = el("button", "m-cancelar", "Cancelar");
    cancelar.type = "button";
    cancelar.addEventListener("click", cerrarModal);
    fila.append(ok, cancelar);
    form.append(error, fila);

    form.onsubmit = async (e) => {
        e.preventDefault();
        const datos = {};
        campos.forEach((c) => { datos[c.nombre] = form.elements[c.nombre].value; });
        ok.disabled = true;
        error.textContent = "";
        try {
            await onSubmit(datos);
            cerrarModal();
        } catch (er) {
            error.textContent = mensajeError(er);
        }
        ok.disabled = false;
    };

    modal.classList.add("visible");
    modal.querySelector(".modal-caja").scrollTop = 0;
}

/* ---------- Estado ---------- */

let rol = null; // "ella" o "el"
let metas = [];
const textosElla = new Map();   // id -> documento completo (solo para ella)
const leidos = new Map();       // id -> documento completo (lo que ya abrió él)
const respuestas = new Map();   // id -> {reaccion, canjeado, nota, fecha}
const progreso = new Map();     // id -> avance en juegos (rascar, adivinanza, pistas)
const abiertas = new Set();
let desMeta = null;
let desTextos = null;
let desResp = null;

function detener() {
    if (desMeta) { desMeta(); desMeta = null; }
    if (desTextos) { desTextos(); desTextos = null; }
    if (desResp) { desResp(); desResp = null; }
    metas = [];
    textosElla.clear();
    leidos.clear();
    respuestas.clear();
    progreso.clear();
    $("lista").innerHTML = "";
}

onAuthStateChanged(auth, (u) => {
    detener();
    cerrarModal();
    cerrarVista();
    const correo = u ? u.email : null;
    rol = correo === EMAIL_ELLA ? "ella" : correo === EMAIL_EL ? "el" : null;

    document.body.classList.toggle("es-admin", rol === "ella");
    $("acceso").hidden = !!rol;
    $("panel").hidden = !rol;
    $("btn-salir").hidden = !u;

    if (u && !rol) {
        $("acc-error").textContent = "Esta cuenta no tiene acceso a esta página.";
        signOut(auth);
        return;
    }

    if (rol === "ella") {
        $("sor-sub").textContent = "Aquí preparas sorpresas para Thiago 💗";
        $("panel-titulo").textContent = "Tus sorpresas para él";
        $("panel-texto").textContent = "Cartas, fotos, canciones, vales, adivinanzas, tarjetas para rascar… Él ve que existen, pero no puede abrirlas hasta la fecha que elijas.";
        iniciarLista();
    } else if (rol === "el") {
        $("sor-sub").textContent = "Mahuly preparó cosas para ti 💗";
        $("panel-titulo").textContent = "Sorpresas para ti";
        $("panel-texto").textContent = "Se abren cuando llegue su fecha. ¡Paciencia, mi amor! ⏳";
        iniciarLista();
    }
});

$("form-acceso").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("acc-error").textContent = "";
    try {
        await signInWithEmailAndPassword(auth, $("acc-correo").value.trim(), $("acc-clave").value);
    } catch (er) {
        $("acc-error").textContent = mensajeError(er);
    }
});

$("btn-salir").addEventListener("click", () => signOut(auth));

/* ---------- Lista de sorpresas ---------- */

function iniciarLista() {
    desMeta = onSnapshot(query(collection(db, "sorpresas"), orderBy("desbloqueo")), (snap) => {
        metas = snap.docs.map((d) => ({
            id: d.id,
            titulo: d.data().titulo || TITULO_OCULTO,
            tipo: d.data().tipo || "sorpresa",
            desbloqueo: d.data().desbloqueo.toDate()
        }));
        leidos.clear();
        render();
    }, (er) => { $("lista").textContent = mensajeError(er); });

    if (rol === "ella") {
        desTextos = onSnapshot(collection(db, "sorpresas_texto"), (snap) => {
            textosElla.clear();
            snap.forEach((d) => textosElla.set(d.id, d.data()));
            render();
        }, () => {});
    }

    desResp = onSnapshot(collection(db, "sorpresas_resp"), (snap) => {
        respuestas.clear();
        let max = 0;
        snap.forEach((d) => {
            respuestas.set(d.id, d.data());
            const f = d.data().fecha;
            if (f && f.toMillis) max = Math.max(max, f.toMillis());
        });
        respuestas.forEach((_, id) => pintarResp(id));
        // Ella ya vio lo que él respondió (apaga el aviso de la página principal)
        if (rol === "ella" && max) guardarLS(LS_RESP, max);
    }, () => {});
}

async function obtenerTexto(id) {
    if (rol === "ella" && textosElla.has(id)) return textosElla.get(id);
    if (leidos.has(id)) return leidos.get(id);
    const d = await getDoc(doc(db, "sorpresas_texto", id));
    const v = d.exists() ? d.data() : { titulo: "", texto: "" };
    leidos.set(id, v);
    return v;
}

/* ---------- Respuestas de Thiago (reacción, nota, vale canjeado) ---------- */

async function enviarResp(id, datos) {
    try {
        await setDoc(doc(db, "sorpresas_resp", id), { ...datos, fecha: serverTimestamp() }, { merge: true });
        return true;
    } catch (er) {
        avisar(mensajeError(er));
        return false;
    }
}

function llenarResp(zona, id) {
    zona.innerHTML = "";
    const r = respuestas.get(id);
    if (!r) { zona.hidden = true; return; }
    const quien = rol === "ella" ? "Thiago" : "Tú";
    const cuando = r.fecha && r.fecha.toDate ? " el " + formatoFecha(r.fecha.toDate()) : "";
    if (r.canjeado) zona.appendChild(el("p", "", "🎟️ " + quien + (rol === "ella" ? " canjeó" : " canjeaste") + " el vale" + cuando));
    if (r.reaccion) zona.appendChild(el("p", "", (rol === "ella" ? "Thiago reaccionó: " : "Tu reacción: ") + r.reaccion));
    if (r.nota) zona.appendChild(el("p", "resp-nota", "«" + r.nota + "»"));
    zona.hidden = !zona.children.length;
}

function pintarResp(id) {
    document.querySelectorAll('.resp-zona[data-id="' + id + '"]').forEach((z) => llenarResp(z, id));
}

function reacciones(m) {
    const caja = el("div", "reacc");
    caja.appendChild(el("p", "reacc-titulo", "¿Qué te pareció? 💗"));

    const fila = el("div", "reacc-fila");
    REACCIONES.forEach((e) => {
        const b = el("button", "reacc-btn", e);
        b.type = "button";
        b.setAttribute("aria-label", "Reaccionar " + e);
        b.addEventListener("click", async () => {
            const [x, y] = centroDe(b);
            if (await enviarResp(m.id, { reaccion: e })) {
                rafaga(x, y, [e, "💖", "✨"]);
                avisar("Mahuly verá tu reacción 💗");
            }
        });
        fila.appendChild(b);
    });

    const nota = document.createElement("input");
    nota.type = "text";
    nota.className = "reacc-nota";
    nota.maxLength = 140;
    nota.placeholder = "Respóndele algo (opcional)";

    const enviar = el("button", "btn-mini", "Enviar respuesta 💌");
    enviar.type = "button";
    enviar.addEventListener("click", async () => {
        const t = nota.value.trim();
        if (!t) return;
        if (await enviarResp(m.id, { nota: t })) {
            nota.value = "";
            avisar("Respuesta enviada 💗");
        }
    });

    const resp = el("div", "resp-zona");
    resp.dataset.id = m.id;
    llenarResp(resp, m.id);

    caja.append(fila, nota, enviar, resp);
    return caja;
}

/* ---------- Contenido de cada tipo ---------- */

function mensaje(texto) { return el("p", "cap-texto", texto || ""); }

function pintarContenido(zona, v, m, modo) {
    zona.innerHTML = "";
    const tipo = v.tipo || m.tipo || "sorpresa";
    if (tipo === "foto") return cFoto(zona, v);
    if (tipo === "cancion") return cCancion(zona, v);
    if (tipo === "vale") return cVale(zona, v, m, modo);
    if (tipo === "adivinanza") return cAdivinanza(zona, v, m, modo);
    if (tipo === "raspar") return cRaspar(zona, v, m, modo);
    if (tipo === "flores") return cFlores(zona, v);
    if (tipo === "pistas") return cPistas(zona, v, m, modo);
    zona.appendChild(mensaje(v.texto));
}

function cFoto(zona, v) {
    const src = imagenSegura(v.imagen);
    if (src) {
        const marco = el("div", "sor-polaroid");
        const img = el("img");
        img.src = src;
        img.alt = "Foto de Mahuly";
        marco.appendChild(img);
        zona.appendChild(marco);
    }
    zona.appendChild(mensaje(v.texto));
}

function cCancion(zona, v) {
    zona.appendChild(mensaje(v.texto));
    const u = enlaceSeguro(v.enlace);
    if (u) {
        const a = el("a", "btn-extra btn-link", "🎵 Escuchar nuestra canción");
        a.href = u;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        zona.appendChild(a);
    }
}

function cVale(zona, v, m, modo) {
    const t = el("div", "vale");
    t.appendChild(el("div", "vale-sello", "🎟️"));
    const cuerpo = el("div", "vale-cuerpo");
    cuerpo.append(el("small", "", "VALE POR"), el("p", "vale-texto", v.texto || ""));
    t.appendChild(cuerpo);
    zona.appendChild(t);

    if (modo !== "el") {
        zona.appendChild(el("p", "cap-nota", "Él podrá canjearlo con un botón y a ti te llega el aviso 💗"));
        return;
    }
    const r = respuestas.get(m.id);
    const canjeado = !!(r && r.canjeado);
    const b = el("button", "btn-extra", canjeado ? "✓ Canjeado" : "Canjear vale 🎟️");
    b.type = "button";
    b.disabled = canjeado;
    b.addEventListener("click", async () => {
        b.disabled = true;
        const [x, y] = centroDe(b);
        if (await enviarResp(m.id, { canjeado: true })) {
            b.textContent = "✓ Canjeado";
            rafaga(x, y, ["🎟️", "💖", "✨", "🎉"]);
            avisar("¡Vale canjeado! Mahuly lo verá 💗");
        } else {
            b.disabled = false;
        }
    });
    zona.appendChild(b);
}

function cAdivinanza(zona, v, m, modo) {
    const persistir = modo === "el";
    zona.appendChild(el("p", "adiv-pregunta", v.pregunta || ""));
    const revela = el("div", "adiv-revela");

    if (persistir && progreso.get(m.id) === "ok") {
        zona.appendChild(revela);
        revela.appendChild(mensaje(v.texto));
        return;
    }

    const form = el("form", "adiv-form");
    const entrada = document.createElement("input");
    entrada.type = "text";
    entrada.className = "reacc-nota";
    entrada.placeholder = "Tu respuesta…";
    entrada.autocomplete = "off";
    const boton = el("button", "btn-extra", "Probar 💗");
    boton.type = "submit";
    const msg = el("p", "adiv-msg");
    form.append(entrada, boton, msg);
    zona.append(form, revela);

    const validas = String(v.respuesta || "").split("/").map(normalizar).filter(Boolean);
    let fallos = 0;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const dicho = normalizar(entrada.value);
        if (!dicho) return;
        if (validas.includes(dicho)) {
            if (persistir) progreso.set(m.id, "ok");
            form.remove();
            revela.appendChild(el("p", "adiv-ok", "¡Correcto, mi amor! 🎉"));
            revela.appendChild(mensaje(v.texto));
            const [x, y] = centroDe(revela);
            rafaga(x, y, ["🎉", "💖", "✨", "💕"]);
        } else {
            fallos++;
            msg.textContent = "Mmm, esa no es 🙈 Intenta otra vez";
            if (fallos >= 2 && v.pista) msg.textContent += "\n💡 Pista: " + v.pista;
            entrada.select();
        }
    });
}

function cRaspar(zona, v, m, modo) {
    const persistir = modo === "el";
    if (persistir && progreso.get(m.id) === "ok") {
        zona.appendChild(mensaje(v.texto));
        return;
    }
    zona.appendChild(el("p", "cap-nota", "Rasca con el dedo para descubrir tu sorpresa ✨"));
    const caja = el("div", "raspa");
    caja.appendChild(el("p", "raspa-texto", v.texto || ""));
    const c = document.createElement("canvas");
    c.className = "raspa-canvas";
    caja.appendChild(c);
    zona.appendChild(caja);

    requestAnimationFrame(() => {
        const w = Math.max(1, Math.round(caja.clientWidth));
        const h = Math.max(1, Math.round(caja.clientHeight));
        c.width = w;
        c.height = h;
        const x = c.getContext("2d");
        const g = x.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#ffb3d1");
        g.addColorStop(0.5, "#e9b6f2");
        g.addColorStop(1, "#ff8fc0");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        x.fillStyle = "rgba(255,255,255,0.55)";
        x.font = "22px sans-serif";
        x.textAlign = "center";
        x.textBaseline = "middle";
        for (let yy = 22; yy < h; yy += 44) {
            for (let xx = (yy / 44) % 2 ? 22 : 44; xx < w; xx += 44) x.fillText("✨", xx, yy);
        }
        x.fillStyle = "#fff";
        x.font = "700 20px 'Poppins', sans-serif";
        x.fillText("Rasca aquí 💗", w / 2, h / 2);

        let rascando = false;
        let toques = 0;
        let listo = false;

        function borrar(e) {
            const r = c.getBoundingClientRect();
            const px = (e.clientX - r.left) * (c.width / r.width);
            const py = (e.clientY - r.top) * (c.height / r.height);
            x.globalCompositeOperation = "destination-out";
            x.beginPath();
            x.arc(px, py, 24, 0, Math.PI * 2);
            x.fill();
            if (++toques % 5 === 0) revisar();
        }

        function revisar() {
            if (listo) return;
            const d = x.getImageData(0, 0, c.width, c.height).data;
            let vacios = 0;
            let total = 0;
            for (let i = 3; i < d.length; i += 64) { total++; if (d[i] === 0) vacios++; }
            if (total && vacios / total > 0.5) terminar();
        }

        function terminar() {
            listo = true;
            if (persistir) progreso.set(m.id, "ok");
            c.classList.add("raspa-fuera");
            setTimeout(() => c.remove(), 700);
            const [cx, cy] = centroDe(caja);
            rafaga(cx, cy, ["✨", "💖", "🎉", "💕"]);
        }

        c.addEventListener("pointerdown", (e) => { rascando = true; c.setPointerCapture(e.pointerId); borrar(e); });
        c.addEventListener("pointermove", (e) => { if (rascando) borrar(e); });
        c.addEventListener("pointerup", () => { rascando = false; revisar(); });
        c.addEventListener("pointercancel", () => { rascando = false; });
    });
}

function cFlores(zona, v) {
    const ramo = el("div", "ramo");
    ["🌷", "🌹", "💐", "🌸", "🌻"].forEach((f, i) => {
        const s = el("span", "ramo-flor", f);
        s.style.animationDelay = i * 0.35 + "s";
        ramo.appendChild(s);
    });
    zona.appendChild(ramo);
    if (!reducir) {
        const lluvia = el("div", "petalos");
        lluvia.setAttribute("aria-hidden", "true");
        const pet = ["🌸", "🌺", "🌷", "💮"];
        for (let i = 0; i < 14; i++) {
            const p = el("span", "petalo", pet[i % pet.length]);
            p.style.left = Math.random() * 100 + "%";
            p.style.animationDelay = Math.random() * 5 + "s";
            p.style.animationDuration = 5 + Math.random() * 4 + "s";
            lluvia.appendChild(p);
        }
        zona.appendChild(lluvia);
    }
    zona.appendChild(mensaje(v.texto));
}

function cPistas(zona, v, m, modo) {
    const persistir = modo === "el";
    const partes = String(v.texto || "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    if (!partes.length) { zona.appendChild(mensaje(v.texto)); return; }

    let paso = persistir ? Math.min(partes.length - 1, Number(progreso.get(m.id)) || 0) : 0;
    const caja = el("div", "pistas");
    zona.appendChild(caja);

    function pintar() {
        caja.innerHTML = "";
        for (let i = 0; i <= paso; i++) {
            const it = el("div", "pista-item");
            const ultima = partes.length > 1 && i === partes.length - 1;
            it.append(el("span", "pista-num", ultima ? "🏁" : String(i + 1)), el("p", "", partes[i]));
            caja.appendChild(it);
        }
        if (paso < partes.length - 1) {
            const b = el("button", "btn-extra", "Siguiente pista ➜");
            b.type = "button";
            b.addEventListener("click", () => {
                paso++;
                if (persistir) progreso.set(m.id, paso);
                pintar();
                if (paso === partes.length - 1) {
                    const [x, y] = centroDe(caja);
                    rafaga(x, y, ["🏁", "✨", "💖", "🎉"]);
                }
            });
            caja.appendChild(b);
        }
    }
    pintar();
}

/* ---------- Abrir (Thiago) y vista previa (Mahuly) ---------- */

async function abrirSorpresa(m, tarjeta, boton, titulo, zona, silencioso) {
    boton.disabled = true;
    try {
        const v = await obtenerTexto(m.id);
        if (v.titulo) titulo.textContent = v.titulo;
        const ti = TIPOS[v.tipo || m.tipo] || TIPOS.sorpresa;
        const icono = tarjeta.querySelector(".cap-icono");
        if (icono) icono.textContent = ti.icono[1];
        if (!tarjeta.querySelector(".tipo-chip")) {
            titulo.after(el("span", "tipo-chip", ti.nombre));
        }
        pintarContenido(zona, v, m, "el");
        zona.appendChild(reacciones(m));
        abiertas.add(m.id);
        marcarVista(m.id);
        boton.hidden = true;
        if (!silencioso) {
            const [x, y] = centroDe(tarjeta);
            rafaga(x, y, ["🎉", "💖", "✨", "💕"]);
        }
    } catch (er) {
        zona.textContent = "Todavía no se puede abrir, mi amor 💗 (revisa que la hora de tu celular esté bien)";
        boton.disabled = false;
    }
}

function previsualizar(m) {
    const real = textosElla.get(m.id);
    if (!real) { avisar("Todavía estoy cargando, intenta otra vez 💗"); return; }
    const ti = TIPOS[real.tipo || m.tipo] || TIPOS.sorpresa;
    $("v-icono").textContent = ti.icono[1];
    $("v-titulo").textContent = real.titulo || m.titulo;
    pintarContenido($("v-cont"), real, m, "preview");
    vista.classList.add("visible");
    vista.querySelector(".modal-caja").scrollTop = 0;
}

/* ---------- Dibujar la lista ---------- */

function resumenDe(real) {
    const caja = el("div", "sor-resumen");
    const src = imagenSegura(real.imagen);
    if (src) {
        const img = el("img", "sor-mini");
        img.src = src;
        img.alt = "";
        caja.appendChild(img);
    }
    let texto = real.texto || "";
    if (real.tipo === "adivinanza") texto = "❓ " + (real.pregunta || "");
    if (real.tipo === "cancion" && !texto) texto = "🔗 " + (real.enlace || "");
    texto = texto.replace(/\s+/g, " ").trim();
    if (texto) caja.appendChild(el("p", "", texto.length > 110 ? texto.slice(0, 110) + "…" : texto));
    return caja;
}

function render() {
    const cont = $("lista");
    cont.innerHTML = "";

    if (!metas.length) {
        cont.appendChild(el("p", "extra-estado",
            rol === "ella" ? "Aún no has preparado ninguna sorpresa. ¡Anímate! 💌" : "Todavía no hay sorpresas, pero pronto 💌"));
        return;
    }

    metas.forEach((m) => {
        const lista = Date.now() >= m.desbloqueo.getTime();
        const real = rol === "ella" ? textosElla.get(m.id) : null;
        const ti = TIPOS[(real && real.tipo) || m.tipo] || TIPOS.sorpresa;
        const oculto = m.titulo === TITULO_OCULTO && !real;

        const tarjeta = el("article", "cap " + (lista ? "lista" : "bloqueada"));
        tarjeta.dataset.t = String(m.desbloqueo.getTime());
        tarjeta.dataset.id = m.id;

        const titulo = el("h3", "cap-titulo", (real && real.titulo) || m.titulo);

        tarjeta.append(el("div", "cap-icono", lista && rol === "ella" ? ti.icono[1] : lista ? "🎁" : ti.icono[0]), titulo);
        if (rol === "ella" || !oculto) tarjeta.appendChild(el("span", "tipo-chip", ti.nombre));
        tarjeta.appendChild(el("p", "cap-fecha", "Se abre el " + formatoFecha(m.desbloqueo)));

        if (!lista) {
            const cuenta = el("div", "cap-cuenta");
            ["dias", "horas", "min", "seg"].forEach((u) => {
                const caja = el("div");
                const num = el("span", "", "0");
                num.dataset.u = u;
                caja.append(num, el("small", "", u));
                cuenta.appendChild(caja);
            });
            tarjeta.appendChild(cuenta);
        }

        if (rol === "ella") {
            if (real) tarjeta.appendChild(resumenDe(real));
            tarjeta.appendChild(el("p", "cap-nota",
                lista ? "Thiago ya puede abrirla 💗" : "Thiago todavía no puede abrirla 🙈"));

            const resp = el("div", "resp-zona");
            resp.dataset.id = m.id;
            llenarResp(resp, m.id);
            tarjeta.appendChild(resp);

            const admin = el("div", "cap-admin solo-admin");
            const bVer = el("button", "btn-mini", "👁️ Vista previa");
            const bEditar = el("button", "btn-mini", "✏️ Editar");
            const bBorrar = el("button", "btn-mini", "🗑️ Eliminar");
            [bVer, bEditar, bBorrar].forEach((b) => { b.type = "button"; });
            bVer.addEventListener("click", () => previsualizar(m));
            bEditar.addEventListener("click", () => editar(m));
            bBorrar.addEventListener("click", () => borrar(m));
            admin.append(bVer, bEditar, bBorrar);
            tarjeta.appendChild(admin);
        } else if (lista) {
            const zona = el("div", "cap-contenido");
            const boton = el("button", "btn-extra", "Abrir sorpresa 💗");
            boton.type = "button";
            boton.addEventListener("click", () => abrirSorpresa(m, tarjeta, boton, titulo, zona, false));
            tarjeta.append(boton, zona);
            if (abiertas.has(m.id)) abrirSorpresa(m, tarjeta, boton, titulo, zona, true);
        }

        cont.appendChild(tarjeta);
    });
}

// Cuenta regresiva en vivo
setInterval(() => {
    const ahora = Date.now();
    let recargar = false;

    document.querySelectorAll(".cap.bloqueada").forEach((t) => {
        const resta = Number(t.dataset.t) - ahora;
        if (resta <= 0) { recargar = true; return; }
        const v = {
            dias: Math.floor(resta / 86400000),
            horas: Math.floor((resta % 86400000) / 3600000),
            min: Math.floor((resta % 3600000) / 60000),
            seg: Math.floor((resta % 60000) / 1000)
        };
        t.querySelectorAll("[data-u]").forEach((s) => { s.textContent = v[s.dataset.u]; });
    });

    if (recargar) render();
}, 1000);

/* ---------- Crear, editar y borrar (solo ella) ---------- */

const EXIGE_TEXTO = ["carta", "vale", "adivinanza", "raspar", "flores", "pistas", "sorpresa", "capsula", "secreto"];

async function guardar(id, d) {
    const fecha = new Date(d.fecha);
    if (isNaN(fecha.getTime())) throw new Error("La fecha no es válida.");
    const ts = Timestamp.fromDate(fecha);

    const tipo = TIPOS[d.tipo] ? d.tipo : "sorpresa";
    const titulo = d.titulo.trim() || "Sorpresa";
    const oculto = d.ocultar === "si";
    const texto = String(d.texto || "");

    if (EXIGE_TEXTO.includes(tipo) && !texto.trim()) throw new Error("Escribe el mensaje.");

    const contenido = { titulo, tipo, texto, desbloqueo: ts };

    if (tipo === "foto") {
        if (!imagenSegura(d.imagen)) throw new Error("Elige una foto.");
        contenido.imagen = d.imagen;
    }
    if (tipo === "cancion") {
        const u = enlaceSeguro(d.enlace);
        if (!u) throw new Error("Pega un enlace que empiece con https://");
        contenido.enlace = u;
    }
    if (tipo === "adivinanza") {
        if (!d.pregunta.trim() || !d.respuesta.trim()) throw new Error("Escribe la pregunta y la respuesta.");
        contenido.pregunta = d.pregunta.trim();
        contenido.respuesta = d.respuesta.trim();
        contenido.pista = d.pista.trim();
    }

    const lote = writeBatch(db);
    // Esto lo puede ver Thiago desde el principio (si se oculta, ni el tipo)
    lote.set(doc(db, "sorpresas", id), {
        titulo: oculto ? TITULO_OCULTO : titulo,
        tipo: oculto ? "sorpresa" : tipo,
        desbloqueo: ts
    });
    // Esto solo lo puede leer Thiago cuando llegue la fecha
    lote.set(doc(db, "sorpresas_texto", id), contenido);
    await lote.commit();
}

function proximoMesversario() {
    const n = new Date();
    let f = new Date(n.getFullYear(), n.getMonth(), 28, 10, 23);
    if (f <= n) f = new Date(n.getFullYear(), n.getMonth() + 1, 28, 10, 23);
    return f;
}

const RAPIDAS = [
    ["⚡ Ahora (probar)", () => new Date()],
    ["🌅 Mañana 8:00", () => { const f = new Date(); f.setDate(f.getDate() + 1); f.setHours(8, 0, 0, 0); return f; }],
    ["📅 En 1 semana", () => { const f = new Date(Date.now() + 7 * 86400000); f.setHours(9, 0, 0, 0); return f; }],
    ["💞 Próximo mesversario", proximoMesversario]
];

function campos(v) {
    return [
        { nombre: "tipo", label: "¿Qué quieres crear?", tipo: "select", valor: v.tipo || "carta",
          opciones: Object.entries(TIPOS).map(([k, t]) => [k, t.nombre]) },
        { nombre: "titulo", label: "Título", valor: v.titulo || "" },
        { nombre: "ocultar", label: "¿Ocultar el título y el tipo hasta que se abra?", tipo: "select", valor: v.ocultar || "no",
          opciones: [["no", "No, que lo vea"], ["si", "Sí, que sea sorpresa total"]] },
        { nombre: "fecha", label: "Se abre el", tipo: "datetime-local", valor: v.fecha, rapidas: RAPIDAS },
        { nombre: "pregunta", label: "Pregunta o adivinanza", tipo: "textarea", filas: 3, valor: v.pregunta || "", solo: ["adivinanza"] },
        { nombre: "respuesta", label: "Respuesta (si hay varias válidas, sepáralas con /)", valor: v.respuesta || "", solo: ["adivinanza"] },
        { nombre: "pista", label: "Pista (aparece tras 2 intentos fallidos)", valor: v.pista || "", solo: ["adivinanza"] },
        { nombre: "imagen", label: "Foto", tipo: "imagen", valor: v.imagen || "", solo: ["foto"] },
        { nombre: "enlace", label: "Enlace de la canción (YouTube, Spotify…)", tipo: "url", valor: v.enlace || "", solo: ["cancion"] },
        { nombre: "texto", label: "Mensaje", tipo: "textarea", filas: 8, valor: v.texto || "",
          etiquetas: {
              _: "Mensaje",
              foto: "Dedicatoria de la foto",
              cancion: "¿Por qué esta canción? (mensaje)",
              vale: "¿De qué es el vale? (ej. Un abrazo de 10 minutos)",
              adivinanza: "Mensaje que se revela al acertar",
              raspar: "Mensaje escondido bajo la tarjeta",
              flores: "Mensaje que acompaña el ramo",
              pistas: "Pistas (separa cada una con una línea en blanco; la última es el premio)"
          } }
    ];
}

$("btn-nueva").addEventListener("click", () => {
    const manana = new Date(Date.now() + 86400000);
    abrirModal({
        titulo: "Nueva sorpresa",
        campos: campos({ fecha: aInputLocal(manana) }),
        onSubmit: (d) => guardar(doc(collection(db, "sorpresas")).id, d)
    });
});

function editar(m) {
    const real = textosElla.get(m.id);
    if (!real) { avisar("Todavía estoy cargando, intenta otra vez 💗"); return; }
    abrirModal({
        titulo: "Editar sorpresa",
        campos: campos({
            ...real,
            tipo: real.tipo || m.tipo,
            ocultar: m.titulo === TITULO_OCULTO && real.titulo !== TITULO_OCULTO ? "si" : "no",
            fecha: aInputLocal(m.desbloqueo)
        }),
        onSubmit: (d) => guardar(m.id, d)
    });
}

async function borrar(m) {
    if (!confirm("¿Eliminar esta sorpresa?")) return;
    try {
        const lote = writeBatch(db);
        lote.delete(doc(db, "sorpresas", m.id));
        lote.delete(doc(db, "sorpresas_texto", m.id));
        lote.delete(doc(db, "sorpresas_resp", m.id));
        await lote.commit();
    } catch (er) { avisar(mensajeError(er)); }
}
