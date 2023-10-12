import { fetchEventSource } from "@ai-zen/node-fetch-event-source";
import pTimeout from "p-timeout";

import { type ReadyCommand } from "../../templates/render";

export interface OpenAIInferParams {
  n: number;
  model: string;
  temperature: number;
}

export interface CompletionResponse {
  text: string;
}

const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";

export class Client {
  private apiUrl: string;
  private apiKey: string;

  constructor(options: { apiUrl?: string; apiKey?: string; cmd: ReadyCommand; onProgress?: (result: any) => void }) {
    this.apiUrl = options?.apiUrl ?? DEFAULT_API_URL;
    this.apiKey = options?.apiKey ?? "";
  }

  completeStream(
    completionParams: any,
    { timeoutMs, onProgress, abortSignal }: { timeoutMs?: number; onProgress?: (result: any) => void; abortSignal?: AbortSignal } = {},
  ): Promise<CompletionResponse> {
    const abortController = new AbortController();

    const body = JSON.stringify(completionParams);

    const result = {
      role: "assistant",
      id: "1",
      text: "",
      delta: "",
      detail: {},
    };

    const responseP: Promise<CompletionResponse> = new Promise((resolve, reject) => {
      abortSignal?.addEventListener("abort", (event) => {
        abortController.abort(event);
        reject(new Error("Caller aborted completeStream"));
      });

      fetchEventSource(this.apiUrl, {
        method: "POST",
        body,
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        onopen: async (response) => {
          if (!response.ok) {
            abortController.abort();
            return reject(new Error(`Failed to open stream: ${response.status} ${response.statusText}`));
          }
        },
        onmessage: (ev) => {
          if (ev.data === "[DONE]") {
            result.text = result.text.trim();
            return resolve(result);
          }

          try {
            const response = JSON.parse(ev.data);

            if (response.id) {
              result.id = response.id;
            }

            if (response.choices?.length) {
              const { delta } = response.choices[0];
              result.delta = delta.content;

              if (delta?.content) {
                result.text += delta.content;
              }

              if (delta.role) {
                result.role = delta.role;
              }

              result.detail = response;

              onProgress?.(result);
            }
          } catch (error) {
            reject(error);
          }
        },
        onerror: (err) => {
          reject(err);
        },
      });
    });

    pTimeout(responseP, { milliseconds: timeoutMs ?? 60000, message: `completeStream timed out after ${timeoutMs ?? 60000}ms` }).catch(() => {
      abortController.abort();
    });

    return responseP;
  }
}
