import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { GripVertical, AlertTriangle, AlertCircle, Info, BrainCircuit } from 'lucide-react';

const TAGS = {
  teorica: { id: 'teorica', label: 'Teórica / Decoreba', icon: '🟢', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  calculo: { id: 'calculo', label: 'Cálculo / Lógica', icon: '🔴', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  analitica: { id: 'analitica', label: 'Prática / Analítica', icon: '🟡', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
};

export default function CycleView() {
  const [step, setStep] = useState(1);
  const [disciplines, setDisciplines] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [selectedDiscs, setSelectedDiscs] = useState({});
  const [maxBlockTime, setMaxBlockTime] = useState(120); // default 2h
  
  const [generatedCycle, setGeneratedCycle] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [showFatigueWarning, setShowFatigueWarning] = useState(false);
  const [fatigueMsg, setFatigueMsg] = useState("");
  const [modalData, setModalData] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [inactiveCycles, setInactiveCycles] = useState([]);

  const customAlert = (title, message, type = "info") => {
    setModalData({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    const editalData = localStorage.getItem('simpl_edital');
    if (editalData) {
      const parsed = JSON.parse(editalData);
      setDisciplines(parsed.map(d => ({
        id: d.id,
        nome: d.nome,
        categoria: d.categoria
      })));
    }
    
    const active = localStorage.getItem('simpl_ciclo');
    if (active) {
      setActiveCycle(JSON.parse(active));
    }

    const history = localStorage.getItem('simpl_ciclo_history');
    if (history) {
      setInactiveCycles(JSON.parse(history));
    }
  }, []);

  const handleSelectDisc = (id, field, value) => {
    setSelectedDiscs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const toggleDiscipline = (id, nome) => {
    if (selectedDiscs[id]) {
      const copy = { ...selectedDiscs };
      delete copy[id];
      setSelectedDiscs(copy);
    } else {
      setSelectedDiscs(prev => ({
        ...prev,
        [id]: { nome, id, tag: '', weight: 120 } // default 2 hours per disc in cycle
      }));
    }
  };

  const generateCycle = () => {
    // Validate
    const selectedList = Object.values(selectedDiscs);
    if (selectedList.length === 0) {
      customAlert("Selecione Disciplinas", "Você precisa selecionar pelo menos uma disciplina para gerar o ciclo.", "warning");
      return;
    }
    const missingTag = selectedList.find(d => !d.tag);
    if (missingTag) {
      customAlert("Perfil em Branco", `Selecione o perfil cognitivo para: ${missingTag.nome}`, "warning");
      return;
    }

    // Split blocks based on maxBlockTime
    let rawBlocks = [];
    selectedList.forEach(d => {
      let remaining = Number(d.weight);
      let part = 1;
      while (remaining > 0) {
        let blockTime = Math.min(remaining, maxBlockTime);
        rawBlocks.push({
          uid: `${d.id}-part-${part}`,
          id: d.id,
          nome: d.nome,
          tag: d.tag,
          duration: blockTime
        });
        remaining -= blockTime;
        part++;
      }
    });

    // Alternation Algorithm (Greedy separation)
    // 1. Sort blocks to intertwine tags, avoiding calculus near calculus
    // A simple greedy approach: pop the highest frequency non-conflicting element.
    let remainingBlocks = [...rawBlocks];
    let structuredCycle = [];
    
    while(remainingBlocks.length > 0) {
      const lastTag = structuredCycle.length > 0 ? structuredCycle[structuredCycle.length - 1].tag : null;
      
      // Try to find a block that DOES NOT evaluate into a same-tag clash
      let bestIdx = -1;
      for (let i = 0; i < remainingBlocks.length; i++) {
        const candidate = remainingBlocks[i];
        if (candidate.tag !== lastTag) {
          // Additional heuristic: if last was calculo, avoid analitica if possible (both hard), etc.
          // But for now, strictly avoid same tag.
          bestIdx = i;
          break; // Found first acceptable
        }
      }

      // If we couldn't find one without a clash (e.g. only calculo left), we are forced to pick the first one.
      if (bestIdx === -1) {
        bestIdx = 0;
      }

      structuredCycle.push(remainingBlocks[bestIdx]);
      remainingBlocks.splice(bestIdx, 1);
    }

    setGeneratedCycle(structuredCycle);
    setStep(3);
    validateFatigue(structuredCycle);
  };

  const validateFatigue = (cycleArray) => {
    let clash = false;
    let msg = "";
    for (let i = 0; i < cycleArray.length - 1; i++) {
      let current = cycleArray[i];
      let next = cycleArray[i+1];
      if (current.tag === next.tag) {
        clash = true;
        if (current.tag === 'calculo') {
          msg = "Aviso de Fadiga: Você colocou duas disciplinas CÁLCULO/LÓGICA em sequência.";
        } else if (current.tag === 'teorica') {
          msg = "Aviso de Fadiga: Você colocou duas leituras/decorebas extensas em sequência.";
        } else if (current.tag === 'analitica') {
          msg = "Aviso de Fadiga: Duas disciplinas prático-analíticas seguidas vão esgotar sua compreensão de texto.";
        } else {
            msg = "Aviso de Fadiga: Disciplinas com a mesma exigência cognitiva em sequência.";
        }
        break;
      }
      
      if ((current.tag === 'calculo' && next.tag === 'analitica') || (current.tag === 'analitica' && next.tag === 'calculo')) {
          clash = true;
          msg = "Aviso de Fadiga: Alternar entre Cálculo e Analítica pode ser muito exaustivo. Tente colocar uma Teórica no meio.";
          break;
      }
    }
    
    if (clash) {
      setFatigueMsg(`${msg} Considere intercalar para descansar o cérebro.`);
      setShowFatigueWarning(true);
    } else {
      setShowFatigueWarning(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    // Slightly fade the dragged item
    e.target.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIdx(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    let newCycle = [...generatedCycle];
    const draggedItem = newCycle[draggedIdx];
    
    // Remove from old pos
    newCycle.splice(draggedIdx, 1);
    // Insert at new pos
    newCycle.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setGeneratedCycle(newCycle);
    validateFatigue(newCycle);
  };

  const saveCycle = () => {
    if (activeCycle && activeCycle.length > 0) {
      const newHistory = [activeCycle, ...inactiveCycles];
      localStorage.setItem('simpl_ciclo_history', JSON.stringify(newHistory));
      setInactiveCycles(newHistory);
    }
    
    localStorage.setItem('simpl_ciclo', JSON.stringify(generatedCycle));
    setActiveCycle(generatedCycle);
    setStep(1); // Reset step back to initial view after saving
    customAlert(
      "Ciclo Salvo com Sucesso!", 
      "O cronômetro estará travado nesta ordem.\n\nLembre-se:\n1 - Não é um calendário semanal, é uma fila contínua.\n2 - A cada bloco, tire de 15 a 20 minutos de pausa difusa!", 
      "success"
    );
    // In a real app we might redirect to timer view here.
  };

  const formatMins = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const getGridClass = (len) => {
    const n = Math.sqrt(len);
    let cols = 4;
    if (Number.isInteger(n)) {
      cols = Math.min(n, 4);
    }
    
    if (cols === 2) return "grid grid-cols-1 sm:grid-cols-2";
    if (cols === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full">
      <header className="mb-8 p-6 bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <BrainCircuit className="text-amber-500" />
            Criar Ciclo de Estudos
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-1">Gere sua fila contínua com otimização e alternância cognitiva.</p>
        </div>
      </header>

      {activeCycle && activeCycle.length > 0 && (
        <div className="mb-8 p-6 bg-indigo-900/10 border border-indigo-500/30 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
              <BrainCircuit className="text-indigo-400" />
              Ciclo Atual Ativo
            </h2>
            <Button variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs px-3 py-1 h-auto" onClick={() => {
              if (window.confirm("Deseja realmente apagar o ciclo atual?")) {
                localStorage.removeItem('simpl_ciclo');
                setActiveCycle(null);
              }
            }}>
              Apagar Ciclo Atual
            </Button>
          </div>
          <p className="text-zinc-400 text-sm mb-4">Esta é a sua fila de estudos. Ela guiará a ordem das disciplinas no cronômetro.</p>
          <div className={`${getGridClass(activeCycle.length)} gap-4 pb-4`}>
            {activeCycle.map((block, idx) => {
              const tagInfo = TAGS[block.tag] || { label: 'Desconhecido', icon: '❓', color: 'text-zinc-400 border-zinc-700' };
              return (
                <div key={`active-${block.uid}-${idx}`} className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 min-w-[220px] flex-shrink-0 flex flex-col justify-between shadow-md">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-zinc-100 text-sm truncate" title={block.nome}>{block.nome}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagInfo.color} inline-block`}>
                        {tagInfo.icon} {tagInfo.label}
                    </span>
                  </div>
                  <div className="text-right mt-4 pt-4 border-t border-zinc-800">
                    <span className="font-mono font-bold text-indigo-400 text-sm">
                      {formatMins(block.duration)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {inactiveCycles && inactiveCycles.length > 0 && (
        <div className="mb-8 space-y-6">
          {inactiveCycles.map((cycle, cycleIdx) => (
            <div key={`history-${cycleIdx}`} className="p-6 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl opacity-70 grayscale-[30%] transition-opacity hover:opacity-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-zinc-500 flex items-center gap-2">
                  <BrainCircuit className="text-zinc-500" />
                  Ciclo Anterior {cycleIdx === 0 && "(Último)"}
                </h2>
                <Button variant="ghost" className="text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 text-xs px-3 py-1 h-auto" onClick={() => {
                  if (window.confirm("Deseja realmente apagar este ciclo do histórico?")) {
                    const newHistory = [...inactiveCycles];
                    newHistory.splice(cycleIdx, 1);
                    localStorage.setItem('simpl_ciclo_history', JSON.stringify(newHistory));
                    setInactiveCycles(newHistory);
                  }
                }}>
                  Excluir do Histórico
                </Button>
              </div>
              <div className={`${getGridClass(cycle.length)} gap-4 pb-4`}>
                {cycle.map((block, idx) => {
                  const tagInfo = TAGS[block.tag] || { label: 'Desconhecido', icon: '❓', color: 'text-zinc-400 border-zinc-700' };
                  return (
                    <div key={`hist-block-${cycleIdx}-${block.uid}-${idx}`} className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 min-w-[220px] flex-shrink-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold border border-zinc-700">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-zinc-400 text-sm truncate" title={block.nome}>{block.nome}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagInfo.color} opacity-60 inline-block`}>
                            {tagInfo.icon} {tagInfo.label}
                        </span>
                      </div>
                      <div className="text-right mt-4 pt-4 border-t border-zinc-800/50">
                        <span className="font-mono font-bold text-zinc-500 text-sm">
                          {formatMins(block.duration)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <Card className="p-6 bg-zinc-900 border-zinc-800/80 xl:col-span-2">
            <h2 className="text-lg font-bold text-zinc-100 mb-2">1. Seleção de Disciplinas</h2>
            <p className="text-zinc-500 text-sm mb-6">Selecione quais matérias farão parte deste ciclo de estudos.</p>
            
            {disciplines.length === 0 ? (
                <div className="p-4 bg-zinc-950 rounded-xl text-center border border-zinc-800">
                    <p className="text-zinc-500">Nenhuma disciplina cadastrada no "Meu Edital".</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {disciplines.map(d => {
                    const isSelected = !!selectedDiscs[d.id];
                    return (
                    <div 
                        key={d.id} 
                        onClick={() => toggleDiscipline(d.id, d.nome)}
                        className={`p-4 rounded-xl border transition-colors flex items-center gap-4 cursor-pointer ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                    >
                        <input 
                            type="checkbox" 
                            checked={isSelected}
                            readOnly
                            className="w-5 h-5 accent-indigo-500 bg-zinc-900 border-zinc-700 rounded pointer-events-none"
                        />
                        <span className={`font-semibold ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`}>{d.nome}</span>
                    </div>
                    );
                })}
                </div>
            )}
          </Card>

          <Card className="p-6 bg-zinc-900 border-zinc-800/80 h-fit sticky top-24">
            <h2 className="text-lg font-bold text-zinc-100 mb-4">Avançar</h2>
            <p className="text-sm text-zinc-400 mb-6">Você selecionou <strong className="text-zinc-200">{Object.keys(selectedDiscs).length}</strong> disciplinas para o ciclo.</p>
            <Button 
                fullWidth 
                onClick={() => {
                    if (Object.keys(selectedDiscs).length === 0) {
                        customAlert("Nenhuma Disciplina", "Você precisa selecionar pelo menos uma disciplina para continuar.", "warning");
                        return;
                    }
                    setStep(2);
                }} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
                Configurar Matérias
            </Button>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <Card className="p-6 bg-zinc-900 border-zinc-800/80 xl:col-span-2">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setStep(1)} className="text-zinc-500 hover:text-zinc-300 p-2 -ml-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div>
                    <h2 className="text-lg font-bold text-zinc-100">2. Categorização e Carga Horária</h2>
                    <p className="text-zinc-500 text-sm hidden sm:block">Defina o nível cognitivo e o tempo total de cada matéria no ciclo.</p>
                </div>
            </div>
            
            <div className="space-y-3">
            {Object.values(selectedDiscs).map(d => (
                <div key={d.id} className="p-4 rounded-xl border bg-zinc-950 border-zinc-800 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                        <span className="font-semibold text-zinc-200">{d.nome}</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select 
                            className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-300 rounded-lg px-3 py-2.5 focus:border-indigo-500 outline-none w-full sm:w-auto"
                            value={d.tag}
                            onChange={(e) => handleSelectDisc(d.id, 'tag', e.target.value)}
                        >
                            <option value="" disabled>Qual o perfil?</option>
                            <option value="teorica">🟢 Teórica / Decoreba</option>
                            <option value="calculo">🔴 Cálculo / Lógica</option>
                            <option value="analitica">🟡 Prática / Analítica</option>
                        </select>
                        
                        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3">
                            <label className="text-xs text-zinc-400 whitespace-nowrap font-medium">Total:</label>
                            <select 
                                className="bg-transparent text-sm text-zinc-300 py-2.5 outline-none w-full sm:w-auto min-w-[110px]"
                                value={d.weight}
                                onChange={(e) => handleSelectDisc(d.id, 'weight', Number(e.target.value))}
                            >
                                <option value={30}>30 minutos</option>
                                <option value={60}>60 minutos</option>
                                <option value={90}>90 minutos</option>
                                <option value={120}>120 minutos (2h)</option>
                                <option value={150}>150 minutos (2.5h)</option>
                                <option value={180}>180 minutos (3h)</option>
                                <option value={240}>240 minutos (4h)</option>
                            </select>
                        </div>
                    </div>
                </div>
            ))}
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900 border-zinc-800/80 h-fit sticky top-24">
            <h2 className="text-lg font-bold text-zinc-100 mb-4">Regras de Divisão</h2>
            
            <div className="mb-6">
                <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Tamanho Máx. do Bloco</label>
                <select 
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 outline-none"
                    value={maxBlockTime}
                    onChange={(e) => setMaxBlockTime(Number(e.target.value))}
                >
                    <option value={30}>30 min</option>
                    <option value={60}>60 min (1h)</option>
                    <option value={90}>90 min (1h30)</option>
                    <option value={120}>120 min (2h)</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-2">Se a carga horária na matéria for maior que o bloco, ela aparecerá dividida no ciclo.</p>
            </div>

            <Button fullWidth onClick={generateCycle} className="bg-amber-600 hover:bg-amber-500 text-amber-50">
                Gerar Ciclo Inteligente
            </Button>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto">
            
            {showFatigueWarning && (
                <div className="mb-8 relative overflow-hidden bg-gradient-to-r from-rose-900/40 to-transparent border border-rose-500/30 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in zoom-in-95 duration-500 shadow-lg shadow-rose-900/20">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                    <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={24} />
                    <div>
                        <h4 className="text-rose-300 font-bold text-base mb-1">Aviso de Fadiga Cognitiva</h4>
                        <p className="text-rose-400/80 text-sm leading-relaxed">{fatigueMsg}</p>
                    </div>
                </div>
            )}

            <div className="mb-6 bg-zinc-800/40 border border-zinc-700/50 p-4 rounded-xl flex items-start gap-4">
                <Info className="text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-300">
                    <p className="font-bold text-zinc-200 mb-1">Arrastar e Soltar (Drag & Drop)</p>
                    Abaixo está a sua fila contínua otimizada. Você pode arrastar os cards para refinar a ordem. O sistema avisará se você colocar disciplinas conflitantes juntas.
                </div>
            </div>

            <div className="space-y-3 mb-8">
                {generatedCycle.map((block, idx) => {
                    const tagInfo = TAGS[block.tag];
                    // Verify if this specific block is clashing with prev or next for red border highlight
                    let isClashing = false;
                    const prev = idx > 0 ? generatedCycle[idx - 1] : null;
                    const next = idx < generatedCycle.length - 1 ? generatedCycle[idx + 1] : null;
                    
                    if (prev && prev.tag === block.tag) isClashing = true;
                    if (next && next.tag === block.tag) isClashing = true;

                    // Complex clash: calc near analitica
                    if (block.tag === 'calculo' && (prev?.tag === 'analitica' || next?.tag === 'analitica')) isClashing = true;
                    if (block.tag === 'analitica' && (prev?.tag === 'calculo' || next?.tag === 'calculo')) isClashing = true;

                    return (
                        <div 
                            key={`${block.uid}-${idx}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            className={`p-4 rounded-xl flex items-center gap-4 cursor-grab active:cursor-grabbing transform transition-all ${isClashing ? 'bg-rose-500/10 border-2 border-rose-500/50' : 'bg-zinc-900 border border-zinc-800/80 hover:border-zinc-600'}`}
                        >
                            <div className="text-zinc-600 cursor-grab">
                                <GripVertical />
                            </div>
                            
                            <div className="flex-1">
                                <h4 className={`font-bold ${isClashing ? 'text-rose-100' : 'text-zinc-100'}`}>{block.nome}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagInfo.color}`}>
                                        {tagInfo.icon} {tagInfo.label}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <span className={`font-mono font-bold ${isClashing ? 'text-rose-400' : 'text-zinc-400'}`}>
                                    {formatMins(block.duration)}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-zinc-400 flex-1">
                    Voltar e Refazer
                </Button>
                <Button onClick={saveCycle} className="bg-emerald-600 hover:bg-emerald-500 text-emerald-50 flex-1">
                    Salvar Trilha e Iniciar Ciclo
                </Button>
            </div>

        </div>
      )}

      {modalData.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${modalData.type === 'success' ? 'bg-emerald-500' : modalData.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
            <div className="flex items-center gap-3 mb-4 mt-2">
              {modalData.type === 'warning' && <AlertTriangle className="text-amber-500 w-6 h-6" />}
              {modalData.type === 'success' && <span className="text-emerald-500 text-2xl">🎉</span>}
              {modalData.type === 'info' && <Info className="text-indigo-400 w-6 h-6" />}
              <h3 className="text-xl font-bold text-zinc-100">{modalData.title}</h3>
            </div>
            <p className="text-zinc-400 text-sm whitespace-pre-wrap leading-relaxed mb-8">
              {modalData.message}
            </p>
            <Button fullWidth onClick={() => setModalData({ ...modalData, isOpen: false })} className={modalData.type === 'success' ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white"}>
              Entendido
            </Button>
          </div>
        </div>
      )}

    </section>
  );
}
