/* eslint-disable unused-imports/no-unused-vars */
import { type PostableViewProvider, type Provider } from ".";
import { type Command } from "../templates/render";

export class AnthropicProvider implements Provider {
  viewProvider: PostableViewProvider | undefined;
  instance: undefined;
  conversationState: undefined;
  _abort: AbortController = new AbortController();

  create(provider: PostableViewProvider, template?: Command) {
    this.viewProvider = provider;
  }

  destroy() {
    this.instance = undefined;
  }

  abort() {
    this._abort.abort();
    this._abort = new AbortController();
  }

  async send(message: string, systemMessage?: string, template?: Command): Promise<void> {}

  async repeatLast(): Promise<void> {}
}
