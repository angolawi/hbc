import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, ClipboardPaste, Check, Lock, AlertCircle, Loader2 } from 'lucide-react';

const SYSTEM_COLORS = [
  { id: 1, name: 'Laranja', color: 'bg-orange-500' },
  { id: 2, name: 'Vermelho', color: 'bg-red-500' },
  { id: 3, name: 'Teal', color: 'bg-teal-600' },
  { id: 4, name: 'Sky', color: 'bg-sky-500' },
  { id: 5, name: 'Roxo', color: 'bg-purple-500' },
  { id: 6, name: 'Esmeralda', color: 'bg-emerald-500' },
  { id: 7, name: 'Pink', color: 'bg-pink-500' },
  { id: 8, name: 'Âmbar', color: 'bg-amber-400' },
];

const parseSheetDate = (text) => {
  if (!text) return null;
  
  // DD/MM/YYYY ou DD/MM
  const slashMatch = text.match(/(\d{1,2})[\/\.-](\d{1,2})([\/\.-](\d{4}))?/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1]);
    const m = parseInt(slashMatch[2]) - 1;
    const y = slashMatch[4] ? parseInt(slashMatch[4]) : new Date().getFullYear();
    const date = new Date(y, m, d, 12, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }

  // DD-MMM (ex: 25-abr)
  const monthMap = {
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, set: 8, oct: 9, out: 9, nov: 10, dec: 11, dez: 11
  };
  const mmmMatch = text.match(/(\d{1,2})[-/]([a-z]{3})/i);
  if (mmmMatch) {
    const d = parseInt(mmmMatch[1]);
    const mStr = mmmMatch[2].toLowerCase();
    const m = monthMap[mStr];
    if (m !== undefined) {
      const date = new Date(new Date().getFullYear(), m, d, 12, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
};

export default function SpreadsheetImportModal({ isOpen, onClose, onImport, targetInstance, subjects, isHistory }) {
  const [step, setStep] = useState(1); // 1: Paste, 2: Map Colors, 3: Confirm
  const [pastedHtml, setPastedHtml] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [colorMap, setColorMap] = useState({}); // { '#ff0000': 1 }
  const [foundColors, setFoundColors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedColor, setSelectedColor] = useState(6); // Default Esmeralda
  const [detectedStartDate, setDetectedStartDate] = useState(null);
  const [shouldUpdateDate, setShouldUpdateDate] = useState(false);

  if (!isOpen) return null;

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    if (!html) {
      alert("Nenhum dado de tabela encontrado. Tente copiar um intervalo no Google Sheets.");
      return;
    }
    setPastedHtml(html);
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

    // 1. Matriz Raw
    const rawMatrix = trs.map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => ({
            text: td.innerText.trim(),
            bg: (td.style.backgroundColor || '').replace(/\s/g, '').toLowerCase()
        }))
    );

    const numCols = Math.max(...rawMatrix.map(r => r.length));

    // 2. Detectar Base Color por coluna
    const colBases = Array.from({ length: numCols }, (_, cIdx) => {
        const bgCounts = {};
        rawMatrix.forEach(row => {
            const cell = row[cIdx];
            if (cell && cell.bg && cell.bg !== 'transparent' && cell.bg !== 'rgba(0,0,0,0)') {
                bgCounts[cell.bg] = (bgCounts[cell.bg] || 0) + 1;
            }
        });
        const sorted = Object.entries(bgCounts).sort((a,b) => b[1] - a[1]);
        return (sorted.length > 0 && sorted[0][1] > rawMatrix.length / 2) ? sorted[0][0] : null;
    });

    // 3. Mapear dados
    const finalData = rawMatrix.map((row, rIdx) => {
        return row.map((cell, cIdx) => {
            const { text, bg } = cell;
            const baseColor = colBases[cIdx];

            const isWhite = !bg || bg === 'transparent' || bg === 'rgba(0,0,0,0)' || bg === 'rgb(255,255,255)' || bg === '#ffffff';
            const isBase = bg && bg === baseColor;
            
            let type = 0;
            if (text.toLowerCase() === 'x') type = 'X';
            else if (!isWhite && !isBase) type = 1;

            return { text, type };
        });
    });

    setParsedData(finalData);
    
    // 4. Detectar Data
    let foundDate = null;
    for (let r = 0; r < Math.min(finalData.length, 3); r++) {
        for (let c = 1; c < finalData[r].length; c++) {
            const d = parseSheetDate(finalData[r][c].text);
            if (d) { foundDate = d; break; }
        }
        if (foundDate) break;
    }

    if (foundDate) {
        let colOfDate = -1;
        searchLoop: for (let r = 0; r < Math.min(finalData.length, 3); r++) {
            for (let c = 1; c < finalData[r].length; c++) {
                if (parseSheetDate(finalData[r][c].text)) {
                    colOfDate = c;
                    break searchLoop;
                }
            }
        }

        const baseDate = new Date(foundDate);
        if (colOfDate !== -1) {
            baseDate.setDate(baseDate.getDate() - (colOfDate - 1));
        }

        setDetectedStartDate(baseDate);
        setShouldUpdateDate(true);

        // Limpar preenchimento automático nos fins de semana
        const cleanedData = finalData.map(row => {
            return row.map((cell, cIdx) => {
                if (cIdx === 0) return cell;
                const d = new Date(baseDate);
                d.setDate(d.getDate() + (cIdx - 1));
                const isWK = d.getDay() === 0 || d.getDay() === 6;
                if (isWK) return { ...cell, type: 0 };
                return cell;
            });
        });
        setParsedData(cleanedData);
    }

    setStep(3);
    setIsProcessing(false);
  };

  const toggleCell = (rIdx, cIdx) => {
    const newData = [...parsedData];
    const cell = { ...newData[rIdx][cIdx] };
    
    // Cycle: 0 (empty) -> 1 (color) -> 'X' (review) -> 0
    if (cell.type === 0) cell.type = 1;
    else if (cell.type === 1) cell.type = 'X';
    else cell.type = 0;
    
    newData[rIdx][cIdx] = cell;
    setParsedData(newData);
  };

  const handleFinish = () => {
    const importResults = [];
    
    // Usar data detectada se o usuário confirmou, senão usar a original
    const effectiveBase = (shouldUpdateDate && detectedStartDate) ? detectedStartDate : new Date(targetInstance.startDate);
    const base = new Date(effectiveBase);
    base.setHours(12,0,0,0);
    const dates = [];
    for(let i=0; i<30; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
    }

    // Tenta encontrar a linha de cabeçalho (que contém datas)
    // No Sheets, costuma ser a primeira ou segunda linha
    let headerIdx = -1;
    for(let i=0; i<3; i++) {
      if (parsedData[i]?.some(c => c.text.match(/\d/))) {
        headerIdx = i;
        break;
      }
    }

    const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;

    parsedData.slice(startRow).forEach((row) => {
        if (row.length < 2) return;
        const sheetSubject = row[0].text;
        const systemSubject = subjects.find(s => 
            s.toLowerCase().trim() === sheetSubject.toLowerCase().trim()
        );

        let finalSubject = systemSubject || (isHistory ? sheetSubject.trim() : null);
        if (finalSubject) finalSubject = finalSubject.toUpperCase();

        if (finalSubject) {
            row.slice(1).forEach((cell, cIdx) => {
                if (cIdx < dates.length && cell.type !== 0) {
                    const dateObj = new Date(dates[cIdx] + 'T12:00:00');
                    // Importar se houver valor, mesmo no fim de semana 
                    // (valor agora só existirá no FDS se o mentor marcou no preview)
                    importResults.push({
                        discipline: finalSubject,
                        date: dates[cIdx],
                        status: cell.type === 1 ? selectedColor : 'X'
                    });
                }
            });
        }
    });

    const importedDisciplines = [...new Set(importResults.map(r => r.discipline))];
    onImport(importResults, (shouldUpdateDate && detectedStartDate) ? detectedStartDate.toISOString() : null, importedDisciplines);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-5xl bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardPaste className="text-rose-500" size={20} />
              Importar do Google Sheets
            </h2>
            <p className="text-zinc-500 text-xs mt-1">Sincronize seu progresso visual em segundos.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="text-center py-12">
              <div 
                onPaste={handlePaste}
                contentEditable
                suppressContentEditableWarning
                className="w-full h-40 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/5 transition-all group outline-none overflow-hidden relative"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {isProcessing ? (
                        <Loader2 className="animate-spin text-rose-500" size={40} />
                    ) : (
                        <ClipboardPaste className="text-zinc-700 group-hover:text-rose-500 transition-colors" size={48} />
                    )}
                    <p className="mt-4 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                        {isProcessing ? 'Processando Tabela...' : 'Clique aqui e dê CTRL+V'}
                    </p>
                </div>
              </div>
              <p className="mt-6 text-zinc-600 text-xs max-w-xs mx-auto">
                Selecione as células no Google Sheets, copie e cole na área acima. Capturaremos as cores automaticamente.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="py-2 animate-in slide-in-from-right-4 duration-300">
               <div className="flex flex-col md:flex-row gap-8 mb-8 items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Tabela Detectada!</h3>
                    <p className="text-zinc-500 text-sm mb-6">
                      Revise o mapeamento abaixo. Clique nas células para marcar/desmarcar manualmente.
                    </p>

                    {detectedStartDate && (
                        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-4 text-left">
                            <input 
                                type="checkbox" 
                                id="updateStartDate"
                                checked={shouldUpdateDate}
                                onChange={(e) => setShouldUpdateDate(e.target.checked)}
                                className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500 cursor-pointer"
                            />
                            <label htmlFor="updateStartDate" className="text-xs text-zinc-300 font-medium cursor-pointer">
                                Detectamos início em: <strong className="text-rose-400">{detectedStartDate.toLocaleDateString('pt-BR')}</strong>. 
                                Atualizar grid para esta data?
                            </label>
                        </div>
                    )}
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shrink-0">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-3 text-center">Cor do marcador</p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-[200px]">
                      {SYSTEM_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedColor(c.id)}
                          className={`w-8 h-8 rounded-full transition-all border-2 ${c.color} ${selectedColor === c.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
               </div>

               {/* Grid Preview */}
               <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden mb-8 shadow-inner">
                 <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Visualização de Importação</span>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 grayscale">
                          <div className={`w-3 h-3 rounded-sm ${SYSTEM_COLORS.find(c => c.id === selectedColor)?.color}`} />
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">Estudado</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">X</span>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">Revisão</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-zinc-800 border border-zinc-700" />
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">Fim de Semana (Ignorado)</span>
                        </div>
                    </div>
                 </div>
                 <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full border-collapse">
                      <thead>
                        <tr>
                           <th className="bg-zinc-900 p-2 border-b border-r border-zinc-800 text-left text-[10px] font-bold text-zinc-400 sticky left-0 z-10 w-40 min-w-[160px]">MATÉRIA</th>
                           {(() => {
                              const effectiveBase = (shouldUpdateDate && detectedStartDate) ? detectedStartDate : new Date(targetInstance.startDate);
                              const base = new Date(effectiveBase);
                              base.setHours(12,0,0,0);
                              return Array.from({length: 30}).map((_, i) => {
                                 const d = new Date(base);
                                 d.setDate(base.getDate() + i);
                                 const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                 return (
                                    <th key={i} className={`p-1 border-b border-zinc-800 text-[9px] font-mono ${isWeekend ? 'bg-zinc-800/50 text-zinc-500' : 'text-zinc-600'}`}>
                                       {d.getDate()}/{d.getMonth()+1}
                                    </th>
                                 )
                              });
                           })()}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                            let headerIdx = -1;
                            for(let i=0; i<3; i++) {
                              if (parsedData[i]?.some(c => c.text.match(/\d/))) {
                                headerIdx = i;
                                break;
                              }
                            }
                            const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
                            const rows = parsedData.slice(startRow).filter(r => r[0]?.text);
                            
                            return rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-zinc-900/30">
                                 <td className="p-2 border-b border-r border-zinc-800 text-[10px] font-bold text-zinc-300 sticky left-0 bg-zinc-950 w-40 min-w-[160px] truncate" title={row[0].text}>
                                   {row[0].text}
                                 </td>
                                 {row.slice(1, 31).map((cell, cIdx) => {
                                    const effectiveBase = (shouldUpdateDate && detectedStartDate) ? detectedStartDate : new Date(targetInstance.startDate);
                                    const d = new Date(effectiveBase);
                                    d.setDate(d.getDate() + cIdx);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    
                                    let bg = isWeekend ? "bg-zinc-800/20" : "bg-transparent";
                                    if (cell.type === 1) bg = SYSTEM_COLORS.find(cl => cl.id === selectedColor)?.color || "bg-rose-500";
                                    
                                    return (
                                      <td 
                                        key={cIdx} 
                                        onClick={() => toggleCell(startRow + rIdx, 1 + cIdx)}
                                        className={`p-0 border-b border-zinc-800/50 w-7 h-7 min-w-[28px] text-center cursor-pointer hover:brightness-125 transition-all ${bg}`}
                                      >
                                        {cell.type === 'X' && <span className="text-[10px] font-bold text-zinc-400">X</span>}
                                      </td>
                                    )
                                 })}
                              </tr>
                            ));
                        })()}
                      </tbody>
                   </table>
                 </div>
               </div>
               
               <div className="flex gap-4">
                 <Button variant="ghost" onClick={() => setStep(1)} className="text-zinc-500 flex-1 h-12">
                   Cancelar e Recomeçar
                 </Button>
                 <Button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-500 text-white flex-[2] h-12 font-bold shadow-lg shadow-emerald-900/20">
                   Confirmar Importação de Dados
                 </Button>
               </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
