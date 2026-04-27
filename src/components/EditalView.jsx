import { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Plus, Trash, GraduationCap, FileText, ChevronDown, ChevronUp, BrainCircuit, Pencil, ShieldCheck } from 'lucide-react';
import { pushData, pullAllData } from '../utils/dataSync';
import { supabase } from '../utils/supabase';

const blankMetrics = () => ({
  fase1: { inicio: '', conclusao: '', certas: '', resolvidas: '' },
  fase2: { inicio: '', conclusao: '', certas: '', resolvidas: '' },
  fase3: { certas: '', resolvidas: '' }
});

export default function EditalView() {
  const { alert, confirm } = useNotification();
  const { user, selectedMentee, isMentor } = useAuth();
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscCat, setNewDiscCat] = useState('Conhecimentos Gerais');
  const [newDiscTag, setNewDiscTag] = useState('teorica');
  const [smartText, setSmartText] = useState('');
  const [activeCycleDiscs, setActiveCycleDiscs] = useState([]); // IDs das matérias no ciclo

  // Template States
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (selectedMentee) {
        setLoading(true);
        const data = await pullAllData(user, selectedMentee.id);

        const savedEdital = data?.find(i => i.key === 'simpl_edital')?.data;
        if (savedEdital) setDisciplines(savedEdital);

        const savedCiclo = data?.find(i => i.key === 'simpl_ciclo')?.data;
        if (savedCiclo) {
          const blocks = Array.isArray(savedCiclo) ? savedCiclo : (savedCiclo.blocks || []);
          setActiveCycleDiscs([...new Set(blocks.map(b => b.id))]);
        }

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

        const savedCicloLocal = localStorage.getItem('simpl_ciclo');
        if (savedCicloLocal) {
          const parsed = JSON.parse(savedCicloLocal);
          const blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
          setActiveCycleDiscs([...new Set(blocks.map(b => b.id))]);
        }
      }
    };
    loadData();
    if (isMentor) fetchTemplates();
    const handleSync = (e) => {
      if (e.detail.type === 'pull' && e.detail.status === 'success' && !selectedMentee) {
        loadData();
      }
    };
    window.addEventListener('sync-status', handleSync);
    return () => window.removeEventListener('sync-status', handleSync);
  }, [selectedMentee, user, isMentor]);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('edital_templates').select('*').order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return alert("Dê um nome ao template.");
    if (disciplines.length === 0) return alert("Adicione pelo menos uma disciplina antes.");

    if (editingTemplateId) {
      const { error } = await supabase.from('edital_templates').update({
        name: templateName,
        data: disciplines
      }).eq('id', editingTemplateId);

      if (error) alert("Erro ao atualizar template.");
      else {
        alert("Template atualizado com sucesso!", "success");
        setEditingTemplateId(null);
        setTemplateName('');
        setDisciplines([]); // Limpa a tela
        localStorage.removeItem('simpl_edital');
        fetchTemplates();
      }
    } else {
      const { error } = await supabase.from('edital_templates').insert({
        mentor_id: user.id,
        name: templateName,
        data: disciplines
      });

      if (error) alert("Erro ao salvar template.");
      else {
        alert("Template de Edital salvo com sucesso!", "success");
        setTemplateName('');
        setDisciplines([]); // Limpa a tela
        setIsCreatingNew(false);
        localStorage.removeItem('simpl_edital');
        fetchTemplates();
      }
    }
  };

  const startNewTemplate = () => {
    setDisciplines([]);
    setTemplateName('');
    setEditingTemplateId(null);
    setIsCreatingNew(true);
    localStorage.removeItem('simpl_edital');
    alert("Iniciando novo template em branco. Use a Extração Inteligente ou adicione matérias manualmente.", "success");
  };

  const loadTemplate = (template) => {
    if (!template.data || !Array.isArray(template.data)) {
      return alert("Erro: Dados do template inválidos.", "error");
    }

    setDisciplines(template.data);
    setTemplateName(template.name);
    setEditingTemplateId(template.id);
    setIsCreatingNew(false);

    // Força sincronização com storage para evitar perda em refresh
    localStorage.setItem('simpl_edital', JSON.stringify(template.data));

    const totalTopicos = template.data.reduce((acc, d) => acc + (d.topicos?.length || 0), 0);
    alert(`Template "${template.name}" carregado (${template.data.length} disciplinas, ${totalTopicos} tópicos).`, "success");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyTemplate = async (templateData) => {
    if (!templateData || !Array.isArray(templateData)) {
      return alert("Este template parece estar vazio ou corrompido.", "error");
    }

    const confirmed = await confirm(`Isso substituirá todo o edital atual deste aluno por este template (${templateData.length} disciplinas). Continuar?`);
    if (confirmed) {
      // Usa a função de storage para garantir que vá para o Supabase do aluno
      await saveToStorage(templateData);
      alert("Template aplicado e sincronizado com sucesso!", "success");
      setShowTemplates(false);
    }
  };

  const deleteTemplate = async (tid) => {
    if (await confirm("Excluir este template para sempre?")) {
      await supabase.from('edital_templates').delete().eq('id', tid);
      if (editingTemplateId === tid) {
        setEditingTemplateId(null);
        setTemplateName('');
      }
      fetchTemplates();
    }
  }

  const saveToStorage = async (data) => {
    setDisciplines(data);
    localStorage.setItem('simpl_edital', JSON.stringify(data));

    // Se estiver editando um template global, NÃO salva no edital ativo/aluno 
    // para evitar misturar rascunhos de template com o estudo real.
    if (user && !editingTemplateId) {
      await pushData('simpl_edital', data, user, selectedMentee?.id);
    }
  };

  const addDiscipline = () => {
    if (!newDiscName.trim()) return;
    const newDisc = {
      id: Date.now().toString(),
      nome: newDiscName.toUpperCase(),
      categoria: newDiscCat,
      tag: newDiscTag,
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

  const updateDisciplineTag = (discId, newTag) => {
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        return { ...d, tag: newTag };
      }
      return d;
    });
    saveToStorage(updated);
  };

  const propagateRenameAcrossApp = async (discId, oldName, newName) => {
    // Se estivermos editando um template mestre, não propagamos para o estudo ativo
    if (editingTemplateId) return;

    // 1. Atualizar Ciclo Ativo (simpl_ciclo)
    const updateCycle = async (data, targetId) => {
      const blocks = Array.isArray(data) ? data : (data.blocks || []);
      let changed = false;
      blocks.forEach(b => {
        if (b.id === discId) { b.nome = newName; changed = true; }
      });
      if (changed) {
        const finalCycle = Array.isArray(data) ? blocks : { ...data, blocks };
        if (!targetId) localStorage.setItem('simpl_ciclo', JSON.stringify(finalCycle));
        await pushData('simpl_ciclo', finalCycle, user, targetId);
      }
    };

    // 2. Atualizar Grid Dashboard (simpl_cycle_instances e simpl_grid_progress)
    const updateGrid = async (instances, progress, targetId) => {
      let instChanged = false;
      const updatedInstances = (instances || []).map(inst => {
        const newDiscs = inst.disciplines.map(d => {
          if (d === oldName) { instChanged = true; return newName; }
          return d;
        });
        return { ...inst, disciplines: newDiscs };
      });

      if (instChanged) {
        if (!targetId) localStorage.setItem('simpl_cycle_instances', JSON.stringify(updatedInstances));
        await pushData('simpl_cycle_instances', updatedInstances, user, targetId);
      }

      let progChanged = false;
      const updatedProgress = {};
      Object.keys(progress || {}).forEach(key => {
        if (key.startsWith(`${oldName}_`)) {
          const newKey = key.replace(`${oldName}_`, `${newName}_`);
          updatedProgress[newKey] = progress[key];
          progChanged = true;
        } else {
          updatedProgress[key] = progress[key];
        }
      });

      if (progChanged) {
        if (!targetId) localStorage.setItem('simpl_grid_progress', JSON.stringify(updatedProgress));
        await pushData('simpl_grid_progress', updatedProgress, user, targetId);
      }
    };

    // Executa a propagação
    try {
      if (selectedMentee) {
        // Modo Mentor: Busca do cloud do aluno, altera e salva de volta
        const cloudData = await pullAllData(user, selectedMentee.id);
        const cycle = cloudData?.find(i => i.key === 'simpl_ciclo')?.data;
        const inst = cloudData?.find(i => i.key === 'simpl_cycle_instances')?.data;
        const prog = cloudData?.find(i => i.key === 'simpl_grid_progress')?.data;

        if (cycle) await updateCycle(cycle, selectedMentee.id);
        if (inst || prog) await updateGrid(inst, prog, selectedMentee.id);
      } else {
        // Modo Aluno: Altera localStorage e sync
        const cycleRaw = localStorage.getItem('simpl_ciclo');
        const instRaw = localStorage.getItem('simpl_cycle_instances');
        const progRaw = localStorage.getItem('simpl_grid_progress');
        
        if (cycleRaw) await updateCycle(JSON.parse(cycleRaw));
        if (instRaw || progRaw) await updateGrid(
          instRaw ? JSON.parse(instRaw) : [], 
          progRaw ? JSON.parse(progRaw) : {}
        );
      }
    } catch (e) {
      console.error("Erro na propagação de renomeação:", e);
    }
  };

  const editDisciplineName = async (discId, newName) => {
    let oldName = '';
    const updated = disciplines.map(d => {
      if (d.id === discId) {
        oldName = d.nome;
        return { ...d, nome: newName.toUpperCase() };
      }
      return d;
    });
    // Garante o save no edital primeiro
    await saveToStorage(updated);
    
    // Propaga para o resto do app (Ciclo/Grid)
    if (oldName && oldName !== newName) {
      await propagateRenameAcrossApp(discId, oldName, newName);
    }
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
      // Remove números iniciais para verificar o texto (ex: "01. DIREITO" -> "DIREITO")
      const plainText = str.replace(/^[\d\.\-\s]+/, '').trim();
      if (!plainText) return false;

      const hasUppercaseStart = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(plainText);
      const words = plainText.split(/\s+/);

      // Permite conectores minúsculos, mas exige que o resto seja maiúsculo
      const isMostlyUppercase = words.filter(w => /^[^a-z]+$/.test(w) || /^(de|da|do|dos|das|e|o|a)$/i.test(w)).length / words.length > 0.6;

      return hasUppercaseStart && isMostlyUppercase && plainText.length < 120 && plainText.length > 2;
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
          nome: line.replace(/:$/, '').trim().toUpperCase(),
          categoria: 'Conhecimentos Específicos',
          tag: 'teorica',
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
      if (currentContent.length > 0) {
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-1">
            {selectedMentee ? `Edital de ${selectedMentee.displayName || selectedMentee.email.split('@')[0]}` : 'Meu Edital Verticalizado'}
          </h1>
          <p className="text-indigo-400 text-sm font-medium">
            {selectedMentee ? 'Configure e planeje as matérias para o seu aluno.' : 'Controle seu avanço descascando o edital tópico por tópico.'}
          </p>
        </div>
      </header>

      {/* Mentor Toolbox - Templates (Assign only at top) */}
      {isMentor && selectedMentee && (
        <Card className="mb-8 p-6 bg-zinc-900 border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <BrainCircuit size={100} className="text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-400" />
                Ferramentas de Mentor
              </h3>
              <p className="text-xs text-zinc-600">Atribua um edital pré-configurado para este aluno.</p>
            </div>

            <div className="w-full md:w-auto flex flex-col gap-2 min-w-[300px]">
              <Button
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                {showTemplates ? 'Fechar Lista' : 'Ver Meus Templates'}
              </Button>

              {showTemplates && templates.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar mt-2">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 group">
                      <span className="text-xs font-bold text-zinc-300">{t.name}</span>
                      <Button
                        onClick={() => applyTemplate(t.data)}
                        size="sm"
                        className="h-7 text-[9px] px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                      >
                        ATRIBUIR
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {showTemplates && templates.length === 0 && <p className="text-center text-zinc-600 text-[10px] italic">Sem templates.</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Smart Extract Edital Completo - SOMENTE PARA MENTORES - Only if editing/creating */}
      {isMentor && (selectedMentee || editingTemplateId || isCreatingNew) && (
        <Card className="p-6 bg-zinc-900 border-indigo-500/30 shadow-xl rounded-2xl mb-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                 <BrainCircuit size={24} className="text-indigo-400 group-hover:animate-pulse" /> Extração Inteligente
               </h2>
               {!selectedMentee && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => { setIsCreatingNew(false); setEditingTemplateId(null); }}
                   className="text-zinc-500 hover:text-zinc-300"
                 >
                   Cancelar e Voltar para Biblioteca
                 </Button>
               )}
            </div>
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
      )}

      {/* Main Content Area */}
      <div className="animate-in slide-in-from-top-4 fade-in duration-300">
        
        {/* If Mentor is not editing anything, show Library Landing */}
        {isMentor && !selectedMentee && !editingTemplateId && !isCreatingNew ? (
          <div className="max-w-5xl mx-auto space-y-8">
            <Card className="p-12 bg-zinc-950 border-dashed border-zinc-800 text-center flex flex-col items-center gap-6 rounded-3xl">
               <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
                  <FileText size={32} />
               </div>
               <div>
                  <h2 className="text-2xl font-black text-zinc-100 mb-2">Biblioteca de Templates Master</h2>
                  <p className="text-zinc-500 max-w-md mx-auto">Gerencie seus editais padrão ou crie um novo do zero para atribuir aos seus alunos.</p>
               </div>
               <div className="flex gap-4">
                  <Button onClick={startNewTemplate} className="bg-white text-zinc-950 font-black px-8 h-12 hover:bg-zinc-200">
                    CRIAR NOVO TEMPLATE
                  </Button>
               </div>
            </Card>

            {templates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(t => (
                  <div key={t.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-between items-center group hover:border-indigo-500/50 transition-all">
                    <div>
                      <span className="font-bold text-zinc-100 block mb-1">{t.name}</span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{t.data.length} disciplinas cadastradas</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => loadTemplate(t)} variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest text-indigo-400 hover:bg-indigo-400/10 border border-indigo-500/30">
                        CARREGAR EDITAL
                      </Button>
                      <button onClick={() => deleteTemplate(t.id, t.name)} className="text-zinc-700 hover:text-rose-500 p-2">
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* List of Disciplinas (Regular editing view) */
          <div className="space-y-6 max-w-5xl mx-auto">
            {disciplines.length === 0 ? (
              <div className="text-center p-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 border-dashed">
                <GraduationCap className="mx-auto text-zinc-600 mb-4" size={48} />
                <h3 className="text-lg font-bold text-zinc-300">Aguardando inserção de matérias</h3>
                <p className="text-zinc-500 text-sm mt-2">Use a <strong>Extração Inteligente</strong> acima ou adicione manualmente.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Disciplinas no Ciclo Ativo */}
                {disciplines.some(d => activeCycleDiscs.includes(d.id)) && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3 ml-2 drop-shadow-sm">
                      <BrainCircuit className="text-indigo-500" size={24} />
                      No ciclo atual ({disciplines.filter(d => activeCycleDiscs.includes(d.id)).length})
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                      {disciplines
                        .filter(d => activeCycleDiscs.includes(d.id))
                        .map(disc => (
                          <DisciplineBlock
                            key={disc.id}
                            discipline={disc}
                            isMentor={isMentor}
                            selectedMentee={selectedMentee}
                            onRemove={() => removeDiscipline(disc.id)}
                            onChangeCategory={(cat) => updateDisciplineCategory(disc.id, cat)}
                            onChangePhase={(phase) => updateDisciplinePhase(disc.id, phase)}
                            onChangeTag={(tag) => updateDisciplineTag(disc.id, tag)}
                            onAddBulk={(txt) => addTopicosEmMassa(disc.id, txt)}
                            onRemoveTopico={(tid) => removeTopico(disc.id, tid)}
                            onUpdateTopicMetrics={(tid, ph, f, v) => updateTopicMetrics(disc.id, tid, ph, f, v)}
                            onEditTopicoText={(tid, txt) => editTopicoText(disc.id, tid, txt)}
                            onEditName={(newName) => editDisciplineName(disc.id, newName)}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Demais Disciplinas */}
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3 ml-2 italic">
                    <GraduationCap className="text-zinc-700" size={24} />
                    {(selectedMentee || !isMentor) ? `Fomentando o Edital (${disciplines.filter(d => !activeCycleDiscs.includes(d.id)).length})` : `Disciplinas do Edital (${disciplines.length})`}
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {disciplines
                      .filter(d => !activeCycleDiscs.includes(d.id))
                      .map(disc => (
                        <DisciplineBlock
                          key={disc.id}
                          discipline={disc}
                          isMentor={isMentor}
                          selectedMentee={selectedMentee}
                          onRemove={() => removeDiscipline(disc.id)}
                          onChangeCategory={(cat) => updateDisciplineCategory(disc.id, cat)}
                          onChangePhase={(phase) => updateDisciplinePhase(disc.id, phase)}
                          onChangeTag={(tag) => updateDisciplineTag(disc.id, tag)}
                          onAddBulk={(txt) => addTopicosEmMassa(disc.id, txt)}
                          onRemoveTopico={(tid) => removeTopico(disc.id, tid)}
                          onUpdateTopicMetrics={(tid, ph, f, v) => updateTopicMetrics(disc.id, tid, ph, f, v)}
                          onEditTopicoText={(tid, txt) => editTopicoText(disc.id, tid, txt)}
                          onEditName={(newName) => editDisciplineName(disc.id, newName)}
                        />
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* SAVE TEMPLATE BUTTON AT THE END */}
            {isMentor && !selectedMentee && (
              <Card className={`p-8 bg-gradient-to-br border-indigo-500/30 rounded-2xl mt-12 shadow-2xl ${editingTemplateId ? 'from-amber-500/10 to-zinc-900 border-amber-500/50' : 'from-indigo-500/10 to-zinc-900'}`}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldCheck className={editingTemplateId ? 'text-amber-400' : 'text-indigo-400'} />
                  {editingTemplateId ? 'Editando Template' : 'Finalizar e Salvar como Template'}
                </h3>
                <p className="text-sm text-zinc-400 mb-6">
                  {editingTemplateId ? `Você está editando o template "${templateName}". As alterações substituirão o arquivo original.` : 'Salve esta configuração completa para poder atribuí-la rapidamente aos seus alunos depois.'}
                </p>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="Nome do Concurso (Ex: Auditor SEFAZ 2024)"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    className="bg-zinc-950 flex-1 h-14"
                  />
                  <Button onClick={saveTemplate} className={`${editingTemplateId ? 'bg-amber-500 hover:bg-amber-400' : 'bg-white hover:bg-zinc-200'} text-zinc-950 px-10 h-14 font-black uppercase tracking-widest`}>
                    {editingTemplateId ? 'Salvar Alterações' : 'Salvar Novo Template'}
                  </Button>
                  {(editingTemplateId || isCreatingNew) && (
                    <Button onClick={() => { setEditingTemplateId(null); setIsCreatingNew(false); setTemplateName(''); }} variant="outline" className="h-14 px-6 text-zinc-500 border-zinc-800">
                      CANCELAR
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DisciplineBlock({ discipline, selectedMentee, isMentor, onRemove, onChangeCategory, onChangePhase, onChangeTag, onAddBulk, onRemoveTopico, onUpdateTopicMetrics, onEditTopicoText, onEditName }) {
  const [bulkText, setBulkText] = useState('');
  const [isListCollapsed, setIsListCollapsed] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(discipline.nome);

  useEffect(() => {
    setEditName(discipline.nome);
  }, [discipline.nome]);

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
    <Card className={`bg-zinc-900 overflow-hidden rounded-2xl border ${cardBorderClass} transition-all duration-500`}>
      <div className={`p-6 border-b border-zinc-800/50 ${headerBgClass} transition-colors duration-500`}>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">

          {/* Title row — clicking it toggles expand */}
          <div className="w-full flex-1">
            <div
              className="flex items-center gap-2 group/title cursor-pointer"
              onClick={() => setIsListCollapsed(!isListCollapsed)}
            >
              <h3 className="text-2xl font-black text-zinc-100">
                {isEditingName ? (
                  <input
                    type="text"
                    className="bg-zinc-800 border-none rounded px-2 py-1 text-zinc-100 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleSaveName}
                    onBlur={handleSaveName}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  discipline.nome
                )}
              </h3>
              {isMentor && !isEditingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
                  className="opacity-0 group-hover/title:opacity-100 text-zinc-500 hover:text-indigo-400 p-1 h-auto transition-opacity"
                >
                  <Pencil size={16} />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              {isMentor ? (
                <>
                  <select
                    value={discipline.categoria}
                    onChange={(e) => onChangeCategory(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-400 tracking-wider text-[10px] uppercase rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-700 font-black"
                  >
                    <option value="Conhecimentos Gerais">Conhecimentos Gerais</option>
                    <option value="Conhecimentos Específicos">Conhecimentos Específicos</option>
                  </select>

                  <select
                    value={phase}
                    onChange={(e) => onChangePhase(e.target.value)}
                    className={`tracking-wider text-[10px] uppercase rounded px-1.5 py-0.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-black ${selectPhaseClass}`}
                  >
                    <option value="1">Fase 1</option>
                    <option value="2">Fase 2</option>
                    <option value="3">Fase 3</option>
                  </select>

                  <select
                    value={discipline.tag || 'teorica'}
                    onChange={(e) => onChangeTag(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-400 tracking-wider text-[10px] uppercase rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-700 font-black"
                  >
                    <option value="teorica">🟢 Teórica</option>
                    <option value="calculo">🔴 Exatas</option>
                    <option value="analitica">🟡 Analítica</option>
                  </select>
                </>
              ) : (
                <>
                  <span className="bg-zinc-800 text-zinc-500 tracking-wider text-[10px] uppercase rounded px-2 py-0.5 font-bold border border-zinc-700/50">
                    {discipline.categoria === 'Conhecimentos Gerais' ? 'Básica' : 'Específica'}
                  </span>
                  <span className={`tracking-wider text-[10px] uppercase rounded px-2 py-0.5 border font-bold ${selectPhaseClass}`}>
                    Fase {phase}
                  </span>
                  <span className="bg-zinc-800 text-zinc-500 tracking-wider text-[10px] uppercase rounded px-2 py-0.5 font-bold border border-zinc-700/50 flex items-center gap-1">
                    {discipline.tag === 'teorica' ? '🟢 Teórica' : discipline.tag === 'calculo' ? '🔴 Exatas' : '🟡 Analítica'}
                  </span>
                </>
              )}

              <span className="ml-2 font-black text-zinc-600 text-[10px] uppercase tracking-widest">{discipline.topicos.length} tópicos</span>
            </div>
          </div>

          {/* Action buttons — also isolated */}
          <div className="flex gap-2 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => setIsListCollapsed(!isListCollapsed)} className="text-zinc-400 hover:text-zinc-100 p-2">
              {isListCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </Button>
            {isMentor && (
              <Button variant="ghost" size="sm" onClick={onRemove} className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 p-2">
                <Trash size={18} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {!isListCollapsed && (
        <div className="p-6 bg-zinc-950/50 space-y-6 animate-in slide-in-from-top-2 duration-300">

          {isMentor && (
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
          )}

          {discipline.topicos.length > 0 ? (
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
          ) : (
            <div className="py-8 text-center border border-zinc-800/50 border-dashed rounded-xl">
              <p className="text-zinc-600 text-xs italic tracking-wide uppercase">Nenhum tópico cadastrado nesta disciplina.</p>
              <p className="text-zinc-700 text-[10px] mt-1">Cole o texto programático acima para extrair.</p>
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


