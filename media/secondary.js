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

function scrollToBottom() {
  if (!autoScroll) return;
  const output = $("#scroll");
  output.scrollTop(output[0].scrollHeight);
}

function responseFinished(message) {
  aiIsResponding = false;
  const div = $(`#ai-${responseId}`);
  const responseContainer = div[0].querySelector(".response-container");
  formatDiv(responseContainer, message.value.text);
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

const createUserTextDiv = (question) => {
  const wrapper = $("<div>").addClass("user-text p-4 overflow-x-auto flex");
  const avatarWrapper = $("<div>").addClass("mr-4 flex-0 flex flex-col justify-start items-start align-middle");
  const avatarBox = $("<div>").addClass("p-2 user-avatar rounded-md h-10 w-10 flex justify-center items-center align-middle");
  const textDiv = $("<div>").addClass("flex-1").text(question);

  const formatTarget = textDiv[0];
  formatDiv(formatTarget, textDiv.text());

  const avatar = $("#avatar-user-template").children().clone()[0];

  avatarBox.prepend(avatar);
  avatarWrapper.append(avatarBox);
  wrapper.append(avatarWrapper, textDiv);

  return wrapper[0];
};

function partialResponse(message) {
  aiIsResponding = true;
  const existing = document.querySelector(`#ai-${responseId}`);
  const chatBox = $(`#chat-${chatId}`);

  function createAiTextDiv() {
    const wrapper = $("<div></div>").addClass("ai-text p-4 overflow-x-auto flex").attr("id", `ai-${responseId}`);
    const avatarWrapper = $("<div></div>").addClass("mr-4 flex-0 flex flex-col justify-start items-start align-middle");
    const avatarBox = $("<div></div>").addClass("p-2 ai-avatar rounded-md h-10 w-10 flex justify-center items-center align-middle");
    const textDiv = $("<div></div>").addClass("flex-1 response-container").text(message.value.text);
    const avatar = $("#avatar-ai-template").children().clone()[0];
    avatarBox.prepend(avatar);
    avatarWrapper.append(avatarBox);
    wrapper.append(avatarWrapper, textDiv);

    return wrapper[0];
  }

  function updateExistingAiTextDiv(existing, message) {
    const responseConatiner = existing.querySelector(".response-container");
    responseConatiner.textContent = message.value.text;
    formatDiv(responseConatiner, message.value.text);
  }

  function addNewAiTextDiv(chatBox, message) {
    const div = createAiTextDiv();
    const responseConatiner = div.querySelector(".response-container");
    formatDiv(responseConatiner, message.value.text);
    chatBox.append(div);
  }

  function toggleButtonsAndInput() {
    $("#abort").removeClass("hidden");
    $("#repeat-last").addClass("hidden");
    $("#input").prop("disabled", true);
  }

  if (!existing) {
    addNewAiTextDiv(chatBox, message);
  } else {
    updateExistingAiTextDiv(existing, message);
  }

  toggleButtonsAndInput();
  scrollToBottom();
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
