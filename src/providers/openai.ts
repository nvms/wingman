import * as vscode from "vscode";

import { type PostableViewProvider, type Provider } from ".";
import { Client } from "./sdks/openai";
import { type ReadyCommand } from "../templates/render";
import { handleResponseCallbackType } from "../templates/runner";
import { getConfig, getCurrentProviderConfig, getCurrentProviderName, getSecret, getSelectionInfo } from "../utils";

let lastMessage: string | undefined;
let lastTemplate: ReadyCommand | undefined;
let lastSystemMessage: string | undefined;

interface ChatMessage {
  id: string;
  text: string;
  role: "user" | "system" | "assistant" | "function";
  name?: string;
  delta?: string;
  detail?: any;
  parentMessageId?: string;
  conversationId?: string;
}

export class OpenAIProvider implements Provider {
  _abort: AbortController = new AbortController();
  viewProvider: PostableViewProvider | undefined;
  instance: Client | undefined;
  messages: any[] = [];

  async create(provider: PostableViewProvider, cmd: ReadyCommand) {
    this.viewProvider = provider;

    const key = await getSecret<string>(`${getCurrentProviderName()}.apiKey`, "");

    this.instance = new Client({
      apiKey: key,
      apiUrl: String(getCurrentProviderConfig("apiBaseUrl")),
      cmd,
    });
  }

  destroy() {}

  async send(message: string, systemMessage?: string, cmd?: ReadyCommand) {
    if (this.messages.length === 0) {
      this.messages.push({ role: "system", content: systemMessage });
    }

    this.messages.push({ role: "user", content: message });

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

    let parentMessageId: string | undefined;

    if (!isFollowup) {
      this.viewProvider?.postMessage({ type: "newChat" });
    }

    const params = {
      ...cmd.completionParams,
      stream: true,
      messages: this.messages,
    };

    try {
      this.viewProvider?.postMessage({ type: "requestMessage", value: message });

      const editor = vscode.window.activeTextEditor!;
      const selection = getSelectionInfo(editor);
      const response = await this.instance!.completeStream(params, {
        timeoutMs: getConfig<number>("requestTimeoutMs") ?? 60 * 1000,
        abortSignal: this._abort.signal,
        onProgress: (partialResponse: ChatMessage) => {
          if (!parentMessageId) {
            parentMessageId = partialResponse.parentMessageId;
          }

          this.viewProvider?.postMessage({
            type: "partialResponse",
            value: partialResponse,
          });
        },
      });

      this.viewProvider?.postMessage({ type: "responseFinished", value: response });

      if (!isFollowup) {
        handleResponseCallbackType(cmd, editor, selection, response.text);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async repeatLast() {
    if (!lastMessage || !lastSystemMessage || !lastTemplate) {
      return;
    }

    await this.send(lastMessage, lastSystemMessage, lastTemplate);
  }

  abort() {
    this._abort.abort();
    this._abort = new AbortController();
  }
}
