/* =========================================================
   Aviso en el botón "Sorpresas" del menú  ->  js/aviso.js (type="module")
   - A Thiago le marca cuántas sorpresas ya se pueden abrir y no ha visto.
   - A Mahuly le marca cuántas respuestas nuevas dejó Thiago.
   ========================================================= */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

let cfg = {};
for (const ruta of ["./firebase-config.js", "../firebase-config.js", "../pag/firebase-config.js"]) {
    try { cfg = await import(ruta); break; } catch (e) { /* prueba la siguiente ruta */ }
}

const EMAIL_ELLA = "mahulyr@gmail.com";
const EMAIL_EL = "thiagoolartejimenez@gmail.com";
const LS_VISTAS = "mahu_sorpresasVistas";
const LS_RESP = "mahu_respVista";

const configExistente = cfg.firebaseConfig || cfg.config || cfg.default;
const configurado = !!(cfg.db || cfg.app || (configExistente && configExistente.apiKey));
const enlace = document.querySelector('nav a[href$="sorpresas.html"]');

function leerLS(clave, defecto) {
    try { const v = JSON.parse(localStorage.getItem(clave)); return v == null ? defecto : v; } catch (e) { return defecto; }
}

if (configurado && enlace) {
    let appCache;
    const obtenerApp = () => (appCache = appCache || cfg.app || getApps()[0] || initializeApp(configExistente));
    const db = cfg.db || getFirestore(obtenerApp());
    const auth = cfg.auth || getAuth(obtenerApp());

    const badge = document.createElement("span");
    badge.className = "menu-aviso";
    badge.hidden = true;
    enlace.appendChild(badge);

    let rol = null;
    let items = []; // {id, t}
    let desuscribir = null;
    let reloj = null;

    function pintar() {
        let n = 0;
        if (rol === "el") {
            const vistas = leerLS(LS_VISTAS, []);
            n = items.filter((x) => x.t <= Date.now() && !vistas.includes(x.id)).length;
        } else if (rol === "ella") {
            const ultima = Number(leerLS(LS_RESP, 0)) || 0;
            n = items.filter((x) => x.t > ultima).length;
        }
        badge.hidden = n === 0;
        badge.textContent = String(n);
        badge.title = rol === "el" ? "Sorpresas nuevas para abrir" : "Respuestas nuevas de Thiago";
    }

    onAuthStateChanged(auth, (u) => {
        if (desuscribir) { desuscribir(); desuscribir = null; }
        clearInterval(reloj);
        items = [];
        const correo = u ? u.email : null;
        rol = correo === EMAIL_ELLA ? "ella" : correo === EMAIL_EL ? "el" : null;
        pintar();
        if (!rol) return;

        const nombre = rol === "el" ? "sorpresas" : "sorpresas_resp";
        desuscribir = onSnapshot(collection(db, nombre), (snap) => {
            items = snap.docs.map((d) => {
                const x = d.data();
                if (rol === "el") return { id: d.id, t: x.desbloqueo.toMillis() };
                return { id: d.id, t: x.fecha && x.fecha.toMillis ? x.fecha.toMillis() : Date.now() };
            });
            pintar();
        }, () => {});

        // Para que el aviso aparezca justo cuando llega la fecha
        reloj = setInterval(pintar, 30000);
    });
}
