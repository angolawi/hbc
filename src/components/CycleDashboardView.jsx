import { useState, useEffect } from 'react';
import { Calendar, Check, Trash } from 'lucide-react';

export default function CycleDashboardView() {
    const [instances, setInstances] = useState([]);
    const [progress, setProgress] = useState({});
    const [activeBrush, setActiveBrush] = useState(1);

    useEffect(() => {
        const savedProgress = localStorage.getItem('simpl_grid_progress');
        if (savedProgress) {
            setProgress(JSON.parse(savedProgress));
        }

        const savedInstances = localStorage.getItem('simpl_cycle_instances');
        if (savedInstances) {
            setInstances(JSON.parse(savedInstances));
        } else {
            // Migration of old data
            const cicloData = localStorage.getItem('simpl_ciclo');
            let uniqueDiscs = [];
            if (cicloData) {
                const parsed = JSON.parse(cicloData);
                uniqueDiscs = [...new Set(parsed.map(b => b.nome))];
            }

            let hasOldProgress = false;
            if (savedProgress) {
                const p = JSON.parse(savedProgress);
                if (Object.keys(p).length > 0) hasOldProgress = true;
            }

            if (uniqueDiscs.length > 0 || hasOldProgress) {
                if (uniqueDiscs.length > 0 && !uniqueDiscs.includes("Revisão Noturna")) {
                    uniqueDiscs.push("Revisão Noturna", "Revisão Mensal");
                }

                // Definições de datas do migrado
                const newInst = {
                    id: Date.now().toString(),
                    startDate: new Date().toISOString(),
                    disciplines: uniqueDiscs
                };
                setInstances([newInst]);
                localStorage.setItem('simpl_cycle_instances', JSON.stringify([newInst]));
            }
        }
    }, []);

    const handleCreateInstance = () => {
        const cicloData = localStorage.getItem('simpl_ciclo');
        let uniqueDiscs = [];
        if (cicloData) {
            const parsed = JSON.parse(cicloData);
            uniqueDiscs = [...new Set(parsed.map(b => b.nome))];
        } else {
            alert("Você ainda não gerou um ciclo (sem disciplinas na fila). Gere um ciclo primeiro na aba 'Criar Ciclo'.");
            return;
        }

        if (!uniqueDiscs.includes("Revisão Noturna")) {
            uniqueDiscs.push("Revisão Noturna", "Revisão Mensal");
        }

        const newInst = {
            id: Date.now().toString(),
            startDate: new Date().toISOString(),
            disciplines: uniqueDiscs
        };

        const updated = [newInst, ...instances]; // Newest first
        setInstances(updated);
        localStorage.setItem('simpl_cycle_instances', JSON.stringify(updated));
    };

    const handleRemoveInstance = (id) => {
        if (window.confirm("Certeza que deseja remover esta instância visual do grid? Os dados registrados nas datas continuarão salvos no sistema.")) {
            const updated = instances.filter(i => i.id !== id);
            setInstances(updated);
            localStorage.setItem('simpl_cycle_instances', JSON.stringify(updated));
        }
    };

    const handleCellClick = (discName, dateStr) => {
        const key = `${discName}_${dateStr}`;
        const currentStatus = progress[key] || 0;

        let nextStatus;

        if (discName.includes("Revisão")) {
            nextStatus = currentStatus === 'X' ? 0 : 'X';
        } else {
            nextStatus = activeBrush;
            if (currentStatus === activeBrush) {
                nextStatus = 0; // Desmarcar se clicar na mesma cor
            }
        }

        const newProgress = { ...progress, [key]: nextStatus };
        if (nextStatus === 0) {
            delete newProgress[key];
        }

        setProgress(newProgress);
        localStorage.setItem('simpl_grid_progress', JSON.stringify(newProgress));
    };

    const getCellAppearance = (status, isWeekend) => {
        if (status === 1) return "bg-orange-500 border-orange-600";
        if (status === 2) return "bg-red-500 border-red-600";
        if (status === 3) return "bg-teal-600 border-teal-700";
        if (status === 4) return "bg-sky-500 border-sky-600";
        if (status === 5) return "bg-purple-500 border-purple-600";
        if (status === 6) return "bg-emerald-500 border-emerald-600";
        if (status === 7) return "bg-pink-500 border-pink-600";
        if (status === 8) return "bg-amber-400 border-amber-500";

        // Vazio ou X
        if (isWeekend) return "bg-zinc-800/40 border-zinc-700 hover:bg-zinc-700/50";
        return "bg-zinc-900 border-zinc-800 hover:bg-zinc-800";
    };

    const formatDateLabel = (d) => {
        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day}-${month}`;
    };

    const getDatesForInstance = (startISO) => {
        const dateArray = [];
        const base = new Date(startISO);
        base.setHours(12, 0, 0, 0); // avoid strict timezone shifts
        for (let i = 0; i < 30; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            dateArray.push(d);
        }
        return dateArray;
    };

    const isButtonVisible = () => {
        if (instances.length === 0) return true;
        const latest = instances[0];
        const dates = getDatesForInstance(latest.startDate);
        const dateStrings = dates.map(d => d.toISOString().split('T')[0]);

        return latest.disciplines.every(disc => {
            return dateStrings.some(dStr => {
                const key = `${disc}_${dStr}`;
                return progress[key] && progress[key] !== 0;
            });
        });
    };

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full flex flex-col relative pb-32">
            <header className="mb-6 p-6 bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                        <Calendar className="text-rose-500" />
                        Controle
                    </h1>
                    <p className="text-zinc-400 text-sm font-medium mt-1">Crie instâncias fixas de 30 dias com base na sua fila de disciplinas atual.</p>
                </div>
                {isButtonVisible() && (
                    <button
                        onClick={handleCreateInstance}
                        className="bg-rose-600 hover:bg-rose-500 flex items-center gap-2 text-white font-bold py-2.5 px-5 rounded-xl shrink-0 shadow-lg shadow-rose-900/20 text-sm mt-2 md:mt-0 tracking-wide transition-all"
                    >
                        <Calendar size={18} /> Nova Instância (Hoje)
                    </button>
                )}
            </header>

            {/* Instâncias */}
            <div className="flex-1 flex flex-col gap-12">
                {instances.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 bg-zinc-950/50 rounded-2xl border border-zinc-800 border-dashed max-w-2xl mx-auto w-full mt-8">
                        <Calendar className="mx-auto text-zinc-700 w-16 h-16 mb-4" />
                        <h3 className="text-lg font-bold text-zinc-300 mb-2">Nenhum Grid Criado</h3>
                        <p className="text-zinc-500 text-sm">
                            Para visualizar seu quadro de acompanhamento, você precisa fotografar seu ciclo atual criando uma instância.
                        </p>
                    </div>
                ) : (
                    instances.map((inst, idx) => {
                        const dates = getDatesForInstance(inst.startDate);

                        return (
                            <div key={inst.id} className="bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden flex flex-col shadow-2xl relative w-full">

                                <div className="p-3 bg-zinc-900 flex items-center justify-between border-b border-zinc-800">
                                    <h2 className="text-sm font-bold text-zinc-200 ml-2">
                                        <span className="text-rose-400 font-black mr-2">#{instances.length - idx}</span>
                                        Instância 30D
                                        <span className="text-zinc-500 ml-2 font-normal text-xs">
                                            ({new Date(inst.startDate).toLocaleDateString('pt-BR')})
                                        </span>
                                    </h2>
                                    <button onClick={() => handleRemoveInstance(inst.id)} className="text-zinc-600 hover:text-rose-400 p-1 mr-1 transition-colors" title="Remover Grid Visual">
                                        <Trash size={16} />
                                    </button>
                                </div>

                                <div className="overflow-x-auto overflow-y-auto w-full max-h-[60vh] custom-scrollbar pb-4">
                                    <table className="w-auto border-collapse text-left min-w-max table-fixed">
                                        <thead className="sticky top-0 z-20">
                                            {/* Linha 1: Titulo Geral */}
                                            <tr>
                                                <th className="sticky left-0 z-30 bg-zinc-900 border-b border-r border-zinc-800 p-3 w-[250px] min-w-[250px] max-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                                                    <span className="text-sm font-bold text-zinc-100">Matérias</span>
                                                </th>
                                                <th colSpan={dates.length} className="bg-zinc-900 border-b border-zinc-800 p-2 text-center text-sm font-bold text-zinc-400 font-mono tracking-widest">
                                                    {dates[0].toLocaleDateString('pt-BR')} <span className="text-zinc-600 mx-2">➔</span> {dates[dates.length - 1].toLocaleDateString('pt-BR')}
                                                </th>
                                            </tr>
                                            {/* Linha 2: Datas */}
                                            <tr>
                                                <th className="sticky left-0 z-30 bg-zinc-950 border-b border-r border-zinc-800 p-2 w-[250px] min-w-[250px] max-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                                                </th>
                                                {dates.map((d, dIdx) => {
                                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                                    return (
                                                        <th key={dIdx} className={`p-0 w-6 min-w-[24px] max-w-[24px] text-center border-b border-r border-zinc-800 text-[10px] uppercase font-bold tracking-wider ${isWeekend ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-950 text-zinc-400'}`}>
                                                            <div className="-rotate-90 whitespace-nowrap h-16 flex items-center justify-center">
                                                                {formatDateLabel(d)}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {inst.disciplines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={dates.length + 1} className="p-8 text-center text-zinc-500">
                                                        Nenhuma disciplina encontrada pra esta instância.
                                                    </td>
                                                </tr>
                                            ) : (
                                                inst.disciplines.map((disc, rIdx) => {
                                                    const isRevisao = disc.includes("Revisão");
                                                    return (
                                                        <tr key={rIdx} className="group">
                                                            <td className={`sticky left-0 z-10 border-b border-r border-zinc-800 py-1 px-2 text-[11px] font-semibold w-[250px] min-w-[250px] max-w-[250px] overflow-hidden shadow-[2px_0_5px_rgba(0,0,0,0.5)] ${isRevisao ? 'bg-indigo-950/40 text-indigo-300' : 'bg-zinc-900 text-zinc-300 group-hover:bg-zinc-800'}`}>
                                                                <div className="truncate w-full" title={disc}>{disc}</div>
                                                            </td>
                                                            {dates.map((d, cIdx) => {
                                                                const dateStr = d.toISOString().split('T')[0];
                                                                const key = `${disc}_${dateStr}`;
                                                                const status = progress[key] || 0;
                                                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                                                                return (
                                                                    <td
                                                                        key={cIdx}
                                                                        onClick={() => handleCellClick(disc, dateStr)}
                                                                        className={`p-0 border-b border-r border-zinc-800/50 cursor-pointer transition-colors w-6 h-6 min-w-[24px] max-w-[24px] text-center align-middle hover:brightness-125 ${getCellAppearance(status, isWeekend)}`}
                                                                    >
                                                                        {status === 'X' && <span className="text-zinc-500 font-bold text-xs select-none">X</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Floating Brush Selector */}
            {instances.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 p-3 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 text-xs flex flex-wrap gap-4 items-center justify-center z-50 rounded-2xl shadow-2xl">
                    <span className="text-zinc-400 font-bold mr-2 hidden md:block">Seletor de Cor:</span>

                    {[
                        { id: 1, color: "bg-orange-500", ring: "ring-orange-500" },
                        { id: 2, color: "bg-red-500", ring: "ring-red-500" },
                        { id: 3, color: "bg-teal-600", ring: "ring-teal-600" },
                        { id: 4, color: "bg-sky-500", ring: "ring-sky-500" },
                        { id: 5, color: "bg-purple-500", ring: "ring-purple-500" },
                        { id: 6, color: "bg-emerald-500", ring: "ring-emerald-500" },
                        { id: 7, color: "bg-pink-500", ring: "ring-pink-500" },
                        { id: 8, color: "bg-amber-400", ring: "ring-amber-400" }
                    ].map(brush => (
                        <button
                            key={brush.id}
                            onClick={() => setActiveBrush(brush.id)}
                            className={`w-6 h-6 rounded-full transition-all outline-none ${brush.color} cursor-pointer hover:shadow-lg ${activeBrush === brush.id ? `ring-4 ring-offset-2 ring-offset-zinc-900 ${brush.ring} scale-110 shadow-lg` : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                            title={`Selecionar Cor ${brush.id}`}
                        />
                    ))}

                    <div className="hidden md:flex items-center gap-1.5 ml-4 text-zinc-400 border-l border-zinc-700/50 pl-4 font-medium">
                        <div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded-sm"></div> Clique p/ Apagar
                    </div>
                </div>
            )}
        </section>
    );
}
