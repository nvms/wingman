import { WebviewView } from "vscode";
import { PreparedCommand } from "../dispatcher";
import { AnthropicClient, CompletionResponse } from "./clients/anthropic";
import { APIProvider, applyFormat } from "./common";

// Note that this provider is only for Anthropic's legacy v1 and v2 Claude APIs.
export class AnthropicProvider implements APIProvider {
  webviewView: WebviewView;
  command: PreparedCommand;
  onProgressCallback: (text: string) => void;
  client: AnthropicClient;
  abortController: AbortController;
  history = "";

  constructor(viewProvider: WebviewView, command: PreparedCommand, onProgressCallback?: (text: string) => void) {
    this.webviewView = viewProvider;
    this.command = command;
    this.abortController = new AbortController();
    this.onProgressCallback = onProgressCallback;
    this.client = new AnthropicClient(this.command);
  }

  async send(message: string = undefined): Promise<string> {
    const { first } = applyFormat("Anthropic", this.command);

    if (message === undefined) {
      this.history = first;
    } else {
      const cmd = { ...this.command, message }
      const { user } = applyFormat("Anthropic", cmd);
      this.history = `${this.history}${user}`;
    }

    // @ts-ignore
    this.command.completionParams.stream = true;
    // @ts-ignore
    this.command.completionParams.prompt = this.history;

    try {
      const response = await this.client.stream(
        this.abortController.signal,
        (data: CompletionResponse) => {
          this.onProgressCallback?.(data.completion);
        },
      );

      this.history = `${this.history}${response.completion}`;

      return response.completion;
    } catch (error) {
      throw new Error(error);
    }
  }

  abort() {
    try {
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();
    } catch (error) {
      console.error(error);
    }
  }
}