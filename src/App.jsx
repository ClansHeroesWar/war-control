import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldAlert, RotateCcw, AlertTriangle, X, Minus, Plus,
  Pause, Play, Trash2, Edit2, Check, GripVertical, Smartphone,
  ArrowDownToLine, Volume2, Volume1, VolumeX,
  BellRing, Music, ChevronDown, ChevronUp, Settings, Clock, Globe, Info
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- IMPORTACIONES NATIVAS DE CAPACITOR ---
import { LocalNotifications } from '@capacitor/local-notifications';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

const dict = {
  en: {
    appTitle: "War Control",
    realTime: "Real Operational Time",
    endTime: "End Time",
    earlyWarnings: "Early Warnings",
    sync: "SYNC",
    addCrono: "Add Crono",
    addSection: "Create Section",
    createCronoTitle: "Create Timers",
    planNamePlaceholder: "PLAN NAME",
    activatePlan: "Activate Plan",
    createCronoBtn: "CREATE CRONO",
    createSectionBtn: "CREATE SECTION",
    sectionNamePlaceholder: "SECTION NAME",
    banner: "Banner:",
    includeCronos: "Include timers",
    emptySection: "Empty - Drop inside",
    exitZone: "Exit Zone",
    dropToExtract: "Drop to Extract",
    moving: "Moving",
    soundConfig: "Acoustic Config",
    taskFinished: "Plan Completed",
    confirmResetTitle: "Confirm Reset",
    confirmResetDesc: "Reset all timers in section",
    cancel: "Cancel",
    resetAll: "Reset All",
    understood: "UNDERSTOOD",
    next: "NEXT",
    soundSiren: "Nuclear Siren",
    soundRadar: "Tactical Radar",
    soundAlert: "Standard Alert",
    soundDigital: "Digital Beep",
    soundSonar: "Submarine Sonar",
    soundPulse: "Heart Pulse",
    soundChime: "Zen Chime",
    soundCrystal: "Crystal Echo",
    soundZen: "Harmonic Wave",
    soundMuted: "Muted",
    typeUrgent: "Urgent",
    typeCalm: "Calm",
    typeRelaxing: "Relaxing",
    typeSilent: "Silent",
    help_header_title: "Global Control Panel",
    help_header_desc: "• Globe: Changes system language.\n• Volume: Quick toggle for system audio.\n• Music Note: Advanced acoustic profile settings.\n• Vibration: Toggles haptic feedback.\n• Smartphone: Local Android System Notifications.",
    help_time_title: "Strategic Time Module",
    help_time_desc: "• End Time: Displays global target time.\n• Early Warnings: Select preset alerts (15M, 10M, 5M) before the global End Time.\n• H/M Inputs: Manually set global target time.\n• Sync: Applies input time to recalculate warnings.",
    help_creation_title: "Deployment Module",
    help_creation_desc: "• Add Crono: Injects independent timers to the field.\n• Create Section: Builds a visual folder to group multiple timers.\nNote: Timers can be dragged and dropped freely between sections."
  },
  es: {
    appTitle: "War Control",
    realTime: "Tiempo Real Operativo",
    endTime: "Hora Fin",
    earlyWarnings: "Avisos Tempranos",
    sync: "SINCRONIZAR",
    addCrono: "Añadir Crono",
    addSection: "Crear Sección",
    createCronoTitle: "Crear Cronómetros",
    planNamePlaceholder: "NOMBRE DEL PLAN",
    activatePlan: "Activar Plan",
    createCronoBtn: "CREAR CRONO",
    createSectionBtn: "CREAR CAJA",
    sectionNamePlaceholder: "NOMBRE DE SECCIÓN",
    banner: "Banner:",
    includeCronos: "Incluir cronos",
    emptySection: "Vacío - Suelta adentro",
    exitZone: "Zona de Salida",
    dropToExtract: "Soltar para Extraer",
    moving: "Moviendo",
    soundConfig: "Config. Acústica",
    taskFinished: "Plan Finalizado",
    confirmResetTitle: "Confirmar Reinicio",
    confirmResetDesc: "Reinciar todos los cronos de la sección",
    cancel: "Cancelar",
    resetAll: "Reiniciar Todo",
    understood: "ENTENDIDO",
    next: "SIGUIENTE",
    soundSiren: "Sirena Nuclear",
    soundRadar: "Radar Táctico",
    soundAlert: "Alerta Estándar",
    soundDigital: "Bip Digital",
    soundSonar: "Sonar Submarino",
    soundPulse: "Pulso Cardíaco",
    soundChime: "Campana Zen",
    soundCrystal: "Cristal Eco",
    soundZen: "Onda Armónica",
    soundMuted: "Silenciado",
    typeUrgent: "Urgente",
    typeCalm: "Calma",
    typeRelaxing: "Relajante",
    typeSilent: "Silencio",
    help_header_title: "Panel de Control Global",
    help_header_desc: "• Globo: Cambia el idioma del sistema.\n• Volumen: Atajo rápido de silencio.\n• Nota Musical: Configuración de sonido.\n• Vibración: Activa respuestas físicas táctiles.\n• Teléfono: Activa Notificaciones Nativas del Sistema Android.",
    help_time_title: "Módulo de Tiempo Estratégico",
    help_time_desc: "• Hora Fin: Establece el límite global.\n• Avisos Tempranos: Calcula alertas automáticas.\n• Entradas H/M: Define horas/minutos para tu objetivo.\n• Sincronizar: Aplica el tiempo ingresado al sistema.",
    help_creation_title: "Módulo de Despliegue",
    help_creation_desc: "• Añadir Crono: Inyecta cronómetros individuales al campo.\n• Crear Sección: Construye contenedores visuales para agrupar cronómetros en fases.\nNota: Usa el icono de los puntos para arrastrar cronos libremente."
  }
};

const firebaseConfig = {
    apiKey: "AIzaSyB3o2kr0PBD-LXXO_loHH_lhbBd8SrH9Pc",
    authDomain: "war-control-push.firebaseapp.com",
    projectId: "war-control-push",
    storageBucket: "war-control-push.firebasestorage.app",
    appId: "1:1074882873916:web:24679bbdf9ce78f0329139"
};

let app, authInstance, dbInstance;
let isOfflineMode = true;

try {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  isOfflineMode = false;
} catch (error) {
  isOfflineMode = true;
}

let globalAudioCtx = null;
const initGlobalAudio = () => {
    if (!globalAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
};

const VibrateIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m2 8 2 2-2 2 2 2-2 2" /><path d="m22 8-2 2 2 2-2 2 2 2" /><rect width="8" height="14" x="8" y="5" rx="1" />
  </svg>
);

const COLORS = [
  { name: 'Naranja', hex: '#f59e0b' },
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Púrpura', hex: '#a855f7' },
  { name: 'Gris', hex: '#475569' }
];

