import { ChatGPTAPI, type ChatMessage } from "chatgpt";
import fetch from "node-fetch";
import * as vscode from "vscode";

import { type PostableViewProvider, type ProviderResponse, type Provider } from ".";
import { type ReadyCommand, type Command } from "../templates/render";
import { handleResponseCallbackType } from "../templates/runner";
import { displayWarning, getConfig, getCurrentProviderConfig, getCurrentProviderName, getSecret, getSelectionInfo } from "../utils";

interface ConversationState {
  conversationId: string;
  parentMessageId: string;
}

let lastMessage: string | undefined;
let lastTemplate: Command | undefined;
let lastSystemMessage: string | undefined;

export class OpenAIProvider implements Provider {
  viewProvider: PostableViewProvider | undefined;
  instance: ChatGPTAPI | undefined;
  conversationState: ConversationState = { conversationId: "", parentMessageId: "" };
  _abort: AbortController = new AbortController();

  async create(provider: PostableViewProvider, template: ReadyCommand) {
    const apiKey = await getSecret<string>(`${getCurrentProviderName()}.apiKey`, "");
    this.viewProvider = provider;
    this.instance = new ChatGPTAPI({
      apiKey,
      apiBaseUrl: getCurrentProviderConfig("apiBaseUrl"),
      debug: false,
      // @ts-expect-error this works just fine
      fetch,
      completionParams: { ...template.completionParams },
    });
  }

  destroy() {
    this.instance = undefined;
  }

  abort() {
    this._abort.abort();
    this._abort = new AbortController();
  }

  async send(message: string, systemMessage?: string, template?: Command): Promise<void | ProviderResponse> {
    let isFollowup = false;

    lastMessage = message;

    if (template) {
      lastTemplate = template;
    }
    if (!template && !lastTemplate) {
      return;
    }
    if (!template) {
      template = lastTemplate!;
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

    let parentMessageId: string | undefined;

    if (!isFollowup) {
      this.viewProvider?.postMessage({ type: "newChat" });
    }

    try {
      this.viewProvider?.postMessage({ type: "requestMessage", value: message });

      const editor = vscode.window.activeTextEditor!;
      const selection = getSelectionInfo(editor);

      const response = await this.instance!.sendMessage(message, {
        onProgress: (partialResponse: ChatMessage) => {
          if (!parentMessageId) {
            parentMessageId = partialResponse.parentMessageId;
          }

          this.viewProvider?.postMessage({ type: "partialResponse", value: partialResponse });
        },
        systemMessage,
        timeoutMs: getConfig<number>("requestTimeoutMs") ?? 60 * 1000,
        abortSignal: this._abort.signal,
        ...this.conversationState,
      });

      this.conversationState = {
        conversationId: String(response.conversationId),
        parentMessageId: response.id,
      };

      this.viewProvider?.postMessage({ type: "responseFinished", value: response });

      if (!isFollowup) {
        handleResponseCallbackType(template, editor, selection, response.text);
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
}
