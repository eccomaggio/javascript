
// ## CURSOR HANDLING ######################################

// function grabMarkedUpText() {
//   let revisedText;
//   // if (parseInt(V.isAutoRefresh) === 1 || isValidManualRefresh) {
//   if (V.isAutoRefresh || V.refreshRequested) {
//     revisedText = insertCursorPlaceholder(HTM.workingDiv, V.cursorOffsetNoMarks);
//   } else {
//     setCursorPos(document.getElementById(CURSOR.id));
//     // debug("No reprocessing needed...")
//     revisedText = "";
//   }
//   return revisedText
// }

function insertCursorPlaceholder(el, index) {
  // let plainText = removeTagContentFromElement(el);
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
    isInMark = cursorIsInTag(currentRange.startContainer.parentElement, "MARK");
    // debug(isInMark, preCursorHTML.innerText, preCursorHTMLNoMarks.innerText)
  }
  return [preCursorOffset, preCursorOffsetNoMarks, isInMark];
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
  // debug("02", divText)
  // const divText = newlinesToPlaintext(removeTags(noMarksNodes));
  return divText;
}

function cursorIsInTag(cursorEl, tagName = "MARK") {
  return [cursorEl.tagName, cursorEl.parentElement.tagName, cursorEl.parentElement.parentElement.tagName].includes(tagName);
}

function removeTags(node, tagName = "mark") {
  const divTextCopy = node.cloneNode(true);
  const marks = divTextCopy.querySelectorAll(tagName);
  for (let el of marks) {
    // debug("another <mark>")
    el.innerHTML = "";
  }
  return divTextCopy;
}

function newlinesToPlaintext(divText) {
  // ## Typing 'Enter' creates a <div>
  const divs = divText.querySelectorAll("div");
  for (let el of divs) {
    // el.before(` ${EOL.text} `);
    // ## Element.before() only introduced in Chrome 54
    el.insertAdjacentText("beforebegin", ` ${EOL.text} `);
  }
  // ## Pasting in text creates <br> (so have to search for both!)
  const EOLs = divText.querySelectorAll("br, hr");
  for (let el of EOLs) {
    el.textContent = ` ${EOL.text} `;
  }
  return divText;
}


function rejectMark(e) {
  V.isInMark = cursorIsInTag(HTM.workingDiv);
  if (V.isInMark) {
    e.preventDefault();
    // debug("keystroke supressed...")
  }
}

function getCursorIncrement(keypress) {
  V.cursorIncrement = 0;
  if (V.cursorOffset < V.oldCursorOffset) V.cursorIncrement = -1;
  if (V.cursorOffset > V.oldCursorOffset) V.cursorIncrement = 1;
  // debug("key:", keypress, "V.inc:*", V.cursorIncrement, "V.offset:", V.cursorOffset, "in mark?", V.isInMark)
}

function setCursorPos(el, textToInsert = "") {
  if (!el) return;
  // debug(el, ...V_SUPP.cursorPosInTextArr, V_SUPP.cursorOffsetNoMarks)
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
  V.isTextEdit = (["Backspace", "Enter"].includes(keypress) || keypress.length === 1);
  // debug(keypress,"-> isTextEdit",V.isTextEdit)
  V.oldCursorOffset = V.cursorOffset;
  let isInMark;
  [
    V.cursorOffset,
    V.cursorOffsetNoMarks,
    isInMark
  ] = getCursorInfoInEl(HTM.workingDiv);
  getCursorIncrement(keypress)
  if (isInMark) {
    // debug("In mark!", grabMarkedUpText(true))
    jumpOutOfMark();
  }
  // debug("is valid text edit?", V.isTextEdit)
}

function jumpOutOfMark() {
  // ## Assume that cursor is in <mark>
  // NB. cursorPosInTextArr = [word, char]
  const cursorRange = window.getSelection().getRangeAt(0);
  let focusEl = cursorRange.startContainer;
  focusEl = (focusEl.parentElement.tagName === "MARK") ? focusEl.parentElement : focusEl.parentElement.parentElement;
  // let siblingWord = (V.cursorIncrement === -1) ? focusEl.previousElementSibling : focusEl.nextElementSibling;
  if (V.cursorIncrement === -1) {
    const siblingWord = focusEl.previousElementSibling;
    // setCursorBefore(siblingWord);
    setCursorPosSafely(siblingWord, false);
  } else {
    const siblingWord = focusEl.nextElementSibling;
    // setCursorAfter(siblingWord);
    setCursorPosSafely(siblingWord);

  }
  // debug(...V.cursorPosInTextArr, siblingWord?.innerText)
}

function normalizeTextForClipboard(e) {
  if (!e) {
    e = new ClipboardEvent('paste', { clipboardData: new DataTransfer() });
  }
  const sel = document.getSelection();
  // let copiedText = document.createRange();
  let copiedText = sel.getRangeAt(0);
  let normalizedText = getCopyWithoutMarks(copiedText);
  normalizedText = normalizedText.innerText;
  normalizedText = EOLsToNewlines(normalizedText);
  // debug(copiedText.toString(), normalizedText)
  e.clipboardData.setData("text/plain", normalizedText);
  e.preventDefault();
  //
  // navigator.clipboard
  //   .writeText(normalizedText)
  //   .then(() => 
  //     console.log("successfully copied");
  //   })
  //   .catch(() => {
  //     console.log("something went wrong");
  //   });
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
  V.refreshRequested = true;
  updateInputDiv();
  V.refreshRequested = false;
}