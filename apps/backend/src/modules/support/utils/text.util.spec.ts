import { chunkText, stripHtml, tokenize, truncateAtSentence } from './text.util';

describe('stripHtml', () => {
  it('removes tags and keeps paragraph breaks', () => {
    expect(stripHtml('<p>First line</p><p>Second <b>line</b></p>')).toBe('First line\nSecond line');
  });

  it('removes script and style content completely', () => {
    expect(stripHtml('Hello<script>alert(1)</script><style>p{}</style> world')).toBe('Hello world');
  });

  it('decodes common entities', () => {
    expect(stripHtml('Fish &amp; chips&nbsp;for &quot;two&quot;')).toBe('Fish & chips for "two"');
  });

  it('does not turn an escaped tag back into a tag', () => {
    expect(stripHtml('&lt;script&gt;bad&lt;/script&gt;')).toBe('<script>bad</script>');
  });

  it('turns list items and line breaks into new lines', () => {
    expect(stripHtml('<ul><li>One</li><li>Two</li></ul>a<br>b')).toBe('One\nTwo\na\nb');
  });
});

describe('tokenize', () => {
  it('lower-cases and drops words with no meaning', () => {
    expect(tokenize('How do I get my Reward?')).toEqual(['reward']);
  });

  it('joins different forms of a word', () => {
    expect(tokenize('withdrawals')).toEqual(tokenize('withdrawing'));
    expect(tokenize('withdrawal')).toEqual(tokenize('payout'));
    expect(tokenize('verification')).toEqual(tokenize('verified'));
  });

  it('keeps words in other scripts', () => {
    expect(tokenize('पैसे कैसे निकालें')).toEqual(['पैसे', 'कैसे', 'निकालें']);
  });

  it('keeps numbers', () => {
    expect(tokenize('minimum 500 rupees')).toContain('500');
  });

  it('returns nothing for an empty or punctuation-only text', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('?! ...')).toEqual([]);
  });
});

describe('chunkText', () => {
  it('keeps short text as one piece', () => {
    expect(chunkText('one\ntwo', 100)).toEqual(['one\ntwo']);
  });

  it('splits between lines once a piece is full, never inside a line', () => {
    const chunks = chunkText('aaaaaaaaaa\nbbbbbbbbbb\ncccccccccc', 22);
    expect(chunks).toEqual(['aaaaaaaaaa\nbbbbbbbbbb', 'cccccccccc']);
  });

  it('keeps a line longer than the limit whole', () => {
    expect(chunkText('x'.repeat(50), 10)).toEqual(['x'.repeat(50)]);
  });

  it('ignores blank lines and returns nothing for empty text', () => {
    expect(chunkText('\n \n', 10)).toEqual([]);
  });
});

describe('truncateAtSentence', () => {
  it('leaves short text alone', () => {
    expect(truncateAtSentence('Short.', 50)).toBe('Short.');
  });

  it('cuts at the end of a sentence when there is one in reach', () => {
    expect(truncateAtSentence('First sentence here. Second sentence goes on and on.', 35)).toBe('First sentence here.');
  });

  it('adds an ellipsis when there is no sentence end to cut at', () => {
    expect(truncateAtSentence('word '.repeat(30), 20)).toMatch(/…$/);
  });
});
