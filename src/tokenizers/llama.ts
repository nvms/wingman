// @ts-expect-error Ignore missing type declarations
import llamaTokenizer from "llama-tokenizer-js";

import { type Tokenizer } from "../tokenizers";

export class LlamaTokenizer implements Tokenizer {
  countTokens(text: string) {
    return llamaTokenizer.encode(text).length;
  }

  /**
   * Calculates the maximum number of tokens that can be added to a given context.
   * The number of tokens that can be added is determined by subtracting the length of the encoded text from the context size.
   * @param text - The input text to be encoded.
   * @param ctx - The context size or maximum number of tokens allowed.
   * @returns The maximum number of tokens that can be added to the given context.
   */
  maxTokens(text: string, ctx: number): number {
    return ctx - llamaTokenizer.encode(text).length;
  }
}
