import { describe, it, expect } from 'vitest';
import { parseWithFallback } from '../services/ai/fallback.js';
import {
  parseVietnameseAmount,
  safeLower,
  getMemberDisplayName
} from '../services/ai/utils.js';

describe('AI Expense Natural Language Parsing', () => {
  const members = [
    {
      id: "user-dat",
      type: "user",
      name: "dat",
      displayName: "dat",
      userId: "user-dat"
    },
    {
      id: "user-tea",
      type: "user",
      name: "tea",
      displayName: "tea",
      userId: "user-tea"
    },
    {
      id: "guest-tuan",
      type: "guest",
      name: "tuan",
      displayName: "tuấn",
      guestMemberId: "guest-tuan"
    }
  ];

  const currentUser = {
    id: "user-dat",
    name: "dat"
  };

  const defaultSelectedParticipants = ["user-dat", "user-tea", "guest-tuan"];

  describe('Amount parsing', () => {
    it('parses various formats correctly', () => {
      expect(parseVietnameseAmount('100k')).toBe(100000);
      expect(parseVietnameseAmount('100 nghìn')).toBe(100000);
      expect(parseVietnameseAmount('1tr')).toBe(1000000);
      expect(parseVietnameseAmount('1 triệu')).toBe(1000000);
      expect(parseVietnameseAmount('1tr2')).toBe(1200000);
      expect(parseVietnameseAmount('1.2tr')).toBe(1200000);
      expect(parseVietnameseAmount('1m')).toBe(1000000);
      expect(parseVietnameseAmount('1 củ')).toBe(1000000);
      expect(parseVietnameseAmount('500')).toBe(500);
    });
  });

  describe('End-to-End Fallback Parser', () => {
    it('Case 1: Self payer + group alias', () => {
      const result = parseWithFallback("tôi mời cả nhà ăn lẩu hết 1tr", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(1000000);
      expect(result.payer).toBe('dat');
      expect(result.participants).toEqual(['dat', 'tea', 'tuấn']);
      expect(result.category).toBe('food');
      expect(result.title).toContain('lẩu');
    });

    it('Case 2: Self payer + drinks', () => {
      const result = parseWithFallback("mình bao mọi người cafe 250k", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(250000);
      expect(result.payer).toBe('dat');
      expect(result.participants).toEqual(['dat', 'tea', 'tuấn']);
      expect(result.category).toBe('drinks');
      expect(result.title).toContain('Cafe');
    });

    it('Case 3: Named guest payer + transport', () => {
      const result = parseWithFallback("tuấn ứng tiền vé xe 600k cho cả nhóm", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(600000);
      expect(result.payer).toBe('tuấn');
      expect(result.participants).toEqual(['dat', 'tea', 'tuấn']);
      expect(result.category).toBe('transport');
      expect(result.title).toContain('Vé xe');
    });

    it('Case 4: Named user payer + named participants', () => {
      const result = parseWithFallback("tea thanh toán trà sữa 180k cho dat với tuan", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(180000);
      expect(result.payer).toBe('tea');
      expect(result.participants).toEqual(['dat', 'tuấn']);
      expect(result.category).toBe('drinks');
      expect(result.title).toContain('Trà sữa');
    });

    it('Case 5: Payer appears after amount/title', () => {
      const result = parseWithFallback("ăn tối 900k mình trả", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(900000);
      expect(result.payer).toBe('dat');
      expect(result.participants).toEqual(['dat', 'tea', 'tuấn']);
      expect(result.category).toBe('food');
      expect(result.title).toContain('Ăn tối');
    });

    it('Case 6: Vietnamese million shorthand', () => {
      const result = parseWithFallback("hôm qua dat trả khách sạn 1tr2 chia đều", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(1200000);
      expect(result.payer).toBe('dat');
      expect(result.participants).toEqual(['dat', 'tea', 'tuấn']);
      expect(result.category).toBe('housing');
      expect(result.title).toContain('Khách sạn');
    });

    it('Case 7: Unknown payer', () => {
      const result = parseWithFallback("hùng trả 100k cafe", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(100000);
      expect(result.payer).not.toBe('dat');
      // Should not crash, and should not pick a random known member
      // Since 'hùng' is not in members, the payer logic in fallback.js:
      // payerCandidate will be 'hung'
      expect(result.payer).toBe('hung');
      expect(result.participants).toBeDefined();
    });

    it('Case 8: Missing amount', () => {
      const result = parseWithFallback("tôi mời cả nhà ăn lẩu", members, currentUser, defaultSelectedParticipants);
      expect(result.amount).toBe(0);
      expect(result.signals.amountDetected).toBe(false);
      // It does not throw, but amount is 0, which validation will catch later.
    });

    it('Case 9: Group aliases', () => {
      const aliases = ["cho tất cả", "cho cả nhóm", "cho mọi người", "cho cả nhà", "cho anh em"];
      aliases.forEach(alias => {
        const result = parseWithFallback(`tôi trả 100k ${alias}`, members, currentUser, defaultSelectedParticipants);
        expect(result.participants).toEqual(['dat', 'tea', 'tuấn']);
      });
    });
  });

  describe('Safety Tests', () => {
    it('safeLower handles undefined and null', () => {
      expect(safeLower(undefined)).toBe('');
      expect(safeLower(null)).toBe('');
    });

    it('getMemberDisplayName handles missing fields', () => {
      expect(getMemberDisplayName({})).toBe('Unknown');
      expect(getMemberDisplayName(null)).toBe('Unknown');
      expect(getMemberDisplayName({ username: 'test' })).toBe('test');
    });

    it('parseWithFallback handles undefined/null text safely', () => {
      const result = parseWithFallback(null, members, currentUser, []);
      expect(result.amount).toBe(0);
      expect(result.participants).toEqual([]);
      expect(result.payer).toBe('');
    });
  });
});
