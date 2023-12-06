export type PromptDefinition = {
  modeId: string;
  category: string;
  title: string;
  description: string;
  message: string;
  system?: string;
  insertionMethod?: InsertionMethod;
}

export interface Mode {
  label: string;
  id: string;
}

export enum InsertionMethod {
  None = "none",
  Replace = "replace",
  Before = "before",
  After = "after",
  New = "new",
};

// https://code.visualstudio.com/docs/languages/identifiers
// A map of language identifiers to human-readable language names.
const ftMap = new Map<string, string>([
  ["abap", "ABAP"],
  ["bat", "Windows Bat"],
  ["bibtex", "BibTeX"],
  ["clojure", "Clojure"],
  ["coffeescript", "CoffeeScript"],
  ["c", "C"],
  ["cpp", "C++"],
  ["csharp", "C#"],
  ["css", "CSS"],
  ["cuda-cpp", "CUDA C++"],
  ["diff", "Diff"],
  ["dockerfile", "Dockerfile"],
  ["dockercompose", "Docker Compose"],
  ["fsharp", "F#"],
  ["git-commit", "Git Commit"],
  ["git-rebase", "Git Rebase"],
  ["go", "Go"],
  ["groovy", "Groovy"],
  ["haml", "Haml"],
  ["html", "HTML"],
  ["javascript", "JavaScript"],
  ["javascriptreact", "JavaScript React"],
  ["json", "JSON"],
  ["jsonc", "JSON with Comments (JSONC)"],
  ["makefile", "Makefile"],
  ["markdown", "Markdown"],
  ["objective-c", "Objective-C"],
  ["objective-cpp", "Objective-C++"],
  ["perl", "Perl"],
  ["perl6", "Perl 6"],
  ["php", "PHP"],
  ["less", "Less"],
  ["latex", "LaTeX"],
  ["lua", "Lua"],
  ["plaintext", "Plain Text"],
  ["powershell", "PowerShell"],
  ["jade", "Pug"],
  ["julia", "Julia"],
  ["pug", "Pug"],
  ["python", "Python"],
  ["r", "R"],
  ["razor", "Razor (cshtml)"],
  ["ruby", "Ruby"],
  ["rust", "Rust"],
  ["scss", "SCSS"],
  ["shaderlab", "ShaderLab"],
  ["shellscript", "Shell Script (Bash)"],
  ["slim", "Slim"],
  ["sql", "SQL"],
  ["stylus", "Stylus"],
  ["swift", "Swift"],
  ["typescript", "TypeScript"],
  ["typescriptreact", "TypeScript React"],
  ["tex", "TeX"],
  ["vb", "Visual Basic"],
  ["vue", "Vue"],
  ["vue-html", "Vue HTML"],
  ["xml", "XML"],
  ["xsl", "XSL"],
  ["yaml", "YAML"],
]);

// A map of file extensions to language identifiers.
const extMap = new Map<string, string>([
  ["abap", "abap"],
  ["bat", "bat"],
  ["clj", "clojure"],
  ["cljc", "clojure"],
  ["cljr", "clojure"],
  ["cljs", "clojure"],
  ["coffee", "coffeescript"],
  ["c", "c"],
  ["cjs", "javascript"],
  ["cpp", "cpp"],
  ["cs", "csharp"],
  ["css", "css"],
  ["diff", "diff"],
  ["dockerfile", "dockerfile"],
  ["fs", "fsharp"],
  ["h", "cpp"],
  ["hpp", "cpp"],
  ["jav", "java"],
  ["java", "java"],
  ["jl", "julia"],
  ["js", "javascript"],
  ["jsx", "javascriptreact"],
  ["md", "markdown"],
  ["mdx", "markdown"],
  ["mjs", "javascript"],
  ["ps1", "powershell"],
  ["py", "python"],
  ["tsx", "typescriptreact"],
  ["ts", "typescript"],
  ["tsx", "typescriptreact"],
]);

