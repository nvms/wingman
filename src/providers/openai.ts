import { ChatGPTAPI, type ChatMessage } from "chatgpt";
import fetch from "node-fetch";
import * as vscode from "vscode";

import { type PostableViewProvider, type ProviderResponse, type Provider } from ".";
import { type Command } from "../templates/render";
import { handleResponseCallbackType } from "../templates/runner";
import { displayWarning, getConfig, getSecret, getSelectionInfo, setSecret, unsetConfig } from "../utils";

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

  async create(provider: PostableViewProvider, template?: Command) {
    const apiKey = getConfig<string>("openai.apiKey") ?? (await getSecret<string>("openai.apiKey", "llama"));

    // If the user still uses the now deprecated openai.apiKey config, move it to the secrets store
    // and unset the config.
    if (getConfig<string>("openai.apiKey")) {
      setSecret("openai.apiKey", getConfig<string>("openai.apiKey"));
      unsetConfig("openai.apiKey");
    }

    const {
      apiBaseUrl = "https://api.openai.com/v1",
      model = "gpt-3.5-turbo",
      temperature = 0.8,
    } = {
      apiBaseUrl: getConfig<string>("openai.apiBaseUrl") ?? getConfig<string>("apiBaseUrl"),
      model: template?.model ?? getConfig<string>("openai.model") ?? getConfig<string>("model"),
      temperature: template?.temperature ?? getConfig<number>("openai.temperature") ?? getConfig<number>("temperature"),
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
        // max_tokens: template?.maxTokens ?? getConfig<number>("openai.maxTokens") ?? 4096,
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
