import { fetchEventSource } from "@ai-zen/node-fetch-event-source";
import fetch from "node-fetch";
import type { Response as NodeFetchResponse } from "node-fetch";

export interface SamplingParameters {
  prompt: string;
  temperature?: number;
  stop_sequences?: string[];
  top_k?: number;
  top_p?: number;
  model: string;
  tags?: { [key: string]: string };
}

export interface CompletionResponse {
  completion: string;
  stop: string | null;
  stop_reason: "stop_sequence" | "max_tokens";
  truncated: boolean;
  exception: string | null;
  log_id: string;
}

export type OnOpen = (response: NodeFetchResponse) => void | Promise<void>;
export type OnUpdate = (completion: CompletionResponse) => void | Promise<void>;

const ANTHROPIC_SDK = "anthropic-typescript/0.4.4";
const ANTHROPIC_VERSION = "2023-01-01";
const DEFAULT_API_URL = "https://api.anthropic.com/v1/complete";

enum Event {
  Ping = "ping",
}

const DONE_MESSAGE = "[DONE]";

export class Client {
  private apiUrl: string;

  constructor(private apiKey: string, options?: { apiUrl?: string }) {
    this.apiUrl = options?.apiUrl ?? DEFAULT_API_URL;
  }

  async complete(params: SamplingParameters, options?: { signal?: AbortSignal }): Promise<CompletionResponse> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Anthropic-SDK": ANTHROPIC_SDK,
        "Anthropic-Version": ANTHROPIC_VERSION,
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify({ ...params, stream: false }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const error = new Error(`Sampling error: ${response.status} ${response.statusText}`);
      console.error(error);
      throw error;
    }

    const completion = (await response.json()) as CompletionResponse;
    return completion;
  }

  completeStream(params: SamplingParameters, { onOpen, onUpdate, signal }: { onOpen?: OnOpen; onUpdate?: OnUpdate; signal?: AbortSignal }): Promise<CompletionResponse> {
    const abortController = new AbortController();

    return new Promise((resolve, reject) => {
      signal?.addEventListener("abort", (event) => {
        abortController.abort(event);
        reject(new Error("Caller aborted completeStream"));
      });

      fetchEventSource(this.apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Anthropic-SDK": ANTHROPIC_SDK,
          "Anthropic-Version": ANTHROPIC_VERSION,
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify({ ...params, stream: true }),
        signal: abortController.signal,
        onopen: async (response) => {
          if (!response.ok) {
            abortController.abort();
            return reject(new Error(`Failed to open sampling stream, HTTP status code ${response.status}: ${response.statusText}`));
          }

          if (onOpen) {
            await Promise.resolve(onOpen(response));
          }
        },
        onmessage: (ev) => {
          if (ev.event === Event.Ping) {
            return;
          }

          if (ev.data === DONE_MESSAGE) {
            console.error("Unexpected done message before stop_reason has been issued");
            return;
          }

          const completion = JSON.parse(ev.data) as CompletionResponse;

          if (onUpdate) {
            Promise.resolve(onUpdate(completion)).catch((error) => {
              abortController.abort();
              reject(error);
            });
          }

          if (completion.stop_reason !== null) {
            abortController.abort();
            return resolve(completion);
          }
        },
        onerror: (error) => {
          console.error("Sampling error:", error);
          abortController.abort();
          return reject(error);
        },
      });
    });
  }
}
