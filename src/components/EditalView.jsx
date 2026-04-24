import { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Plus, Trash, GraduationCap, FileText, ChevronDown, ChevronUp, BrainCircuit, Pencil } from 'lucide-react';
import { pushData, pullAllData } from '../utils/dataSync';

const blankMetrics = () => ({
  fase1: { inicio: '', conclusao: '', certas: '', resolvidas: '' },
  fase2: { inicio: '', conclusao: '', certas: '', resolvidas: '' },
  fase3: { certas: '', resolvidas: '' }
});

export default function EditalView() {
  const { alert, confirm } = useNotification();
  const { user, selectedMentee } = useAuth();
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscCat, setNewDiscCat] = useState('Conhecimentos Gerais');
  const [smartText, setSmartText] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (selectedMentee) {
        setLoading(true);
        const data = await pullAllData(user, selectedMentee.id);
        const saved = data?.find(i => i.key === 'simpl_edital')?.data;
        if (saved) setDisciplines(saved);
        setLoading(false);
      } else {
        const savedData = localStorage.getItem('simpl_edital');
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            setDisciplines(parsedData);
          } catch (e) {
            console.error("Error parsing local edital:", e);
          }
        }
      }
    };
    loadData();
  }, [selectedMentee, user]);

  const saveToStorage = async (data) => {
    setDisciplines(data);
    if (selectedMentee) {
      await pushData('simpl_edital', data, user, selectedMentee.id);
    } else {
      localStorage.setItem('simpl_edital', JSON.stringify(data));
      await pushData('simpl_edital', data);
    }
  };

  const addDiscipline = () => {
    if (!newDiscName.trim()) return;
    const newDisc = {
      id: Date.now().toString(),
      nome: newDiscName,
      categoria: newDiscCat,
      currentPhase: 1,
      topicos: []
    };
    saveToStorage([...disciplines, newDisc]);
    setNewDiscName('');
  };

  const removeDiscipline = async (id) => {
    const confirmed = await confirm('Tem certeza que deseja remover esta disciplina e todos os seus tópicos?', { variant: 'danger' });
    if (confirmed) {
      saveToStorage(disciplines.filter(d => d.id !== id));
    }
  };

  const addTopicosEmMassa = (discId, textoLote) => {
    const topicosExtraidos = textoLote
      .split(/(?=\b\d+(?:\.\d+)*[\.\s\-–]+[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g)
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

  const updateDisciplineCategory = (discId, newCategory) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return { ...d, categoria: newCategory };
      }
      return d;
    });
    saveToStorage(updated);
  };

  const updateDisciplinePhase = (discId, newPhase) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return { ...d, currentPhase: Number(newPhase) };
      }
      return d;
    });
    saveToStorage(updated);
  };

  const editDisciplineName = (discId, newName) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return { ...d, nome: newName };
      }
      return d;
    });
    saveToStorage(updated);
  };

  const editTopicoText = (discId, topicoId, newText) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return {
          ...d,
          topicos: d.topicos.map(t => {
            if (t.id === topicoId) {
              return { ...t, texto: newText };
            }
            return t;
          })
        };
      }
      return d;
    });
    saveToStorage(updated);
  };

  const processSmartExtract = () => {
    if (!smartText.trim()) return;

    let text = smartText.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
    // Separation of disciplines and topics if inline (ex: "DISCIPLINA: 1. Tema" -> "DISCIPLINA:\n1. Tema")
    text = text.replace(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s,\-\(\)/&]{4,}:?)(?=\s*(\d|[A-Z][a-z]))/gm, '$1\n'); 

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const extractedDisciplines = [];
    let currentDiscipline = null;
    let currentContent = [];

    const isDisciplineHeader = (str) => {
      // Must start with uppercase letter, contain NO lowercase letters, and length reasonably short
      return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(str) && /^[^a-z]+$/.test(str) && str.length < 120;
    };

    const processTopics = (contentBlock) => {
      if (!contentBlock) return [];
      
      let matches = [];
      let match;
      // Regex detects numbers like "1 ", "1.1", "1.1.1" usually followed by space or hyphens
      const matchRegex = /\b(\d+(?:\.\d+)*)[\.\s\-–]+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g;
      
      while ((match = matchRegex.exec(contentBlock)) !== null) {
        matches.push({
          prefix: match[1],
          index: match.index,
          endIndex: matchRegex.lastIndex
        });
      }

      if (matches.length === 0) {
        // Did not match the numerical pattern. Add as a single block.
        return [{
          id: Date.now().toString() + Math.random().toString(),
          texto: contentBlock.trim(),
          level: 0,
          ...blankMetrics()
        }];
      }

      let topics = [];
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        const startTextIdx = current.endIndex;
        const endTextIdx = next ? next.index : contentBlock.length;
        
        let texto = contentBlock.slice(startTextIdx, endTextIdx).trim();
        // Clean leading punctuation
        texto = texto.replace(/^[-–;\.,]*\s*/, '');
        
        const level = current.prefix.split('.').length - 1; // e.g. "1.1" -> 1 padding unit
        
        topics.push({
          id: Date.now().toString() + '-' + i + Math.random().toString(),
          texto: `${current.prefix} - ${texto}`,
          level: level,
          ...blankMetrics()
        });
      }
      return topics;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isDisciplineHeader(line)) {
            if (currentDiscipline && currentContent.length > 0) {
                currentDiscipline.topicos = processTopics(currentContent.join(' '));
                extractedDisciplines.push(currentDiscipline);
            } else if (currentDiscipline && currentContent.length === 0) {
                extractedDisciplines.push(currentDiscipline);
            }

            currentDiscipline = {
                id: Date.now().toString() + '-' + i,
                nome: line.replace(/:$/, '').trim(),
                categoria: 'Conhecimentos Específicos',
                currentPhase: 1,
                topicos: []
            };
            currentContent = [];
        } else {
            if (currentDiscipline) {
                currentContent.push(line);
            } else {
                currentDiscipline = {
                    id: Date.now().toString() + '-def',
                    nome: 'CONHECIMENTOS DIVERSOS',
                    categoria: 'Conhecimentos Gerais',
                    currentPhase: 1,
                    topicos: []
                };
                currentContent.push(line);
            }
        }
    }

    if (currentDiscipline) {
      if(currentContent.length > 0) {
        currentDiscipline.topicos = processTopics(currentContent.join(' '));
      }
      extractedDisciplines.push(currentDiscipline);
    }
    
    saveToStorage([...disciplines, ...extractedDisciplines]);
    setSmartText('');
    alert(`Extração Concluída com sucesso! ${extractedDisciplines.length} disciplinas identificadas.`, 'success');
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full rounded-none">
      <header className="mb-8 flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800/80 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-1">Meu Edital Verticalizado</h1>
          <p className="text-indigo-400 text-sm font-medium">Controle seu avanço descascando o edital tópico por tópico.</p>
        </div>
      </header>

      {/* Smart Extract Edital Completo */}
      <Card className="p-6 bg-zinc-900 border-indigo-500/30 shadow-xl rounded-2xl mb-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="relative">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 mb-2">
            <BrainCircuit size={24} className="text-indigo-400 group-hover:animate-pulse" /> Extração Inteligente
            </h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-4xl">
            Cole integralmente o texto do bloco de "Conteúdo Programático" do seu edital. O sistema identificará automaticamente as disciplinas (escritas em <strong>CAIXA ALTA</strong>) e segmentará a hierarquia das sub-matérias baseado em prefixos numéricos (Ex: 1, 1.1, 1.2.1).
            </p>
            
            <div className="flex flex-col xl:flex-row gap-4 items-end">
                <Textarea 
                placeholder={`Exemplo de Extração:\nLÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos. 1.1 Gêneros textuais.\nRACIOCÍNIO LÓGICO\n1 Conjuntos...`}
                className="min-h-[140px] text-sm bg-zinc-950/80 w-full"
                value={smartText}
                onChange={(e) => setSmartText(e.target.value)}
                />
                <Button 
                onClick={processSmartExtract} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 w-full xl:w-64 h-12 shrink-0 font-bold tracking-wide"
                >
                Processar Edital
                </Button>
            </div>
        </div>
      </Card>

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
                onChangeCategory={(cat) => updateDisciplineCategory(disc.id, cat)}
                onChangePhase={(phase) => updateDisciplinePhase(disc.id, phase)}
                onAddBulk={(texto) => addTopicosEmMassa(disc.id, texto)}
                onRemoveTopico={(topicoId) => removeTopico(disc.id, topicoId)}
                onUpdateTopicMetrics={(topicoId, p, f, v) => updateTopicMetrics(disc.id, topicoId, p, f, v)}
                onEditTopicoText={(topicoId, newText) => editTopicoText(disc.id, topicoId, newText)}
                onEditName={(newName) => editDisciplineName(disc.id, newName)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DisciplineBlock({ discipline, onRemove, onChangeCategory, onChangePhase, onAddBulk, onRemoveTopico, onUpdateTopicMetrics, onEditTopicoText, onEditName }) {
  const [bulkText, setBulkText] = useState('');
  const [isListCollapsed, setIsListCollapsed] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(discipline.nome);

  const handleSaveName = (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    setIsEditingName(false);
    if (editName.trim() && editName !== discipline.nome) {
      onEditName(editName.trim());
    } else {
      setEditName(discipline.nome);
    }
  };
  
  const handleExtrair = () => {
    if (!bulkText.trim()) return;
    onAddBulk(bulkText);
    setBulkText('');
    setIsListCollapsed(false); // expands when something is added manually
  };

  const phase = discipline.currentPhase || 1;
  const isPhase2 = phase === 2;
  const isPhase3 = phase === 3;
  
  const cardBorderClass = isPhase3 ? "border-rose-500/50 shadow-rose-900/20" : isPhase2 ? "border-amber-500/50 shadow-amber-900/20" : "border-zinc-800 shadow-xl";
  const headerBgClass = isPhase3 ? "bg-rose-950/20" : isPhase2 ? "bg-amber-950/20" : "bg-zinc-900";
  const selectPhaseClass = isPhase3 ? "border-rose-800 text-rose-400 bg-rose-950/40" : isPhase2 ? "border-amber-800 text-amber-400 bg-amber-950/40" : "bg-zinc-800 border-zinc-700 text-zinc-400";

  return (
    <Card className={`bg-zinc-900 overflow-hidden rounded-2xl border ${cardBorderClass} transition-colors duration-500`}>
      <div 
        className={`p-6 border-b border-zinc-800/50 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${headerBgClass} transition-colors duration-500 cursor-pointer hover:bg-zinc-800/30`}
        onClick={() => setIsListCollapsed(!isListCollapsed)}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full flex-1">
          <div className="flex items-center gap-2 group/title">
            {isEditingName ? (
              <input 
                  type="text" 
                  className="bg-zinc-800 border-none rounded px-2 py-1 text-zinc-100 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleSaveName}
                  onBlur={handleSaveName}
                  autoFocus
                />
            ) : (
              <>
              <h3 
                className="text-2xl font-black text-zinc-100 cursor-text"
                onDoubleClick={() => setIsEditingName(true)}
              >
                {discipline.nome}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditingName(true)}
                className="opacity-0 group-hover/title:opacity-100 text-zinc-500 hover:text-indigo-400 p-1 h-auto transition-opacity"
              >
                <Pencil size={16} />
              </Button>
              </>
            )}
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-2 flex flex-wrap items-center gap-2">
            <select 
              value={discipline.categoria} 
              onChange={(e) => onChangeCategory(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-400 tracking-wider text-[10px] uppercase rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-700"
            >
              <option value="Conhecimentos Gerais">Conhecimentos Gerais</option>
              <option value="Conhecimentos Específicos">Conhecimentos Específicos</option>
            </select>
            
            <select 
              value={phase} 
              onChange={(e) => onChangePhase(e.target.value)}
              className={`tracking-wider text-[10px] uppercase rounded px-1.5 py-0.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${selectPhaseClass}`}
            >
              <option value="1" className="bg-zinc-900 text-zinc-300">Fase 1 (Aprender)</option>
              <option value="2" className="bg-zinc-900 text-amber-400">Fase 2 (Revisar)</option>
              <option value="3" className="bg-zinc-900 text-rose-400">Fase 3 (Manutenção)</option>
            </select>
            
            <span className="ml-2 font-bold">{discipline.topicos.length} tópicos extraídos.</span>
          </p>
        </div>
        
        <div className="flex gap-2 items-center shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setIsListCollapsed(!isListCollapsed)} className="text-zinc-400 hover:text-zinc-100 p-2">
            {isListCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 z-10 shrink-0 p-2">
            <Trash size={18} />
          </Button>
        </div>
      </div>

      {!isListCollapsed && (
        <div className="p-6 bg-zinc-950/50 space-y-6 animate-in slide-in-from-top-2 duration-300">
          
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
                  selectedMentee={selectedMentee}
                  onRemove={() => onRemoveTopico(topico.id)}
                  onUpdate={(phase, field, val) => onUpdateTopicMetrics(topico.id, phase, field, val)}
                  onEditText={(newText) => onEditTopicoText(topico.id, newText)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function TopicAccordion({ topico, onRemove, onUpdate, onEditText, selectedMentee }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(topico.texto);

  const handleSaveText = (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    setIsEditing(false);
    if (editText.trim() && editText !== topico.texto) {
      onEditText(editText.trim());
    } else {
      setEditText(topico.texto);
    }
  };

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
        <div 
          className="flex-1 text-sm text-zinc-200 flex items-center gap-2"
          style={{ paddingLeft: topico.level ? `${topico.level * 1.25}rem` : '0' }}
        >
          {topico.level > 0 && <span className="text-zinc-600">↳</span>}
          {isEditing ? (
            <input 
              type="text" 
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 w-full font-medium"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleSaveText}
              onBlur={handleSaveText}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="font-medium" onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
              {topico.texto}
            </span>
          )}
        </div>
        
        {/* Quick Indicators that show when collapsed */}
        {!expanded && !selectedMentee && (
          <div className="hidden md:flex gap-2 text-[10px] font-bold">
            <span className={`px-2 py-1 rounded-full ${getPillColor(p1)}`} title="Fase 1">F1: {p1 !== null ? `${p1}%` : '-'}</span>
            <span className={`px-2 py-1 rounded-full ${getPillColor(p2)}`} title="Fase 2">F2: {p2 !== null ? `${p2}%` : '-'}</span>
            <span className={`px-2 py-1 rounded-full ${getPillColor(p3)}`} title="Fase 3">F3: {p3 !== null ? `${p3}%` : '-'}</span>
          </div>
        )}

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
            className="text-zinc-600 hover:text-indigo-400 p-2 h-auto"
            title="Editar Tópico"
          >
            <Pencil size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onRemove(); }} 
            className="text-zinc-600 hover:text-rose-400 p-2 h-auto"
            title="Remover Tópico"
          >
            <Trash size={16} />
          </Button>
        </div>
      </div>

      {expanded && !selectedMentee && (
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
                <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Fase 3 (Revisão)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getPillColor(p3)}`}>{p3 !== null ? `${p3}% Acerto` : '--'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Questões Certas</label>
                  <Input type="number" min="0" placeholder="Ex: 90" className="h-8 text-xs" value={topico.fase3?.certas || ''} onChange={(e) => onUpdate('fase3', 'certas', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase">Qtd. Resolvidas</label>
                  <Input type="number" min="0" placeholder="Ex: 100" className="h-8 text-xs" value={topico.fase3?.resolvidas || ''} onChange={(e) => onUpdate('fase3', 'resolvidas', e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


