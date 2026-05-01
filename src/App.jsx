import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import HomeDashboardView from './components/HomeDashboardView';
import TimerView from './components/TimerView';
import EditalView from './components/EditalView';
import WeeklyStatsView from './components/WeeklyStatsView';
import CycleView from './components/CycleView';
import ActiveCycleView from './components/ActiveCycleView';
import CycleDashboardView from './components/CycleDashboardView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';
import MentorView from './components/MentorView';
import MentorPerformanceView from './components/MentorPerformanceView';
import MentorTemplatesView from './components/MentorTemplatesView';
import { LogOut, LayoutDashboard, Timer, BrainCircuit, BarChart3, ListChecks, Settings, Menu, X, Loader2, Cloud, CloudOff, ShieldCheck, ChevronLeft, TrendingUp, Layers } from 'lucide-react';

function SyncStatus() {
  const [status, setStatus] = useState('idle'); // idle, syncing, success, error

  useEffect(() => {
    const handleStatus = (e) => {
      const { status } = e.detail;
      if (status === 'start') setStatus('syncing');
      if (status === 'success') {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      }
      if (status === 'error') {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    };

    window.addEventListener('sync-status', handleStatus);
    return () => window.removeEventListener('sync-status', handleStatus);
  }, []);

  if (status === 'idle') return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${
      status === 'syncing' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
      status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
      'bg-rose-500/10 border-rose-500/20 text-rose-400'
    }`}>
      {status === 'syncing' ? <Loader2 size={16} className="animate-spin" /> : 
       status === 'success' ? <Cloud size={16} /> : <CloudOff size={16} />}
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
        {status === 'syncing' ? 'Sincronizando...' : 
         status === 'success' ? 'Nuvem Atualizada' : 'Erro na Nuvem'}
      </span>
    </div>
  );
}

function App() {
  const { user, loading, logout, isMentor, profile, selectedMentee, setSelectedMentee } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Mover Hooks para ANTES dos retornos condicionais
  useEffect(() => {
    if (isMentor && !selectedMentee && activeTab === 'home') {
      setActiveTab('mentor_stats');
    }
    if (isMentor && selectedMentee && (activeTab === 'mentor' || activeTab === 'mentor_stats')) {
      setActiveTab('home');
    }
  }, [isMentor, selectedMentee, activeTab]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-indigo-500 animate-spin" size={48} />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando Protocolo...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const navigateBackToMentor = () => {
    setSelectedMentee(null);
    setActiveTab('mentor');
  };

  const sidebarItems = [
    { id: 'mentor_stats', label: 'Análise Global', icon: TrendingUp, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/5', hidden: !isMentor || !!selectedMentee },
    { id: 'mentor', label: 'Gestão de Alunos', icon: ShieldCheck, color: 'border-white text-white bg-white/5', hidden: !isMentor || !!selectedMentee },
    { id: 'mentor_templates', label: 'Biblioteca', icon: Layers, color: 'border-indigo-500 text-indigo-400 bg-indigo-500/5', hidden: !isMentor || !!selectedMentee },
    { id: 'home', label: 'Início', icon: LayoutDashboard, color: 'border-sky-500 text-sky-400 bg-sky-500/5', hidden: isMentor && !selectedMentee },
    { id: 'timer', label: 'Cronômetro', icon: Timer, color: 'border-indigo-500 text-indigo-400 bg-indigo-500/5', hidden: isMentor && !selectedMentee },
    { id: 'ciclo', label: selectedMentee ? 'Planejar Ciclo' : 'Meu Ciclo', icon: BrainCircuit, color: 'border-amber-500 text-amber-400 bg-amber-500/5', hidden: isMentor && !selectedMentee, altId: 'create_cycle' },
    { id: 'cycledashboard', label: selectedMentee ? 'Controle Aluno' : 'Meu Controle', icon: ListChecks, color: 'border-rose-500 text-rose-400 bg-rose-500/5', hidden: isMentor && !selectedMentee },
    { id: 'edital', label: selectedMentee ? 'Configurar Edital' : (isMentor ? 'Cadastrar Editais' : 'Meu Edital'), icon: ListChecks, color: 'border-indigo-500 text-indigo-400 bg-indigo-500/5' },
    { id: 'stats', label: 'Desempenho', icon: BarChart3, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/5', hidden: isMentor && !selectedMentee },
    { id: 'settings', label: 'Ajustes', icon: Settings, color: 'border-zinc-400 text-zinc-100 bg-zinc-800/10' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-100 font-sans bg-zinc-950">

      {/* Sidebar Navigation */}
      <nav className={`flex flex-col border-r border-zinc-800 bg-zinc-950/80 backdrop-blur-md shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0 opacity-0'}`}>
        <div className="p-6 w-64 flex flex-col h-full">
          <div className="flex justify-between items-center mb-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">Protocolo</span>
              <h1 className="text-2xl font-extrabold tracking-tighter text-white">Estudos {isMentor && <span className="text-indigo-400 ml-1 text-xs font-black uppercase">Mentor</span>}</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-500 hover:text-white lg:hidden">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex flex-col gap-1 flex-1">
            {sidebarItems.filter(item => !item.hidden).map((item) => {
              const isActive = activeTab === item.id || (item.altId && activeTab === item.altId);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 text-left text-[10px] font-black tracking-widest uppercase transition-all px-4 py-3.5 rounded-xl border-l-[3px] ${isActive ? item.color : 'border-transparent text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'}`}
                >
                  <item.icon size={16} strokeWidth={isActive ? 3 : 2} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="pt-6 border-t border-zinc-800/50 mt-6">
            <div className="px-4 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase">
                {(profile?.first_name?.[0] || user.email?.[0] || 'U')}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-zinc-300 truncate">
                    {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : user.email?.split('@')[0]}
                </span>
                <span className="text-[8px] font-bold text-zinc-600 uppercase">
                  {isMentor ? 'Account Master' : 'Premium Member'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 text-left text-[10px] font-black tracking-widest uppercase transition-all px-4 py-3.5 rounded-xl text-rose-500 hover:bg-rose-500/10"
            >
              <LogOut size={16} />
              Sair da Conta
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto flex flex-col relative w-full">
        {/* Impersonation Banner */}
        {selectedMentee && (
          <div className="bg-indigo-600 text-white p-2 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-full duration-500 z-50">
            <ShieldCheck size={14} />
            <span>Monitorando: {selectedMentee.displayName || selectedMentee.email}</span>
            <button 
              onClick={navigateBackToMentor}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={12} />
              Sair da Visão Aluno
            </button>
          </div>
        )}

        {/* Mobile / Toggle Header */}
        <div className="flex items-center gap-4 px-4 py-3 lg:px-6 lg:py-4 sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-sm uppercase tracking-widest text-zinc-400">
            {activeTab === 'home' && 'Dashboard Inicial'}
            {activeTab === 'timer' && 'Cronômetro de Estudos'}
            {activeTab === 'ciclo' && 'Meu Ciclo de Estudos'}
            {activeTab === 'create_cycle' && 'Criador de Ciclos'}
            {activeTab === 'cycledashboard' && 'Visão de 30 Dias'}
            {activeTab === 'edital' && 'Edital Verticalizado'}
            {activeTab === 'stats' && 'Desempenho Geral'}
            {activeTab === 'settings' && 'Configurações'}
            {activeTab === 'mentor' && 'Gestão de Alunos'}
          </span>
        </div>

        <div className="max-w-7xl mx-auto h-full w-full p-4 lg:p-10 pt-6">
          {activeTab === 'home' && <HomeDashboardView />}
          {activeTab === 'timer' && <TimerView />}
          {activeTab === 'ciclo' && (selectedMentee ? <CycleView setActiveTab={setActiveTab} /> : <ActiveCycleView setActiveTab={setActiveTab} />)}
          {activeTab === 'create_cycle' && <CycleView setActiveTab={setActiveTab} />}
          {activeTab === 'cycledashboard' && <CycleDashboardView />}
          {activeTab === 'edital' && <EditalView />}
          {activeTab === 'stats' && <WeeklyStatsView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'mentor' && <MentorView />}
          {activeTab === 'mentor_stats' && <MentorPerformanceView />}
          {activeTab === 'mentor_templates' && <MentorTemplatesView setActiveTab={setActiveTab} />}
        </div>
      </main>
      <SyncStatus />
    </div>
  );
}

export default App;
