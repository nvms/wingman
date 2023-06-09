import { getConfig, getFilesForContextFormatted } from "../utils";

export function render(templateString: string, languageId: string, textSelection: string, commandArgs: string | undefined, languageInstructions: string) {
  templateString = templateString.replace("{{filetype}}", languageId);
  templateString = templateString.replace("{{language}}", languageId);
  templateString = templateString.replace("{{text_selection}}", textSelection);

  if (commandArgs) {
    templateString = templateString.replace("{{command_args}}.", `${commandArgs}`);
    templateString = templateString.replace("{{command_args}}", `${commandArgs}`);
  } else {
    templateString = templateString.replace("{{command_args}}.", "");
    templateString = templateString.replace("{{command_args}}", "");
  }

  templateString = templateString.replace("{{project_text}}", getFilesForContextFormatted().join("\n\n"));

  return templateString.replace("{{language_instructions}}", languageInstructions);
}

enum BuiltinCategory {
  Completion = "Completion",
  DocumentationComments = "Documentation & comments",
  Tests = "Tests",
  Refactor = "Refactor",
  Analysis = "Analysis",
  PullRequests = "Pull requests",
  Misc = "Misc",
}

export enum CallbackType {
  None = "none",
  Buffer = "buffer",
  Replace = "replace",
  AfterSelected = "afterSelected",
  BeforeSelected = "beforeSelected",
}

export enum AIProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export interface Command {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  numberOfChoices?: number;
  command: string;
  label: string;
  description?: string;
  userMessageTemplate: string;
  systemMessageTemplate?: string;
  languageInstructions?: {
    [languageId: string]: string;
  };
  callbackType?: CallbackType;
  category?: string;
  provider?: AIProvider;
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
    javascript: "Use modern JavaScript syntax and features.",
    typescript: "Use modern TypeScript syntax and features.",
    javascriptreact: "Use modern JavaScript syntax and features.",
    typescriptreact: "Use modern TypeScript syntax and features.",
    cpp: "Use modern C++ syntax and features.",
    html: "Use modern HTML syntax and features.",
    csharp: "Use modern C# syntax and features.",
  },
  category: BuiltinCategory.Misc,
  provider: AIProvider.OpenAI,
};

