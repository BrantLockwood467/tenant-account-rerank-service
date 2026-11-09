import assert from "node:assert/strict";
import test from "node:test";
import { accountSearchRequestSchema } from "../src/account_search_policy.js";
import { TenantSearchService } from "../src/tenant_search_service.js";

test("admin search excludes closed and cross-tenant accounts before reranking", async () => {
  let received: string[] = [];
  const service = new TenantSearchService({
    async rerank(_query, candidates) {
      received = candidates;
      return [{ index: 0, score: 0.94 }];
    }
  });
  const input = accountSearchRequestSchema.parse({
    tenant_id: "tenant-a",
    admin_id: "admin-7",
    query: "security review onboarding",
    top_k: 3,
    accounts: [
      { account_id: "a-1", tenant_id: "tenant-a", lifecycle: "onboarding", company_name: "Care One", plan: "team", onboarding_step: "security review", admin_note: "documents received" },
      { account_id: "a-2", tenant_id: "tenant-a", lifecycle: "closed", company_name: "Old Care", plan: "team", onboarding_step: "complete", admin_note: "archived" },
      { account_id: "b-1", tenant_id: "tenant-b", lifecycle: "active", company_name: "Other Care", plan: "enterprise", onboarding_step: "complete", admin_note: "reviewed" }
    ]
  });

  const result = await service.search(input);

  assert.equal(received.length, 1);
  assert.match(received[0], /Care One/);
  assert.equal(result.eligible_count, 1);
  assert.deepEqual(result.results.map((item) => item.account_id), ["a-1"]);
});
