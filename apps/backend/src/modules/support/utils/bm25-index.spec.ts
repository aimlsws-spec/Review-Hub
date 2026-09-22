import { Bm25Index } from './bm25-index';

describe('Bm25Index', () => {
  const docs = [
    ['withdraw', 'reward', 'bank', 'account'],
    ['complete', 'task', 'submit', 'proof'],
    ['kyc', 'verify', 'pan', 'document'],
  ];
  const index = new Bm25Index(docs);

  it('finds the document that contains the query words', () => {
    const [best] = index.search(['withdraw', 'bank'], 3);
    expect(best.index).toBe(0);
    expect(best.matched).toBe(2);
  });

  it('leaves out documents that share no word with the query', () => {
    expect(index.search(['withdraw'], 3).map((h) => h.index)).toEqual([0]);
  });

  it('ranks a document with more of the query words higher', () => {
    const hits = index.search(['kyc', 'verify', 'task'], 3);
    expect(hits[0].index).toBe(2);
    expect(hits[1].index).toBe(1);
  });

  it('counts a rare word for more than a common one', () => {
    const skewed = new Bm25Index([['common', 'rare'], ['common', 'x'], ['common', 'y'], ['common', 'z']]);
    const [rareFirst] = skewed.search(['rare'], 1);
    const [commonFirst] = skewed.search(['common'], 1);
    expect(rareFirst.score).toBeGreaterThan(commonFirst.score);
  });

  it('returns nothing for an empty query or an empty index', () => {
    expect(index.search([], 3)).toEqual([]);
    expect(new Bm25Index([]).search(['a'], 3)).toEqual([]);
  });

  it('respects the limit', () => {
    expect(index.search(['withdraw', 'task', 'kyc'], 2)).toHaveLength(2);
  });

  it('gives the same order every time, with ties going to the earlier document', () => {
    const twins = new Bm25Index([['same', 'words'], ['same', 'words']]);
    expect(twins.search(['same'], 2).map((h) => h.index)).toEqual([0, 1]);
  });

  it('counts a repeated query word once', () => {
    expect(index.search(['withdraw', 'withdraw'], 1)[0].matched).toBe(1);
  });
});
