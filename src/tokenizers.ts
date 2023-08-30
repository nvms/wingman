export interface Tokenizer {
  countTokens: (text: string) => number;
  maxTokens: (text: string, ctx: number) => number;
}
