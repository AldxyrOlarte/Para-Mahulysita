/* =========================================================
   Extras: fondo por hora, mensaje secreto, abrazo y cápsula del tiempo
   Archivo: js/extras.js  (se carga con type="module")
   ========================================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
// Usa tu archivo de configuración existente (cambia la ruta si está en otro lugar)
import * as cfg from "./firebase-config.js";
import {
    getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot,
    query, orderBy, serverTimestamp, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

/* =========================================================
   CONFIGURACIÓN: edita solo este bloque
   ========================================================= */

// La configuración de Firebase se toma de firebase-config.js (ver el import de arriba).
// Funciona si ese archivo exporta { db, auth }, { app } o el objeto de configuración
// con el nombre firebaseConfig (o config / export default).
const configExistente = cfg.firebaseConfig || cfg.config || cfg.default;

// Tu correo (el usuario que creaste en Firebase Authentication para ti)
const ADMIN_EMAIL = "tucorreo@gmail.com";

// Tema de ntfy.sh para recibir el aviso del abrazo en tu celular, aunque
// tengas la página cerrada. Pon un nombre largo y difícil de adivinar,
// por ejemplo "abrazos-thiago-k29xq7". Déjalo vacío ("") si no lo quieres.
const NTFY_TOPIC = "";

// Textos por defecto (los puedes cambiar después desde la propia página)
const SALUDOS_BASE = {
    amanecer: "Buenos días, mi amor ☀️",
    dia: "Hola, mi amor",
    tarde: "Buenas tardes, mi amor 🌅",
    noche: "Buenas noches, mi amor 🌙"
};
const SECRETO_BASE = "Si estás leyendo esto es porque quería decirte, en secreto, que te quiero muchísimo 💗";

/* =========================================================
   No hace falta tocar nada de aquí para abajo
   ========================================================= */

const configurado = !!(cfg.db || cfg.app || (configExistente && configExistente.apiKey));
const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);

function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

/* ---------- Fondo según la hora ---------- */

let saludos = { ...SALUDOS_BASE };
let textoSecreto = SECRETO_BASE;

const COLOR_TEMA = { amanecer: "#ff9a8b", dia: "#ff4d98", tarde: "#ff6f61", noche: "#3b1d5a" };

function momentoActual() {
    // Para probar: agrega ?momento=noche (o amanecer, dia, tarde) a la dirección
    const forzado = new URLSearchParams(location.search).get("momento");
    if (forzado && COLOR_TEMA[forzado]) return forzado;

    const h = new Date().getHours();
    if (h >= 5 && h < 9) return "amanecer";
    if (h >= 9 && h < 17) return "dia";
    if (h >= 17 && h < 20) return "tarde";
    return "noche";
}

function aplicarMomento() {
    const m = momentoActual();
    document.documentElement.dataset.momento = m;

    const saludo = document.querySelector(".saludo");
    if (saludo) saludo.textContent = saludos[m];

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", COLOR_TEMA[m]);
}

(function crearEstrellas() {
    const cont = el("div", "estrellas");
    cont.setAttribute("aria-hidden", "true");
    const total = window.matchMedia("(max-width: 699px)").matches ? 30 : 55;
    for (let i = 0; i < total; i++) {
        const s = document.createElement("span");
        s.style.left = Math.random() * 100 + "%";
        s.style.top = Math.random() * 100 + "%";
        s.style.animationDelay = Math.random() * 3 + "s";
        s.style.animationDuration = 2 + Math.random() * 3 + "s";
        cont.appendChild(s);
    }
    document.body.appendChild(cont);
})();

aplicarMomento();
setInterval(aplicarMomento, 60 * 1000);

/* ---------- Utilidades: aviso, ráfaga de corazones, ventana ---------- */

const toast = el("div", "toast");
toast.setAttribute("role", "status");
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

function centroDe(elemento) {
    const r = elemento.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
}

const modal = el("div", "modal");
modal.innerHTML = '<div class="modal-caja"><h3 id="m-titulo"></h3><form id="m-form" autocomplete="off"></form></div>';
document.body.appendChild(modal);
// Para que no salgan corazones al tocar dentro de la ventana
modal.addEventListener("pointerdown", (e) => e.stopPropagation());
modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });

