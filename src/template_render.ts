import { getConfig } from "./extension";

export function render(
  userMessage: string,
  languageId: string,
  textSelection: string,
  commandArgs: string | undefined,
  languageInstructions: string,
) {
  userMessage = userMessage.replace("{{filetype}}", languageId);
  userMessage = userMessage.replace("{{language}}", languageId);
  userMessage = userMessage.replace("{{text_selection}}", textSelection);

  if (commandArgs) {
    userMessage = userMessage.replace("{{command_args}}.", `${commandArgs}`);
    userMessage = userMessage.replace("{{command_args}}", `${commandArgs}`);
  } else {
    userMessage = userMessage.replace("{{command_args}}.", "");
    userMessage = userMessage.replace("{{command_args}}", "");
  }

  return userMessage.replace("{{language_instructions}}", languageInstructions);
}

export enum CallbackType {
  None = "none",
  Buffer = "buffer",
  Replace = "replace",
  AfterSelected = "afterSelected",
}

export enum ContextType {
  Selection = "selection",
  None = "none",
};

export interface Command {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  numberOfChoices?: number;
  command: string;
  label: string;
  userMessageTemplate: string;
  systemMessageTemplate?: string;
  languageInstructions?: {
    [languageId: string]: string;
  };
  callbackType?: CallbackType;
  contextType: ContextType;
  category?: string;
}

export const baseCommand: Command = {
  maxTokens: 4096,
  numberOfChoices: 1,
  model: "gpt-3.5-turbo",
  temperature: 0.8,
  command: "default",
  label: "Unnamed command",
  systemMessageTemplate: "You are a {{language}} coding assistant.",
  userMessageTemplate: "",
  callbackType: CallbackType.None,
  languageInstructions: {
    javascript: "Use modern JavaScript syntax.",
    typescript: "Use modern TypeScript syntax.",
    cpp: "Use modern C++ features.",
    html: "Use modern HTML syntax.",
    csharp: "Use modern C# syntax.",
  },
  contextType: ContextType.Selection,
  category: "Builtin default",
};

export const defaultCommands: Command[] = [
  {
    command: "completion",
    label: "Completion",
    userMessageTemplate:
      "I have the following {{language}} code snippet:\n```{{filetype}}\n{{text_selection}}\n```\n\nComplete the rest.\n{{command_args}}. Use best practices and do not write documentation. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your solution in any way.",
    languageInstructions: {
      typescript: "Use modern TypeScript features.",
      cpp: "Use modern C++ features.",
      vue: "Use the modern Vue 3 composition API."
    },
    callbackType: CallbackType.Replace,
    contextType: ContextType.Selection,
  },
  {
    command: "doc",
    label: "Write documentation",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite really good documentation using best practices for the given language. Attention paid to documenting parameters, return types, any exceptions or errors. Don't change the code. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain yourself.",
    languageInstructions: {
      cpp: "Use doxygen style comments for functions.",
      java: "Use javadoc style comments for functions.",
      typescript: "Use TSDoc style comments for functions.",
      javascript: "Use JSDoc style comments for functions.",
    },
    callbackType: CallbackType.Replace,
    contextType: ContextType.Selection,
  },
  {
    command: "tests",
    label: "Write unit tests",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite really good unit tests using best practices for the given language. {{language_instructions}} Only return the unit tests. IMPORTANT: Only return the code inside of a code fence and nothing else.",
    languageInstructions: {
      cpp: "Use modern C++ syntax. Generate unit tests using the gtest framework.",
      java: "Generate unit tests using the JUnit framework.",
    },
    callbackType: CallbackType.Buffer,
    contextType: ContextType.Selection,
  },
  {
    command: "refactor",
    label: "Refactor",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{command_args}}.\nRefactor the code to be more readable and maintainable. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    languageInstructions: {
      cpp: "Use modern C++ syntax.",
      java: "Use modern Java syntax.",
      typescript: "Use modern TypeScript syntax.",
      javascript: "Use modern JavaScript syntax.",
    },
    callbackType: CallbackType.Replace,
    contextType: ContextType.Selection,
  },
  {
    command: "debug",
    label: "Analyze for bugs",
    userMessageTemplate: "Analyze the following {{language}} code for bugs:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{command_args}}.",
    callbackType: CallbackType.None,
    contextType: ContextType.Selection,
  },
  {
    command: "explain",
    label: "Explain",
    userMessageTemplate:
      "Explain the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nExplain as if you were explaining to another developer.\n\n{{command_args}}.",
    callbackType: CallbackType.None,
    contextType: ContextType.Selection,
  },
  {
    command: "optimizePerformance",
    label: "Optimize for performance",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nOptimize it for performance.\n\n{{command_args}}.\nIMPORTANT: Only return the code inside of a code fence and nothing else.",
    callbackType: CallbackType.Replace,
    contextType: ContextType.Selection,
  },
  {
    command: "modify",
    label: "Modify",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nModify the code in the following way:\n\n{{command_args}}.\nIMPORTANT: Only return the code inside of a code fence and nothing else.",
    callbackType: CallbackType.Replace,
    contextType: ContextType.Selection,
  },
  {
    command: "chat_selection_context",
    label: "Chat",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{command_args}}.",
    callbackType: CallbackType.None,
    contextType: ContextType.Selection,
  },
  {
    command: "chat_no_context",
    label: "Chat",
    userMessageTemplate:
      "{{command_args}}.",
    callbackType: CallbackType.None,
    contextType: ContextType.None,
    category: "Builtin miscellaneous",
  },
  {
    command: "question",
    label: "Question",
    userMessageTemplate:
      "I have a question about the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nQuestion: {{command_args}}.",
    callbackType: CallbackType.None,
    contextType: ContextType.Selection,
  },
  {
    command: "grammar",
    label: "Fix grammar",
    userMessageTemplate:
      "I have the following text:\n```{{filetype}}\n{{text_selection}}\n```\n\nCorrect any grammar mistakes and mistakes in spelling or punctuation. IMPORTANT: Return the text with any additional formatting it might have inside of a code fence and nothing else. If lines in the text are prefixed with what appears to be code comment characters, you must preserve those in your response. IMPORTANT: Do not explain your response, you must reply only with the corrected text.",
    systemMessageTemplate: "You are a technical writer, grammar expert, and {{language}} coding assistant.",
    callbackType: CallbackType.Replace,
    contextType: ContextType.Selection,
    category: "Builtin miscellaneous",
  }
];

/**
 * Ensures that the template is merged into the base template.
 * @param command The name of either a builtin command or a user-defined command.
 * @returns 
 */
export const buildCommandTemplate = (command: string): Command => {
  const userTemplates = getConfig<Command[]>("userCommands", []);
  const defaultTemplate = defaultCommands.find((t) => t.command === command);
  const base = { ...baseCommand };

  const template: Command = userTemplates.find((t) => t.command === command) || defaultTemplate || base;

  const languageInstructions = { ...base.languageInstructions, ...template.languageInstructions };
  const userMessageTemplate = template.userMessageTemplate.trim();
  const systemMessageTemplate = template.systemMessageTemplate?.trim();

  return { ...base, category: "Uncategorized", ...template, languageInstructions, userMessageTemplate, systemMessageTemplate };
};
