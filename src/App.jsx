import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ShieldCheck, Wifi, Timer, Play, Square, Tag, Cloud, CloudOff } from 'lucide-react';

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
  
  // Estados UI del Cronómetro Nube
  const [timerName, setTimerName] = useState('Alerta Táctica');
  const [inputMinutes, setInputMinutes] = useState(0);
  const [inputSeconds, setInputSeconds] = useState(10);
  
  // Estado de sincronización con Firestore
  const [cloudTimer, setCloudTimer] = useState(null);
  const [timeLeftDisplay, setTimeLeftDisplay] = useState('');
  const [syncStatus, setSyncStatus] = useState('Desconectado');

  const showNotification = useCallback(async (title, options) => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(String(title), {
          ...options,
          icon: '/vite.svg',
          badge: '/vite.svg',
          vibrate: [500, 200, 500],
          requireInteraction: true
        });
      } catch (e) {
        console.error("Error UI Notification:", e);
      }
    }
  }, []);

  const autoRegisterToken = useCallback(async (uid) => {
    if (!messaging || !db) return;
    try {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        setToken(String(currentToken));
        const tokenRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tokens', currentToken);
        // Actualiza el last_seen para mantener el token "limpio" y vivo
        await setDoc(tokenRef, {
          token: String(currentToken),
          owner_uid: String(uid),
          device_info: String(navigator.userAgent),
          last_seen: serverTimestamp(),
          status: 'online'
        }, { merge: true });
        setSyncStatus('Conectado');
      }
    } catch (err) {
      console.error("Fallo de registro de token:", err);
    }
  }, []);

  // 1. Inicialización de Sesión y Token
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && Notification.permission === 'granted') {
        autoRegisterToken(currentUser.uid);
      } else if (!currentUser) {
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
  }, [autoRegisterToken, showNotification]);

  // 2. Suscripción a la Base de Datos (Persistencia Visual)
  useEffect(() => {
    if (!token) return;

    // Escuchamos el documento específico de esta alarma en la nube
    const timerRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'timers', token);
    
    const unsubscribeTimer = onSnapshot(timerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCloudTimer(data);
      } else {
        setCloudTimer(null);
      }
    }, (error) => {
      console.error("Error de suscripción a Firestore:", error);
    });

    return () => unsubscribeTimer();
  }, [token]);

  // 3. Motor de Cálculo de Tiempo (Resistente a bloqueos de pantalla)
  useEffect(() => {
    if (!cloudTimer) {
      setTimeLeftDisplay('');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = cloudTimer.target_time - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeftDisplay('00:00');
        
        // El tiempo llegó a 0. Mostramos alerta local y borramos basura de la BD.
        showNotification(`Alerta Finalizada`, { body: cloudTimer.name });
        deleteCloudTimer(); 
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeftDisplay(`${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 250); // Recálculo 4 veces por segundo para evitar desfases

    return () => clearInterval(interval);
  }, [cloudTimer, showNotification]);

  // Acciones de Base de Datos
  const startCloudTimer = async () => {
    if (!token) return;
    if (inputMinutes === 0 && inputSeconds === 0) return;
    
    const totalMs = (Number(inputMinutes) * 60000) + (Number(inputSeconds) * 1000);
    const targetMs = Date.now() + totalMs;

    const timerRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'timers', token);
    
    // Sobrescribe cualquier cronómetro viejo (evita acumular datos)
    await setDoc(timerRef, {
      token: token,
      name: timerName || 'Alerta Sin Nombre',
      target_time: targetMs,
      created_at: serverTimestamp(),
      status: 'counting'
    });
  };

  const deleteCloudTimer = async () => {
    if (!token) return;
    const timerRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'timers', token);
    // Orden de destrucción a Firebase
    await deleteDoc(timerRef);
  };

  const handleRequestPermission = async () => {
    const status = await Notification.requestPermission();
    setPermission(status);
    if (status === 'granted' && user) {
      autoRegisterToken(user.uid);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-md mx-auto space-y-8">
        
        <header className="flex items-center gap-3 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">War Control</h1>
        </header>

        {permission !== 'granted' ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-center space-y-6">
            <h2 className="text-2xl font-bold">Autorizar Terminal</h2>
            <button 
              onClick={handleRequestPermission}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold transition-all"
            >
              Habilitar Notificaciones
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-zinc-400">ENLACE ACTIVO</span>
              </div>
              <div className="flex items-center gap-2">
                {syncStatus === 'Conectado' ? <Cloud className="w-4 h-4 text-emerald-500" /> : <CloudOff className="w-4 h-4 text-red-500" />}
                <span className="text-[10px] font-mono text-zinc-500 uppercase">{syncStatus}</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-400" />
                  <h2 className="font-bold text-lg">Alerta Nube</h2>
                </div>
                {cloudTimer && (
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                    Sincronizado
                  </span>
                )}
              </div>

              {!cloudTimer ? (
                <div className="space-y-5">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase mb-2">
                      <Tag className="w-3 h-3" /> Etiqueta (Ej: Escudo, Ataque)
                    </label>
                    <input 
                      type="text" 
                      value={timerName}
                      onChange={(e) => setTimerName(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block text-center">Minutos</label>
                      <input 
                        type="number" min="0" max="120"
                        value={inputMinutes}
                        onChange={(e) => setInputMinutes(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-center text-xl font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block text-center">Segundos</label>
                      <input 
                        type="number" min="0" max="59"
                        value={inputSeconds}
                        onChange={(e) => setInputSeconds(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-center text-xl font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={startCloudTimer}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-bold transition-colors"
                  >
                    <Play className="w-5 h-5" /> Enviar Orden al Servidor
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <p className="text-sm text-zinc-400 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-600" /> {cloudTimer.name}
                  </p>
                  <div className="text-6xl font-black font-mono text-blue-400 tabular-nums">
                    {timeLeftDisplay || '...'}
                  </div>
                  <button 
                    onClick={deleteCloudTimer}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-2xl font-bold transition-colors border border-red-500/20"
                  >
                    <Square className="w-5 h-5" /> Destruir Alerta en Nube
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}