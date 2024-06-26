import { PreparedCommand } from "../../dispatcher";
import { fetchEventSource } from "@ai-zen/node-fetch-event-source";
import pTimeout from "p-timeout";
import { getCurrentProviderAPIKey } from "../../utils";
import { PartialResponse } from "../common";

export class OpenAIClient {
  private key: string;
  private command: PreparedCommand;
  private created: boolean = false;

  constructor(command: PreparedCommand) {
    this.command = command;
  }

  async create() {
    this.key = await getCurrentProviderAPIKey();
    this.created = true;
  }

  async stream(abortSignal: AbortSignal, onProgress?: (partialResponse: PartialResponse) => void): Promise<PartialResponse> {
    if (!this.created) {
      await this.create();
    }

    const abortController = new AbortController();
    const body = JSON.stringify(this.command.completionParams);
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

      fetchEventSource(
        this.command.url,
        {
          method: "POST",
          body,
          signal: abortController.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.key}`,
          },
          onopen: async (response) => {
            if (!response.ok) {
              abortController.abort();
              return reject(new Error(`Failed to open completion stream: ${response.status} ${response.statusText}`));
            }
          },
          onmessage: (event) => {
            if (event.data === "[DONE]") {
              result.text = result.text.trim();
              return resolve(result);
            }

            try {
              const data = JSON.parse(event.data);

              if (data?.id) {
                result.id = data.id;
              }

              if (data?.choices?.length) {
                const { delta } = data.choices[0];
                result.delta = delta.content;

                if (delta.content) {
                  result.text += delta.content;
                }

                if (delta.role) {
                  result.role = delta.role;
                }

                result.detail = data;

                onProgress?.(result);
              }
            } catch (error) {
              reject(error);
            }
          },
          onerror: (error) => {
            abortController.abort();
            return reject(error);
          },
          onclose: () => {
            result.text = result.text.trim();
            return resolve(result);
          },
        },
      );
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