export const defaultCommands: Command[] = [
  // Completion
  {
    command: "completion",
    label: "Complete selected",
    description: "Complete the code, using selection as guidance.",
    userMessageTemplate:
      "I have the following {{language}} code snippet:\n```{{filetype}}\n{{text_selection}}\n```\n\nComplete the rest. Use best practices and do not write any comments. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your solution in any way.",
    languageInstructions: {
      vue: "Use the modern Vue 3 composition API.",
    },
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Completion,
  },
  {
    command: "completionComment",
    label: "Complete using comment",
    description: "Complete the code, using selected comment as guidance.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nGiven the related comment strings, please generate the required code. You may define helper functions if it is necessary. Please ensure that the generated code does exactly what the comments say it does. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way. IMPORTANT: If I have given you additional code that does not have a comment, then I have included it only for context - do not include it in your response, only use it to better understand the code you need to generate.",
    languageInstructions: {
      vue: "Use the modern Vue 3 composition API.",
    },
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Completion,
  },

  // Documentation & comments
  {
    command: "doc",
    label: "Write function comment",
    description: "Using the selected function, writes a language-specific comment for the function.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{language_instructions}} Attention paid to documenting parameters, return types, any exceptionss or errors.\n\nDo not create comments for the body of the function. IMPORTANT: Only return the comment inside of a code fence and nothing else. Do not include the function at all. Do not include the function signature at all. Do not explain your response.",
    languageInstructions: {
      cpp: "Write a doxygen style comments for the function using best practices.",
      java: "Write a javadoc style comments for the function using best practices.",
      typescript: "Write a TSDoc style comments for the function using best practices.",
      javascript: "Write a JSDoc style comments for the function using best practices.",
      typescriptreact: "Write a TSDoc style comments for the function using best practices.",
      javascriptreact: "Write a JSDoc style comments for the function using best practices.",
    },
    callbackType: CallbackType.BeforeSelected,
    category: BuiltinCategory.DocumentationComments,
  },
  {
    command: "docWithComments",
    label: "Write inline comments",
    description: "Using the selected code, writes inline comments.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite inline comments describing the code where appropriate. Do not write comments for code that should be extremely obvious, like variable assignments for example. IMPORTANT: Return the code inside of a code fence and nothing else. Do not explain your response.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.DocumentationComments,
  },

  // Tests
  {
    command: "tests",
    label: "Write unit tests",
    description: "Using the selected code, writes unit tests using language-specific testing frameworks.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite really good unit tests using best practices for the given language. {{language_instructions}} Only return the unit tests. IMPORTANT: Only return the code inside of a code fence and nothing else.",
    languageInstructions: {
      cpp: "Generate unit tests using the gtest framework.",
      java: "Generate unit tests using the JUnit framework.",
      go: "Generate unit tests using the testify framework.",
    },
    callbackType: CallbackType.Buffer,
    category: BuiltinCategory.Tests,
  },

  // Refactor
  {
    command: "refactor",
    label: "Refactor",
    description: "Prompts for guidance on how to refactor the selected code.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{command_args}}.\nRefactor the code to be more readable and maintainable. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    command: "refactorPerformance",
    label: "Optimize for performance",
    description: "Refactors the selected code, prioritizing performance.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nOptimize it for performance.\n\n{{command_args}}.\nIMPORTANT: Only return the code inside of a code fence and nothing else.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    command: "refactorFunctional",
    label: "Make it more functional",
    description: "Refactors the selected code, prioritizing a more functional programming style.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nRefactor the code to be more readable and maintainable. Make it much more functional. Do not change the behavior of the code in any way. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    command: "refactorDRY",
    label: "Make it more DRY",
    description: "Refactors the selected code, reducing code duplication as much as possible.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nRefactor the code by making it much more DRY, minimizing code duplication as much as possible. Do not change the behavior of the code in any way. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    command: "modify",
    label: "Modify",
    description: "Modifies the selected code, using your input as guidance.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nModify the code in the following way:\n\n{{command_args}}.\nIMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },

  // Analysis
  {
    command: "debug",
    label: "Analyze for bugs",
    description: "Lists discovered bugs and attempts to provide a solution for each.",
    userMessageTemplate:
      "Analyze the following {{language}} code for bugs:\n```{{filetype}}\n{{text_selection}}\n```\n\nList each discovered bug as a list item. If you have a solution for a bug, include it as a code block underneath the bug's list item.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.Analysis,
  },
  {
    command: "explain",
    label: "Explain",
    description: "Explains the selected code.",
    userMessageTemplate:
      "Explain the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nExplain as if you were explaining to another developer.\n\n{{command_args}}.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.Analysis,
  },
  {
    command: "question",
    label: "Question",
    description: "Ask a question about the selected code.",
    userMessageTemplate: "I have a question about the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nQuestion: {{command_args}}.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.Analysis,
  },
  {
    command: "project_question",
    label: "Question about project",
    description: "Ask a question about your entire project.",
    userMessageTemplate:
      "I have a question regarding a {{language}} project. First, I will ask the question, then I will give you the code for the entire project. Your task is to answer the question to, considering the project code in your answer.\n\nQuestion: {{command_args}}.\n\nProject code:\n\n{{project_text}}",
    callbackType: CallbackType.Buffer,
    category: BuiltinCategory.Analysis,
  },
  {
    command: "chatSelectionContext",
    label: "Chat",
    description: "Chat about the selected code.",
    userMessageTemplate: "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{command_args}}.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.Analysis,
  },
  {
    command: "complexity",
    label: "Time complexity",
    description: "Estimate the time complexity of the selected code.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\nPlease answer the following two questions and nothing else.\n1) What is the time complexity of this code? 2) How did you come to this conclusion?",
    callbackType: CallbackType.None,
    category: BuiltinCategory.Analysis,
  },

  // Pull requests
  {
    command: "prReviewDiff",
    label: "Review selected git diff",
    description: "Provides feedback on the selected git diff.",
    userMessageTemplate:
      "You are performing a {{language}} PR review. Be concise and provide constructive feedback. You are tasked with briefly answering the following questions about the diff below:\nAre there any obvious bugs? Are there any ways to rewrite this such that it is significantly improved? Can we optimize this without a major refactor?\nIMPORTANT: Respond in markdown style, with each question as a heading. Do not mention the lack of a PR description. If you have suggestions to code, include your suggestion in a code block with the filename in a comment at the top of the block.\n\n{{text_selection}}",
    systemMessageTemplate: "You are an assistant to a {{language}} developer and you are currently performing a pull request review.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.PullRequests,
  },
  {
    command: "prReviewCode",
    label: "Review selected code",
    description: "Provides feedback on the selected code.",
    userMessageTemplate:
      "You are performing a {{language}} PR review. Be concise and provide constructive feedback. You are tasked with briefly answering the following questions about the code below:\nAre there any obvious bugs? Are there any ways to rewrite this such that it is significantly improved? Can we optimize this without a major refactor?\nIMPORTANT: Respond in markdown style, with each question as a heading. Do not mention the lack of a PR description. If you have suggestions to code, include your suggestion in a code block with the filename in a comment at the top of the block.\n\n{{text_selection}}",
    systemMessageTemplate: "You are an assistant to a {{language}} developer and you are currently performing a pull request review.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.PullRequests,
  },

  // Misc
  {
    command: "chat_no_context",
    label: "Chat",
    description: "Chat about anything.",
    userMessageTemplate: "{{command_args}}.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.Misc,
  },
  {
    command: "grammar",
    label: "Fix grammar",
    description: "Fix grammar mistakes in the selected text.",
    userMessageTemplate:
      "I have the following text:\n```{{filetype}}\n{{text_selection}}\n```\n\nCorrect any grammar mistakes and mistakes in spelling or punctuation. IMPORTANT: Return the text with any additional formatting it might have inside of a code fence and nothing else. If lines in the text are prefixed with what appears to be code comment characters, you must preserve those in your response. IMPORTANT: Do not explain your response, you must reply only with the corrected text.",
    systemMessageTemplate: "You are a technical writer, grammar expert, and {{language}} coding assistant.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Misc,
  },
];

/**
 * Ensures that the template is merged into the base template.
 * @param commandName The name of either a builtin command or a user-defined command.
 * @returns
 */
export const buildCommandTemplate = (commandName: string): Command => {
  const builtinTemplate = defaultCommands.find((t) => t.command === commandName);
  const userTemplates = getConfig<Command[]>("userCommands", []);
  const base = { ...baseCommand };

  const template: Command = userTemplates.find((t) => t.command === commandName) || builtinTemplate || base;

  const languageInstructions = { ...base.languageInstructions, ...template.languageInstructions };
  const userMessageTemplate = template.userMessageTemplate.trim();
  const systemMessageTemplate = template.systemMessageTemplate?.trim();

  return {
    ...base,
    category: template.category || BuiltinCategory.Misc,
    ...template,
    languageInstructions,
    userMessageTemplate,
    systemMessageTemplate,
  };
};
