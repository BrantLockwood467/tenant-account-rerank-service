export {};

const response = await fetch("http://localhost:3000/admin/account-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenant_id: "clinic-north",
    admin_id: "admin-42",
    query: "account still completing security review",
    top_k: 2,
    accounts: [
      {
        account_id: "acct-101",
        tenant_id: "clinic-north",
        lifecycle: "onboarding",
        company_name: "Northstar Cardiology",
        plan: "enterprise",
        onboarding_step: "security review",
        admin_note: "questionnaire received"
      },
      {
        account_id: "acct-102",
        tenant_id: "clinic-north",
        lifecycle: "closed",
        company_name: "Retired Demo Clinic",
        plan: "team",
        onboarding_step: "complete",
        admin_note: "retention period ended"
      },
      {
        account_id: "acct-900",
        tenant_id: "clinic-south",
        lifecycle: "active",
        company_name: "Southside Health",
        plan: "enterprise",
        onboarding_step: "complete",
        admin_note: "annual review scheduled"
      }
    ]
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
