import { fetchEventSource } from "@ai-zen/node-fetch-event-source";
import type { Response as NodeFetchResponse } from "node-fetch";

export interface KoboldInferParams {
  prompt: string;
  max_length?: number;
  top_k?: number;
  top_p?: number;
  temperature?: number;
  tfs?: number;
  stop_sequence?: string[];
}

export type OnOpen = (response: NodeFetchResponse) => void | Promise<void>;
export type OnUpdate = (completion: string) => void | Promise<void>;

const DEFAULT_API_URL = "https://localhost:5001";
export const DEFAULT_TEMPLATE = "{system}\n\n{prompt}";
export const DEFAULT_CTX = 2048;

export class Client {
  private apiUrl: string;

  constructor(private apiKey: string, options?: { apiUrl?: string }) {
    this.apiUrl = options?.apiUrl ?? DEFAULT_API_URL;
  }

  /* async complete(params: KoboldInferParams, options?: { signal?: AbortSignal }): Promise<string> {
    const response = await fetch(`${this.apiUrl}/api/extra/generate/stream`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...params, stream: false }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const error = new Error(`Sampling error: ${response.status} ${response.statusText}`);
      console.error(error);
      throw error;
    }

    const completion = (await response.json());
    return ""
  } */

  completeStream(params: KoboldInferParams, { onOpen, onUpdate, signal }: { onOpen?: OnOpen; onUpdate?: OnUpdate; signal?: AbortSignal }): Promise<void> {
    const abortController = new AbortController();

    console.log("Url", this.apiUrl);

    return new Promise((resolve, reject) => {
      signal?.addEventListener("abort", (event) => {
        abortController.abort(event);
        reject(new Error("Caller aborted completeStream"));
      });

      const body = JSON.stringify({ ...params });
      fetchEventSource(`${this.apiUrl}/api/extra/generate/stream`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
        signal: abortController.signal,
        onopen: async (response) => {
          if (!response.ok) {
            abortController.abort();
            return reject(new Error(`Failed to open stream, HTTP status code ${response.status}: ${response.statusText}`));
          }
          if (onOpen) {
            await Promise.resolve(onOpen(response));
          }
        },
        onmessage: (ev) => {
          const completion = JSON.parse(ev.data);
          if (onUpdate) {
            onUpdate(completion.token);
          }
        },
        onclose: () => {
          // console.log("Close stream")
          return resolve();
        },
        onerror: (error) => {
          console.error("Inference error:", error);
          abortController.abort();
          return reject(error);
        },
      });
    });
  }
}
