import { ChatGPTAPI, type ChatMessage } from "chatgpt";
import fetch from "node-fetch";
import * as vscode from "vscode";

import { type PostableViewProvider, type ProviderResponse, type Provider } from ".";
import { display, getConfig } from "../extension";
import { type Command } from "../templates/render";
import { handleResponseCallbackType } from "../templates/runner";
import { getSelectionInfo } from "../utils";

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

  create(provider: PostableViewProvider, template?: Command) {
    const {
      apiKey = "",
      apiBaseUrl = "https://api.openai.com/v1",
      model = "gpt-3.5-turbo",
      temperature = 0.8,
    } = {
      apiKey: (getConfig("openai.apiKey") as string) ?? (getConfig("apiKey") as string),
      apiBaseUrl: (getConfig("openai.apiBaseUrl") as string) ?? (getConfig("apiBaseUrl") as string),
      model: template?.model ?? (getConfig("openai.model") as string) ?? (getConfig("model") as string),
      temperature: template?.temperature ?? (getConfig("openai.temperature") as number) ?? (getConfig("temperature") as number),
    };
    this.viewProvider = provider;
    this.instance = new ChatGPTAPI({
      apiKey,
      apiBaseUrl,
      debug: false,
      // @ts-expect-error this works just fine
      fetch,
      completionParams: {
        model,
        temperature,
      },
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
        timeoutMs: 60 * 1000,
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
      display(String(error));
    }
  }

  async repeatLast() {
    if (!lastMessage || !lastSystemMessage || !lastTemplate) {
      return;
    }

    await this.send(lastMessage, lastSystemMessage, lastTemplate);
  }
}
