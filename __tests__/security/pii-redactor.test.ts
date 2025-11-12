import { describe, it, expect } from 'vitest';
import {
  redactPII,
  redactPIIFromObject,
  containsPII,
  detectPIITypes,
} from '@/lib/security/pii-redactor';

describe('PII Redactor', () => {
  describe('redactPII', () => {
    it('should redact email addresses', () => {
      const input = 'Contact user at test@example.com for more info';
      const output = redactPII(input);
      expect(output).toBe('Contact user at [EMAIL_REDACTED] for more info');
    });

    it('should redact phone numbers', () => {
      const input = 'Call me at 0912-345-678';
      const output = redactPII(input);
      expect(output).toBe('Call me at [PHONE_REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const input = 'Card number: 1234 5678 9012 3456';
      const output = redactPII(input);
      expect(output).toBe('Card number: [CARD_REDACTED]');
    });

    it('should redact Taiwan ID cards', () => {
      const input = 'ID: A123456789';
      const output = redactPII(input);
      expect(output).toBe('ID: [ID_REDACTED]');
    });

    it('should redact JWT tokens', () => {
      const input = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const output = redactPII(input);
      expect(output).toBe('Token: [TOKEN_REDACTED]');
    });

    it('should redact IP addresses', () => {
      const input = 'Request from 192.168.1.100';
      const output = redactPII(input);
      expect(output).toBe('Request from [IP_REDACTED]');
    });

    it('should redact multiple PII types in one string', () => {
      const input = 'Email: test@example.com, Phone: 0912-345-678, IP: 192.168.1.1';
      const output = redactPII(input);
      expect(output).toBe('Email: [EMAIL_REDACTED], Phone: [PHONE_REDACTED], IP: [IP_REDACTED]');
    });

    it('should preserve structure when option is enabled', () => {
      const input = 'Contact: user@example.com';
      const output = redactPII(input, { preserveStructure: true });
      expect(output).toContain('us***@example.com');
    });

    it('should handle empty strings', () => {
      expect(redactPII('')).toBe('');
    });

    it('should handle strings without PII', () => {
      const input = 'This is a normal message';
      const output = redactPII(input);
      expect(output).toBe(input);
    });
  });

  describe('redactPIIFromObject', () => {
    it('should redact PII from object properties', () => {
      const input = {
        message: 'Contact test@example.com',
        user: {
          email: 'user@test.com',
          phone: '0912-345-678',
        },
      };

      const output = redactPIIFromObject(input);
      expect(output.message).toBe('Contact [EMAIL_REDACTED]');
      expect(output.user.email).toBe('[EMAIL_REDACTED]');
      expect(output.user.phone).toBe('[PHONE_REDACTED]');
    });

    it('should handle nested objects', () => {
      const input = {
        level1: {
          level2: {
            email: 'nested@example.com',
          },
        },
      };

      const output = redactPIIFromObject(input);
      expect(output.level1.level2.email).toBe('[EMAIL_REDACTED]');
    });

    it('should handle non-string values', () => {
      const input = {
        count: 42,
        active: true,
        data: null,
      };

      const output = redactPIIFromObject(input);
      expect(output).toEqual(input);
    });
  });

  describe('containsPII', () => {
    it('should detect email PII', () => {
      expect(containsPII('test@example.com')).toBe(true);
    });

    it('should detect phone PII', () => {
      expect(containsPII('0912-345-678')).toBe(true);
    });

    it('should detect credit card PII', () => {
      expect(containsPII('1234 5678 9012 3456')).toBe(true);
    });

    it('should return false for strings without PII', () => {
      expect(containsPII('This is a normal message')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(containsPII('')).toBe(false);
    });
  });

  describe('detectPIITypes', () => {
    it('should detect single PII type', () => {
      const types = detectPIITypes('Email: test@example.com');
      expect(types).toContain('email');
      expect(types).toHaveLength(1);
    });

    it('should detect multiple PII types', () => {
      const types = detectPIITypes('Email: test@example.com, Phone: 0912-345-678');
      expect(types).toContain('email');
      expect(types).toContain('phone');
      expect(types).toHaveLength(2);
    });

    it('should return empty array for strings without PII', () => {
      const types = detectPIITypes('Normal message');
      expect(types).toEqual([]);
    });

    it('should handle empty strings', () => {
      const types = detectPIITypes('');
      expect(types).toEqual([]);
    });
  });
});
