/* =========================================================
   Sorpresas de Mahuly  ->  js/sorpresas.js  (type="module")
   - Mahuly crea, edita y borra sorpresas para Thiago.
   - Thiago ve que existen (con cuenta regresiva) pero NO puede leer
     el mensaje hasta la fecha: lo bloquean las reglas de Firestore.
   ========================================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore, doc, getDoc, collection, onSnapshot, query, orderBy,
    Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
// Usa tu archivo de configuración existente (cambia la ruta si está en otro lugar)
import * as cfg from "./firebase-config.js";

/* ---------- Configuración ---------- */

const EMAIL_ELLA = "mahulyr@gmail.com";                // crea las sorpresas
const EMAIL_EL = "thiagoolartejimenez@gmail.com";      // las recibe

const TITULO_OCULTO = "Una sorpresa 🎁";
const ICONOS = {
    capsula: ["🔒", "💌"],
    secreto: ["🤫", "💗"],
    sorpresa: ["🎁", "🎉"]
};

/* ---------- Firebase ---------- */

const configExistente = cfg.firebaseConfig || cfg.config || cfg.default;
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

// Fondo según la hora (mismo que la página principal)
(function () {
    const h = new Date().getHours();
    const m = h >= 5 && h < 9 ? "amanecer" : h >= 9 && h < 17 ? "dia" : h >= 17 && h < 20 ? "tarde" : "noche";
    document.documentElement.dataset.momento = m;
})();

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

/* ---------- Ventana de edición ---------- */

const modal = el("div", "modal");
modal.innerHTML = '<div class="modal-caja"><h3 id="m-titulo"></h3><form id="m-form" autocomplete="off"></form></div>';
document.body.appendChild(modal);
modal.addEventListener("pointerdown", (e) => e.stopPropagation());
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });
function cerrarModal() { modal.classList.remove("visible"); }

// campos: [{nombre, label, tipo: text|textarea|datetime-local|select, valor, filas, opciones:[[valor,texto]]}]
function abrirModal({ titulo, campos, onSubmit }) {
    $("m-titulo").textContent = titulo;
    const form = $("m-form");
    form.innerHTML = "";

    campos.forEach((c) => {
        const lab = el("label", "", c.label);
        let entrada;
        if (c.tipo === "select") {
            entrada = document.createElement("select");
            c.opciones.forEach(([v, t]) => {
                const o = el("option", "", t);
                o.value = v;
                entrada.appendChild(o);
            });
        } else if (c.tipo === "textarea") {
            entrada = document.createElement("textarea");
            entrada.rows = c.filas || 5;
        } else {
            entrada = document.createElement("input");
            entrada.type = c.tipo || "text";
        }
        entrada.name = c.nombre;
        entrada.value = c.valor || "";
        lab.appendChild(entrada);
        form.appendChild(lab);
    });

    const error = el("p", "m-error");
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
    const primero = form.querySelector("input, textarea");
    if (primero) primero.focus();
}

/* ---------- Sesión ---------- */

let rol = null; // "ella" o "el"
let metas = [];
const textosElla = new Map(); // id -> {titulo, texto}  (solo para ella)
const leidos = new Map();     // id -> {titulo, texto}  (lo que ya abrió él)
const abiertas = new Set();
let desMeta = null;
let desTextos = null;

function detener() {
    if (desMeta) { desMeta(); desMeta = null; }
    if (desTextos) { desTextos(); desTextos = null; }
    metas = [];
    textosElla.clear();
    leidos.clear();
    $("lista").innerHTML = "";
}

