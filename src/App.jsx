import TimerView from './components/TimerView';

function App() {
  return (
    <div className="flex justify-center h-screen w-full overflow-hidden text-slate-100 font-sans bg-zinc-950">
      <main className="flex-grow max-w-7xl overflow-y-auto">
        <TimerView />
      </main>
    </div>
  );
}

export default App;
