import { useState, useEffect } from 'react';
import { Calendar, Check } from 'lucide-react';

export default function CycleDashboardView() {
  const [disciplines, setDisciplines] = useState([]);
  const [dates, setDates] = useState([]);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    // Carregar disciplinas únicas do ciclo atual
    const cicloData = localStorage.getItem('simpl_ciclo');
    let uniqueDiscs = [];
    if (cicloData) {
      const parsed = JSON.parse(cicloData);
      const names = parsed.map(b => b.nome);
      uniqueDiscs = [...new Set(names)];
    }
    
    // Adicionar revisões fixas
    uniqueDiscs.push("Revisão Noturna", "Revisão Mensal");
    setDisciplines(uniqueDiscs);

    // Gerar 30 dias a partir de hoje
    const dateArray = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dateArray.push(d);
    }
    setDates(dateArray);

    // Carregar progresso salvo
    const savedProgress = localStorage.getItem('simpl_grid_progress');
    if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
    }
  }, []);

  const handleCellClick = (discName, dateStr) => {
      const key = `${discName}_${dateStr}`;
      const currentStatus = progress[key] || 0;
      const nextStatus = (currentStatus + 1) % 3; // 0 -> 1 -> 2 -> 0

      const newProgress = { ...progress, [key]: nextStatus };
      if (nextStatus === 0) {
          delete newProgress[key];
      }

      setProgress(newProgress);
      localStorage.setItem('simpl_grid_progress', JSON.stringify(newProgress));
  };

  const getCellAppearance = (status, isWeekend) => {
      if (status === 1) return "bg-sky-500/30 border-sky-500/50"; // Planejado (Azul)
      if (status === 2) return "bg-amber-500/30 border-amber-500/50 text-amber-200 font-bold"; // Concluído (Amarelo)
      
      // Vazio
      if (isWeekend) return "bg-zinc-800/40 border-zinc-700 hover:bg-zinc-700/50"; 
      return "bg-zinc-900 border-zinc-800 hover:bg-zinc-800";
  };

  const formatDateLabel = (d) => {
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      return `${day}-${month}`;
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full flex flex-col">
      <header className="mb-6 p-6 bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-lg flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Calendar className="text-rose-500" />
            Visão 30D (Grid de Ciclo)
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-1">Acompanhe seu avanço diário clicando nas células (1x=Agendado, 2x=Concluído).</p>
        </div>
      </header>

      {/* Tabela Scrollável */}
      <div className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
          <div className="overflow-x-auto overflow-y-auto w-full h-[65vh] custom-scrollbar pb-4">
              <table className="w-auto border-collapse text-left min-w-max">
                  <thead className="sticky top-0 z-20">
                      {/* Linha 1: Titulo Geral */}
                      <tr>
                          <th className="sticky left-0 z-30 bg-zinc-900 border-b border-r border-zinc-800 p-3 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                              <span className="text-sm font-bold text-zinc-100">Ciclo Atual</span>
                          </th>
                          <th colSpan={dates.length} className="bg-zinc-900 border-b border-zinc-800 p-2 text-center text-sm font-bold text-zinc-100">
                             Acompanhamento Mensal: {dates.length > 0 && dates[0].toLocaleDateString('pt-BR')} até {dates.length > 0 && dates[dates.length-1].toLocaleDateString('pt-BR')}
                          </th>
                      </tr>
                      {/* Linha 2: Datas */}
                      <tr>
                          <th className="sticky left-0 z-30 bg-zinc-950 border-b border-r border-zinc-800 p-2 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          </th>
                          {dates.map((d, i) => {
                              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                              return (
                                  <th key={i} className={`p-1 w-10 min-w-[40px] text-center border-b border-r border-zinc-800 text-[10px] uppercase font-bold tracking-wider ${isWeekend ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-950 text-zinc-400'}`}>
                                      <div className="-rotate-90 whitespace-nowrap h-16 flex items-center justify-center">
                                         {formatDateLabel(d)}
                                      </div>
                                  </th>
                              );
                          })}
                      </tr>
                  </thead>
                  
                  <tbody>
                      {disciplines.length === 0 ? (
                           <tr>
                                <td colSpan={dates.length + 1} className="p-8 text-center text-zinc-500">
                                    Nenhuma disciplina carregada. Gere um ciclo primeiro na aba "Criar Ciclo".
                                </td>
                           </tr>
                      ) : (
                          disciplines.map((disc, rIdx) => {
                              const isRevisao = disc.includes("Revisão");
                              return (
                                <tr key={rIdx} className="group">
                                    <td className={`sticky left-0 z-10 border-b border-r border-zinc-800 p-2 text-xs font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.5)] ${isRevisao ? 'bg-indigo-950/40 text-indigo-300' : 'bg-zinc-900 text-zinc-300 group-hover:bg-zinc-800'}`}>
                                        {disc}
                                    </td>
                                    {dates.map((d, cIdx) => {
                                        const dateStr = d.toISOString().split('T')[0];
                                        const key = `${disc}_${dateStr}`;
                                        const status = progress[key] || 0;
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        
                                        return (
                                            <td 
                                                key={cIdx} 
                                                onClick={() => handleCellClick(disc, dateStr)}
                                                className={`border-b border-r border-zinc-800/50 cursor-pointer transition-colors w-10 h-8 text-center align-middle hover:brightness-125 ${getCellAppearance(status, isWeekend)}`}
                                            >
                                                {status === 2 && (
                                                    <div className="flex items-center justify-center w-full h-full">
                                                        <Check size={14} className="opacity-80 drop-shadow-md" strokeWidth={3} />
                                                    </div>
                                                )}
                                                {status === 1 && (
                                                    <div className="w-full h-full opacity-0"></div> // Apenas a cor azul
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                              )
                          })
                      )}
                  </tbody>
              </table>
          </div>
          
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 text-xs flex gap-6 text-zinc-400 items-center justify-center shrink-0">
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded-sm"></div> Vazio</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-sky-500/30 border border-sky-500/50 rounded-sm"></div> Planejado</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500/30 border border-amber-500/50 text-amber-200 flex items-center justify-center rounded-sm"><Check size={10} strokeWidth={4} /></div> Concluído</div>
          </div>
      </div>
    </section>
  );
}
