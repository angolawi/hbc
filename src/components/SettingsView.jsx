import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card } from './ui/Card';
import { useNotification } from '../context/NotificationContext';

export default function SettingsView() {
  const { alert } = useNotification();

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 p-4 md:p-8 flex flex-col items-center">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">Configurações</h1>
        <p className="text-zinc-500 text-sm max-w-md">Gerencie sua privacidade, backups e sincronização manual.</p>
      </header>

      <div className="w-full max-w-4xl">
        <Card className="p-8 bg-zinc-950 border-zinc-800 border-dashed flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-zinc-100 font-bold mb-1">Aviso Importante</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Como o armazenamento principal é local, se você limpar o cache do navegador ou trocar de dispositivo, seus dados poderão ser afetados. Certifique-se de estar logado para garantir a sincronização com a nuvem.
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
