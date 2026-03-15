import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Bell, BellRing, ShieldAlert, Terminal, Database, RefreshCw, CheckCircle2, Wifi } from 'lucide-react';

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

// Inicialización de servicios fuera del componente para evitar re-instanciación
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
  const [dbStatus, setDbStatus] = useState('Iniciando...');

  // --- Funciones de Lógica (Definidas antes de los Efectos para evitar ReferenceError) ---

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
        console.error("Error al mostrar notificación:", e);
      }
    }
  }, []);

  const autoRegister = useCallback(async (uid) => {
    if (!messaging || !db) return;
    setLoading(true);
    setDbStatus("Sincronizando...");
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
        setDbStatus("Dispositivo Sincronizado");
      } else {
        setDbStatus("No se generó Token");
      }
    } catch (err) {
      console.error("Error en registro automático:", err);
      setDbStatus("Error de Sincronización");
    }
    setLoading(false);
  }, []);

  const fetchTokenSilently = useCallback(() => {
    if (user && permission === 'granted') {
      autoRegister(user.uid);
    }
  }, [user, permission, autoRegister]);

  // --- Efectos ---

  useEffect(() => {
    // Autenticación
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDbStatus("Autenticado");
        if (Notification.permission === 'granted') {
          autoRegister(currentUser.uid);
        }
      } else {
        signInAnonymously(auth).catch(err => {
          console.error("Fallo Auth Anónima:", err);
          setDbStatus("Error de Conexión");
        });
      }
    });

    // Mensajería
    let unsubscribeMsg = () => {};
    if (messaging) {
      unsubscribeMsg = onMessage(messaging, (payload) => {
        showNotification(payload.notification?.title || "Notificación", payload.notification);
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
      console.error("Error al pedir permiso:", e);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        
        <header className="flex items-center justify-between bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <h1 className="font-black text-xl tracking-tighter uppercase">War Control Pro</h1>
          </div>
          <span className="text-[10px] font-mono text-neutral-600 tracking-widest">STABLE v2.4</span>
        </header>

        {permission !== 'granted' && (
          <div className="bg-indigo-600 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-indigo-500/20">
            <BellRing className="w-16 h-16 mx-auto text-white/90" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Vincular Dispositivo</h2>
              <p className="text-indigo-100 text-sm">Necesitamos autorización para enviar alertas tácticas a este terminal.</p>
            </div>
            <button 
              onClick={handleRequestPermission}
              disabled={loading}
              className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'NEGOCIANDO...' : 'PERMITIR ACCESO'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase text-neutral-400">Estado de Red</h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${dbStatus === 'Dispositivo Sincronizado' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
                {String(dbStatus)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-neutral-600 uppercase mb-2 block tracking-widest">FCM TOKEN (NODO ID)</label>
                <div className="bg-black p-4 rounded-xl border border-neutral-800 font-mono text-[10px] text-indigo-400 break-all leading-relaxed min-h-[60px]">
                  {loading ? "Generando..." : (token || "Pendiente de autorización...")}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => showNotification("Test de Señal", { body: "Confirmación de enlace de datos exitosa." })}
                  className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 py-3 rounded-xl text-xs font-bold transition-colors"
                >
                  <Wifi className="w-4 h-4" /> Probar Alerta
                </button>
                <button 
                  onClick={fetchTokenSilently}
                  disabled={loading}
                  className="flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 px-4 rounded-xl transition-colors disabled:opacity-30"
                >
                  <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3 text-neutral-600">
            <Terminal className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Registro de Sistema</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-neutral-500">
              <span className="text-emerald-500">●</span> Service Worker activo y listo.
            </div>
            {user && (
              <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                <span className="text-emerald-500">●</span> Sesión anónima establecida: {user.uid.substring(0, 8)}...
              </div>
            )}
            {token && (
              <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                <span className="text-blue-500">●</span> Canal de mensajería vinculado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}