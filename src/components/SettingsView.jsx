import { ShieldCheck, AlertTriangle, CloudUpload, CloudDownload } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useNotification } from '../context/NotificationContext';
import { pushAllLocalData, pullAllData } from '../utils/dataSync';

export default function SettingsView() {
  const { alert, confirm } = useNotification();

  const handleManualPush = async () => {
    const isConfirmed = await confirm("Isso enviará todos os seus dados locais para a nuvem, sobrescrevendo o que estiver lá. Continuar?");
    if (isConfirmed) {
      try {
        await pushAllLocalData();
        alert("Sincronização (Envio) concluída com sucesso!", "success");
      } catch (e) {
        alert("Falha ao enviar dados. Verifique sua conexão.", "error");
      }
    }
  };

  const handleManualPull = async () => {
    const isConfirmed = await confirm("Isso substituirá seus dados locais pelos dados salvos na nuvem. Continuar?");
    if (isConfirmed) {
      try {
        const pulled = await pullAllData();
        if (pulled) {
          alert("Dados recuperados com sucesso! Recarregando aplicação...", "success");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          alert("Nenhum dado encontrado na nuvem para este usuário.", "info");
        }
      } catch (e) {
        alert("Falha ao recuperar dados. Verifique sua conexão.", "error");
      }
    }
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-4 md:p-8 flex flex-col items-center">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">Configurações</h1>
        <p className="text-zinc-500 text-sm max-w-md">Gerencie sua privacidade, backups e sincronização manual.</p>
      </header>

      <div className="w-full max-w-4xl space-y-8">
        {/* Cloud Sync Status */}
        <Card className="p-8 bg-zinc-900 border-zinc-800 shadow-xl rounded-3xl">
          <h3 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-2">
            <CloudUpload className="text-indigo-500" size={24} /> 
            Sincronização na Nuvem
          </h3>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Seus dados são salvos localmente no navegador, mas você pode forçar uma sincronização manual com sua conta Supabase para garantir que tudo esteja atualizado em outros dispositivos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleManualPush} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2">
              <CloudUpload size={18} /> Forçar Envio para Nuvem
            </Button>
            <Button onClick={handleManualPull} variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center justify-center gap-2">
              <CloudDownload size={18} /> Recuperar Dados da Nuvem
            </Button>
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="p-8 bg-zinc-950 border-zinc-800 border-dashed flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-zinc-100 font-bold mb-1">Aviso Importante</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              O armazenamento principal é local no seu navegador. Se você limpar o cache ou trocar de dispositivo sem estar logado, seus dados não serão recuperados automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg shrink-0">
            <ShieldCheck size={16} className="text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Privacidade Total</span>
          </div>
        </Card>
      </div>
    </section>
  );
}
