import { useState } from 'react';
import TimerView from './components/TimerView';
import EditalView from './components/EditalView';
import WeeklyStatsView from './components/WeeklyStatsView';
import CycleView from './components/CycleView';
import CycleDashboardView from './components/CycleDashboardView';

function App() {
  const [activeTab, setActiveTab] = useState('timer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-100 font-sans bg-zinc-950">
      
      {/* Sidebar Navigation */}
      <nav className={`flex flex-col border-r border-zinc-800 bg-zinc-950/80 backdrop-blur-md shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0 opacity-0'}`}>
        <div className="p-6 w-64">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-xl font-bold tracking-widest uppercase text-white">
              Estudos
            </h1>
            <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-500 hover:text-white lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('timer')}
              className={`text-left text-sm font-bold tracking-wider uppercase transition-all px-4 py-3 rounded-lg border-l-4 ${activeTab === 'timer' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              Cronômetro
            </button>
            <button 
              onClick={() => setActiveTab('ciclo')}
              className={`text-left text-sm font-bold tracking-wider uppercase transition-all px-4 py-3 rounded-lg border-l-4 ${activeTab === 'ciclo' ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              Criar Ciclo
            </button>
            <button 
              onClick={() => setActiveTab('cycledashboard')}
              className={`text-left text-sm font-bold tracking-wider uppercase transition-all px-4 py-3 rounded-lg border-l-4 ${activeTab === 'cycledashboard' ? 'border-rose-500 text-rose-400 bg-rose-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              Visão 30D
            </button>
            <button 
              onClick={() => setActiveTab('edital')}
              className={`text-left text-sm font-bold tracking-wider uppercase transition-all px-4 py-3 rounded-lg border-l-4 ${activeTab === 'edital' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              Meu Edital
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`text-left text-sm font-bold tracking-wider uppercase transition-all px-4 py-3 rounded-lg border-l-4 ${activeTab === 'stats' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              Desempenho Geral
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto flex flex-col relative w-full">
        {/* Mobile / Toggle Header */}
        <div className="flex items-center gap-4 px-4 py-3 lg:px-6 lg:py-4 sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
          <span className="font-semibold text-lg text-zinc-100">
            {activeTab === 'timer' && 'Cronômetro de Estudos'}
            {activeTab === 'ciclo' && 'Criação de Ciclos'}
            {activeTab === 'cycledashboard' && 'Visão de 30 Dias'}
            {activeTab === 'edital' && 'Edital Verticalizado'}
            {activeTab === 'stats' && 'Desempenho Geral'}
          </span>
        </div>

        <div className="max-w-7xl mx-auto h-full w-full p-4 lg:p-6 pt-6">
          {activeTab === 'timer' && <TimerView />}
          {activeTab === 'ciclo' && <CycleView />}
          {activeTab === 'cycledashboard' && <CycleDashboardView />}
          {activeTab === 'edital' && <EditalView />}
          {activeTab === 'stats' && <WeeklyStatsView />}
        </div>
      </main>
    </div>
  );
}

export default App;