onAuthStateChanged(auth, (u) => {
    detener();
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
        $("panel-texto").textContent = "Él ve que existen, pero no puede leer el mensaje hasta la fecha que elijas.";
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
}

async function obtenerTexto(id) {
    if (rol === "ella" && textosElla.has(id)) return textosElla.get(id);
    if (leidos.has(id)) return leidos.get(id);
    const d = await getDoc(doc(db, "sorpresas_texto", id));
    const v = d.exists() ? d.data() : { titulo: "", texto: "" };
    leidos.set(id, v);
    return v;
}

async function abrirSorpresa(m, tarjeta, boton, titulo, zona) {
    boton.disabled = true;
    try {
        const v = await obtenerTexto(m.id);
        if (v.titulo) titulo.textContent = v.titulo;
        zona.textContent = v.texto;
        abiertas.add(m.id);
        boton.hidden = true;
        const [x, y] = centroDe(tarjeta);
        rafaga(x, y, ["🎉", "💖", "✨", "💕"]);
    } catch (er) {
        zona.textContent = "Todavía no se puede abrir, mi amor 💗 (revisa que la hora de tu celular esté bien)";
        boton.disabled = false;
    }
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
        const [iconoBloq, iconoAbierto] = ICONOS[m.tipo] || ICONOS.sorpresa;
        const tarjeta = el("article", "cap " + (lista ? "lista" : "bloqueada"));
        tarjeta.dataset.t = String(m.desbloqueo.getTime());

        const real = rol === "ella" ? textosElla.get(m.id) : null;
        const titulo = el("h3", "cap-titulo", (real && real.titulo) || m.titulo);

        tarjeta.append(
            el("div", "cap-icono", lista ? iconoAbierto : iconoBloq),
            titulo,
            el("p", "cap-fecha", "Se abre el " + formatoFecha(m.desbloqueo))
        );

        const zona = el("p", "cap-texto");

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
            // Ella siempre ve su propio mensaje
            zona.textContent = real ? real.texto : "";
            tarjeta.appendChild(zona);
            tarjeta.appendChild(el("p", "cap-nota",
                lista ? "Thiago ya puede abrirla 💗" : "Thiago todavía no puede leerla 🙈"));
        } else if (lista) {
            const boton = el("button", "btn-extra", "Abrir sorpresa 💗");
            boton.type = "button";
            boton.addEventListener("click", () => abrirSorpresa(m, tarjeta, boton, titulo, zona));
            tarjeta.append(boton, zona);
            if (abiertas.has(m.id)) abrirSorpresa(m, tarjeta, boton, titulo, zona);
        }

        // Botones solo para ella
        const admin = el("div", "cap-admin solo-admin");
        const bEditar = el("button", "btn-mini", "✏️ Editar");
        const bBorrar = el("button", "btn-mini", "🗑️ Eliminar");
        bEditar.type = "button";
        bBorrar.type = "button";
        bEditar.addEventListener("click", () => editar(m));
        bBorrar.addEventListener("click", () => borrar(m));
        admin.append(bEditar, bBorrar);
        tarjeta.appendChild(admin);

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

async function guardar(id, d) {
    const fecha = new Date(d.fecha);
    if (isNaN(fecha.getTime())) throw new Error("La fecha no es válida.");
    const ts = Timestamp.fromDate(fecha);
    const titulo = d.titulo.trim() || "Sorpresa";
    const oculto = d.ocultar === "si";

    const lote = writeBatch(db);
    // Esto lo puede ver Thiago desde el principio
    lote.set(doc(db, "sorpresas", id), {
        titulo: oculto ? TITULO_OCULTO : titulo,
        tipo: d.tipo,
        desbloqueo: ts
    });
    // Esto solo lo puede leer Thiago cuando llegue la fecha
    lote.set(doc(db, "sorpresas_texto", id), { titulo, texto: d.texto, desbloqueo: ts });
    await lote.commit();
}

const CAMPOS_TIPO = {
    nombre: "tipo", label: "Tipo", tipo: "select",
    opciones: [["sorpresa", "🎁 Sorpresa"], ["capsula", "🔒 Cápsula del tiempo"], ["secreto", "🤫 Mensaje secreto"]]
};
const CAMPOS_OCULTAR = {
    nombre: "ocultar", label: "¿Ocultar el título hasta que se abra?", tipo: "select",
    opciones: [["no", "No, que vea el título"], ["si", "Sí, que sea una sorpresa total"]]
};

$("btn-nueva").addEventListener("click", () => {
    const manana = new Date(Date.now() + 86400000);
    abrirModal({
        titulo: "Nueva sorpresa",
        campos: [
            { nombre: "titulo", label: "Título" },
            { ...CAMPOS_TIPO, valor: "sorpresa" },
            { ...CAMPOS_OCULTAR, valor: "no" },
            { nombre: "fecha", label: "Se abre el", tipo: "datetime-local", valor: aInputLocal(manana) },
            { nombre: "texto", label: "Mensaje", tipo: "textarea", filas: 8 }
        ],
        onSubmit: (d) => guardar(doc(collection(db, "sorpresas")).id, d)
    });
});

function editar(m) {
    const real = textosElla.get(m.id) || { titulo: m.titulo, texto: "" };
    abrirModal({
        titulo: "Editar sorpresa",
        campos: [
            { nombre: "titulo", label: "Título", valor: real.titulo },
            { ...CAMPOS_TIPO, valor: m.tipo },
            { ...CAMPOS_OCULTAR, valor: m.titulo === TITULO_OCULTO && real.titulo !== TITULO_OCULTO ? "si" : "no" },
            { nombre: "fecha", label: "Se abre el", tipo: "datetime-local", valor: aInputLocal(m.desbloqueo) },
            { nombre: "texto", label: "Mensaje", tipo: "textarea", valor: real.texto, filas: 8 }
        ],
        onSubmit: (d) => guardar(m.id, d)
    });
}

async function borrar(m) {
    if (!confirm("¿Eliminar esta sorpresa?")) return;
    try {
        const lote = writeBatch(db);
        lote.delete(doc(db, "sorpresas", m.id));
        lote.delete(doc(db, "sorpresas_texto", m.id));
        await lote.commit();
    } catch (er) { avisar(mensajeError(er)); }
}
