import { useState } from 'react';
import { Download, Upload, ShieldCheck, Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { exportData, importData } from '../utils/backupUtils';
import { useNotification } from '../context/NotificationContext';

export default function SettingsView() {
  const { alert, confirm } = useNotification();
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    try {
      exportData();
      alert("Seus dados foram exportados com sucesso! Guarde este arquivo em um local seguro.", "success");
    } catch (err) {
      alert("Erro ao exportar dados.", "error");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmed = await confirm(
      "Isso irá sobrescrever todos os seus dados atuais. Tem certeza que deseja continuar?",
      { variant: 'danger', title: 'Confirmar Importação' }
    );

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      await importData(file);
      alert("Dados importados com sucesso! Recarregando aplicação...", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      alert("Erro ao importar o arquivo. Verifique se o formato está correto.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-4 md:p-8 flex flex-col items-center">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">Configurações</h1>
        <p className="text-zinc-500 text-sm max-w-md">Gerencie sua privacidade, backups e sincronização manual.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="p-8 bg-zinc-900/50 border-zinc-800 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={80} className="text-indigo-400" />
          </div>
          
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Download size={20} className="text-indigo-400" />
              Backup de Dados
            </h3>
            <p className="text-zinc-500 text-sm">Exporte todo o seu progresso, edital e histórico para um arquivo JSON.</p>
          </div>

          <div className="mt-auto">
            <Button fullWidth onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-12">
              Exportar Agora
            </Button>
          </div>
        </Card>

        <Card className="p-8 bg-zinc-900/50 border-zinc-800 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <RefreshCw size={80} className="text-emerald-400" />
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Upload size={20} className="text-emerald-400" />
              Restaurar Dados
            </h3>
            <p className="text-zinc-500 text-sm">Importe um arquivo de backup para sincronizar entre dispositivos ou recuperar dados.</p>
          </div>

          <div className="mt-auto relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              disabled={isImporting}
            />
            <Button
              fullWidth
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-12"
              disabled={isImporting}
            >
              {isImporting ? 'Importando...' : 'Selecionar Arquivo'}
            </Button>
          </div>
        </Card>

        <Card className="md:col-span-2 p-8 bg-zinc-950 border-zinc-800 border-dashed flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-zinc-100 font-bold mb-1">Aviso Importante</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Como o armazenamento é local, se você limpar o cache do navegador ou trocar de dispositivo sem fazer o backup, seus dados serão perdidos. Recomendamos exportar seus dados semanalmente.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
            <ShieldCheck size={16} className="text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Privacidade Total</span>
          </div>
        </Card>
      </div>
    </section>
  );
}
