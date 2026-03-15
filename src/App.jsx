import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ShieldCheck, Wifi, Timer, Play, Square, Tag, Cloud, CloudOff, AlertTriangle, Activity, XCircle } from 'lucide-react';

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
  
  const [timerName, setTimerName] = useState('Prueba de Impacto');
  const [inputMinutes, setInputMinutes] = useState(0);
  const [inputSeconds, setInputSeconds] = useState(10);
  
  const [cloudTimer, setCloudTimer] = useState(null);
  const [timeLeftDisplay, setTimeLeftDisplay] = useState('');
  const [syncStatus, setSyncStatus] = useState('Desconectado');
  
  // Estados nuevos de diagnóstico y visuales
  const [actionLog, setActionLog] = useState([]);
  const [visualAlert, setVisualAlert] = useState(null);

  const addLog = (msg, type = 'info') => {
    setActionLog(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 5));
  };

  const triggerAlertSequence = useCallback(async (title, body) => {
    // 1. Disparar Alerta Visual en el DOM (Garantizado que funciona)
    setVisualAlert({ title, body });
    addLog(`[UI] Alerta visual "${title}" renderizada en pantalla.`, 'success');

    // 2. Intentar Notificación Push Local
    if (permission !== 'granted') {
      addLog(`[PUSH] Cancelado: Permisos denegados por el navegador.`, 'error');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          await regs[0].showNotification(String(title), {
            body: String(body),
            icon: '/vite.svg',
            vibrate: [500, 200, 500, 200, 500],
            requireInteraction: true
          });
          addLog(`[PUSH] Disparada vía Service Worker.`, 'success');
          return;
        }
      }
      // Fallback si no hay Service Worker activo
      new Notification(String(title), { body: String(body), requireInteraction: true });
      addLog(`[PUSH] Disparada vía API Básica (Fallback).`, 'warning');
    } catch (e) {
      addLog(`[PUSH] Fallo crítico al invocar API nativa: ${e.message}`, 'error');
    }
  }, [permission]);

  const autoRegisterToken = useCallback(async (uid) => {
    if (!messaging || !db) return;
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
        }, { merge: true });
        setSyncStatus('Conectado');
      }
    } catch (err) {
      setSyncStatus('Error');
      addLog(`[DB] Error de registro de Token: ${err.message}`, 'error');
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && Notification.permission === 'granted') {
        autoRegisterToken(currentUser.uid);
      } else if (!currentUser) {
        signInAnonymously(auth).catch(e => addLog(`[AUTH] Fallo anónimo: ${e.message}`, 'error'));
      }
    });

    let unsubscribeMsg = () => {};
    if (messaging) {
      unsubscribeMsg = onMessage(messaging, (payload) => {
        addLog(`[FCM] Paquete recibido desde servidor.`, 'info');
        triggerAlertSequence(payload.notification?.title || "War Control", payload.notification?.body);
      });
    }

    return () => {
      unsubscribeAuth();
      unsubscribeMsg();
    };
  }, [autoRegisterToken, triggerAlertSequence]);

  useEffect(() => {
    if (!token) return;

    const timerRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'timers', token);
    
    const unsubscribeTimer = onSnapshot(timerRef, (docSnap) => {
      if (docSnap.exists()) {
        setCloudTimer(docSnap.data());
      } else {
        setCloudTimer(null);
      }
    }, (error) => {
      addLog(`[DB] Suscripción a BD falló: ${error.message}`, 'error');
    });

    return () => unsubscribeTimer();
  }, [token]);

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
        
        // Disparo de secuencias
        addLog(`[CRONO] Tiempo agotado. Iniciando secuencias.`, 'warning');
        triggerAlertSequence(`TIEMPO FINALIZADO`, cloudTimer.name);
        deleteCloudTimer(); 
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeftDisplay(`${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [cloudTimer, triggerAlertSequence]);

  const startCloudTimer = async () => {
    if (!token) {
      addLog("[SYS] No se puede programar sin token asignado.", 'error');
      return;
    }
    if (inputMinutes === 0 && inputSeconds === 0) return;
    
    try {
      setSyncStatus('Escribiendo...');
      const totalMs = (Number(inputMinutes) * 60000) + (Number(inputSeconds) * 1000);
      const targetMs = Date.now() + totalMs;

      const timerRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'timers', token);
      
      await setDoc(timerRef, {
        token: token,
        name: timerName || 'Alerta Táctica',
        target_time: targetMs,
        created_at: serverTimestamp(),
        status: 'counting'
      });
      setSyncStatus('Conectado');
      addLog(`[DB] Cronómetro "${timerName}" inyectado en Firestore.`, 'success');
    } catch (error) {
      setSyncStatus('Fallo BD');
      addLog(`[DB] Fallo al escribir en nube: ${error.message}`, 'error');
    }
  };

  const deleteCloudTimer = async () => {
    if (!token) return;
    try {
      const timerRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'timers', token);
      await deleteDoc(timerRef);
      addLog(`[DB] Cronómetro destruido en Firestore.`, 'info');
    } catch (error) {
      addLog(`[DB] Fallo al destruir cronómetro: ${error.message}`, 'error');
    }
  };

  const handleRequestPermission = async () => {
    const status = await Notification.requestPermission();
    setPermission(status);
    if (status === 'granted' && user) {
      autoRegisterToken(user.uid);
      addLog(`[SYS] Permisos concedidos por el usuario.`, 'success');
    } else {
      addLog(`[SYS] Permisos denegados.`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      
      {/* OVERLAY DE ALERTA VISUAL (Cubre toda la pantalla) */}
      {visualAlert && (
        <div className="absolute inset-0 z-50 bg-red-600/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <AlertTriangle className="w-32 h-32 text-white mb-6 animate-bounce" />
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter text-center mb-4 shadow-black drop-shadow-2xl">
            {visualAlert.title}
          </h1>
          <p className="text-2xl font-bold text-red-100 mb-12 text-center bg-black/30 p-4 rounded-2xl border border-red-400/30">
            {visualAlert.body}
          </p>
          <button 
            onClick={() => setVisualAlert(null)}
            className="bg-black text-white px-12 py-5 rounded-full font-black text-xl hover:bg-zinc-900 transition-transform active:scale-90 border-2 border-red-500 shadow-2xl"
          >
            ENTENDIDO / DESCARTAR
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6 relative z-10">
        
        <header className="flex items-center gap-3 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">War Control</h1>
        </header>

        {permission !== 'granted' ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-center space-y-6 shadow-xl">
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
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between px-6 shadow-xl">
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
                      <Tag className="w-3 h-3" /> Etiqueta de la Alerta
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
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-bold transition-colors active:scale-95"
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
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-2xl font-bold transition-colors border border-red-500/20 active:scale-95"
                  >
                    <Square className="w-5 h-5" /> Destruir Alerta
                  </button>
                </div>
              )}
            </div>

            {/* Consola de Rastreo Analítico */}
            <div className="bg-black border border-zinc-800/50 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
                <Activity className="w-4 h-4 text-zinc-500" />
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Log de Ejecución</h3>
              </div>
              <div className="space-y-3 font-mono text-[9px] h-32 overflow-y-auto pr-2 custom-scrollbar">
                {actionLog.length === 0 ? (
                  <p className="text-zinc-600 text-center italic mt-10">Esperando eventos...</p>
                ) : (
                  actionLog.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-zinc-600 shrink-0">{log.time}</span>
                      <span className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}>
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}