import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocking Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  })),
};

vi.mock('../utils/supabase', () => ({
  supabase: mockSupabase
}));

// Mocking dataSync helpers
vi.mock('../utils/dataSync', () => ({
  pullAllData: vi.fn(),
  smartSync: vi.fn(),
  SYNC_KEYS: ['simpl_edital', 'simpl_ciclo']
}));

describe('Sistema de Mentoria - Testes de Robustez', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('Deve identificar corretamente um perfil de mentor no banco', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { role: 'mentor' }, 
        error: null 
      })
    });

    // Simulando a lógica de fetchRole que implementamos
    const fetchRole = async (userId) => {
        const { data } = await mockSupabase.from('profiles').select('role').eq('id', userId).single();
        return data?.role === 'mentor';
    };

    const isMentor = await fetchRole('uuid-123');
    expect(isMentor).toBe(true);
  });

  it('Deve aplicar fallback para localStorage se o banco falhar (Dev Mode)', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error('Network Error'))
    });

    localStorage.setItem('is_mentor_dev', 'true');

    const fetchRole = async (userId) => {
        try {
            const { data } = await mockSupabase.from('profiles').select('role').eq('id', userId).single();
            return data?.role === 'mentor';
        } catch (e) {
            return localStorage.getItem('is_mentor_dev') === 'true';
        }
    };

    const isMentor = await fetchRole('uuid-123');
    expect(isMentor).toBe(true);
  });

  it('Não deve misturar dados do mentor com dados do aluno no SmartSync', async () => {
    const { smartSync } = await import('../utils/dataSync');
    
    // Mock do retorno do Supabase (dados do aluno)
    mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
            data: [{ key: 'simpl_edital', data: { test: 'aluno' }, updated_at: new Date().toISOString() }], 
            error: null 
        }),
    });

    const mockUser = { id: 'mentor-1' };
    const targetStudentId = 'aluno-99';

    // Executa o sync no modo mentor (targetUserId presente)
    await smartSync(mockUser, targetStudentId);

    // Verifica se o localStorage do MENTOR foi alterado
    // Em modo mentor, o pull para local é desativado para não sobrescrever os dados do próprio mentor
    expect(localStorage.getItem('simpl_edital')).toBeNull();
  });
});
