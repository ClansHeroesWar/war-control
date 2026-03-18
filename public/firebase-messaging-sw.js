// IMPORTANTE: Este archivo DEBE estar en la raíz pública de tu proyecto web/APK.
// Sin este archivo, las notificaciones en segundo plano JAMÁS funcionarán.

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuración exacta de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyB3o2kr0PBD-LXXO_loHH_lhbBd8SrH9Pc",
  authDomain: "war-control-push.firebaseapp.com",
  projectId: "war-control-push",
  storageBucket: "war-control-push.firebasestorage.app",
  messagingSenderId: "1074882873916",
  appId: "1:1074882873916:web:24679bbdf9ce78f0329139"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Escucha mensajes cuando la app está CERRADA o en SEGUNDO PLANO
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano ', payload);
  
  const notificationTitle = payload.notification.title || 'War Control';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg', // Asegúrate de tener un icono aquí o cámbialo a tu logo
    vibrate: [500, 200, 500, 200, 1000],
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});