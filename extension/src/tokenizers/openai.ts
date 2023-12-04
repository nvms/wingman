import { encode as gptEncode } from "gpt-tokenizer";
import { Tokenizer } from ".";

export class OpenAITokenizer implements Tokenizer {
  countTokens(text: string) {
    return gptEncode(text).length;
  }

  maxTokens(text: string, ctx: number) {
    return ctx - gptEncode(text).length;
  }
}
