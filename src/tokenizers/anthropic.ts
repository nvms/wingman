import { countTokens as anthropicCountTokens } from "@anthropic-ai/tokenizer";

import { type Tokenizer } from "../tokenizers";

export class AnthropicTokenizer implements Tokenizer {
  countTokens(text: string) {
    return anthropicCountTokens(text);
  }

  maxTokens(text: string, ctx: number) {
    return ctx - anthropicCountTokens(text);
  }
}
