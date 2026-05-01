import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { 
  Users, 
  UserPlus, 
  Search, 
  ExternalLink, 
  BarChart3, 
  Clock, 
  BrainCircuit, 
  Trash2, 
  Trophy, 
  BookOpen,
  MessageSquare, 
  Send, 
  Calendar, 
  Mail, 
  XCircle,
  PauseCircle,
  PlayCircle,
  Activity
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { smartSync, pushData } from '../utils/dataSync';
import { useNotification } from '../context/NotificationContext';
import MentorPerformanceView from './MentorPerformanceView';

export default function MentorView() {
  const { user, setSelectedMentee } = useAuth();
  const [mentees, setMentees] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [newMenteeId, setNewMenteeId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [menteeStats, setMenteeStats] = useState({});
  const [activeMuralId, setActiveMuralId] = useState(null);
  const [muralText, setMuralText] = useState('');
  const { alert } = useNotification();

  useEffect(() => {
    fetchMentees();
    fetchInvitations();
  }, []);

  const fetchMentees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentorships')
        .select('id, student_id, is_active, profiles(email, first_name, last_name, target_contest)')
        .eq('mentor_id', user.id);

      if (error) throw error;
      setMentees(data.map(m => {
        const name = m.profiles?.first_name 
            ? `${m.profiles.first_name} ${m.profiles.last_name || ''}`
            : m.profiles?.email || 'Aluno';
        
        const studentObj = { 
          id: m.student_id, 
          email: m.profiles?.email,
          displayName: name
        };
        return {
          id: m.id,
          student_id: m.student_id,
          email: m.profiles?.email,
          displayName: name,
          targetContest: m.profiles?.target_contest || null,
          isActive: m.is_active ?? true,
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

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invited_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') console.error("Error fetching invitations:", error);
        return;
      }
      setInvitations(data || []);
    } catch (e) {
      console.error(e);
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

  const sendInvitation = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      alert("Por favor, insira um e-mail válido.");
      return;
    }

    try {
      const { error } = await supabase
        .from('invitations')
        .insert([{ email: inviteEmail.toLowerCase().trim(), invited_by: user.id }]);

      if (error) {
        if (error.code === '23505') throw new Error("Este e-mail já possui um convite pendente.");
        throw error;
      }

      setInviteEmail('');
      setShowInviteForm(false);
      fetchInvitations();
      alert("Convite enviado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      alert(e.message || "Erro ao enviar convite.");
    }
  };

  const revokeInvitation = async (id) => {
    if (!confirm("Revogar este convite? O usuário não poderá mais criar conta com este e-mail.")) return;
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', id);
      if (error) throw error;
      fetchInvitations();
      alert("Convite revogado.", "info");
    } catch (e) {
      console.error("Erro detalhado ao revogar convite:", e);
      alert(e.message || "Erro ao revogar convite. Verifique as permissões no Supabase.");
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

  const toggleMenteeStatus = async (id, currentStatus) => {
    const action = currentStatus ? "colocar em hiato" : "reativar o acompanhamento de";
    if (!confirm(`Deseja ${action} este aluno?`)) return;

    try {
      const { error } = await supabase
        .from('mentorships')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchMentees();
      alert(currentStatus ? "Aluno em hiato." : "Acompanhamento reativado!", "success");
    } catch (e) {
      console.error(e);
      alert("Erro ao alterar status do aluno.");
    }
  };

  const sendRecado = async (studentId) => {
    if (!muralText.trim()) return;
    try {
      // Pull current messages to append
      const cloudData = await smartSync(user, studentId);
      const currentMessages = cloudData?.find(i => i.key === 'simpl_messages')?.data || [];
      
      const newMessage = {
        id: Date.now().toString(),
        from: 'mentor',
        text: muralText.trim(),
        timestamp: new Date().toISOString(),
        read: false
      };
      
      const updated = [newMessage, ...currentMessages].slice(0, 20);
      await pushData('simpl_messages', updated, user, studentId);
      
      setMuralText('');
      setActiveMuralId(null);
      alert("Recado enviado com sucesso para o aluno!", "success");
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar recado.");
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
            onClick={() => {
              setShowInviteForm(!showInviteForm);
              setShowAddForm(false);
            }}
            variant="outline"
            className={`border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 px-6 h-12 rounded-2xl transition-all ${showInviteForm ? 'bg-indigo-500/10 ring-1 ring-indigo-500' : ''}`}
          >
            <Mail size={18} />
            Convidar por E-mail
          </Button>
          <Button 
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowInviteForm(false);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 px-6 h-12 rounded-2xl shadow-lg shadow-indigo-900/20"
          >
            <UserPlus size={18} />
            Vincular por ID
          </Button>
        </div>
      </header>

      {showInviteForm && (
        <Card className="p-8 mb-8 bg-zinc-900 border-indigo-500/30 shadow-2xl animate-in slide-in-from-top-4">
          <form onSubmit={sendInvitation} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">E-mail do Aluno</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="aluno@exemplo.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-500 h-14 px-8 rounded-2xl font-bold flex items-center gap-2">
                <Send size={16} />
                Enviar Convite
              </Button>
            </div>
          </form>
        </Card>
      )}

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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
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
        <div className="space-y-12">
          {/* Alunos em Acompanhamento */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-emerald-500" size={20} />
              <h2 className="text-lg font-bold text-white uppercase tracking-widest text-[11px]">Acompanhamento Ativo</h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
              <span className="text-[10px] font-black text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                {mentees.filter(m => m.isActive).length} ALUNOS
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mentees.filter(m => m.isActive).map(m => {
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
                      <div className="flex gap-1">
                        <button 
                          onClick={() => toggleMenteeStatus(m.id, m.isActive)} 
                          className="text-zinc-700 hover:text-amber-500 transition-colors p-2"
                          title="Colocar em Hiato"
                        >
                          <PauseCircle size={18} />
                        </button>
                        <button 
                          onClick={() => removeMentee(m.id)} 
                          className="text-zinc-700 hover:text-rose-500 transition-colors p-2"
                          title="Remover Aluno"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Concurso Alvo */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-500/8 border border-indigo-500/20">
                      <div className="p-1.5 rounded-lg bg-indigo-500/15 shrink-0">
                        <Trophy size={14} className="text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] font-black text-indigo-500/70 uppercase tracking-widest mb-0.5">Concurso Alvo</span>
                        <span className="text-xs font-bold text-indigo-200 truncate block">
                          {m.targetContest || 'Não definido pelo aluno'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                        <BarChart3 size={16} className="text-emerald-500 mb-2" />
                        <span className="block text-xs font-black text-zinc-500 uppercase tracking-tighter">Horas Totais</span>
                        <span className="text-lg font-bold text-zinc-100">{Math.floor((stats.hours || 0) / 60)}h {(stats.hours || 0) % 60}m</span>
                      </div>
                      <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                        <BrainCircuit size={16} className="text-amber-500 mb-2" />
                        <span className="block text-xs font-black text-zinc-500 uppercase tracking-tighter">Ciclo Atual</span>
                        <span className="text-xs font-bold text-zinc-100 truncate block">{stats.cycle || 'Não iniciado'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setSelectedMentee(m.student)}
                        className="flex-1 bg-zinc-100 hover:bg-white text-zinc-950 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={16} />
                        Gerenciar
                      </Button>
                      <Button 
                        onClick={() => setActiveMuralId(activeMuralId === m.student_id ? null : m.student_id)}
                        variant="outline"
                        className={`px-4 h-14 rounded-2xl border-zinc-800 transition-all ${activeMuralId === m.student_id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'text-zinc-400'}`}
                      >
                        <MessageSquare size={18} />
                      </Button>
                    </div>

                    {activeMuralId === m.student_id && (
                      <div className="animate-in fade-in zoom-in-95 duration-200 mt-2">
                        <div className="bg-zinc-950 p-4 rounded-2xl border border-indigo-500/20">
                          <label className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 block">Mural de Recados</label>
                          <textarea 
                            value={muralText}
                            onChange={e => setMuralText(e.target.value)}
                            placeholder="Escreva um recado ou lembrete para este aluno..."
                            className="w-full bg-zinc-900 border-none rounded-xl p-3 text-sm text-zinc-200 min-h-[80px] focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
                          />
                          <div className="flex justify-end mt-2">
                            <Button 
                              onClick={() => sendRecado(m.student_id)}
                              disabled={!muralText.trim()}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-4 rounded-xl text-[10px] font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                              <Send size={14} />
                              Enviar Recado
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Alunos em Hiato */}
          {mentees.some(m => !m.isActive) && (
            <div className="pt-8">
              <div className="flex items-center gap-3 mb-6">
                <PauseCircle className="text-zinc-500" size={20} />
                <h2 className="text-lg font-bold text-zinc-400 uppercase tracking-widest text-[11px]">Alunos em Hiato</h2>
                <div className="h-px flex-1 bg-zinc-800/50" />
                <span className="text-[10px] font-black text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  {mentees.filter(m => !m.isActive).length} EM PAUSA
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mentees.filter(m => !m.isActive).map(m => (
                  <Card key={m.id} className="p-5 bg-zinc-950 border-zinc-900 flex flex-col gap-4 opacity-70 hover:opacity-100 transition-all rounded-[2rem]">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 font-bold uppercase">
                          {m.displayName[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-400 text-sm">{m.displayName}</h3>
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => toggleMenteeStatus(m.id, m.isActive)} 
                          className="text-zinc-700 hover:text-emerald-500 transition-colors p-1.5"
                          title="Reativar Acompanhamento"
                        >
                          <PlayCircle size={18} />
                        </button>
                        <button 
                          onClick={() => removeMentee(m.id)} 
                          className="text-zinc-700 hover:text-rose-500 transition-colors p-1.5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Convites Pendentes */}
      {invitations.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="text-zinc-500" size={20} />
            <h2 className="text-lg font-bold text-white uppercase tracking-widest text-[11px]">Convites Pendentes</h2>
            <div className="h-px flex-1 bg-zinc-800/50" />
            <span className="text-[10px] font-black text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">{invitations.length} AGUARDANDO</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map(inv => (
              <Card key={inv.id} className="p-4 bg-zinc-950/50 border-zinc-800 flex items-center justify-between group hover:border-indigo-500/30 transition-all rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-300">{inv.email}</span>
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Enviado em {new Date(inv.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => revokeInvitation(inv.id)}
                  className="text-zinc-700 hover:text-rose-500 transition-colors p-2"
                  title="Revogar Convite"
                >
                  <XCircle size={18} />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
