import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPhaseWorkflows, formatTime, calculateRemainingTime } from './timerUtils';

describe('timerUtils', () => {
  describe('formatTime', () => {
    it('formats seconds into MM:SS correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('handles zero padding correctly', () => {
      expect(formatTime(9)).toBe('00:09');
      expect(formatTime(600)).toBe('10:00');
    });
  });

  describe('getPhaseWorkflows', () => {
    it('returns phase 1 steps correctly', () => {
      const steps = getPhaseWorkflows("1", 3, 45, 10, 5, 15);
      expect(steps).toHaveLength(5);
      expect(steps[0].id).toBe('reprise');
      expect(steps[0].duration).toBe(180); // 3 * 60
      expect(steps[1].id).toBe('estude');
      expect(steps[4].id).toBe('descanso');
    });

    it('returns phase 2 steps correctly', () => {
      const steps = getPhaseWorkflows("2", 3, 20, 40, 5, 15);
      expect(steps).toHaveLength(5);
      expect(steps[2].id).toBe('aplique');
      expect(steps[2].duration).toBe(2400); // 40 * 60
      expect(steps[2].requiresCheckbox).toBe(true);
    });

    it('returns phase 3 steps correctly', () => {
      const steps = getPhaseWorkflows("3", 0, 0, 60, 5, 0);
      expect(steps).toHaveLength(2);
      expect(steps[0].id).toBe('aplique');
      expect(steps[0].requiresMultiCheckboxes).toBe(true);
    });
  });

  describe('calculateRemainingTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calculates remaining time correctly', () => {
      const now = Date.now();
      const target = now + 10000;
      expect(calculateRemainingTime(target)).toBe(10);
      
      vi.advanceTimersByTime(5000);
      expect(calculateRemainingTime(target)).toBe(5);
    });

    it('returns 0 if target time has passed', () => {
      const now = Date.now();
      const target = now - 5000;
      expect(calculateRemainingTime(target)).toBe(0);
    });

    it('returns 0 if no target provided', () => {
      expect(calculateRemainingTime(null)).toBe(0);
    });
  });
});
