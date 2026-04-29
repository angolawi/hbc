import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Clock, Target, AlertTriangle, TrendingUp, BookOpen, CheckCircle, XCircle, Quote, MessageSquare, Trash2, Calendar, Zap, Flame, Crown, Medal, Users, Trophy } from 'lucide-react';
import { pushData, pullAllData } from '../utils/dataSync';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import quotesData from '../assets/frases.json';
import dreadboardData from '../assets/dreadboard.json';

export default function HomeDashboardView() {
  const [stats, setStats] = useState({
    horasEstudadas: 0,
    minutosEstudados: 0,
    certas: 0,
    resolvidas: 0,
    desempenhoTotal: 0,
    disciplinas: [],
    temasAtencao: [],
    fase1Pct: 0,
    fase2Pct: 0,
    fase3Pct: 0,
    fase1Mins: 0,
    fase2Mins: 0,
    fase3Mins: 0,
    totalTopicos: 0,
    dailyGoal: 0,
    todayMins: 0
  });
  const [randomQuote, setRandomQuote] = useState("");
  const [messages, setMessages] = useState([]);
  const [isHardMode, setIsHardMode] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const { user, selectedMentee } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      let rawHoras, rawEdital, cicloData, dailyGoalRaw, dailyMinsLogRaw, messagesRaw, rawGlobalStats;

      if (selectedMentee) {
        const cloudData = await pullAllData(user, selectedMentee.id);
        rawHoras = cloudData?.find(i => i.key === 'simpl_horas_estudadas')?.data;
        rawEdital = cloudData?.find(i => i.key === 'simpl_edital')?.data;
        cicloData = cloudData?.find(i => i.key === 'simpl_ciclo')?.data;
        dailyGoalRaw = cloudData?.find(i => i.key === 'simpl_daily_goal')?.data;
        dailyMinsLogRaw = cloudData?.find(i => i.key === 'simpl_daily_study_time')?.data;
        rawGlobalStats = cloudData?.find(i => i.key === 'simpl_global_stats')?.data;
        messagesRaw = cloudData?.find(i => i.key === 'simpl_messages')?.data || [];
        setMessages(messagesRaw);
      } else {
        rawHoras = localStorage.getItem('simpl_horas_estudadas');
        rawEdital = localStorage.getItem('simpl_edital');
        cicloData = localStorage.getItem('simpl_ciclo');
        dailyGoalRaw = localStorage.getItem('simpl_daily_goal');
        dailyMinsLogRaw = localStorage.getItem('simpl_daily_study_time');
        const savedMsg = localStorage.getItem('simpl_messages');
        setMessages(savedMsg ? JSON.parse(savedMsg) : []);
      }

      const hardModeActive = localStorage.getItem('simpl_hard_mode') === 'true';
      setIsHardMode(hardModeActive);

      const source = hardModeActive ? dreadboardData : quotesData;
      if (!randomQuote && source.frases && source.frases.length > 0) {
        const idx = Math.floor(Math.random() * source.frases.length);
        setRandomQuote(source.frases[idx]);
      }

      const mins = rawHoras ? parseInt(rawHoras, 10) : 0;
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;

      let discData = rawEdital ? (typeof rawEdital === 'string' ? JSON.parse(rawEdital) : rawEdital) : [];

      // Calcular dados com base no Edital Completo para garantir que métricas importadas apareçam
      let totalCertas = 0;
      let totalResolvidas = 0;
      const disciplinasCalculadas = [];
      const temasAvaliacao = [];
      let totalTopicos = 0;
      let f1Concluidos = 0;
      let f2Concluidos = 0;
      let f3Concluidos = 0;

      try {
        discData.forEach(disc => {
          let discCertas = 0;
          let discResolvidas = 0;

          if (disc.weeklyStats) {
            Object.values(disc.weeklyStats).forEach(w => {
              discCertas += Number(w.certas) || 0;
              discResolvidas += Number(w.resolvidas) || 0;
            });
          }

          if (disc.topicos && Array.isArray(disc.topicos)) {
            totalTopicos += disc.topicos.length;
            disc.topicos.forEach(topico => {
              if (topico.fase1?.conclusao) f1Concluidos++;
              if (topico.fase2?.conclusao) f2Concluidos++;
              if (Number(topico.fase3?.resolvidas) > 0) f3Concluidos++;

              let tCertas = 0;
              let tResolvidas = 0;

              ['fase1', 'fase2', 'fase3'].forEach(fase => {
                if (topico[fase]) {
                  tCertas += Number(topico[fase].certas) || 0;
                  tResolvidas += Number(topico[fase].resolvidas) || 0;
                }
              });

              discCertas += tCertas;
              discResolvidas += tResolvidas;

              if (tResolvidas > 0) {
                const tPct = (tCertas / tResolvidas) * 100;
                if (tPct < 70) {
                  temasAvaliacao.push({
                    id: topico.id,
                    disciplina: disc.nome,
                    texto: topico.texto,
                    pct: tPct,
                    resolvidas: tResolvidas,
                    certas: tCertas
                  });
                }
              }
            });
          }

          totalCertas += discCertas;
          totalResolvidas += discResolvidas;

          let pct = 0;
          if (discResolvidas > 0) {
            pct = (discCertas / discResolvidas) * 100;
          }

          disciplinasCalculadas.push({
            id: disc.id,
            nome: disc.nome,
            certas: discCertas,
            resolvidas: discResolvidas,
            pct: pct
          });
        });
      } catch (err) {
        console.error("Subject metrics computation failure:", err);
      }

      temasAvaliacao.sort((a, b) => a.pct - b.pct);
      const dsptotal = totalResolvidas > 0 ? (totalCertas / totalResolvidas) * 100 : 0;

      let totalAllTopicos = 0;
      let concluidoF1 = 0;
      let concluidoF2 = 0;
      let concluidoF3 = 0;
      let minsF1 = 0;
      let minsF2 = 0;
      let minsF3 = 0;

      let allEdital = [];
      try {
        allEdital = rawEdital ? (typeof rawEdital === 'string' ? JSON.parse(rawEdital) : rawEdital) : [];
      } catch (e) {
        console.error("Error parsing edital for progress calculation:", e);
      }
      if (!Array.isArray(allEdital)) allEdital = [];

      allEdital.forEach(d => {
        if (d.topicos) {
          d.topicos.forEach(t => {
            totalAllTopicos++;
            if (t.fase1?.conclusao) concluidoF1++;
            if (t.fase2?.conclusao) concluidoF2++;
            if (t.fase3?.resolvidas > 0) concluidoF3++;

            minsF1 += Number(t.fase1?.minutos) || 0;
            minsF2 += Number(t.fase2?.minutos) || 0;
            minsF3 += Number(t.fase3?.minutos) || 0;
          });
        }
      });

      const todayStr = new Date().toISOString().split('T')[0];
      let dailyMinsLog = {};
      try {
        if (dailyMinsLogRaw) dailyMinsLog = typeof dailyMinsLogRaw === 'string' ? JSON.parse(dailyMinsLogRaw) : dailyMinsLogRaw;
      } catch (e) { }

      const todayMinsValue = Number(dailyMinsLog[todayStr]) || 0;
      const parsedDailyGoal = parseFloat(dailyGoalRaw);
      const dailyGoalValue = isNaN(parsedDailyGoal) ? 0 : parsedDailyGoal;

      setStats({
        horasEstudadas: hrs,
        minutosEstudados: remMins,
        certas: totalCertas,
        resolvidas: totalResolvidas,
        desempenhoTotal: dsptotal,
        disciplinas: disciplinasCalculadas.sort((a, b) => b.resolvidas - a.resolvidas).slice(0, 5),
        temasAtencao: temasAvaliacao.slice(0, 10),
        fase1Pct: totalAllTopicos > 0 ? (concluidoF1 / totalAllTopicos) * 100 : 0,
        fase2Pct: totalAllTopicos > 0 ? (concluidoF2 / totalAllTopicos) * 100 : 0,
        fase3Pct: totalAllTopicos > 0 ? (concluidoF3 / totalAllTopicos) * 100 : 0,
        fase1Mins: minsF1,
        fase2Mins: minsF2,
        fase3Mins: minsF3,
        totalTopicos: totalAllTopicos,
        dailyGoal: dailyGoalValue,
        todayMins: todayMinsValue
      });
      if (!selectedMentee && !rawGlobalStats && (totalCertas > 0 || totalResolvidas > 0)) {
        const statsObj = {
          totalCertas,
          totalResolvidas,
          desempenhoTotal: totalResolvidas > 0 ? (totalCertas / totalResolvidas) * 100 : 0,
          updatedAt: new Date().toISOString()
        };
        pushData('simpl_global_stats', statsObj, user);
      }
    };

      loadData();
  }, [selectedMentee, user]);

  // Competition & Leaderboard Logic
  useEffect(() => {
    if (!user || stats.totalTopicos === 0 || selectedMentee) return;

    const syncAndFetchArena = async () => {
      try {
        // 1. Get current profile to know the contest
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(); 
        
        if (!profile) return;
        setUserProfile(profile);

        // 2. Update public stats in profile (Arena Sync)
        const totalMins = (stats.fase1Mins + stats.fase2Mins + stats.fase3Mins);
        await supabase.from('profiles').update({
          study_minutes: totalMins,
          avg_performance: stats.desempenhoTotal,
          questions_solved: stats.resolvidas
        }).eq('id', user.id);

        // 3. Fetch competitors for the same contest
        if (profile.target_contest) {
          const { data: competitors } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, study_minutes, avg_performance, questions_solved')
            .eq('target_contest', profile.target_contest)
            .order('avg_performance', { ascending: false })
            .order('study_minutes', { ascending: false })
            .order('questions_solved', { ascending: false })
            .limit(5);
          
          if (competitors) setLeaderboard(competitors);
        }
      } catch (e) {
        console.error("Arena HBC Sync Error:", e);
      }
    };

    const timer = setTimeout(syncAndFetchArena, 2000);
    return () => clearTimeout(timer);
  }, [user, stats.fase1Mins, stats.desempenhoTotal, stats.resolvidas, stats.totalTopicos]);

  const maskName = (first, last) => {
    if (!first) return "Guerreiro(a)";
    const f = first.trim().charAt(0).toUpperCase();
    const l = last && last.trim() ? last.trim().charAt(0).toUpperCase() : '';
    return l ? `${f}. ${l}.` : `${f}.`;
  };

  const removeMessage = async (id) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    localStorage.setItem('simpl_messages', JSON.stringify(updated));
    if (user) {
      await pushData('simpl_messages', updated, user);
    }
  };

  const erradas = stats.resolvidas - stats.certas;

  // Daily Goal Logic
  const dailyGoalMins = (stats.dailyGoal || 0) * 60;
  const remainsMins = Math.max(0, dailyGoalMins - stats.todayMins);
  const isGoalReached = stats.dailyGoal > 0 && stats.todayMins >= dailyGoalMins;
  const overMins = Math.max(0, stats.todayMins - dailyGoalMins);

  const hRemains = Math.floor(remainsMins / 60);
  const mRemains = remainsMins % 60;

  const hOver = Math.floor(overMins / 60);
  const mOver = overMins % 60;



  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800/80 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <TrendingUp className="text-indigo-500" /> Dashboard de Progresso
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-1">Resumo geral das estátisticas de rendimento dos seus estudos.</p>
        </div>
      </header>

      {/* Arena HBC - Competição de Mentorados */}
      {userProfile?.target_contest && leaderboard.length > 1 && (
        <Card className="bg-zinc-900 border-indigo-500/30 shadow-2xl rounded-3xl p-8 mb-8 relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000 rotate-12">
            <Trophy size={400} className="text-indigo-400" />
          </div>
          
          <div className="relative z-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-2 py-0.5 bg-indigo-500 text-[8px] font-black uppercase tracking-widest rounded text-white shadow-lg shadow-indigo-500/20">Arena HBC</div>
                  <h2 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-3">
                    <Crown className="text-amber-500" size={24} /> 
                    Ranking: {userProfile.target_contest}
                  </h2>
                </div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">
                  Compita com outros <Users size={12} className="inline mx-1" /> {leaderboard.length}+ alunos mascarados para sua segurança
                </p>
              </div>
              
              <div className="hidden md:block text-right">
                <span className="text-[10px] font-black text-zinc-600 block uppercase tracking-tighter mb-1">Atualizado agora</span>
                <div className="h-1 w-24 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-full animate-pulse opacity-50" />
                </div>
              </div>
            </header>

            <div className="space-y-3">
              {leaderboard.map((comp, idx) => {
                const isMe = comp.id === user.id;
                const pos = idx + 1;
                const hrs = Math.floor((comp.study_minutes || 0) / 60);
                const rm = (comp.study_minutes || 0) % 60;
                
                return (
                  <div 
                    key={comp.id} 
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                      isMe 
                      ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.02]' 
                      : 'bg-zinc-950/40 border-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center font-black text-lg italic text-zinc-500">
                      {pos === 1 && <Medal className="text-amber-400" size={28} />}
                      {pos === 2 && <Medal className="text-zinc-400" size={24} />}
                      {pos === 3 && <Medal className="text-orange-400" size={22} />}
                      {pos > 3 && `#${pos}`}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm uppercase tracking-widest ${isMe ? 'text-indigo-400' : 'text-zinc-100'}`}>
                          {maskName(comp.first_name, comp.last_name)}
                        </span>
                        {isMe && <span className="text-[8px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded tracking-tighter">VOCÊ</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 opacity-60">
                         <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span className="text-[10px] font-bold">{hrs}h {rm}m</span>
                         </div>
                         <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                         <div className="flex items-center gap-1">
                            <Target size={10} />
                            <span className="text-[10px] font-bold">{(comp.avg_performance || 0).toFixed(1)}%</span>
                         </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                       <span className="text-[10px] font-black text-zinc-500 block uppercase tracking-widest">Questões</span>
                       <span className="text-lg font-black text-zinc-200 tabular-nums">{comp.questions_solved || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Seu Compromisso de Hoje - Destaque Principal */}
      {stats.dailyGoal > 0 && (
        <Card className={`mb-8 p-8 border-2 transition-all relative overflow-hidden ${isGoalReached ? 'bg-emerald-600/10 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'bg-zinc-900 border-indigo-500/40 shadow-2xl shadow-indigo-500/5'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Clock size={160} className={isGoalReached ? 'text-emerald-500' : 'text-indigo-500'} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${isGoalReached ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white animate-pulse'}`}>
                  {isGoalReached ? '✓ Compromisso Cumprido' : '⚡ Seu compromisso de hoje'}
                </div>
                <div className="h-4 w-[1px] bg-zinc-800" />
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Meta Acordada: {stats.dailyGoal.toFixed(1)}h</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tighter leading-none mb-4">
                {isGoalReached
                  ? (overMins > 0 ? "Você é Imparável! Limite Superado." : "Objetivo Atingido. Missão Cumprida!")
                  : (stats.todayMins > 0 ? "Persista! A aprovação é feita de constância." : "Mantenha sua palavra. Inicie seus estudos.")
                }
              </h2>

              <p className="text-zinc-400 text-base max-w-xl font-medium leading-relaxed">
                {isGoalReached
                  ? `O planejado para hoje já está na conta. Todo minuto extra agora é vantagem competitiva sobre a concorrência.`
                  : `Cada segundo dedicado agora é um passo a menos rumo à sua nomeação. Não pare até o contador zerar.`
                }
              </p>
            </div>

            <div className="flex flex-col items-center shrink-0 bg-zinc-950/40 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-sm min-w-[280px]">
              <div className={`text-6xl font-black tabular-nums tracking-tighter transition-colors ${isGoalReached ? 'text-emerald-400' : 'text-zinc-100'}`}>
                {isGoalReached
                  ? `+${hOver}h ${mOver}m`
                  : `${hRemains}h ${mRemains}m`
                }
              </div>
              <div className={`text-[10px] font-black uppercase tracking-[0.3em] mt-3 ${isGoalReached ? 'text-emerald-500' : 'text-indigo-400 opacity-80'}`}>
                {isGoalReached ? 'Volume Extra (Bônus)' : 'Tempo Restante para a Meta'}
              </div>

              <div className="w-full mt-6 bg-zinc-900 h-2 rounded-full overflow-hidden shadow-inner border border-zinc-800/50">
                <div
                  className={`h-full transition-all duration-1000 ${isGoalReached ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'}`}
                  style={{ width: `${Math.min(100, (stats.todayMins / dailyGoalMins) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Mural da Realidade Widget */}
      {!selectedMentee && (
        <Card className={`mb-8 p-6 bg-gradient-to-br border-rose-900/30 overflow-hidden relative group transition-all hover:border-rose-500/30 ${isHardMode ? 'from-rose-950 to-zinc-950 border-rose-500' : 'from-zinc-900 to-zinc-950 border-rose-900/30'}`}>
          <div className={`absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity ${isHardMode ? 'opacity-10' : ''}`}>
            {isHardMode ? <AlertTriangle size={150} className="text-rose-500 -rotate-12" /> : <Quote size={120} className="text-rose-500 rotate-12" />}
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isHardMode ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-rose-500'}`}></div>
              <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isHardMode ? 'text-rose-500 animate-pulse' : 'text-rose-500/80'}`}>
                {isHardMode ? 'Modo Hardcore Ativado: A Realidade sem Filtro' : 'Mural da Realidade'}
              </h2>
            </div>
            <p className={`text-xl md:text-2xl font-bold tracking-tight leading-tight italic ${isHardMode ? 'text-zinc-100 uppercase not-italic font-black' : 'text-zinc-200'}`}>
              {isHardMode ? randomQuote : `"${randomQuote || "Carregando a realidade..."}"`}
            </p>
            {isHardMode && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[8px] bg-rose-500 text-white font-black px-1 py-0.5 rounded uppercase tracking-widest">Hardcore Mode Active</span>
                <span className="text-[10px] text-zinc-500 font-bold italic">Sem desculpas hoje.</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Mural de Recados do Mentor */}
      {messages.length > 0 && (
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <MessageSquare className="text-indigo-400" size={20} />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">Recados do seu Mentor</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.map(msg => (
              <Card key={msg.id} className="p-5 bg-indigo-600/10 border-indigo-500/30 relative group overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                      <Calendar size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                        {new Date(msg.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-zinc-100 leading-relaxed pr-4">{msg.text}</p>
                  </div>
                  <button
                    onClick={() => removeMessage(msg.id)}
                    className="text-indigo-400/50 hover:text-rose-500 p-1 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none">
                  <MessageSquare size={80} className="text-indigo-500/20" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}



      {/* Unified KPI Card: Performance & Questions */}
      <Card className="bg-zinc-900 border-emerald-500/10 shadow-xl rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Target size={180} className="text-emerald-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Main Percentage Drop */}
          <div className="flex-1 w-full border-b md:border-b-0 md:border-r border-zinc-800 pb-6 md:pb-0 md:pr-8">
            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={16} className="text-emerald-400" /> Desempenho Global (Resoluções)
            </h3>
            <div className="text-5xl md:text-6xl font-black text-zinc-100 mb-2">
              {stats.desempenhoTotal.toFixed(1)}<span className="text-2xl text-zinc-500 bg-transparent ml-1">%</span>
            </div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 inline-block px-3 py-1 rounded-full border border-emerald-500/20">
              Taxa de Acertos Geral
            </p>
          </div>

          {/* Breakdown & Bars */}
          <div className="flex-[1.2] w-full space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" /> Certas
              </span>
              <span className="text-xl font-black text-emerald-400 tabular-nums">{stats.certas}</span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <XCircle size={16} className="text-rose-500" /> Erradas
              </span>
              <span className="text-xl font-black text-rose-400 tabular-nums">{erradas}</span>
            </div>
            
            <div className="w-full bg-zinc-950 h-3 flex rounded-full overflow-hidden shadow-inner border border-zinc-800/50">
              <div className="bg-emerald-500 h-full transition-all duration-1000 shadow-[0_0_10px_#10b981]" style={{ width: `${stats.resolvidas > 0 ? (stats.certas / stats.resolvidas) * 100 : 0}%` }}></div>
              <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${stats.resolvidas > 0 ? (erradas / stats.resolvidas) * 100 : 0}%` }}></div>
            </div>
            <p className="text-center text-xs text-zinc-500 font-bold uppercase tracking-widest mt-2">
              Total Resolvidas: <span className="text-zinc-300 mx-1">{stats.resolvidas}</span>
            </p>
          </div>
          
        </div>
      </Card>

      {/* Time Tracking Card - Total Only */}
      <Card className="bg-gradient-to-br from-indigo-900/20 to-zinc-900 border-indigo-500/30 shadow-2xl rounded-3xl p-8 mb-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
        <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:rotate-12 transition-all duration-700">
          <Clock size={250} className="text-indigo-500" />
        </div>
        <div className="relative z-10 w-full">
          <h3 className="text-zinc-400 font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
            <Clock className="text-indigo-500" size={16} /> Carga Horária Acumulada
          </h3>
          <div className="text-6xl md:text-7xl font-black text-zinc-100 mb-2 tabular-nums">
            {stats.horasEstudadas}<span className="text-2xl md:text-3xl text-indigo-500 ml-1">h</span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-zinc-400 mb-6 tabular-nums">
            {stats.minutosEstudados}<span className="text-sm md:text-base text-zinc-500 ml-1">mins</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Histórico Global de Horas</span>
          </div>
        </div>
      </Card>



      <div className="grid grid-cols-1 gap-8">


        {/* Temas de Atenção */}
        <Card className="bg-zinc-900 border-rose-900/30 shadow-xl shadow-rose-900/5 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-zinc-100 items-center flex gap-2 tracking-tight">
              <AlertTriangle size={20} className="text-rose-500" />
              Temas de Atenção / Reforço
            </h2>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-full uppercase tracking-wider font-bold">Top Piores Acertos</span>
          </div>

          <div className="space-y-4">
            {stats.temasAtencao.length === 0 ? (
              <p className="text-zinc-500 italic text-sm">Não há temas com aproveitamento crítico abaíxo de 70% ou poucos dados.</p>
            ) : (
              stats.temasAtencao.map(tema => (
                <div key={tema.id} className="bg-rose-950/20 border border-rose-900/30 p-4 rounded-2xl flex items-center gap-4 hover:bg-rose-900/20 transition-colors">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-sm">
                    {tema.pct.toFixed(0)}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-rose-400/80 uppercase font-black tracking-widest mb-1 truncate">{tema.disciplina}</p>
                    <p className="text-sm font-semibold text-zinc-200 truncate">{tema.texto}</p>
                  </div>
                  <div className="shrink-0 text-right opacity-70">
                    <p className="text-xs text-zinc-400">Total: {tema.resolvidas}</p>
                    <p className="text-[10px] font-bold text-rose-400 uppercase">Certas: {tema.certas}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

    </section>
  );
}
