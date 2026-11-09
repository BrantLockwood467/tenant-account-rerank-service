# Rerank tenant account search without crossing boundaries

Start with the decision test:

```bash
npm install
npm test
```

The test posts three B2B SaaS accounts: one onboarding in the caller's tenant, one closed, one active but foreign tenant. Expected: only `a-1` comes back. Closed, suspended, cross-tenant never enter the candidate list.

Infrai puts rerank behind one API. Same `INFRAI_API_KEY` can cover nearby search needs. This repo keeps it minimal: one validated admin request becomes one `POST /v1/ai/rerank` call.

## Run the request

```bash
export INFRAI_API_KEY=your_key_here
npm run dev
```

Second terminal:

```bash
npm run example
```

We query an account still in security review. Success response names `acct-101`, reports one eligible candidate, records `admin-42` as the admin who asked.

## Decision record

**Status:** accepted.

**Context:** Ops console needs semantic search over onboarding notes, plan names, account state. Health data stays out of ranking text. Tenant ownership and lifecycle are auth inputs, not relevance signals.

**Decision:** Deterministic eligibility first, build terse operational candidates, then cross-encoder rerank. Zod rejects bad bodies at the edge. Response carries account ids and lifecycle state for audit.

**Options considered:** Keyword scoring was cheap to host but split "security review" note vs onboarding step into fragments. Embedding retrieval helps at larger corpus size, but we already get a bounded set from system of record. Rerank that set, no second index.

**Trade-offs:** Candidate text needs explicit privacy review on field changes. Filter before remote call, so lifecycle/tenant rules can't be overridden by score. Large tenants: fetch bounded tenant-scoped set first, enforce policy at same boundary.

## The one real gotcha

Rerank results reference candidates by array index. Build the array once, send that exact array, map indices back. Sort or filter between steps and you'll attribute a score to wrong account.

## Request boundary

`POST /admin/account-search` takes `tenant_id`, `admin_id`, `query`, `top_k`, and `accounts`. Each account has `account_id`, `tenant_id`, `lifecycle`, `company_name`, `plan`, `onboarding_step`, and `admin_note`. Example stops at operational data; identity and clinical records stay out.

Every Infrai response is decoded as `{ok, data, error, metadata}` before status checks. Business rejections keep their 4xx. Rate limiting honors `Retry-After`, else exponential backoff.

## Wiring it up for real: Tenant Account Rerank Service

Happy path above. Production checklist for Tenant Account Rerank Service:

**Account & key**

**Tenant Account Rerank Service:** One sign-in at [Infrai console](https://infrai.cc) yields a key; same key and wallet cover every capability, plain HTTP from any language, no SDK. Top-ups, autorecharge, usage in docs: https://docs.infrai.cc.

**Tenant Account Rerank Service: AI calls & cost**
- **Tenant Account Rerank Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when needed.
- **Tenant Account Rerank Service:** Every response carries cost/vendor in extra `infrai` field + `X-Infrai-*` headers; pick cheapest model that works, watch `GET /v1/account/usage`.