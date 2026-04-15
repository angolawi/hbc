import { useState } from 'react';
import TimerView from './components/TimerView';
import EditalView from './components/EditalView';
import WeeklyStatsView from './components/WeeklyStatsView';

function App() {
  const [activeTab, setActiveTab] = useState('timer');

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden text-slate-100 font-sans bg-zinc-950">
      
      {/* Top Navigation Bar */}
      <nav className="flex justify-center border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex gap-8 px-6 py-4">
          <button 
            onClick={() => setActiveTab('timer')}
            className={`text-sm font-bold tracking-wider uppercase transition-colors px-2 py-1 border-b-2 ${activeTab === 'timer' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Cronômetro
          </button>
          <button 
            onClick={() => setActiveTab('edital')}
            className={`text-sm font-bold tracking-wider uppercase transition-colors px-2 py-1 border-b-2 ${activeTab === 'edital' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Meu Edital
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`text-sm font-bold tracking-wider uppercase transition-colors px-2 py-1 border-b-2 ${activeTab === 'stats' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Desempenho Geral
          </button>
        </div>
      </nav>

      <main className="flex-grow w-full overflow-y-auto">
        <div className="max-w-7xl mx-auto h-full">
          {activeTab === 'timer' && <TimerView />}
          {activeTab === 'edital' && <EditalView />}
          {activeTab === 'stats' && <WeeklyStatsView />}
        </div>
      </main>
    </div>
  );
}

export default App;
