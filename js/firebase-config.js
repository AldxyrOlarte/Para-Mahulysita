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
  apiKey: "PEGA_AQUI_apiKey",
  authDomain: "PEGA_AQUI_authDomain",
  projectId: "PEGA_AQUI_projectId",
  storageBucket: "PEGA_AQUI_storageBucket",
  messagingSenderId: "PEGA_AQUI_messagingSenderId",
  appId: "PEGA_AQUI_appId"
};

// Correo de Google de ELLA → modo escritura (crear, editar y eliminar).
// Debe ser EXACTAMENTE el mismo que pongas en firestore.rules.
export const ESCRITORES = ["PEGA_AQUI_correo_de_ella@gmail.com"];

// Tu correo de Google → modo lectura (solo ver).
export const LECTORES = ["PEGA_AQUI_tu_correo@gmail.com"];
