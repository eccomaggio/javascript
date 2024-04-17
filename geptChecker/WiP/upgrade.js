
// ## CURSOR HANDLING ######################################

function insertCursorPlaceholder(el, index) {
  let plainText = newlinesToPlaintext(removeTags(el)).innerText;
  const updatedText = plainText.slice(0, index) + CURSOR.text + plainText.slice(index);
  return updatedText;
}

function getCursorInfoInEl(element) {
  let preCursorOffset = 0;
  let preCursorOffsetNoMarks = 0;
  let isInMark = false;
  let sel = window.getSelection();
  if (sel.rangeCount > 0) {
    // ** Create a range stretching from beginning of div to cursor
    const currentRange = sel.getRangeAt(0);
    const preCursorRange = document.createRange();
    preCursorRange.selectNodeContents(element);
    preCursorRange.setEnd(currentRange.endContainer, currentRange.endOffset);
    let preCursorHTML = rangeToHTML(preCursorRange);
    preCursorHTML = newlinesToPlaintext(preCursorHTML);
    preCursorOffset = preCursorHTML.innerText.length;

    // ** Make a copy of this and remove <mark> (i.e. additional) tag content
    let preCursorHTMLNoMarks = removeTags(preCursorHTML);
    preCursorOffsetNoMarks = preCursorHTMLNoMarks.innerText.length;
  }
  return [preCursorOffset, preCursorOffsetNoMarks];
}

function rangeToHTML(range) {
  const nodes = document.createElement("root");
  nodes.append(range.cloneContents());
  return nodes;
}

function getCopyWithoutMarks(range) {
  // Equivalent of newlinesToPlaintext(removeTags(rangeToHTML(range)))
  const noMarksNodes = document.createElement("root");
  noMarksNodes.append(range.cloneContents());
  let divText = removeTags(noMarksNodes);
  divText = newlinesToPlaintext(divText);
  return divText;
}


function removeTags(node, tagName = "mark") {
  const divTextCopy = node.cloneNode(true);
  const marks = divTextCopy.querySelectorAll(tagName);
  return divTextCopy;
}

function newlinesToPlaintext(divText) {
  // ** Typing 'Enter' creates a <div>
  const divs = divText.querySelectorAll("div");
  for (let el of divs) {
    el.before(` ${EOL.text} `);
    // ** Element.before() only introduced in Chrome 54
    // el.insertAdjacentText("beforebegin", ` ${EOL.text} `);
  }
  // ** Pasting in text creates <br> (so have to search for both!)
  const EOLs = divText.querySelectorAll("br, hr");
  for (let el of EOLs) {
    el.textContent = ` ${EOL.text} `;
  }
  return divText;
}


function getCursorIncrement(keypress) {
  V.cursorIncrement = 0;
  if (V.cursorOffset < V.oldCursorOffset) V.cursorIncrement = -1;
  if (V.cursorOffset > V.oldCursorOffset) V.cursorIncrement = 1;
}

function setCursorPos(el, textToInsert = "") {
  if (!el) return;
  const selectedRange = document.createRange();
  selectedRange.setStart(el, 0);
  if (textToInsert) {
    const text = document.createTextNode(textToInsert);
    selectedRange.insertNode(text);
  }
  selectedRange.collapse(true);
  const selectedText = window.getSelection();
  selectedText.removeAllRanges();
  selectedText.addRange(selectedRange);
  el.remove();
  el.focus();
}

function setCursorPosSafely(el, isStart = true) {
  if (!el) return;
  const selectedRange = document.createRange();
  selectedRange.selectNode(el);
  const pos = (isStart) ? true : false;
  selectedRange.collapse(pos);
  const selectedText = window.getSelection();
  selectedText.removeAllRanges();
  selectedText.addRange(selectedRange);
  el.focus();
}

function updateCursorPos(e) {
  const keypress = e.key;
  if (!keypress) return;
  // V.refreshRequired = (["Backspace", "Enter"].includes(keypress) || keypress.length === 1);
  // if (V.refreshRequired) signalRefreshNeeded("on");
  if (["Backspace", "Enter"].includes(keypress) || keypress.length === 1) signalRefreshNeeded("on");
  V.oldCursorOffset = V.cursorOffset;
  // let isInMark;
  [
    V.cursorOffset,
    V.cursorOffsetNoMarks,
  ] = getCursorInfoInEl(HTM.workingDiv);
  getCursorIncrement(keypress)
}

function signalRefreshNeeded(mode) {
  if (mode === "on") {
    V.refreshRequired = true;
    HTM.workingDiv.style.backgroundColor = "ivory";
  }
  else {
    HTM.workingDiv.style.backgroundColor = "white";
    V.refreshRequired = false;
    // clearTimeout(V.timer);
    // V.timer = null;
  }
}

function normalizeTextForClipboard(e) {
  if (!e) {
    e = new ClipboardEvent('paste', { clipboardData: new DataTransfer() });
  }
  const sel = document.getSelection();
  let copiedText = sel.getRangeAt(0);
  let normalizedText = getCopyWithoutMarks(copiedText);
  normalizedText = normalizedText.innerText;
  normalizedText = EOLsToNewlines(normalizedText);
  e.clipboardData.setData("text/plain", normalizedText);
  e.preventDefault();
}

function EOLsToNewlines(text) {
  const re = RegExp("\\s*" + EOL.text + "\\s*", "g");
  const noEOLs = text.replace(re, "\n");
  return noEOLs;
}

function newlinesToEOLs(text) {
  return text.replace("\n", " " + EOL.text + " ");
}

function forceUpdateInputDiv() {
  V.refreshRequired = true;
  updateInputDiv();
  // V.refreshRequested = false;
}