export const getHumanReadableLanguageName = (identifier: string, extension?: string) => {
  if (ftMap.has(identifier)) {
    return ftMap.get(identifier);
  } else if (extension && extMap.has(extension) && ftMap.has(extMap.get(extension)!)) {
    return ftMap.get(extMap.get(extension)!);
  } else if (extension && extMap.has(extension)) {
    return extMap.get(extension);
  } else {
    return ftMap.get("plaintext");
  }
};

export const languageInstructions = {
  javascript: "Use modern JavaScript syntax and features.",
  typescript: "Use modern TypeScript syntax and features.",
  javascriptreact: "Use modern JavaScript syntax and features. Prefer functional components over class components.",
  typescriptreact: "Use modern TypeScript syntax and features. Prefer functional components over class components.",
  cpp: "Use modern C++ syntax and features.",
  c: "Use modern C syntax and features.",
  python: "Use modern Python syntax and features.",
  csharp: "Use modern C# syntax and features.",
  php: "Use modern PHP syntax and features.",
}

export const generateId = () => Math.random().toString(36).substring(2, 15);

export const MODE_PROGRAMMING_ID = "i85zwf6o1xa";
export const MODE_CREATING_WRITING_ID = "cg5j1roh85p";
export const MODE_TECHNICAL_WRITING_ID = "goqf1wael1a";

export const systems = new Map<string, string>([
  [MODE_PROGRAMMING_ID, "You are an assistant to a {{language}} programmer. You are a skilled programmer and extremely knowledgable in {{language}}."],
  [MODE_CREATING_WRITING_ID, "You are an assistant to a creative writer."],
  [MODE_TECHNICAL_WRITING_ID, "You are an assistant to a technical writer."],
]);

export const defaultModes: Mode[] = [
  {
    id: MODE_PROGRAMMING_ID,
    label: "General programming",
  },
  {
    id: MODE_CREATING_WRITING_ID,
    label: "Creative writing",
  },
  {
    id: MODE_TECHNICAL_WRITING_ID,
    label: "Technical writing",
  }
];

const CODE_IMPORTANT = "IMPORTANT: Only return the code inside of a code fence and nothing else. Do not explain your changes.";
const CODE_SELECTION = "```{{ft}}\n{{selection}}\n```";
const CODE_HAVE = `I have the following {{language}} code:\n\n${CODE_SELECTION}\n\n`;

const PROSE_IMPORTANT = "IMPORTANT: Only return the text inside of the code fence and nothing else. I'm aware that this text is not code - put it inside of a code block anyways. Do not explain your changes.";
const PROSE_SELECTION = "```\n{{selection}}\n```";
const PROSE_HAVE = `I have the following text:\n\n${PROSE_SELECTION}\n\n`;


enum Category {
  Refactoring = "Refactoring",
  Analysis = "Analysis & Debugging",
  Documentation = "Documentation",
  Testing = "Testing",
  CodeReview  = "Code Review",
  Completion = "Completion",
}

