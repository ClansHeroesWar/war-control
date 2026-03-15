importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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

            // Esto permite que la notificación aparezca cuando la pestaña está cerrada
            messaging.onBackgroundMessage((payload) => {
              console.log('Mensaje recibido en background:', payload);
                const notificationTitle = payload.notification.title;
                  const notificationOptions = {
                      body: payload.notification.body,
                          icon: '/vite.svg'
                            };

                              self.registration.showNotification(notificationTitle, notificationOptions);
                              });