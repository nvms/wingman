import * as vscode from "vscode";

import { type PostableViewProvider, type ProviderResponse, type Provider } from ".";
import { Client, type KoboldInferParams } from "./sdks/koboldcpp";
import { type Command } from "../templates/render";
import { handleResponseCallbackType } from "../templates/runner";
import { displayWarning, getConfig, getSelectionInfo } from "../utils";

let lastMessage: string | undefined;
let lastTemplate: Command | undefined;
let lastSystemMessage: string | undefined;

export class KoboldcppProvider implements Provider {
  viewProvider: PostableViewProvider | undefined;
  instance: Client | undefined;
  conversationTextHistory: string | undefined;
  _abort: AbortController = new AbortController();

  async create(provider: PostableViewProvider, template: Command & { apiBaseUrl: string; provider: string }) {
    this.viewProvider = provider;
    this.conversationTextHistory = undefined;
    this.instance = new Client("", { apiUrl: template.apiBaseUrl });
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

    const modelTemplate = template?.completionParams?.template ?? (getConfig("defaultTemplate") as string) ?? "";
    const samplingParameters: KoboldInferParams = {
      prompt: modelTemplate.replace("{system}", systemMessage).replace("{prompt}", prompt),
      ...template?.completionParams,
      temperature: template?.completionParams?.temperature ?? (getConfig("openai.temperature") as number),
      max_length: 512,
    };

    try {
      this.viewProvider?.postMessage({ type: "requestMessage", value: message });

      const editor = vscode.window.activeTextEditor!;
      const selection = getSelectionInfo(editor);
      let partialText = "";

      await this.instance!.completeStream(samplingParameters, {
        onOpen: (response) => {
          console.log("Opened stream, HTTP status code", response.status);
        },
        onUpdate: (partialResponse: string) => {
          partialText += partialResponse;
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
      const response = this.toProviderResponse(partialText);

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
