
// ## CURSOR HANDLING ######################################

// function insertCursorPlaceholder(text) {
//   return text.slice(0, V.cursorOffsetNoMarks) + CURSOR.text + text.slice(V.cursorOffsetNoMarks);
// }

function grabMarkedUpText(isValidManualRefresh) {
  let revisedText;
  if (parseInt(V.isAutoRefresh) === 1 || isValidManualRefresh) {
    revisedText = insertCursorPlaceholder(HTM.workingDiv, V.cursorOffsetNoMarks);
  } else {
    setCursorPos(document.getElementById(CURSOR.id));
    debug("No reprocessing needed...")
    revisedText = "";
  }
  return revisedText
}

function insertCursorPlaceholder(el, index) {
  // let plainText = removeTagContentFromElement(el);
  let plainText = newlinesToPlaintext(removeTags(el)).innerText;
  const updatedText = plainText.slice(0, index) + CURSOR.text + plainText.slice(index);
  // debug(flatText, updatedText)
  return updatedText;
}


// function getCursorInfoInEl(element) {
//   let preCursorOffset = 0;
//   let preCursorOffsetNoMarks = 0;
//   let isInMark = false;
//   let sel = window.getSelection();
//   if (sel.rangeCount > 0) {
//     // ** Create a range stretching from beginning of div to cursor
//     const currentRange = window.getSelection().getRangeAt(0);
//     const preCursorRange = document.createRange();
//     preCursorRange.selectNodeContents(element);
//     preCursorRange.setEnd(currentRange.endContainer, currentRange.endOffset);
//     preCursorOffset = preCursorRange.toString().length;
//     // ** Make a copy of this and remove <mark> (i.e. additional) tag content
//     const preCursorRangeNoMarks = getCopyWithoutMarks(preCursorRange);
//     preCursorOffsetNoMarks = preCursorRangeNoMarks.length;
//     isInMark = cursorIsInTag(currentRange.startContainer.parentElement, "MARK");
//     debug(isInMark, preCursorRange.toString(), preCursorRangeNoMarks.toString())
//     // if (isInMark) debug("in mark!! direction=", V.cursorIncrement)
//     // console.log("cursorInfo:", preCursorRange.cloneContents(),preCursorRangeNoMarks.cloneContents())
//   }
//   return [preCursorOffset, preCursorOffsetNoMarks, isInMark];
// }

