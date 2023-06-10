/* eslint-disable unused-imports/no-unused-vars */
import { Client, type CompletionResponse, type SamplingParameters, AI_PROMPT, HUMAN_PROMPT } from "@anthropic-ai/sdk";
import * as vscode from "vscode";

import { type PostableViewProvider, type Provider } from ".";
import { type Command } from "../templates/render";
import { displayWarning, getConfig, getSelectionInfo } from "../utils";

export class AnthropicProvider implements Provider {
  viewProvider: PostableViewProvider | undefined;
  instance: Client | undefined;
  conversationTextHistory: string | undefined;
  _abort: AbortController = new AbortController();

  create(provider: PostableViewProvider, template?: Command) {
    const { apiKey = "", apiBaseUrl } = {
      apiKey: getConfig("anthropic.apiKey") as string,
      apiBaseUrl: getConfig("anthropic.apiBaseUrl") as string | undefined,
    };

    this.viewProvider = provider;
    this.conversationTextHistory = undefined;
    this.instance = new Client(apiKey, { apiUrl: apiBaseUrl });
  }

  destroy() {
    this.instance = undefined;
    this.conversationTextHistory = undefined;
  }

  abort() {
    this._abort.abort();
    this._abort = new AbortController();
  }

  async send(message: string, systemMessage?: string, template?: Command): Promise<void> {
    const isFollowup = typeof this.conversationTextHistory === "string" && this.conversationTextHistory.length > 0;

    if (!isFollowup) {
      this.viewProvider?.postMessage({ type: "newChat" });
    }

    // prepend conversation history to message if it's a follow up
    const newUserMessage = `${this.conversationTextHistory ? `${this.conversationTextHistory}\n\n` : ""}${HUMAN_PROMPT} ${message}`;
    // prepend the system message if it exists
    const newPrompt = `${systemMessage ? `${systemMessage}\n\n` : ""}${newUserMessage}`;

    const samplingParameters: SamplingParameters = {
      prompt: newPrompt,
      temperature: template?.temperature ?? (getConfig("anthropic.temperature") as number),
      max_tokens_to_sample: template?.maxTokens ?? (getConfig("anthropic.maxTokens") as number) ?? 4096,
      stop_sequences: [HUMAN_PROMPT],
      top_k: template?.numberOfChoices,
      model: template?.model ?? (getConfig("anthropic.model") as string) ?? "claude-instant-v1",
    };

    try {
      this.viewProvider?.postMessage({ type: "requestMessage", value: message });

      const editor = vscode.window.activeTextEditor!;
      const selection = getSelectionInfo(editor);

      console.log(typeof this.instance!.completeStream);
      const response: CompletionResponse = await this.instance!.completeStream(samplingParameters, {
        onOpen: (response) => {
          console.log("Opened stream, HTTP status code", response.status);
        },
        onUpdate: (completionResponse: CompletionResponse) => {
          console.log("inside update");
          this.viewProvider?.postMessage({ type: "partialResponse", value: { text: completionResponse.completion } });
        },
        signal: this._abort.signal,
      });
      // Append the last response to the conversation history
      this.conversationTextHistory = `${newUserMessage}${AI_PROMPT} ${response.completion}`;
    } catch (error) {
      displayWarning(String(error));
    }
  }

  async repeatLast(): Promise<void> {}
}
