import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Camera, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { editalService } from '../services/api';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Select, Input } from './ui/Input';

const getPhaseWorkflows = (phase, repriseTime, estudoTime, aplicacaoTime, revisaoTime, descansoTime) => {
  if (phase === "1") {
    return [
      { id: 'reprise', title: 'Reprise Inicial', duration: repriseTime * 60, instr: 'Recorde mentalmente os resumos da última passagem por essa matéria. Use os próximos minutos obrigatoriamente.', unskippable: true },
      { id: 'estude', title: 'Estudo e Produção', duration: estudoTime * 60, instr: 'Estude a teoria e produza o seu PRÓPRIO material de revisão no caderno ou em papel.', requiresUpload: true },
      { id: 'aplicacao', title: 'Aplicação (Teste)', duration: aplicacaoTime * 60, instr: 'Resolva questões lidas ou novas para testar seu conhecimento fresco. Adicione novidades no resumo.' },
      { id: 'revisao', title: 'Revisão (Recorde)', duration: revisaoTime * 60, instr: 'Tente relembrar o conteúdo dos resumos que acabou de produzir sem consultar.' },
      { id: 'descanso', title: 'Descanse', duration: descansoTime * 60, instr: 'Modo difuso. Proibido foco atencional (redes sociais, e-mails). Deixe a mente divagar.' }
    ];
  } else if (phase === "2") {
    return [
      { id: 'reprise', title: 'Reprise Inicial', duration: repriseTime * 60, instr: 'Fase de Consolidação: Relembre mentalmente os resumos anteriores desta matéria. Tempo obrigatório.', unskippable: true },
      { id: 'revise_ini', title: 'Revisão do Tema', duration: estudoTime * 60, instr: 'Recorde o assunto lendo rapidamente os seus resumos já prontos da Fase 1.' },
      { id: 'aplique', title: 'Aplicação', duration: aplicacaoTime * 60, instr: 'Resolva questões intensamente. Obrigatório: Anote no verso da página do resumo o órgão e o ano de cada pegadinha.', requiresCheckbox: true },
      { id: 'revise_fim', title: 'Revisão do Resumo', duration: revisaoTime * 60, instr: 'Tente relembrar as informações estancadas e as novidades que acabou de atualizar no resumo.' },
      { id: 'descanso', title: 'Descanse', duration: descansoTime * 60, instr: 'Pausa da sua consolidação. Proibido foco atencional. Relaxe a mente.' }
    ];
  } else {
    return [
      { id: 'aplique', title: 'Aplicação', duration: aplicacaoTime * 60, instr: 'Resolva questões sem parar (Prova de Fogo). Alimente seu caderno de erros e anote os órgãos/anos no seu resumo.', requiresMultiCheckboxes: true },
      { id: 'revise', title: 'Enriquecimento do Resumo', duration: revisaoTime * 60, instr: 'Revise os resumos novos que você precisou criar/atualizar para consertar erros nos últimos minutos.' }
    ];
  }
};

