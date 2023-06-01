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
    const endingPunctuations = [".", "!", "?"];

    if (endingPunctuations.some((p) => commandArgs!.endsWith(p))) {
      userMessage = userMessage.replace("{{command_args}}.", `${commandArgs}`);
    } else {
      userMessage = userMessage.replace("{{command_args}}", `${commandArgs}.`);
    }
  } else {
    userMessage = userMessage.replace("{{command_args}}.", "");
  }

  return userMessage.replace("{{language_instructions}}", languageInstructions);
}

export enum CallbackType {
  Buffer = "buffer",
  Replace = "replace",
  AfterSelected = "afterSelected",
}

export function callbackTypeToReadable(t: CallbackType | undefined) {
  if (!t) return "New buffer";

  switch (t) {
    case CallbackType.Buffer:
      return "";
    case CallbackType.Replace:
      return "Replaces selected lines";
    case CallbackType.AfterSelected:
      return "Place after selected";
  }
}

export enum ContextType {
  Selection = "selection",
  None = "none",
};

export interface Template {
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

export const baseTemplate: Template = {
  maxTokens: 4096,
  numberOfChoices: 1,
  model: "gpt-3.5-turbo",
  temperature: 0.8,
  command: "default",
  label: "Default",
  systemMessageTemplate: "You are a {{language}} coding assistant.",
  userMessageTemplate: "",
  callbackType: CallbackType.Buffer,
  languageInstructions: {
    javascript: "Use modern JavaScript syntax.",
    typescript: "Use modern TypeScript syntax.",
    cpp: "Use modern C++ features.",
    html: "Use modern HTML syntax.",
    csharp: "Use modern C# syntax.",
  },
  contextType: ContextType.Selection,
  category: "Default",
};

export const defaultTemplates: Template[] = [
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
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite really good documentation using best practices for the given language. Attention paid to documenting parameters, return types, any exceptions or errors. Don't change the code. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else.",
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
    callbackType: CallbackType.Buffer,
    contextType: ContextType.Selection,
  },
  {
    command: "explain",
    label: "Explain",
    userMessageTemplate:
      "Explain the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nExplain as if you were explaining to another developer.\n\n{{command_args}}.",
    callbackType: CallbackType.Buffer,
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
    callbackType: CallbackType.Buffer,
    contextType: ContextType.Selection,
  },
  {
    command: "chat_no_context",
    label: "Chat",
    userMessageTemplate:
      "{{command_args}}.",
    callbackType: CallbackType.Buffer,
    contextType: ContextType.None,
    category: "Miscellaneous",
  },
  {
    command: "question",
    label: "Question",
    userMessageTemplate:
      "I have a question about the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nQuestion: {{command_args}}.",
    callbackType: CallbackType.Buffer,
    contextType: ContextType.Selection,
  }
];

/**
 * Ensures that the template is merged into the base template.
 * @param command The name of either a builtin command or a user-defined command.
 * @returns 
 */
export const buildCommandTemplate = (command: string): Template => {
  const base = Object.assign({}, baseTemplate);
  const template: Template = (getConfig("userCommands", []) as Template[]).find((t) => t.command === command)
    || defaultTemplates.find((t) => t.command === command)
    || baseTemplate;

  const ret: Template = {
    ...base,
    ...template,
    languageInstructions: {
      ...base.languageInstructions,
      ...template.languageInstructions,
    },
  };

  ret.userMessageTemplate = ret.userMessageTemplate.trim();
  ret.systemMessageTemplate = ret.systemMessageTemplate?.trim();

  return ret;
};
