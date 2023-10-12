import * as vscode from "vscode";

import { type PostableViewProvider, type ProviderResponse, type Provider, type formats } from ".";
import { Client, type CompletionResponse, type SamplingParameters } from "./sdks/anthropic";
import { type ReadyCommand, formatFirst, format } from "../templates/render";
import { handleResponseCallbackType } from "../templates/runner";
import { displayWarning, getCurrentProviderConfig, getCurrentProviderName, getProviderConfigValue, getSecret, getSelectionInfo } from "../utils";

let lastMessage: string | undefined;
let lastTemplate: ReadyCommand | undefined;
let lastSystemMessage: string | undefined;

export class AnthropicProvider implements Provider {
  viewProvider: PostableViewProvider | undefined;
  instance: Client | undefined;
  conversationTextHistory: string | undefined;
  _abort: AbortController = new AbortController();

  async create(provider: PostableViewProvider, _template: ReadyCommand) {
    const apiKey = await getSecret<string>(`${getCurrentProviderName()}.apiKey`, "");
    this.viewProvider = provider;
    this.conversationTextHistory = undefined;
    this.instance = new Client(apiKey, { apiUrl: getCurrentProviderConfig("apiBaseUrl") });
  }

  destroy() {
    this.instance = undefined;
    this.conversationTextHistory = undefined;
  }

  abort() {
    this._abort.abort();
    this._abort = new AbortController();
  }

  async send(message: string, systemMessage?: string, cmd?: ReadyCommand): Promise<void | ProviderResponse> {
    let isFollowup = false;

    lastMessage = message;

    if (cmd) {
      lastTemplate = cmd;
    }

    if (!cmd && !lastTemplate) {
      return;
    }

    if (!cmd) {
      cmd = lastTemplate!;
      isFollowup = true;
    }

    if (systemMessage) {
      lastSystemMessage = systemMessage;
    }

    if (!systemMessage && !lastSystemMessage) {
      return;
    }

    if (!systemMessage) {
      systemMessage = lastSystemMessage!;
    }

    let prompt;

    const fmt = getCurrentProviderConfig("format") as keyof typeof formats;

    if (!isFollowup) {
      this.viewProvider?.postMessage({ type: "newChat" });
      // The first message should have the system message prepended
      /* prompt = `${systemMessage ?? ""}${HUMAN_PROMPT} ${message}${AI_PROMPT}`; */
      prompt = formatFirst(systemMessage, message, fmt);
    } else {
      // followups should have the conversation history prepended
      /* prompt = `${this.conversationTextHistory ?? ""}${HUMAN_PROMPT} ${message}${AI_PROMPT}`; */
      prompt = `${this.conversationTextHistory ?? ""}${format(message, fmt)}`;
    }

    const samplingParameters: SamplingParameters = {
      ...cmd?.completionParams,
      prompt,
      temperature: Number(getProviderConfigValue("Anthropic", "temperature")),
      model: String(getProviderConfigValue("Anthropic", "model")),
    };

    try {
      this.viewProvider?.postMessage({ type: "requestMessage", value: message });

      const editor = vscode.window.activeTextEditor!;
      const selection = getSelectionInfo(editor);

      const anthropicResponse: CompletionResponse = await this.instance!.completeStream(samplingParameters, {
        onOpen: (response) => {
          console.log("Opened stream, HTTP status code", response.status);
        },
        onUpdate: (partialResponse: CompletionResponse) => {
          this.viewProvider?.postMessage({ type: "partialResponse", value: this.toProviderResponse(partialResponse) });
        },
        signal: this._abort.signal,
      });

      // Reformat the API response into a ProvderResponse
      const response = this.toProviderResponse(anthropicResponse);

      // Append the last response to the conversation history
      this.conversationTextHistory = `${this.conversationTextHistory ?? ""}${prompt} ${response.text}`;
      this.viewProvider?.postMessage({ type: "responseFinished", value: response });

      if (!isFollowup) {
        handleResponseCallbackType(cmd, editor, selection, response.text);
      }
    } catch (error) {
      displayWarning(String(error));
    }
  }

  async repeatLast() {
    if (!lastMessage || !lastSystemMessage || !lastTemplate) {
      return;
    }

    await this.send(lastMessage, lastSystemMessage, lastTemplate);
  }

  toProviderResponse(response: CompletionResponse) {
    return {
      // for some reason, the response completion text always has a space at the beginning.
      text: response.completion.trimStart(),
      parentMessageId: "",
      converastionId: "",
      id: "",
    };
  }
}
