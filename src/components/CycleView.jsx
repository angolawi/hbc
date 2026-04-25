import { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { GripVertical, AlertTriangle, AlertCircle, Info, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { pushData, pullAllData } from '../utils/dataSync';

const TAGS = {
  teorica: { id: 'teorica', label: 'Teórica / Decoreba', icon: '🟢', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  calculo: { id: 'calculo', label: 'Cálculo / Lógica', icon: '🔴', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  analitica: { id: 'analitica', label: 'Prática / Analítica', icon: '🟡', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
};

export default function CycleView({ setActiveTab }) {
  const { alert } = useNotification();
  const { user, selectedMentee } = useAuth();
  const [step, setStep] = useState(1);
  const [disciplines, setDisciplines] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [selectedDiscs, setSelectedDiscs] = useState({});
  const [maxBlockTime, setMaxBlockTime] = useState(120); // default 2h
  const [loading, setLoading] = useState(false);
  
  const [generatedCycle, setGeneratedCycle] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [showFatigueWarning, setShowFatigueWarning] = useState(false);
  const [fatigueMsg, setFatigueMsg] = useState("");

  useEffect(() => {
    const loadEdital = async () => {
      setLoading(true);
      try {
        if (selectedMentee) {
          const data = await pullAllData(user, selectedMentee.id);
          const saved = data?.find(i => i.key === 'simpl_edital')?.data || [];
          setDisciplines(saved.map(d => ({ id: d.id, nome: d.nome, categoria: d.categoria, tag: d.tag })));
        } else {
          // Busca do localStorage mas garante parse seguro
          const editalData = localStorage.getItem('simpl_edital');
          if (editalData) {
            const parsed = JSON.parse(editalData);
            setDisciplines(parsed.map(d => ({
              id: d.id,
              nome: d.nome,
              categoria: d.categoria,
              tag: d.tag
            })));
          }
        }
      } catch (e) {
        console.error("Erro ao carregar edital para ciclo:", e);
      } finally {
        setLoading(false);
      }
    };
    loadEdital();
  }, [selectedMentee, user, step]); // Adicionado 'step' para atualizar ao navegar entre passos

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
      const disc = disciplines.find(d => d.id === id);
      setSelectedDiscs(prev => ({
        ...prev,
        [id]: { nome, id, tag: disc?.tag || '', weight: 120 } 
      }));
    }
  };

  const generateCycle = () => {
    // Validate
    const selectedList = Object.values(selectedDiscs);
    if (selectedList.length === 0) {
      alert("Você precisa selecionar pelo menos uma disciplina para gerar o ciclo.", "error");
      return;
    }
    const missingTag = selectedList.find(d => !d.tag);
    if (missingTag) {
      alert(`Selecione o perfil cognitivo para: ${missingTag.nome}`, "error");
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

  const saveCycle = async () => {
    // Generate valid JSON for current cycle
    const cycleData = {
      blocks: generatedCycle,
      createdAt: new Date().toISOString(),
      currentBlockIdx: 0,
      isFinished: false
    };

    if (selectedMentee) {
      await pushData('simpl_ciclo', cycleData, user, selectedMentee.id);
      alert("Ciclo planejado e atribuído ao aluno com sucesso!", "success");
      setActiveTab('ciclo'); 
    } else {
      localStorage.setItem('simpl_ciclo', JSON.stringify(cycleData));
      await pushData('simpl_ciclo', cycleData, user);
      alert("Ciclo gerado e salvo com sucesso!", "success");
      setActiveTab('ciclo');
    }
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
            Criador de Ciclos de Estudos
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-1">Gere sua fila contínua com otimização e alternância cognitiva.</p>
        </div>
      </header>

      <div className="animate-in slide-in-from-top-4 fade-in duration-300">
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
                        alert("Você precisa selecionar pelo menos uma disciplina para continuar.", "error");
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
      </div>
    </section>
  );
}