export default function TimerView() {
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
  const timerRef = useRef(null);

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

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const playAlarm = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      setTimeout(() => osc.stop(), 500);
    } catch (e) {
      console.log("Audio block");
    }
  };

  const handlePhaseChange = (e) => {
    const phase = e.target.value;
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

  const loadMetricsData = async () => {
    try {
        const [discData, weeksData] = await Promise.all([
            editalService.getDisciplines(),
            // Assuming weeks might need a service too, or stay local for now
            JSON.parse(localStorage.getItem('simpl_weeks') || '[]')
        ]);
        setSavedDisciplines(discData);
        setSavedWeeks(weeksData);
        if (discData.length > 0) setModalDisc(discData[0].id);
        if (weeksData.length > 0) setModalSemana(weeksData[0].id);
    } catch (err) {
        console.error(err);
    }
  };

  const proceedToNextStep = async () => {
    if (!canAdvance()) {
      alert("Validação pendente de requisitos para progredir.");
      return;
    }

    setUploadFileContext(null);
    setUploadTextContext('');
    setSingleCheckboxCtx(false);
    setMultiCheckboxesCtx({ banca: false, disciplina: false, anos: false });

    setIsCounting(false);
    clearInterval(timerRef.current);

    if (stepIndex + 1 >= currentSteps.length) {
      // Abre modal final integrador
      await loadMetricsData();
      setShowMetricsModal(true);
    } else {
      setStepIndex(prev => prev + 1);
      setTimeRemaining(currentSteps[stepIndex + 1].duration);
    }
  };

  const handleAdvanceClick = async () => {
    if (!canAdvance()) {
      if (currentSteps[stepIndex]?.requiresUpload) {
        alert("Ação Requerida: Anexe sua revisão.");
      } else if (currentSteps[stepIndex]?.requiresCheckbox || currentSteps[stepIndex]?.requiresMultiCheckboxes) {
        alert("Atenção: Validação OBRIGATÓRIA pendente.");
      }
      return;
    }
    await proceedToNextStep();
  };

  const handleTimerAction = () => {
    if (isCounting) {
      setIsCounting(false);
      clearInterval(timerRef.current);
    } else {
      setIsCounting(true);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            playAlarm();
            setIsCounting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleCancelSession = () => {
    setIsCounting(false);
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setCurrentSteps([]);
    setShowMetricsModal(false);
    setModalCertas('');
    setModalResolvidas('');
    setModalTopico('');
  };

  const handleSubmitMetrics = async () => {
    if (!modalResolvidas || !modalCertas || !modalDisc || !modalSemana) {
      alert("Preencha Disciplina, Semana, Quantidade Resolvida e Certa."); return;
    }
    
    // Tempo gasto
    let sessionMinutes = 0;
    currentSteps.forEach(s => { sessionMinutes += Math.floor(s.duration / 60); });
    
    try {
        // Get current total hours from API
        const configRes = await fetch('/api/config/simpl_horas_estudadas');
        const prevMinsText = await configRes.json();
        const prevMins = prevMinsText ? parseInt(prevMinsText, 10) : 0;
        const newTotal = prevMins + sessionMinutes;
        
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'simpl_horas_estudadas', value: newTotal })
        });
        localStorage.setItem('simpl_horas_estudadas', newTotal.toString());

        // Update Disciplines
        const updatedDisc = savedDisciplines.map(d => {
            if (d.id === modalDisc) {
                let newWeeklyStats = { ...d.weeklyStats };
                let curWStats = newWeeklyStats[modalSemana] || { certas: '', resolvidas: '' };
                newWeeklyStats[modalSemana] = {
                    certas: (Number(curWStats.certas) || 0) + Number(modalCertas),
                    resolvidas: (Number(curWStats.resolvidas) || 0) + Number(modalResolvidas)
                };

                const today = new Date().toISOString().split('T')[0];
                const phaseKey = `fase${selectedPhase}`;

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
                                };
                            }
                            return t;
                        })
                    };
                }
                return { ...d, weeklyStats: newWeeklyStats };
            }
            return d;
        });

        await editalService.syncEdital(updatedDisc);
        localStorage.setItem('simpl_edital', JSON.stringify(updatedDisc));
        
        alert("Dados Sincronizados com Sucesso!");
        handleCancelSession();
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar métricas no servidor.");
    }
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  if (!timerRunning) {
    return (
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-8 flex flex-col min-h-screen bg-zinc-950 items-center justify-center">
        <header className="mb-10 flex flex-col items-center">
          <h1 className="text-5xl font-bold mb-4 tracking-tight py-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Cronômetro GA</h1>
          <p className="text-zinc-500 text-sm max-w-lg text-center">Configure sua sessão de alto desempenho.</p>
        </header>

        <Card className="max-w-xl p-10 w-full bg-zinc-900 border-zinc-800 shadow-2xl">
          <h3 className="text-xl font-semibold mb-8 tracking-tight text-zinc-100 border-b border-zinc-800 pb-4">Setup de Sessão</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="col-span-full">
              <label className="block text-zinc-400 font-medium text-sm mb-2">Fase de Estudo (Workflow)</label>
              <select
                value={selectedPhase}
                onChange={handlePhaseChange}
                className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                <option value="1">Fase 1 </option>
                <option value="2">Fase 2 </option>
                <option value="3">Fase 3 </option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 font-medium text-sm mb-2">Reprise (min)</label>
              <select value={repriseTime} onChange={e => setRepriseTime(Number(e.target.value))} className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                {[0, 3, 5, 10, 15, 20, 30, 40, 45, 60].map(val => <option key={val} value={val}>{val} min</option>)}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 font-medium text-sm mb-2">Estudo (min)</label>
              <select value={estudoTime} onChange={e => setEstudoTime(Number(e.target.value))} className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                {[0, 3, 5, 10, 15, 20, 30, 40, 45, 60].map(val => <option key={val} value={val}>{val} min</option>)}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 font-medium text-sm mb-2">Aplicação (min)</label>
              <select value={aplicacaoTime} onChange={e => setAplicacaoTime(Number(e.target.value))} className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                {[0, 3, 5, 10, 15, 20, 30, 40, 45, 60].map(val => <option key={val} value={val}>{val} min</option>)}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 font-medium text-sm mb-2">Revisão (min)</label>
              <select value={revisaoTime} onChange={e => setRevisaoTime(Number(e.target.value))} className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                {[0, 3, 5, 10, 15, 20, 30, 40, 45, 60].map(val => <option key={val} value={val}>{val} min</option>)}
              </select>
            </div>
            <div className="col-span-full">
              <label className="block text-zinc-400 font-medium text-sm mb-2">Descanso (min)</label>
              <select value={descansoTime} onChange={e => setDescansoTime(Number(e.target.value))} className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                {[0, 3, 5, 10, 15, 20, 30, 40, 45, 60].map(val => <option key={val} value={val}>{val} min</option>)}
              </select>
            </div>
          </div>
          <Button fullWidth size="lg" onClick={handleStartSession} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-900/20">
            Iniciar Relógio
          </Button>
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
                  <CheckCircle className="text-emerald-500" size={28}/> 
                  Sessão Concluída!
                </h2>
                <p className="text-zinc-400 text-sm mt-1">Registrar as métricas automaticamente nas Planilhas e Edital.</p>
              </div>
            </div>
            <div className="p-8 space-y-6 bg-zinc-950/50">
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-zinc-400 font-medium text-xs uppercase tracking-wider mb-2">Disciplina Estudada</label>
                  <select value={modalDisc} onChange={e => {setModalDisc(e.target.value); setModalTopico('');}} className="flex w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
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
                  <Input type="number" min="0" placeholder="0" className="text-center h-12 text-lg font-bold" value={modalResolvidas} onChange={e => setModalResolvidas(e.target.value)}/>
                </div>
                <div className="text-xl font-black text-zinc-700">/</div>
                <div className="flex-1">
                  <label className="block text-emerald-500 font-bold text-xs uppercase tracking-wider mb-2 text-center">Certas</label>
                  <Input type="number" min="0" placeholder="0" className="text-center h-12 text-lg font-bold border-emerald-900 focus:ring-emerald-500" value={modalCertas} onChange={e => setModalCertas(e.target.value)}/>
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
        <Button variant="danger" size="sm" onClick={() => { if (window.confirm("Abortar e perder todo o progresso do cronômetro?")) handleCancelSession() }}>
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
              <circle className="text-zinc-800/70" strokeWidth="4" stroke="currentColor" fill="transparent" r="48" cx="50" cy="50"/>
              <circle className={isCounting ? "text-indigo-500" : "text-zinc-500"} strokeWidth="4" strokeDasharray="301.59" strokeDashoffset={circleOffset} strokeLinecap="round" stroke="currentColor" fill="transparent" r="48" cx="50" cy="50" style={{ transition: 'stroke-dashoffset 1s linear, color 0.5s ease' }}/>
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

          <div className="flex flex-col gap-4 w-full mt-2 items-center">
            {timeRemaining > 0 && (
              <div className="flex gap-4 max-w-md w-full justify-center">
                <Button size="lg" variant={isCounting ? 'outline' : 'primary'} className={`flex-1 ${isCounting ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'bg-indigo-600 border-none hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/20'} ${currentStepInfo?.unskippable && !isCounting && stepIndex === 0 ? 'animate-pulse' : ''} text-lg h-14 rounded-xl`} onClick={handleTimerAction}>
                  {isCounting ? 'Pausar Relógio' : (currentStepInfo?.unskippable && timeRemaining === currentStepInfo?.duration ? 'Iniciar Reprise (Obrigatório)' : 'Iniciar Relógio')}
                </Button>

                {!currentStepInfo?.unskippable && (
                  <Button variant="ghost" size="lg" className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 h-14 rounded-xl" onClick={() => {
                    if (window.confirm("Acelerar para a conclusão desta etapa agora mesmo? O tempo será reduzido a 00:00.")) {
                      clearInterval(timerRef.current); setIsCounting(false); setTimeRemaining(0);
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
                      <input type="checkbox" className="w-6 h-6 rounded bg-zinc-900" checked={singleCheckboxCtx} onChange={e => setSingleCheckboxCtx(e.target.checked)}/>
                      <span className="text-zinc-300 text-sm">Confirmo as anotações do órgão e ano.</span>
                    </label>
                )}
                {currentStepInfo?.requiresMultiCheckboxes && (
                  <div className="w-full bg-zinc-950 p-6 rounded-2xl border border-zinc-800/80 mb-6 space-y-3 text-left">
                    {['banca', 'disciplina', 'anos'].map((key) => (
                      <label key={key} className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 transition-all cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded" checked={multiCheckboxesCtx[key]} onChange={e => setMultiCheckboxesCtx({...multiCheckboxesCtx, [key]: e.target.checked})}/>
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

