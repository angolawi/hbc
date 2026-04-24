export const getPhaseWorkflows = (phase, repriseTime, estudoTime, aplicacaoTime, revisaoTime, descansoTime) => {
  if (phase === "1") {
    return [
      { id: 'reprise', title: 'Reprise Inicial', duration: repriseTime * 60, instr: 'Recorde mentalmente os resumos da última passagem por essa matéria. Use os próximos minutos obrigatoriamente.', unskippable: true },
      { id: 'estude', title: 'Estudo e Produção', duration: estudoTime * 60, instr: 'Estude a teoria e produza o seu PRÓPRIO material de revisão no caderno ou em papel.', requiresUpload: true },
      { id: 'aplicacao', title: 'Aplicação (Teste)', duration: aplicacaoTime * 60, instr: 'Resolva questões lidas ou novas para testar seu conhecimento fresco. Adicione novidades no resumo.' },
      { id: 'revisao', title: 'Revisão (Recorde)', duration: revisaoTime * 60, instr: 'Tente relembrar o conteúdo dos resumos que acabou de produzir sem consultar.' },
      { id: 'descanso', title: 'Descanse', duration: descansoTime * 60, instr: 'Modo difuso. Proibido foco atencional (redes sociais, e-mails). Deixe a mente divagar.' }
    ];
  } else if (phase === "2") {
    return [
      { id: 'reprise', title: 'Reprise Inicial', duration: repriseTime * 60, instr: 'Fase de Consolidação: Relembre mentalmente os resumos anteriores desta matéria. Tempo obrigatório.', unskippable: true },
      { id: 'revise_ini', title: 'Revisão do Tema', duration: estudoTime * 60, instr: 'Recorde o assunto lendo rapidamente os seus resumos já prontos da Fase 1.' },
      { id: 'aplique', title: 'Aplicação', duration: aplicacaoTime * 60, instr: 'Resolva questões intensamente. Obrigatório: Anote no verso da página do resumo o órgão e o ano de cada pegadinha.', requiresCheckbox: true },
      { id: 'revise_fim', title: 'Revisão do Resumo', duration: revisaoTime * 60, instr: 'Tente relembrar as informações estancadas e as novidades que acabou de atualizar no resumo.' },
      { id: 'descanso', title: 'Descanse', duration: descansoTime * 60, instr: 'Pausa da sua consolidação. Proibido foco atencional. Relaxe a mente.' }
    ];
  } else {
    return [
      { id: 'aplique', title: 'Aplicação', duration: aplicacaoTime * 60, instr: 'Resolva questões sem parar (Prova de Fogo). Alimente seu caderno de erros e anote os órgãos/anos no seu resumo.', requiresMultiCheckboxes: true },
      { id: 'revise', title: 'Enriquecimento do Resumo', duration: revisaoTime * 60, instr: 'Revise os resumos novos que você precisou criar/atualizar para consertar erros nos últimos minutos.' }
    ];
  }
};

export const TIMER_STORAGE_KEY = 'simpl_timer_session';

export const calculateRemainingTime = (targetTimestamp) => {
  if (!targetTimestamp) return 0;
  const remaining = Math.round((targetTimestamp - Date.now()) / 1000);
  return Math.max(0, remaining);
};


export const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