export const defaultPrompts: PromptDefinition[] = [
  // Programming: Refactoring
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Make modification",
    description: "Modify existing code for improvement or new features.",
    message: `${CODE_HAVE}You are tasked with making the following modification: {{input:What modification do you want to make?}}\n\nDo not make any other changes to the code.\n\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Performance optimization",
    description: "Enhance the efficiency and speed of the code.",
    message: `${CODE_HAVE}Optimize the code to be more efficient and faster.\n{{input:Elaborate on what specifically to optimize, or leave blank to attempt general optimization.}}\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Modernize",
    description: "Modernize the selected code where possible.",
    message: `${CODE_HAVE}Modernize this code without changing its behavior.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Clarity improvement",
    description: "Improve the clarity and readability of the code.",
    message: `${CODE_HAVE}Improve the clarity and readability of the code so that it can be easily understood by a human.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Simplify",
    description: "Simplify complex code segments for better understanding.",
    message: `${CODE_HAVE}Simplify this code so that it is less complex and more easily understandable.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Cleanup",
    description: "Clean up the code to improve its readability and maintainability.",
    message: `${CODE_HAVE}Clean up the code to improve its readability and maintainability. This may include removing unnecessary code, renaming variables, or reorganizing code segments for simplification purposes.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Make functional",
    description: "Refactor the code to follow functional programming principles.",
    message: `${CODE_HAVE}Refactor this code so that it adheres to more conventional functional programming principles. Introduce immutability and pure functions where possible.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Make DRY",
    description: "Eliminate redundant code and apply DRY (don't repeat yourself) principles.",
    message: `${CODE_HAVE}Refactor the code by making it much more DRY, minimizing code duplication as much as possible without changing its behavior.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Decompose",
    description: "Break down large functions or modules into smaller, more manageable parts.",
    message: `${CODE_HAVE}Refactor the code to improve its modularity and reduce function responsibility. Decompose monoliths into smaller, more manageable components. Use your best judgement to determine when a new function is necessary.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Recompose",
    description: "Reorganize code components for better structure and readability.",
    message: `${CODE_HAVE}Refactor this code by recomposing it such that it has a better (cleaner, more thoughtfully organized) structure and its readability is improved without changing its behavior in any way.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Make robust",
    description: "Strengthen code against potential errors and edge cases.",
    message: `${CODE_HAVE}Refactor the code to make it more robust and resilient against potential errors and edge cases. This may include adding error handling, input validation, or ensuring the code behaves correctly under edge cases.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Better identifier names",
    description: "Rename identifiers (function names, variables, etc) to be more meaningful and descriptive.",
    message: `${CODE_HAVE}Refactor this code by renaming any poorly-named identifiers (such as functions, enums, variables, etc.), so that they have more meaningful and descriptive names.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Refactoring,
    title: "Remove dead code",
    description: "Identify and remove unused or obsolete code segments.",
    message: `${CODE_HAVE}Refactor this code, removing any unused or obsolete code segments without changing the behavior of the code in any way.\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },

  // Programming: Analysis & Debugging
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Analysis,
    title: "Analyze for bugs",
    description: "Examine code to identify and locate bugs.",
    message: `${CODE_HAVE}Analyze the code for bugs. List each bug as a list item. If you have a solution for a bug, include it as a code block underneath the bug's list item.`,
    insertionMethod: InsertionMethod.None,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Analysis,
    title: "Fix a known bug",
    description: "Identify and implemenet a solution for a known bug.",
    message: `${CODE_HAVE}Your task is to find and fix this bug: {{input:What is the bug?}}\n{{language_instructions}}\n\n${CODE_IMPORTANT}`,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Analysis,
    title: "Explain",
    description: "Clarify complex code segments for better understanding.",
    message: `${CODE_HAVE}Explain this code as if you were explaining to another developer. Use your best judgement to determine how much explanation is necessary.`,
    insertionMethod: InsertionMethod.None,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Analysis,
    title: "Question",
    description: "Ask a question about the selected code.",
    message: `${CODE_HAVE}I have a question about this code: {{input:What is your question?}}`,
    insertionMethod: InsertionMethod.None,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Analysis,
    title: "Chat",
    description: "Chat generally about the selected code.",
    message: `${CODE_HAVE}I want to talk about this code.\n\n{{input:What do you want to say?}}`,
    insertionMethod: InsertionMethod.None,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Analysis,
    title: "Time complexity",
    description: "Calculates, to the best of its ability, the time complexity of the selected code.",
    message: `${CODE_HAVE}Calculate the time complexity of the code. Return the Big O notation of the time complexity. If you are unable to calculate the time complexity, return "unknown".`,
    insertionMethod: InsertionMethod.None,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Analysis,
    title: "Log variables",
    description: "For all variables used in the selected text, attempts to log them.",
    message: `${CODE_HAVE}Add debug statements throughout the code, logging all variables that are used in the selected text.\n\n${CODE_IMPORTANT}`,
  },

  // Programming: Documentation
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Documentation,
    title: "Function comment",
    description: "Writes a comment for the selected function.",
    message: `${CODE_HAVE}Create a comment for this function/method. Attention paid to documenting parameters, return types, and any exceptions or errors. Do NOT create comments for the body of the function. In fact, do not alter the function itself in any way, even to add types. Do not include the function signature or the function in your output. Do not create comments for the body of the function. Only return the function comment and nothing else.\n\n${CODE_IMPORTANT}`,
    insertionMethod: InsertionMethod.Before,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Documentation,
    title: "Inline comments",
    description: "Writes comments throughout the selected code.",
    message: `${CODE_HAVE}Write comments throughout the code describing the code where appropriate. DO NOT place the comments at the END of a line of code. Instead, put each comment a line above the code segment it refers to. You do not need to comment on every single line of code. Assume another developer will be reading these comments. The comments should be useful and not state the obvious. Return all of the given code as-is, but with your comments included. Do not write comments for self-explanatory code, such as variable assignments or log statements.\n\n${CODE_IMPORTANT}`,
  },

  // Programming: Completion
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Completion,
    title: "Complete the selection",
    description: "Attempts to complete the selected code, using context and comments as guidance.",
    message: `${CODE_HAVE}Complete the code by filling in parts that appear to be missing. Use any existing comments as guidance. Do not change anything else.\n\n${CODE_IMPORTANT}`,
    insertionMethod: InsertionMethod.Replace,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: Category.Completion,
    title: "Complete from comment",
    description: "Given a comment selection, replaces the comment with an implementation of the comment.\n\nExample selection:\n\n// A module that exports a number of helpers for gathering various aspects of a git repository, including the current branch, most recent logs, and more.",
    message: `I have a comment that describes code that needs to be written. Your task is to write the code that satisfies the comment. Here is the comment:\n\n{{selection}}\n\n${CODE_IMPORTANT}{{:temperature:0.7}}`,
    insertionMethod: InsertionMethod.Replace,
  },

  // Programming: Miscellaneous
  {
    modeId: MODE_PROGRAMMING_ID,
    category: "Miscellaneous",
    title: "Scaffold a file",
    description: "Creates a new file, using input as guidance. For example, when prompted: 'A Svelte Button component using TailwindCSS for styling.'",
    message: `Your task is to help me create an entirely new file. I will give you a brief description of what I'd like to create, and you will give me a solution that completely implements my request. Do not leave out details and do not leave in any TODO statements. Ensure the entire solution is contained to a single file only. Here's what I want you to create: {{input:What do you want to make?}}\n\n${CODE_IMPORTANT}`,
    insertionMethod: InsertionMethod.New,
  },
  {
    modeId: MODE_PROGRAMMING_ID,
    category: "Miscellaneous",
    title: "Chat (no context)",
    description: "Just chat about programming. Rubber duck an idea. Ask a question. Whatever.",
    message: "{{input:What do you want to say?}}",
    insertionMethod: InsertionMethod.None,
  },

  // Creative writing
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Alterations",
    title: "Make more concise",
    description: "Aid in making the selected text more concise.",
    message: `${PROSE_HAVE}Improve the conciseness of text. Do not change anything else.\n\n${PROSE_IMPORTANT}{{:temperature:0.5}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Alterations",
    title: "Fix grammar",
    description: "Correct any grammatical errors in the selected text.",
    message: `${PROSE_HAVE}Correct any grammar mistakes in the text, such as spelling, punctuation, or other errors. Do not change anything else.\nAfter you correct the text, provide a brief, concise itemized list of the changes that were made for my review.\n\n${PROSE_IMPORTANT}{{:temperature:0.2}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Alterations",
    title: "Pacing",
    description: "Improve the pacing of the selected text.",
    message: `${PROSE_HAVE}Improve the pacing of the text such that it is more dynamic, shortening sentences that may be too long and lengthening sentences that may be too short. The aim is to make the text read more naturally, the way that humans speak.\n\n${PROSE_IMPORTANT}{{:temperature:0.7}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Alterations",
    title: "Directed edit",
    description: "Make a specific change to the selected text.",
    message: `${PROSE_HAVE}Make the following change to the text: {{input:What change do you want to make?}}\n\n${PROSE_IMPORTANT}{{:temperature:0.8}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Creative assistance",
    title: "Improve scene visualization",
    description: "Aid in describing scenes vividly and effectively.",
    message: `${PROSE_HAVE}Improve the description of the scene to be more vivid and effective.\n\n${PROSE_IMPORTANT}{{:temperature:0.9}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Creative assistance",
    title: "Dialogue improvement",
    description: "Aid in writing dialogue that is more natural and effective.",
    message: `${PROSE_HAVE}Improve the dialogue to be more natural and effective. Don't change anything that isn't dialogue.\n\n${PROSE_IMPORTANT}{{:temperature:0.9}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Research and fact-checking",
    title: "Historical accuracy",
    description: "Corrects any historical inaccuracies in the text.",
    message: `${PROSE_HAVE}Modify the text by correcting any historical inaccuracies. Do not change anything else.\n\n${PROSE_IMPORTANT}{{:temperature:0.3}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Research and fact-checking",
    title: "Fact verification",
    description: "Corrects in any factual inaccuracies in the text.",
    message: `${PROSE_HAVE}If anything mentioned in this text is factually inaccurate, please correct just those parts.\n\n${PROSE_IMPORTANT}{{:temperature:0.3}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Research and fact-checking",
    title: "Verify technical details",
    description: "Ensures that technical details are correct and plausible.",
    message: `${PROSE_HAVE}If anything mentioned in this text is technically inaccurate or not plausible, adjust them so that they are.\n\n${PROSE_IMPORTANT}{{:temperature:0.3}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Research and fact-checking",
    title: "Cultural sensitivity check",
    description: "Ensures that the text is culturally sensitive.",
    message: `${PROSE_HAVE}If anything mentioned in this text is culturally insensitive, correct it so that it is sensitive.\n\n${PROSE_IMPORTANT}{{:temperature:0.6}}`,
  },
  {
    modeId: MODE_CREATING_WRITING_ID,
    category: "Scoring",
    title: "All",
    description: "Scores the selected text on the following criteria: clarity, conciseness, and correctness.",
    message: `${PROSE_HAVE}Score the text on the following criteria: clarity, conciseness, and correctness. IMPORTANT: Only return a bulleted list of the scores. Additionally, under each bullet point, briefly explain your reasoning for the score. Do not return anything else.`,
    insertionMethod: InsertionMethod.None,
  },

  // Technical writing
  {
    modeId: MODE_TECHNICAL_WRITING_ID,
    category: "Structure and optimization",
    title: "Focus area identification",
    description: "Highlight key areas in the text that need more detail or clarity.",
    message: `${PROSE_HAVE}Identify and highlight key areas in the text that need more detail or clarity. These areas may require further explanation, examples, or elaboration. Present these areas in a bulleted list, along with suggestions for improvement.\n\n${PROSE_IMPORTANT}`,
    insertionMethod: InsertionMethod.None,
  },
  {
    modeId: MODE_TECHNICAL_WRITING_ID,
    category: "Structure and optimization",
    title: "Ensure logical hierarchy",
    description: "Ensure that information is presented in a logical, hierarchical manner.",
    message: `${PROSE_HAVE}Review the text and ensure that the information is presented in a logical, hierarchical manner. Make any necessary changes to the structure of the text to improve its organization.\n\n${PROSE_IMPORTANT}`,
  },
  {
    modeId: MODE_TECHNICAL_WRITING_ID,
    category: "Language and style",
    title: "Adjust tone for formal audience",
    description: "Adjust the tone of the selected text to be more appropriate for a formal audience.",
    message: `${PROSE_HAVE}Adjust the tone of the text to be more appropriate for a formal audience.\nThe intended audience for this text is:\n\n${PROSE_IMPORTANT}`,
  },
  {
    modeId: MODE_TECHNICAL_WRITING_ID,
    category: "Language and style",
    title: "Adjust tone for casual audience",
    description: "Adjust the tone of the selected text to be more appropriate for a casual audience.",
    message: `${PROSE_HAVE}Adjust the tone of the text to be more appropriate for a casual audience.\nThe intended audience for this text is:\n\n${PROSE_IMPORTANT}`,
  }
];

export enum ChatEvents {
  ChatInitiated = "chatInitiated",
  ChatMessageSent = "chatMessageSent",
  ChatMessageReceived = "chatMessageReceived",
  ChatEnded = "chatEnded",
}

export interface Preset {
  id: string;
  name: string;
  provider: string;
  format: string;
  tokenizer: string;
  url: string;
  system: string;
  completionParams: {
    [key: string]: string;
  }[];
}