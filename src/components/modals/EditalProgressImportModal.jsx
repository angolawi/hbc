import { useState } from 'react';
import { Button } from '../ui/Button';


import { Card } from '../ui/Card';
import { X, ClipboardPaste, AlertCircle, Loader2 } from 'lucide-react';

const parseSheetDate = (text) => {
  if (!text) return '';
  const str = text.trim();
  const slashMatch = str.match(/(?:^|\s)(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](\d{4}))?(?:\s|$)/);
  if (slashMatch) {
    let d = slashMatch[1].padStart(2, '0');
    let m = slashMatch[2].padStart(2, '0');
    let y = slashMatch[3] ? slashMatch[3] : new Date().getFullYear().toString();
    return `${y}-${m}-${d}`;
  }
  return '';
};

const parseNumber = (text) => {
  if (!text) return '';
  const cleaned = text.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10).toString() : '';
};

export default function EditalProgressImportModal({ isOpen, onClose, onImport, disciplines = [] }) {
  const [step, setStep] = useState(1);
  const [extractedTopics, setExtractedTopics] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState('');

  if (!isOpen) return null;



  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    if (!html) {
      alert("Nenhum dado de tabela encontrado. Copie diretamente do Google Sheets ou Excel.");
      return;
    }
    processHtml(html);
  };

  const processHtml = (html) => {
    setIsProcessing(true);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const trs = Array.from(doc.querySelectorAll('tr'));

    if (trs.length === 0) {
      alert("Não foi possível encontrar linhas na tabela colada.");
      setIsProcessing(false);
      return;
    }

    // Identificar a linha de cabeçalho "CONTEÚDO" e a quantidade de colunas
    let mainColIndex = 0;
    
    // Parse each row
    const topics = [];
    trs.forEach((tr) => {
      const tds = Array.from(tr.querySelectorAll('td, th'));
      if (tds.length < 2) return;

      const cells = tds.map(td => td.innerText.trim());
      const colText = cells[0]?.toLowerCase() || '';

      // Skip header rows
      if (colText.includes('conteúdo') || colText.includes('conteudo') || colText.includes('fase') || !colText) {
        return;
      }

      // Expected Column Mapping:
      // 0: Topic Text
      // 1: F1 Início, 2: F1 Conclusão, 3: F1 Certas, 4: F1 Resolvidas, 5: F1 Porcentagem
      // 6: F2 Início, 7: F2 Conclusão, 8: F2 Certas, 9: F2 Resolvidas, 10: F2 Porcentagem
      // 11: F3 Certas, 12: F3 Resolvidas, 13: F3 Porcentagem

      const topicData = {
        originalText: cells[0],
        metrics: {
          fase1: {
            inicio: parseSheetDate(cells[1]),
            conclusao: parseSheetDate(cells[2]),
            certas: parseNumber(cells[3]),
            resolvidas: parseNumber(cells[4])
          },
          fase2: {
            inicio: parseSheetDate(cells[6]),
            conclusao: parseSheetDate(cells[7]),
            certas: parseNumber(cells[8]),
            resolvidas: parseNumber(cells[9])
          },
          fase3: {
            certas: parseNumber(cells[11]),
            resolvidas: parseNumber(cells[12])
          }
        }
      };

      // Só adicionar se houver métricas ou se for um tópico legítimo
      const hasAnyMetric = Object.values(topicData.metrics.fase1).some(v => v) || 
                           Object.values(topicData.metrics.fase2).some(v => v) || 
                           Object.values(topicData.metrics.fase3).some(v => v);
      
      if (hasAnyMetric && topicData.originalText.length > 2) {
        topics.push(topicData);
      }
    });

    setExtractedTopics(topics);
    setStep(2);
    setIsProcessing(false);
  };

  const getMatchedTopicText = (extractedText) => {
    if (!selectedDisciplineId) return null;
    const targetDiscipline = disciplines.find(d => d.id === selectedDisciplineId);
    if (!targetDiscipline || !targetDiscipline.topicos) return null;

    const normalizeTopic = (str) => {
       return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
    };

    const normEt = normalizeTopic(extractedText);
    if (normEt.length < 5) return null;

    const match = targetDiscipline.topicos.find(top => {
      const normTop = normalizeTopic(top.texto);
      if (normTop.length < 5) return false;
      return normTop.includes(normEt) || normEt.includes(normTop);
    });

    return match ? match.texto : null;
  };

  const handleConfirm = () => {
    if (!selectedDisciplineId) {
      alert("Por favor, selecione a disciplina correspondente no edital.");
      return;
    }
    onImport(extractedTopics, selectedDisciplineId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-4xl bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        <div className="flex justify-between items-center p-6 bg-zinc-900 border-b border-zinc-800/80">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-100">
              <ClipboardPaste className="text-indigo-400" size={24} />
              Importar Progresso da Planilha
            </h2>
            <p className="text-sm text-zinc-400">Extraia métricas (datas e questões) para mesclar ao seu Edital.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-10 w-10 p-0 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800">
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {step === 1 && (
            <div className="max-w-2xl mx-auto text-center mt-6 animate-in slide-in-from-bottom-4">
              <div 
                contentEditable
                suppressContentEditableWarning
                onPaste={handlePaste}
                className="w-full h-56 border-2 border-dashed border-zinc-700 bg-zinc-900/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-500/5 transition-colors focus:outline-none ring-offset-zinc-950 focus:border-indigo-500 group relative overflow-hidden"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {isProcessing ? (
                    <Loader2 className="animate-spin text-indigo-400 mb-4" size={48} />
                  ) : (
                    <ClipboardPaste className="text-zinc-600 group-hover:text-indigo-400 mb-4 transition-colors" size={56} />
                  )}
                  <p className="text-sm font-bold text-zinc-300">
                    {isProcessing ? 'Processando dados...' : 'Cole sua tabela do Google Sheets aqui (CTRL+V)'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Dica: Selecione a matriz a partir da coluna CONTEÚDO até a Fase 3</p>
                </div>
              </div>

              <div className="mt-8 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-left items-start">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-amber-200/80">
                  <strong className="text-amber-400 block mb-1">Como a importação funciona?</strong>
                  Copiaremos as datas de início/conclusão e quantidade de questões certas/resolvidas. 
                  Para garantir o pareamento correto, a planilha deve estar no formato padrão Fases (Fase 1, Fase 2, Fase 3) com as colunas em ordem padrão.
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right-4">
              <h3 className="text-lg font-bold text-zinc-100 mb-2">Tópicos e Métricas Detectados ({extractedTopics.length})</h3>
              <p className="text-sm text-zinc-400 mb-6">Confira as métricas que serão mapeadas no sistema baseadas na similaridade dos textos com os tópicos do edital.</p>
              
              <div className="mb-6 bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 block">Disciplina Alvo no Edital:</label>
                  <p className="text-xs text-zinc-500">Selecione em qual matéria as linhas da planilha serão inseridas.</p>
                </div>
                <select
                  value={selectedDisciplineId}
                  onChange={(e) => setSelectedDisciplineId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 md:min-w-[320px] cursor-pointer"
                >
                  <option value="">-- Escolha uma Disciplina --</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-inner mb-6">
                <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-zinc-950 sticky top-0 z-10 hidden md:table-header-group">
                       <tr>
                         <th className="p-3 border-b border-zinc-800 font-bold text-zinc-500 uppercase">Tópico (Planilha)</th>
                         <th className="p-3 border-b border-zinc-800 font-bold text-zinc-500 uppercase">Mapeado Para (Edital)</th>
                         <th className="p-3 border-b border-zinc-800 font-bold text-zinc-500 uppercase text-center border-l bg-amber-900/10" colSpan={2}>Fase 1 (Acertos/Resol.)</th>
                         <th className="p-3 border-b border-zinc-800 font-bold text-zinc-500 uppercase text-center border-l bg-emerald-900/10" colSpan={2}>Fase 2 (Acertos/Resol.)</th>
                         <th className="p-3 border-b border-zinc-800 font-bold text-zinc-500 uppercase text-center border-l bg-rose-900/10" colSpan={2}>Fase 3 (Acertos/Resol.)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {extractedTopics.slice(0, 100).map((t, idx) => {
                        const matchedText = getMatchedTopicText(t.originalText);
                        return (
                          <tr key={idx} className="hover:bg-zinc-800/30 flex flex-col md:table-row py-3 md:py-0">
                            <td className="p-3 text-zinc-300 font-medium md:max-w-xs truncate" title={t.originalText}>
                              {t.originalText}
                            </td>
                            <td className="p-3 font-medium md:max-w-xs truncate" title={matchedText || 'Não localizado'}>
                              {matchedText ? (
                                <span className="text-emerald-400 flex items-center gap-1 font-bold">✓ {matchedText}</span>
                              ) : (
                                <span className="text-zinc-600 italic text-[10px]">{selectedDisciplineId ? '❌ Não Localizado' : 'Aguardando disciplina...'}</span>
                              )}
                            </td>
                          <td className="p-2 md:p-3 text-zinc-400 text-center border-t md:border-t-0 md:border-l border-zinc-800/60 w-24">
                            <span className="md:hidden text-zinc-600 font-bold mr-2 text-[10px]">F1 Certas:</span>
                            {t.metrics.fase1.certas || '-'}
                          </td>
                          <td className="p-2 md:p-3 text-zinc-400 text-center w-24">
                            <span className="md:hidden text-zinc-600 font-bold mr-2 text-[10px]">F1 Res.:</span>
                            {t.metrics.fase1.resolvidas || '-'}
                          </td>
                          <td className="p-2 md:p-3 text-zinc-400 text-center md:border-l border-zinc-800/60 w-24">
                            <span className="md:hidden text-zinc-600 font-bold mr-2 text-[10px]">F2 Certas:</span>
                            {t.metrics.fase2.certas || '-'}
                          </td>
                          <td className="p-2 md:p-3 text-zinc-400 text-center w-24">
                            <span className="md:hidden text-zinc-600 font-bold mr-2 text-[10px]">F2 Res.:</span>
                            {t.metrics.fase2.resolvidas || '-'}
                          </td>
                          <td className="p-2 md:p-3 text-zinc-400 text-center md:border-l border-zinc-800/60 w-24">
                            <span className="md:hidden text-zinc-600 font-bold mr-2 text-[10px]">F3 Certas:</span>
                            {t.metrics.fase3.certas || '-'}
                          </td>
                          <td className="p-2 md:p-3 text-zinc-400 text-center w-24">
                            <span className="md:hidden text-zinc-600 font-bold mr-2 text-[10px]">F3 Res.:</span>
                            {t.metrics.fase3.resolvidas || '-'}
                          </td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                  Voltar
                </Button>
                <Button onClick={handleConfirm} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 font-bold uppercase tracking-wider text-sm shadow-xl shadow-indigo-900/20">
                  Mesclar com Edital Ativo
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
