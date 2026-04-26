import { useState, useEffect, Fragment } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Trash, LayoutGrid, Loader2 } from 'lucide-react';
import { pushData, pullAllData } from '../utils/dataSync';
import { useAuth } from '../context/AuthContext';

export default function WeeklyStatsView() {
  const { alert, confirm } = useNotification();
  const { user, selectedMentee, isMentor } = useAuth();
  const [disciplines, setDisciplines] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [newWeekName, setNewWeekName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (selectedMentee) {
        const cloudData = await pullAllData(user, selectedMentee.id);
        const savedEdital = cloudData?.find(i => i.key === 'simpl_edital')?.data || [];
        const savedWeeks = cloudData?.find(i => i.key === 'simpl_weeks')?.data || [];
        setDisciplines(savedEdital);
        setWeeks(savedWeeks);
      } else {
        const savedEdital = JSON.parse(localStorage.getItem('simpl_edital') || '[]');
        const savedWeeks = JSON.parse(localStorage.getItem('simpl_weeks') || '[]');
        setDisciplines(savedEdital);
        setWeeks(savedWeeks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMentee, user]);

  const calculateGlobalStats = () => {
    let totalCertas = 0;
    let totalResolvidas = 0;
    
    disciplines.forEach(d => {
      Object.values(d.weeklyStats || {}).forEach(s => {
        totalCertas += Number(s.certas) || 0;
        totalResolvidas += Number(s.resolvidas) || 0;
      });
    });

    const average = totalResolvidas > 0 ? (totalCertas / totalResolvidas) * 100 : 0;
    
    return { totalCertas, totalResolvidas, average };
  };

  const globalStats = calculateGlobalStats();

  const saveDisciplines = async (data) => {
    setDisciplines(data);
    if (selectedMentee) {
      await pushData('simpl_edital', data, user, selectedMentee.id);
    } else {
      localStorage.setItem('simpl_edital', JSON.stringify(data));
      await pushData('simpl_edital', data);
    }
  };

  const saveWeeks = async (data) => {
    setWeeks(data);
    if (selectedMentee) {
      await pushData('simpl_weeks', data, user, selectedMentee.id);
    } else {
      localStorage.setItem('simpl_weeks', JSON.stringify(data));
      await pushData('simpl_weeks', data);
    }
  };

  const addWeek = async () => {
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
         alert("Data inválida na última semana.", "error"); return;
      }
    } else {
      if (!newWeekName.trim()) { alert("Insira a data do término do primeiro ciclo.", "error"); return; }
      baseDateStr = newWeekName.trim();
    }
    const novaSb = { id: Date.now().toString(), name: `Relação até ${baseDateStr}`, baseDate: baseDateStr };
    await saveWeeks([...weeks, novaSb]);
    setNewWeekName('');
  };

  const removeWeek = async (id) => {
    const confirmed = await confirm("Remover esta semana?");
    if (confirmed) await saveWeeks(weeks.filter(w => w.id !== id));
  };

  const handleStatChange = async (discId, weekId, field, value) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return {
          ...d,
          weeklyStats: {
            ...d.weeklyStats,
            [weekId]: { ...(d.weeklyStats[weekId] || { certas: '', resolvidas: '' }), [field]: value }
          }
        };
      }
      return d;
    });
    saveDisciplines(updated);
  };

  const handleNumericChange = (discId, weekId, field, val) => {
    const numericValue = val.replace(/[^0-9]/g, '');
    handleStatChange(discId, weekId, field, numericValue);
  };

  const getPercentage = (c, r) => {
    const cert = Number(c); const res = Number(r);
    if (!res || isNaN(res) || res <= 0) return '';
    return ((cert / res) * 100).toFixed(2) + '%';
  };

  const groupedDisciplinas = {
    'Conhecimentos Gerais': disciplines.filter(d => d.categoria === 'Conhecimentos Gerais' || d.categoria === 'Gerais' || !d.categoria),
    'Conhecimentos Específicos': disciplines.filter(d => d.categoria === 'Conhecimentos Específicos' || d.categoria === 'Específicos')
  };

  const getCategoryTotalForWeek = (categoryDiscs, weekId) => {
    let tCertas = 0; let tResolvidas = 0;
    categoryDiscs.forEach(d => {
      const stats = d.weeklyStats?.[weekId];
      if (stats) { tCertas += Number(stats.certas) || 0; tResolvidas += Number(stats.resolvidas) || 0; }
    });
    return { tCertas, tResolvidas };
  };

  const getCumulativeTotalForWeek = (categoryDiscs, weekIndex) => {
    let cCertas = 0; let cResolvidas = 0;
    categoryDiscs.forEach(d => {
      for (let i = 0; i <= weekIndex; i++) {
        const wId = weeks[i].id;
        const stats = d.weeklyStats?.[wId];
        if (stats) { cCertas += Number(stats.certas) || 0; cResolvidas += Number(stats.resolvidas) || 0; }
      }
    });
    return { cCertas, cResolvidas };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando Planilha...</p>
      </div>
    );
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <LayoutGrid size={24} className="text-emerald-500" />
            Visão Consolidada Semanal
          </h1>
          <p className="text-zinc-500 text-sm">Controle acumulativo de questões resolvidas.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {isMentor && (
            <>
              {weeks.length === 0 && (
                <Input placeholder="Data Base" value={newWeekName} onChange={e => setNewWeekName(e.target.value)} className="w-full md:w-48 bg-zinc-950" />
              )}
              <Button onClick={addWeek} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4">
                <Plus size={16} className="mr-2" /> 
                {weeks.length === 0 ? "Iniciar" : "Nova Semana"}
              </Button>
            </>
          )}
        </div>
      </header>

      <Card className="bg-zinc-900 border-zinc-800 shadow-xl rounded-2xl overflow-x-auto relative">
        <div className="w-full pb-4" style={{ minWidth: `max(1000px, ${300 + weeks.length * 300}px)` }}>
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse table-fixed">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-zinc-800">
                <th className="p-4 font-bold text-zinc-300 w-72 border-r-4 border-zinc-800 sticky left-0 z-20 bg-zinc-950" rowSpan="2">Disciplinas</th>
                {weeks.map(w => (
                  <th key={w.id} colSpan="3" className="p-3 text-center border-r border-zinc-800 font-black text-[10px] uppercase tracking-widest text-emerald-400 bg-emerald-900/10">
                    <div className="flex items-center justify-center gap-2">
                      {w.name}
                      {isMentor && (
                        <button onClick={() => removeWeek(w.id)} className="text-zinc-600 hover:text-rose-400 p-1"><Trash size={12} /></button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
              {weeks.length > 0 && (
                <tr className="bg-zinc-900/90 border-b border-zinc-800">
                  {weeks.map(w => (
                    <Fragment key={`sub-${w.id}`}>
                       <th className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 text-center border-r border-zinc-800/50 w-24">Certas</th>
                       <th className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 text-center border-r border-zinc-800/50 w-24">Res.</th>
                       <th className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 text-center border-r border-zinc-800 bg-emerald-950/20 w-24">%</th>
                    </Fragment>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {Object.entries(groupedDisciplinas).map(([catName, discs]) => {
                if (discs.length === 0) return null;
                return (
                  <Fragment key={catName}>
                    <tr className="bg-zinc-800/50 border-y border-zinc-800">
                      <td className="px-4 py-2 font-bold text-zinc-400 text-[10px] tracking-widest uppercase border-r-4 border-zinc-800 sticky left-0 bg-zinc-800">{catName}</td>
                      {weeks.map(w => <td colSpan="3" key={`space-${w.id}`} className="border-r border-zinc-800 h-8"></td>)}
                    </tr>
                    {discs.map(d => (
                      <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-300 font-medium border-r-4 border-zinc-800 sticky left-0 bg-zinc-900 z-10 truncate">{d.nome}</td>
                        {weeks.map(w => {
                          const stats = d.weeklyStats?.[w.id] || { certas: '', resolvidas: '' };
                          const pct = getPercentage(stats.certas, stats.resolvidas);
                          return (
                            <Fragment key={`${d.id}-${w.id}`}>
                              <td className="p-2 border-r border-zinc-800/50">
                                {isMentor ? (
                                  <Input 
                                    type="text" 
                                    inputMode="numeric"
                                    className="h-8 text-[11px] text-center bg-zinc-950" 
                                    value={stats.certas} 
                                    onChange={e => handleNumericChange(d.id, w.id, 'certas', e.target.value)} 
                                  />
                                ) : (
                                  <div className="h-8 flex items-center justify-center text-[11px] font-bold text-zinc-300">{stats.certas || '-'}</div>
                                )}
                              </td>
                              <td className="p-2 border-r border-zinc-800/50">
                                {isMentor ? (
                                  <Input 
                                    type="text" 
                                    inputMode="numeric"
                                    className="h-8 text-[11px] text-center bg-zinc-950" 
                                    value={stats.resolvidas} 
                                    onChange={e => handleNumericChange(d.id, w.id, 'resolvidas', e.target.value)} 
                                  />
                                ) : (
                                  <div className="h-8 flex items-center justify-center text-[11px] font-bold text-zinc-300">{stats.resolvidas || '-'}</div>
                                )}
                              </td>
                              <td className={`p-2 border-r border-zinc-800 text-center text-[11px] font-bold ${parseFloat(pct) >= 80 ? 'text-emerald-400' : 'text-zinc-500'}`}>{pct || '-'}</td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Subtotais por categoria removidos conforme solicitado para visão consolidada única no rodapé */}
                  </Fragment>
                );
              })}

              {/* RODAPÉ NORMALIZADO (PREMIUM DARK) */}
              {weeks.length > 0 && (
                <>
                  {/* Linha 1: Total */}
                  <tr className="bg-zinc-950/40">
                    <td className="p-4 border-r-4 border-zinc-800 sticky left-0 bg-zinc-950 z-20"></td>
                    {weeks.map(w => {
                      const tot = getCategoryTotalForWeek(disciplines, w.id);
                      return (
                        <Fragment key={`tot-ui-${w.id}`}>
                          <td className="p-2 border border-zinc-800 bg-zinc-900 text-[9px] font-black uppercase tracking-widest text-zinc-500 text-center">Total</td>
                          <td className="p-2 border border-zinc-800 bg-zinc-800/30 text-zinc-100 text-sm font-black text-center">{tot.tResolvidas}</td>
                          <td className="p-2 border-none bg-transparent"></td>
                        </Fragment>
                      )
                    })}
                  </tr>

                  {/* Linha 2: Total Geral */}
                  <tr className="bg-zinc-950/40">
                    <td className="p-4 border-r-4 border-zinc-800 sticky left-0 bg-zinc-950 z-20"></td>
                    {weeks.map((w, idx) => {
                      const cum = getCumulativeTotalForWeek(disciplines, idx);
                      return (
                        <Fragment key={`cum-ui-${w.id}`}>
                          <td className="p-2 border border-zinc-800 bg-zinc-900 text-[9px] font-black uppercase tracking-widest text-emerald-500/60 text-center">Total Geral</td>
                          <td className="p-2 border border-zinc-800 bg-emerald-500/5 text-emerald-400 text-sm font-black text-center">{cum.cResolvidas}</td>
                          <td className="p-2 border-none bg-transparent"></td>
                        </Fragment>
                      )
                    })}
                  </tr>

                  {/* Linha 3: Média */}
                  <tr className="bg-zinc-950/40">
                    <td className="p-4 border-r-4 border-zinc-800 sticky left-0 bg-zinc-950 z-20"></td>
                    {weeks.map(w => {
                      const tot = getCategoryTotalForWeek(disciplines, w.id);
                      const pct = getPercentage(tot.tCertas, tot.tResolvidas);
                      return (
                        <Fragment key={`avg-ui-${w.id}`}>
                          <td className="p-2 border border-zinc-800 bg-zinc-900 text-[9px] font-black uppercase tracking-widest text-amber-500/60 text-center">Média</td>
                          <td className="p-2 border border-zinc-800 bg-amber-500/5 text-amber-500 text-sm font-black text-center">{pct || '0.00%'}</td>
                          <td className="p-2 border-none bg-transparent"></td>
                        </Fragment>
                      )
                    })}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
