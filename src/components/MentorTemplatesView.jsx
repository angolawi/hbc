import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { FileText, Trash, Edit3, Eye, Search, Layers, ListChecks, ChevronLeft } from 'lucide-react';

export default function MentorTemplatesView({ setActiveTab }) {
  const { user } = useAuth();
  const { alert, confirm } = useNotification();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(false);
    const { data } = await supabase
      .from('edital_templates')
      .select('*')
      .eq('mentor_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setTemplates(data);
    setLoading(false);
  };

  const deleteTemplate = async (id, name) => {
    const confirmed = await confirm(`Deseja excluir permanentemente o template "${name}"?`);
    if (confirmed) {
      const { error } = await supabase.from('edital_templates').delete().eq('id', id);
      if (!error) {
        alert("Template removido com sucesso!", "success");
        fetchTemplates();
        if (previewTemplate?.id === id) setPreviewTemplate(null);
      }
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
      return <div className="p-20 text-center text-zinc-500">Carregando Biblioteca...</div>;
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen p-4 md:p-8 w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-100 flex items-center gap-3">
            <Layers className="text-indigo-400" size={32} />
            Biblioteca de Templates
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-bold tracking-widest">Gerencie seus editais mestres e padrões de estudo.</p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>
      </header>

      {previewTemplate ? (
        <div className="animate-in fade-in zoom-in-95 duration-300">
           <Button 
                variant="ghost" 
                onClick={() => setPreviewTemplate(null)} 
                className="mb-6 text-zinc-400 hover:text-white flex items-center gap-2"
           >
              <ChevronLeft size={18} /> Voltar para a Lista
           </Button>

           <Card className="p-8 bg-zinc-900 border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                  <FileText size={150} className="text-indigo-500" />
              </div>

              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                      <div>
                          <h2 className="text-2xl font-black text-zinc-100">{previewTemplate.name}</h2>
                          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-black">Estrutura de Disciplinas</p>
                      </div>
                      <div className="flex gap-3">
                         <Button 
                            onClick={() => {
                                // Redirecionar para EditalView e carregar o template seria ideal
                                // Por agora, vamos apenas sugerir ir lá, ou podemos implementar o roteamento
                                alert("Carregue este template na aba 'Gerenciar Editais' para fazer alterações.");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                         >
                            <Edit3 size={16} className="mr-2" /> Editar Conteúdo
                         </Button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {previewTemplate.data.map((disc, idx) => (
                        <div key={idx} className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
                            <h4 className="font-bold text-zinc-200 mb-3 flex items-center justify-between">
                                {disc.nome}
                                <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{disc.topicos?.length || 0} Tópicos</span>
                            </h4>
                            <div className="space-y-1.5 overflow-hidden">
                                {disc.topicos?.slice(0, 5).map((t, tidx) => (
                                    <p key={tidx} className="text-[11px] text-zinc-500 truncate">• {t.texto}</p>
                                ))}
                                {disc.topicos?.length > 5 && (
                                    <p className="text-[10px] text-zinc-600 italic mt-2">+ {disc.topicos.length - 5} outros tópicos...</p>
                                )}
                            </div>
                        </div>
                      ))}
                  </div>
              </div>
           </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {filteredTemplates.length === 0 ? (
             <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                <FileText size={64} className="text-zinc-800" />
                <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Nenhum template encontrado.</p>
                <Button onClick={() => setActiveTab('edital')} className="mt-2 bg-zinc-800 text-zinc-400 hover:text-white">Criar Novo Template</Button>
             </div>
           ) : (
             filteredTemplates.map(t => (
                <Card key={t.id} className="p-6 bg-zinc-900 border-zinc-800 rounded-3xl shadow-xl group hover:border-indigo-500/30 transition-all hover:-translate-y-1">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                         <FileText size={24} />
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => deleteTemplate(t.id, t.name)} className="p-2 text-zinc-600 hover:text-rose-500">
                            <Trash size={18} />
                         </button>
                      </div>
                   </div>

                   <h3 className="text-xl font-bold text-zinc-100 mb-2 truncate">{t.name}</h3>
                   <div className="flex items-center gap-4 mb-8">
                       <div className="flex items-center gap-1.5">
                           <ListChecks size={14} className="text-zinc-500" />
                           <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t.data.length} Disciplinas</span>
                       </div>
                   </div>

                   <div className="flex gap-3">
                      <Button onClick={() => setPreviewTemplate(t)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center gap-2">
                         <Eye size={16} /> Ver Estrutura
                      </Button>
                   </div>
                </Card>
             ))
           )}
        </div>
      )}
    </section>
  );
}
