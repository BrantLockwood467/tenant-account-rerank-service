import { createServer } from "node:http";
import { ZodError } from "zod";
import { accountSearchRequestSchema } from "./account_search_policy.js";
import { InfraiError, InfraiReranker } from "./infrai_reranker.js";
import { TenantSearchService } from "./tenant_search_service.js";

const service = new TenantSearchService(new InfraiReranker());

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/admin/account-search") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = accountSearchRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await service.search(input);
    response.writeHead(200).end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof ZodError) {
      response.writeHead(400).end(JSON.stringify({
        error: "Invalid request body",
        issues: error.issues
      }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({
        error: error.message,
        detail: error.detail
      }));
      return;
    }
    response.writeHead(500).end(JSON.stringify({ error: "Request processing failed" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Tenant account search listening on http://localhost:${port}`);
});
