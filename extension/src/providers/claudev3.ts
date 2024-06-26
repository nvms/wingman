import { WebviewView } from "vscode";
import { PreparedCommand } from "../dispatcher";
import { ClaudeV3Client } from "./clients/claudev3";
import { APIProvider, applyFormat, ClaudeOpenAIMessage, PartialResponse } from "./common";

// This file exists because Anthropic introduced breaking changes in their APIs between Claude's 2nd and 3rd generations.
// This Provider, and to a lesser extent the ClaudeV3 client, are very similar to the OpenAI versions.
// They can probably be combined.
export class ClaudeV3Provider implements APIProvider {
  webviewView: WebviewView;
  command: PreparedCommand;
  onProgressCallback: (text: string) => void;
  client: ClaudeV3Client;
  abortController: AbortController;
  messages: Array<ClaudeOpenAIMessage>;

  constructor(viewProvider: WebviewView, command: PreparedCommand, onProgressCallback?: (text: string) => void) {
    this.webviewView = viewProvider;
    this.command = command;
    this.abortController = new AbortController();
    this.onProgressCallback = onProgressCallback;
    this.client = new ClaudeV3Client(this.command);
  }

  async send(message: string = undefined): Promise<string> {
    const fmt = applyFormat("ClaudeV3", this.command);

    if (message === undefined || !this.messages || this.messages.length == 0) {
      this.messages = [{"role": "user", "content": fmt.user}];
    } else {
      this.messages.push({"role": "user", "content": fmt.user});
    }

    // @ts-ignore
    this.command.completionParams.messages = this.messages;
    // @ts-ignore
    this.command.completionParams.system = fmt.system;

    try {
      const response = await this.client.stream(
        this.abortController.signal,
        (data: PartialResponse) => {
          this.onProgressCallback?.(data.text);
        },
      );

      this.messages.push({"role": "assistant", "content": response.text});

      return response.text;
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