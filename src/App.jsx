import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Bell, Copy, Check, XCircle } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyB3o2kr0PBD-LXXO_loHH_lhbBd8SrH9Pc",
  authDomain: "war-control-push.firebaseapp.com",
  projectId: "war-control-push",
  storageBucket: "war-control-push.firebasestorage.app",
  messagingSenderId: "1074882873916",
  appId: "1:1074882873916:web:24679bbdf9ce78f0329139"
};

const VAPID_KEY = "BBSuTkcsSNM2EDOuFwIx9sj9WVIO-B3teTIwD4nS7rOUkKl8v9SkzeZiadJMAgClf14-9-tAGrciC1rsfqINtvc";

let messaging;
try {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

function App() {
  const [token, setToken] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // Customize notification handling here
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: payload.notification.icon
        });
      });
      return () => unsubscribe();
    }
  }, []);

  const requestPermission = async () => {
    if (!messaging) {
      alert('Firebase no se ha inicializado correctamente.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        setToken(currentToken);
        console.log("FCM Token:", currentToken);
      } else {
        console.log('Permission denied for notifications.');
      }
    } catch (error) {
      console.error('An error occurred while getting token. ', error);
    }
  };

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    }
  };

  const renderStatus = () => {
    switch (permissionStatus) {
      case 'granted':
        return <div className="flex items-center text-green-400"><Check className="mr-2" size={18} /> Permiso Concedido</div>;
      case 'denied':
        return <div className="flex items-center text-red-400"><XCircle className="mr-2" size={18} /> Permiso Denegado</div>;
      default:
        return <div className="flex items-center text-yellow-400"><Bell className="mr-2" size={18} /> Permiso Pendiente</div>;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-zinc-800 rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-transform duration-300">
      <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-blue-500 rounded-full mb-6">
          <Bell size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Notificaciones Push</h1>
        <p className="text-zinc-400 mb-6">Activa las notificaciones para recibir alertas importantes.</p>
        
        <div className="w-full bg-zinc-700 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-white mb-2">Estado del Permiso</h2>
          {renderStatus()}
        </div>

        {permissionStatus !== 'granted' && (
          <button 
            onClick={requestPermission} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 shadow-lg"
          >
            Activar Notificaciones
          </button>
        )}

        {token && (
          <div className="w-full mt-6 text-left">
            <h2 className="font-semibold text-white mb-3 text-center">Tu Token de Dispositivo</h2>
            <div className="relative bg-zinc-700 rounded-lg p-4 font-mono text-sm text-zinc-300 break-all">
              {token}
              <button onClick={copyToClipboard} className="absolute top-2 right-2 p-2 bg-zinc-600 hover:bg-zinc-500 rounded-md transition-colors">
                {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">Este token es necesario para enviar notificaciones a este dispositivo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
