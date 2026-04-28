import { describe, it, expect } from 'vitest';

describe('Cálculo de Métricas do Dashboard', () => {
  it('Deve somar corretamente questões do edital com estatísticas semanais', () => {
    // Simulando o mock de disciplinas do edital
    const mockDisciplines = [
      {
        id: 'disc-1',
        nome: 'DIREITO CONSTITUCIONAL',
        weeklyStats: {
          'week-1': { certas: 10, resolvidas: 15 },
          'week-2': { certas: 5, resolvidas: 5 }
        },
        topicos: [
          {
            id: 'top-1',
            texto: 'Direitos Fundamentais',
            fase1: { certas: '8', resolvidas: '10' },
            fase2: { certas: '10', resolvidas: '10' }
          }
        ]
      }
    ];

    let totalCertas = 0;
    let totalResolvidas = 0;

    mockDisciplines.forEach(disc => {
      let discCertas = 0;
      let discResolvidas = 0;

      if (disc.weeklyStats) {
        Object.values(disc.weeklyStats).forEach(w => {
          discCertas += Number(w.certas) || 0;
          discResolvidas += Number(w.resolvidas) || 0;
        });
      }

      if (disc.topicos && Array.isArray(disc.topicos)) {
        disc.topicos.forEach(topico => {
          let tCertas = 0;
          let tResolvidas = 0;

          ['fase1', 'fase2', 'fase3'].forEach(fase => {
            if (topico[fase]) {
              tCertas += Number(topico[fase].certas) || 0;
              tResolvidas += Number(topico[fase].resolvidas) || 0;
            }
          });

          discCertas += tCertas;
          discResolvidas += tResolvidas;
        });
      }

      totalCertas += discCertas;
      totalResolvidas += discResolvidas;
    });

    // 15 de weeklyStats + 18 de tópicos = 33 Certas
    // 20 de weeklyStats + 20 de tópicos = 40 Resolvidas
    expect(totalCertas).toBe(33);
    expect(totalResolvidas).toBe(40);
  });

  it('Deve garantir cálculo seguro de porcentagem evitando divisões por zero', () => {
    const totalCertas = 0;
    const totalResolvidas = 0;
    const dsptotal = totalResolvidas > 0 ? (totalCertas / totalResolvidas) * 100 : 0;
    expect(dsptotal).toBe(0);
  });
});
