/* eslint-disable unused-imports/no-unused-vars */
import * as vscode from "vscode";

import { type PostableViewProvider, type ProviderResponse, type Provider } from ".";
import { Client, type InferParams, type InferResult, type StreamedMessage, DEFAULT_TEMPLATE } from "./sdks/goinfer";
import { type Command } from "../templates/render";
import { handleResponseCallbackType } from "../templates/runner";
import { displayWarning, getConfig, getSecret, getSelectionInfo, setSecret, unsetConfig } from "../utils";

let lastMessage: string | undefined;
let lastTemplate: Command | undefined;
let lastSystemMessage: string | undefined;

export class GoinferProvider implements Provider {
  viewProvider: PostableViewProvider | undefined;
  instance: Client | undefined;
  conversationTextHistory: string | undefined;
  _abort: AbortController = new AbortController();

  async create(provider: PostableViewProvider, template: Command) {
    const apiKey = await getSecret<string>("openai.apiKey", "");

    // If the user still uses the now deprecated openai.apiKey config, move it to the secrets store
    // and unset the config.
    if (getConfig<string>("openai.apiKey")) {
      setSecret("openai.apiKey", getConfig<string>("openai.apiKey"));
      unsetConfig("openai.apiKey");
    }

    const { apiBaseUrl } = {
      apiBaseUrl: getConfig("openai.apiBaseUrl") as string | undefined,
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

    let prompt;
    if (!isFollowup) {
      this.viewProvider?.postMessage({ type: "newChat" });
      // The first message should have the system message prepended
      prompt = `${message}`;
    } else {
      // followups should have the conversation history prepended
      prompt = `${this.conversationTextHistory ?? ""}${message}`;
    }

    const samplingParameters: InferParams = {
      prompt,
      template: DEFAULT_TEMPLATE.replace("{system}", systemMessage),
      ...template?.completionParams,
      temperature: template?.completionParams?.temperature ?? (getConfig("openai.temperature") as number),
      model: template?.completionParams?.model ?? (getConfig("openai.model") as string) ?? "llama2",
    };

    try {
      this.viewProvider?.postMessage({ type: "requestMessage", value: message });

      const editor = vscode.window.activeTextEditor!;
      const selection = getSelectionInfo(editor);
      let partialText = "";

      const goinferResponse: InferResult = await this.instance!.completeStream(samplingParameters, {
        onOpen: (response) => {
          console.log("Opened stream, HTTP status code", response.status);
        },
        onUpdate: (partialResponse: StreamedMessage) => {
          partialText += partialResponse.content;
          // console.log("P", partialText);
          const msg = this.toProviderResponse(partialText);
          // console.log("MSG:", msg.text);
          this.viewProvider?.postMessage({
            type: "partialResponse",
            value: msg,
          });
        },
        signal: this._abort.signal,
      });

      // Reformat the API response into a ProvderResponse
      const response = this.toProviderResponse(goinferResponse.text);

      // Append the last response to the conversation history
      this.conversationTextHistory = `${this.conversationTextHistory ?? ""}${prompt} ${response.text}`;
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

  toProviderResponse(text: string) {
    return {
      text,
      parentMessageId: "",
      converastionId: "",
      id: "",
    };
  }
}
