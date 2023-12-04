export interface Tokenizer {
  countTokens(text: string): number;
  maxTokens(text: string, context: number): number;
}