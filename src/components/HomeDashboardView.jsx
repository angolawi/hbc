import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Clock, Target, AlertTriangle, TrendingUp, BookOpen, CheckCircle, XCircle, Quote } from 'lucide-react';
import quotesData from '../assets/frases.json';

export default function HomeDashboardView() {
  const [stats, setStats] = useState({
    horasEstudadas: 0,
    minutosEstudados: 0,
    certas: 0,
    resolvidas: 0,
    desempenhoTotal: 0,
    disciplinas: [],
    temasAtencao: []
  });
  const [randomQuote, setRandomQuote] = useState("");

  useEffect(() => {
    // 0. Pick random quote
    if (quotesData.frases && quotesData.frases.length > 0) {
      const idx = Math.floor(Math.random() * quotesData.frases.length);
      setRandomQuote(quotesData.frases[idx]);
    }
    // 1. Horas Estudadas
    const rawHoras = localStorage.getItem('simpl_horas_estudadas');
    const mins = rawHoras ? parseInt(rawHoras, 10) : 0;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;

    // 2. Extrair dados do Edital e filtrar pelo ciclo atual
    const rawEdital = localStorage.getItem('simpl_edital');
    let discData = rawEdital ? JSON.parse(rawEdital) : [];

    const cicloData = localStorage.getItem('simpl_ciclo');
    if (cicloData) {
      try {
        const parsedCiclo = JSON.parse(cicloData);
        // Robustez: aceita tanto array simples quanto o novo objeto { blocks: [] }
        const blocks = Array.isArray(parsedCiclo) ? parsedCiclo : (parsedCiclo.blocks || []);
        const nomesNoCiclo = [...new Set(blocks.map(b => b.nome))];
        if (nomesNoCiclo.length > 0) {
          discData = discData.filter(d => nomesNoCiclo.includes(d.nome));
        }
      } catch (e) {
        console.error("Erro ao ler ciclo no dashboard:", e);
      }
    }

    let totalCertas = 0;
    let totalResolvidas = 0;
    const disciplinasCalculadas = [];
    const temasAvaliacao = [];

    discData.forEach(disc => {
      let discCertas = 0;
      let discResolvidas = 0;

      // Se tivermos as totalizações no weeklyStats
      if (disc.weeklyStats) {
        Object.values(disc.weeklyStats).forEach(w => {
          discCertas += Number(w.certas) || 0;
          discResolvidas += Number(w.resolvidas) || 0;
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

      // Avaliação de Temas Específicos (Tópicos)
      if (disc.topicos && Array.isArray(disc.topicos)) {
        disc.topicos.forEach(topico => {
           let tCertas = 0;
           let tResolvidas = 0;

           ['fase1', 'fase2', 'fase3'].forEach(fase => {
             if (topico[fase]) {
               tCertas += Number(topico[fase].certas) || 0;
               tResolvidas += Number(topico[fase].resolvidas) || 0;
             }
           });

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
    });

    // Sort attention topics by lowest percentage
    temasAvaliacao.sort((a, b) => a.pct - b.pct);

    const dsptotal = totalResolvidas > 0 ? (totalCertas / totalResolvidas) * 100 : 0;

    setStats({
      horasEstudadas: hrs,
      minutosEstudados: remMins,
      certas: totalCertas,
      resolvidas: totalResolvidas,
      desempenhoTotal: dsptotal,
      disciplinas: disciplinasCalculadas.sort((a,b) => b.resolvidas - a.resolvidas).slice(0, 5), // top 5
      temasAtencao: temasAvaliacao.slice(0, 10) // top 10 piores
    });
  }, []);

  const erradas = stats.resolvidas - stats.certas;

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

      {/* Mural da Realidade Widget */}
      <Card className="mb-8 p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-rose-900/30 overflow-hidden relative group transition-all hover:border-rose-500/30">
        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Quote size={120} className="text-rose-500 rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
             <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/80">Mural da Realidade</h2>
          </div>
          <p className="text-xl md:text-2xl font-bold text-zinc-200 tracking-tight leading-tight italic">
            "{randomQuote || "Carregando a realidade..."}"
          </p>
        </div>
      </Card>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-zinc-900 border-zinc-800/50 p-6 shadow-xl rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={80} className="text-indigo-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
              <Clock size={16} className="text-indigo-400" /> Tempo de Estudo
            </h3>
            <div className="text-4xl font-black text-zinc-100 py-3">
              {stats.horasEstudadas}<span className="text-xl text-zinc-500">h</span> {stats.minutosEstudados}<span className="text-xl text-zinc-500">m</span>
            </div>
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Total Acumulado</p>
          </div>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800/50 p-6 shadow-xl rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={80} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
              <Target size={16} className="text-emerald-400" /> Desempenho Global
            </h3>
            <div className="text-4xl font-black text-zinc-100 py-3">
              {stats.desempenhoTotal.toFixed(1)}<span className="text-2xl text-zinc-500">%</span>
            </div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Taxa de Acertos Geral</p>
          </div>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800/50 p-6 shadow-xl rounded-3xl flex flex-col justify-between">
          <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
             <BookOpen size={16} className="text-amber-500" /> Bateria de Questões
          </h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500"/> Certas</span>
                <span className="text-lg font-black text-emerald-400">{stats.certas}</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-300 flex items-center gap-2"><XCircle size={16} className="text-rose-500"/> Erradas</span>
                <span className="text-lg font-black text-rose-400">{erradas}</span>
             </div>
             <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${stats.resolvidas > 0 ? (stats.certas / stats.resolvidas)*100 : 0}%` }}></div>
                <div className="bg-rose-500 h-full" style={{ width: `${stats.resolvidas > 0 ? (erradas / stats.resolvidas)*100 : 0}%` }}></div>
             </div>
             <p className="text-center text-xs text-zinc-500 font-bold uppercase tracking-wider">Total Resolvidas: {stats.resolvidas}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Disciplinas mais feitas */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-xl rounded-3xl p-6">
          <h2 className="text-lg font-bold text-zinc-100 items-center flex gap-2 mb-6 tracking-tight">
            <TrendingUp size={20} className="text-sky-500" />
            Top 5 - Disciplinas (Volume)
          </h2>
          
          <div className="space-y-6">
            {stats.disciplinas.length === 0 && <p className="text-zinc-500 italic text-sm">Nenhum dado registrado ainda.</p>}
            
            {stats.disciplinas.map(disc => {
              const bgPct = disc.pct >= 80 ? 'bg-emerald-500' : disc.pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <div key={disc.id} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-zinc-200 truncate pr-4">{disc.nome}</span>
                    <span className="text-sm font-black text-zinc-400">{disc.pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-2.5 shadow-inner overflow-hidden">
                     <div className={`h-2.5 rounded-full ${bgPct} transition-all duration-1000 w-0 group-hover:brightness-110`} style={{ width: `${disc.pct}%` }}></div>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-2 font-bold">
                    {disc.certas} ACERTOS DE {disc.resolvidas}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

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
