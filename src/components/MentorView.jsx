import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Users, UserPlus, Search, ExternalLink, BarChart3, Clock, BrainCircuit, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { smartSync } from '../utils/dataSync';
import MentorPerformanceView from './MentorPerformanceView';

export default function MentorView() {
  const { user, setSelectedMentee } = useAuth();
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [newMenteeId, setNewMenteeId] = useState('');
  const [menteeStats, setMenteeStats] = useState({});

  useEffect(() => {
    fetchMentees();
  }, []);

  const fetchMentees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentorships')
        .select('id, student_id, profiles(email, first_name, last_name, target_contest)')
        .eq('mentor_id', user.id);

      if (error) throw error;
      setMentees(data.map(m => {
        const studentObj = { 
          id: m.student_id, 
          email: m.profiles?.email 
        };
        return {
          id: m.id,
          student_id: m.student_id,
          email: m.profiles?.email,
          displayName: m.profiles?.first_name 
              ? `${m.profiles.first_name} ${m.profiles.last_name || ''}`
              : m.profiles?.email || 'Aluno',
          student: studentObj
        };
      }));
      
      // Fetch summary stats for each mentee
      data.forEach(m => fetchStats(m.student_id));
    } catch (e) {
      console.error("Error fetching mentees:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (studentId) => {
    try {
      // Pull data from Supabase for this student (Mentor has permission)
      const data = await smartSync(user, studentId);
      if (data) {
        const stats = {
          hours: data.find(item => item.key === 'simpl_horas_estudadas')?.data || 0,
          cycle: data.find(item => item.key === 'simpl_ciclo')?.data?.name || 'Não iniciado',
          lastSync: data.find(item => item.key === 'simpl_edital')?.updated_at
        };
        setMenteeStats(prev => ({ ...prev, [studentId]: stats }));
      }
    } catch (e) {
      console.error(`Stats error for ${studentId}:`, e);
    }
  };

  const addMentee = async (e) => {
    e.preventDefault();
    if (!newMenteeId || newMenteeId.length < 30) {
      alert("Por favor, insira um ID de usuário válido.");
      return;
    }

    try {
      const { error } = await supabase
        .from('mentorships')
        .insert([{ mentor_id: user.id, student_id: newMenteeId }]);

      if (error) {
        if (error.code === '23503') throw new Error("ID do aluno não encontrado. Verifique se o ID está correto.");
        if (error.code === '23505') throw new Error("Este aluno já está vinculado a você.");
        if (error.code === '42P01') throw new Error("Tabela de mentoria não encontrada. Você executou o script SQL no Supabase?");
        throw error;
      }

      setNewMenteeId('');
      setShowAddForm(false);
      fetchMentees();
      alert("Aluno vinculado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      alert(e.message || "Erro ao adicionar mentorado.");
    }
  };

  const removeMentee = async (id) => {
    if (!confirm("Remover este mentorado?")) return;
    try {
      await supabase.from('mentorships').delete().eq('id', id);
      fetchMentees();
    } catch (e) {
      console.error(e);
    }
  };

  if (showStats) {
    return <MentorPerformanceView onBack={() => setShowStats(false)} />;
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-4 md:p-8">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Painel do Mentor</h1>
          <p className="text-zinc-500 text-sm max-w-md">Gerencie seus alunos e acompanhe o desempenho em tempo real.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowStats(true)}
            variant="outline"
            className="border-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2 px-6 h-12 rounded-2xl"
          >
            <BarChart3 size={18} />
            Monitorar Rendimento
          </Button>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 px-6 h-12 rounded-2xl shadow-lg shadow-indigo-900/20"
          >
            <UserPlus size={18} />
            Vincular Aluno
          </Button>
        </div>
      </header>

      {showAddForm && (
        <Card className="p-8 mb-8 bg-zinc-900 border-indigo-500/30 shadow-2xl animate-in slide-in-from-top-4">
          <form onSubmit={addMentee} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">ID do Aluno (Copie do Perfil do Aluno)</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  value={newMenteeId}
                  onChange={e => setNewMenteeId(e.target.value)}
                  placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-200 h-14 px-8 rounded-2xl font-bold">Vincular</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Carregando Alunos...</p>
        </div>
      ) : mentees.length === 0 ? (
        <Card className="p-20 bg-zinc-950 border-zinc-900 flex flex-col items-center text-center">
          <Users size={64} className="text-zinc-800 mb-6" />
          <h3 className="text-xl font-bold text-zinc-300 mb-2">Nenhum aluno vinculado</h3>
          <p className="text-zinc-600 text-sm max-w-sm">Comece vinculando seus mentorados usando o ID disponível no perfil de cada um.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mentees.map(m => {
            const stats = menteeStats[m.student_id] || {};
            return (
              <Card key={m.id} className="p-6 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-6 group rounded-3xl shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold uppercase transition-all group-hover:scale-110">
                      {m.displayName[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100">{m.displayName}</h3>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">{m.email}</p>
                    </div>
                  </div>
                  <button onClick={() => removeMentee(m.id)} className="text-zinc-700 hover:text-rose-500 transition-colors p-2">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                    <BarChart3 size={16} className="text-emerald-500 mb-2" />
                    <span className="block text-xs font-black text-zinc-500 uppercase tracking-tighter">Horas Totais</span>
                    <span className="text-lg font-bold text-zinc-100">{stats.hours || 0}h</span>
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                    <BrainCircuit size={16} className="text-amber-500 mb-2" />
                    <span className="block text-xs font-black text-zinc-500 uppercase tracking-tighter">Ciclo Atual</span>
                    <span className="text-xs font-bold text-zinc-100 truncate block">{stats.cycle}</span>
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                    <Clock size={16} className="text-indigo-500 mb-2" />
                    <span className="block text-xs font-black text-zinc-500 uppercase tracking-tighter">Último Sync</span>
                    <span className="text-[10px] font-bold text-zinc-100">
                      {stats.lastSync ? new Date(stats.lastSync).toLocaleDateString() : '--'}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={() => setSelectedMentee(m.student)}
                  className="w-full bg-zinc-100 hover:bg-white text-zinc-950 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  Gerenciar Aluno
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  );
}
