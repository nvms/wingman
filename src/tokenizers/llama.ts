// @ts-expect-error Ignore missing type declarations
import llamaTokenizer from "llama-tokenizer-js";

import { type Tokenizer } from "../tokenizers";

export class LlamaTokenizer implements Tokenizer {
  countTokens(text: string) {
    return llamaTokenizer.encode(text).length;
  }

  maxTokens(text: string, ctx: number) {
    return ctx - llamaTokenizer.encode(text).length;
  }
}
