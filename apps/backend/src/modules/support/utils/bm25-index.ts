export interface Bm25Hit {
  /** Position of the document in the list the index was built from. */
  index: number;
  score: number;
  /** How many of the distinct query words the document contains. */
  matched: number;
}

/**
 * A small in-memory BM25 search: it scores each document by how many of the question's words it contains,
 * counting rare words for more and long documents for less. Pure and deterministic, so the same question
 * always finds the same answer.
 */
export class Bm25Index {
  private readonly termFrequencies: Map<string, number>[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly lengths: number[];
  private readonly averageLength: number;

  constructor(
    documents: string[][],
    private readonly k1 = 1.5,
    private readonly b = 0.75,
  ) {
    this.lengths = documents.map((tokens) => tokens.length);
    this.averageLength = documents.length ? this.lengths.reduce((sum, n) => sum + n, 0) / documents.length : 0;

    this.termFrequencies = documents.map((tokens) => {
      const counts = new Map<string, number>();
      for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
      for (const token of counts.keys()) this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1);
      return counts;
    });
  }

  get size(): number {
    return this.termFrequencies.length;
  }

  /** Best matches first. Documents that share no word with the query are left out. */
  search(queryTokens: string[], limit: number): Bm25Hit[] {
    const query = [...new Set(queryTokens)];
    if (!query.length || !this.size) return [];

    const hits: Bm25Hit[] = [];
    this.termFrequencies.forEach((counts, index) => {
      let score = 0;
      let matched = 0;
      for (const term of query) {
        const tf = counts.get(term);
        if (!tf) continue;
        matched += 1;
        score += this.idf(term) * ((tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + (this.b * this.lengths[index]) / (this.averageLength || 1))));
      }
      if (matched > 0) hits.push({ index, score, matched });
    });

    // Ties go to the earlier document so results never depend on the order the engine visits them.
    return hits.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit);
  }

  private idf(term: string): number {
    const df = this.documentFrequency.get(term) ?? 0;
    return Math.log(1 + (this.size - df + 0.5) / (df + 0.5));
  }
}