function cerrarModal() { modal.classList.remove("visible"); }

function mensajeError(er) {
    const c = er && er.code ? er.code : "";
    if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") {
        return "Correo o contraseña incorrectos.";
    }
    if (c === "permission-denied") return "Sin permiso: revisa las reglas de Firestore.";
    return (er && er.message) || "Ocurrió un error.";
}

// campos: [{nombre, label, tipo: text|password|email|textarea|datetime-local, valor, filas}]
function abrirModal({ titulo, campos, textoBoton, onSubmit }) {
    $("m-titulo").textContent = titulo;
    const form = $("m-form");
    form.innerHTML = "";

    campos.forEach((c) => {
        const lab = el("label", "", c.label);
        const entrada = document.createElement(c.tipo === "textarea" ? "textarea" : "input");
        if (c.tipo !== "textarea") entrada.type = c.tipo || "text";
        else entrada.rows = c.filas || 5;
        entrada.name = c.nombre;
        entrada.value = c.valor || "";
        if (c.tipo === "password") entrada.autocomplete = "current-password";
        if (c.tipo === "email") entrada.autocomplete = "email";
        lab.appendChild(entrada);
        form.appendChild(lab);
    });

    const error = el("p", "m-error");
    const fila = el("div", "m-botones");
    const ok = el("button", "m-ok", textoBoton || "Guardar");
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

/* ---------- Mensaje secreto ---------- */

const btnSecreto = $("btn-secreto");
const cajaSecreto = $("secreto-caja");
const textoSecretoEl = $("secreto-texto");

function pintarSecreto() {
    if (textoSecretoEl) textoSecretoEl.textContent = textoSecreto;
}
pintarSecreto();

if (btnSecreto) {
    btnSecreto.addEventListener("click", () => {
        const abierto = cajaSecreto.classList.toggle("mostrar");
        btnSecreto.textContent = abierto ? "Esconder 🙈" : "Tócame 💗";
        if (abierto) {
            const [x, y] = centroDe(btnSecreto);
            rafaga(x, y, ["💖", "💕", "💗", "🤫"]);
        }
    });
}

/* ---------- Firebase ---------- */

const secAbrazo = $("abrazo-sec");
const secCapsula = $("capsula-sec");
const btnAdmin = $("btn-admin");

if (!configurado) {
    console.info("extras.js: no se encontró la configuración en firebase-config.js. El fondo y el secreto funcionan; el abrazo y la cápsula se ocultan.");
    if (secAbrazo) secAbrazo.hidden = true;
    if (secCapsula) secCapsula.hidden = true;
    if (btnAdmin) btnAdmin.hidden = true;
} else {
    iniciarFirebase();
}

function iniciarFirebase() {
    // Reutiliza lo que exporte firebase-config.js; si no exporta db/auth, los crea
    let appCache;
    const obtenerApp = () => (appCache = appCache || cfg.app || getApps()[0] || initializeApp(configExistente));
    const db = cfg.db || getFirestore(obtenerApp());
    const auth = cfg.auth || getAuth(obtenerApp());
    let esAdmin = false;

    /* ----- Sesión de Thiago ----- */

    onAuthStateChanged(auth, (u) => {
        esAdmin = !!u && u.email === ADMIN_EMAIL;
        document.body.classList.toggle("es-admin", esAdmin);
        if (btnAdmin) {
            btnAdmin.textContent = esAdmin ? "🚪" : "🔑";
            btnAdmin.title = esAdmin ? "Cerrar sesión" : "Acceso de Thiago";
        }
        if (esAdmin) escucharAbrazos(); else dejarDeEscucharAbrazos();
    });

    if (btnAdmin) {
        btnAdmin.addEventListener("click", () => {
            if (esAdmin) { signOut(auth); avisar("Sesión cerrada 💗"); return; }
            abrirModal({
                titulo: "Hola, Thiago 💗",
                textoBoton: "Entrar",
                campos: [
                    { nombre: "correo", label: "Correo", tipo: "email" },
                    { nombre: "clave", label: "Contraseña", tipo: "password" }
                ],
                onSubmit: async (d) => {
                    // Se pide permiso para avisos mientras se toca el botón
                    if ("Notification" in window && Notification.permission === "default") {
                        Notification.requestPermission();
                    }
                    await signInWithEmailAndPassword(auth, d.correo.trim(), d.clave);
                }
            });
        });
    }

    /* ----- Textos editables (secreto y saludos) ----- */

    onSnapshot(doc(db, "config", "mensajes"), (d) => {
        const x = d.exists() ? d.data() : {};
        saludos = {
            amanecer: x.saludo_amanecer || SALUDOS_BASE.amanecer,
            dia: x.saludo_dia || SALUDOS_BASE.dia,
            tarde: x.saludo_tarde || SALUDOS_BASE.tarde,
            noche: x.saludo_noche || SALUDOS_BASE.noche
        };
        textoSecreto = x.secreto || SECRETO_BASE;
        aplicarMomento();
        pintarSecreto();
    }, () => { /* sin permiso o sin conexión: se quedan los textos por defecto */ });

    const btnEditarSecreto = $("btn-editar-secreto");
    if (btnEditarSecreto) {
        btnEditarSecreto.addEventListener("click", () => {
            abrirModal({
                titulo: "Editar textos",
                campos: [
                    { nombre: "secreto", label: "Mensaje secreto", tipo: "textarea", valor: textoSecreto, filas: 5 },
                    { nombre: "saludo_amanecer", label: "Saludo de amanecer (5:00 a 8:59)", valor: saludos.amanecer },
                    { nombre: "saludo_dia", label: "Saludo de día (9:00 a 16:59)", valor: saludos.dia },
                    { nombre: "saludo_tarde", label: "Saludo de tarde (17:00 a 19:59)", valor: saludos.tarde },
                    { nombre: "saludo_noche", label: "Saludo de noche (20:00 a 4:59)", valor: saludos.noche }
                ],
                onSubmit: (d) => setDoc(doc(db, "config", "mensajes"), d)
            });
        });
    }

    /* ----- Abrazo ----- */

    const btnAbrazo = $("btn-abrazo");
    const estadoAbrazo = $("abrazo-estado");
    let ultimoAbrazo = 0;

    function pintarMisAbrazos() {
        let n = 0;
        try { n = Number(localStorage.getItem("abrazosEnviados")) || 0; } catch (e) {}
        if (estadoAbrazo && n > 0) {
            estadoAbrazo.textContent = "Abrazos que me has mandado: " + n + " 🤗";
        }
    }
    pintarMisAbrazos();

    function avisarPorNtfy() {
        if (!NTFY_TOPIC) return;
        fetch("https://ntfy.sh/" + encodeURIComponent(NTFY_TOPIC), {
            method: "POST",
            body: "🤗 Jazmín te mandó un abrazo",
            headers: { Title: "Abrazo", Tags: "hugging_face" }
        }).catch(() => {});
    }

    if (btnAbrazo) {
        btnAbrazo.addEventListener("click", async () => {
            const ahora = Date.now();
            if (ahora - ultimoAbrazo < 4000) return; // evita mandar muchos seguidos
            ultimoAbrazo = ahora;

            const [x, y] = centroDe(btnAbrazo);
            rafaga(x, y, ["🤗", "💖", "💕", "🫶"]);

            try {
                await addDoc(collection(db, "abrazos"), { fecha: serverTimestamp(), de: "Jazmín" });
            } catch (er) {
                estadoAbrazo.textContent = "No pude mandarlo, intenta otra vez 💗";
                return;
            }

            avisarPorNtfy();
            try {
                const n = (Number(localStorage.getItem("abrazosEnviados")) || 0) + 1;
                localStorage.setItem("abrazosEnviados", String(n));
            } catch (e) {}
            pintarMisAbrazos();
            avisar("Abrazo enviado 🤗 ¡le llegó a Thiago!");
        });
    }

    // Thiago ve los abrazos en tiempo real (con la página abierta)
    let desuscribirAbrazos = null;

    function escucharAbrazos() {
        if (desuscribirAbrazos) return;
        const total = $("abrazo-admin");
        let primera = true;

        desuscribirAbrazos = onSnapshot(
            query(collection(db, "abrazos"), orderBy("fecha", "desc")),
            (snap) => {
                if (total) total.textContent = "Abrazos recibidos: " + snap.size + " 🤗";
                if (!primera) {
                    snap.docChanges().forEach((cambio) => {
                        if (cambio.type !== "added") return;
                        avisar("🤗 Jazmín te mandó un abrazo");
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                        if ("Notification" in window && Notification.permission === "granted") {
                            new Notification("🤗 Abrazo de Jazmín", { body: "Te acaba de mandar un abrazo" });
                        }
                    });
                }
                primera = false;
            },
            () => {}
        );
    }

    function dejarDeEscucharAbrazos() {
        if (desuscribirAbrazos) { desuscribirAbrazos(); desuscribirAbrazos = null; }
    }

    /* ----- Cápsula del tiempo ----- */

    const contCapsulas = $("capsulas");
    let capsulas = [];
    const abiertas = new Set();
    const textos = new Map();

    function formatoFecha(f) {
        return f.toLocaleString("es", { dateStyle: "long", timeStyle: "short" });
    }

    function aInputLocal(f) {
        const p = (n) => String(n).padStart(2, "0");
        return f.getFullYear() + "-" + p(f.getMonth() + 1) + "-" + p(f.getDate()) +
            "T" + p(f.getHours()) + ":" + p(f.getMinutes());
    }

    async function obtenerTexto(id) {
        if (textos.has(id)) return textos.get(id);
        const d = await getDoc(doc(db, "capsulas_texto", id));
        const t = d.exists() ? (d.data().texto || "") : "";
        textos.set(id, t);
        return t;
    }

    async function guardarCapsula(id, d) {
        const fecha = new Date(d.fecha);
        if (isNaN(fecha.getTime())) throw new Error("La fecha no es válida.");
        const ts = Timestamp.fromDate(fecha);
        const lote = writeBatch(db);
        lote.set(doc(db, "capsulas", id), { titulo: d.titulo.trim() || "Sin título", desbloqueo: ts });
        lote.set(doc(db, "capsulas_texto", id), { texto: d.texto, desbloqueo: ts });
        await lote.commit();
    }

    async function abrirCapsula(c, tarjeta, boton, zonaTexto) {
        boton.disabled = true;
        try {
            zonaTexto.textContent = await obtenerTexto(c.id);
            abiertas.add(c.id);
            boton.hidden = true;
            const [x, y] = centroDe(tarjeta);
            rafaga(x, y, ["💌", "💖", "✨", "💕"]);
        } catch (er) {
            zonaTexto.textContent = "Todavía no se puede abrir, mi amor 💗 (revisa que la hora de tu celular esté bien)";
            boton.disabled = false;
        }
    }

    function editarCapsula(c) {
        obtenerTexto(c.id).then((texto) => {
            abrirModal({
                titulo: "Editar cápsula",
                campos: [
                    { nombre: "titulo", label: "Título", valor: c.titulo },
                    { nombre: "fecha", label: "Se abre el", tipo: "datetime-local", valor: aInputLocal(c.desbloqueo) },
                    { nombre: "texto", label: "Mensaje", tipo: "textarea", valor: texto, filas: 8 }
                ],
                onSubmit: async (d) => { textos.delete(c.id); await guardarCapsula(c.id, d); }
            });
        }).catch((er) => avisar(mensajeError(er)));
    }

    async function borrarCapsula(c) {
        if (!confirm("¿Eliminar la cápsula «" + c.titulo + "»?")) return;
        try {
            const lote = writeBatch(db);
            lote.delete(doc(db, "capsulas", c.id));
            lote.delete(doc(db, "capsulas_texto", c.id));
            await lote.commit();
        } catch (er) { avisar(mensajeError(er)); }
    }

    function renderCapsulas() {
        contCapsulas.innerHTML = "";

        if (!capsulas.length) {
            contCapsulas.appendChild(el("p", "extra-estado", "Pronto habrá sorpresas aquí 💌"));
            return;
        }

        capsulas.forEach((c) => {
            const lista = Date.now() >= c.desbloqueo.getTime();
            const tarjeta = el("article", "cap " + (lista ? "lista" : "bloqueada"));
            tarjeta.dataset.t = String(c.desbloqueo.getTime());

            tarjeta.append(
                el("div", "cap-icono", lista ? "💌" : "🔒"),
                el("h3", "cap-titulo", c.titulo),
                el("p", "cap-fecha", "Se abre el " + formatoFecha(c.desbloqueo))
            );

            const zonaTexto = el("p", "cap-texto");

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
            } else {
                const boton = el("button", "btn-extra", "Abrir mensaje 💗");
                boton.type = "button";
                boton.addEventListener("click", () => abrirCapsula(c, tarjeta, boton, zonaTexto));
                tarjeta.append(boton, zonaTexto);
                if (abiertas.has(c.id)) abrirCapsula(c, tarjeta, boton, zonaTexto);
            }

            // Botones de Thiago
            const admin = el("div", "cap-admin solo-admin");
            const bEditar = el("button", "btn-mini", "✏️ Editar");
            const bVer = el("button", "btn-mini", "👁️ Ver mensaje");
            const bBorrar = el("button", "btn-mini", "🗑️ Eliminar");
            [bEditar, bVer, bBorrar].forEach((b) => { b.type = "button"; });
            bEditar.addEventListener("click", () => editarCapsula(c));
            bBorrar.addEventListener("click", () => borrarCapsula(c));
            bVer.addEventListener("click", async () => {
                try { zonaTexto.textContent = await obtenerTexto(c.id); } catch (er) { avisar(mensajeError(er)); }
            });
            admin.append(bEditar, bVer, bBorrar);
            tarjeta.append(admin);
            if (!lista) tarjeta.appendChild(zonaTexto);

            contCapsulas.appendChild(tarjeta);
        });
    }

    onSnapshot(query(collection(db, "capsulas"), orderBy("desbloqueo")), (snap) => {
        capsulas = snap.docs.map((d) => ({
            id: d.id,
            titulo: d.data().titulo || "Sin título",
            desbloqueo: d.data().desbloqueo.toDate()
        }));
        textos.clear();
        renderCapsulas();
    }, () => {
        contCapsulas.textContent = "No pude cargar las cápsulas 💗";
    });

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

        if (recargar) renderCapsulas();
    }, 1000);

    const btnNueva = $("btn-nueva-capsula");
    if (btnNueva) {
        btnNueva.addEventListener("click", () => {
            const manana = new Date(Date.now() + 86400000);
            abrirModal({
                titulo: "Nueva cápsula",
                campos: [
                    { nombre: "titulo", label: "Título" },
                    { nombre: "fecha", label: "Se abre el", tipo: "datetime-local", valor: aInputLocal(manana) },
                    { nombre: "texto", label: "Mensaje", tipo: "textarea", filas: 8 }
                ],
                onSubmit: (d) => guardarCapsula(doc(collection(db, "capsulas")).id, d)
            });
        });
    }

    // Crea las dos cápsulas de ejemplo (6 meses y 1 año, desde el 28 de mayo de 2026)
    const btnSeed = $("btn-seed");
    if (btnSeed) {
        btnSeed.addEventListener("click", async () => {
            try {
                await guardarCapsula(doc(collection(db, "capsulas")).id, {
                    titulo: "Nuestros 6 meses 💞",
                    fecha: aInputLocal(new Date(2026, 10, 28, 10, 23)),
                    texto: "Escribe aquí tu mensaje para este día…"
                });
                await guardarCapsula(doc(collection(db, "capsulas")).id, {
                    titulo: "Nuestro primer año 🎉",
                    fecha: aInputLocal(new Date(2027, 4, 28, 10, 23)),
                    texto: "Escribe aquí tu mensaje para este día…"
                });
                avisar("Listo: ahora edita cada mensaje con ✏️");
            } catch (er) { avisar(mensajeError(er)); }
        });
    }
}
