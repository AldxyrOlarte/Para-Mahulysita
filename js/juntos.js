/* =========================================================
   Juntos: estado del día, pregunta del día y planes juntos
   Archivo: js/juntos.js  (type="module", solo página principal)
   Solo lo ven los dos (Mahuly y Thiago) con su sesión iniciada (🔑).
   ========================================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

let cfg = {};
for (const ruta of ["./firebase-config.js", "../firebase-config.js", "../pag/firebase-config.js"]) {
    try { cfg = await import(ruta); break; } catch (e) { /* prueba la siguiente ruta */ }
}

const EMAIL_ELLA = "mahulyr@gmail.com";
const EMAIL_EL = "thiagoolartejimenez@gmail.com";
const NOMBRE = { ella: "Mahuly", el: "Thiago" };
const INICIO = new Date(2026, 4, 28); // 28 de mayo de 2026: de aquí sale la pregunta de cada día

const ESTADOS = ["😊", "🥰", "😴", "😔", "😤", "🤒", "🥳", "🤗", "💭", "🔥"];
const CATEGORIAS = [
    ["viaje", "✈️ Viaje"], ["comida", "🍽️ Comida"], ["peli", "🎬 Peli o serie"],
    ["plan", "🎡 Plan"], ["regalo", "🎁 Regalo"], ["otro", "✨ Otro"]
];
const ICONO_CAT = { viaje: "✈️", comida: "🍽️", peli: "🎬", plan: "🎡", regalo: "🎁", otro: "✨" };

const PREGUNTAS = [
    "¿Cuál es tu recuerdo favorito de nosotros hasta ahora?",
    "¿Qué fue lo primero que pensaste cuando me conociste?",
    "¿Qué es lo que más te gusta de mi risa?",
    "Si mañana pudiéramos viajar a cualquier lugar, ¿a dónde iríamos?",
    "¿Qué canción te recuerda a mí?",
    "¿Cuál sería tu domingo perfecto conmigo?",
    "¿Qué te hace sentir más querido/a?",
    "¿Qué comida compartirías conmigo toda la vida?",
    "¿Qué es lo más bonito que he hecho por ti?",
    "¿Qué te gustaría que hiciéramos juntos este año?",
    "¿Qué detalle mío te saca una sonrisa sin darte cuenta?",
    "¿Cómo te imaginas nuestra primera casa?",
    "¿Qué película o serie te gustaría ver conmigo otra vez?",
    "¿Cuál es el mejor consejo que te he dado?",
    "¿Qué te da más ternura de mí?",
    "Si pudieras revivir un día con nosotros, ¿cuál sería?",
    "¿Qué es lo que más extrañas de mí cuando no estamos juntos?",
    "¿Qué apodo mío es tu favorito?",
    "¿Qué te gustaría aprender a hacer juntos?",
    "¿Cuál fue el momento en que supiste que me querías?",
    "¿Qué hago que te hace sentir tranquilo/a?",
    "¿Cuál es tu foto favorita de nosotros y por qué?",
    "¿Qué lugar de tu ciudad quieres que conozcamos juntos?",
    "¿Qué cosa pequeña de nuestra rutina es tu favorita?",
    "¿Qué te gustaría que nunca cambiara entre nosotros?",
    "¿Cuál es tu mayor sueño y cómo puedo ayudarte con él?",
    "¿Qué es lo más divertido que hemos hecho juntos?",
    "¿Qué te hace reír de mí?",
    "Si tuviéramos un día libre sin límites, ¿qué haríamos?",
    "¿Qué cualidad mía admiras más?",
    "¿Qué olor, sabor o lugar te hace pensar en mí?",
    "¿Qué te gustaría decirme que aún no me has dicho?",
    "¿Qué parte de nuestro día juntos esperas más?",
    "¿Cómo describirías nuestro amor en tres palabras?",
    "¿Qué tradición nos gustaría empezar?",
    "¿Qué te gustaría que celebráramos más seguido?",
    "¿Cuál fue tu primera impresión de mi voz?",
    "¿Qué es lo que más agradeces de nuestra relación?",
    "¿Qué canción pondrías en nuestra boda imaginaria?",
    "¿Qué mensaje mío guardarías para siempre?",
    "¿Qué cita improvisada te gustaría vivir conmigo?",
    "¿Qué te gustaría que me atreviera a hacer?",
    "¿En qué momento sentiste que estábamos más cerca?",
    "¿Qué le dirías a nuestro yo de dentro de diez años?",
    "¿Qué hacemos juntos que no harías con nadie más?",
    "¿Qué te hace sentir orgulloso/a de nosotros?",
    "¿Cuál es tu rincón favorito para abrazarme?",
    "¿Qué te gustaría que fuera diferente en el mundo para estar más tiempo conmigo?"
];

