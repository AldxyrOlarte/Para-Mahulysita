/* =========================================================
   Foto del día  ->  js/foto.js  (type="module")
   - Mahuly sube una foto al día desde la página principal.
   - Solo Thiago la ve, flotando en una esquina (toca para verla grande).
   - Las fotos se guardan reducidas dentro de Firestore (no hace falta Storage).
   ========================================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore, doc, setDoc, collection, onSnapshot, query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Busca tu firebase-config.js en las carpetas más comunes
let cfg = {};
for (const ruta of ["./firebase-config.js", "../firebase-config.js", "../pag/firebase-config.js"]) {
    try { cfg = await import(ruta); break; } catch (e) { /* prueba la siguiente ruta */ }
}

const EMAIL_ELLA = "mahulyr@gmail.com";            // sube la foto
const EMAIL_EL = "thiagoolartejimenez@gmail.com";  // la ve

const configExistente = cfg.firebaseConfig || cfg.config || cfg.default;
const configurado = !!(cfg.db || cfg.app || (configExistente && configExistente.apiKey));

if (configurado) iniciar();

function iniciar() {
    let appCache;
    const obtenerApp = () => (appCache = appCache || cfg.app || getApps()[0] || initializeApp(configExistente));
    const db = cfg.db || getFirestore(obtenerApp());
    const auth = cfg.auth || getAuth(obtenerApp());

    /* ---------- Utilidades ---------- */

    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function el(tag, clase, texto) {
        const e = document.createElement(tag);
        if (clase) e.className = clase;
        if (texto !== undefined) e.textContent = texto;
        return e;
    }

    function hoy() {
        const f = new Date();
        const p = (n) => String(n).padStart(2, "0");
        return f.getFullYear() + "-" + p(f.getMonth() + 1) + "-" + p(f.getDate());
    }

    function formatoDia(dia) {
        const [a, m, d] = dia.split("-").map(Number);
        return new Date(a, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "long" });
    }

    function imagenSegura(s) {
        return typeof s === "string" && s.startsWith("data:image/") ? s : "";
    }

    function rafaga(x, y, lista) {
        if (reducir) return;
        for (let i = 0; i < 12; i++) {
            const c = el("span", "corazon-toque", lista[Math.floor(Math.random() * lista.length)]);
            const ang = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 90;
            c.style.left = x + "px";
            c.style.top = y + "px";
            c.style.setProperty("--dx", Math.cos(ang) * dist + "px");
            c.style.setProperty("--dy", Math.sin(ang) * dist + "px");
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 1000);
        }
    }

    /* ---------- Estado ---------- */

    let rol = null;       // "ella" o "el"
    let fotos = [];       // de la más nueva a la más vieja
    let desuscribir = null;
    let indiceVisor = 0;
    let pendiente = null; // foto elegida por ella, aún sin enviar

    /* ---------- Polaroid flotante (Thiago) ---------- */

    const flotante = el("button", "foto-flotante");
    flotante.type = "button";
    flotante.hidden = true;
    flotante.setAttribute("aria-label", "Ver la foto de Mahuly");
    const flotanteImg = el("img");
    flotanteImg.alt = "";
    const aviso = el("span", "foto-aviso", "¡Nueva!");
    flotante.append(flotanteImg, aviso);
    document.body.appendChild(flotante);

    function esNueva() {
        if (!fotos.length) return false;
        try { return localStorage.getItem("fotoVista") !== fotos[0].dia; } catch (e) { return true; }
    }

    /* ---------- Visor grande ---------- */

    const visor = el("div", "foto-visor");
    visor.setAttribute("role", "dialog");
    visor.setAttribute("aria-modal", "true");
    visor.innerHTML =
        '<div class="foto-chispas" aria-hidden="true"></div>' +
        '<button type="button" class="foto-cerrar" aria-label="Cerrar">✕</button>' +
        '<button type="button" class="foto-nav foto-ant" aria-label="Foto anterior">‹</button>' +
        '<div class="foto-polaroid"><div class="foto-marco">' +
        '<img class="foto-grande" alt="Foto de Mahuly">' +
        '<p class="foto-etiqueta"></p><p class="foto-texto"></p>' +
        '</div></div>' +
        '<button type="button" class="foto-nav foto-sig" aria-label="Foto siguiente">›</button>';
    document.body.appendChild(visor);
    visor.addEventListener("pointerdown", (e) => e.stopPropagation());

    const vImg = visor.querySelector(".foto-grande");
    const vEtiqueta = visor.querySelector(".foto-etiqueta");
    const vTexto = visor.querySelector(".foto-texto");
    const bAnt = visor.querySelector(".foto-ant");
    const bSig = visor.querySelector(".foto-sig");
    const chispas = visor.querySelector(".foto-chispas");

    function mostrar(i) {
        if (!fotos.length) return;
        indiceVisor = Math.max(0, Math.min(fotos.length - 1, i));
        const f = fotos[indiceVisor];
        vImg.src = imagenSegura(f.imagen);
        vEtiqueta.textContent = f.dia === hoy()
            ? "Foto de hoy 📸"
            : "Foto del " + formatoDia(f.dia);
        vTexto.textContent = f.nota || "";
        bAnt.disabled = indiceVisor >= fotos.length - 1; // la anterior es más vieja
        bSig.disabled = indiceVisor <= 0;
    }

    function hacerChispas() {
        chispas.innerHTML = "";
        if (reducir) return;
        const simbolos = ["✨", "💖", "💕", "🌸", "⭐"];
        for (let i = 0; i < 16; i++) {
            const s = el("span", "", simbolos[i % simbolos.length]);
            s.style.left = Math.random() * 100 + "%";
            s.style.fontSize = 14 + Math.random() * 14 + "px";
            s.style.animationDelay = Math.random() * 4 + "s";
            s.style.animationDuration = 3.5 + Math.random() * 3 + "s";
            chispas.appendChild(s);
        }
    }

    function abrirVisor() {
        if (!fotos.length) return;
        mostrar(0);
        // Se reinicia la animación de entrada de la polaroid
        const pol = visor.querySelector(".foto-polaroid");
        pol.style.animation = "none";
        void pol.offsetWidth;
        pol.style.animation = "";
        visor.classList.add("visible");
        hacerChispas();
        rafaga(window.innerWidth / 2, window.innerHeight / 2, ["💖", "💕", "📸", "✨"]);
        try { localStorage.setItem("fotoVista", fotos[0].dia); } catch (e) {}
        aviso.hidden = true;
    }

    function cerrarVisor() {
        visor.classList.remove("visible");
        chispas.innerHTML = "";
    }

    flotante.addEventListener("click", abrirVisor);
    visor.querySelector(".foto-cerrar").addEventListener("click", cerrarVisor);
    visor.addEventListener("click", (e) => { if (e.target === visor) cerrarVisor(); });
    bAnt.addEventListener("click", () => mostrar(indiceVisor + 1));
    bSig.addEventListener("click", () => mostrar(indiceVisor - 1));
    document.addEventListener("keydown", (e) => {
        if (!visor.classList.contains("visible")) return;
        if (e.key === "Escape") cerrarVisor();
        if (e.key === "ArrowLeft") mostrar(indiceVisor + 1);
        if (e.key === "ArrowRight") mostrar(indiceVisor - 1);
    });

    /* ---------- Sección de Mahuly (subir su foto) ---------- */

    const sec = el("section", "extra foto-sec");
    sec.hidden = true;
    sec.innerHTML =
        "<h2>Tu foto de hoy 📸</h2>" +
        '<p class="extra-sub">Le aparece flotando a Thiago en la página. Solo él la ve 💗</p>' +
        '<div class="foto-caja">' +
        '<img id="foto-prev" class="foto-prev" alt="Tu foto" hidden>' +
        '<input type="file" id="foto-archivo" accept="image/*" hidden>' +
        '<button type="button" id="foto-elegir" class="btn-extra">📷 Elegir foto</button>' +
        '<input type="text" id="foto-nota" class="foto-nota-input" maxlength="100" placeholder="Una frasecita para él (opcional)" hidden>' +
        '<button type="button" id="foto-enviar" class="btn-extra" hidden>Enviar a Thiago 💗</button>' +
        '<p id="foto-estado" class="extra-estado" aria-live="polite"></p>' +
        "</div>";
    const referencia = document.querySelector("main .frases");
    if (referencia) referencia.before(sec);
    else document.querySelector("main").appendChild(sec);

    const prev = sec.querySelector("#foto-prev");
    const archivo = sec.querySelector("#foto-archivo");
    const bElegir = sec.querySelector("#foto-elegir");
    const notaInput = sec.querySelector("#foto-nota");
    const bEnviar = sec.querySelector("#foto-enviar");
    const estado = sec.querySelector("#foto-estado");

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

    bElegir.addEventListener("click", () => archivo.click());

    archivo.addEventListener("change", async () => {
        const f = archivo.files && archivo.files[0];
        archivo.value = "";
        if (!f) return;
        estado.textContent = "Preparando tu foto…";
        try {
            pendiente = await comprimir(f);
            prev.src = pendiente;
            prev.hidden = false;
            notaInput.hidden = false;
            bEnviar.hidden = false;
            estado.textContent = "Lista para enviar 💗";
        } catch (er) {
            pendiente = null;
            estado.textContent = er.message || "No pude preparar la foto.";
        }
    });

    bEnviar.addEventListener("click", async () => {
        if (!pendiente) return;
        bEnviar.disabled = true;
        estado.textContent = "Enviando…";
        try {
            const dia = hoy();
            await setDoc(doc(db, "fotos", dia), {
                dia,
                imagen: pendiente,
                nota: notaInput.value.trim().slice(0, 100),
                fecha: serverTimestamp()
            });
            pendiente = null;
            notaInput.value = "";
            notaInput.hidden = true;
            bEnviar.hidden = true;
            estado.textContent = "¡Enviada! 💗 Thiago la verá flotando";
            const r = prev.getBoundingClientRect();
            rafaga(r.left + r.width / 2, r.top + r.height / 2, ["📸", "💖", "💕", "✨"]);
        } catch (er) {
            estado.textContent = er && er.code === "permission-denied"
                ? "No se pudo enviar (faltan publicar las reglas de Firestore)."
                : "No se pudo enviar, intenta otra vez 💗";
        }
        bEnviar.disabled = false;
    });

    /* ---------- Pintar según quién entró ---------- */

    function pintar() {
        // Thiago: polaroid flotante
        if (rol === "el" && fotos.length) {
            flotante.hidden = false;
            flotanteImg.src = imagenSegura(fotos[0].imagen);
            aviso.hidden = !esNueva();
        } else {
            flotante.hidden = true;
        }

        // Mahuly: sección para subir
        sec.hidden = rol !== "ella";
        if (rol === "ella" && !pendiente) {
            const deHoy = fotos.find((f) => f.dia === hoy());
            if (deHoy) {
                prev.src = imagenSegura(deHoy.imagen);
                prev.hidden = false;
                estado.textContent = "Ya enviaste la de hoy ✓ Puedes cambiarla eligiendo otra.";
                bElegir.textContent = "📷 Cambiar foto";
            } else {
                prev.hidden = true;
                estado.textContent = "";
                bElegir.textContent = "📷 Elegir foto";
            }
        }

        if (visor.classList.contains("visible")) mostrar(indiceVisor);
    }

    function detener() {
        if (desuscribir) { desuscribir(); desuscribir = null; }
        fotos = [];
        pendiente = null;
        cerrarVisor();
        pintar();
    }

    onAuthStateChanged(auth, (u) => {
        detener();
        const correo = u ? u.email : null;
        rol = correo === EMAIL_ELLA ? "ella" : correo === EMAIL_EL ? "el" : null;
        pintar();
        if (!rol) return;

        desuscribir = onSnapshot(
            query(collection(db, "fotos"), orderBy("dia", "desc"), limit(30)),
            (snap) => {
                fotos = snap.docs.map((d) => d.data()).filter((f) => imagenSegura(f.imagen));
                pintar();
            },
            () => { /* sin permiso o sin conexión: no se muestra nada */ }
        );
    });
}
