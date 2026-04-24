import { useState, useEffect, Fragment } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Trash, LayoutGrid } from 'lucide-react';
import { pushData } from '../utils/dataSync';

export default function WeeklyStatsView() {
  const { alert, confirm } = useNotification();
  const [disciplines, setDisciplines] = useState([]);
  const [weeks, setWeeks] = useState([]);
  
  // Modal/Creation state
  const [newWeekName, setNewWeekName] = useState('');

  useEffect(() => {
    const savedDisciplines = localStorage.getItem('simpl_edital');
    if (savedDisciplines) {
      const parsed = JSON.parse(savedDisciplines);
      // Garante que todas disciplinas tem o objeto weeklyStats
      const migrated = parsed.map(d => ({
        ...d,
        categoria: d.categoria || 'Conhecimentos Gerais',
        currentPhase: d.currentPhase || 1,
        weeklyStats: d.weeklyStats || {}
      }));
      setDisciplines(migrated);
    }

    const savedWeeks = localStorage.getItem('simpl_weeks');
    if (savedWeeks) {
      setWeeks(JSON.parse(savedWeeks));
    }
  }, []);

  const saveDisciplines = (data) => {
    setDisciplines(data);
    localStorage.setItem('simpl_edital', JSON.stringify(data));
    pushData('simpl_edital', data);
  };

  const saveWeeks = (data) => {
    setWeeks(data);
    localStorage.setItem('simpl_weeks', JSON.stringify(data));
    pushData('simpl_weeks', data);
  };

  const addWeek = () => {
    let baseDateStr = '';

    if (weeks.length > 0) {
      const lastWeek = weeks[weeks.length - 1];
      const dateText = lastWeek.baseDate || lastWeek.name.replace("Relação até ", "").trim();
      const parts = dateText.split('/');
      
      if (parts.length === 3) {
        const dt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        dt.setDate(dt.getDate() + 7);
        baseDateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else {
         alert("Não foi possível identificar a data da última semana. Por favor, certifique-se de que está no formato DD/MM/AAAA.", "error");
         return;
      }
    } else {
      if (!newWeekName.trim()) {
        alert("Insira a data do término do primeiro ciclo de avaliação.", "error");
        return;
      }
      baseDateStr = newWeekName.trim();
    }

    const novaSb = {
      id: Date.now().toString(),
      name: `Relação até ${baseDateStr}`,
      baseDate: baseDateStr
    };
    
    saveWeeks([...weeks, novaSb]);
    setNewWeekName('');
  };

  const removeWeek = async (id) => {
    const confirmed = await confirm("Remover esta semana? Isso não apaga os dados já digitados, mas esconderá a coluna.", { variant: 'danger' });
    if (confirmed) {
      saveWeeks(weeks.filter(w => w.id !== id));
    }
  };

  const handleStatChange = (discId, weekId, field, value) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return {
          ...d,
          weeklyStats: {
            ...d.weeklyStats,
            [weekId]: {
              ...(d.weeklyStats[weekId] || { certas: '', resolvidas: '' }),
              [field]: value
            }
          }
        };
      }
      return d;
    });
    saveDisciplines(updated);
  };

  const getPercentage = (c, r) => {
    const cert = Number(c);
    const res = Number(r);
    if (!res || isNaN(res) || res <= 0) return '';
    return ((cert / res) * 100).toFixed(2) + '%';
  };

  // Agrupando disciplinas por categoria
  const groupedDisciplinas = {
    'Conhecimentos Gerais': disciplines.filter(d => d.categoria === 'Conhecimentos Gerais' || d.categoria === 'Gerais'),
    'Conhecimentos Específicos': disciplines.filter(d => d.categoria === 'Conhecimentos Específicos' || d.categoria === 'Específicos')
  };

  const getCategoryTotalForWeek = (categoryDiscs, weekId) => {
    let tCertas = 0;
    let tResolvidas = 0;
    categoryDiscs.forEach(d => {
      const stats = d.weeklyStats[weekId];
      if (stats) {
        tCertas += Number(stats.certas) || 0;
        tResolvidas += Number(stats.resolvidas) || 0;
      }
    });
    return { tCertas, tResolvidas };
  };

  // Cálculo acumulado (Total Geral) até determinada semana
  const getCumulativeTotalForWeek = (categoryDiscs, weekIndex) => {
    let cCertas = 0;
    let cResolvidas = 0;
    categoryDiscs.forEach(d => {
      // Somar desta semana e de todas as anteriores (baseado no array weeks)
      for (let i = 0; i <= weekIndex; i++) {
        const wId = weeks[i].id;
        const stats = d.weeklyStats[wId];
        if (stats) {
          cCertas += Number(stats.certas) || 0;
          cResolvidas += Number(stats.resolvidas) || 0;
        }
      }
    });
    return { cCertas, cResolvidas };
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full rounded-none">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800/80 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-1 flex items-center gap-2">
            <LayoutGrid size={24} className="text-emerald-500" />
            Visão Consolidada Semanal
          </h1>
          <p className="text-zinc-500 text-sm font-medium">Controle acumulativo de questões resolvidas por disciplina.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {weeks.length === 0 && (
            <Input 
              placeholder="Data Base (Ex: 10/03/2026)" 
              value={newWeekName} 
              onChange={e => setNewWeekName(e.target.value)} 
              className="w-full md:w-48 text-sm h-10 border-zinc-700 bg-zinc-950"
              onKeyDown={(e) => e.key === 'Enter' && addWeek()}
            />
          )}
          <Button onClick={addWeek} className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 whitespace-nowrap px-4">
            <Plus size={16} className="mr-2" /> 
            {weeks.length === 0 ? "Iniciar Planilha" : "Adicionar +7 Dias"}
          </Button>
        </div>
      </header>

      <Card className="bg-zinc-900 border-zinc-800 shadow-xl rounded-2xl overflow-x-auto relative">
        <div className="w-full pb-4" style={{ minWidth: `max(1000px, ${300 + weeks.length * 300}px)` }}>
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse table-fixed">
            <thead>
              {/* Header Row 1: The Titles of Weeks */}
              <tr className="bg-zinc-950/80 border-b border-zinc-800">
                <th className="p-4 font-bold text-zinc-300 w-72 border-r-4 border-zinc-800 sticky left-0 z-20 bg-zinc-950/90 shadow-md backdrop-blur" rowSpan="2">
                  Categorias / Disciplinas
                </th>
                {weeks.map(w => (
                  <th key={w.id} colSpan="3" className="p-3 text-center border-r border-zinc-800 font-black text-xs uppercase tracking-widest text-emerald-400 bg-emerald-900/10">
                    <div className="flex items-center justify-center gap-2">
                      {w.name}
                      <button onClick={() => removeWeek(w.id)} className="text-zinc-600 hover:text-rose-400 p-1"><Trash size={12} /></button>
                    </div>
                  </th>
                ))}
                {weeks.length === 0 && <th className="p-4 text-zinc-600 text-center font-normal italic w-full">Adicione uma semana no topo para visualizar a planilha.</th>}
              </tr>
              {/* Header Row 2: Certas / Resolvidas / Porcentagem */}
              {weeks.length > 0 && (
                <tr className="bg-zinc-900/90 border-b border-zinc-800">
                  {weeks.map(w => (
                    <Fragment key={`sub-${w.id}`}>
                       <th className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 text-center border-r border-zinc-800/50 w-24">Certas</th>
                       <th className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 text-center border-r border-zinc-800/50 w-24">Resolvidas</th>
                       <th className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 text-center border-r border-zinc-800 bg-emerald-950/20 w-24">% Acerto</th>
                    </Fragment>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {/* RENDER CATEGORIES */}
              {Object.entries(groupedDisciplinas).map(([catName, discs]) => {
                if (discs.length === 0) return null;
                
                return (
                  <Fragment key={catName}>
                    {/* Category Header */}
                    <tr className="bg-zinc-800/50 border-y border-zinc-800">
                      <td className="px-4 py-3 font-bold text-zinc-100 text-[11px] tracking-widest uppercase border-r-4 border-zinc-800 sticky left-0 bg-zinc-800/90 backdrop-blur z-10">
                        {catName}
                      </td>
                      {weeks.map(w => (
                        <td colSpan="3" key={`space-${w.id}`} className="border-r border-zinc-800 h-8"></td>
                      ))}
                    </tr>
                    
                    {/* Discipline Rows */}
                    {discs.map(d => {
                      const phase = d.currentPhase || 1;
                      const phaseBorderClass = phase === 3 ? "border-rose-500/50" : phase === 2 ? "border-amber-500/50" : "border-zinc-800";
                      const phaseBadgeClass = phase === 3 ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400";
                      
                      return (
                      <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className={`px-4 py-3 text-zinc-300 font-medium border-r-4 ${phaseBorderClass} sticky left-0 bg-zinc-900 z-10 w-72 shadow-[2px_0_10px_rgba(0,0,0,0.3)]`}>
                          <div className="flex items-center gap-2">
                             {phase > 1 && (
                               <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${phaseBadgeClass} shrink-0`}>
                                 F{phase}
                               </span>
                             )}
                             <div className="truncate w-full" title={d.nome}>{d.nome}</div>
                          </div>
                        </td>
                        {weeks.map(w => {
                          const stats = d.weeklyStats[w.id] || { certas: '', resolvidas: '' };
                          const pct = getPercentage(stats.certas, stats.resolvidas);
                          const pctNum = parseFloat(pct);
                          
                          let bgPct = "bg-zinc-900/50 text-zinc-500";
                          if (pctNum >= 80) bgPct = "bg-emerald-900/30 text-emerald-400 font-bold";
                          else if (pctNum >= 60) bgPct = "bg-amber-900/20 text-amber-400 font-bold";
                          else if (pctNum < 60 && pctNum >= 0) bgPct = "bg-rose-900/20 text-rose-400 font-bold";

                          return (
                            <Fragment key={`${d.id}-${w.id}`}>
                              <td className="p-2 border-r border-zinc-800/50 bg-zinc-900/30">
                                <Input type="number" min="0" placeholder="-" className="h-9 text-xs text-center border-zinc-800 bg-zinc-950 hover:border-zinc-700" value={stats.certas} onChange={e => handleStatChange(d.id, w.id, 'certas', e.target.value)} />
                              </td>
                              <td className="p-2 border-r border-zinc-800/50 bg-zinc-900/30">
                                <Input type="number" min="0" placeholder="-" className="h-9 text-xs text-center border-zinc-800 bg-zinc-950 hover:border-zinc-700" value={stats.resolvidas} onChange={e => handleStatChange(d.id, w.id, 'resolvidas', e.target.value)} />
                              </td>
                              <td className={`p-2 border-r border-zinc-800 text-center text-xs tracking-wider ${bgPct}`}>
                                {pct || '-'}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                      );
                    })}

                    {/* Category Totals */}
                    {weeks.length > 0 && (
                      <>
                        {/* Linha 1: Total da Semana (Acumulado de Resolvidas apenas) */}
                        <tr className="bg-zinc-950 border-t-2 border-zinc-700 text-zinc-400">
                          <td className="p-3 font-bold text-[11px] uppercase text-right border-r-4 border-zinc-800 sticky left-0 bg-zinc-950 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">Total</td>
                          {weeks.map(w => {
                            const tot = getCategoryTotalForWeek(discs, w.id);
                            return (
                              <Fragment key={`tot-${w.id}`}>
                                <td className="p-3 border-r border-zinc-800/50"></td>
                                <td className="p-3 text-center border-r border-zinc-800/50 text-[11px] font-bold text-zinc-100">{tot.tResolvidas || '-'}</td>
                                <td className="p-3 border-r border-zinc-800"></td>
                              </Fragment>
                            )
                          })}
                        </tr>
                        
                        {/* Linha 2: Total Geral Acumulado (Resolvidas cumulativo) */}
                        <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 shadow-inner">
                          <td className="p-3 font-bold text-[11px] uppercase text-right border-r-4 border-zinc-800 sticky left-0 bg-zinc-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">Total Geral</td>
                          {weeks.map((w, i) => {
                            const totC = getCumulativeTotalForWeek(discs, i);
                            return (
                              <Fragment key={`totGeral-${w.id}`}>
                                <td className="p-3 border-r border-zinc-800/50"></td>
                                <td className="p-3 text-center border-r border-zinc-800/50 text-[11px] font-bold text-emerald-400">{totC.cResolvidas || '-'}</td>
                                <td className="p-3 border-r border-zinc-800"></td>
                              </Fragment>
                            )
                          })}
                        </tr>

                        {/* Linha 3: Média (Porcentagem da Semana) */}
                        <tr className="bg-zinc-950 border-b-2 border-zinc-800 text-zinc-400">
                          <td className="p-3 font-bold text-[11px] uppercase text-right border-r-4 border-zinc-800 sticky left-0 bg-zinc-950 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">Média</td>
                          {weeks.map((w, i) => {
                            const tot = getCategoryTotalForWeek(discs, w.id);
                            const percWeek = getPercentage(tot.tCertas, tot.tResolvidas);
                            return (
                              <Fragment key={`media-${w.id}`}>
                                <td className="p-3 border-r border-zinc-800/50"></td>
                                <td className="p-3 border-r border-zinc-800/50"></td>
                                <td className="p-3 text-center border-r border-zinc-800 bg-emerald-950/20 text-emerald-400 text-[11px] tracking-wider font-bold">{percWeek || '-'}</td>
                              </Fragment>
                            )
                          })}
                        </tr>
                      </>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
