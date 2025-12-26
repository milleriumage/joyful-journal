
import React, { useState, useRef, useEffect } from 'react';
const aiAvatar = '/src/assets/ai-avatar.png';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import { supabase } from './supabase';
import { AiTurn, UserSettings } from './types';
import { decode, decodeAudioData, createBlob, blobToBase64 } from './utils/audio-utils';
import { CreditsModal } from './components/CreditsModal';
import { Sidebar } from './components/Sidebar';
import { CardsSection, AI_MODELS } from './components/CardsSection';
import { AIModel } from './components/AICard';
import { ConfigSection } from './components/ConfigSection';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const GESTURE_COOLDOWN = 4000;

const GESTURES_MAP = [
  // FACIAIS
  { id: 'smile', label: 'SORRISO', icon: '😊', type: 'face', blend: 'mouthSmileLeft', threshold: 0.6 },
  { id: 'pucker', label: 'BIQUINHO', icon: '😚', type: 'face', blend: 'mouthPucker', threshold: 0.75 },
  { id: 'tongue', label: 'LÍNGUA', icon: '😛', type: 'face', blend: 'tongueOut', threshold: 0.4 },
  { id: 'laugh', label: 'RISADA', icon: '😂', type: 'face', blend: 'jawOpen', threshold: 0.7 },
  { id: 'surprise', label: 'CHOQUE', icon: '😲', type: 'face', blend: 'eyeWideLeft', threshold: 0.5 },
  { id: 'frown', label: 'BRAVO', icon: '😠', type: 'face', blend: 'browDownLeft', threshold: 0.5 },
  { id: 'eyebrows', label: 'DESDÉM', icon: '🤨', type: 'face', blend: 'browOuterUpLeft', threshold: 0.5 },
  { id: 'look_left', label: 'OLHAR LADO', icon: '😒', type: 'face', blend: 'eyeLookOutLeft', threshold: 0.7 },
  
  // MANUAIS
  { id: 'middle_finger', label: 'DEDO MEIO', icon: '🖕', type: 'hand', gesture: 'RUDE' },
  { id: 'thumbs_up', label: 'JOINHA', icon: '👍', type: 'hand', gesture: 'OK' },
  { id: 'point', label: 'APONTAR', icon: '👉', type: 'hand', gesture: 'POINT' },
  { id: 'pray', label: 'PERDÃO', icon: '🙏', type: 'hand', gesture: 'PRAY' },
  { id: 'stop', label: 'PARA!', icon: '✋', type: 'hand', gesture: 'STOP' }
];

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'cards' | 'create' | 'call' | 'credits'>('cards');
  const [activeView, setActiveView] = useState<'main' | 'vision'>('main');
  const [currentModel, setCurrentModel] = useState<AIModel | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAiActive, setIsAiActive] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [activeGestures, setActiveGestures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const sessionRef = useRef<any>(null);
  const lastGestureTime = useRef<number>(0);
  const isAiSpeaking = useRef<boolean>(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const outputAudioCtx = useRef<AudioContext | null>(null);
  const inputAudioCtx = useRef<AudioContext | null>(null);
  const nextStartTime = useRef<number>(0);

  useEffect(() => {
    let interval: number;
    if (isAiActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Tempo acabou, encerrar sessão
            cleanupAll();
            setActiveView('main');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAiActive, timeLeft]);

  // Função para limpar todos os recursos de mídia e sessão
  const cleanupAll = () => {
    console.log('[CLEANUP] Limpando todos os recursos...');
    
    setIsAiActive(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[CLEANUP] Track parada:', track.kind);
      });
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (inputAudioCtx.current) {
      inputAudioCtx.current.close().catch(() => {});
      inputAudioCtx.current = null;
    }
    if (outputAudioCtx.current) {
      outputAudioCtx.current.close().catch(() => {});
      outputAudioCtx.current = null;
    }
    
    nextStartTime.current = 0;
    isAiSpeaking.current = false;
    setTranscription('');
    setActiveGestures([]);
    setError(null);
    setCurrentModel(null);
  };

  const prepareMedia = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (inputAudioCtx.current) {
      inputAudioCtx.current.close().catch(() => {});
      inputAudioCtx.current = null;
    }
    if (outputAudioCtx.current) {
      outputAudioCtx.current.close().catch(() => {});
      outputAudioCtx.current = null;
    }
    nextStartTime.current = 0;
    
    try {
      console.log('[MEDIA] Solicitando nova câmera/mic...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 }, 
        audio: true 
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      inputAudioCtx.current = new AudioContext({ sampleRate: 16000 });
      outputAudioCtx.current = new AudioContext({ sampleRate: 24000 });
      console.log('[MEDIA] Stream criado com sucesso');
      return stream;
    } catch (e) {
      console.error('[MEDIA] Erro ao obter mídia:', e);
      setError("Câmera/Mic não disponíveis.");
      return null;
    }
  };

  // Função para buscar créditos do banco
  const fetchCredits = async (userId: string) => {
    setLoadingCredits(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('[CREDITS] Erro ao buscar:', error);
        return;
      }
      
      if (profile) {
        console.log('[CREDITS] Carregado do banco:', profile.credits);
        setCredits(profile.credits ?? 0);
      } else {
        console.log('[CREDITS] Criando perfil novo com 100 créditos');
        await supabase.from('profiles').insert({
          id: userId,
          credits: 100
        });
        setCredits(100);
      }
    } catch (e) {
      console.error('[CREDITS] Erro:', e);
    } finally {
      setLoadingCredits(false);
    }
  };

  useEffect(() => {
    const initVision = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, delegate: "GPU" },
          outputFaceBlendshapes: true, runningMode: "VIDEO"
        });
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, delegate: "GPU" },
          numHands: 2, runningMode: "VIDEO"
        });
      } catch (e) {
        console.warn("Vision Tasks falhou em carregar.");
      }
    };
    initVision();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchCredits(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] Evento:', event);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        setCredits(0);
        cleanupAll();
        setActiveView('main');
        setActiveTab('cards');
      } else if (session?.user) {
        setTimeout(() => fetchCredits(session.user.id), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Verifique seu email para confirmar o cadastro!");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayCard = async (model: AIModel) => {
    if (credits < model.creditsCost) {
      setError('Créditos insuficientes! Compre mais para jogar.');
      setShowCreditsModal(true);
      return;
    }

    // Consumir créditos ANTES de iniciar
    try {
      const { data, error } = await supabase.functions.invoke('consume-credit', {
        body: { userId: user.id, amount: model.creditsCost }
      });
      
      if (error || !data?.success) {
        setError(data?.error || 'Erro ao consumir créditos');
        return;
      }
      
      setCredits(data.newCredits);
      console.log(`[CREDITS] Consumido: ${model.creditsCost} créditos para ${model.name}`);
    } catch (e) {
      console.error('[CREDITS] Erro ao consumir:', e);
      setError('Erro ao processar créditos');
      return;
    }

    setCurrentModel(model);
    setActiveView('vision');
    startAiSession(model);
  };

  const startAiSession = async (model: AIModel) => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
      setIsAiActive(false);
    }
    
    setAiLoading(true);
    const stream = await prepareMedia();
    if (!stream) return setAiLoading(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            setIsAiActive(true);
            setAiLoading(false);
            setTimeLeft(model.durationSeconds);
            const source = inputAudioCtx.current!.createMediaStreamSource(stream);
            const proc = inputAudioCtx.current!.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              if (isAiActive && !isAiSpeaking.current) {
                sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
              }
            };
            source.connect(proc);
            proc.connect(inputAudioCtx.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              setTranscription(msg.serverContent.outputTranscription.text);
            }
            if (msg.serverContent?.turnComplete) {
              isAiSpeaking.current = false;
            }
            const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio && outputAudioCtx.current) {
              isAiSpeaking.current = true;
              try {
                const buf = await decodeAudioData(decode(audio), outputAudioCtx.current, 24000, 1);
                const src = outputAudioCtx.current.createBufferSource();
                src.buffer = buf;
                src.connect(outputAudioCtx.current.destination);
                nextStartTime.current = Math.max(nextStartTime.current, outputAudioCtx.current.currentTime);
                src.start(nextStartTime.current);
                nextStartTime.current += buf.duration;
              } catch (e) {
                console.error('[AUDIO] Erro ao reproduzir:', e);
              }
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `Você é ${model.name}, uma IA com personalidade ${model.personality}. 
          Seu tema principal é: ${model.theme}. 
          Tom de voz: ${model.tone.toUpperCase()}. 
          Sua frase de efeito: "${model.catchPhrase}"
          
          REGRAS:
          - Seja EXTREMAMENTE expressiva e dramática
          - Use seu tom ${model.tone} em todas as respostas
          - Reaja aos gestos do usuário de forma exagerada
          - Mantenha o conflito interessante e divertido
          - NÃO PARE de provocar até o tempo acabar!`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      setError("Erro na IA.");
      setAiLoading(false);
    }
  };

  useEffect(() => {
    let reqId: number;
    const detect = () => {
      if (localVideoRef.current?.readyState >= 2 && faceLandmarkerRef.current) {
        const faceRes = faceLandmarkerRef.current.detectForVideo(localVideoRef.current, performance.now());
        const handRes = handLandmarkerRef.current?.detectForVideo(localVideoRef.current, performance.now());
        
        const shapes = faceRes.faceBlendshapes?.[0]?.categories;
        const current: string[] = [];
        
        GESTURES_MAP.forEach(g => {
          if (g.type === 'face' && shapes) {
            const val = shapes.find(c => c.categoryName === g.blend)?.score || 0;
            if (val > g.threshold) current.push(g.id);
          }
          if (g.type === 'hand' && handRes?.landmarks?.length > 0) {
            if (g.id === 'stop' && handRes.landmarks[0][8].y < handRes.landmarks[0][5].y) current.push(g.id);
          }
        });

        if (current.length > 0 && isAiActive && !isAiSpeaking.current && Date.now() - lastGestureTime.current > GESTURE_COOLDOWN) {
          sessionRef.current?.sendRealtimeInput({ text: `SISTEMA: Gesto [${GESTURES_MAP.find(x=>x.id===current[0])?.label}] detectado. REAJA!` });
          lastGestureTime.current = Date.now();
        }
        setActiveGestures(current);
      }
      reqId = requestAnimationFrame(detect);
    };
    if (activeView === 'vision') reqId = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(reqId);
  }, [activeView, isAiActive]);

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const handleLogout = async () => {
    cleanupAll();
    await supabase.auth.signOut();
  };

  const handleTabChange = (tab: 'cards' | 'create' | 'call' | 'credits') => {
    if (tab === 'credits') {
      setShowCreditsModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Tela de Login
  if (!user) {
    return (
      <div className="h-screen w-screen bg-gradient-to-b from-[#f5d0c5] via-[#e8c4d4] to-[#c9b3d4] flex flex-col items-center justify-center p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-5xl font-black italic text-pink-500 tracking-tighter drop-shadow-[0_0_15px_rgba(236,72,153,0.4)]" style={{ fontFamily: 'cursive' }}>DR.ia</h1>
            <p className="text-pink-400 text-[10px] uppercase font-black tracking-widest mt-2">- Seu Simulado de Treta -</p>
            <div className="flex justify-center gap-1 mt-3">
              {[...Array(8)].map((_, i) => <span key={i} className="text-pink-400 text-xs">♥</span>)}
            </div>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border-2 border-pink-200 p-5 rounded-2xl text-sm outline-none text-pink-600 placeholder-pink-300 focus:border-pink-400 shadow-sm" required />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white border-2 border-pink-200 p-5 rounded-2xl text-sm outline-none text-pink-600 placeholder-pink-300 focus:border-pink-400 shadow-sm" required />
            <div className="flex justify-center pt-4">
              <button type="submit" className="w-32 h-32 bg-gradient-to-b from-pink-400 to-pink-500 rounded-full font-black uppercase text-sm shadow-[0_8px_0_#be185d,0_12px_20px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-[0_4px_0_#be185d] transition-all text-white disabled:opacity-50 flex items-center justify-center" disabled={loading}>
                {loading ? '...' : authMode === 'login' ? 'ENTRAR' : 'CRIAR'}
              </button>
            </div>
          </form>
          <button onClick={() => setAuthMode(m => m === 'login' ? 'register' : 'login')} className="w-full bg-gradient-to-r from-pink-400 to-pink-500 py-4 rounded-full font-black uppercase text-xs shadow-lg active:scale-95 transition-all text-white">
            {authMode === 'login' ? 'CRIAR UMA CONTA NOVINHA' : 'JÁ TENHO CONTA, QUERO ENTRAR'}
          </button>
          {error && <p className="text-red-500 text-[9px] font-black text-center uppercase mt-4 bg-white/80 p-2 rounded-lg">{error}</p>}
        </div>
      </div>
    );
  }

  // Tela de Interação com IA (Vision)
  if (activeView === 'vision' && currentModel) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 sm:h-16 bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md shrink-0 flex items-center justify-between px-3 sm:px-6 border-b border-white/10 z-50">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black text-pink-400" style={{ fontFamily: 'cursive' }}>DR.ia</span>
              <span className="text-[8px] sm:text-[9px] text-pink-300 truncate max-w-[100px] sm:max-w-[150px]">{currentModel.name} - {currentModel.personality}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="bg-pink-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-pink-400">
              <span className="text-pink-400 font-black text-sm sm:text-lg">{formatTime(timeLeft)}</span>
            </div>
            <button onClick={() => {
              cleanupAll();
              setActiveView('main');
            }} className="bg-red-500 hover:bg-red-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-[10px] sm:text-xs font-black uppercase transition-all shadow-md">
              ✕ Sair
            </button>
          </div>
        </div>

        {/* Gestures Bar - Hidden on small screens */}
        <div className="absolute top-16 sm:top-20 inset-x-2 sm:inset-x-4 z-[100] hidden sm:flex flex-wrap justify-center gap-1 sm:gap-2 pointer-events-none">
          {GESTURES_MAP.map(g => (
            <div key={g.id} className={`px-2 sm:px-3 py-1 sm:py-2 rounded-xl sm:rounded-2xl border transition-all duration-300 flex items-center gap-1 sm:gap-2 ${activeGestures.includes(g.id) ? 'bg-pink-600 border-pink-300 scale-110 shadow-[0_0_20px_rgba(236,72,153,0.8)] opacity-100' : 'bg-white/5 border-transparent opacity-20'}`}>
              <span className="text-sm sm:text-lg">{g.icon}</span>
              <span className="text-[6px] sm:text-[8px] font-black uppercase text-white">{g.label}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col sm:flex-row gap-2 p-2 pt-4 sm:pt-20">
          {/* Webcam do usuário */}
          <div className="flex-1 relative bg-slate-900 rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 border-white/10 min-h-[35vh] sm:min-h-0">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-black/60 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <span className="text-[8px] sm:text-[10px] font-black uppercase text-white/80">VOCÊ</span>
            </div>
          </div>

          {/* Avatar da IA */}
          <div 
            className="flex-1 relative rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 border-pink-500/30 min-h-[35vh] sm:min-h-0"
            style={{ background: `linear-gradient(135deg, ${currentModel.gradientFrom}, ${currentModel.gradientTo})` }}
          >
            <img 
              src={currentModel.avatar} 
              alt={currentModel.name} 
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Fallback para SVG inline se imagem falhar
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-avatar')) {
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.className = 'fallback-avatar absolute inset-0 flex items-center justify-center';
                  fallbackDiv.innerHTML = `<div class="text-center"><span class="text-8xl">${currentModel.personalityEmoji}</span><p class="text-white font-black mt-4 text-2xl">${currentModel.name}</p></div>`;
                  parent.appendChild(fallbackDiv);
                }
              }}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 right-4 text-pink-400 text-xl sm:text-2xl animate-pulse">💕</div>
              <div className="absolute top-12 left-4 text-pink-300 text-base sm:text-lg opacity-60">💗</div>
              <div className="absolute bottom-20 right-8 text-pink-400 text-lg sm:text-xl opacity-40">💔</div>
            </div>
            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-pink-500/80 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-2">
              <span className="text-base sm:text-lg">{currentModel.personalityEmoji}</span>
              <span className="text-[8px] sm:text-[10px] font-black uppercase text-white">{currentModel.name}</span>
            </div>
            {transcription && (
              <div className="absolute bottom-12 sm:bottom-16 left-2 sm:left-4 right-2 sm:right-4 bg-white/90 backdrop-blur-sm p-2 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
                <p className="text-[9px] sm:text-[10px] font-bold text-center text-pink-600 leading-tight">"{transcription}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {aiLoading && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest animate-pulse text-pink-400 text-center">
              {currentModel.name} SE PREPARANDO...
            </span>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Layout Principal com Sidebar
  return (
    <div className="h-screen w-screen bg-gradient-to-b from-[#f5d0c5] via-[#e8c4d4] to-[#c9b3d4] flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        credits={credits}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {/* Header */}
        <div className="h-14 sm:h-16 bg-white/40 backdrop-blur-md shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-pink-200">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Logo */}
            <h1 
              className="md:hidden text-2xl font-black text-pink-500 tracking-tight" 
              style={{ fontFamily: 'cursive' }}
            >
              DR.ia
            </h1>
            <h2 className="hidden md:block text-xl font-black text-pink-500 uppercase" style={{ fontFamily: 'cursive' }}>
              {activeTab === 'cards' && 'Modelos de IA'}
              {activeTab === 'create' && 'Configuração'}
              {activeTab === 'call' && 'Chamada'}
            </h2>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-pink-500 text-base sm:text-lg">💎</span>
            <span className="text-pink-600 font-black text-sm sm:text-base">{credits}</span>
            <span className="text-pink-400 text-[10px] sm:text-xs hidden sm:inline">créditos</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'cards' && (
            <CardsSection 
              onPlayCard={handlePlayCard}
              userCredits={credits}
              isLoading={aiLoading}
            />
          )}

          {activeTab === 'create' && (
            <ConfigSection 
              onStartSession={(config) => {
                // Criar modelo personalizado com as configurações
                const customModel: AIModel = {
                  id: 'custom-' + Date.now(),
                  name: 'IA Customizada',
                  avatar: aiAvatar,
                  personality: config.personality,
                  theme: config.theme,
                  tone: config.personality === 'sarcastico' ? 'debochado' : 
                        config.personality === 'furioso' ? 'agressivo' :
                        config.personality === 'engracado' ? 'zoeiro' : 'dramático',
                  catchPhrase: config.personality === 'sarcastico' ? 'Nossa, que original...' :
                              config.personality === 'furioso' ? 'VOCÊ NÃO ME CONHECE!' :
                              config.personality === 'engracado' ? 'KKKKKK para tudo!' : 'Você não sabe o que eu passei...',
                  durationSeconds: config.duration * 60,
                  creditsCost: Math.ceil(config.duration * 2),
                  gradientFrom: '#ec4899',
                  gradientTo: '#db2777',
                  personalityEmoji: config.personality === 'sarcastico' ? '🙄' :
                                   config.personality === 'furioso' ? '🤬' :
                                   config.personality === 'engracado' ? '🤣' : '🥺',
                  furyLevel: config.personality === 'furioso' ? 5 :
                            config.personality === 'sarcastico' ? 3 :
                            config.personality === 'dramatico' ? 4 : 2
                };
                handlePlayCard(customModel);
              }}
            />
          )}

          {activeTab === 'call' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <span className="text-5xl sm:text-6xl">📞</span>
                <h3 className="text-xl sm:text-2xl font-black text-pink-500 mt-4">Em Breve!</h3>
                <p className="text-pink-400 mt-2 text-sm sm:text-base">Chamadas em tempo real</p>
              </div>
            </div>
          )}
        </div>

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-20 md:bottom-4 right-4 left-4 md:left-auto bg-red-500 text-white px-4 sm:px-6 py-3 rounded-2xl shadow-lg z-[200] flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-white/80 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Credits Modal */}
      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        userId={user?.id || ''}
        userEmail={user?.email || ''}
        currentCredits={credits}
        onCreditsUpdate={setCredits}
      />
    </div>
  );
};

export default App;