function getCursorInfoInEl(element) {
  let preCursorOffset = 0;
  let preCursorOffsetNoMarks = 0;
  let isInMark = false;
  let sel = window.getSelection();
  if (sel.rangeCount > 0) {
    // ** Create a range stretching from beginning of div to cursor
    const currentRange = window.getSelection().getRangeAt(0);
    const preCursorRange = document.createRange();
    preCursorRange.selectNodeContents(element);
    preCursorRange.setEnd(currentRange.endContainer, currentRange.endOffset);
    let preCursorHTML = rangeToHTML(preCursorRange);
    preCursorHTML = newlinesToPlaintext(preCursorHTML);
    preCursorOffset = preCursorHTML.innerText.length;

    // ** Make a copy of this and remove <mark> (i.e. additional) tag content
    // const preCursorHTMLNoMarks = getCopyWithoutMarks(preCursorRange);
    let preCursorHTMLNoMarks = removeTags(preCursorHTML);
    preCursorOffsetNoMarks = preCursorHTMLNoMarks.innerText.length;
    isInMark = cursorIsInTag(currentRange.startContainer.parentElement, "MARK");
    // debug(isInMark, preCursorRange.toString(), preCursorHTMLNoMarks.innerText)
    debug(isInMark, preCursorHTML.innerText, preCursorHTMLNoMarks.innerText)
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
  // const divText = newlinesToPlaintext(removeTags(rangeToHTML(range)));
  // return divText;
  const noMarksNodes = document.createElement("root");
  noMarksNodes.append(range.cloneContents());
  // return removeTagContentFromElement(noMarksNodes);
  const divText = newlinesToPlaintext(removeTags(noMarksNodes));
//   return divText;
}

function cursorIsInTag(cursorEl, tagName = "MARK") {
  return [cursorEl.tagName, cursorEl.parentElement.tagName, cursorEl.parentElement.parentElement.tagName].includes(tagName);
}

// // function removeTagContentFromElement(node, tagName = "mark") {
// //   const divTextCopy = node.cloneNode(true);
// //   const marks = divTextCopy.querySelectorAll(tagName);
// //   for (let el of marks) {
// //     // debug("another <mark>")
// //     el.innerHTML = "";
// //   }
// //   // ## Typing 'Enter' creates a <div>
// //   const divs = divTextCopy.querySelectorAll("div");
// //   for (let el of divs) {
// //     // el.before(` ${EOL.text} `);
// //     // ## Element.before() only introduced in Chrome 54
// //     el.insertAdjacentText("beforebegin", ` ${EOL.text} `);
// //   }
// //   // ## Pasting in text creates <br> (so have to search for both!)
// //   const EOLs = divTextCopy.querySelectorAll("br, hr");
// //   for (let el of EOLs) {
// //     el.textContent = ` ${EOL.text} `;
// //   }
// //   // const flatText = divTextCopy.textContent;
// //   const flatText = divTextCopy.innerText;
// //   return flatText;
// // }

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

function blockInsertInMark(e) {
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
  // if (keypress === "ArrowRight") {
  //   V.cursorIncrement = 1;
  // } else if (["Backspace", "ArrowLeft"].includes(keypress)) {
  //   V.cursorIncrement = -1;
  // }
  debug("key:", keypress, "V.inc:*", V.cursorIncrement, "V.offset:", V.cursorOffset, "in mark?", V.isInMark)
}

function jumpOutOfMark() {
  /*
possible way to deal with it:
if inside <mark>, simply jump to
parentElement.previousElementSibling: insert cursor after
Or
parentElement.nextSibling: insert cursor before
depending on V.cursorIncrement
  */
  debug(...V.cursorPosInTextArr)
  // ## Assume that cursor is in <mark>
  // NB. cursorPosInTextArr = [word, char]
  const endOfWord = 0; // TODO: how do i mark 'last char of word'? -1??
  const wordPos = V.cursorPosInTextArr[0] + V.cursorIncrement;
  const charPos = (V.cursorIncrement < 0) ? 0 : endOfWord;
  V.cursorPosInTextArr[wordPos, charPos];
}

// function moveCursorOutOfMarkup(e){
//   updateCursorPos();
//   if (e.key === "ArrowRight") {
//     V.cursorIncrement = 1;
//   } else if (["Backspace", "ArrowLeft"].includes(e.key)) {
//     V.cursorIncrement = -1;
//   } else V.cursorIncrement = 0;
//   if (V.isInMark) {
//     let text = removeTagContentFromElement(HTM.workingDiv);
//     V.cursorOffsetNoMarks += V.cursorIncrement;
//     HTM.workingDiv.innerText = text;
//     V.forceUpdate = true;
//     updateInputDiv();
//   }
// }

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


function updateCursorPos(e) {
  const keypress = e.key;
  if (!keypress) return;
  V.isTextEdit = (["Backspace", "Enter"].includes(keypress) || keypress.length === 1);
  V.oldCursorOffset = V.cursorOffset;
  [
    V.cursorOffset,
    V.cursorOffsetNoMarks,
    isInMark
  ] = getCursorInfoInEl(HTM.workingDiv);
  getCursorIncrement(keypress)
  // if (V.skipMarkup) V.cursorOffsetNoMarks += V.cursorIncrement;
  document.getElementById("debug_cursor_pos").innerText = `offset:${V.cursorOffset} (no marks:${V.cursorOffsetNoMarks}); mark? ${isInMark}, inc:${V.cursorIncrement}`;
  if (isInMark) {
    debug("In mark!", grabMarkedUpText(true))
    jumpOutOfMark();
    // NEED TO 'JUMP OUT OF MARK ACCORDING TO V.cursorIncrement
  }
}


function normalizeTextForClipboard(e) {
  if (!e) {
    e = new ClipboardEvent('paste', { clipboardData: new DataTransfer() });
  }
  const sel = document.getSelection();
  // debug(sel)
  const copiedText = document.createRange();
  copiedText.setStart(sel.anchorNode, sel.anchorOffset);
  copiedText.setEnd(sel.focusNode, sel.focusOffset);
  let normalizedText = getCopyWithoutMarks(copiedText).replace(EOL.text, "\n");
  e.clipboardData.setData("text/plain", normalizedText);
  e.preventDefault();
}