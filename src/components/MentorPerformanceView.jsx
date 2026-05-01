import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { 
  BarChart3, 
  BrainCircuit, 
  Target, 
  Users, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Flame,
  ArrowRight,
  Clock,
  Zap
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { pullAllData } from '../utils/dataSync';

export default function MentorPerformanceView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [consolidatedData, setConsolidatedData] = useState([]);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    setLoading(true);
    try {
      const { data: membershipData, error } = await supabase
        .from('mentorships')
        .select('student_id, profiles(email, first_name, last_name, target_contest)')
        .eq('mentor_id', user.id);

      if (error) throw error;

      const results = await Promise.all((membershipData || []).map(async (m) => {
        const cloudData = await pullAllData(user, m.student_id);
        
        // Calculate Question Performance
        const edital = (cloudData || [])?.find(i => i.key === 'simpl_edital')?.data || [];
        let totalCertas = 0;
        let totalResolvidas = 0;
        
        if (Array.isArray(edital)) {
          edital.forEach(d => {
            if (d.weeklyStats) {
              Object.values(d.weeklyStats).forEach(stat => {
                totalCertas += Number(stat.certas) || 0;
                totalResolvidas += Number(stat.resolvidas) || 0;
              });
            }

            if (d.topicos && Array.isArray(d.topicos)) {
              d.topicos.forEach(topico => {
                ['fase1', 'fase2', 'fase3'].forEach(fase => {
                  if (topico[fase]) {
                    totalCertas += Number(topico[fase].certas) || 0;
                    totalResolvidas += Number(topico[fase].resolvidas) || 0;
                  }
                });
              });
            }
          });
        }

        const performance = totalResolvidas > 0 ? (totalCertas / totalResolvidas) * 100 : 0;
        const cycles = (cloudData || [])?.find(i => i.key === 'simpl_cycle_instances')?.data || [];
        const hours = (cloudData || [])?.find(i => i.key === 'simpl_horas_estudadas')?.data || 0;
        
        // Calculate Weekly Minutes (last 7 days)
        const dailyMinsLog = (cloudData || [])?.find(i => i.key === 'simpl_daily_study_time')?.data || {};
        let weeklyMins = 0;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          weeklyMins += Number(dailyMinsLog[dateStr]) || 0;
        }

        const displayName = m.profiles?.first_name 
            ? `${m.profiles.first_name} ${m.profiles.last_name || ''}`
            : m.profiles?.email || 'Aluno';

        return {
          id: m.student_id,
          email: m.profiles?.email,
          displayName,
          targetContest: m.profiles?.target_contest || 'Nenhum concurso definido',
          performance,
          totalQuestions: totalResolvidas,
          correctQuestions: totalCertas,
          cyclesCount: cycles.length,
          hours,
          weeklyMins
        };
      }));

      setConsolidatedData(results);
    } catch (e) {
      console.error("Error fetching mentor performance:", e);
    } finally {
      setLoading(false);
    }
  };

  const topPerformance = [...consolidatedData]
    .sort((a, b) => b.performance - a.performance)
    .slice(0, 3);
    
  const topEffort = [...consolidatedData]
    .sort((a, b) => b.weeklyMins - a.weeklyMins)
    .filter(m => m.weeklyMins > 0)
    .slice(0, 3);

  const attentions = consolidatedData.filter(m => (m.performance < 65 && m.totalQuestions > 0) || m.totalQuestions === 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-12/12 max-w-md space-y-4">
             <div className="h-4 bg-zinc-800 rounded-full animate-pulse w-3/4 mx-auto" />
             <div className="h-2 bg-zinc-800 rounded-full animate-pulse w-full" />
             <div className="h-2 bg-zinc-800 rounded-full animate-pulse w-5/6 mx-auto" />
        </div>
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Cruzando dados de rendimento...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 p-4 md:p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
          <TrendingUp className="text-emerald-500" size={36} />
          Análise Global
        </h1>
        <p className="text-zinc-500 text-sm font-medium">Dashboard consolidado para tomada de decisão estratégica.</p>
      </header>

      {/* Highlights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Top Performance Card */}
        <Card className="p-6 bg-emerald-500/5 border-emerald-500/20 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Trophy size={100} className="text-emerald-500" />
          </div>
          <h3 className="text-emerald-400 font-black uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center gap-2">
            <Flame size={14} /> 
            Top Rendimento
          </h3>
          <div className="space-y-3 relative z-10">
            {topPerformance.length > 0 ? topPerformance.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-emerald-950 font-bold text-[10px] uppercase">
                    {p.displayName[0]}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-zinc-100 truncate">{p.displayName}</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-black truncate">{p.targetContest}</span>
                  </div>
                </div>
                <span className="text-emerald-400 font-black text-xs">{p.performance.toFixed(1)}%</span>
              </div>
            )) : <p className="text-zinc-600 text-[10px] italic">Nenhum dado de rendimento disponível.</p>}
          </div>
        </Card>

        {/* Top Effort Card */}
        <Card className="p-6 bg-indigo-500/5 border-indigo-500/20 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={100} className="text-indigo-500" />
          </div>
          <h3 className="text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center gap-2">
            <Clock size={14} /> 
            Top Esforço (Últimos 7 dias)
          </h3>
          <div className="space-y-3 relative z-10">
            {topEffort.length > 0 ? topEffort.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border border-indigo-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-indigo-950 font-bold text-[10px] uppercase">
                    {p.displayName[0]}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-zinc-100 truncate">{p.displayName}</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-black truncate">{p.targetContest}</span>
                  </div>
                </div>
                <span className="text-indigo-400 font-black text-xs">{Math.floor(p.weeklyMins / 60)}h {p.weeklyMins % 60}m</span>
              </div>
            )) : <p className="text-zinc-600 text-[10px] italic">Nenhum estudo registrado nos últimos 7 dias.</p>}
          </div>
        </Card>

        {/* Attention Card */}
        <Card className="p-6 bg-rose-500/5 border-rose-500/20 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle size={100} className="text-rose-500" />
          </div>
          <h3 className="text-rose-400 font-black uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center gap-2">
            <Activity size={14} /> 
            Atenção Requerida
          </h3>
          <div className="space-y-3 relative z-10">
            {attentions.length > 0 ? attentions.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-2xl border border-rose-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-rose-800/30 flex items-center justify-center text-rose-400 font-bold text-[10px] uppercase">
                    {a.displayName[0]}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-zinc-100 truncate">{a.displayName}</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-black truncate">{a.targetContest}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-rose-400 font-black text-xs">{a.performance.toFixed(1)}%</span>
                </div>
              </div>
            )) : <p className="text-zinc-600 text-[10px] italic">Todos os alunos estão operando bem.</p>}
          </div>
        </Card>
      </div>

      {/* Main Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
            { label: 'Média de Acerto', val: `${(consolidatedData.reduce((acc, curr) => acc + curr.performance, 0) / (consolidatedData.length || 1)).toFixed(1)}%`, icon: Target, color: 'text-emerald-500' },
            { label: 'Total Questões', val: consolidatedData.reduce((acc, curr) => acc + curr.totalQuestions, 0), icon: BarChart3, color: 'text-indigo-500' },
            { label: 'Ciclos Rodados', val: consolidatedData.reduce((acc, curr) => acc + curr.cyclesCount, 0), icon: BrainCircuit, color: 'text-amber-500' },
            { label: 'Horas Totais', val: `${(consolidatedData.reduce((acc, curr) => acc + curr.hours, 0) / 60).toFixed(1)}h`, icon: Users, color: 'text-purple-500' },
        ].map((stat, i) => (
            <Card key={i} className="p-6 bg-zinc-900 border-zinc-800 shadow-xl rounded-2xl flex items-center gap-5">
                <div className={`p-4 rounded-xl bg-zinc-950 border border-zinc-800`}>
                    <stat.icon className={stat.color} size={24} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</h4>
                    <p className="text-2xl font-bold text-zinc-100">{stat.val}</p>
                </div>
            </Card>
        ))}
      </div>

      {/* Detailed Full Table */}
      <Card className="bg-zinc-900 border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden border-t border-zinc-700/30">
        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Users className="text-zinc-500" size={20} />
                Lista de Rendimento Individual
            </h2>
            <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Atualizado em Tempo Real</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/20 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                <th className="p-8">Aluno</th>
                <th className="p-8">Questões Geral</th>
                <th className="p-8 text-center">Rendimento %</th>
                <th className="p-8 text-center">Carga Horária</th>
                <th className="p-8 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {consolidatedData.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/20 transition-all group">
                  <td className="p-8">
                    <div className="font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors">{m.displayName}</div>
                    <div className="flex flex-col">
                        <div className="text-[10px] text-zinc-500 uppercase font-black">{m.targetContest}</div>
                        <div className="text-[10px] text-zinc-600 font-bold">{m.cyclesCount} Ciclos Rodados</div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">{m.correctQuestions}</span>
                        <span className="text-zinc-700">/</span>
                        <span className="text-zinc-400 font-medium">{m.totalQuestions}</span>
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <span className={`text-sm font-black ${m.performance >= 80 ? 'text-emerald-400' : m.performance >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                         {m.performance.toFixed(1)}%
                       </span>
                       <div className="w-32 h-1.5 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${m.performance >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : m.performance >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${m.performance}%` }} />
                       </div>
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/50 text-zinc-300 rounded-lg text-xs font-bold border border-zinc-700/50">
                      {Math.floor(m.hours / 60)}h {m.hours % 60}m
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <button className="text-zinc-600 hover:text-indigo-400 transition-colors p-2" title="Ver Detalhes">
                        <ArrowRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
