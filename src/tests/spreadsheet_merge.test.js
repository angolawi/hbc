import { describe, it, expect } from 'vitest';

describe('Processamento de Mesclagem de Planilha', () => {
  const normalizeTopic = (str) => {
    return str
      ? str.normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "")
           .replace(/[^a-zA-Z0-9]/g, '')
           .toLowerCase()
      : '';
  };

  it('Deve normalizar caracteres especiais e espaços consistentemente', () => {
    const rawA = "Direito Constitucional: Princípios";
    const rawB = "direito constitucional principios";
    expect(normalizeTopic(rawA)).toBe(normalizeTopic(rawB));
  });

  it('Deve casar tópicos flexíveis contidos um no outro', () => {
    const normTop = normalizeTopic("Controle de Constitucionalidade Concentrado");
    const normEt = normalizeTopic("Controle de Constitucionalidade");

    const isMatch = normTop.includes(normEt) || normEt.includes(normTop);
    expect(isMatch).toBe(true);
  });
});
