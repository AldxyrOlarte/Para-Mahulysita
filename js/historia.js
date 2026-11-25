/* =========================================================
   Nuestra historia (línea de tiempo)  ->  js/historia.js  (type="module")
   Los dos (Mahuly y Thiago) pueden agregar, editar y borrar recuerdos.
   Cada recuerdo: fecha, título, texto y una foto opcional.
   ========================================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

let cfg = {};
for (const ruta of ["./firebase-config.js", "../firebase-config.js", "../pag/firebase-config.js"]) {
    try { cfg = await import(ruta); break; } catch (e) { /* prueba la siguiente ruta */ }
}

const configExistente = cfg.firebaseConfig || cfg.config || cfg.default;
if (!(cfg.db || cfg.app || (configExistente && configExistente.apiKey))) {
    const e = document.getElementById("acc-error");
    if (e) e.textContent = "No encontré firebase-config.js en la carpeta js/.";
    throw new Error("historia.js: falta firebase-config.js");
}

const EMAIL_ELLA = "mahulyr@gmail.com";
const EMAIL_EL = "thiagoolartejimenez@gmail.com";
const INICIO = new Date(2026, 4, 28); // 28 de mayo de 2026

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

function mensajeError(er) {
    const c = er && er.code ? er.code : "";
    if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") {
        return "Correo o contraseña incorrectos.";
    }
    if (c === "permission-denied") return "Sin permiso (faltan publicar las reglas de Firestore).";
    return (er && er.message) || "Ocurrió un error.";
}

function fechaBonita(k) {
    const [a, m, d] = String(k).split("-").map(Number);
    if (!a || !m || !d) return k;
    return new Date(a, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

function imagenSegura(s) {
    return typeof s === "string" && s.startsWith("data:image/") ? s : "";
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

// Reduce la foto para que quepa en Firestore (menos de ~350 KB)
async function comprimir(f) {
    const img = await cargarImagen(f);
    let max = 900;
    let calidad = 0.8;
    for (let i = 0; i < 5; i++) {
        const esc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * esc));
        c.height = Math.max(1, Math.round(img.naturalHeight * esc));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/jpeg", calidad);
        if (data.length < 350000) return data;
        max *= 0.8;
        calidad -= 0.08;
    }
    throw new Error("La foto es muy pesada, prueba con otra.");
}

/* ---------- Ventana de edición ---------- */

const modal = el("div", "modal");
modal.innerHTML = '<div class="modal-caja"><h3 id="m-titulo"></h3><form id="m-form" autocomplete="off" novalidate></form></div>';
document.body.appendChild(modal);
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });
function cerrarModal() { modal.classList.remove("visible"); }

function abrirModal(titulo, v, onSubmit) {
    $("m-titulo").textContent = titulo;
    const form = $("m-form");
    form.innerHTML = "";
    const error = el("p", "m-error");

    const campo = (etiqueta, nombre, tipo, valor, extra) => {
        const lab = el("label", "m-campo");
        lab.appendChild(el("span", "m-label", etiqueta));
        const e = document.createElement(tipo === "textarea" ? "textarea" : "input");
        if (tipo !== "textarea") e.type = tipo;
        else e.rows = 6;
        e.name = nombre;
        e.value = valor || "";
        if (extra && extra.max) e.maxLength = extra.max;
        lab.appendChild(e);
        form.appendChild(lab);
        return e;
    };

    campo("Fecha del recuerdo", "fecha", "date", v.fecha);
    campo("Título", "titulo", "text", v.titulo, { max: 80 });
    campo("Cuéntalo", "texto", "textarea", v.texto, { max: 600 });

    // Foto opcional
    const lab = el("label", "m-campo");
    lab.appendChild(el("span", "m-label", "Foto (opcional)"));
    const oculto = document.createElement("input");
    oculto.type = "hidden";
    oculto.name = "imagen";
    oculto.value = v.imagen || "";
    const mini = el("img", "m-vista");
    mini.alt = "";
    mini.hidden = !oculto.value;
    if (oculto.value) mini.src = oculto.value;
    const archivo = document.createElement("input");
    archivo.type = "file";
    archivo.accept = "image/*";
    archivo.hidden = true;
    const boton = el("button", "btn-mini", oculto.value ? "📷 Cambiar foto" : "📷 Elegir foto");
    boton.type = "button";
    boton.addEventListener("click", () => archivo.click());
    const quitar = el("button", "btn-mini", "Quitar foto");
    quitar.type = "button";
    quitar.hidden = !oculto.value;
    quitar.addEventListener("click", () => {
        oculto.value = "";
        mini.hidden = true;
        quitar.hidden = true;
        boton.textContent = "📷 Elegir foto";
    });
    archivo.addEventListener("change", async () => {
        const f = archivo.files && archivo.files[0];
        archivo.value = "";
        if (!f) return;
        boton.textContent = "Preparando…";
        error.textContent = "";
        try {
            const d = await comprimir(f);
            oculto.value = d;
            mini.src = d;
            mini.hidden = false;
            quitar.hidden = false;
            boton.textContent = "📷 Cambiar foto";
        } catch (er) {
            boton.textContent = oculto.value ? "📷 Cambiar foto" : "📷 Elegir foto";
            error.textContent = er.message || "No pude preparar la foto.";
        }
    });
    lab.append(boton, quitar, mini, archivo, oculto);
    form.appendChild(lab);

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
        const datos = {
            fecha: form.elements.fecha.value,
            titulo: form.elements.titulo.value.trim(),
            texto: form.elements.texto.value.trim(),
            imagen: form.elements.imagen.value
        };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) { error.textContent = "Elige la fecha."; return; }
        if (!datos.titulo) { error.textContent = "Ponle un título."; return; }
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

