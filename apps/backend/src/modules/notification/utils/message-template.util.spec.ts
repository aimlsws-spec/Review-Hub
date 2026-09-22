import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { assertSupportedPlaceholders, extractVariables, findUnsupportedVariables, renderMessage } from './message-template.util';

describe('message template helpers', () => {
  describe('extractVariables', () => {
    it('finds each placeholder once, tolerating spaces inside the braces', () => {
      expect(extractVariables('Hi {{firstName}}, {{ amount }} for {{firstName}}')).toEqual(['firstName', 'amount']);
    });

    it('returns nothing for plain text', () => {
      expect(extractVariables('No placeholders here')).toEqual([]);
    });
  });

  describe('findUnsupportedVariables', () => {
    it('allows firstName and flags everything else', () => {
      expect(findUnsupportedVariables('Hi {{firstName}}, you earned {{amount}} in {{city}}')).toEqual(['amount', 'city']);
    });
  });

  describe('assertSupportedPlaceholders', () => {
    it('accepts supported placeholders and text without any', () => {
      expect(() => assertSupportedPlaceholders('Hi {{firstName}}', 'Plain text', undefined)).not.toThrow();
    });

    it('names every unsupported placeholder and says what is allowed', () => {
      expect(() => assertSupportedPlaceholders('Hi {{name}}', 'You earned {{amount}}')).toThrow(BadRequestException);
      expect(() => assertSupportedPlaceholders('Hi {{name}}', 'You earned {{amount}}')).toThrow(
        /\{\{name\}\}, \{\{amount\}\}.*\{\{firstName\}\}/,
      );
    });
  });

  describe('renderMessage', () => {
    it('fills in firstName wherever it appears', () => {
      expect(renderMessage('Hi {{firstName}}! Bye {{ firstName }}.', { firstName: 'Priya' })).toBe('Hi Priya! Bye Priya.');
    });

    it('leaves text alone when there is nothing to fill', () => {
      expect(renderMessage('Happy hour is on!', { firstName: 'Priya' })).toBe('Happy hour is on!');
    });

    it('keeps an unknown placeholder as written rather than inventing a value', () => {
      expect(renderMessage('You earned {{amount}}', { firstName: 'Priya' })).toBe('You earned {{amount}}');
    });

    it('does not treat special characters in a name as replacement patterns', () => {
      expect(renderMessage('Hi {{firstName}}', { firstName: "$& O'Brien $1" })).toBe("Hi $& O'Brien $1");
    });
  });
});
