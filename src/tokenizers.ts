import { countTokens as anthropicCountTokens } from "@anthropic-ai/tokenizer";
import { encode as gptEncode } from "gpt-tokenizer";
// @ts-expect-error Ignore missing type declarations
import llamaTokenizer from "llama-tokenizer-js";

export interface Tokenizer {
  countTokens: (text: string) => number;
  maxTokens: (text: string, ctx: number) => number;
}

export class LlamaTokenizer implements Tokenizer {
  countTokens(text: string) {
    return llamaTokenizer.encode(text).length;
  }

  maxTokens(text: string, ctx: number) {
    return ctx - llamaTokenizer.encode(text).length;
  }
}

export class GPTTokenizer implements Tokenizer {
  countTokens(text: string) {
    return gptEncode(text).length;
  }

  maxTokens(text: string, ctx: number) {
    return ctx - gptEncode(text).length;
  }
}

export class AnthropicTokenizer implements Tokenizer {
  countTokens(text: string) {
    return anthropicCountTokens(text);
  }

  maxTokens(text: string, ctx: number) {
    return ctx - anthropicCountTokens(text);
  }
}