const configExistente = cfg.firebaseConfig || cfg.config || cfg.default;
const configurado = !!(cfg.db || cfg.app || (configExistente && configExistente.apiKey));
const raiz = document.getElementById("juntos");

if (configurado && raiz) iniciar();

function iniciar() {
    let appCache;
    const obtenerApp = () => (appCache = appCache || cfg.app || getApps()[0] || initializeApp(configExistente));
    const db = cfg.db || getFirestore(obtenerApp());
    const auth = cfg.auth || getAuth(obtenerApp());
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- Utilidades ---------- */

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
        toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000);
    }

    function rafaga(x, y, lista) {
        if (reducir) return;
        for (let i = 0; i < 10; i++) {
            const c = el("span", "corazon-toque", lista[Math.floor(Math.random() * lista.length)]);
            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 70;
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
        if (er && er.code === "permission-denied") return "Sin permiso (faltan publicar las reglas de Firestore).";
        return (er && er.message) || "Ocurrió un error.";
    }

    function claveDia(f) {
        const p = (n) => String(n).padStart(2, "0");
        return f.getFullYear() + "-" + p(f.getMonth() + 1) + "-" + p(f.getDate());
    }

    function preguntaDe(f) {
        const dias = Math.round((new Date(f.getFullYear(), f.getMonth(), f.getDate()) - INICIO) / 86400000);
        return PREGUNTAS[((dias % PREGUNTAS.length) + PREGUNTAS.length) % PREGUNTAS.length];
    }

    function cuando(ts) {
        if (!ts || !ts.toDate) return "";
        const f = ts.toDate();
        const hoy = new Date();
        const dif = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - new Date(f.getFullYear(), f.getMonth(), f.getDate())) / 86400000);
        const hora = f.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
        if (dif <= 0) return "hoy a las " + hora;
        if (dif === 1) return "ayer";
        return "hace " + dif + " días";
    }

    /* ---------- Esqueleto ---------- */

    raiz.innerHTML = "";
    const pista = el("section", "extra juntos-pista");
    pista.append(
        el("h2", "", "Solo para nosotros 💗"),
        el("p", "extra-sub", "Entra con la llave 🔑 del final de la página para ver cómo se siente cada uno, la pregunta del día y sus planes juntos.")
    );
    const contenido = el("div", "juntos-contenido");
    contenido.hidden = true;
    raiz.append(pista, contenido);

    // Tres bloques
    const secEstado = el("section", "extra juntos-sec");
    secEstado.innerHTML = '<h2>¿Cómo estás hoy? 💭</h2><p class="extra-sub">Cada uno cuenta cómo se siente y el otro lo ve</p>';
    const estCards = el("div", "estado-cards");
    const estForm = el("div", "estado-form");
    secEstado.append(estCards, estForm);

    const secPreg = el("section", "extra juntos-sec");
    secPreg.innerHTML = '<h2>Pregunta del día ❓</h2><p class="extra-sub">Las respuestas se revelan cuando los dos hayan respondido</p>';
    const pregCaja = el("div", "preg-caja");
    secPreg.appendChild(pregCaja);

    const secPlanes = el("section", "extra juntos-sec");
    secPlanes.innerHTML = '<h2>Planes juntos 📝</h2><p class="extra-sub">Lo que soñamos hacer, y lo que ya cumplimos</p>';
    const planProg = el("div", "plan-prog");
    const planForm = el("form", "plan-form");
    const planLista = el("div", "plan-lista");
    secPlanes.append(planProg, planForm, planLista);

    contenido.append(secEstado, secPreg, secPlanes);

    /* ---------- Sesión ---------- */

    let rol = null;
    let otro = null;
    let subs = [];
    let reloj = null;

    function limpiar() {
        subs.forEach((u) => { try { u(); } catch (e) {} });
        subs = [];
        clearInterval(reloj);
    }

    onAuthStateChanged(auth, (u) => {
        limpiar();
        const correo = u ? u.email : null;
        rol = correo === EMAIL_ELLA ? "ella" : correo === EMAIL_EL ? "el" : null;
        otro = rol === "ella" ? "el" : rol === "el" ? "ella" : null;
        pista.hidden = !!rol;
        contenido.hidden = !rol;
        if (!rol) return;
        iniciarEstado();
        iniciarPregunta();
        iniciarPlanes();
    });

    /* ---------- Estado del día ---------- */

    const estados = { ella: null, el: null };
    let emojiElegido = "😊";

    function pintarEstado() {
        estCards.innerHTML = "";
        ["ella", "el"].forEach((q) => {
            const d = estados[q];
            const c = el("div", "estado-card" + (q === rol ? " estado-mio" : ""));
            c.appendChild(el("div", "estado-emoji", d ? d.emoji : "💤"));
            c.appendChild(el("p", "estado-nombre", q === rol ? "Tú" : NOMBRE[q]));
            c.appendChild(el("p", "estado-texto", d ? (d.texto || "(sin mensaje)") : "Aún no ha dicho cómo está"));
            if (d) c.appendChild(el("p", "estado-cuando", cuando(d.fecha)));
            estCards.appendChild(c);
        });
    }

    function armarFormEstado() {
        estForm.innerHTML = "";
        const fila = el("div", "estado-emojis");
        ESTADOS.forEach((e) => {
            const b = el("button", "estado-opcion" + (e === emojiElegido ? " activa" : ""), e);
            b.type = "button";
            b.addEventListener("click", () => {
                emojiElegido = e;
                fila.querySelectorAll(".estado-opcion").forEach((x) => x.classList.toggle("activa", x === b));
            });
            fila.appendChild(b);
        });
        const entrada = document.createElement("input");
        entrada.type = "text";
        entrada.className = "juntos-input";
        entrada.maxLength = 80;
        entrada.placeholder = "¿Cómo te sientes hoy? (opcional)";
        const guardar = el("button", "btn-extra", "Actualizar mi estado");
        guardar.type = "button";
        guardar.addEventListener("click", async () => {
            guardar.disabled = true;
            try {
                await setDoc(doc(db, "estado", rol), {
                    emoji: emojiElegido,
                    texto: entrada.value.trim().slice(0, 80),
                    fecha: serverTimestamp()
                });
                const [x, y] = centroDe(guardar);
                rafaga(x, y, [emojiElegido, "💖", "✨"]);
                avisar("Estado actualizado 💗");
                entrada.value = "";
            } catch (er) { avisar(mensajeError(er)); }
            guardar.disabled = false;
        });
        estForm.append(fila, entrada, guardar);
    }

    function iniciarEstado() {
        estados.ella = null;
        estados.el = null;
        armarFormEstado();
        pintarEstado();
        ["ella", "el"].forEach((q) => {
            subs.push(onSnapshot(doc(db, "estado", q), (snap) => {
                estados[q] = snap.exists() ? snap.data() : null;
                if (q === rol && estados[q] && estados[q].emoji) {
                    emojiElegido = estados[q].emoji;
                    armarFormEstado();
                }
                pintarEstado();
            }, () => {}));
        });
    }

    /* ---------- Pregunta del día ---------- */

    let dia = claveDia(new Date());
    let mia = null;
    let suya = null;
    let editando = false;
    let subOtra = null;
    let verAnteriores = false;
    let anteriores = null;

    function pintarPregunta() {
        pregCaja.innerHTML = "";
        pregCaja.appendChild(el("p", "preg-texto", preguntaDe(new Date())));

        if (!mia || editando) {
            const t = document.createElement("textarea");
            t.className = "juntos-input";
            t.rows = 3;
            t.maxLength = 300;
            t.placeholder = "Escribe tu respuesta…";
            if (mia) t.value = mia.respuesta;
            const b = el("button", "btn-extra", mia ? "Guardar cambio 💗" : "Enviar mi respuesta 💗");
            b.type = "button";
            b.addEventListener("click", async () => {
                const r = t.value.trim();
                if (!r) return;
                b.disabled = true;
                try {
                    await setDoc(doc(db, "respuestas_dia", dia + "_" + rol), { dia, respuesta: r, fecha: serverTimestamp() });
                    editando = false;
                    const [x, y] = centroDe(b);
                    rafaga(x, y, ["💖", "✨", "💕"]);
                } catch (er) { avisar(mensajeError(er)); }
                b.disabled = false;
            });
            pregCaja.append(t, b);
        } else if (!suya) {
            const m = el("div", "preg-resp preg-mia");
            m.append(el("small", "", "Tu respuesta"), el("p", "", mia.respuesta));
            pregCaja.appendChild(m);
            pregCaja.appendChild(el("p", "preg-espera", "Esperando a " + NOMBRE[otro] + "… 💭 Cuando responda, se revelan las dos."));
            const e = el("button", "btn-mini", "✏️ Editar mi respuesta");
            e.type = "button";
            e.addEventListener("click", () => { editando = true; pintarPregunta(); });
            pregCaja.appendChild(e);
        } else {
            [["ella", rol === "ella" ? mia : suya], ["el", rol === "el" ? mia : suya]].forEach(([q, d]) => {
                const m = el("div", "preg-resp" + (q === rol ? " preg-mia" : ""));
                m.append(el("small", "", q === rol ? "Tú" : NOMBRE[q]), el("p", "", d.respuesta));
                pregCaja.appendChild(m);
            });
            pregCaja.appendChild(el("p", "preg-espera", "¡Ya se revelaron las dos! 🥰"));
        }

        const bAnt = el("button", "btn-mini", verAnteriores ? "Ocultar días anteriores" : "📚 Ver días anteriores");
        bAnt.type = "button";
        bAnt.addEventListener("click", async () => {
            verAnteriores = !verAnteriores;
            if (verAnteriores && !anteriores) await cargarAnteriores();
            pintarPregunta();
        });
        pregCaja.appendChild(bAnt);

        if (verAnteriores && anteriores) {
            const lista = el("div", "preg-ant");
            if (!anteriores.length) lista.appendChild(el("p", "extra-estado", "Todavía no hay días con las dos respuestas 💌"));
            anteriores.forEach((a) => {
                const c = el("div", "preg-dia");
                c.appendChild(el("p", "preg-ant-fecha", a.fecha));
                c.appendChild(el("p", "preg-ant-q", a.pregunta));
                c.appendChild(el("p", "preg-ant-r", "Mahuly: " + a.ella));
                c.appendChild(el("p", "preg-ant-r", "Thiago: " + a.el));
                lista.appendChild(c);
            });
            pregCaja.appendChild(lista);
        }
    }

    async function cargarAnteriores() {
        const res = [];
        for (let i = 1; i <= 14; i++) {
            const f = new Date();
            f.setDate(f.getDate() - i);
            const k = claveDia(f);
            try {
                const mio = await getDoc(doc(db, "respuestas_dia", k + "_" + rol));
                if (!mio.exists()) continue;
                const su = await getDoc(doc(db, "respuestas_dia", k + "_" + otro));
                if (!su.exists()) continue;
                const datos = { [rol]: mio.data().respuesta, [otro]: su.data().respuesta };
                res.push({
                    fecha: f.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }),
                    pregunta: preguntaDe(f), ella: datos.ella, el: datos.el
                });
            } catch (e) { /* sin permiso o sin conexión: se salta ese día */ }
        }
        anteriores = res;
    }

    function escucharSuya() {
        if (subOtra) { subOtra(); subOtra = null; }
        subOtra = onSnapshot(doc(db, "respuestas_dia", dia + "_" + otro), (snap) => {
            suya = snap.exists() ? snap.data() : null;
            pintarPregunta();
        }, () => {
            // Aún no se puede leer (primero tiene que existir la tuya): reintenta en unos segundos
            suya = null;
            subOtra = null;
            setTimeout(() => { if (mia && rol && !subOtra) escucharSuya(); }, 4000);
        });
    }

    function iniciarPregunta() {
        dia = claveDia(new Date());
        mia = null;
        suya = null;
        editando = false;
        anteriores = null;
        verAnteriores = false;
        pintarPregunta();

        subs.push(onSnapshot(doc(db, "respuestas_dia", dia + "_" + rol), (snap) => {
            const habiaMia = !!mia;
            mia = snap.exists() ? snap.data() : null;
            if (mia && !habiaMia) escucharSuya();
            pintarPregunta();
        }, () => {}));
        subs.push(() => { if (subOtra) { subOtra(); subOtra = null; } });

        // Cuando cambia el día se reinicia la pregunta
        reloj = setInterval(() => {
            if (claveDia(new Date()) !== dia) {
                limpiar();
                iniciarEstado();
                iniciarPregunta();
                iniciarPlanes();
            }
        }, 60000);
    }

    /* ---------- Planes juntos ---------- */

    let planes = [];

    function pintarPlanes() {
        const hechos = planes.filter((p) => p.hecho).length;
        planProg.innerHTML = "";
        planProg.appendChild(el("p", "plan-conteo", planes.length ? hechos + " de " + planes.length + " cumplidos 🎉" : "Aún no hay planes. ¡Escribe el primero!"));
        const barra = el("div", "barra");
        const rel = el("div", "barra-relleno");
        rel.style.width = planes.length ? Math.round((hechos / planes.length) * 100) + "%" : "0%";
        barra.appendChild(rel);
        planProg.appendChild(barra);

        planLista.innerHTML = "";
        const orden = [...planes.filter((p) => !p.hecho), ...planes.filter((p) => p.hecho)];
        orden.forEach((p) => {
            const f = el("div", "plan-item" + (p.hecho ? " plan-hecho" : ""));
            const chk = el("button", "plan-chk", p.hecho ? "✓" : "");
            chk.type = "button";
            chk.setAttribute("aria-label", p.hecho ? "Marcar como pendiente" : "Marcar como cumplido");
            chk.addEventListener("click", async () => {
                const [x, y] = centroDe(chk);
                try {
                    await setDoc(doc(db, "planes", p.id), p.hecho
                        ? { hecho: false }
                        : { hecho: true, fechaHecho: serverTimestamp() }, { merge: true });
                    if (!p.hecho) rafaga(x, y, ["🎉", "💖", "✨", "🥳"]);
                } catch (er) { avisar(mensajeError(er)); }
            });
            const cuerpo = el("div", "plan-cuerpo");
            cuerpo.appendChild(el("p", "plan-texto", (ICONO_CAT[p.cat] || "✨") + " " + p.texto));
            cuerpo.appendChild(el("small", "", "Lo agregó " + (NOMBRE[p.por] || "alguien") + (p.hecho && p.fechaHecho && p.fechaHecho.toDate ? " · cumplido " + cuando(p.fechaHecho) : "")));
            const del = el("button", "plan-borrar", "🗑️");
            del.type = "button";
            del.setAttribute("aria-label", "Eliminar plan");
            del.addEventListener("click", async () => {
                if (!confirm("¿Eliminar este plan?")) return;
                try { await deleteDoc(doc(db, "planes", p.id)); } catch (er) { avisar(mensajeError(er)); }
            });
            f.append(chk, cuerpo, del);
            planLista.appendChild(f);
        });
    }

    // Formulario para agregar
    const planTexto = document.createElement("input");
    planTexto.type = "text";
    planTexto.className = "juntos-input";
    planTexto.maxLength = 100;
    planTexto.placeholder = "Ej: Ir a la playa juntos";
    const planCat = document.createElement("select");
    planCat.className = "juntos-input";
    CATEGORIAS.forEach(([v, t]) => { const o = el("option", "", t); o.value = v; planCat.appendChild(o); });
    const planBtn = el("button", "btn-extra", "Agregar plan ➕");
    planBtn.type = "submit";
    planForm.append(planTexto, planCat, planBtn);
    planForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const t = planTexto.value.trim();
        if (!t || !rol) return;
        planBtn.disabled = true;
        try {
            await setDoc(doc(collection(db, "planes")), {
                texto: t.slice(0, 100), cat: planCat.value, hecho: false, por: rol, fecha: serverTimestamp()
            });
            planTexto.value = "";
            const [x, y] = centroDe(planBtn);
            rafaga(x, y, ["📝", "💖", "✨"]);
        } catch (er) { avisar(mensajeError(er)); }
        planBtn.disabled = false;
    });

    function iniciarPlanes() {
        planes = [];
        pintarPlanes();
        subs.push(onSnapshot(query(collection(db, "planes"), orderBy("fecha", "desc")), (snap) => {
            planes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            pintarPlanes();
        }, () => {}));
    }
}
