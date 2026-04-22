import { useState, useEffect } from 'react';
import { Calendar, Check } from 'lucide-react';

export default function CycleDashboardView() {
  const [disciplines, setDisciplines] = useState([]);
  const [dates, setDates] = useState([]);
  const [progress, setProgress] = useState({});
  const [activeBrush, setActiveBrush] = useState(1);

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
      
      let nextStatus = activeBrush;
      if (currentStatus === activeBrush) {
          nextStatus = 0; // Desmarcar se clicar na mesma cor
      }

      const newProgress = { ...progress, [key]: nextStatus };
      if (nextStatus === 0) {
          delete newProgress[key];
      }

      setProgress(newProgress);
      localStorage.setItem('simpl_grid_progress', JSON.stringify(newProgress));
  };

  const getCellAppearance = (status, isWeekend) => {
      if (status === 1) return "bg-orange-500 border-orange-600";
      if (status === 2) return "bg-red-500 border-red-600";
      if (status === 3) return "bg-teal-600 border-teal-700";
      if (status === 4) return "bg-sky-500 border-sky-600";
      if (status === 5) return "bg-purple-500 border-purple-600";
      if (status === 6) return "bg-emerald-500 border-emerald-600";
      if (status === 7) return "bg-pink-500 border-pink-600";
      if (status === 8) return "bg-amber-400 border-amber-500";
      
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
          <p className="text-zinc-400 text-sm font-medium mt-1">Selecione uma cor de bloco abaixo. Clique nas células no calendário para preenchê-las com a cor atual destacando o ciclo.</p>
        </div>
      </header>

      {/* Tabela Scrollável */}
      <div className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
          <div className="overflow-x-auto overflow-y-auto w-full h-[65vh] custom-scrollbar pb-4">
              <table className="w-auto border-collapse text-left min-w-max table-fixed">
                  <thead className="sticky top-0 z-20">
                      {/* Linha 1: Titulo Geral */}
                      <tr>
                          <th className="sticky left-0 z-30 bg-zinc-900 border-b border-r border-zinc-800 p-3 w-[250px] min-w-[250px] max-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                              <span className="text-sm font-bold text-zinc-100">Ciclo Atual</span>
                          </th>
                          <th colSpan={dates.length} className="bg-zinc-900 border-b border-zinc-800 p-2 text-center text-sm font-bold text-zinc-100">
                             Acompanhamento Mensal: {dates.length > 0 && dates[0].toLocaleDateString('pt-BR')} até {dates.length > 0 && dates[dates.length-1].toLocaleDateString('pt-BR')}
                          </th>
                      </tr>
                      {/* Linha 2: Datas */}
                      <tr>
                          <th className="sticky left-0 z-30 bg-zinc-950 border-b border-r border-zinc-800 p-2 w-[250px] min-w-[250px] max-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                          </th>
                          {dates.map((d, i) => {
                              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                              return (
                                  <th key={i} className={`p-0 w-6 min-w-[24px] max-w-[24px] text-center border-b border-r border-zinc-800 text-[10px] uppercase font-bold tracking-wider ${isWeekend ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-950 text-zinc-400'}`}>
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
                                    <td className={`sticky left-0 z-10 border-b border-r border-zinc-800 py-1 px-2 text-[11px] font-semibold w-[250px] min-w-[250px] max-w-[250px] overflow-hidden shadow-[2px_0_5px_rgba(0,0,0,0.5)] ${isRevisao ? 'bg-indigo-950/40 text-indigo-300' : 'bg-zinc-900 text-zinc-300 group-hover:bg-zinc-800'}`}>
                                        <div className="truncate w-full" title={disc}>{disc}</div>
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
                                                className={`p-0 border-b border-r border-zinc-800/50 cursor-pointer transition-colors w-6 h-6 min-w-[24px] max-w-[24px] text-center align-middle hover:brightness-125 ${getCellAppearance(status, isWeekend)}`}
                                            >
                                                {/* Cores sólidas sem exibição de número interno */}
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
          
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 text-xs flex flex-wrap gap-4 items-center justify-center shrink-0">
             <span className="text-zinc-400 font-bold mr-2">Seletor de Ciclo:</span>

             {[
                { id: 1, color: "bg-orange-500" },
                { id: 2, color: "bg-red-500" },
                { id: 3, color: "bg-teal-600" },
                { id: 4, color: "bg-sky-500" },
                { id: 5, color: "bg-purple-500" },
                { id: 6, color: "bg-emerald-500" },
                { id: 7, color: "bg-pink-500" },
                { id: 8, color: "bg-amber-400" }
             ].map(brush => (
                 <button 
                    key={brush.id}
                    onClick={() => setActiveBrush(brush.id)}
                    className={`w-6 h-6 rounded-full transition-transform outline-none ${brush.color} ${activeBrush === brush.id ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110 shadow-lg' : 'opacity-40 hover:opacity-80'}`}
                    title={`Selecionar Cor ${brush.id}`}
                 />
             ))}
             
             <div className="flex items-center gap-1.5 ml-4 text-zinc-400 border-l border-zinc-700 pl-4">
                 <div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded-sm"></div> Clique na célula pintada p/ apagar
             </div>
          </div>
      </div>
    </section>
  );
}
