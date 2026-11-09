import {
  type AccountSearchRequest,
  eligibleAccountCandidates,
  mapRankedAccounts,
  type RankedItem
} from "./account_search_policy.js";

export interface Reranker {
  rerank(query: string, candidates: string[], topK: number): Promise<RankedItem[]>;
}

export class TenantSearchService {
  private readonly reranker: Reranker;

  constructor(reranker: Reranker) {
    this.reranker = reranker;
  }

  async search(input: AccountSearchRequest) {
    const candidates = eligibleAccountCandidates(input);
    const ranked = await this.reranker.rerank(
      input.query,
      candidates.map((candidate) => candidate.text),
      input.top_k
    );

    return {
      tenant_id: input.tenant_id,
      requested_by: input.admin_id,
      eligible_count: candidates.length,
      results: mapRankedAccounts(candidates, ranked)
    };
  }
}
