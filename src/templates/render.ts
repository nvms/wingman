import * as vscode from "vscode";

import { commandMap } from "../extension";
import { displayWarning, getConfig, getFilesForContextFormatted, getSelectionInfo } from "../utils";

const DEFAULT_PROMPT = "Elaborate, or leave blank.";

export async function substitute(templateString: string, editor: vscode.TextEditor, languageInstructions: string) {
  const { languageId } = editor.document;
  const { selectedText } = getSelectionInfo(editor);

  templateString = templateString.replace("{{filetype}}", languageId);
  templateString = templateString.replace("{{language}}", languageId);
  templateString = templateString.replace("{{text_selection}}", selectedText);

  // TODO: As of 1.3.6. Remove eventually in favor of {{input}}.
  // For now, warn the user so that they update their custom commands.
  if (templateString.includes("{{command_args")) {
    displayWarning("Heads up! {{command_args}} is deprecated and will be removed soon. Please use {{input}} instead.");

    const input = await vscode.window.showInputBox({
      prompt: DEFAULT_PROMPT,
      value: "",
    });

    if (input === undefined) {
      return;
    }

    templateString = templateString.replace("{{command_args}}.", input);
    templateString = templateString.replace("{{command_args}}", input);
  }

  if (templateString.includes("{{input}}")) {
    const input = await vscode.window.showInputBox({
      prompt: DEFAULT_PROMPT,
      value: "",
    });

    if (input === undefined) {
      return;
    }

    templateString = templateString.replace("{{input}}.", input);
    templateString = templateString.replace("{{input}}", input);
  }

  const inputRegex = /\{\{input:.*?\}\}/g;
  const inputMatches = templateString.match(inputRegex);

  if (inputMatches) {
    for (const match of inputMatches) {
      const input = await vscode.window.showInputBox({
        prompt: match.replace("{{input:", "").replace("}}", ""),
        value: "",
      });

      if (input === undefined) {
        return;
      }

      templateString = templateString.replace(match, input);
    }
  }

  templateString = templateString.replace("{{project_text}}", getFilesForContextFormatted().join("\n\n"));

  return templateString.replace("{{language_instructions}}", languageInstructions);
}