/* ---------- Foto en grande ---------- */

const visor = el("div", "his-visor");
const visorImg = el("img");
visorImg.alt = "Foto del recuerdo";
visor.appendChild(visorImg);
document.body.appendChild(visor);
visor.addEventListener("click", () => visor.classList.remove("visible"));

/* ---------- Sesión ---------- */

let rol = null;
let hitos = [];
let desuscribir = null;
let observador = null;

onAuthStateChanged(auth, (u) => {
    if (desuscribir) { desuscribir(); desuscribir = null; }
    hitos = [];
    $("linea").innerHTML = "";
    cerrarModal();
    const correo = u ? u.email : null;
    rol = correo === EMAIL_ELLA ? "ella" : correo === EMAIL_EL ? "el" : null;

    $("acceso").hidden = !!rol;
    $("panel").hidden = !rol;
    $("btn-salir").hidden = !u;

    if (u && !rol) {
        $("acc-error").textContent = "Esta cuenta no tiene acceso a esta página.";
        signOut(auth);
        return;
    }
    if (!rol) return;

    desuscribir = onSnapshot(query(collection(db, "historia"), orderBy("fecha")), (snap) => {
        hitos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        pintar();
    }, (er) => { $("linea").textContent = mensajeError(er); });
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

/* ---------- Dibujar la línea ---------- */

function pintar() {
    const dias = Math.max(0, Math.floor((Date.now() - INICIO.getTime()) / 86400000));
    $("his-resumen").textContent = hitos.length
        ? hitos.length + (hitos.length === 1 ? " recuerdo guardado" : " recuerdos guardados") + " · " + dias + " días juntos 💕"
        : "Aquí van a vivir todos nuestros momentos 💕";

    const linea = $("linea");
    linea.innerHTML = "";
    if (observador) observador.disconnect();

    if (!hitos.length) {
        const vacio = el("div", "hito visible");
        vacio.appendChild(el("p", "his-vacio", "Todavía no hay recuerdos. ¡Empieza con el día en que todo comenzó! 💗"));
        const b = el("button", "btn-mini", "✨ Agregar el 28 de mayo de 2026");
        b.type = "button";
        b.addEventListener("click", () => nuevo({ fecha: "2026-05-28", titulo: "El día que empezó todo", texto: "" }));
        vacio.querySelector(".his-vacio").appendChild(document.createElement("br"));
        vacio.querySelector(".his-vacio").appendChild(b);
        linea.appendChild(vacio);
        return;
    }

    hitos.forEach((h) => {
        const it = el("article", "hito");
        const t = el("div", "hito-tarjeta");
        t.appendChild(el("p", "hito-fecha", fechaBonita(h.fecha)));
        t.appendChild(el("h3", "hito-titulo", h.titulo));
        if (h.texto) t.appendChild(el("p", "hito-texto", h.texto));
        const src = imagenSegura(h.imagen);
        if (src) {
            const img = el("img", "hito-foto");
            img.src = src;
            img.alt = h.titulo;
            img.loading = "lazy";
            img.addEventListener("click", () => { visorImg.src = src; visor.classList.add("visible"); });
            t.appendChild(img);
        }
        const acc = el("div", "hito-acciones");
        const bE = el("button", "btn-mini", "✏️ Editar");
        const bB = el("button", "btn-mini", "🗑️ Eliminar");
        bE.type = "button";
        bB.type = "button";
        bE.addEventListener("click", () => editar(h));
        bB.addEventListener("click", () => borrar(h));
        acc.append(bE, bB);
        t.appendChild(acc);
        it.appendChild(t);
        linea.appendChild(it);
    });

    // Los recuerdos aparecen suavemente al hacer scroll
    const items = linea.querySelectorAll(".hito");
    if ("IntersectionObserver" in window && !reducir) {
        observador = new IntersectionObserver((entradas) => {
            entradas.forEach((en) => {
                if (en.isIntersecting) { en.target.classList.add("visible"); observador.unobserve(en.target); }
            });
        }, { threshold: 0.12 });
        items.forEach((i) => observador.observe(i));
    } else {
        items.forEach((i) => i.classList.add("visible"));
    }
}

/* ---------- Crear, editar y borrar ---------- */

function nuevo(valores) {
    const hoy = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const v = { fecha: hoy.getFullYear() + "-" + p(hoy.getMonth() + 1) + "-" + p(hoy.getDate()), ...(valores || {}) };
    abrirModal("Nuevo recuerdo", v, (d) =>
        setDoc(doc(collection(db, "historia")), { ...d, por: rol, creado: serverTimestamp() })
    );
}

function editar(h) {
    abrirModal("Editar recuerdo", h, (d) => setDoc(doc(db, "historia", h.id), d, { merge: true }));
}

async function borrar(h) {
    if (!confirm("¿Eliminar «" + h.titulo + "»?")) return;
    try { await deleteDoc(doc(db, "historia", h.id)); } catch (er) { avisar(mensajeError(er)); }
}

$("btn-nuevo").addEventListener("click", () => nuevo());
