import { describe, it, expect } from 'vitest';

describe('Lógica de Rendimento do Mentor', () => {
  it('Deve calcular corretamente os minutos estudados nos últimos 7 dias', () => {
    // Simular o log de estudo diário
    const dailyMinsLog = {
      '2026-04-30': 60,
      '2026-04-29': 30,
      '2026-04-28': 45,
      '2026-04-27': 0,
      '2026-04-26': 120,
      '2026-04-25': 15,
      '2026-04-24': 10,
      '2026-04-23': 100, // Fora do intervalo de 7 dias (se hoje for 30/04)
    };

    // Hoje é 30 de Abril de 2026
    const today = new Date('2026-04-30T12:00:00Z');
    let weeklyMins = 0;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      weeklyMins += Number(dailyMinsLog[dateStr]) || 0;
    }

    // 60+30+45+0+120+15+10 = 280
    expect(weeklyMins).toBe(280);
  });

  it('Deve classificar corretamente o Top Rendimento (sem filtro de 80%)', () => {
    const mockStudents = [
      { id: '1', displayName: 'Aluno A', performance: 75 },
      { id: '2', displayName: 'Aluno B', performance: 90 },
      { id: '3', displayName: 'Aluno C', performance: 60 },
      { id: '4', displayName: 'Aluno D', performance: 85 },
    ];

    const topPerformance = [...mockStudents]
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3);

    expect(topPerformance[0].displayName).toBe('Aluno B');
    expect(topPerformance[1].displayName).toBe('Aluno D');
    expect(topPerformance[2].displayName).toBe('Aluno A');
    expect(topPerformance.length).toBe(3);
  });

  it('Deve classificar corretamente o Top Esforço Semanal', () => {
    const mockStudents = [
      { id: '1', displayName: 'Aluno A', weeklyMins: 100 },
      { id: '2', displayName: 'Aluno B', weeklyMins: 500 },
      { id: '3', displayName: 'Aluno C', weeklyMins: 300 },
      { id: '4', displayName: 'Aluno D', weeklyMins: 0 },
    ];

    const topEffort = [...mockStudents]
      .sort((a, b) => b.weeklyMins - a.weeklyMins)
      .filter(m => m.weeklyMins > 0)
      .slice(0, 3);

    expect(topEffort[0].displayName).toBe('Aluno B');
    expect(topEffort[1].displayName).toBe('Aluno C');
    expect(topEffort[2].displayName).toBe('Aluno A');
    expect(topEffort.find(m => m.id === '4')).toBeUndefined();
  });
});