export enum BuiltinCategory {
  Completion = "Completion",
  DocumentationComments = "Documentation & comments",
  Tests = "Tests",
  Refactor = "Refactor",
  AnalysisDebugging = "Analysis & debugging",
  PullRequests = "Pull requests",
  Misc = "Misc",
  Translate = "Translate",
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
  command?: string;
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
  temperature: 0.3,
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
    label: "Complete selected",
    description: "Complete the code, using selection as guidance.",
    userMessageTemplate:
      "I have the following {{language}} code snippet:\n```{{filetype}}\n{{text_selection}}\n```\n\nIt is unfinished. Find the areas that appear to be unfinished and complete it. Use best practices and do not write any comments. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your solution in any way.",
    languageInstructions: {
      vue: "Use the modern Vue 3 composition API.",
    },
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Completion,
  },
  {
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
    label: "Write inline comments",
    description: "Using the selected code, writes inline comments.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite inline comments describing the code where appropriate. Do not write comments for self-explanatory code, such as variable assignments or log statements. IMPORTANT: Return the code inside of a code fence and nothing else. Do not explain your response.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.DocumentationComments,
  },
  {
    label: "Write function and inline comments",
    description: "Using the selected code, writes function and inline comments.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite inline comments describing the code where appropriate. Inline comments shoould be placed above the relevant code, and not at the end of the line. Do not write comments for self-explanatory code, such as variable assignments or log statements. Write a comment for the function using best practices. {{language_instructions}} IMPORTANT: Return the code with the new comments inside of a code fence and nothing else. Do not explain your response.",
    callbackType: CallbackType.Replace,
    languageInstructions: {
      cpp: "Write a doxygen style comments for the function using best practices.",
      java: "Write a javadoc style comments for the function using best practices.",
      typescript: "Write a TSDoc style comments for the function using best practices.",
      javascript: "Write a JSDoc style comments for the function using best practices.",
      typescriptreact: "Write a TSDoc style comments for the function using best practices.",
      javascriptreact: "Write a JSDoc style comments for the function using best practices.",
    },
    category: BuiltinCategory.DocumentationComments,
  },

  // Tests
  {
    label: "Write unit tests",
    description: "Using the selected code, writes unit tests for all selected code. Prompts for the name of the testing framework.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nWrite really good unit tests using best practices for the given language. Generate tests using the {{input:What test framework? (e.g. jest, testify, gtest)}} testing framework. Only return the unit tests. IMPORTANT: Only return the code inside of a code fence and nothing else.",
    callbackType: CallbackType.Buffer,
    category: BuiltinCategory.Tests,
  },
  {
    label: "Write a single test case",
    description: "Using the selected code, writes a single unit test case. Prompts for the name of the testing framework and the method to test.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nImportant: Only write unit tests for the {{input:Provide the name of the method you want to write tests for.}} method. Use best practices for the given language. Generate tests using the {{input:What test framework? (e.g. jest, testify, gtest)}} testing framework. Only return the unit tests. IMPORTANT: Only return the code inside of a code fence and nothing else.",
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
    label: "Refactor",
    description: "Prompts for guidance on how to refactor the selected code.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{input:How do you want to refactor this?}}\nRefactor the code to be more readable and maintainable. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    label: "Modify",
    description: "Modifies the selected code, using your input as guidance.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nYour task is to modify the code as instructed.\n\nInstructions: {{input:Provide instructions for how to modify this.}}\nIMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    label: "Optimize for performance",
    description: "Refactors the selected code, prioritizing performance.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nOptimize it for performance.\n\n{{input:Elaborate on what specifically to optimize, or leave blank to attempt general optimization.}}\nIMPORTANT: Only return the code inside of a code fence and nothing else.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    label: "Make it more functional",
    description: "Refactors the selected code, prioritizing a more functional programming style.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nRefactor the code to be more readable and maintainable. Prioritize a more functional programming style. This may include using higher-order functions, pure functions, and immutability. Do not change the behavior of the code in any way. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    label: "Make it more DRY",
    description: "Refactors the selected code, reducing code duplication as much as possible.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nRefactor the code by making it much more DRY, minimizing code duplication as much as possible. Do not change the behavior of the code in any way. {{language_instructions}} IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    label: "Decompose",
    description: "Decomposes monoliths, splits functions, reduces responsibiltiy, enhances modularity.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nRefactor the code to improve its modularity and reduce function responsibility. Decompose monoliths into smaller, more manageable components while adhering to the single responsibility methodology. However, do not create an excessive number of functions; use your best judgement to determine when a new function is necessary. {{language_instructions}} IMPORTANT: Only return the refactored code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    label: "Remove dead code",
    description: "Removes dead code, unused variables, etc.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nPerform a thorough analysis of the code to identify and remove any dead code, unused variables, or any other unnecessary artifacts. Your goal is to streamline the codebase and improve its clarity and maintainability.\n\nMake sure to review all sections of the code carefully, including function definitions, variable declarations, and conditionals. Identify any code segments that are no longer used or serve no purpose. Remove them to simplify the codebase while preserving its functionality.\n{{language_instructions}}\nIMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },
  {
    label: "More meaningful variable names",
    description: "Gives more meaningful variable names to those defined in the selected code.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\nUsing best practices for the given language, improve the variable names to be more meaningful.\n\nIMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Refactor,
  },

  // Analysis
  {
    label: "Analyze for bugs",
    description: "Lists discovered bugs and attempts to provide a solution for each.",
    userMessageTemplate:
      "Analyze the following {{language}} code for bugs:\n```{{filetype}}\n{{text_selection}}\n```\n\nList each discovered bug as a list item. If you have a solution for a bug, include it as a code block underneath the bug's list item.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.AnalysisDebugging,
  },
  {
    label: "Explain",
    description: "Explains the selected code.",
    userMessageTemplate:
      "Explain the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nExplain as if you were explaining to another developer.\n\n{{input:What specifically do you need explained? Leave blank for general explaination.}}",
    callbackType: CallbackType.None,
    category: BuiltinCategory.AnalysisDebugging,
  },
  {
    label: "Question",
    description: "Ask a question about the selected code.",
    userMessageTemplate: "I have a question about the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nQuestion: {{input:What is your question?}}",
    callbackType: CallbackType.None,
    category: BuiltinCategory.AnalysisDebugging,
  },
  {
    label: "Question about project",
    description: "Ask a question about your entire project.",
    userMessageTemplate:
      "I have a question regarding a {{language}} project. First, I will ask the question, then I will give you the code for the entire project. Your task is to answer the question, considering the project code in your answer.\n\nQuestion: {{input:What is your question?}}\n\nProject code:\n\n{{project_text}}",
    callbackType: CallbackType.Buffer,
    category: BuiltinCategory.AnalysisDebugging,
    provider: AIProvider.Anthropic,
  },
  {
    label: "Chat",
    description: "Chat about the selected code.",
    userMessageTemplate: "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\n{{input}}.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.AnalysisDebugging,
  },
  {
    label: "Time complexity",
    description: "Estimate the time complexity of the selected code.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\nPlease answer the following two questions and nothing else.\n1) What is the time complexity of this code? 2) How did you come to this conclusion?",
    callbackType: CallbackType.None,
    category: BuiltinCategory.AnalysisDebugging,
  },
  {
    label: "Log variables",
    description: "Logs the selected variables.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\nAdd debug statements throughout the code, logging to the console any variables that have been assigned therein.\n\nIMPORTANT: Only return the code, including the log statements, inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.AnalysisDebugging,
  },

  // Pull requests
  {
    label: "Review selected git diff",
    description: "Provides feedback on the selected git diff.",
    userMessageTemplate:
      "You are performing a {{language}} PR review. Be concise and provide constructive feedback. Briefly answer the following questions about the diff below:\nAre there any potential bugs or error-prone areas of this code? Are there any ways to rewrite this such that it is significantly improved? Can we optimize this without a major refactor?\nIMPORTANT: Respond in markdown style, with each question as a heading. Do not mention the lack of a PR description. If you have suggestions to code, include your suggestion in a code block with the filename in a comment at the top of the block.\n\n{{text_selection}}",
    systemMessageTemplate: "You are an assistant to a {{language}} developer and you are currently performing a pull request review.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.PullRequests,
  },
  {
    label: "Review selected code",
    description: "Provides feedback on the selected code.",
    userMessageTemplate:
      "You are performing a {{language}} PR review. Be concise and provide constructive feedback. Briefly answer the following questions about the code below:\nAre there any potential bugs or error-prone areas of this code? Are there any ways to rewrite this such that it is significantly improved? Can we optimize this without a major refactor?\nIMPORTANT: Respond in markdown style, with each question as a heading. Do not mention the lack of a PR description. If you have suggestions to modify the code, include your suggestion in a code block.\n\n{{text_selection}}",
    systemMessageTemplate: "You are an assistant to a {{language}} developer and you are currently performing a pull request review.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.PullRequests,
  },

  // Misc
  {
    label: "Chat",
    description: "Chat about anything.",
    userMessageTemplate: "{{input}}.",
    systemMessageTemplate: "You are a helpful assistant.",
    callbackType: CallbackType.None,
    category: BuiltinCategory.Misc,
  },
  {
    label: "Fix grammar",
    description: "Fix grammar mistakes in the selected text.",
    userMessageTemplate:
      "I have the following text:\n```{{filetype}}\n{{text_selection}}\n```\n\nCorrect any grammar mistakes and mistakes in spelling or punctuation. IMPORTANT: Return the text with any additional formatting it might have inside of a code fence and nothing else. If lines in the text are prefixed with what appears to be code comment characters, you must preserve those in your response. IMPORTANT: Do not explain your response, you must reply only with the corrected text.",
    systemMessageTemplate: "You are a technical writer, grammar expert, and {{language}} coding assistant.",
    callbackType: CallbackType.Replace,
    category: BuiltinCategory.Misc,
  },

  // Translate
  {
    label: "Translate to another language",
    description: "Translates the selected code to another language, enter a language when prompted.",
    userMessageTemplate:
      "I have the following {{language}} code:\n```{{filetype}}\n{{text_selection}}\n```\n\nTranslate it to {{input:What language do you want to translate this to? Add details such as framework if you like, e.g., 'node, using express'}}\n\nThe translated code must behave the same as the original code. IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes in any way.",
    callbackType: CallbackType.Buffer,
    category: BuiltinCategory.Translate,
  },
];

/**
 * Ensures that the template is merged into the base template.
 * @param commandName The name of either a builtin command or a user-defined command. (e.g. wingman.command.decompose)
 * @returns
 */
export const buildCommandTemplate = (commandName: string): Command => {
  const base = { ...baseCommand };
  const template: Command = commandMap.get(commandName) || base;

  // If a user-defined command does not specify a value for model or temperature,
  // we want to fallback to the value defined in settings.json, NOT the value
  // defined in baseCommand. Otherwise, the settings.json value will be ignored.
  const provider = template.provider ?? "openai";
  const model = template.model ?? getConfig<string>(`${provider}.model`);
  const temperature = template.temperature ?? getConfig<number>(`${provider}.temperature`);

  const languageInstructions = { ...base.languageInstructions, ...template.languageInstructions };
  const userMessageTemplate = template.userMessageTemplate.trim();
  const systemMessageTemplate = template.systemMessageTemplate?.trim();

  return {
    ...base,
    model,
    temperature,
    category: template.category ?? BuiltinCategory.Misc,
    ...template,
    languageInstructions,
    userMessageTemplate,
    systemMessageTemplate,
  };
};
