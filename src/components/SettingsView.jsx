import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CloudUpload, CloudDownload, Clock, CheckCircle2, XCircle, User, Fingerprint } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { pushAllLocalData, pullAllData, getSyncHistory } from '../utils/dataSync';
import { supabase } from '../utils/supabase';
export default function SettingsView() {
  const { alert, confirm } = useNotification();
  const { user, isMentor, setIsMentor, refreshProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [targetContest, setTargetContest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setTargetContest(data.target_contest || '');
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      first_name: firstName,
      last_name: lastName,
      target_contest: targetContest
    }).eq('id', user.id);
    
    if (!error) await refreshProfile();
    
    setSaving(false);
    if (error) alert("Erro ao atualizar perfil.", "error");
    else alert("Perfil atualizado com sucesso!", "success");
  };

  useEffect(() => {
    setHistory(getSyncHistory());
    
    const handleUpdate = () => setHistory(getSyncHistory());
    window.addEventListener('sync-history-updated', handleUpdate);
    return () => window.removeEventListener('sync-history-updated', handleUpdate);
  }, []);

  const copyId = () => {
    navigator.clipboard.writeText(user.id);
    alert("ID copiado para a área de transferência!", "success");
  };

  const handleManualPush = async () => {
    const isConfirmed = await confirm("Isso sincronizará seus dados locais com a nuvem agora. Continuar?");
    if (isConfirmed) {
      try {
        await pushAllLocalData();
        alert("Sincronização forçada concluída!", "success");
      } catch (e) {
        alert("Erro na sincronização forçada.", "error");
      }
    }
  };

  const handleManualPull = async () => {
    const isConfirmed = await confirm("Isso substituirá dados locais se houver versões mais novas na nuvem. Continuar?");
    if (isConfirmed) {
      try {
        await pullAllData();
        alert("Sincronização e recuperação concluídas!", "success");
        setTimeout(() => window.location.reload(), 1000); 
      } catch (e) {
        alert("Erro ao recuperar dados.", "error");
      }
    }
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-4 md:p-8 flex flex-col items-center">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">Configurações</h1>
        <p className="text-zinc-500 text-sm max-w-md">Gerencie sua privacidade, backups e sincronização inteligente.</p>
      </header>

      <div className="w-full max-w-4xl space-y-8">
        {/* Personal Profile Data */}
        <Card className="p-8 bg-zinc-900 border-zinc-800 shadow-xl rounded-3xl">
          <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <Fingerprint className="text-indigo-500" size={24} /> 
            Dados de Identificação
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nome</label>
                <Input placeholder="Ex: Willian" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sobrenome</label>
                <Input placeholder="Ex: Silva" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            
             {!isMentor && (
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Concurso Alvo (Foco Atual)</label>
                 <Input placeholder="Ex: Receita Federal, PF, etc." value={targetContest} onChange={(e) => setTargetContest(e.target.value)} />
               </div>
             )}

            <Button 
                onClick={handleUpdateProfile} 
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white w-full sm:w-auto"
                disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações de Perfil'}
            </Button>
          </div>
        </Card>

        {/* Account Info and Mentor Mode */}
        <Card className="p-8 bg-zinc-900 border-zinc-800 shadow-xl rounded-3xl">
          <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <User className="text-indigo-500" size={24} /> 
            Perfil & Gestão
          </h3>
          
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 gap-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Seu ID de Usuário</h4>
                <code className="text-xs text-indigo-400 font-mono">{user.id}</code>
              </div>
              <Button onClick={copyId} variant="outline" className="h-10 text-[10px] uppercase font-black tracking-widest">
                Copiar ID
              </Button>
            </div>

            <div className="flex items-center justify-between p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800">
              <div className="flex-1">
                <h4 className="text-zinc-100 font-bold mb-1">
                  Perfil de Usuário: <span className="text-indigo-400 capitalize">{isMentor ? 'Mentor' : 'Aluno'}</span>
                </h4>
                <p className="text-zinc-500 text-[10px] leading-relaxed max-w-sm">
                  {isMentor 
                    ? 'Você possui permissões de gestão e acesso ao dashboard de análise global.' 
                    : 'Você está utilizando a versão de estudante do HBC estudos.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Cloud Sync Status */}
        <Card className="p-8 bg-zinc-900 border-zinc-800 shadow-xl rounded-3xl">
          <h3 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
            <CloudUpload className="text-indigo-500" size={24} /> 
            Smart Sync (Nuvem)
          </h3>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Seus dados são sincronizados automaticamente em segundo plano. O sistema mescla dados do dispositivo e da nuvem priorizando a versão mais recente.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleManualPush} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2">
              <CloudUpload size={18} /> Sincronizar Agora
            </Button>
            <Button onClick={handleManualPull} variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center justify-center gap-2">
              <CloudDownload size={18} /> Forçar Recuperação
            </Button>
          </div>
        </Card>

        {/* Sync History */}
        <Card className="p-8 bg-zinc-900 border-zinc-800 shadow-xl rounded-3xl">
          <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <Clock className="text-amber-500" size={24} /> 
            Histórico de Sincronização
          </h3>
          
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-zinc-600 text-sm italic text-center py-4">Nenhum evento registrado ainda.</p>
            ) : (
              history.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                  <div className="flex items-center gap-4">
                    {event.status === 'success' ? (
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                    ) : (
                      <XCircle className="text-rose-500 shrink-0" size={18} />
                    )}
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">{event.type}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{event.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-600 block leading-none">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-tighter">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="p-8 bg-zinc-950 border-zinc-800 border-dashed flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-zinc-100 font-bold mb-1 text-sm">Privacidade & Armazenamento</h4>
            <p className="text-zinc-500 text-[10px] leading-relaxed">
              O armazenamento principal é local no seu navegador para garantir velocidade offline. A nuvem atua como um espelho de segurança e ponte entre seus dispositivos.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg shrink-0">
            <ShieldCheck size={16} className="text-indigo-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Totalmente Criptografado</span>
          </div>
        </Card>
      </div>
    </section>
  );
}
