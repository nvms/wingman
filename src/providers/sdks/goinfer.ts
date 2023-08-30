import { fetchEventSource } from "@ai-zen/node-fetch-event-source";
import fetch from "node-fetch";
import type { Response as NodeFetchResponse } from "node-fetch";

interface ModelConf {
  name: string;
  ctx?: number;
  freq_rope_base?: number;
  freq_rope_scale?: number;
}

export interface InferParams {
  prompt: string;
  template?: string;
  stream?: boolean;
  threads?: number;
  model?: ModelConf;
  n_predict?: number;
  top_k?: number;
  top_p?: number;
  temperature?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repeat_penalty?: number;
  tfs_z?: number;
  stop?: string[];
}

export interface InferResult {
  text: string;
  thinkingTime: number;
  thinkingTimeFormat: string;
  inferenceTime: number;
  emitTime: number;
  emitTimeFormat: string;
  totalTime: number;
  totalTimeFormat: string;
  tokensPerSecond: number;
  totalTokens: number;
}

export enum StreamedMsgType {
  TokenMsgType = "token",
  SystemMsgType = "system",
  ErrorMsgType = "error",
}

export interface StreamedMessage {
  content: string;
  num: number;
  msg_type: StreamedMsgType;
  data?: { [key: string]: any };
}

export type OnOpen = (response: NodeFetchResponse) => void | Promise<void>;
export type OnUpdate = (completion: StreamedMessage) => void | Promise<void>;

const DEFAULT_API_URL = "https://localhost:5143";
export const DEFAULT_CTX = 2048;
export const DEFAULT_TEMPLATE = "{system}\n\n{prompt}";

export class Client {
  private apiUrl: string;

  constructor(private apiKey: string, options?: { apiUrl?: string }) {
    this.apiUrl = options?.apiUrl ?? DEFAULT_API_URL;
  }

  async complete(params: InferParams, options?: { signal?: AbortSignal }): Promise<InferResult> {
    const response = await fetch(`${this.apiUrl}/completion`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...params, stream: false }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const error = new Error(`Sampling error: ${response.status} ${response.statusText}`);
      console.error(error);
      throw error;
    }

    const completion = (await response.json()) as InferResult;
    return completion;
  }

  completeStream(params: InferParams, { onOpen, onUpdate, signal }: { onOpen?: OnOpen; onUpdate?: OnUpdate; signal?: AbortSignal }): Promise<InferResult> {
    const abortController = new AbortController();

    return new Promise((resolve, reject) => {
      signal?.addEventListener("abort", (event) => {
        abortController.abort(event);
        reject(new Error("Caller aborted completeStream"));
      });

      const body = JSON.stringify({ ...params, stream: true });
      fetchEventSource(`${this.apiUrl}/completion`, {
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
          const completion = JSON.parse(ev.data) as StreamedMessage;
          /* if (onUpdate) {
            Promise.resolve(onUpdate(completion)).catch((error) => {
              abortController.abort();
              reject(error);
            });
          } */

          // console.log(completion);

          switch (completion.msg_type) {
            case "system":
              // console.log("SYSTEM MSG")
              // console.log(completion)
              switch (completion.content) {
                case "result":
                  return resolve(completion.data as InferResult);
                case "error":
                  abortController.abort();
                  return reject(new Error("inference error"));
                default:
                  break;
              }
              break;
            case "token":
              if (onUpdate) {
                onUpdate(completion);
              }
          }
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
