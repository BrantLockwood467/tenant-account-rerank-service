import { z } from "zod";

export const accountSearchRequestSchema = z.object({
  tenant_id: z.string().min(1),
  admin_id: z.string().min(1),
  query: z.string().min(2).max(500),
  top_k: z.number().int().min(1).max(10).default(5),
  accounts: z.array(z.object({
    account_id: z.string().min(1),
    tenant_id: z.string().min(1),
    lifecycle: z.enum(["onboarding", "active", "suspended", "closed"]),
    company_name: z.string().min(1),
    plan: z.string().min(1),
    onboarding_step: z.string().min(1),
    admin_note: z.string().max(500).default("")
  })).max(100)
});

export type AccountSearchRequest = z.infer<typeof accountSearchRequestSchema>;
export type Account = AccountSearchRequest["accounts"][number];

export type SearchCandidate = {
  account: Account;
  text: string;
};

export function eligibleAccountCandidates(input: AccountSearchRequest): SearchCandidate[] {
  return input.accounts
    .filter((account) =>
      account.tenant_id === input.tenant_id &&
      account.lifecycle !== "closed" &&
      account.lifecycle !== "suspended"
    )
    .map((account) => ({
      account,
      text: [
        `company: ${account.company_name}`,
        `lifecycle: ${account.lifecycle}`,
        `plan: ${account.plan}`,
        `onboarding: ${account.onboarding_step}`,
        `admin context: ${account.admin_note}`
      ].join("; ")
    }));
}

export type RankedItem = { index: number; score: number };

export function mapRankedAccounts(
  candidates: SearchCandidate[],
  ranked: RankedItem[]
): Array<{ account_id: string; company_name: string; lifecycle: Account["lifecycle"]; score: number }> {
  return ranked.flatMap((item) => {
    const candidate = candidates[item.index];
    return candidate ? [{
      account_id: candidate.account.account_id,
      company_name: candidate.account.company_name,
      lifecycle: candidate.account.lifecycle,
      score: item.score
    }] : [];
  });
}
