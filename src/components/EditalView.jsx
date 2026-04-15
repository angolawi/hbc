import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Plus, Trash, GraduationCap, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const blankMetrics = () => ({
  fase1: { inicio: '', conclusao: '', certas: '', resolvidas: '' },
  fase2: { inicio: '', conclusao: '', certas: '', resolvidas: '' },
  fase3: { certas: '', resolvidas: '' }
});

export default function EditalView() {
  const [disciplines, setDisciplines] = useState([]);
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscCat, setNewDiscCat] = useState('Conhecimentos Gerais');

  // Load from local storage
  useEffect(() => {
    const savedData = localStorage.getItem('simpl_edital');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Migrate old data that only had "concluido" boolean
      const migrated = parsedData.map(d => ({
        ...d,
        categoria: d.categoria || 'Conhecimentos Gerais',
        topicos: d.topicos.map(t => ({
          ...t,
          ...(!t.fase1 ? blankMetrics() : {})
        }))
      }));
      setDisciplines(migrated);
    }
  }, []);

  const saveToStorage = (data) => {
    setDisciplines(data);
    localStorage.setItem('simpl_edital', JSON.stringify(data));
  };

  const addDiscipline = () => {
    if (!newDiscName.trim()) return;
    const newDisc = {
      id: Date.now().toString(),
      nome: newDiscName,
      categoria: newDiscCat,
      topicos: []
    };
    saveToStorage([...disciplines, newDisc]);
    setNewDiscName('');
  };

  const removeDiscipline = (id) => {
    if (window.confirm('Tem certeza que deseja remover esta disciplina e todos os seus tópicos?')) {
      saveToStorage(disciplines.filter(d => d.id !== id));
    }
  };

  const addTopicosEmMassa = (discId, textoLote) => {
    const topicosExtraidos = textoLote
      .split(/(?=\b\d+(?:\.\d+)*\s+)/g)
      .map(t => t.trim())
      .filter(t => t.length > 2);

    let linhasParaProcessar = topicosExtraidos;

    if (topicosExtraidos.length === 0) {
      linhasParaProcessar = textoLote.split('\n').map(t => t.trim()).filter(Boolean);
      if (linhasParaProcessar.length === 0) return;
    }

    const novosTopicos = linhasParaProcessar.map((texto, i) => ({
      id: Date.now().toString() + '-' + i,
      texto,
      ...blankMetrics()
    }));
    
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return { ...d, topicos: [...d.topicos, ...novosTopicos] };
      }
      return d;
    });
    saveToStorage(updated);
  };

  const removeTopico = (discId, topicoId) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return { ...d, topicos: d.topicos.filter(t => t.id !== topicoId) };
      }
      return d;
    });
    saveToStorage(updated);
  };

  const updateTopicMetrics = (discId, topicoId, phase, field, value) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return {
          ...d,
          topicos: d.topicos.map(t => {
            if (t.id === topicoId) {
              return {
                ...t,
                [phase]: {
                  ...t[phase],
                  [field]: value
                }
              };
            }
            return t;
          })
        };
      }
      return d;
    });
    saveToStorage(updated);
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full rounded-none">
      <header className="mb-8 flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800/80 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-1">Meu Edital Verticalizado</h1>
          <p className="text-indigo-400 text-sm font-medium">Controle seu avanço descascando o edital tópico por tópico.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative w-full items-start">
        {/* Adicionar Disciplina Sidebar */}
        <Card className="p-6 bg-zinc-900 border-zinc-800/80 shadow-xl rounded-2xl xl:sticky xl:top-24">
          <h2 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-800 pb-4">
            <Plus size={20} className="text-indigo-400" /> Adicionar Disciplina
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-zinc-400 font-medium text-xs uppercase tracking-wider mb-2">Nome da Disciplina</label>
              <Input 
                placeholder="Ex: Língua Portuguesa" 
                value={newDiscName} 
                onChange={(e) => setNewDiscName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && addDiscipline()}
              />
            </div>
            
            <div>
              <label className="block text-zinc-400 font-medium text-xs uppercase tracking-wider mb-2">Categoria</label>
              <select 
                value={newDiscCat} 
                onChange={(e) => setNewDiscCat(e.target.value)}
                className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
              >
                <option value="Conhecimentos Gerais">Conhecimentos Gerais / Básicos</option>
                <option value="Conhecimentos Específicos">Conhecimentos Específicos</option>
              </select>
            </div>

            <Button fullWidth className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20" onClick={addDiscipline}>
              Nova Disciplina
            </Button>
          </div>
        </Card>

        {/* Lista de Disciplinas */}
        <div className="xl:col-span-2 space-y-6">
          {disciplines.length === 0 ? (
            <div className="text-center p-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 border-dashed">
              <GraduationCap className="mx-auto text-zinc-600 mb-4" size={48} />
              <h3 className="text-lg font-bold text-zinc-300">Seu edital está vazio</h3>
              <p className="text-zinc-500 text-sm mt-2">Comece adicionando as matérias que cairão na sua prova no painel ao lado.</p>
            </div>
          ) : (
            disciplines.map(disc => (
              <DisciplineBlock 
                key={disc.id} 
                discipline={disc} 
                onRemove={() => removeDiscipline(disc.id)}
                onAddBulk={(texto) => addTopicosEmMassa(disc.id, texto)}
                onRemoveTopico={(topicoId) => removeTopico(disc.id, topicoId)}
                onUpdateTopicMetrics={(topicoId, p, f, v) => updateTopicMetrics(disc.id, topicoId, p, f, v)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DisciplineBlock({ discipline, onRemove, onAddBulk, onRemoveTopico, onUpdateTopicMetrics }) {
  const [bulkText, setBulkText] = useState('');
  
  const handleExtrair = () => {
    if (!bulkText.trim()) return;
    onAddBulk(bulkText);
    setBulkText('');
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800/50 flex justify-between items-start bg-zinc-900">
        <div>
          <h3 className="text-2xl font-black text-zinc-100 flex items-center gap-3">
            {discipline.nome}
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-1 flex gap-2">
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 tracking-wider">[{discipline.categoria}]</span>
            <span>{discipline.topicos.length} tópicos extraídos.</span>
          </p>
        </div>
        
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 z-10">
          <Trash size={18} />
        </Button>
      </div>

      <div className="p-6 bg-zinc-950/50 space-y-6">
        
        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-xl">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText size={16} /> Colar Conteúdo Programático
          </label>
          <Textarea 
            placeholder="Cole o texto bloco do edital aqui..."
            className="min-h-[100px] text-sm bg-zinc-950 mb-3"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-zinc-500">Separará tópicos automaticamente.</span>
            <Button size="sm" onClick={handleExtrair} className="bg-zinc-800 hover:bg-indigo-600 text-zinc-300 border-none cursor-pointer">
              Extrair e Inserir
            </Button>
          </div>
        </div>

        {discipline.topicos.length > 0 && (
          <div className="space-y-3 mt-4">
            {discipline.topicos.map(topico => (
              <TopicAccordion 
                key={topico.id} 
                topico={topico}
                onRemove={() => onRemoveTopico(topico.id)}
                onUpdate={(phase, field, val) => onUpdateTopicMetrics(topico.id, phase, field, val)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function TopicAccordion({ topico, onRemove, onUpdate }) {
  const [expanded, setExpanded] = useState(false);

  const calcPercentage = (certas, resolvidas) => {
    const c = Number(certas);
    const r = Number(resolvidas);
    if (!r || isNaN(r) || r <= 0) return null;
    return Math.round((c / r) * 100);
  };

  const p1 = calcPercentage(topico.fase1?.certas, topico.fase1?.resolvidas);
  const p2 = calcPercentage(topico.fase2?.certas, topico.fase2?.resolvidas);
  const p3 = calcPercentage(topico.fase3?.certas, topico.fase3?.resolvidas);

  const getPillColor = (pct) => {
    if (pct === null) return 'bg-zinc-800 text-zinc-500';
    if (pct >= 80) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    if (pct >= 60) return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/50 rounded-xl overflow-hidden transition-all">
      <div 
        className="p-4 flex gap-4 items-center cursor-pointer hover:bg-zinc-800/30 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-zinc-400 group-hover:text-amber-400 transition-colors">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        <div className="flex-1 text-sm text-zinc-200">
          {topico.texto}
        </div>
        
        {/* Quick Indicators that show when collapsed */}
        {!expanded && (
          <div className="hidden md:flex gap-2 text-[10px] font-bold">
            <span className={`px-2 py-1 rounded-full ${getPillColor(p1)}`} title="Fase 1">F1: {p1 !== null ? `${p1}%` : '-'}</span>
            <span className={`px-2 py-1 rounded-full ${getPillColor(p2)}`} title="Fase 2">F2: {p2 !== null ? `${p2}%` : '-'}</span>
            <span className={`px-2 py-1 rounded-full ${getPillColor(p3)}`} title="Fase 3">F3: {p3 !== null ? `${p3}%` : '-'}</span>
          </div>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => { e.stopPropagation(); onRemove(); }} 
          className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 h-auto"
        >
          <Trash size={16} />
        </Button>
      </div>

      {expanded && (
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/50 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Phase 1 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-zinc-900/80 p-2 rounded-t-lg border-b border-zinc-800 mt-2">
                <span className="text-xs font-black text-amber-500 uppercase tracking-widest">Fase 1</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getPillColor(p1)}`}>{p1 !== null ? `${p1}% Acerto` : '--'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Início</label>
                  <Input type="date" className="h-8 text-[11px] px-2" value={topico.fase1?.inicio || ''} onChange={(e) => onUpdate('fase1', 'inicio', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Conclusão</label>
                  <Input type="date" className="h-8 text-[11px] px-2" value={topico.fase1?.conclusao || ''} onChange={(e) => onUpdate('fase1', 'conclusao', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Questões Certas</label>
                  <Input type="number" min="0" placeholder="Ex: 8" className="h-8 text-xs" value={topico.fase1?.certas || ''} onChange={(e) => onUpdate('fase1', 'certas', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Qtd. Resolvidas</label>
                  <Input type="number" min="0" placeholder="Ex: 10" className="h-8 text-xs" value={topico.fase1?.resolvidas || ''} onChange={(e) => onUpdate('fase1', 'resolvidas', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Phase 2 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-zinc-900/80 p-2 rounded-t-lg border-b border-zinc-800 mt-2">
                <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Fase 2</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getPillColor(p2)}`}>{p2 !== null ? `${p2}% Acerto` : '--'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Início</label>
                  <Input type="date" className="h-8 text-[11px] px-2" value={topico.fase2?.inicio || ''} onChange={(e) => onUpdate('fase2', 'inicio', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Conclusão</label>
                  <Input type="date" className="h-8 text-[11px] px-2" value={topico.fase2?.conclusao || ''} onChange={(e) => onUpdate('fase2', 'conclusao', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Questões Certas</label>
                  <Input type="number" min="0" placeholder="Ex: 40" className="h-8 text-xs" value={topico.fase2?.certas || ''} onChange={(e) => onUpdate('fase2', 'certas', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Qtd. Resolvidas</label>
                  <Input type="number" min="0" placeholder="Ex: 45" className="h-8 text-xs" value={topico.fase2?.resolvidas || ''} onChange={(e) => onUpdate('fase2', 'resolvidas', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Phase 3 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-zinc-900/80 p-2 rounded-t-lg border-b border-zinc-800 mt-2">
                <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Fase 3</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getPillColor(p3)}`}>{p3 !== null ? `${p3}% Acerto` : '--'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="col-span-2">
                  <span className="text-[10px] text-zinc-600 italic">Datas irrelevantes em consolidação profunda.</span>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Questões Certas</label>
                  <Input type="number" min="0" className="h-8 text-xs" value={topico.fase3?.certas || ''} onChange={(e) => onUpdate('fase3', 'certas', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Qtd. Resolvidas</label>
                  <Input type="number" min="0" className="h-8 text-xs" value={topico.fase3?.resolvidas || ''} onChange={(e) => onUpdate('fase3', 'resolvidas', e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


