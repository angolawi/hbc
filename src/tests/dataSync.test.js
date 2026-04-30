import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pushData, smartSync, getSyncHistory, SYNC_KEYS } from '../utils/dataSync';
import { supabase } from '../utils/supabase';

// Mock do Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('DataSync Utility', () => {
  let localStorageMock = {};

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};
    
    // Mock do LocalStorage
    global.localStorage = {
      getItem: vi.fn((key) => localStorageMock[key] || null),
      setItem: vi.fn((key, value) => { localStorageMock[key] = value.toString(); }),
      removeItem: vi.fn((key) => { delete localStorageMock[key]; }),
      clear: vi.fn(() => { localStorageMock = {}; }),
    };

    // Mock do dispatchEvent
    global.window.dispatchEvent = vi.fn();
  });

  describe('pushData', () => {
    const mockUser = { id: 'user-123' };

    it('deve fazer upsert de dados com sucesso e atualizar timestamp local', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({
        upsert: upsertMock,
        eq: vi.fn().mockReturnThis(),
      });

      const testData = { foo: 'bar' };
      await pushData('simpl_edital', testData, mockUser);

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          key: 'simpl_edital',
          data: testData
        }),
        { onConflict: ['user_id', 'key'] }
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'simpl_edital_timestamp',
        expect.any(String)
      );
    });

    it('deve usar targetUserId quando fornecido (Modo Mentor) e não atualizar timestamp local', async () => {
      const targetId = 'student-456';
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      supabase.from.mockReturnValue({
        upsert: upsertMock,
        eq: vi.fn().mockReturnThis(),
      });

      await pushData('simpl_edital', { some: 'data' }, mockUser, targetId);

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: targetId }),
        expect.anything()
      );
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        'simpl_edital_timestamp',
        expect.any(String)
      );
    });

    it('deve deletar dados quando data é null', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
      
      const mockChain = {
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ error: null }))
      };

      supabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue(mockChain),
      });

      await pushData('simpl_edital', null, mockUser);

      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockChain.eq).toHaveBeenCalledWith('key', 'simpl_edital');
      expect(localStorage.removeItem).toHaveBeenCalledWith('simpl_edital_timestamp');
    });

    it('deve tratar erros do Supabase graciosamente', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
      supabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: new Error('DB Error') }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await pushData('simpl_edital', { data: 1 }, mockUser);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { type: 'push', status: 'error' }
        })
      );
      consoleSpy.mockRestore();
    });
  });

  describe('smartSync', () => {
    const mockUser = { id: 'user-123' };

    it('deve atualizar local quando a nuvem é mais recente', async () => {
      const cloudTime = new Date('2023-01-02T10:00:00Z').toISOString();
      const localTime = new Date('2023-01-01T10:00:00Z').toISOString();
      
      localStorageMock['simpl_edital'] = JSON.stringify({ old: 'data' });
      localStorageMock['simpl_edital_timestamp'] = localTime;

      const mockSelect = {
        eq: vi.fn().mockResolvedValue({
          data: [{ key: 'simpl_edital', data: { new: 'data' }, updated_at: cloudTime }],
          error: null
        })
      };
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelect)
      });

      await smartSync(mockUser);

      expect(localStorage.setItem).toHaveBeenCalledWith('simpl_edital', JSON.stringify({ new: 'data' }));
      expect(localStorage.setItem).toHaveBeenCalledWith('simpl_edital_timestamp', cloudTime);
    });

    it('deve empurrar para a nuvem quando o local é mais recente', async () => {
      const cloudTime = new Date('2023-01-01T10:00:00Z').toISOString();
      const localTime = new Date('2023-01-02T10:00:00Z').toISOString();
      
      const localData = { latest: 'info' };
      localStorageMock['simpl_edital'] = JSON.stringify(localData);
      localStorageMock['simpl_edital_timestamp'] = localTime;

      const mockChain = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        then: vi.fn((resolve) => resolve({
          data: [{ key: 'simpl_edital', data: { old: 'info' }, updated_at: cloudTime }],
          error: null
        }))
      };

      // Mock complexo para lidar com select().eq() e upsert()
      supabase.from.mockImplementation((table) => {
        return mockChain;
      });

      await smartSync(mockUser);

      expect(mockChain.upsert).toHaveBeenCalled();
    });

    it('deve sincronizar novos dados locais que não existem na nuvem', async () => {
      localStorageMock['simpl_edital'] = JSON.stringify({ new: 'item' });
      
      const mockChain = {
        eq: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
      };
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockChain),
        upsert: mockChain.upsert
      });

      await smartSync(mockUser);

      expect(mockChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'simpl_edital' }),
        expect.anything()
      );
    });

    it('deve evitar sincronizações duplicadas em paralelo', async () => {
      let resolveSelect;
      const selectPromise = new Promise((resolve) => { resolveSelect = resolve; });
      
      const mockChain = {
        eq: vi.fn().mockReturnValue(selectPromise)
      };
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockChain)
      });

      const sync1 = smartSync(mockUser);
      const sync2 = smartSync(mockUser);

      // Em vez de comparar a promise (que o async/await embrulha), 
      // verificamos se a chamada ao Supabase ocorreu apenas uma vez
      resolveSelect({ data: [], error: null });
      await Promise.all([sync1, sync2]);

      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('deve disparar timeout se a requisição demorar demais', async () => {
      vi.useFakeTimers();
      
      const mockChain = {
        eq: vi.fn().mockReturnValue(new Promise(() => {}))
      };
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockChain)
      });

      const syncPromise = smartSync(mockUser);
      
      // Avança o tempo além do timeout de 15s
      vi.advanceTimersByTime(16000);

      await expect(syncPromise).rejects.toThrow(/Timeout/);
      
      vi.useRealTimers();
    });
  });

  describe('Histórico de Sincronização', () => {
    it('deve manter apenas os últimos 20 eventos', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: '1' } } } });
      supabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      // Simula 25 pushes
      for (let i = 0; i < 25; i++) {
        await pushData('simpl_edital', { i }, { id: '1' });
      }

      const history = getSyncHistory();
      expect(history.length).toBe(20);
    });
  });
});
