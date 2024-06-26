import { fetchEventSource } from "@ai-zen/node-fetch-event-source";
import { PreparedCommand } from "../../dispatcher";
import { getCurrentProviderAPIKey } from "../../utils";
import pTimeout from "p-timeout";
import Anthropic from '@anthropic-ai/sdk';
import { PartialResponse } from "../common";

// This file exists because Anthropic introduced breaking changes in their APIs between Claude's 2nd and 3rd generations.
// This is very similar to OpenAI's Client now. They can potentially be combined, if the Anthropic SDK gets
// replaced with general SSE logic like in clients/openai.ts
export class ClaudeV3Client {
  private key: string;
  private command: PreparedCommand;
  private client: Anthropic;
  private created: boolean = false;

  constructor(command: PreparedCommand) {
    this.command = command;
  }

  async create() {
    // The Svelte UI assumes that each Provider has its own API Key.
    // Both legacy and v3 Anthropic APIs use the same keys, but differently enough to justify separate Providers.
    // Svelte should probably be updated to not assume a 1:1 Provider:API key relationship, but in the meantime,
    // to avoid user confusion, fall back to an Anthropic API key if a ClaudeV3 key is not present.
    try {
      this.key = await getCurrentProviderAPIKey();
      if (!this.key) {
        throw new Error("Empty ClaudeV3 API key");
      }
    } catch (e: unknown) {
      this.key = await getCurrentProviderAPIKey("Anthropic");
    }
    this.client = new Anthropic({
      apiKey: this.key,
    });
    this.created = true;
  }

  async stream(abortSignal: AbortSignal, onProgress?: (PartialResponse: PartialResponse) => void): Promise<PartialResponse> {
    if (!this.created) {
      await this.create();
    }

    const abortController = new AbortController();
    const result: PartialResponse = {
      role: "assistant",
      id: "1",
      text: "",
      delta: "",
      detail: {},
    };

    const responseP = new Promise<PartialResponse>((resolve, reject) => {
      abortSignal.addEventListener("abort", (event) => {
        abortController.abort(event);
        reject(new Error("Caller aborted completion stream."));
      });

      // @ts-ignore
      this.client.messages.stream(this.command.completionParams).on('text', (delta, snapshot) => {
        result.text += delta;
        result.delta = delta;
        result.detail = snapshot;
        onProgress?.(result);
      }).on('error', (error) => {
        abortController.abort();
        return reject(error);
      }).on('abort', (error) => {
        abortController.abort();
        return reject(error);
      }).on('end', () => {
        return resolve(result);
      });
    });

    pTimeout(responseP, {
      milliseconds: 10 * 60 * 1000,
      message: "Completion stream timed out.",
    }).catch(() => {
      abortController.abort();
    });

    return responseP;
  }
}