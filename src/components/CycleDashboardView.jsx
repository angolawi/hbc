import { useState, useEffect } from 'react';
import { Calendar, Trash, Loader2, ShieldCheck, Lock, Eye } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { pushData, pullAllData, pushAllLocalData } from '../utils/dataSync';

export default function CycleDashboardView() {
    const { alert, confirm } = useNotification();
    const { user, isMentor, selectedMentee } = useAuth();

    // Mentor com aluno selecionado = modo leitura + criação de instâncias
    // Aluno (sem selectedMentee) = modo edição (marca células)
    const isReadOnly = isMentor && !!selectedMentee;

    const [loading, setLoading] = useState(!!selectedMentee);
    const [instances, setInstances] = useState([]);
    const [progress, setProgress] = useState({});
    const [activeBrush, setActiveBrush] = useState(1);
    const [lockedColor, setLockedColor] = useState(null);

    // Carrega dados corretos: do aluno via Supabase (mentor) ou localStorage (aluno)
    useEffect(() => {
        const loadData = async () => {
            if (selectedMentee) {
                setLoading(true);
                try {
                    const cloudData = await pullAllData(user, selectedMentee.id);
                    const inst = cloudData?.find(i => i.key === 'simpl_cycle_instances')?.data || [];
                    const prog = cloudData?.find(i => i.key === 'simpl_grid_progress')?.data || {};
                    setInstances(inst);
                    setProgress(prog);
                } catch (e) {
                    console.error("Erro ao carregar controle do aluno:", e);
                } finally {
                    setLoading(false);
                }
            } else {
                // Modo aluno — carrega do localStorage e sincroniza
                const savedInst = localStorage.getItem('simpl_cycle_instances');
                const savedProg = localStorage.getItem('simpl_grid_progress');
                const inst = savedInst ? JSON.parse(savedInst) : [];
                const prog = savedProg ? JSON.parse(savedProg) : {};
                setInstances(inst);
                setProgress(prog);

                // Migração de dados antigos (ciclo sem instâncias)
                if (inst.length === 0) {
                    const cicloRaw = localStorage.getItem('simpl_ciclo');
                    let uniqueDiscs = [];
                    if (cicloRaw) {
                        const parsed = JSON.parse(cicloRaw);
                        const blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
                        uniqueDiscs = [...new Set(blocks.map(b => b.nome))];
                    }
                    if (uniqueDiscs.length > 0 || (prog && Object.keys(prog).length > 0)) {
                        if (uniqueDiscs.length > 0 && !uniqueDiscs.includes("Revisão Noturna")) {
                            uniqueDiscs.push("Revisão Noturna", "Revisão Mensal");
                        }
                        const newInst = {
                            id: Date.now().toString(),
                            startDate: new Date().toISOString(),
                            disciplines: uniqueDiscs
                        };
                        const migrated = [newInst];
                        setInstances(migrated);
                        localStorage.setItem('simpl_cycle_instances', JSON.stringify(migrated));
                        await pushAllLocalData(user);
                    }
                }
            }
        };
        loadData();
    }, [selectedMentee, user]);

    // Persiste instâncias na conta do aluno (mentor) ou localmente (aluno)
    const persistInstances = async (updated) => {
        setInstances(updated);
        if (selectedMentee) {
            await pushData('simpl_cycle_instances', updated, user, selectedMentee.id);
        } else {
            localStorage.setItem('simpl_cycle_instances', JSON.stringify(updated));
            await pushData('simpl_cycle_instances', updated, user);
        }
    };

    // Persiste progresso — só chamado no modo aluno
    const persistProgress = async (newProgress) => {
        setProgress(newProgress);
        localStorage.setItem('simpl_grid_progress', JSON.stringify(newProgress));
        await pushData('simpl_grid_progress', newProgress, user);
    };

    // Lógica de Travamento de Cor por Iteração
    useEffect(() => {
        if (instances.length > 0 && !isReadOnly) {
            const currentInst = instances[0];
            const subjects = currentInst.disciplines;
            if (subjects.length === 0) return;

            const lastSubject = subjects[subjects.length - 1];
            
            // Procura qualquer marcação de cor (que não seja Revisão 'X') nas disciplinas deste grid ESPECÍFICO
            const currentMarkings = Object.entries(progress).filter(([key, val]) => {
                const [id, discName] = key.split('_');
                return id === currentInst.id && subjects.includes(discName) && val !== 0 && val !== 'X';
            });

            if (currentMarkings.length > 0) {
                // Verifica se a última matéria já foi marcada na instância atual
                const isFinished = currentMarkings.some(([key]) => {
                    const parts = key.split('_');
                    return parts[1] === lastSubject;
                });
                
                if (!isFinished) {
                    // Lock na cor da primeira marcação encontrada
                    const colorFound = currentMarkings[0][1];
                    setLockedColor(colorFound);
                    setActiveBrush(colorFound);
                } else {
                    setLockedColor(null);
                }
            } else {
                setLockedColor(null);
            }
        }
    }, [progress, instances, isReadOnly]);

    // MENTOR: cria nova instância com as disciplinas do ciclo atual do aluno
    const handleCreateInstance = async () => {
        let uniqueDiscs = [];

        if (selectedMentee) {
            const cloudData = await pullAllData(user, selectedMentee.id);
            const cicloData = cloudData?.find(i => i.key === 'simpl_ciclo')?.data;
            if (!cicloData) {
                alert("Este aluno ainda não tem um ciclo gerado. Crie um ciclo para ele primeiro.", "error");
                return;
            }
            const blocks = Array.isArray(cicloData) ? cicloData : (cicloData.blocks || []);
            uniqueDiscs = [...new Set(blocks.map(b => b.nome))];
        } else {
            // Aluno normal não deve chegar aqui (botão oculto), mas como fallback:
            const cicloRaw = localStorage.getItem('simpl_ciclo');
            if (!cicloRaw) {
                alert("Gere um ciclo primeiro na aba 'Criar Ciclo'.", "error");
                return;
            }
            const parsed = JSON.parse(cicloRaw);
            const blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
            uniqueDiscs = [...new Set(blocks.map(b => b.nome))];
        }

        if (!uniqueDiscs.includes("Revisão Noturna")) {
            uniqueDiscs.push("Revisão Noturna", "Revisão Mensal");
        }

        const newInst = {
            id: Date.now().toString(),
            startDate: new Date().toISOString(),
            disciplines: uniqueDiscs
        };

        await persistInstances([newInst, ...instances]);
        alert(`Controle criado com ${uniqueDiscs.length} disciplinas. O aluno já pode começar a marcar o progresso.`, "success");
    };

    // MENTOR: remove instância do grid do aluno
    const handleRemoveInstance = async (id) => {
        const confirmed = await confirm("Remover esta instância do grid do aluno? Os dados de progresso continuarão no sistema.", { variant: 'danger' });
        if (confirmed) {
            await persistInstances(instances.filter(i => i.id !== id));
        }
    };

    // ALUNO: marca/desmarca célula (somente quando não é read-only)
    const handleCellClick = async (instId, discName, dateStr) => {
        if (isReadOnly) return; // Mentor não edita células
 
        const key = `${instId}_${discName}_${dateStr}`;
        const currentStatus = progress[key] || 0;

        let nextStatus;
        if (discName.includes("Revisão")) {
            nextStatus = currentStatus === 'X' ? 0 : 'X';
        } else {
            nextStatus = activeBrush;
            if (currentStatus === activeBrush) nextStatus = 0;
        }

        const newProgress = { ...progress, [key]: nextStatus };
        if (nextStatus === 0) delete newProgress[key];

        await persistProgress(newProgress);
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
        if (isWeekend) return "bg-zinc-800/40 border-zinc-700";
        return "bg-zinc-900 border-zinc-800";
    };

    const formatDateLabel = (d) => {
        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day}-${month}`;
    };

    const getDatesForInstance = (startISO) => {
        const dateArray = [];
        const base = new Date(startISO);
        base.setHours(12, 0, 0, 0);
        for (let i = 0; i < 30; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            dateArray.push(d);
        }
        return dateArray;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="text-rose-500 animate-spin" size={40} />
                <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px] animate-pulse">
                    Carregando controle do aluno...
                </p>
            </div>
        );
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full flex flex-col relative pb-32">

            <header className="mb-6 p-6 bg-zinc-900 rounded-2xl border border-zinc-800/80 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                        <Calendar className="text-rose-500" />
                        Controle de Ciclo
                        {isReadOnly && (
                            <span className="flex items-center gap-1 text-indigo-400 text-xs font-black ml-2 border border-indigo-500/30 px-2 py-0.5 rounded-full bg-indigo-500/5">
                                <Eye size={11} /> Visão Mentor
                            </span>
                        )}
                    </h1>
                    <p className="text-zinc-400 text-sm font-medium mt-1">
                        {isReadOnly
                            ? `Visualizando o controle de ${selectedMentee.displayName || selectedMentee.email.split('@')[0]}. Crie a instância para que o aluno possa marcar o progresso.`
                            : 'Marque seu progresso diário por disciplina. A instância é criada pelo seu mentor.'}
                    </p>
                </div>

                {/* Botão de criar instância: SOMENTE para o mentor com aluno selecionado */}
                {isReadOnly && (
                    <button
                        onClick={handleCreateInstance}
                        className="bg-rose-600 hover:bg-rose-500 flex items-center gap-2 text-white font-bold py-2.5 px-5 rounded-xl shrink-0 shadow-lg shadow-rose-900/20 text-sm mt-2 md:mt-0 tracking-wide transition-all"
                    >
                        <Calendar size={18} /> Criar Controle (Hoje)
                    </button>
                )}
            </header>

            {/* Banner de permissão contextual */}
            {isReadOnly ? (
                <div className="mb-6 flex items-center gap-3 px-5 py-3 bg-indigo-500/8 border border-indigo-500/20 rounded-2xl">
                    <ShieldCheck size={16} className="text-indigo-400 shrink-0" />
                    <p className="text-xs text-indigo-300 font-medium">
                        <strong>Modo Mentor (Leitura):</strong> Você vê o progresso de <strong>{selectedMentee.displayName || selectedMentee.email}</strong>. 
                        Somente o aluno pode marcar as células. Você pode criar ou remover instâncias de controle.
                    </p>
                </div>
            ) : (
                instances.length > 0 && (
                    <div className="mb-6 flex items-center gap-3 px-5 py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <Lock size={14} className="text-zinc-500 shrink-0" />
                        <p className="text-xs text-zinc-500">
                            O grid de 30 dias é configurado pelo seu mentor. Clique nas células para registrar seu progresso diário.
                        </p>
                    </div>
                )
            )}

            {/* Instâncias */}
            <div className="flex-1 flex flex-col gap-12">
                {instances.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 bg-zinc-950/50 rounded-2xl border border-zinc-800 border-dashed max-w-2xl mx-auto w-full mt-8">
                        <Calendar className="mx-auto text-zinc-700 w-16 h-16 mb-4" />
                        <h3 className="text-lg font-bold text-zinc-300 mb-2">Nenhum Grid Criado</h3>
                        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                            {isReadOnly
                                ? 'Clique em "Criar Controle" para gerar o grid de 30 dias com as disciplinas do ciclo atual deste aluno.'
                                : 'Seu mentor ainda não criou um grid de controle para você. O grid aparecerá aqui quando estiver disponível.'}
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
                                    {/* Remover instância: somente mentor */}
                                    {isReadOnly && (
                                        <button
                                            onClick={() => handleRemoveInstance(inst.id)}
                                            className="text-zinc-600 hover:text-rose-400 p-1 mr-1 transition-colors"
                                            title="Remover Grid Visual"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="overflow-x-auto overflow-y-auto w-full max-h-[60vh] custom-scrollbar pb-4">
                                    <table className="w-auto border-collapse text-left min-w-max table-fixed">
                                        <thead className="sticky top-0 z-20">
                                            <tr>
                                                <th className="sticky left-0 z-30 bg-zinc-900 border-b border-r border-zinc-800 p-3 w-[275px] min-w-[275px] max-w-[275px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                                                    <span className="text-sm font-bold text-zinc-100">Matérias</span>
                                                </th>
                                                <th colSpan={dates.length} className="bg-zinc-900 border-b border-zinc-800 p-3 text-center text-sm font-bold text-zinc-400 font-mono tracking-widest">
                                                    {dates[0].toLocaleDateString('pt-BR')} <span className="text-zinc-600 mx-2">➔</span> {dates[dates.length - 1].toLocaleDateString('pt-BR')}
                                                </th>
                                            </tr>
                                            <tr>
                                                <th className="sticky left-0 z-30 bg-zinc-950 border-b border-r border-zinc-800 p-2 w-[275px] min-w-[275px] max-w-[275px] shadow-[2px_0_5px_rgba(0,0,0,0.5)]" />
                                                {dates.map((d, dIdx) => {
                                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                                    return (
                                                        <th key={dIdx} className={`p-0 w-7 min-w-[28px] max-w-[28px] text-center border-b border-r border-zinc-800 text-[10px] uppercase font-bold tracking-wider ${isWeekend ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-950 text-zinc-400'}`}>
                                                            <div className="-rotate-90 whitespace-nowrap h-20 flex items-center justify-center">
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
                                                        Nenhuma disciplina encontrada para esta instância.
                                                    </td>
                                                </tr>
                                            ) : (
                                                inst.disciplines.map((disc, rIdx) => {
                                                    const isRevisao = disc.includes("Revisão");
                                                    return (
                                                        <tr key={rIdx} className="group">
                                                            <td className={`sticky left-0 z-10 border-b border-r border-zinc-800 py-2 px-3 text-[11px] font-semibold w-[275px] min-w-[275px] max-w-[275px] overflow-hidden shadow-[2px_0_5px_rgba(0,0,0,0.5)] ${isRevisao ? 'bg-indigo-950/40 text-indigo-300' : 'bg-zinc-900 text-zinc-300 group-hover:bg-zinc-800'}`}>
                                                                <div className="truncate w-full" title={disc}>{disc}</div>
                                                            </td>
                                                            {dates.map((d, cIdx) => {
                                                                const dateStr = d.toISOString().split('T')[0];
                                                                const key = `${inst.id}_${disc}_${dateStr}`;
                                                                const status = progress[key] || 0;
                                                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
 
                                                                return (
                                                                    <td
                                                                        key={cIdx}
                                                                        onClick={() => handleCellClick(inst.id, disc, dateStr)}
                                                                        title={isReadOnly ? 'Somente o aluno pode marcar o progresso' : undefined}
                                                                        className={`p-0 border-b border-r border-zinc-800/50 w-7 h-7 min-w-[28px] max-w-[28px] text-center align-middle transition-colors ${getCellAppearance(status, isWeekend)} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-125'}`}
                                                                    >
                                                                        {status === 'X' && <span className="text-zinc-500 font-bold text-xs select-none">X</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
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

            {/* Seletor de cor: SOMENTE para o aluno (não mentor) */}
            {!isReadOnly && instances.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 p-3 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 text-xs flex flex-wrap gap-4 items-center justify-center z-50 rounded-2xl shadow-2xl">
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-zinc-400 font-bold hidden md:block">
                            {lockedColor ? 'Cor da Iteração:' : 'Selecionar Cor:'}
                        </span>
                        {lockedColor && <Lock size={12} className="text-amber-500 animate-pulse" />}
                    </div>
                    {[
                        { id: 1, color: "bg-orange-500", ring: "ring-orange-500" },
                        { id: 2, color: "bg-red-500", ring: "ring-red-500" },
                        { id: 3, color: "bg-teal-600", ring: "ring-teal-600" },
                        { id: 4, color: "bg-sky-500", ring: "ring-sky-500" },
                        { id: 5, color: "bg-purple-500", ring: "ring-purple-500" },
                        { id: 6, color: "bg-emerald-500", ring: "ring-emerald-500" },
                        { id: 7, color: "bg-pink-500", ring: "ring-pink-500" },
                        { id: 8, color: "bg-amber-400", ring: "ring-amber-400" }
                    ].map(brush => {
                        const isDisabled = lockedColor && lockedColor !== brush.id;
                        return (
                            <button
                                key={brush.id}
                                disabled={isDisabled}
                                onClick={() => setActiveBrush(brush.id)}
                                className={`w-6 h-6 rounded-full transition-all outline-none ${brush.color} 
                                    ${isDisabled ? 'opacity-5 grayscale cursor-not-allowed scale-75' : 'cursor-pointer hover:shadow-lg'} 
                                    ${activeBrush === brush.id ? `ring-4 ring-offset-2 ring-offset-zinc-900 ${brush.ring} scale-110 shadow-lg` : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                                title={isDisabled ? "Finalize o ciclo para mudar de cor" : `Selecionar Cor ${brush.id}`}
                            />
                        );
                    })}
                    <div className="hidden md:flex items-center gap-1.5 ml-4 text-zinc-400 border-l border-zinc-700/50 pl-4 font-medium">
                        <div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded-sm" /> Clique p/ Apagar
                    </div>
                </div>
            )}
        </section>
    );
}
