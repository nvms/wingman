import type * as vscode from "vscode";

import { AnthropicProvider } from "./anthropic";
import { GoinferProvider } from "./goinfer";
import { KoboldcppProvider } from "./koboldcpp";
import { OpenAIProvider } from "./openai";
import { type ReadyCommand } from "../templates/render";
import { GPTTokenizer } from "../tokenizers/gpt";
import { LlamaTokenizer } from "../tokenizers/llama";

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
  create(provider: vscode.WebviewViewProvider, cmd: ReadyCommand): Promise<void>;
  destroy(): void;
  send: (message: string, systemMessage?: string, cmd?: ReadyCommand) => Promise<any>;
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
    user: "\n\nHuman: {user_message}\n\nAssistant:",
    first: "{system}{user}",
    stops: ["Human:"],
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
      apiBaseUrl: "https://api.openai.com/v1/chat/completions",
      format: "OpenAI Official",
      tokenizer: "gpt",
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
      apiBaseUrl: "http://localhost:8000/v1/chat/completions",
      format: "Alpaca",
      tokenizer: "llama",
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
      apiBaseUrl: "https://api.anthropic.com/v1/complete",
      format: "Anthropic",
      tokenizer: "llama",
      completionParams: {
        max_tokens_to_sample: 4096,
        top_k: 5,
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
      tokenizer: "llama",
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
      tokenizer: "llama",
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
      tokenizer: "llama",
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
      tokenizer: "llama",
      completionParams: {
        temperature: 0.8,
      },
    },
  },
};

export const tokenizers = {
  gpt: {
    tokenizer: GPTTokenizer,
    description: "Use this with OpenAI GPT family models",
  },
  llama: {
    tokenizer: LlamaTokenizer,
    description: "Use this with llama family models",
  },
  anthropic: {
    // This tokenizer relies on tiktoken_bg.wasm, which won't work in a
    // vscode extension. We'll probably need to fork this or find an alternative.
    /* tokenizer: AnthropicTokenizer, */
    description: "Use this with Anthropic models",
  },
};
