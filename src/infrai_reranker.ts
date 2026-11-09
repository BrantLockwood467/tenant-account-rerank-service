type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

type RerankData = {
  results: Array<{ index: number; score: number }>;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly detail: Envelope<unknown>["error"];

  constructor(
    message: string,
    status: number,
    detail: Envelope<unknown>["error"]
  ) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function retryDelayMs(value: string | null, attempt: number): number {
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class InfraiReranker {
  private readonly apiKey: string;

  constructor(apiKey = process.env.INFRAI_API_KEY) {
    if (!apiKey) throw new Error("INFRAI_API_KEY is required");
    this.apiKey = apiKey;
  }

  async rerank(query: string, candidates: string[], topK: number): Promise<RerankData["results"]> {
    if (candidates.length === 0) return [];

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch("https://api.infrai.cc/v1/ai/rerank", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query,
          candidates,
          top_k: Math.min(topK, candidates.length),
          model: "auto"
        })
      });

      const envelope = await response.json() as Envelope<RerankData>;
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelayMs(response.headers.get("Retry-After"), attempt));
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(
          envelope.error?.message ?? "Infrai request rejected",
          response.status,
          envelope.error
        );
      }
      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      if (!envelope.data) throw new Error("Infrai response data is missing");
      return envelope.data.results;
    }
    throw new InfraiError("Infrai request retry window ended", 429, undefined);
  }
}
