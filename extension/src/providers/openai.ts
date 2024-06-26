import { WebviewView } from "vscode";
import { PreparedCommand } from "../dispatcher";
import { OpenAIClient } from "./clients/openai";
import { APIProvider, ClaudeOpenAIMessage, PartialResponse } from "./common";

export class OpenAIProvider implements APIProvider {
  webviewView: WebviewView;
  command: PreparedCommand;
  onProgressCallback: (text: string) => void;
  client: OpenAIClient;
  abortController: AbortController;
  messages: Array<ClaudeOpenAIMessage>;

  constructor(viewProvider: WebviewView, command: PreparedCommand, onProgressCallback?: (text: string) => void) {
    this.webviewView = viewProvider;
    this.command = command;
    this.abortController = new AbortController();
    this.onProgressCallback = onProgressCallback;
    this.client = new OpenAIClient(this.command);
  }

  /**
   * @param message Only provided when this is a follow-up message. Otherwise, the command message is used.
   */
  async send(message: string = undefined): Promise<string> {
    if (message === undefined || !this.messages || this.messages.length === 0) {
      this.messages = [{ role: "system", content: this.command.system }];
    }

    if (message === undefined) {
      this.messages.push({ role: "user", content: this.command.message });
    } else {
      this.messages.push({ role: "user", content: message });
    }

    // TODO:
    // const text = this.messages.map(({ content }) => content).join("\n\n");
    // const tokenizer = getActiveModeActivePresetKeyValue("tokenizer") as keyof typeof tokenizers;
    // const Tokenizer = new tokenizers[tokenizer].instance();
    // const maxTokens = Number(this.command.completionParams.max_tokens) >= 0 ? Number(this.command.completionParams.max_tokens) : 2048;
    // this.command.completionParams.max_tokens = Tokenizer.maxTokens(text, maxTokens);

    // @ts-ignore
    this.command.completionParams.stream = true;
    // @ts-ignore
    this.command.completionParams.messages = this.messages;

    try {
      const response = await this.client.stream(
        this.abortController.signal,
        (data: PartialResponse) => {
          this.onProgressCallback?.(data.text);
        },
      );

      this.messages.push({ role: "assistant", content: response.text });

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