const App = () => {
  const appId = 'war-control-pro';
  const [lang, setLang] = useState('es');
  const t = (key) => dict[lang][key] || key;

  const [activeHelp, setActiveHelp] = useState(null);
  const SOUND_PROFILES = [
    { id: 'siren', name: t('soundSiren'), type: t('typeUrgent') },
    { id: 'radar', name: t('soundRadar'), type: t('typeUrgent') },
    { id: 'alert', name: t('soundAlert'), type: t('typeUrgent') },
    { id: 'digital', name: t('soundDigital'), type: t('typeUrgent') },
    { id: 'sonar', name: t('soundSonar'), type: t('typeCalm') },
    { id: 'pulse', name: t('soundPulse'), type: t('typeCalm') },
    { id: 'chime', name: t('soundChime'), type: t('typeRelaxing') },
    { id: 'crystal', name: t('soundCrystal'), type: t('typeRelaxing') },
    { id: 'zen', name: t('soundZen'), type: t('typeRelaxing') },
    { id: 'muted', name: t('soundMuted'), type: t('typeSilent') }
  ];

  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [targetEndTime, setTargetEndTime] = useState(null);
  const [inputH, setInputH] = useState('');
  const [inputM, setInputM] = useState('');

  const [warAlarms, setWarAlarms] = useState([
    { id: '15m', mins: 15, on: false, trig: false, custom: false },
    { id: '10m', mins: 10, on: false, trig: false, custom: false },
    { id: '5m', mins: 5, on: false, trig: false, custom: false },
    { id: 'custom', h: '', m: '', s: '', on: false, trig: false, custom: true }
  ]);

  const [tasks, setTasks] = useState([]); 
  const [boxes, setBoxes] = useState([]); 
  const [rootOrder, setRootOrder] = useState([]); 

  const [showCronoForm, setShowCronoForm] = useState(false);
  const [showBoxForm, setShowBoxForm] = useState(false);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [confirmBoxReset, setConfirmBoxReset] = useState(null); 
  const [openBoxMenuId, setOpenBoxMenuId] = useState(null);

  const [alertQueue, setAlertQueue] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);

  const [cronoDrafts, setCronoDrafts] = useState([{ id: Date.now(), label: '', h: '', m: '', s: '' }]);
  const [newBoxColor, setNewBoxColor] = useState('#f59e0b');
  const [newBoxLabel, setNewBoxLabel] = useState('');
  const [includeInitialCrono, setIncludeInitialCrono] = useState(false);
  const [boxCronoDrafts, setBoxCronoDrafts] = useState([{ id: Date.now() + 1, label: '', h: '', m: '', s: '' }]);

  const [editBuf, setEditBuf] = useState({ label: '', h: '', m: '', s: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [editBoxDrafts, setEditBoxDrafts] = useState([]);

  const [vibrateOn, setVibrateOn] = useState(false);
  const [soundProfile, setSoundProfile] = useState('siren');
  const [sysNotifOn, setSysNotifOn] = useState(false);
  
  const [warSound, setWarSound] = useState('siren');
  const [taskSound, setTaskSound] = useState('radar');

  const tasksRef = useRef([]);
  const targetEndTimeRef = useRef(null);
  const warAlarmsRef = useRef([]);
  const vibrateOnRef = useRef(false);
  const sysNotifOnRef = useRef(false);
  const lastTickRef = useRef(0);
  const warSoundRef = useRef('siren');
  const taskSoundRef = useRef('radar');
  const activeAlarmEngineRef = useRef(null); 
  const activeVibrationIntervalRef = useRef(null); 
  const previewEngineRef = useRef(null);
  const syncRef = useRef(null); 
  
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { targetEndTimeRef.current = targetEndTime; }, [targetEndTime]);
  useEffect(() => { warAlarmsRef.current = warAlarms; }, [warAlarms]);
  useEffect(() => { vibrateOnRef.current = vibrateOn; }, [vibrateOn]);
  useEffect(() => { sysNotifOnRef.current = sysNotifOn; }, [sysNotifOn]);
  useEffect(() => { warSoundRef.current = warSound; }, [warSound]);
  useEffect(() => { taskSoundRef.current = taskSound; }, [taskSound]);

  const [isListening, setIsListening] = useState(false);
  const [dragState, setDragState] = useState({ isDragging: false, item: null, pos: { x: 0, y: 0 } });
  const [dropIndicator, setDropIndicator] = useState(null); 
  
  const isDraggingRef = useRef(false);
  const dragItemRef = useRef(null);
  const dragIntentRef = useRef(null);
  const pendingDragRef = useRef(null);
  const pointerPosRef = useRef({ x: 0, y: 0 });
  const autoScrollRafRef = useRef(null);

  // =========================================================================
  // ARQUITECTURA DE ALARMAS NATIVAS Y SERVICIO EN PRIMER PLANO
  // =========================================================================

  // 1. Inicialización de Permisos y Canal de Alta Prioridad
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        if (typeof Notification !== 'undefined') {
            const permStatus = await Notification.requestPermission();
            if (permStatus === 'granted') {
                // CREAR CANAL DE ALTA PRIORIDAD PARA DESPERTAR EL DISPOSITIVO
                try {
                    await LocalNotifications.createChannel({
                        id: 'war_alarms_max',
                        name: 'Alarmas Tácticas',
                        description: 'Alertas críticas de los cronómetros',
                        importance: 5, // 5 = MAX (Despierta pantalla)
                        visibility: 1, // Visible en pantalla de bloqueo
                        vibration: true
                    });
                } catch(e) {
                    console.error("Error creando canal:", e);
                }

                setSysNotifOn(true);
                if (syncRef.current) syncRef.current({ sysNotifOn: true });
            }
        }
      } catch (error) {
         console.error("Error crítico en la inicialización:", error);
      }
    };

    initializeSystem();
  }, []);

  // 2. Actualización DINÁMICA del Servicio en Primer Plano (CONTEO REGRESIVO)
  useEffect(() => {
    const nowMs = Date.now();
    if (nowMs - lastTickRef.current < 950) return; // Evita saturar el puente nativo
    lastTickRef.current = nowMs;

    const updateDynamicForegroundService = async () => {
      let notifTitle = '\u2694 War Control';
      let notifBody = 'Sistema táctico activo. Esperando órdenes...';

      if (targetEndTime) {
          const d = targetEndTime.getTime() - currentTime.getTime();
          const endTimeParts = targetEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).split(' ');
          const endTimeStr = `${endTimeParts[0]} ${endTimeParts[1] || ''}`;

          if (d > 0) {
              const h = Math.floor(d / 3600000);
              const m = Math.floor((d % 3600000) / 60000);
              const s = Math.floor((d % 60000) / 1000);
              const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
              
              notifTitle = '\u2694 Guerra Activa';
              notifBody = `Fin: ${endTimeStr} | Resta: ${timeStr}`; 
          } else {
              notifTitle = '\u2694 Guerra Finalizada';
              notifBody = `La Guerra terminó a las: ${endTimeStr}.`;
          }
      }

      try {
          await ForegroundService.startForegroundService({
            id: 1234,
            title: notifTitle,
            body: notifBody,
            smallIcon: 'ic_lock_idle_alarm'
          });
      } catch (error) {
          console.log("Error actualizando Foreground Service:", error);
      }
    };

    updateDynamicForegroundService();
  }, [currentTime, targetEndTime]);

  // Programar alarma exacta usando el canal de MÁXIMA PRIORIDAD
  const scheduleNativeAlarm = async (id, title, body, triggerTimeMs) => {
      if (!sysNotifOnRef.current) return;
      try {
          await LocalNotifications.schedule({
              notifications: [
                  {
                      title: title,
                      body: body,
                      id: id,
                      schedule: { at: new Date(triggerTimeMs), allowWhileIdle: true },
                      channelId: 'war_alarms_max', // Obligamos a usar el canal creado
                      actionTypeId: "",
                      extra: null
                  }
              ]
          });
      } catch (e) {
          console.error("Error programando alarma nativa:", e);
      }
  };

  const cancelNativeAlarm = async (id) => {
      try {
          await LocalNotifications.cancel({ notifications: [{ id: id }] });
      } catch (e) {
          console.error("Error cancelando alarma nativa:", e);
      }
  };

  const toggleSystemNotifications = async () => {
    if (sysNotifOn) {
        setSysNotifOn(false);
        if (syncRef.current) syncRef.current({ sysNotifOn: false });
        return;
    }

    try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
            try {
                await LocalNotifications.createChannel({
                    id: 'war_alarms_max',
                    name: 'Alarmas Tácticas',
                    description: 'Alertas críticas de los cronómetros',
                    importance: 5,
                    visibility: 1,
                    vibration: true
                });
            } catch(e) {}

            setSysNotifOn(true);
            if (syncRef.current) syncRef.current({ sysNotifOn: true });
        } else {
            alert("Permiso de notificación nativa denegado.");
        }
    } catch(err) {
        console.log(err);
    }
  };
  // =========================================================================

  const toggleLanguage = () => {
      const nextLang = lang === 'en' ? 'es' : 'en';
      setLang(nextLang);
      if (syncRef.current) syncRef.current({ language: nextLang });
  };

  const triggerHaptic = useCallback((pattern) => {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  }, []);

  const stopInfiniteAlarm = useCallback(() => {
      if (activeVibrationIntervalRef.current) {
          clearInterval(activeVibrationIntervalRef.current);
          activeVibrationIntervalRef.current = null;
      }
      try { if (navigator.vibrate) navigator.vibrate(0); } catch(e) {}
      
      if (activeAlarmEngineRef.current) {
          activeAlarmEngineRef.current.stop();
          activeAlarmEngineRef.current = null;
      }
    
      if (previewEngineRef.current) {
          previewEngineRef.current.stop();
          previewEngineRef.current = null;
      }
  }, []);

  const synthesizeAudio = useCallback((profile, isPreview = false) => {
      if (profile === 'muted') return null;
      initGlobalAudio(); 
      if (!globalAudioCtx) return null;

      try {
          const ctx = globalAudioCtx;
          if (ctx.state === 'suspended') ctx.resume();
          
          const mainGain = ctx.createGain();
        
          mainGain.connect(ctx.destination);
          mainGain.gain.value = 0.5;

          const activeOscillators = [];
          let intervalId = null;

          const scheduleNote = (type, freq, timeOffset, vol, attack=0.05, decay=0.1) => {
              if(ctx.state === 'closed') return;
              const osc = ctx.createOscillator();
      
              const gain = ctx.createGain();
              osc.connect(gain); gain.connect(mainGain);
              osc.type = type; osc.frequency.value = freq;
              
              const startTime = ctx.currentTime + timeOffset;
              gain.gain.setValueAtTime(0, startTime);
              gain.gain.linearRampToValueAtTime(vol, startTime + attack);
              gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
              
              osc.start(startTime);
              osc.stop(startTime + attack + decay + 0.1);
              activeOscillators.push(osc);
          };

          const playSequence = () => {
              if(ctx.state === 'closed') return;
              switch(profile) {
                  case 'siren':
                      const s_osc = ctx.createOscillator();
                      const s_lfo = ctx.createOscillator(); const s_lfoGain = ctx.createGain();
                      s_osc.type = 'sawtooth'; s_osc.frequency.value = 800;
                      s_lfo.type = 'sine'; s_lfo.frequency.value = 0.5;
                      s_lfoGain.gain.value = 400;
                      s_lfo.connect(s_lfoGain); s_lfoGain.connect(s_osc.frequency);
                      const s_gain = ctx.createGain(); s_gain.gain.value = 0.3;
                      s_osc.connect(s_gain); s_gain.connect(mainGain);
                      s_osc.start(); s_lfo.start();
                      activeOscillators.push(s_osc, s_lfo);
                      break;
                  case 'radar': scheduleNote('square', 1000, 0, 0.3, 0.01, 0.2); scheduleNote('square', 1000, 0.3, 0.3, 0.01, 0.2); break;
                  case 'alert': scheduleNote('sawtooth', 800, 0, 0.4, 0.01, 0.1); scheduleNote('sawtooth', 800, 0.15, 0.4, 0.01, 0.1); scheduleNote('sawtooth', 800, 0.3, 0.4, 0.01, 0.1);
                  break;
                  case 'digital': scheduleNote('square', 1200, 0, 0.2, 0.01, 0.1); scheduleNote('square', 1600, 0.1, 0.2, 0.01, 0.1); break;
                  case 'sonar': scheduleNote('sine', 1200, 0, 0.6, 0.01, 1.0); break;
                  case 'pulse': scheduleNote('sine', 150, 0, 0.8, 0.1, 0.4);
                  scheduleNote('sine', 150, 0.5, 0.6, 0.1, 0.4); break;
                  case 'chime': scheduleNote('sine', 600, 0, 0.5, 0.05, 2.0);
                  scheduleNote('sine', 900, 0, 0.2, 0.05, 2.0); break;
                  case 'crystal': scheduleNote('triangle', 2000, 0, 0.3, 0.01, 0.5);
                  scheduleNote('triangle', 2500, 0.2, 0.2, 0.01, 0.5); break;
                  case 'zen': scheduleNote('sine', 432, 0, 0.4, 1.0, 2.0);
                  scheduleNote('sine', 540, 0.5, 0.3, 1.0, 2.0); break;
                  default: break;
              }
          };

          playSequence();

          if (!isPreview && profile !== 'siren') {
              let loopTime = 1000;
              if (profile === 'sonar' || profile === 'alert') loopTime = 2000;
              if (profile === 'chime' || profile === 'zen' || profile === 'crystal') loopTime = 3500;
              intervalId = setInterval(playSequence, loopTime);
          }

          if (isPreview && profile === 'siren') {
              setTimeout(() => { activeOscillators.forEach(o => { try { o.stop(); } catch(e){} }); }, 1500);
          }

          return {
              stop: () => {
                  if (intervalId) clearInterval(intervalId);
                  activeOscillators.forEach(osc => { try { osc.stop(); } catch(e){} });
                  try { mainGain.disconnect();
                  } catch(e){}
              }
          };
      } catch(e) { return null; }
  }, []);

  const playPreview = useCallback((profile) => {
      stopInfiniteAlarm();
      if (profile === 'muted') return;
      previewEngineRef.current = synthesizeAudio(profile, true);
  }, [stopInfiniteAlarm, synthesizeAudio]);

  const triggerInfiniteAlarm = useCallback((type) => {
      stopInfiniteAlarm();
      const profile = type === 'war' ? warSoundRef.current : taskSoundRef.current;
      if (vibrateOnRef.current && navigator.vibrate) {
          triggerHaptic([500, 200, 500, 200]);
          activeVibrationIntervalRef.current = setInterval(() => { triggerHaptic([500, 200, 500, 200]); }, 1400);
      }
      activeAlarmEngineRef.current = synthesizeAudio(profile, false);
  }, [stopInfiniteAlarm, triggerHaptic, synthesizeAudio]);

  const toggleSoundProfile = () => {
      const next = soundProfile === 'siren' ?
      'radar' : soundProfile === 'radar' ? 'muted' : 'siren';
      setSoundProfile(next);
      if(syncRef.current) syncRef.current({ soundProfile: next });
      if (next !== 'muted') playPreview(next);
  };

  useEffect(() => {
    if (isOfflineMode) {
        const rawData = localStorage.getItem('war_control_data_v45');
        if (rawData) {
            try {
                const data = JSON.parse(rawData);
                if (data.targetEndTime) setTargetEndTime(new Date(data.targetEndTime));
                if (data.warAlarms) setWarAlarms(data.warAlarms);
 
                if (data.vibrateOn !== undefined) setVibrateOn(data.vibrateOn);
                if (data.sysNotifOn !== undefined) setSysNotifOn(data.sysNotifOn);
                if (data.soundProfile !== undefined) setSoundProfile(data.soundProfile);
                if (data.warSound) setWarSound(data.warSound);
                if (data.taskSound) setTaskSound(data.taskSound);
     
                if (data.boxes) setBoxes(data.boxes);
                if (data.rootOrder) setRootOrder(data.rootOrder);
                if (data.language) setLang(data.language);
                if (data.tasks) {
                  const now = Date.now();
                  setTasks(data.tasks.map(t => ({
                    ...t, 
                    remainingSeconds: t.isRunning && t.serverEndTime ? Math.max(0, Math.floor((t.serverEndTime - now) / 1000)) : t.remainingSeconds,
                    isNewFinish: t.isNewFinish || false, 
                    alerted: 
                    t.alerted || false
                  })));
                }
            } catch(e) {}
        }
        return;
    }

    const initAuth = async () => {
      if (authInstance) {
          try { await signInAnonymously(authInstance);
          onAuthStateChanged(authInstance, setUser); } catch(e) {}
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (isOfflineMode || !user || !dbInstance) return;
    const docRef = doc(dbInstance, 'artifacts', appId, 'users', user.uid, 'settings', 'global_data_v45');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists() && !isDraggingRef.current) { 
        const data = snap.data();
        if (data.targetEndTime) setTargetEndTime(new Date(data.targetEndTime));
        if (data.warAlarms) setWarAlarms(data.warAlarms);
        if (data.vibrateOn !== undefined) setVibrateOn(data.vibrateOn);
        if (data.sysNotifOn 
        !== undefined) setSysNotifOn(data.sysNotifOn);
        if (data.soundProfile !== undefined) setSoundProfile(data.soundProfile);
        if (data.warSound) setWarSound(data.warSound);
        if (data.taskSound) setTaskSound(data.taskSound);
        if (data.boxes) setBoxes(data.boxes);
        if (data.rootOrder) setRootOrder(data.rootOrder);
        if (data.language) setLang(data.language);
        if (data.tasks) {
          const now = Date.now();
          setTasks(data.tasks.map(t => ({
            ...t, 
            remainingSeconds: t.isRunning && t.serverEndTime ? Math.max(0, Math.floor((t.serverEndTime - now) / 1000)) : t.remainingSeconds,
            isNewFinish: t.isNewFinish || false,
            alerted: t.alerted || false
          })));
        }
      }
    });
    return () => unsub();
  }, [user]);

  const sync = async (updates) => {
    if (isOfflineMode) {
        const current = JSON.parse(localStorage.getItem('war_control_data_v45') || '{}');
        localStorage.setItem('war_control_data_v45', JSON.stringify({ ...current, ...updates }));
        return;
    }
    if (!user || !dbInstance) return;
    const docRef = doc(dbInstance, 'artifacts', appId, 'users', user.uid, 'settings', 'global_data_v45');
    await setDoc(docRef, updates, { merge: true });
  };

  useEffect(() => { syncRef.current = sync; }, [user, isOfflineMode]);

  useEffect(() => {
      if (!activeAlert && alertQueue.length > 0) {
          const nextAlert = alertQueue[0];
          setActiveAlert(nextAlert);
          triggerInfiniteAlarm(nextAlert.type);
          setAlertQueue(prev => prev.slice(1));
      }
  }, [activeAlert, alertQueue, triggerInfiniteAlarm]);

  useEffect(() => {
    if (!activeAlert && alertQueue.length === 0) stopInfiniteAlarm();
  }, [activeAlert, alertQueue, stopInfiniteAlarm]);

  // ==========================================
  // MOTOR DE RELOJ CON RETROACTIVO
  // ==========================================
  useEffect(() => {
    const ticker = setInterval(() => {
        if (isDraggingRef.current) return;

        const now = Date.now();
        setCurrentTime(new Date(now));

        let changedTasks = false;
        let hasNewFinishedTasks = false;
        let finishedLabels = [];
        let finishedTaskIds = [];

  
        const nextTasks = tasksRef.current.map(t => {
            if (t.isRunning && t.serverEndTime) {
                const exactRemaining = Math.max(0, Math.floor((t.serverEndTime - now) / 1000));
                
                if (exactRemaining === 0 && !t.alerted) {
           
                    changedTasks = true;
                    hasNewFinishedTasks = true;
                    finishedLabels.push(t.label);
                    finishedTaskIds.push(t.id);
                    return { ...t, remainingSeconds: 0, isNewFinish: true, 
                    alerted: true, isRunning: false, serverEndTime: null };
                }
                
                if (exactRemaining !== t.remainingSeconds && exactRemaining > 0) {
                    changedTasks = true;
                    return { ...t, remainingSeconds: exactRemaining };
                }
            }
            return t;
        });

        let newlyTriggeredAlarms = [];
        let nextAlarms = [...warAlarmsRef.current];
        
        if (targetEndTimeRef.current) {
            const msRem = targetEndTimeRef.current.getTime() - now;
            if (msRem < 86400000 && msRem > -86400000) { 
                warAlarmsRef.current.forEach(a => {
                    if (a.on && !a.trig) {
                        let h = parseInt(a.h) || 0; let m = parseInt(a.m) || 0; let s = parseInt(a.s) || 0;
        
                        let limitMs = a.custom ? ((h * 3600) + (m * 60) + s) * 1000 : a.mins * 60000;
                        if (limitMs > 0 && msRem <= limitMs) newlyTriggeredAlarms.push(a);
                    }
             
                });
            }
        }

        if (finishedLabels.length > 0 || newlyTriggeredAlarms.length > 0) {
            let alertTitle = "";
            let notifBody = "";

            if (finishedLabels.length > 0) {
                alertTitle = t('taskFinished');
                notifBody = finishedLabels.map(l => `• ${l}`).join('\n');
            }

            if (newlyTriggeredAlarms.length > 0) {
                const alarmLabels = newlyTriggeredAlarms.map(a => a.custom ? `Faltan ${a.h ? a.h+'h ' : ''}${a.m ? a.m+'m ' : ''}${a.s ? a.s+'s' : ''}`.trim() : `Faltan ${a.mins} Minutos`).join('\n• ');
                if (notifBody) { notifBody += `\n\n${t('earlyWarnings')}:\n• ${alarmLabels}`; } 
                else { alertTitle = t('earlyWarnings');
                notifBody = `• ${alarmLabels}`; }

                nextAlarms = nextAlarms.map(a => newlyTriggeredAlarms.find(na => na.id === a.id) ? { ...a, trig: true, on: false } : a);
                setWarAlarms(nextAlarms); if(syncRef.current) syncRef.current({ warAlarms: nextAlarms });
            }
            
            const alertType = newlyTriggeredAlarms.length > 0 && finishedLabels.length === 0 ?
            'war' : 'task';
            setAlertQueue(prev => [...prev, { title: alertTitle, body: notifBody, type: alertType }]);
        }

        if (changedTasks) {
            setTasks(nextTasks);
            if (hasNewFinishedTasks && syncRef.current) syncRef.current({ tasks: nextTasks });
        }
    }, 1000);

    return () => clearInterval(ticker);
  }, [t]);

  const handleNum = (setter) => (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 1 && v.startsWith('0')) v = v.replace(/^0+/, '');
    setter(v);
  };

  const syncWar = async () => {
    const h = parseInt(inputH || 0), m = parseInt(inputM || 0);
    if (h === 0 && m === 0) return;
    const end = new Date(Date.now() + (h * 3600000) + (m * 60000));
    setTargetEndTime(end);
    const rA = warAlarms.map(a => ({ ...a, trig: false, on: false })); 
    setWarAlarms(rA);
    if(syncRef.current) syncRef.current({ targetEndTime: end.getTime(), warAlarms: rA });
  };

  const toggleAlarm = (id) => {
      const next = warAlarms.map(a => a.id === id ? { ...a, on: !a.on, trig: false } : a);
      setWarAlarms(next); if(syncRef.current) syncRef.current({ warAlarms: next });
  };

  const handleCustomAlarmChange = (field, val) => {
      const cleanVal = val.replace(/\D/g, '');
      const next = warAlarms.map(a => a.id === 'custom' ? { ...a, [field]: cleanVal } : a);
      setWarAlarms(next);
      if(syncRef.current) syncRef.current({ warAlarms: next });
  };

  const updateDraft = (isBox, id, field, value) => {
    const setter = isBox ?
    setBoxCronoDrafts : setCronoDrafts;
    setter(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const changeDraftCount = (isBox, increment) => {
    const state = isBox ? boxCronoDrafts : cronoDrafts;
    const setter = isBox ? setBoxCronoDrafts : setCronoDrafts;
    if (increment) setter([...state, { id: Date.now(), label: '', h: '', m: '', s: '' }]);
    else if (state.length > 1) setter(state.slice(0, -1));
  };

  const handleEditBoxDraftCount = (increment) => {
      if (increment) setEditBoxDrafts([...editBoxDrafts, { id: Date.now(), label: '', h: '', m: '', s: '' }]);
      else if (editBoxDrafts.length > 0) setEditBoxDrafts(editBoxDrafts.slice(0, -1));
  };

  const updateEditBoxDraft = (id, field, value) => setEditBoxDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

  const addCrono = async () => {
    let nlTasks = [...tasks], nlRootOrder = [...rootOrder], baseTime = Date.now(), startingIndex = tasks.length + 1;
    cronoDrafts.forEach((draft, index) => {
        const h = parseInt(draft.h || 0), m = parseInt(draft.m || 0), s = parseInt(draft.s || 0);
        const total = (h * 3600) + (m * 60) + s;
        const label = (draft.label.trim() || `PLAN ${startingIndex + index}`).toUpperCase();
        
        const endTimeMs = baseTime + (total * 1000);
        const taskId = baseTime + index;
   
        
        nlTasks.push({ id: taskId, label, initialSeconds: total, remainingSeconds: total, serverEndTime: endTimeMs, isRunning: true, boxId: null, isNewFinish: false, alerted: false });
        nlRootOrder.push({ id: taskId, type: 'task' });
        
        scheduleNativeAlarm(taskId, label, "¡Crono Completado!", endTimeMs);
    });
    setTasks(nlTasks); setRootOrder(nlRootOrder);
    if(syncRef.current) syncRef.current({ tasks: nlTasks, rootOrder: nlRootOrder });
    setCronoDrafts([{ id: Date.now(), label: '', h: '', m: '', s: '' }]);
    setShowCronoForm(false);
  };

  const addBox = async () => {
    const boxId = "box_" + Date.now();
    const newBox = { id: boxId, name: (newBoxLabel.trim() || `SECTION ${boxes.length + 1}`).toUpperCase(), color: newBoxColor, isCollapsed: false };
    let nlBoxes = [...boxes, newBox], nlTasks = [...tasks], nlRootOrder = [...rootOrder, {id: boxId, type: 'box'}];
    const baseTime = Date.now(), startingIndex = tasks.length + 1;

    if (includeInitialCrono) {
        boxCronoDrafts.forEach((draft, index) => {
            const h = parseInt(draft.h || 0), m = parseInt(draft.m || 0), s = parseInt(draft.s || 0);
            const total = (h * 3600) + (m * 60) + s;
            const label = (draft.label.trim() || `PLAN ${startingIndex + index}`).toUpperCase();
        
            
            const taskId = baseTime + 1000 + index;
            const endTimeMs = baseTime + (total * 1000);
            
            nlTasks.push({ id: taskId, label, initialSeconds: total, remainingSeconds: total, serverEndTime: endTimeMs, isRunning: true, boxId: boxId, isNewFinish: false, alerted: false });
            scheduleNativeAlarm(taskId, label, "¡Crono Completado!", 
            endTimeMs);
        });
    }
    setBoxes(nlBoxes); setTasks(nlTasks); setRootOrder(nlRootOrder);
    if(syncRef.current) syncRef.current({ boxes: nlBoxes, tasks: nlTasks, rootOrder: nlRootOrder });
    setNewBoxLabel('');
    setBoxCronoDrafts([{ id: Date.now(), label: '', h: '', m: '', s: '' }]); setShowBoxForm(false); setIncludeInitialCrono(false);
  };

  const saveBoxEdit = async (boxId) => {
    const updatedName = editBuf.label.trim().toUpperCase() || "SECTION";
    const nb = boxes.map(b => b.id === boxId ? { ...b, name: updatedName, color: newBoxColor } : b);
    let nlTasks = [...tasks], baseTime = Date.now(), existingCount = tasks.filter(t => t.boxId === boxId).length;
    editBoxDrafts.forEach((draft, index) => {
        const total = ((parseInt(draft.h || 0) * 3600) + (parseInt(draft.m || 0) * 60) + parseInt(draft.s || 0));
        if (total > 0) {
            const label = (draft.label.trim() || `NEW ${existingCount + index + 1}`).toUpperCase();
            
            const taskId = baseTime + index;
         
            const endTimeMs = baseTime + (total * 1000);
            nlTasks.push({ id: taskId, label, initialSeconds: total, remainingSeconds: total, serverEndTime: endTimeMs, isRunning: true, boxId: boxId, isNewFinish: false, alerted: false });
            scheduleNativeAlarm(taskId, label, "¡Crono Completado!", endTimeMs);
        }
    });
    setBoxes(nb); setTasks(nlTasks);
    if(syncRef.current) syncRef.current({ boxes: nb, tasks: nlTasks }); 
    setEditingBoxId(null); setEditBoxDrafts([]);
  };

  const saveEdit = async (id) => {
    const ns = ((parseInt(editBuf.h) || 0) * 3600) + ((parseInt(editBuf.m) || 0) * 60) + ((parseInt(editBuf.s) || 0));
    const nl = tasks.map(t => {
      if (t.id === id) {
        const timeChanged = t.initialSeconds !== ns;
        const endTimeMs = timeChanged ? Date.now()+(ns*1000) : t.serverEndTime;
        
        if (timeChanged) {
            cancelNativeAlarm(t.id);
            scheduleNativeAlarm(t.id, t.label, "¡Crono Modificado y Completado!", endTimeMs);
        }

 
        return { 
          ...t, label: editBuf.label.trim().toUpperCase() || t.label, initialSeconds: ns, 
          remainingSeconds: timeChanged ? ns : t.remainingSeconds, 
          serverEndTime: endTimeMs,
          isRunning: timeChanged ? true : t.isRunning, isNewFinish: timeChanged ? false : t.isNewFinish, alerted: timeChanged ? false : t.alerted
        };
      }
      
      return t;
    });
    setTasks(nl); if(syncRef.current) syncRef.current({ tasks: nl }); setEditingId(null);
  };

  const handleBoxPlayPause = (boxId, forcePause) => {
    const nl = tasks.map(t => {
      if (t.boxId === boxId && t.remainingSeconds > 0) {
        const isRunning = forcePause ? false : true;
        const endTimeMs = isRunning ? Date.now() + (t.remainingSeconds * 1000) : null;
        
        if (!isRunning) {
            cancelNativeAlarm(t.id);
       
        } else {
            scheduleNativeAlarm(t.id, t.label, "¡Crono Reanudado Completado!", endTimeMs);
        }
        
        return { ...t, isRunning, serverEndTime: endTimeMs };
      }
      return t;
    });
    setTasks(nl); if(syncRef.current) syncRef.current({ tasks: nl });
  };

  const executeBoxReset = () => {
    if (!confirmBoxReset) return;
    const boxId = confirmBoxReset.id;
    const nl = tasks.map(t => {
      if (t.boxId === boxId) { 
          const endTimeMs = Date.now() + (t.initialSeconds * 1000);
          cancelNativeAlarm(t.id);
          scheduleNativeAlarm(t.id, t.label, "¡Crono Reiniciado Completado!", endTimeMs);
          return { ...t, remainingSeconds: t.initialSeconds, serverEndTime: endTimeMs, isRunning: true, isNewFinish: false, alerted: false }; 
      }
      return t;
 
    });
    setTasks(nl); if(syncRef.current) syncRef.current({ tasks: nl }); setConfirmBoxReset(null);
  };

  const toggleBoxCollapse = (boxId) => {
    const nb = boxes.map(b => b.id === boxId ? { ...b, isCollapsed: !b.isCollapsed } : b);
    setBoxes(nb); if(syncRef.current) syncRef.current({ boxes: nb });
  };

  const handleItemPointerDown = (e, id, type) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    if (pendingDragRef.current || isDraggingRef.current) return; 
    const clientX = e.clientX || (e.touches && e.touches[0].clientX), clientY = e.clientY || (e.touches && e.touches[0].clientY);
    setIsListening(true); 

    const timerId = setTimeout(() => {
        isDraggingRef.current = true; dragItemRef.current = { id, type }; dragIntentRef.current = null; pendingDragRef.current = null; 
        document.body.style.overflow = 'hidden'; document.body.style.touchAction = 'none'; 
        setDragState({ isDragging: true, item: { id, type }, pos: { x: clientX, y: clientY } });
    }, 350);
    pendingDragRef.current = { id, type, startX: clientX, startY: clientY, timerId };
  };

  const updateDropIndicator = useCallback((clientX, clientY) => {
      const element = document.elementFromPoint(clientX, clientY);
      const targetNode = element?.closest('[data-dnd-target="true"]');
      if (!targetNode) { dragIntentRef.current = null; setDropIndicator(null); return; }

      let targetId = targetNode.getAttribute('data-dnd-id');
      if (/^\d+$/.test(targetId)) targetId = parseInt(targetId, 10);
      const targetType = targetNode.getAttribute('data-dnd-type');
      let targetBoxId = targetNode.getAttribute('data-dnd-box');
      if (targetBoxId === 'null' || !targetBoxId) targetBoxId = null;

      const currentItem = dragItemRef.current;
      if (!currentItem || currentItem.id === targetId) return;
      if (currentItem.type === 'box' && (targetType === 'box-content' || targetType === 'box-footer' || targetBoxId !== null)) return;

      const rect = targetNode.getBoundingClientRect(), relY = clientY - rect.top;
      let position = 'after';

      if (targetType === 'box-header' || targetType === 'task') position = relY < rect.height / 2 ? 'before' : 'after';
      else if (targetType === 'box-content') position = 'inside';
      else if (targetType === 'box-footer') position = 'extract-after';
      const intent = { id: targetId, type: targetType, boxId: targetBoxId, position };
      if (!dragIntentRef.current || dragIntentRef.current.id !== intent.id || dragIntentRef.current.position !== intent.position || dragIntentRef.current.type !== intent.type) {
          dragIntentRef.current = intent;
          setDropIndicator(intent);
      }
  }, []);

  const executeAutoScroll = useCallback(() => {
      if (!isDraggingRef.current) return;
      const { y, x } = pointerPosRef.current;
      const threshold = 120, maxSpeed = 20;   
      let speed = 0;

      if (y < threshold) speed = -Math.max(2, maxSpeed * (1 - y / threshold));
      else if (y > window.innerHeight - threshold) speed = Math.max(2, maxSpeed * (1 - (window.innerHeight - y) / threshold));

   
      if (speed !== 0) { window.scrollBy(0, speed); updateDropIndicator(x, y); autoScrollRafRef.current = requestAnimationFrame(executeAutoScroll);
      } else { autoScrollRafRef.current = null; }
  }, [updateDropIndicator]);

  useEffect(() => {
    if (!isListening) return;
    const handleTouchMove = (e) => { if (isDraggingRef.current) e.preventDefault(); };
    const handleGlobalPointerMove = (e) => {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX), clientY = e.clientY || (e.touches && e.touches[0].clientY);

        if (pendingDragRef.current) {
            const dx = Math.abs(clientX - pendingDragRef.current.startX), dy = Math.abs(clientY - pendingDragRef.current.startY);
            if (dx > 10 || dy > 10) { clearTimeout(pendingDragRef.current.timerId); pendingDragRef.current = null; setIsListening(false); return; }
        }

        if (isDraggingRef.current) {
            pointerPosRef.current = { x: clientX, y: clientY };
            setDragState(prev => ({ ...prev, pos: pointerPosRef.current })); updateDropIndicator(clientX, clientY);
            if (clientY < 120 || clientY > window.innerHeight - 120) { if (!autoScrollRafRef.current) autoScrollRafRef.current = requestAnimationFrame(executeAutoScroll);
            } 
            else { if (autoScrollRafRef.current) { cancelAnimationFrame(autoScrollRafRef.current);
            autoScrollRafRef.current = null; } }
        }
    };

    const handleGlobalPointerUp = () => {
        if (pendingDragRef.current) { clearTimeout(pendingDragRef.current.timerId); pendingDragRef.current = null;
        }
        if (autoScrollRafRef.current) { cancelAnimationFrame(autoScrollRafRef.current); autoScrollRafRef.current = null;
        }
        if (isDraggingRef.current) { executePointerDrop(); } else { setIsListening(false);
        }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false }); 
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove); window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isListening, executeAutoScroll, updateDropIndicator]); 

  const executePointerDrop = async () => {
    const dragItem = dragItemRef.current, dropInd = dragIntentRef.current;
    document.body.style.overflow = ''; document.body.style.touchAction = '';
    setDragState({ isDragging: false, item: null, pos: { x: 0, y: 0 } });
    setDropIndicator(null);
    isDraggingRef.current = false; dragItemRef.current = null; setIsListening(false); 

    if (!dragItem) return;
    if (!dropInd) {
        if (dragItem.type === 'task') {
            let newTasks = tasks.map(t => ({...t})), newRootOrder = rootOrder.map(r => ({...r}));
            const taskIdx = newTasks.findIndex(t => t.id === dragItem.id);
            if (taskIdx > -1) newTasks[taskIdx].boxId = null;
            newRootOrder = newRootOrder.filter(item => item.id !== dragItem.id); newRootOrder.push({ id: dragItem.id, type: 'task' });
            setTasks(newTasks); setRootOrder(newRootOrder);
            if(syncRef.current) syncRef.current({ tasks: newTasks, rootOrder: newRootOrder });
        }
        return;
    }

    let newTasks = tasks.map(t => ({...t})), newRootOrder = rootOrder.map(r => ({...r}));
    if (dragItem.type === 'box') {
        newRootOrder = newRootOrder.filter(item => item.id !== dragItem.id);
        const targetIdx = newRootOrder.findIndex(item => item.id === dropInd.id);
        if (targetIdx !== -1) newRootOrder.splice(dropInd.position === 'before' ? targetIdx : targetIdx + 1, 0, { id: dragItem.id, type: 'box' });
    } 
    else if (dragItem.type === 'task') {
        const taskIdx = newTasks.findIndex(t => t.id === dragItem.id);
        if (taskIdx === -1) return;
        const taskToMove = { ...newTasks[taskIdx] }; newTasks.splice(taskIdx, 1);
        newRootOrder = newRootOrder.filter(item => item.id !== dragItem.id);
        if (dropInd.type === 'box-header') {
            taskToMove.boxId = null; newTasks.push(taskToMove);
            const boxRootIdx = newRootOrder.findIndex(item => item.id === dropInd.id);
            if (boxRootIdx !== -1) newRootOrder.splice(dropInd.position === 'before' ? boxRootIdx : boxRootIdx + 1, 0, { id: dragItem.id, type: 'task' });
            else newRootOrder.push({ id: dragItem.id, type: 'task' });
        }
        else if (dropInd.type === 'box-content' || dropInd.position === 'inside') { taskToMove.boxId = dropInd.id;
        newTasks.push(taskToMove); } 
        else if (dropInd.type === 'box-footer' || dropInd.position === 'extract-after') {
            taskToMove.boxId = null;
            newTasks.push(taskToMove);
            const boxRootIdx = newRootOrder.findIndex(item => item.id === dropInd.id);
            if (boxRootIdx !== -1) newRootOrder.splice(boxRootIdx + 1, 0, { id: dragItem.id, type: 'task' });
            else newRootOrder.push({ id: dragItem.id, type: 'task' });
        }
        else if (dropInd.type === 'task') {
            taskToMove.boxId = dropInd.boxId;
            if (dropInd.boxId !== null) {
                const targetTaskIdx = newTasks.findIndex(t => t.id === dropInd.id);
                if (targetTaskIdx !== -1) newTasks.splice(dropInd.position === 'before' ? targetTaskIdx : targetTaskIdx + 1, 0, taskToMove);
                else newTasks.push(taskToMove);
            } else {
                newTasks.push(taskToMove);
                const targetRootIdx = newRootOrder.findIndex(item => item.id === dropInd.id);
                if (targetRootIdx !== -1) newRootOrder.splice(dropInd.position === 'before' ? targetRootIdx : targetRootIdx + 1, 0, { id: dragItem.id, type: 'task' });
                else newRootOrder.push({ id: dragItem.id, type: 'task' });
            }
        }
    }
    setTasks(newTasks);
    setRootOrder(newRootOrder); if(syncRef.current) syncRef.current({ tasks: newTasks, rootOrder: newRootOrder });
  };

  const dismissNewFinish = (id) => {
      const nl = tasks.map(x => x.id === id ? { ...x, isNewFinish: false } : x);
      setTasks(nl); if(syncRef.current) syncRef.current({ tasks: nl });
  };

  const warRem = (() => {
    if (!targetEndTime) return { h: 0, m: 0, s: 0 };
    const d = targetEndTime.getTime() - currentTime.getTime();
    if (d <= 0) return { h: 0, m: 0, s: 0 };
    return { h: Math.floor(d/3600000), m: Math.floor((d%3600000)/60000), s: Math.floor((d%60000)/1000) };
  })();

  let globalTimePart = "--:--", globalAmpmPart = "--";
  if (targetEndTime) {
      const timeParts = targetEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).split(' ');
      globalTimePart = timeParts[0]; globalAmpmPart = timeParts[1] || '';
  }

  const formatRealTime = (date) => {
      let h = date.getHours();
      const m = String(date.getMinutes()).padStart(2, '0'), s = String(date.getSeconds()).padStart(2, '0'), ampm = h >= 12 ? 'P.M.' : 'A.M.';
      h = h % 12; h = h ? h : 12; 
      return { time: `${String(h).padStart(2, '0')}:${m}:${s}`, ampm };
  };

  const currentFormatted = formatRealTime(currentTime);
  const formatTime = (s) => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const renderTask = (t, isInside, targetBoxId = null) => {
    const isTarget = dropIndicator?.id === t.id && dropIndicator?.type === 'task';
    const isThisDragged = dragState.item?.id === t.id;
    const taskBaseStyle = t.isNewFinish ? 'bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 border-zinc-800';

    return (
      <div 
          key={t.id} data-dnd-target="true" data-dnd-id={t.id} data-dnd-type="task" data-dnd-box={targetBoxId}
          onPointerDown={(e) => handleItemPointerDown(e, t.id, 'task')} onContextMenu={(e) => e.preventDefault()} 
          className={`relative border rounded-xl p-2 px-3 flex flex-col mb-1.5 transition-all select-none ${taskBaseStyle}
              ${isThisDragged ? 'opacity-30 border-dashed border-amber-500 scale-[0.98]' : 'opacity-100 cursor-grab'}
              ${isInside ? 'mx-1' : ''}`}
          style={isInside && !isThisDragged && !t.isNewFinish ? { borderLeft: `3px solid ${boxes.find(b => b.id === t.boxId)?.color || '#333'}` } : {}}
      >
        {isTarget && dropIndicator.position === 'before' && <div className="absolute -top-[5px] left-0 right-0 h-1.5 bg-amber-500 rounded-full z-40 shadow-[0_0_10px_#f59e0b] pointer-events-none" />}
        {isTarget && dropIndicator.position === 'after' && <div className="absolute -bottom-[5px] left-0 right-0 h-1.5 bg-amber-500 rounded-full z-40 shadow-[0_0_10px_#f59e0b] pointer-events-none" />}

        <div className="flex justify-between items-center h-5">
   
          <div className="flex-1 min-w-0 pr-2">
            {editingId === t.id ?
            ( <input className="w-full bg-zinc-800 border border-blue-500 text-[10px] font-black p-1 px-2 rounded outline-none text-white uppercase" value={editBuf.label} onChange={e => setEditBuf({...editBuf, label: e.target.value})} autoFocus />
            ) : ( <span className={`text-[12px] font-black uppercase truncate block leading-none pointer-events-none ${t.isNewFinish ? 'text-red-300' : 'text-zinc-400'}`}>{t.label}</span> )}
          </div>
          {editingId !== t.id && <div className={`p-1 pointer-events-none ${t.isNewFinish ?
          'text-red-800' : 'text-zinc-800'}`}><GripVertical size={14} /></div>}
        </div>
        
        <div className="flex items-center justify-between pointer-events-none mt-1">
          <div className="flex-1">
              {editingId === t.id ?
              (
                  <div className="flex items-center gap-2 animate-in fade-in pointer-events-auto">
                      <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={editBuf.h} onChange={e => setEditBuf({...editBuf, h: e.target.value.replace(/\D/g,'')})} className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-center text-lg font-mono outline-none focus:border-blue-500 transition-colors"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[8px] text-zinc-500 font-bold uppercase">H</span></div><span className="text-zinc-600 font-bold">:</span>
                    
                      <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={editBuf.m} onChange={e => setEditBuf({...editBuf, m: e.target.value.replace(/\D/g,'')})} className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-center text-lg font-mono outline-none focus:border-blue-500 transition-colors"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[8px] text-zinc-500 font-bold uppercase">M</span></div><span className="text-zinc-600 font-bold">:</span>
                      <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={editBuf.s} onChange={e => setEditBuf({...editBuf, s: e.target.value.replace(/\D/g,'')})} className="w-14 bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-center text-lg font-mono outline-none focus:border-amber-500 transition-colors"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[8px] text-amber-500 font-bold uppercase">S</span></div>
          
                  </div>
              ) : ( <div className={`text-2xl font-mono font-bold leading-none tracking-tighter transition-colors duration-300 ${!t.isRunning && t.remainingSeconds > 0 ?
              'text-yellow-400' : (t.remainingSeconds === 0 ? 'text-red-500' : 'text-white')} ${t.isNewFinish ?
              'animate-pulse' : ''}`}>{formatTime(t.remainingSeconds)}</div> )}
          </div>

          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2 shrink-0 pointer-events-auto h-full">
            {editingId === t.id ?
            (
              <div className="flex gap-1"><button onClick={() => setEditingId(null)} className="p-2 bg-zinc-700/80 rounded-lg text-white hover:bg-zinc-600 transition-colors active:scale-90"><X size={16}/></button><button onClick={() => saveEdit(t.id)} className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors active:scale-90 shadow-md shadow-blue-900/50"><Check size={16}/></button></div>
            ) : (
              <>
                {t.isNewFinish && ( <button onClick={(e) => { e.stopPropagation(); dismissNewFinish(t.id); }} className="p-1 px-2.5 bg-red-600 text-white rounded-lg font-black 
                text-[9px] uppercase flex items-center gap-1 animate-pulse hover:bg-red-500 mr-1 shadow-[0_0_10px_rgba(220,38,38,0.5)]"><Check size={12}/> Visto</button> )}
                
                <button onClick={async () => { 
                    const endTimeMs = Date.now() + (t.initialSeconds * 1000);
                    cancelNativeAlarm(t.id);
     
                    scheduleNativeAlarm(t.id, t.label, "¡Crono Reiniciado Completado!", endTimeMs);
                    const nl = tasks.map(x => x.id === t.id ? { ...x, remainingSeconds: x.initialSeconds, serverEndTime: endTimeMs, isRunning: true, isNewFinish: false, alerted: false } : x);
                    setTasks(nl); if(syncRef.current) syncRef.current({ tasks: nl }); 
                }} className={`p-1.5 transition-colors ${t.isNewFinish ?
                'text-red-300 hover:text-white' : 'text-zinc-700 hover:text-amber-500'}`}><RotateCcw size={16} /></button>
                
                <button onClick={() => { const hVal = Math.floor(t.initialSeconds / 3600);
                const mVal = Math.floor((t.initialSeconds % 3600) / 60); const sVal = t.initialSeconds % 60;
                setEditBuf({ label: t.label, h: hVal > 0 ? String(hVal) : '', m: mVal > 0 ? String(mVal) : '', s: sVal > 0 ? String(sVal) : '' });
                setEditingId(t.id); }} className={`p-1.5 transition-colors ${t.isNewFinish ? 'text-red-400 hover:text-white' : 'text-zinc-700 hover:text-blue-400'}`}><Edit2 size={16} /></button>
                
                <button onClick={async () => { 
                    const isRunningNow = !t.isRunning;
                    const endTimeMs = isRunningNow ? Date.now() + (t.remainingSeconds * 1000) : null;
                    if (!isRunningNow) { cancelNativeAlarm(t.id);
                    } 
                    else { scheduleNativeAlarm(t.id, t.label, "¡Crono Reanudado Completado!", endTimeMs);
                    }
                    const nl = tasks.map(x => x.id === t.id ? { ...x, isRunning: isRunningNow, serverEndTime: endTimeMs } : x);
                    setTasks(nl); if(syncRef.current) syncRef.current({ tasks: nl }); 
                }} className={`p-1.5 ${!t.isRunning && t.remainingSeconds > 0 ?
                'text-yellow-400' : (t.isNewFinish ? 'text-red-300' : 'text-zinc-600')}`}>{t.isRunning && t.remainingSeconds > 0 ?
                <Pause size={18} /> : <Play size={18} />}</button>
                
                <button onClick={async () => { 
                    cancelNativeAlarm(t.id);
                    const nt = tasks.filter(x => x.id !== t.id); const nr = rootOrder.filter(item => item.id !== t.id); setTasks(nt); setRootOrder(nr);
                    if(syncRef.current) syncRef.current({ tasks: nt, rootOrder: nr }); 
                }} className={`p-1.5 transition-colors ${t.isNewFinish ?
                'text-red-500 hover:text-white' : 'text-zinc-800 hover:text-red-600'}`}><Trash2 size={16} /></button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 pb-32 overflow-x-hidden font-sans">
      <style>{`
        @keyframes tremble { 0% { transform: rotate(1.5deg) scale(1.05); } 50% { transform: rotate(-1.5deg) scale(1.05); } 100% { transform: rotate(1.5deg) scale(1.05); } }
        .is-ghost { animation: tremble 0.12s infinite !important; }
        .drop-inside-target { background-color: rgba(245, 158, 11, 0.08) !important; border-color: #f59e0b !important; }
        .drop-extract-target { background-color: rgba(239, 68, 68, 0.15) !important; border-color: #ef4444 !important; }
        * { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
        input { user-select: text; -webkit-user-select: text; -webkit-touch-callout: default; }
      `}</style>

      {activeHelp && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActiveHelp(null)}>
          <div className="bg-zinc-900 border border-blue-500 p-6 rounded-3xl max-w-sm w-full relative shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
   
             <button onClick={() => setActiveHelp(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
             <div className="flex items-center gap-3 mb-4 text-blue-400">
               <Info size={24} />
               <h3 className="font-black uppercase text-lg leading-tight">{t(`help_${activeHelp}_title`)}</h3>
             </div>
             <div className="text-zinc-300 text-sm font-bold whitespace-pre-wrap leading-relaxed">
                 {t(`help_${activeHelp}_desc`)}
             </div>
             <button onClick={() => setActiveHelp(null)} className="w-full mt-6 bg-blue-900/30 text-blue-400 py-3 rounded-xl font-black uppercase text-xs hover:bg-blue-600 hover:text-white transition-colors">{t('understood')}</button>
          </div>
        </div>
      )}

      {dragState.isDragging && (
      
          <div className="fixed z-[9999] pointer-events-none is-ghost shadow-[0_20px_50px_rgba(245,158,11,0.5)] border-2 border-amber-500 rounded-xl bg-zinc-900/95 px-4 py-3 backdrop-blur" style={{ left: dragState.pos.x - 70, top: dragState.pos.y - 30 }}>
              <span className="text-amber-500 font-black text-xs uppercase flex items-center gap-2 tracking-widest"><GripVertical size={14}/> {t('moving')}</span>
          </div>
      )}

      {showSoundMenu && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md pointer-events-auto">
        
             <div className="bg-zinc-900 border border-amber-500 w-full max-w-sm rounded-[32px] shadow-[0_0_50px_rgba(245,158,11,0.15)] relative animate-in zoom-in duration-300 flex flex-col max-h-[85vh]">
               <div className="p-5 pb-3 border-b border-zinc-800 flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-2"><Music className="text-amber-500" size={24} /><h2 className="text-lg font-black text-white uppercase leading-none tracking-wide">{t('soundConfig')}</h2></div>
                   <button onClick={() => { setShowSoundMenu(false); stopInfiniteAlarm(); }} className="text-zinc-500 hover:text-white p-1"><X size={24}/></button>
               </div>
               <div className="overflow-y-auto p-4 space-y-6">
                   <div>
                       <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2"><BellRing size={12}/> {t('earlyWarnings')}</h3>
         
                       <div className="space-y-1.5">
                           {SOUND_PROFILES.map(prof => (
                               <div key={`war-${prof.id}`} className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${warSound === prof.id ? 'bg-amber-600/20 border-amber-500' : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-600'}`} onClick={() => { setWarSound(prof.id); playPreview(prof.id); 
                               if(syncRef.current) syncRef.current({ warSound: prof.id }); }}>
                                   <div className="flex items-center gap-3"><button onClick={(e) => { e.stopPropagation(); playPreview(prof.id); }} className="p-1.5 bg-zinc-950 rounded-lg text-zinc-400 hover:text-amber-500"><Play size={12}/></button><div><span className={`block text-xs font-black uppercase ${warSound === prof.id ?
                                   'text-amber-500' : 'text-zinc-300'}`}>{prof.name}</span><span className="block text-[8px] text-zinc-500 font-bold uppercase">{prof.type}</span></div></div>{warSound === prof.id && <Check size={16} className="text-amber-500 mr-2"/>}
                               </div>
                           ))}
                       </div>
     
                   </div>
                   <div>
                       <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Check size={12}/> {t('taskFinished')}</h3>
                       <div className="space-y-1.5">
         
                           {SOUND_PROFILES.map(prof => (
                               <div key={`task-${prof.id}`} className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${taskSound === prof.id ? 'bg-blue-600/20 border-blue-500' : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-600'}`} onClick={() => { setTaskSound(prof.id); playPreview(prof.id);
                               if(syncRef.current) syncRef.current({ taskSound: prof.id }); }}>
                                   <div className="flex items-center gap-3"><button onClick={(e) => { e.stopPropagation(); playPreview(prof.id); }} className="p-1.5 bg-zinc-950 rounded-lg text-zinc-400 hover:text-blue-500"><Play size={12}/></button><div><span className={`block text-xs font-black uppercase ${taskSound === prof.id ?
                                   'text-blue-400' : 'text-zinc-300'}`}>{prof.name}</span><span className="block text-[8px] text-zinc-500 font-bold uppercase">{prof.type}</span></div></div>{taskSound === prof.id && <Check size={16} className="text-blue-500 mr-2"/>}
                               </div>
                           ))}
                       </div>
     
                   </div>
               </div>
            </div>
        </div>
      )}

      {confirmBoxReset && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md text-center">
            <div className="bg-zinc-900 w-full max-w-xs p-6 rounded-[32px] shadow-2xl animate-in zoom-in duration-300 border border-amber-500">
              <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500"/><h2 className="text-xl font-black text-white uppercase mb-2 leading-none">{t('confirmResetTitle')}</h2>
              <p className="text-zinc-400 font-bold mb-6 text-sm leading-tight whitespace-pre-wrap">{t('confirmResetDesc')} <span className="text-amber-500">{confirmBoxReset.name}</span>?</p>
              <div className="flex gap-3"><button onClick={() => setConfirmBoxReset(null)} className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-transform hover:bg-amber-500">{t('cancel')}</button><button onClick={executeBoxReset} className="flex-1 bg-zinc-800 text-zinc-400 py-3 rounded-xl font-black text-xs uppercase transition-colors hover:bg-zinc-700 active:scale-95 hover:text-red-500">{t('resetAll')}</button></div>
    
            </div>
          </div>
      )}

      <div className="max-w-md mx-auto space-y-4 pt-2">
        <div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800 shadow-lg relative z-[50]">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="text-amber-500 shrink-0" size={20} />
            <h1 className="text-lg xs:text-xl font-black text-amber-500 uppercase leading-none tracking-tighter hidden xs:block mr-1">{t('appTitle')}</h1>
            
            <button onClick={() => setActiveHelp('header')} className="text-zinc-600 hover:text-blue-400 transition-colors p-1"><Info size={14}/></button>

            <button onClick={toggleLanguage} className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-md px-1.5 py-1 xs:ml-2 hover:bg-zinc-700 transition-colors">
                <Globe size={12} className="text-zinc-400"/>
                <span className="text-[10px] font-black text-white uppercase">{lang}</span>
 
            </button>
          </div>
          
          <div className="flex gap-1">
            <button onClick={toggleSoundProfile} className={`p-1.5 rounded-lg border transition-colors ${soundProfile !== 'muted' ?
            'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-900/40' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{soundProfile === 'siren' ? <Volume2 size={18}/> : soundProfile === 'radar' ?
            <Volume1 size={18}/> : <VolumeX size={18}/>}</button>
            <button onClick={() => setShowSoundMenu(true)} className="p-1.5 bg-zinc-800 text-amber-500 border border-zinc-700 rounded-lg shadow-lg hover:bg-zinc-700 transition-colors"><Music size={18}/></button>
            <button onClick={() => { const next = !vibrateOn;
            setVibrateOn(next); if(!next) stopInfiniteAlarm(); if(syncRef.current) syncRef.current({ vibrateOn: next }); }} className={`p-1.5 rounded-lg border transition-colors ${vibrateOn ?
            'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-900/40' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}><VibrateIcon size={18}/></button>
            
            <button onClick={toggleSystemNotifications} className={`p-1.5 rounded-lg border transition-colors ${sysNotifOn ?
            'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                <Smartphone size={18}/>
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center mb-4">
            <div className={`border rounded-full px-5 py-2 shadow-lg flex items-center gap-3 backdrop-blur-sm whitespace-nowrap transition-colors duration-500 bg-zinc-900/80 border-zinc-700/50`}>
        
                <Clock className="text-amber-500 shrink-0" size={16} />
                <div className="flex items-baseline gap-1.5"><span className="text-3xl font-mono font-light text-white tracking-widest leading-none">{currentFormatted.time}</span><span className="text-sm font-black uppercase tracking-wider text-zinc-400">{currentFormatted.ampm}</span></div>
            </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
      
          <div className="text-[11vw] xs:text-5xl font-mono font-black text-white text-center tabular-nums leading-none mb-3 tracking-tighter">{String(warRem.h).padStart(2, '0')}:{String(warRem.m).padStart(2, '0')}:{String(warRem.s).padStart(2, '0')}</div>
          
          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-end">
            <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500 font-black uppercase tracking-wide mb-1">{t('endTime')}</span>
                <button onClick={() => setActiveHelp('time')} className="text-zinc-600 hover:text-blue-400 mb-1 transition-colors"><Info size={12}/></button>
            </div>
            <div className="flex items-baseline gap-1 text-amber-500"><span className="text-3xl font-mono font-black leading-none tracking-tight">{globalTimePart}</span><span className="text-sm font-black uppercase mb-0.5">{globalAmpmPart}</span></div>
          </div>

          <div className="mt-5 border-t border-zinc-800/50 pt-4">
              <div className="flex justify-between items-center mb-3">
                 
                 <span className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest flex items-center gap-1"><BellRing size={10}/> {t('earlyWarnings')}</span>
                  <button onClick={syncWar} className="bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:border-amber-500 text-[9px] font-black py-1 px-3 rounded-full flex items-center gap-1 active:scale-95 transition-all"><RotateCcw size={10} /> {t('sync')}</button>
              </div>
              <div className="flex gap-2 mb-3">
                  <div className="relative flex-1"><input type="text" inputMode="numeric" placeholder="0" value={inputH} onChange={handleNum(setInputH)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 text-xl font-mono text-center outline-none focus:border-amber-500 transition-colors" /><p className="absolute -top-2 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[8px] text-zinc-600 font-bold uppercase">H</p></div>
                  <div className="relative flex-1"><input type="text" inputMode="numeric" placeholder="0" value={inputM} onChange={handleNum(setInputM)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 text-xl font-mono text-center outline-none focus:border-amber-500 transition-colors" /><p className="absolute -top-2 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[8px] text-zinc-600 font-bold uppercase">M</p></div>
              </div>
          
              <div className="flex gap-2 h-10">
                  {warAlarms.map(a => {
                      if (a.custom) {
                          return (
                      
                               <div key={a.id} className={`flex-[2] flex items-center justify-between rounded-xl border transition-colors ${a.on ?
                               'bg-amber-600 border-amber-500' : 'bg-zinc-950 border-zinc-800'}`}>
                                  <div className="flex flex-1 items-center justify-center gap-0.5 px-1 py-1"><input type="text" inputMode="numeric" placeholder="H" value={a.h} disabled={a.on} onChange={e => handleCustomAlarmChange('h', e.target.value)} className={`w-7 bg-transparent text-center text-xs font-black outline-none placeholder-zinc-700 ${a.on ?
                                  'text-white' : 'text-zinc-500'}`} />:<input type="text" inputMode="numeric" placeholder="M" value={a.m} disabled={a.on} onChange={e => handleCustomAlarmChange('m', e.target.value)} className={`w-7 bg-transparent text-center text-xs font-black outline-none placeholder-zinc-700 ${a.on ?
                                  'text-white' : 'text-zinc-500'}`} />:<input type="text" inputMode="numeric" placeholder="S" value={a.s} disabled={a.on} onChange={e => handleCustomAlarmChange('s', e.target.value)} className={`w-7 bg-transparent text-center text-xs font-black outline-none placeholder-zinc-700 ${a.on ?
                                  'text-white' : 'text-zinc-500'}`} /></div>
                                  <button onClick={() => toggleAlarm(a.id)} className={`h-full px-2.5 rounded-r-xl border-l flex items-center justify-center transition-colors ${a.on ?
                                  'border-amber-700 hover:bg-amber-700' : 'border-zinc-800 hover:bg-zinc-800'}`}><div className={`w-2 h-2 rounded-full ${a.on ?
                                  'bg-white shadow-[0_0_5px_white]' : 'bg-zinc-700'}`} /></button>
                              </div>
                          );
                      }
                      return ( <button key={a.id} onClick={() => toggleAlarm(a.id)} className={`flex-1 rounded-xl text-xs font-black transition-all border ${a.on ? 'bg-amber-600 text-white border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}>{a.mins}M</button> );
                  })}
              </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                 <button onClick={() => setActiveHelp('creation')} className="bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-blue-400 transition-colors p-1.5 rounded-full shadow-lg"><Info size={14}/></button>
        
            </div>
            
            <button onClick={() => { setShowCronoForm(!showCronoForm); setShowBoxForm(false); }} className={`py-3 rounded-2xl border font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${showCronoForm ?
            'bg-amber-500 text-black border-amber-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
                {t('addCrono')}
            </button>
            <button onClick={() => { setShowBoxForm(!showBoxForm); setShowCronoForm(false); }} className={`py-3 rounded-2xl border font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${showBoxForm ?
            'bg-blue-600 text-white border-blue-600' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
                {t('addSection')}
            </button>
        </div>

        {showCronoForm && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-3 space-y-3 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center px-1"><span className="text-[10px] font-black uppercase text-zinc-500">{t('createCronoTitle')}</span><div className="flex gap-2"><button onClick={() => changeDraftCount(false, false)} className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"><Minus size={14}/></button><button onClick={() => changeDraftCount(false, true)} className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"><Plus size={14}/></button></div></div>
                <div className="space-y-2">
                    {cronoDrafts.map((draft, i) => (
                        <div key={draft.id} className="space-y-2 p-2 bg-black/40 rounded-xl border border-zinc-800 animate-in fade-in">
     
                               <input type="text" placeholder={`${t('planNamePlaceholder')} ${tasks.length + i + 1}`} value={draft.label} onChange={e => updateDraft(false, draft.id, 'label', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold w-full outline-none uppercase placeholder-zinc-600" />
                            <div className="grid grid-cols-3 gap-1.5">
                   
                                <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.h} onChange={e => updateDraft(false, draft.id, 'h', e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-center text-xs font-mono outline-none"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[7px] text-zinc-600 font-bold uppercase">H</span></div>
                                <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.m} onChange={e => updateDraft(false, draft.id, 'm', e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-center text-xs font-mono outline-none"/><span 
                                className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[7px] text-zinc-600 font-bold uppercase">M</span></div>
                                <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.s} onChange={e => updateDraft(false, draft.id, 's', e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-center text-xs font-mono outline-none"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-1 text-[7px] text-amber-500 font-bold uppercase">S</span></div>
                           
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={addCrono} className="w-full bg-amber-600 text-white rounded-xl py-3 font-black text-[10px] uppercase shadow-lg active:scale-95 transition-transform">{t('createCronoBtn')}</button>
           
            </div>
        )}

        {showBoxForm && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-3 space-y-3 animate-in slide-in-from-top-2">
                <input type="text" placeholder={`${t('sectionNamePlaceholder')} ${boxes.length + 1}`} value={newBoxLabel} onChange={e => setNewBoxLabel(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold w-full outline-none uppercase placeholder-zinc-600" />
                <div className="flex justify-between items-center px-1">
   
                                 <span className="text-[9px] font-black text-zinc-600 uppercase">{t('banner')}</span>
                    <div className="flex gap-1.5">{COLORS.map(c => <button key={c.hex} onClick={() => setNewBoxColor(c.hex)} className={`w-5 h-5 rounded-full border-2 transition-transform ${newBoxColor === c.hex ?
                    'border-white scale-110' : 'border-transparent opacity-50'}`} style={{ backgroundColor: c.hex }} />)}</div>
                </div>
                <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeInitialCrono ? 'bg-blue-600 border-blue-600' : 'border-zinc-700'}`}><input type="checkbox" className="hidden" checked={includeInitialCrono} onChange={() => setIncludeInitialCrono(!includeInitialCrono)} />{includeInitialCrono && <Check size={12} className="text-white"/>}</div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase group-active:text-blue-400">{t('includeCronos')}</span>
                    </label>
                    {includeInitialCrono && ( <div className="flex gap-2"><button onClick={() => changeDraftCount(true, false)} className="p-1 bg-zinc-800 rounded text-zinc-400 hover:text-white"><Minus size={12}/></button><button onClick={() => changeDraftCount(true, true)} className="p-1 bg-zinc-800 rounded text-zinc-400 hover:text-white"><Plus size={12}/></button></div> )}
                </div>

                {includeInitialCrono && (
                    <div className="space-y-2">
                        {boxCronoDrafts.map((draft, i) => (
    
                                <div className="space-y-2 p-2 bg-black/40 rounded-xl border border-zinc-800 animate-in fade-in" key={draft.id}>
                                <input type="text" placeholder={`${t('planNamePlaceholder')} ${tasks.length + i + 1}`} value={draft.label} onChange={e => updateDraft(true, draft.id, 'label', e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] font-bold w-full outline-none uppercase placeholder-zinc-600" />
        
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.h} onChange={e => updateDraft(true, draft.id, 'h', e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-900 border border-zinc-800 rounded py-1 text-center text-xs font-mono outline-none"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase">H</span></div>
        
                                    <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.m} onChange={e => updateDraft(true, draft.id, 'm', e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-900 border border-zinc-800 rounded py-1 text-center text-xs font-mono outline-none"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase">M</span></div>
                                    <div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.s} onChange={e => updateDraft(true, draft.id, 's', e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-900 border border-zinc-800 rounded py-1 text-center text-xs font-mono outline-none"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase text-amber-500">S</span></div>
                                </div>
                            </div>
                 
                        ))}
                    </div>
                )}
                <button onClick={addBox} className="w-full bg-blue-600 text-white rounded-xl py-3 font-black text-[10px] uppercase shadow-lg active:scale-95 transition-transform">{t('createSectionBtn')}</button>
            </div>
        )}

        <div className="space-y-4 pt-2">
            {rootOrder.map(item => {
                if (item.type === 'task') {
                    const task = tasks.find(t => t.id === item.id);
                    return task ? renderTask(task, false, null) : null;
                } else {
                    const box = boxes.find(b => b.id === item.id);
                    if (!box) return null;
                    
                    const isHeaderTarget = dropIndicator?.id === box.id && dropIndicator?.type === 'box-header';
                    const isContentTarget = dropIndicator?.id === box.id && dropIndicator?.type === 'box-content';
                    const isFooterTarget = dropIndicator?.id === box.id && dropIndicator?.type === 'box-footer';
                    const isThisBoxDragged = dragState.item?.id === box.id;
                    const isMenuOpen = openBoxMenuId === box.id;
                    
                    const boxTasks = tasks.filter(t => t.boxId === box.id);
                    const activeTasks = boxTasks.filter(t => t.isRunning && t.remainingSeconds > 0);
                    const pausedTasks = boxTasks.filter(t => !t.isRunning && t.remainingSeconds > 0);
                    const finishedTasks = boxTasks.filter(t => t.remainingSeconds === 0);
                    
                    const nextTask = activeTasks.length > 0 ?
                    activeTasks.reduce((prev, curr) => prev.remainingSeconds < curr.remainingSeconds ? prev : curr) : null;
                    const pausedNextTask = pausedTasks.length > 0 ?
                    pausedTasks.reduce((prev, curr) => prev.remainingSeconds < curr.remainingSeconds ? prev : curr) : null;
                    const allPausedOrFinished = activeTasks.length === 0;
                    return (
                        <div key={box.id} className={`rounded-xl transition-all relative flex flex-col ${isThisBoxDragged ? 'opacity-30 scale-[0.98] border-dashed border-2 border-amber-500' : 'opacity-100 shadow-lg'}`}>
                            <div 
                              
                                 data-dnd-target={editingBoxId !== box.id ? "true" : "false"} data-dnd-id={box.id} data-dnd-type="box-header"
                                onPointerDown={(e) => { if(editingBoxId !== box.id) handleItemPointerDown(e, box.id, 'box'); }} onContextMenu={(e) => e.preventDefault()} 
                                className={`flex flex-col justify-between overflow-hidden border border-zinc-800 bg-zinc-900/95 relative z-10 select-none ${editingBoxId !== box.id 
                                ? 'cursor-grab active:cursor-grabbing' : ''} ${box.isCollapsed ? 'rounded-xl shadow-md' : 'rounded-t-xl'}`}
                                style={{ borderLeft: `5px solid ${box.color}` }}
                            >
                         
                                {isHeaderTarget && dropIndicator.position === 'before' && <div className="absolute -top-1 left-0 right-0 h-1.5 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b] pointer-events-none z-40" />}
                                {isHeaderTarget && dropIndicator.position === 'after' && <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b] pointer-events-none z-40" />}

                           
                                {editingBoxId === box.id ? (
                                    <div className="flex-1 flex flex-col p-3 bg-zinc-900/90 w-full animate-in fade-in">
                                        <div className="flex gap-2 items-center w-full mb-3"><input className="min-w-0 w-full bg-zinc-800 text-xs font-black p-2 rounded outline-none border border-blue-500 uppercase text-white shadow-inner" value={editBuf.label} onChange={e => setEditBuf({...editBuf, label: e.target.value})} autoFocus placeholder={t('sectionNamePlaceholder')}/><div className="flex gap-1 shrink-0">{COLORS.map(c => <button key={c.hex} onClick={()=>setNewBoxColor(c.hex)} className={`w-5 h-5 rounded-full ${newBoxColor === c.hex ? 'border-2 border-white scale-110 shadow-lg' : 'opacity-40'}`} style={{backgroundColor:c.hex}}/>)}</div><div className="flex gap-1 shrink-0 border-l border-zinc-700 pl-2"><button onClick={() => { setEditingBoxId(null); setEditBoxDrafts([]); }} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-90 transition-all shadow-sm"><X size={14}/></button><button onClick={() => saveBoxEdit(box.id)} className="p-2 bg-blue-600 rounded-lg text-white active:scale-90 shadow-md hover:bg-blue-500 transition-all"><Check size={14}/></button></div></div>
                        
                                        <div className="flex items-center justify-between px-1 py-2 border-t border-zinc-800/80"><span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest flex items-center gap-1.5"><Plus size={10}/> {t('addCrono')}</span><div className="flex gap-1.5"><button onClick={() => handleEditBoxDraftCount(false)} className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shadow-sm"><Minus size={12}/></button><button onClick={() => handleEditBoxDraftCount(true)} className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors shadow-sm"><Plus size={12}/></button></div></div>
                                        <div className="space-y-1.5 mt-1">
                                            {editBoxDrafts.map((draft, i) => (
                                                <div key={draft.id} className="flex gap-1.5 items-center bg-black/40 p-1.5 rounded-lg border border-zinc-800/80">
                                                    <input type="text" placeholder={`NEW ${boxTasks.length + i + 1}`} value={draft.label} onChange={e => updateEditBoxDraft(draft.id, 'label', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-[10px] font-bold w-full outline-none uppercase placeholder-zinc-600 h-8" />
                 
                                                    <div className="flex gap-1 shrink-0"><div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.h} onChange={e => updateEditBoxDraft(draft.id, 'h', e.target.value.replace(/\D/g, ''))} className="w-9 h-8 bg-zinc-800 border border-zinc-700 rounded text-center text-[10px] font-mono outline-none"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-0.5 text-[6px] text-zinc-500 font-bold uppercase">H</span></div><div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.m} onChange={e => updateEditBoxDraft(draft.id, 'm', e.target.value.replace(/\D/g, ''))} className="w-9 h-8 bg-zinc-800 border border-zinc-700 rounded text-center text-[10px] font-mono outline-none"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-0.5 text-[6px] text-zinc-500 font-bold uppercase">M</span></div><div className="relative"><input type="text" inputMode="numeric" placeholder="0" value={draft.s} onChange={e => updateEditBoxDraft(draft.id, 's', e.target.value.replace(/\D/g, ''))} className="w-9 h-8 bg-zinc-800 border border-zinc-700 rounded text-center text-[10px] font-mono outline-none border-b-amber-500/50"/><span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 px-0.5 text-[6px] text-amber-500 font-bold uppercase">S</span></div></div>
                                                </div>
                    
                                            ))}
                                        </div>
                                    
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-between px-4 py-3 pointer-events-none relative h-[52px]">
                     
                                        <div className={`absolute left-4 flex items-center gap-3 transition-all duration-300 ${isMenuOpen ?
                                        '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                                            <span className="text-[13px] font-black text-white uppercase tracking-wider" style={{ color: box.color }}>{box.name}</span><span className="text-[10px] font-black text-zinc-300 bg-zinc-800/80 border border-zinc-700/50 px-2 py-0.5 rounded-md shadow-inner">{boxTasks.length}</span>
                                 
                                        </div>

                                        <div className="absolute right-3 flex items-center pointer-events-auto h-full">
                                            {isMenuOpen ?
                                            (
                                                <div className="flex items-center gap-1.5 animate-in slide-in-from-right-8 fade-in duration-200">
                                             
                                                    <button onClick={() => setConfirmBoxReset({id: box.id, name: box.name})} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-amber-500 hover:border-amber-500/50 transition-colors shadow-sm" title="Reiniciar todos"><RotateCcw size={16}/></button><button onClick={() => handleBoxPlayPause(box.id, !allPausedOrFinished)} className={`p-2 bg-zinc-800 border border-zinc-700 rounded-lg transition-colors shadow-sm ${!allPausedOrFinished ? 'text-zinc-400 hover:text-yellow-400 hover:border-yellow-500/50' : 'text-zinc-400 hover:text-blue-400 hover:border-blue-500/50'}`} title={!allPausedOrFinished ? 'Pausar todos' : 'Reanudar todos'}>{!allPausedOrFinished ? <Pause size={16}/> : <Play size={16}/>}</button><div className="w-px h-6 bg-zinc-700 mx-1"></div><button onClick={() => { setEditingBoxId(box.id);
                                                    setEditBuf({label: box.name}); setNewBoxColor(box.color); setEditBoxDrafts([]); setOpenBoxMenuId(null); }} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-blue-400 transition-colors shadow-sm"><Edit2 size={16}/></button><button onClick={async () => { const nb = boxes.filter(b => b.id !== box.id);
                                                    let nr = rootOrder.filter(i => i.id !== box.id); const nt = tasks.map(t => { if (t.boxId === box.id) { nr.push({ id: t.id, type: 'task' }); return { ...t, boxId: null }; } return t; });
                                                    setBoxes(nb); setRootOrder(nr); setTasks(nt); if(syncRef.current) syncRef.current({boxes: nb, rootOrder: nr, tasks: nt});
                                                    }} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-red-500 transition-colors shadow-sm"><Trash2 size={16}/></button><button onClick={() => setOpenBoxMenuId(null)} className="p-2 ml-1 text-zinc-500 hover:text-white transition-colors bg-zinc-700/30 hover:bg-zinc-700/80 rounded-full"><X size={18}/></button>
                                                </div>
                              
                                            ) : (
                                                <div className="flex items-center gap-1.5 animate-in fade-in"><button onClick={() => setOpenBoxMenuId(box.id)} className="p-2 text-zinc-500 hover:text-white transition-colors hover:bg-zinc-800 rounded-lg cursor-pointer"><Settings size={20} /></button><div className="w-px h-6 bg-zinc-800"></div><button onClick={() => toggleBoxCollapse(box.id)} className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800 rounded-lg cursor-pointer">{box.isCollapsed ? <ChevronDown size={22}/> : <ChevronUp size={22}/>}</button></div>
                                            )}
                                        </div>
                
                                    </div>
                                )}
                            </div>
                    
         
                            <div 
                                data-dnd-target="true" data-dnd-id={box.id} data-dnd-type="box-content"
                                className={`border-zinc-800 transition-colors relative bg-zinc-950/40 min-h-[40px] ${isContentTarget ? 'drop-inside-target' : ''} ${box.isCollapsed ? 'border-0 rounded-b-xl' : 'border-l border-r p-1.5 pt-3'}`}
                            >
                                {isContentTarget && dragState.item?.type === 'task' && <div className="absolute inset-0 border-2 border-amber-500 border-dashed m-1 rounded-lg pointer-events-none opacity-50 z-40" />}
                 
                                
                                {box.isCollapsed ?
                                (
                                    <div className="px-2 pb-2 pt-0.5 bg-zinc-950 rounded-b-xl border border-t-0 border-zinc-800 flex flex-col pointer-events-none">
                                        {boxTasks.length > 0 ? (
         
                                            <div className="flex items-center justify-between gap-1 px-2 py-1.5 bg-zinc-900/60 rounded border border-zinc-800/80 shadow-inner">
                                                <div className="flex gap-2.5 items-center shrink-0">
  
                                                    {activeTasks.length > 0 && <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> {activeTasks.length} Active</span>}
                               
                                                    {pausedTasks.length > 0 && <span className="text-[10px] text-yellow-500 font-bold tracking-widest uppercase">{pausedTasks.length} Pause</span>}
                                                    {finishedTasks.length > 0 && <span className="text-[10px] text-red-500 font-bold tracking-widest uppercase">{finishedTasks.length} End</span>}
       
                                                </div>
                                                
           
                                                {nextTask ?
                                                (
                                                    <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0 pl-3"><span className="text-[9px] text-blue-400/80 font-black tracking-widest uppercase truncate text-right">{nextTask.label}</span><span className="text-[13px] font-mono font-bold text-blue-300 tracking-tighter shrink-0">{formatTime(nextTask.remainingSeconds)}</span></div>
                            
                                                ) : pausedNextTask ?
                                                (
                                                    <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0 pl-3"><span className="text-[9px] text-zinc-500 font-black tracking-widest uppercase truncate text-right">{pausedNextTask.label}</span><span className="text-[13px] font-mono font-bold text-yellow-600/80 tracking-tighter shrink-0">{formatTime(pausedNextTask.remainingSeconds)}</span></div>
                            
                                                ) : finishedTasks.length > 0 ?
                                                ( <div className="flex-1 flex justify-end pr-2"><Check size={14} className="text-red-500"/></div> ) : null}
                                            </div>
                                        ) : ( <div className="py-2 text-center opacity-40"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{t('emptySection')}</span></div> )}
                                    </div>
                                ) : (
                        
                                    <>
                                        {boxTasks.map(t => renderTask(t, true, box.id))}
                                        {boxTasks.length === 0 && ( <div className="py-4 text-center opacity-30 pointer-events-none"><span className="text-[10px] font-bold uppercase tracking-widest">{t('emptySection')}</span></div> )}
                                    </>
                                )}
                      
                            </div>

                            {!box.isCollapsed && (
                                <div 
                                     data-dnd-target="true" data-dnd-id={box.id} data-dnd-type="box-footer"
                                    className={`h-8 border border-zinc-800 border-t-0 rounded-b-xl flex items-center justify-center transition-all ${isFooterTarget ?
                                    'drop-extract-target h-12' : 'bg-zinc-900/30'}`}
                                >
                                    {dragState.item?.type === 'task' ?
                                    ( <div className={`text-[8px] font-black uppercase flex items-center gap-1 transition-colors pointer-events-none ${isFooterTarget ? 'text-red-500 scale-110' : 'text-zinc-600'}`}><ArrowDownToLine size={10} /> {isFooterTarget ? t('dropToExtract') : t('exitZone')}</div> ) : ( <div className="w-8 h-1 bg-zinc-800/50 rounded-full pointer-events-none" /> )}
                                </div>
                            )}

       
                        </div>
                    );
                }
            })}
        </div>
      </div>
      
      {activeAlert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md text-center">
            <div className="bg-red-600 w-full max-w-xs p-8 rounded-[40px] shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-in zoom-in duration-300 border-4 border-red-400 flex flex-col relative">
              
              {alertQueue.length > 0 && ( <div className="absolute -top-3 -right-3 bg-white text-red-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-lg animate-pulse border-2 border-red-400">+{alertQueue.length}</div> )}
              <AlertTriangle size={56} className="mx-auto mb-4 animate-bounce text-red-950"/>
              <h2 className="text-xl font-black text-red-950 uppercase mb-4 leading-tight">{activeAlert.title}</h2>
              <div className="text-red-950 font-bold mb-6 text-sm leading-tight whitespace-pre-wrap text-left bg-red-500/30 p-4 rounded-xl border border-red-500/50">{activeAlert.body}</div>
            
              <button 
                onClick={() => { stopInfiniteAlarm(); setActiveAlert(null); }} 
                className="w-full bg-red-950 text-red-400 py-4 rounded-2xl font-black text-lg uppercase shadow-xl tracking-widest active:scale-95 transition-transform border border-red-800"
              >
                {alertQueue.length > 0 ? t('next') : t('understood')}
              </button>
            </div>
          </div>
      )}

    </div>
  );
};

export default App;