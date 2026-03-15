import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Bell, BellRing, ShieldAlert, Terminal, Settings, Wifi, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB3o2kr0PBD-LXXO_loHH_lhbBd8SrH9Pc",
  authDomain: "war-control-push.firebaseapp.com",
  projectId: "war-control-push",
  storageBucket: "war-control-push.firebasestorage.app",
  messagingSenderId: "1074882873916",
  appId: "1:1074882873916:web:24679bbdf9ce78f0329139"
};

const VAPID_KEY = "BBSuTkcsSNM2EDOuFwIx9sj9WVIO-B3teTIwD4nS7rOUkKl8v9SkzeZiadJMAgClf14-9-tAGrciC1rsfqINtvc";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

const APP_ID = "war-control-pro";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false); // Estado para ocultar/mostrar info técnica

  // --- Lógica Silenciosa ---

  const showNotification = useCallback(async (title, options) => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(String(title), {
          ...options,
          icon: '/vite.svg',
          badge: '/vite.svg'
        });
      } catch (e) {
        console.error("Error notificación:", e);
      }
    }
  }, []);

  const autoRegister = useCallback(async (uid) => {
    if (!messaging || !db) return;
    setLoading(true);
    try {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        setToken(String(currentToken));
        const tokenRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tokens', currentToken);
        await setDoc(tokenRef, {
          token: String(currentToken),
          owner_uid: String(uid),
          device_info: String(navigator.userAgent),
          last_seen: serverTimestamp(),
          status: 'online'
        });
      }
    } catch (err) {
      console.error("Error sincronización:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (Notification.permission === 'granted') {
          autoRegister(currentUser.uid);
        }
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });

    let unsubscribeMsg = () => {};
    if (messaging) {
      unsubscribeMsg = onMessage(messaging, (payload) => {
        showNotification(payload.notification?.title || "War Control", payload.notification);
      });
    }

    return () => {
      unsubscribeAuth();
      unsubscribeMsg();
    };
  }, [autoRegister, showNotification]);

  const handleRequestPermission = async () => {
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      if (status === 'granted' && user) {
        autoRegister(user.uid);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-lg mx-auto space-y-8">
        
        {/* Header Minimalista */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">War Control</h1>
          </div>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <Settings className={`w-5 h-5 ${showDebug ? 'text-blue-400' : 'text-zinc-600'}`} />
          </button>
        </header>

        {/* Estado Centralizado */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 text-center space-y-6 shadow-xl">
          {permission !== 'granted' ? (
            <>
              <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto flex items-center justify-center">
                <BellRing className="w-10 h-10 text-zinc-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Alertas Desactivadas</h2>
                <p className="text-zinc-500 text-sm px-4">Para recibir actualizaciones tácticas en tiempo real, activa las notificaciones.</p>
              </div>
              <button 
                onClick={handleRequestPermission}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
              >
                Activar Ahora
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full mx-auto flex items-center justify-center relative">
                <Wifi className="w-10 h-10 text-emerald-500" />
                <div className="absolute top-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-4 border-zinc-900"></div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Dispositivo Activo</h2>
                <p className="text-zinc-500 text-sm">Tu terminal está vinculado al servidor central y listo para recibir órdenes.</p>
              </div>
              <div className="pt-4">
                 <button 
                  onClick={() => showNotification("Verificación de Enlace", { body: "Canal de comunicación seguro establecido." })}
                  className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Probar Conexión
                </button>
              </div>
            </>
          )}
        </div>

        {/* Panel de Desarrollador (OCULTO POR DEFECTO) */}
        {showDebug && (
          <div className="bg-black/40 border border-zinc-800 rounded-3xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 text-zinc-500 border-b border-zinc-800 pb-3">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Debug Console</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-600 font-bold">FCM REGISTRATION TOKEN</span>
                <span className="text-emerald-500 flex items-center gap-1 font-mono">
                  {token ? 'SYNCED' : 'PENDING'}
                </span>
              </div>
              <div className="bg-black p-4 rounded-xl border border-zinc-800/50 font-mono text-[9px] text-blue-400 break-all leading-relaxed">
                {token || "No se ha generado ningún identificador."}
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-600">
                <span>AUTH UID: {user?.uid.substring(0, 12)}...</span>
                <span>OS: Android/Linux</span>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center">
          <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
            Protección de Datos Cifrada End-to-End
          </p>
        </footer>
      </div>
    </div>
  );
}