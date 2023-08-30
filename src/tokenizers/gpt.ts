import { encode as gptEncode } from "gpt-tokenizer";

import { type Tokenizer } from "../tokenizers";

export class GPTTokenizer implements Tokenizer {
  countTokens(text: string) {
    return gptEncode(text).length;
  }

  maxTokens(text: string, ctx: number) {
    return ctx - gptEncode(text).length;
  }
}
