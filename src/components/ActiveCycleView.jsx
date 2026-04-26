import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { BrainCircuit } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { pushData } from '../utils/dataSync';

const TAGS = {
  teorica: { id: 'teorica', label: 'Teórica / Decoreba', icon: '🟢', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  calculo: { id: 'calculo', label: 'Cálculo / Lógica', icon: '🔴', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  analitica: { id: 'analitica', label: 'Prática / Analítica', icon: '🟡', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
};

export default function ActiveCycleView({ setActiveTab }) {
  const { user, isMentor, selectedMentee } = useAuth();
  const { confirm } = useNotification();
  const [activeCycle, setActiveCycle] = useState(null);
  const [inactiveCycles, setInactiveCycles] = useState([]);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [lastDiscName, setLastDiscName] = useState("");

  useEffect(() => {
    const active = localStorage.getItem('simpl_ciclo');
    let currentBlocks = [];
    if (active) {
      try {
        const parsed = JSON.parse(active);
        currentBlocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
        setActiveCycle(currentBlocks);
      } catch (e) {
        console.error("Erro ao carregar ciclo ativo:", e);
      }
    }

    const history = localStorage.getItem('simpl_ciclo_history');
    if (history) {
      setInactiveCycles(JSON.parse(history));
    }

    // Trava de Fluxo: verifica se concluiu a última matéria
    if (currentBlocks.length > 0) {
      const last = currentBlocks[currentBlocks.length - 1].nome;
      setLastDiscName(last);
      
      const progRaw = localStorage.getItem('simpl_grid_progress');
      if (progRaw) {
        try {
          const prog = JSON.parse(progRaw);
          const hasMarked = Object.keys(prog).some(key => 
            key.startsWith(last + "_") && (prog[key] !== 0 && prog[key] !== '0')
          );
          setIsUnlocked(hasMarked);
        } catch(e) {
          setIsUnlocked(true);
        }
      } else {
        setIsUnlocked(false);
      }
    } else {
      setIsUnlocked(true);
    }
  }, []);

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <BrainCircuit className="text-indigo-400" />
            Meu Ciclo Atual
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-1">Visualize sua fila de estudos e histórico.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button 
            disabled={!isUnlocked && !isMentor}
            onClick={() => setActiveTab('create_cycle')} 
            className={`${(!isUnlocked && !isMentor) ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-600 hover:bg-amber-500 text-amber-50'}`}
          >
            + Criar Novo Ciclo
          </Button>
          {!isUnlocked && !isMentor && (
            <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              <AlertTriangle size={10} /> Conclua {lastDiscName} no grid para liberar
            </span>
          )}
        </div>
      </div>

      {activeCycle && activeCycle.length > 0 ? (
        <div className="mb-8 p-6 bg-indigo-900/10 border border-indigo-500/30 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
              <BrainCircuit className="text-indigo-400" />
              Ciclo Em Andamento
            </h2>
            <Button variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs px-3 py-1 h-auto" onClick={async () => {
              const confirmed = await confirm("Deseja realmente apagar o ciclo atual?", { variant: 'danger' });
              if (confirmed) {
                localStorage.removeItem('simpl_ciclo');
                setActiveCycle(null);
                await pushData('simpl_ciclo', null);
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
      ) : (
        <div className="mb-8 p-12 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center text-center">
          <BrainCircuit className="text-zinc-600 mb-4" size={48} />
          <h2 className="text-xl font-bold text-zinc-300 mb-2">Nenhum ciclo ativo</h2>
          <p className="text-zinc-500 mb-6">Você não possui uma fila de estudos no momento.</p>
          <Button onClick={() => setActiveTab('create_cycle')} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            Criar Meu Primeiro Ciclo
          </Button>
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
                <Button variant="ghost" className="text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10 text-xs px-3 py-1 h-auto" onClick={async () => {
                  const confirmed = await confirm("Deseja realmente apagar este ciclo do histórico?", { variant: 'danger' });
                  if (confirmed) {
                    const newHistory = [...inactiveCycles];
                    newHistory.splice(cycleIdx, 1);
                    localStorage.setItem('simpl_ciclo_history', JSON.stringify(newHistory));
                    setInactiveCycles(newHistory);
                    await pushData('simpl_ciclo_history', newHistory);
                  }
                }}>
                  Excluir do Histórico
                </Button>
              </div>
              <div className={`${getGridClass(Array.isArray(cycle) ? cycle.length : (cycle.blocks?.length || 0))} gap-4 pb-4`}>
                {(Array.isArray(cycle) ? cycle : (cycle.blocks || [])).map((block, idx) => {
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
    </section>
  );
}
