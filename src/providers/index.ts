import type * as vscode from "vscode";

import { AnthropicProvider } from "./anthropic";
import { GoinferProvider } from "./goinfer";
import { KoboldcppProvider } from "./koboldcpp";
import { OpenAIProvider } from "./openai";
import { type Command } from "../templates/render";
import { AnthropicTokenizer, GPTTokenizer, LlamaTokenizer } from "../tokenizers";

export const DEFAULT_PROVIDER = "OpenAI Official";

export interface ProviderResponse {
  text: string;
  parentMessageId: string;
  conversationId: string;
  id: string;
}

export interface PostableViewProvider extends vscode.WebviewViewProvider {
  postMessage: (message: any) => void;
}

export interface Provider {
  /**
   * Creates a new Provider. This is called when a command is issued.
   * The provider is responsible for sending messages to the @type vscode.WebviewViewProvider.
   * It must send:
   *  - { type: "newChat" } when the chat is created
   *  - { type: "requestMessage", value: question } when a message is sent
   *  - { type: "partialResponse", value: partialResponse } when a partial response is received
   *  - { type: "responseFinished", value: response } when the last response is received
   * @param options
   * @param provider
   */
  create(provider: vscode.WebviewViewProvider, template: Command & { apiBaseUrl: string; provider: string }): Promise<void>;
  destroy(): void;
  send: (message: string, systemMessage?: string, template?: Command) => Promise<any>;
  repeatLast: () => Promise<void>;
  abort: () => void;
}

interface Format {
  /** The system portion of the message */
  system: string;
  /** The user portion of the message */
  user: string;
  /** This will be the first message sent in a conversation */
  first: string;
  /** Words that should trigger the end of a response */
  stops: string[];
}

export const formats: { [key: string]: Format } = {
  "OpenAI Official": {
    system: "{system_message}",
    user: "{user_message}",
    first: "{system}",
    stops: [],
  },
  Anthropic: {
    system: "{system_message}",
    user: "### Human: {user_message}\n\n### Assistant:",
    first: "{system}\n\n{user}",
    stops: ["### Human:"],
  },
  Alpaca: {
    system: "{system_message}",
    user: "### Instruction: {user_message}\n\n### Response:",
    first: "{system}\n\n{user}",
    stops: ["### Instruction:"],
  },
  Vicuna: {
    system: "{system_message}",
    user: "USER:\n{user_message}\nASSISTANT:",
    first: "{system}\n\n{user}",
    stops: ["USER:"],
  },
  ChatML: {
    system: "<|im_start|>system\n{system_message}<|im_end|>",
    user: "<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n",
    first: "{system}\n{user}",
    stops: ["<|im_end|>"],
  },
  "Llama 2": {
    system: "<<SYS>>\n{system_message}\n<</SYS>>",
    user: "<s>[INST] {user_message} [/INST]",
    first: "<s>[INST] {system}\n\n{user_message} [/INST]",
    stops: ["</s>"],
  },
  "Orca 2": {
    system: "### System:\n{system_message}",
    user: "### User:\n{user_message}\n\n### Response:\n",
    first: "{system}\n\n{user}",
    stops: ["### User:"],
  },
};

export const providers = {
  // https://platform.openai.com/docs/api-reference/chat/create
  "OpenAI Official": {
    provider: OpenAIProvider,
    defaults: {
      apiBaseUrl: "https://api.openai.com/v1",
      format: "OpenAI Official",
      tokenizer: "gpt-tokenizer",
      completionParams: {
        n: 1,
        model: "gpt-3.5-turbo",
        temperature: 0.3,
      },
    },
  },
  "OpenAI Proxy": {
    provider: OpenAIProvider,
    defaults: {
      apiBaseUrl: "http://localhost:8000",
      format: "Alpaca",
      tokenizer: "llama-tokenizer",
      completionParams: {
        n: 1,
        model: "gpt-3.5-turbo",
        temperature: 0.3,
      },
    },
  },
  // https://docs.anthropic.com/claude/reference/complete_post
  Anthropic: {
    provider: AnthropicProvider,
    defaults: {
      apiBaseUrl: "http://localhost:8000",
      format: "Anthropic",
      completionParams: {
        maxTokensToSample: 4096,
        topK: 5,
        model: "claude-instant-v1",
        temperature: 0.3,
      },
    },
  },
  LLama: {
    provider: OpenAIProvider,
    defaults: {
      apiBaseUrl: "http://localhost:8000",
      format: "Alpaca",
      tokenizer: "llama-tokenizer",
      completionParams: {
        model: "wizard-mega-13B-ggml.bin",
        temperature: 0.3,
      },
    },
  },
  LLama2: {
    provider: OpenAIProvider,
    defaults: {
      apiBaseUrl: "http://localhost:8000",
      format: "Llama 2",
      tokenizer: "llama-tokenizer",
      completionParams: {
        model: "wizard-mega-13B-ggml.bin",
        temperature: 0.3,
      },
    },
  },
  // https://synw.github.io/goinfer/llama_api/inference
  Goinfer: {
    provider: GoinferProvider,
    defaults: {
      apiBaseUrl: "http://localhost:5143",
      format: "Alpaca",
      tokenizer: "llama-tokenizer",
      completionParams: {
        model: "codellama-7b-instruct.Q4_K_M.gguf",
        temperature: 0.3,
      },
    },
  },
  Koboldcpp: {
    provider: KoboldcppProvider,
    defaults: {
      apiBaseUrl: "http://localhost:8000",
      format: "Alpaca",
      tokenizer: "llama-tokenizer",
      completionParams: {
        temperature: 0.8,
      },
    },
  },
};

export const tokenizers = {
  "gpt-tokenizer": {
    tokenizer: GPTTokenizer,
    description: "Use this with OpenAI GPT family models",
  },
  "llama-tokenizer": {
    tokenizer: LlamaTokenizer,
    description: "Use this with llama family models",
  },
  "anthropic-tokenizer": {
    tokenizer: AnthropicTokenizer,
    description: "Use this with Anthropic models",
  },
};
