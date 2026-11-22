// =========================================================
// Configuración de Firebase y cuentas autorizadas
// =========================================================
// 1) Reemplaza cada valor "PEGA_AQUI_..." con los datos de tu proyecto
//    (Firebase Console → Configuración del proyecto → Tus apps → Web).
// 2) Escribe los correos de Google de cada persona en las listas de abajo.
//
// Nota: estos valores de configuración NO son secretos; la seguridad real
// la dan la autenticación y las reglas de Firestore (archivo firestore.rules).

export const firebaseConfig = {
  apiKey: "AIzaSyDafgyBBaHOmbM2yhGApCXrpG2jjkcJwLA",
  authDomain: "paginamahu-web.firebaseapp.com",
  projectId: "paginamahu-web",
  storageBucket: "56501253831",
  messagingSenderId: "56501253831",
  appId: "1:56501253831:web:8caa79eccab64033ca70e2"
};

// Correo de Google de ELLA → modo escritura (crear, editar y eliminar).
// Debe ser EXACTAMENTE el mismo que pongas en firestore.rules.
export const ESCRITORES = ["mahulyr@gmail.com
"];

// Tu correo de Google → modo lectura (solo ver).
export const LECTORES = ["thiagoolartejimenez@gmail.com"];
