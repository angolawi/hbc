import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Camera, Upload, CheckCircle, Wind, Waves, Zap, Volume2, Settings2, CloudRain } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Select, Input } from './ui/Input';
import { Clock, BookOpen, Target, TrendingUp, Brain, Flame, Minus, Plus } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';
import { getPhaseWorkflows, formatTime, TIMER_STORAGE_KEY, calculateRemainingTime } from '../utils/timerUtils';
import { pushData } from '../utils/dataSync';


export default function TimerView() {
  const { alert, confirm } = useNotification();
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState('1');

  // Custom Times State
  const [repriseTime, setRepriseTime] = useState(3);
  const [estudoTime, setEstudoTime] = useState(45);
  const [aplicacaoTime, setAplicacaoTime] = useState(10);
  const [revisaoTime, setRevisaoTime] = useState(5);
  const [descansoTime, setDescansoTime] = useState(15);

  const [currentSteps, setCurrentSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [showTimerText, setShowTimerText] = useState(true);
  const [activeNoise, setActiveNoise] = useState('none');
  const [noiseVolume, setNoiseVolume] = useState(0.5);
  const [targetEndTime, setTargetEndTime] = useState(null);
  const timerRef = useRef(null);
  const workerRef = useRef(null);

  // Validation States
  const [uploadFileContext, setUploadFileContext] = useState(null);
  const [uploadTextContext, setUploadTextContext] = useState('');
  const [singleCheckboxCtx, setSingleCheckboxCtx] = useState(false);
  const [multiCheckboxesCtx, setMultiCheckboxesCtx] = useState({ banca: false, disciplina: false, anos: false });

  // Integration Modal States
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [savedDisciplines, setSavedDisciplines] = useState([]);
  const [savedWeeks, setSavedWeeks] = useState([]);
  const [modalDisc, setModalDisc] = useState('');
  const [modalTopico, setModalTopico] = useState('');
  const [modalSemana, setModalSemana] = useState('');
  const [modalCertas, setModalCertas] = useState('');
  const [modalResolvidas, setModalResolvidas] = useState('');


  const timeOptions = [0, 3, 5, 10, 15, 20, 30, 40, 45, 60, 90];

  const adjustTime = (current, setter, delta) => {
    const currentIndex = timeOptions.indexOf(current);
    const nextIndex = Math.max(0, Math.min(timeOptions.length - 1, currentIndex + delta));
    setter(timeOptions[nextIndex]);
  };

  const playAlarm = () => {
    audioEngine.playAlarm();
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhase(phase);
    if (phase === "1") {
      setRepriseTime(3); setEstudoTime(45); setAplicacaoTime(10); setRevisaoTime(5); setDescansoTime(15);
    } else if (phase === "2") {
      setRepriseTime(3); setEstudoTime(20); setAplicacaoTime(40); setRevisaoTime(5); setDescansoTime(15);
    } else if (phase === "3") {
      setRepriseTime(0); setEstudoTime(0); setAplicacaoTime(60); setRevisaoTime(5); setDescansoTime(0);
    }
  };

  const handleStartSession = () => {
    const steps = getPhaseWorkflows(selectedPhase, repriseTime, estudoTime, aplicacaoTime, revisaoTime, descansoTime);
    setCurrentSteps(steps);
    setStepIndex(0);
    setTimeRemaining(steps[0].duration);
    setTimerRunning(true);
    setIsCounting(false);
    setTargetEndTime(null);
    setShowMetricsModal(false);

    setUploadFileContext(null);
    setUploadTextContext('');
    setSingleCheckboxCtx(false);
    setMultiCheckboxesCtx({ banca: false, disciplina: false, anos: false });
  };

  const canAdvance = () => {
    const step = currentSteps[stepIndex];
    if (!step) return false;
    if (step.unskippable && timeRemaining > 0) return false;
    if (step.requiresUpload && timeRemaining === 0) {
      if (!uploadFileContext && !uploadTextContext.trim()) return false;
    }
    if (step.requiresCheckbox && timeRemaining === 0) {
      if (!singleCheckboxCtx) return false;
    }
    if (step.requiresMultiCheckboxes) {
      const { banca, disciplina, anos } = multiCheckboxesCtx;
      if (!banca || !disciplina || !anos) return false;
    }
    return true;
  };

  const loadMetricsData = () => {
    const rawDisc = localStorage.getItem('simpl_edital');
    const rawWeeks = localStorage.getItem('simpl_weeks');
    const parsedDisc = rawDisc ? JSON.parse(rawDisc) : [];
    const parsedWeeks = rawWeeks ? JSON.parse(rawWeeks) : [];
    setSavedDisciplines(parsedDisc);
    setSavedWeeks(parsedWeeks);
    if (parsedDisc.length > 0) setModalDisc(parsedDisc[0].id);
    if (parsedWeeks.length > 0) setModalSemana(parsedWeeks[0].id);
  };

  const proceedToNextStep = () => {
    if (!canAdvance()) {
      alert("Validação pendente de requisitos para progredir.", "error");
      return;
    }

    setUploadFileContext(null);
    setUploadTextContext('');
    setSingleCheckboxCtx(false);
    setMultiCheckboxesCtx({ banca: false, disciplina: false, anos: false });

    setIsCounting(false);
    if (workerRef.current) workerRef.current.postMessage('stop');

    if (stepIndex + 1 >= currentSteps.length) {
      // Abre modal final integrador
      localStorage.removeItem(TIMER_STORAGE_KEY);
      loadMetricsData();
      setShowMetricsModal(true);
    } else {
      setStepIndex(prev => prev + 1);
      setTimeRemaining(currentSteps[stepIndex + 1].duration);
      setTargetEndTime(null);
    }
  };

  const handleAdvanceClick = () => {
    if (!canAdvance()) {
      if (currentSteps[stepIndex]?.requiresUpload) {
        alert("Ação Requerida: Anexe sua revisão.", "error");
      } else if (currentSteps[stepIndex]?.requiresCheckbox || currentSteps[stepIndex]?.requiresMultiCheckboxes) {
        alert("Atenção: Validação OBRIGATÓRIA pendente.", "error");
      }
      return;
    }
    proceedToNextStep();
  };

  const handleTimerAction = () => {
    if (isCounting) {
      setIsCounting(false);
      setTargetEndTime(null);
    } else {
      const endTime = Date.now() + timeRemaining * 1000;
      setTargetEndTime(endTime);
      setIsCounting(true);

      // Auto-start "Keep-Alive" audio at minimum volume to prevent mobile hibernation
      if (activeNoise === 'none') {
        handleNoiseToggle('beta');
        setNoiseVolume(0.02);
        audioEngine.setVolume(0.02);
      }
    }
  };

  const handleNoiseToggle = (type) => {
    if (activeNoise === type) {
      audioEngine.stop();
      setActiveNoise('none');
    } else {
      setActiveNoise(type);
      if (type === 'white') audioEngine.playWhiteNoise();
      if (type === 'brown') audioEngine.playBrownNoise();
      if (type === 'beta') audioEngine.playBetaWaves();
      if (type === 'rain') audioEngine.playRainNoise();
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setNoiseVolume(vol);
    audioEngine.setVolume(vol);
  };

  const handleCancelSession = () => {
    setIsCounting(false);
    if (workerRef.current) workerRef.current.postMessage('stop');
    audioEngine.stop();
    setActiveNoise('none');
    setTimerRunning(false);
    setCurrentSteps([]);
    setShowMetricsModal(false);
    setModalCertas('');
    setModalResolvidas('');
    setModalTopico('');
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  const handleSubmitMetrics = async () => {
    if (!modalResolvidas || !modalCertas || !modalDisc || !modalSemana) {
      alert("Preencha Disciplina, Semana, Quantidade Resolvida e Certa.", "error"); return;
    }

    // Calcula tempo gasto na sessão para o Dashboard
    let sessionMinutes = 0;
    currentSteps.forEach(s => {
      sessionMinutes += Math.floor(s.duration / 60);
    });
    const savedHours = localStorage.getItem('simpl_horas_estudadas');
    const prevMins = savedHours ? parseInt(savedHours, 10) : 0;
    localStorage.setItem('simpl_horas_estudadas', (prevMins + sessionMinutes).toString());

    // Motor Numérico 1 e 2 Acumulado (Tópico e Categoria Global)
    const storedDisc = JSON.parse(localStorage.getItem('simpl_edital') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const phaseKey = `fase${selectedPhase}`;

    const updatedDisc = storedDisc.map(d => {
      if (d.id === modalDisc) {
        // Motor 2 (Global Semanal)
        let newWeeklyStats = { ...d.weeklyStats };
        let curWStats = newWeeklyStats[modalSemana] || { certas: '', resolvidas: '' };
        newWeeklyStats[modalSemana] = {
          certas: (Number(curWStats.certas) || 0) + Number(modalCertas),
          resolvidas: (Number(curWStats.resolvidas) || 0) + Number(modalResolvidas)
        };

        // Motor 1 (Micro Tópico)
        if (modalTopico) {
          return {
            ...d,
            weeklyStats: newWeeklyStats,
            topicos: d.topicos.map(t => {
              if (t.id === modalTopico) {
                let curPStats = t[phaseKey] || { certas: '', resolvidas: '', inicio: '', conclusao: '' };
                return {
                  ...t,
                  [phaseKey]: {
                    ...curPStats,
                    certas: (Number(curPStats.certas) || 0) + Number(modalCertas),
                    resolvidas: (Number(curPStats.resolvidas) || 0) + Number(modalResolvidas),
                    inicio: curPStats.inicio || today,
                    conclusao: today
                  }
                }
              }
              return t;
            })
          };
        }

        return { ...d, weeklyStats: newWeeklyStats };
      }
      return d;
    });

    localStorage.setItem('simpl_edital', JSON.stringify(updatedDisc));
    await pushData('simpl_edital', updatedDisc);
    await pushData('simpl_horas_estudadas', prevMins + sessionMinutes);

    // --- INTEGRATION: Cycle Progression ---
    const activeCycleRaw = localStorage.getItem('simpl_ciclo');
    if (activeCycleRaw) {
      try {
        let cycle = JSON.parse(activeCycleRaw);
        // Mark the first non-completed matching discipline
        let found = false;
        for (let i = 0; i < cycle.length; i++) {
          if (cycle[i].id === modalDisc && !cycle[i].completed) {
            cycle[i].completed = true;
            found = true;
            break;
          }
        }

        // Check if full cycle reached
        const allCompleted = cycle.every(block => block.completed);
        if (allCompleted) {
          cycle = cycle.map(b => ({ ...b, completed: false }));
          alert("Ciclo Completo! Reiniciando sua trilha de estudos.", "success");
        }

        localStorage.setItem('simpl_ciclo', JSON.stringify(cycle));
        await pushData('simpl_ciclo', cycle);
      } catch (e) {
        console.error("Failed to update cycle progress", e);
      }
    }
    // ---------------------------------------

    alert("Dados Injetados nas Planilhas de Controle! Estatísticas atualizadas com Sucesso.", "success");
    handleCancelSession();
  };

  // Persistence Logic
  useEffect(() => {
    const savedSession = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setSelectedPhase(session.phase);
        setRepriseTime(session.times.reprise || 3);
        setEstudoTime(session.times.estudo || 45);
        setAplicacaoTime(session.times.aplicacao || 10);
        setRevisaoTime(session.times.revisao || 5);
        setDescansoTime(session.times.descanso || 15);
        setCurrentSteps(session.steps || []);
        setStepIndex(session.stepIndex || 0);
        setTimerRunning(true);

        if (session.targetEndTime) {
          const remaining = calculateRemainingTime(session.targetEndTime);
          if (remaining > 0) {
            setTimeRemaining(remaining);
            setTargetEndTime(session.targetEndTime);
            setIsCounting(true);
          } else {
            setTimeRemaining(0);
            setIsCounting(false);
          }
        } else {
          setTimeRemaining(session.timeRemaining || 0);
        }
      } catch (e) {
        console.error("Failed to load session", e);
      }
    }
  }, []);

  useEffect(() => {
    if (timerRunning) {
      const session = {
        phase: selectedPhase,
        times: { reprise: repriseTime, estudo: estudoTime, aplicacao: aplicacaoTime, revisao: revisaoTime, descanso: descansoTime },
        steps: currentSteps,
        stepIndex,
        timeRemaining,
        targetEndTime
      };
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(session));
    }
  }, [timerRunning, selectedPhase, currentSteps, stepIndex, timeRemaining, targetEndTime]);

  // Web Worker for background stability
  useEffect(() => {
    const workerCode = `
      let timer = null;
      onmessage = (e) => {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => postMessage('tick'), 1000);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
          timer = null;
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    workerRef.current = new Worker(url);

    return () => {
      workerRef.current.terminate();
      URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && targetEndTime) {
        const remaining = calculateRemainingTime(targetEndTime);
        if (remaining <= 0) {
          setTimeRemaining(0);
          setIsCounting(false);
          setTargetEndTime(null);
          playAlarm();
        } else {
          setTimeRemaining(remaining);
        }
      }
    };

    const handleTick = () => {
      if (!targetEndTime) return;
      const rem = calculateRemainingTime(targetEndTime);
      if (rem <= 0) {
        workerRef.current.postMessage('stop');
        setTimeRemaining(0);
        setTargetEndTime(null);
        setIsCounting(false);
        playAlarm();
      } else {
        setTimeRemaining(rem);
      }
    };

    workerRef.current.onmessage = handleTick;
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (isCounting && targetEndTime) {
      workerRef.current.postMessage('start');
    } else {
      workerRef.current.postMessage('stop');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (workerRef.current) workerRef.current.postMessage('stop');
    };
  }, [isCounting, targetEndTime]);

  // Handle global cleanup for audio
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  if (!timerRunning) {
    return (
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-8 flex flex-col min-h-screen bg-zinc-950 items-center justify-center">
        <header className="mb-10 flex flex-col items-center">
          <h1 className="text-5xl font-bold mb-4 tracking-tight py-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Cronômetro</h1>
          <p className="text-zinc-500 text-sm max-w-lg text-center">Configure sua sessão de alto desempenho.</p>
        </header>

        <Card className="max-w-2xl p-1 w-full bg-zinc-900 border-zinc-800 shadow-2xl rounded-3xl">
          <div className="p-8 border-b border-zinc-800/50">
            <h3 className="text-xl font-bold tracking-tight text-zinc-100 italic">Setup da Sessão</h3>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-black mt-1 mt-2">Selecione a fase de estudo e ajuste os tempos se necessário</p>
          </div>

          <div className="p-8">
            <div className="mb-10 text-left">
              <label className="block text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 text-center md:text-left">Escolha sua Fase de Estudo</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: '1', title: 'Fase 1', desc: 'Teoria e Base', icon: '📝', bgIcon: BookOpen, info: 'Foco em entender a teoria e produzir seu primeiro resumo.' },
                  { id: '2', title: 'Fase 2', desc: 'Consolidação', icon: '🧠', bgIcon: Brain, info: 'Foco em resolução de questões e refinamento do resumo.' },
                  { id: '3', title: 'Fase 3', desc: 'Intensidade', icon: '🔥', bgIcon: Flame, info: 'Foco em simulados, velocidade e fechar lacunas específicas.' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePhaseChange(p.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative group/phase ${selectedPhase === p.id ? 'bg-indigo-600/10 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    {/* Clipping container for BG icon */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                      <div className={`absolute -right-2 -top-2 opacity-5 group-hover/phase:opacity-10 transition-all duration-500 z-10 ${selectedPhase === p.id ? 'opacity-15 -rotate-12 scale-110' : 'rotate-12'}`}>
                        <p.bgIcon size={72} className={selectedPhase === p.id ? 'text-indigo-400' : 'text-zinc-400'} />
                      </div>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 bg-indigo-600 text-white text-[10px] font-bold p-2 rounded-lg opacity-0 group-hover/phase:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover/phase:translate-y-0 z-50 text-center shadow-xl shadow-indigo-900/40">
                      {p.info}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-600 rotate-45"></div>
                    </div>

                    <div className="flex flex-col gap-1 relative z-20">
                      <span className="text-xl mb-1">{p.icon}</span>
                      <span className={`font-black text-sm uppercase tracking-tighter ${selectedPhase === p.id ? 'text-indigo-400' : 'text-zinc-400'}`}>{p.title}</span>
                      <span className="text-[10px] font-medium text-zinc-500 group-hover/phase:text-zinc-400 transition-colors">{p.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-10 text-left">
              <label className="block text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-4 text-center md:text-left">Personalização do Tempo (minutos)</label>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                {[
                  { label: 'Reprise', val: repriseTime, set: setRepriseTime, icon: <Clock size={14} />, info: 'Recordação rápida do que foi visto no estudo anterior.' },
                  { label: 'Estudo', val: estudoTime, set: setEstudoTime, icon: <BookOpen size={14} />, info: 'Fase de absorção e criação de material próprio.' },
                  { label: 'Questões', val: aplicacaoTime, set: setAplicacaoTime, icon: <Target size={14} />, info: 'Aplicação prática e teste de conhecimento.' },
                  { label: 'Revisão', val: revisaoTime, set: setRevisaoTime, icon: <TrendingUp size={14} />, info: 'Recordação ativa do material produzido hoje.' },
                  { label: 'Descanso', val: descansoTime, set: setDescansoTime, icon: <Zap size={14} />, info: 'Pausa necessária para consolidação da memória.' }
                ].map((field, fIdx) => (
                  <div key={fIdx} className="bg-zinc-950/50 border border-zinc-800/80 p-4 rounded-2xl flex flex-col gap-4 group/card transition-all hover:border-indigo-500/30 w-full sm:w-[calc(50%-1rem)] lg:w-[calc(20%-1rem)] min-w-[140px] relative">
                    {/* Clipping container for BG icon */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none opacity-20">
                    </div>

                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 bg-indigo-600 text-white text-[10px] font-bold p-2 rounded-lg opacity-0 group-hover/card:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover/card:translate-y-0 z-50 text-center shadow-xl shadow-indigo-900/40">
                      {field.info}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-600 rotate-45"></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{field.label}</span>
                      <div className="text-zinc-600 opacity-50 group-hover/card:opacity-100 transition-opacity">
                        {field.icon}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
                      <button
                        onClick={() => adjustTime(field.val, field.set, -1)}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-20"
                        disabled={field.val === timeOptions[0]}
                      >
                        <Minus size={16} />
                      </button>

                      <div className="flex flex-col items-center">
                        <span className="text-lg font-black text-zinc-100 tabular-nums">{field.val}</span>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase -mt-1">min</span>
                      </div>

                      <button
                        onClick={() => adjustTime(field.val, field.set, 1)}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-20"
                        disabled={field.val === timeOptions[timeOptions.length - 1]}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button fullWidth size="lg" onClick={handleStartSession} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-xl shadow-indigo-900/40 h-14 rounded-2xl text-lg font-black tracking-wider uppercase">
              Iniciar Sessão de Estudos
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  const currentStepInfo = currentSteps[stepIndex];
  const maxTimeForStep = currentStepInfo?.duration || 1;
  const progressPercentage = timeRemaining === 0 ? 0 : (timeRemaining / maxTimeForStep) * 100;
  const circleOffset = 301.59 - (progressPercentage / 100) * 301.59;
  const targetDiscObj = savedDisciplines.find(d => d.id === modalDisc);

  return (
    <section className="animate-in fade-in duration-500 min-h-screen flex flex-col p-4 md:p-8 bg-zinc-950 w-full rounded-none">

      {/* OVERLAY MODAL INTEGRAÇÃO (Aparece apenas na Finalização) */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="max-w-2xl w-full bg-zinc-900 border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <div className="p-8 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                  <CheckCircle className="text-emerald-500" size={28} />
                  Sessão Concluída!
                </h2>
                <p className="text-zinc-400 text-sm mt-1">Registrar as métricas automaticamente nas Planilhas e Edital.</p>
              </div>
            </div>
            <div className="p-8 space-y-6 bg-zinc-950/50">

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-zinc-400 font-medium text-xs uppercase tracking-wider mb-2">Disciplina Estudada</label>
                  <select value={modalDisc} onChange={e => { setModalDisc(e.target.value); setModalTopico(''); }} className="flex w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                    <option value="" disabled>-- Selecionar --</option>
                    {savedDisciplines.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-zinc-400 font-medium text-xs uppercase tracking-wider mb-2">Semana Destino (Estatística)</label>
                  <select value={modalSemana} onChange={e => setModalSemana(e.target.value)} className="flex w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                    <option value="" disabled>-- Selecionar Semana --</option>
                    {savedWeeks.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  {savedWeeks.length === 0 && <span className="text-[10px] text-rose-400">Nenhuma semana cadastrada.</span>}
                </div>

                <div className="col-span-2">
                  <label className="block text-zinc-400 font-medium text-xs uppercase tracking-wider mb-2">Tópico (Opcional - Vincula ao Edital)</label>
                  <select value={modalTopico} onChange={e => setModalTopico(e.target.value)} className="flex w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" disabled={!modalDisc}>
                    <option value="">-- Ignorar (Não registrar no tópico) --</option>
                    {targetDiscObj?.topicos.map(t => <option key={t.id} value={t.id}>{t.texto}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-xl flex gap-6 items-center">
                <div className="flex-1">
                  <label className="block text-zinc-400 font-bold text-xs uppercase tracking-wider mb-2 text-center">Resolvidas</label>
                  <Input type="number" min="0" placeholder="0" className="text-center h-12 text-lg font-bold" value={modalResolvidas} onChange={e => setModalResolvidas(e.target.value)} />
                </div>
                <div className="text-xl font-black text-zinc-700">/</div>
                <div className="flex-1">
                  <label className="block text-emerald-500 font-bold text-xs uppercase tracking-wider mb-2 text-center">Certas</label>
                  <Input type="number" min="0" placeholder="0" className="text-center h-12 text-lg font-bold border-emerald-900 focus:ring-emerald-500" value={modalCertas} onChange={e => setModalCertas(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button variant="ghost" onClick={handleCancelSession} className="text-zinc-500 hover:text-zinc-300">Descartar Relatório</Button>
                <Button onClick={handleSubmitMetrics} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 px-8">Registrar e Fechar</Button>
              </div>

            </div>
          </Card>
        </div>
      )}

      {/* TELA PRINCIPAL DO CRONÔMETRO */}
      <header className={`mb-8 flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800/80 shadow-lg shadow-black/20 ${showMetricsModal ? 'blur-sm grayscale' : ''} transition-all`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-1">Fase {selectedPhase} — Protocolo Deep Focus</h1>
          <p className="text-indigo-400 text-sm font-medium">Bloqueio Atencional Ativado. Abstraia do mundo agora.</p>
        </div>
        <Button variant="danger" size="sm" onClick={async () => {
          const confirmed = await confirm("Abortar e perder todo o progresso do cronômetro?", { variant: 'danger', title: 'Abortar Sessão' });
          if (confirmed) handleCancelSession();
        }}>
          Abortar Sessão
        </Button>
      </header>

      <div className={`flex-grow grid grid-cols-1 xl:grid-cols-3 gap-8 relative w-full ${showMetricsModal ? 'blur-sm grayscale' : ''} transition-all`}>
        <Card className="xl:col-span-2 p-8 md:p-12 flex flex-col items-center justify-center text-center bg-zinc-900 shadow-xl border-zinc-800/50 rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 left-0 h-1 bg-zinc-800">
            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${((stepIndex + 1) / currentSteps.length) * 100}%` }}></div>
          </div>

          <Badge className="mb-2 bg-zinc-800/50 text-indigo-300 border-zinc-700/50 shadow-sm px-4 py-1.5" label={`Passo ${stepIndex + 1} de ${currentSteps.length}`} />

          <h2 className="text-4xl font-black text-zinc-100 mb-4 tracking-tight drop-shadow-sm max-w-[80%]">
            {currentStepInfo?.title}
          </h2>

          <p className="text-zinc-400 mb-2 max-w-lg mx-auto text-lg leading-relaxed min-h-[60px]">
            {currentStepInfo?.instr}
          </p>

          <div className="relative flex items-center justify-center w-[18rem] h-[18rem] md:w-[24rem] md:h-[24rem] my-6">
            <svg viewBox="0 0 100 100" className="absolute w-full h-full -rotate-90 drop-shadow-xl overflow-visible">
              <circle className="text-zinc-800/70" strokeWidth="4" stroke="currentColor" fill="transparent" r="48" cx="50" cy="50" />
              <circle className={isCounting ? "text-indigo-500" : "text-zinc-500"} strokeWidth="4" strokeDasharray="301.59" strokeDashoffset={circleOffset} strokeLinecap="round" stroke="currentColor" fill="transparent" r="48" cx="50" cy="50" style={{ transition: 'stroke-dashoffset 1s linear, color 0.5s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 space-y-4">
              <div className={`text-[4.5rem] md:text-[6rem] font-black leading-none tabular-nums tracking-tighter ${isCounting ? 'text-indigo-400 drop-shadow-[0_0_20px_rgba(129,140,248,0.2)]' : 'text-zinc-200'} transition-all duration-500`}>
                {!showTimerText && isCounting && timeRemaining > 0 ? '••:••' : (currentStepInfo?.duration === 0 ? '--:--' : formatTime(timeRemaining))}
              </div>
              {timeRemaining > 0 && currentStepInfo?.duration > 0 && (
                <button onClick={() => setShowTimerText(!showTimerText)} className="text-zinc-500 hover:text-indigo-400 transition-colors p-2.5 rounded-full hover:bg-zinc-800/50 backdrop-blur-md border border-transparent hover:border-zinc-700/50">
                  {showTimerText ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              )}
            </div>
          </div>

          {/* AUDIO CONTROLS PANEL */}
          <div className="bg-zinc-950/40 backdrop-blur-sm border border-zinc-800/50 p-4 rounded-2xl mb-6 flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-2 duration-700">
            <div className="flex items-center gap-2 text-zinc-500 font-bold text-[10px] uppercase tracking-widest px-2 border-r border-zinc-800 mr-2 h-full py-1">
              <Settings2 size={14} className="text-indigo-400" />
              <span>Som ambiente</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleNoiseToggle('white')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${activeNoise === 'white' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
              >
                <Wind size={16} />
                <span className="text-xs font-bold uppercase tracking-tight">White</span>
              </button>
              <button
                onClick={() => handleNoiseToggle('brown')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${activeNoise === 'brown' ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
              >
                <Waves size={16} />
                <span className="text-xs font-bold uppercase tracking-tight">Brown</span>
              </button>
              <button
                onClick={() => handleNoiseToggle('beta')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${activeNoise === 'beta' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
              >
                <Zap size={16} />
                <span className="text-xs font-bold uppercase tracking-tight">Beta</span>
              </button>
              <button
                onClick={() => handleNoiseToggle('rain')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${activeNoise === 'rain' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
              >
                <CloudRain size={16} />
                <span className="text-xs font-bold uppercase tracking-tight">Rain</span>
              </button>
            </div>

            <div className="flex items-center gap-3 ml-auto pr-4 w-full md:w-auto">
              <Volume2 size={16} className="text-zinc-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={noiseVolume}
                onChange={handleVolumeChange}
                className="w-full md:w-24 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full mt-2 items-center">
            {timeRemaining > 0 && (
              <div className="flex gap-4 max-w-md w-full justify-center">
                <Button size="lg" variant={isCounting ? 'outline' : 'primary'} className={`flex-1 ${isCounting ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'bg-indigo-600 border-none hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/20'} ${currentStepInfo?.unskippable && !isCounting && stepIndex === 0 ? 'animate-pulse' : ''} text-lg h-14 rounded-xl`} onClick={handleTimerAction}>
                  {isCounting ? 'Pausar Relógio' : (currentStepInfo?.unskippable && timeRemaining === currentStepInfo?.duration ? 'Iniciar Reprise (Obrigatório)' : 'Iniciar Relógio')}
                </Button>

                {!currentStepInfo?.unskippable && (
                  <Button variant="ghost" size="lg" className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 h-14 rounded-xl" onClick={async () => {
                    const confirmed = await confirm("Acelerar para a conclusão desta etapa agora mesmo? O tempo será reduzido a 00:00.");
                    if (confirmed) {
                      if (workerRef.current) workerRef.current.postMessage('stop');
                      setIsCounting(false);
                      setTimeRemaining(0);
                    }
                  }}>Zero</Button>
                )}
              </div>
            )}

            {timeRemaining === 0 && (
              <div className="w-full max-w-lg mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {currentStepInfo?.requiresUpload && (
                  <div className="bg-zinc-950 p-6 rounded-2xl border border-indigo-900/30 mb-6 text-left shadow-xl">
                    <p className="text-sm text-indigo-400 mb-4 font-bold uppercase tracking-widest flex items-center gap-2">MATERIAL BASE</p>
                    <div className="space-y-4">
                      <div className="flex gap-4 w-full">
                        <label className="relative flex-1 bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 transition-all group cursor-pointer shadow-inner">
                          <input type="file" accept=".jpg,.png,.pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setUploadFileContext(e.target.files[0])} />
                          <div className="bg-indigo-500/10 p-3 rounded-full text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all"><Upload size={22} /></div>
                          <span className="text-[11px] font-bold text-zinc-400 text-center uppercase">Upload Arquivo</span>
                        </label>
                        <label className="relative flex-1 bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 transition-all group cursor-pointer shadow-inner">
                          <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setUploadFileContext(e.target.files[0])} />
                          <div className="bg-indigo-500/10 p-3 rounded-full text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all"><Camera size={22} /></div>
                          <span className="text-[11px] font-bold text-zinc-400 text-center uppercase">Tirar Foto</span>
                        </label>
                      </div>
                      {uploadFileContext && (
                        <div className="text-xs text-emerald-400 font-bold text-center bg-emerald-950/30 p-3 rounded-xl border border-emerald-900/50 shadow-inner flex flex-col">
                          <span className="opacity-70">Arquivo Pronto</span> <span>{uploadFileContext.name}</span>
                        </div>
                      )}
                      <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 min-h-[120px] resize-none" placeholder="RESUMO" value={uploadTextContext} onChange={e => setUploadTextContext(e.target.value)} />
                    </div>
                  </div>
                )}
                {currentStepInfo?.requiresCheckbox && (
                  <label className="w-full bg-indigo-900/10 p-6 rounded-2xl border border-indigo-500/20 mb-6 flex items-center gap-4 cursor-pointer hover:bg-indigo-900/20 transition-all">
                    <input type="checkbox" className="w-6 h-6 rounded bg-zinc-900" checked={singleCheckboxCtx} onChange={e => setSingleCheckboxCtx(e.target.checked)} />
                    <span className="text-zinc-300 text-sm">Confirmo as anotações do órgão e ano.</span>
                  </label>
                )}
                {currentStepInfo?.requiresMultiCheckboxes && (
                  <div className="w-full bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 mb-6 space-y-3 text-left">
                    {['banca', 'disciplina', 'anos'].map((key) => (
                      <label key={key} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 transition-all cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" checked={multiCheckboxesCtx[key]} onChange={e => setMultiCheckboxesCtx({ ...multiCheckboxesCtx, [key]: e.target.checked })} />
                        <span className="text-zinc-300 font-medium capitalize text-sm">Filtrei {key}?</span>
                      </label>
                    ))}
                  </div>
                )}
                <Button size="lg" onClick={handleAdvanceClick} className={`w-full h-16 text-lg font-bold tracking-wide shadow-xl overflow-hidden rounded-2xl ${canAdvance() ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                  {canAdvance() ? "Avançar Etapa / Finalizar" : "Ação Bloqueada"}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* PROGRESSO LATERAL */}
        <Card className="p-8 bg-zinc-900/80 border-zinc-800/50 w-full h-fit sticky top-8 shadow-xl rounded-3xl backdrop-blur-md">
          <h3 className="font-black text-sm mb-10 tracking-widest uppercase text-indigo-400 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            Progresso Geral
          </h3>
          <div className="space-y-0 relative pl-2">
            <div className="absolute left-[15px] top-6 bottom-10 w-[2px] bg-zinc-800/80 rounded-full"></div>
            {currentSteps.map((step, idx) => {
              const isCompleted = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              let stateClass = "text-zinc-600";
              let dotClass = "bg-zinc-900 border-zinc-800";
              if (isCompleted) {
                stateClass = "text-zinc-500";
                dotClass = "bg-indigo-900 border-indigo-700/50";
              } else if (isCurrent) {
                stateClass = "text-zinc-100";
                dotClass = "bg-indigo-500 border-indigo-400";
              }

              return (
                <div key={idx} className={`relative flex gap-6 pb-12 z-10 ${stateClass} transition-all duration-500 group`}>
                  <div className="mt-1 flex-none relative">
                    <div className={`w-6 h-6 rounded-full border-[3px] ${dotClass}`}></div>
                  </div>
                  <div>
                    <h4 className={`font-bold tracking-tight ${isCurrent ? 'text-xl text-indigo-100' : 'text-base'}`}>{step.title}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}

function Badge({ label, className }) {
  return <div className={`inline-flex items-center justify-center text-xs font-bold uppercase tracking-wider rounded-full ${className}`}>{label}</div>
}
