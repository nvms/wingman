/* eslint-disable no-undef */

const vscode = acquireVsCodeApi();

marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "javascript";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

let chatId = 0;
let responseId = 0;
let aiIsResponding = false;
let autoScroll = false;

const getUserBoxClasses = () => {
  return "user-text p-4 overflow-x-auto";
};

const getAiBoxClasses = () => {
  return "ai-text p-4 overflow-x-auto in-progress-response";
};

const getAiBoxClassesFinished = () => {
  return "ai-text p-4 overflow-x-auto finished-response";
};

window.addEventListener("message", (e) => {
  const message = e.data;

  switch (message.type) {
    case "requestMessage": {
      requestMessage(message.value);
      break;
    }
    case "newChat": {
      newChat();
      break;
    }
    case "partialResponse": {
      partialResponse(message);
      break;
    }
    case "responseFinished": {
      responseFinished(message);
      break;
    }
    case "aborted": {
      responseAborted();
      break;
    }
    case "shown": {
      if (!$("#input-container").hasClass("hidden")) {
        $("#input").focus();
      }
    }
  }
});

$("#input").on("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    const input = $("#input");
    const text = input.val();
    input.val("");

    vscode.postMessage({
      type: "sendInput",
      value: text,
    });
  }
});

$("#abort").on("click", () => {
  vscode.postMessage({ type: "abort" });
  $("#input").prop("disabled", false);
});

$("#clear-conversation").on("click", () => {
  vscode.postMessage({ type: "abort" });
  $("#output").empty();
  hideInput();
});

$("#scroll").on("wheel", () => {
  if (aiIsResponding) {
    autoScroll = false;
  }
});

$("#repeat-last").on("click", () => {
  vscode.postMessage({ type: "repeatLast" });
});

function showInput() {
  $("#input-container").removeClass("hidden");
}

function hideInput() {
  $("#input-container").addClass("hidden");
}

function newChat() {
  const output = $("#output");
  output.empty();
  const div = $("<div>");
  div.attr("id", `chat-${++chatId}`);
  output.append(div);
  showInput();
}

function createUserTextDiv(question) {
  const div = $("<div></div>").addClass(getUserBoxClasses()).text(question);
  const domDiv = div[0];
  formatDiv(domDiv, div.text());
  return domDiv;
}

function scrollToBottom() {
  if (!autoScroll) return;
  const output = $("#scroll");
  output.scrollTop(output[0].scrollHeight);
}

function requestMessage(text) {
  autoScroll = true;
  const div = document.querySelector(`#chat-${chatId}`);
  const userTextDiv = createUserTextDiv(text);
  div.append(userTextDiv);
  $("#abort").removeClass("hidden");
  $("#repeat-last").addClass("hidden");
  scrollToBottom();
}

function responseFinished(message) {
  aiIsResponding = false;
  const div = $(`#ai-${responseId}`);
  div.removeClass();
  div.addClass(getAiBoxClassesFinished());
  formatDiv(div[0], message.value.text);
  responseId++;
  $("#abort").addClass("hidden");
  $("#repeat-last").removeClass("hidden");
  $("#input").prop("disabled", false).focus();
  scrollToBottom();
}

function responseAborted() {
  aiIsResponding = false;
  $("#abort").addClass("hidden");
  $("#repeat-last").removeClass("hidden");
  const div = $(`#ai-${responseId}`);
  formatDiv(div[0], message.value.text);
  responseId++;
  $("#input").prop("disabled", false).focus();
  scrollToBottom();
}

function partialResponse(message) {
  aiIsResponding = true;
  const existing = document.querySelector(`#ai-${responseId}`);
  const chatBox = $(`#chat-${chatId}`);
  const div = $("<div>").addClass(getAiBoxClasses()).attr("id", `ai-${responseId}`).text(message.value.text);
  formatDiv(div[0], message.value.text);

  if (!existing) {
    chatBox.append(div);
  } else {
    existing.textContent = message.value.text;
    formatDiv(existing, message.value.text);
  }

  $("#abort").removeClass("hidden");
  $("#repeat-last").addClass("hidden");
  $("#input").prop("disabled", true);
  scrollToBottom();
}

const getLanguage = (text) => {
  const languageRegex = /```([a-zA-Z-_]+)/g;
  const match = text.match(languageRegex);
  return match ? match[0].replaceAll("```", "") : null;
};

const fixCodeBlocks = (response) => {
  const ticks = /```/g;
  const matches = response.match(ticks);
  const even = matches ? matches.length % 2 === 0 : true;

  if (even) {
    return {
      formatted: response,
      language: getLanguage(response),
    };
  } else {
    return {
      formatted: `${response}\n\`\`\``,
      language: getLanguage(response),
    };
  }
};

const appendCopyButton = (el) => {
  const button = $("<button>").addClass("copy-button").text("Copy");

  const onCopyClick = () => {
    const text = el.textContent;
    navigator.clipboard.writeText(text).then(() => {
      button.text("Copied!");
      setTimeout(() => {
        button.text("Copy");
      }, 2000);
    });
  };

  button.on("click", onCopyClick);

  const wrapper = $(el).parent();
  wrapper.addClass("copy-wrapper");
  wrapper.append(button);
};

function formatDiv(div, text) {
  const fixed = fixCodeBlocks(text);

  const options = {
    renderer: new marked.Renderer(),
    silent: true,
    breaks: true,
    pedantic: false,
    gfm: true,
    sanitize: false,
    smartypants: false,
    xhtml: false,
  };

  marked.setOptions(options);
  const html = marked.parse(fixed.formatted);
  div.innerHTML = html;

  const codeBlocks = div.querySelectorAll("pre > code");
  codeBlocks.forEach((codeBlock) => {
    if ($(codeBlock.parentElement).children(".copy-button").length === 0) {
      appendCopyButton(codeBlock);
    }

    if (!codeBlock.classList.contains("hljs")) {
      codeBlock.classList.add("hljs");
    }
  });
}
