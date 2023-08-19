import type * as vscode from "vscode";

import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { AIProvider, type Command } from "../templates/render";

export interface ProviderOptions {
  onProgress: (partialResponse: any) => void;
}

export interface ProviderResponse {
  text: string;
  parentMessageId: string;
  conversationId: string;
  id: string;
}

export interface PostableViewProvider extends vscode.WebviewViewProvider {
  postMessage: (message: any) => void;
}

export interface Provider {
  /**
   * Creates a new Provider. This is called when a command is issued.
   * The provider is responsible for sending messages to the @type vscode.WebviewViewProvider.
   * It must send:
   *  - { type: "newChat" } when the chat is created
   *  - { type: "requestMessage", value: question } when a message is sent
   *  - { type: "partialResponse", value: partialResponse } when a partial response is received
   *  - { type: "responseFinished", value: response } when the last response is received
   * @param options
   * @param provider
   */
  create(provider: vscode.WebviewViewProvider, template: Command): Promise<void>;
  destroy(): void;
  send: (message: string, systemMessage?: string, template?: Command) => Promise<any>;
  repeatLast: () => Promise<void>;
  abort: () => void;
}

export const providers = {
  [AIProvider.OpenAI]: OpenAIProvider,
  [AIProvider.Anthropic]: AnthropicProvider,
};
