const V_SUPP = {
  cursorOffset: 0,
  cursorOffsetNoMarks: 0,
  isInMark: false,
  isTextEdit: false,
  // # key: [index in textArr, index in normalized word]
  cursorPosInTextArr: [0, 0],
}

const HTM_SUPP = {
  workingDiv: HTM.rawDiv,
  infoDiv: HTM.finalTextDiv,
  repeatsList: HTM.repeatsList,
  // cursorHTML: newCursor,
}

const CURSOR = {
  tag: "span",
  id: "cursorPosHere",
  // HTMLtext: "<span id='cursorPosHere'>@</span>",
  HTMLtext: "<span id='cursorPosHere'></span>",
  // text: "@CRSR",
  text: "*CRSR"
}

const EOL = {
  text: "*EOL",
  HTMLtext: "<br>",
}

// HTM.finalInfoDiv.style.display = "flex";
// HTM_SUPP.infoDiv.style.display = "flex";

function setListeners() {
  HTM_SUPP.workingDiv.addEventListener("keydown", saveCursorPos);
  // HTM_SUPP.workingDiv.addEventListener("keyup", getUpdatedText);
  // HTM_SUPP.workingDiv.addEventListener("keyup", refreshGatekeeper);
  HTM_SUPP.workingDiv.addEventListener("keyup", debounce(refreshGatekeeper, 500));
  // HTM_SUPP.workingDiv.addEventListener("keyup", debounce(getUpdatedText, 500));
}

// function removeListeners() {
//   HTM_SUPP.workingDiv.removeEventListener("keydown", saveCursorPos);
//   // HTM_SUPP.workingDiv.removeEventListener("keyup", getUpdatedText);
//   HTM_SUPP.workingDiv.removeEventListener("keyup", debounce(getUpdatedText, 900));
// }

setListeners();

function getCursorInfoInEl(element) {
  let cursorOffset = 0;
  let cursorOffsetNoMarks = 0;
  // let divText = "";
  let isInMark = false;
  let sel;
  sel = window.getSelection();
  if (sel.rangeCount > 0) {
    // ** Create a range stretching from beginning of div to cursor
    const currentRange = window.getSelection().getRangeAt(0);
    const preCursorRange = document.createRange();
    preCursorRange.selectNodeContents(element);
    preCursorRange.setEnd(currentRange.endContainer, currentRange.endOffset);
    cursorOffset = preCursorRange.toString().length;
    // ** Make a copy of this and remove <mark> (i.e. additional) tag content
    cursorOffsetNoMarks = getCopyWithoutMarks(preCursorRange).length;
    isInMark = cursorIsInTag(currentRange.startContainer.parentElement, "MARK");
  }
  return [cursorOffset, cursorOffsetNoMarks, isInMark];
}

function getCopyWithoutMarks(range) {
  const noMarksNodes = document.createElement("root");
  noMarksNodes.append(range.cloneContents());
  return removeTagContentFromElement(noMarksNodes);
}

function cursorIsInTag(cursorEl, tagName) {
  return [cursorEl.tagName, cursorEl.parentElement.tagName, cursorEl.parentElement.parentElement.tagName].includes(tagName);
}

function removeTagContentFromElement(node, tagName = "mark") {
  const divText = node.cloneNode(true);
  const marks = divText.querySelectorAll(tagName);
  for (let i = 0; i < marks.length; i++) {
    marks[i].innerHTML = "";
  }
  const EOLs = divText.querySelectorAll("br");
  for (let i = 0; i < EOLs.length; i++) {
    EOLs[i].innerHTML = ` ${EOL.text} `;
  }
  const flatText = divText.innerText;
  return flatText;
}

function saveCursorPos(e) {
  // ## arrow keys (ctrl chars) have long text values, e.g. "rightArrow"
  V_SUPP.isTextEdit = (e.key) ? e.key === "Backspace" || e.key.length === 1 : false;
  [,,V_SUPP.isInMark] = getCursorInfoInEl(HTM_SUPP.workingDiv);
  // console.log("\n")
  // debug("updated cursor pos:", e.key, V_SUPP.cursorOffset, V_SUPP.cursorOffsetNoMarks)
  // console.log(">>", V_SUPP.cursorOffset, "<<", V_SUPP.isInMark, V_SUPP.isKeyText, e.key);
  // ## discard new text if cursor is in non-editable area (i.e. in <mark>)
  if (V_SUPP.isInMark && V_SUPP.isTextEdit) {
    e.preventDefault();
  }
}

function getUpdatedText(e) {
  [
    V_SUPP.cursorOffset,
    V_SUPP.cursorOffsetNoMarks,,
  ] = getCursorInfoInEl(HTM_SUPP.workingDiv);
  if (V_SUPP.isTextEdit && !V_SUPP.isInMark){
    let revisedText = removeTagContentFromElement(HTM_SUPP.workingDiv);
    if (!revisedText) return;
    revisedText = insertCursorPlaceholder(revisedText);
    // debug(V_SUPP.cursorOffsetNoMarks, !!revisedText)
    // tmp_ShowResults(revisedText);
    const [
      resultsAsHTML,
      repeatsAsHTML,
      wordCount
    ] = processText(revisedText);
    displayRepeatsList(repeatsAsHTML);
    updateDiv(resultsAsHTML);
  } else setCursorPosToStartOf(document.getElementById(CURSOR.id));
}

function refreshGatekeeper(e) {
  // debug("autorefresh",V.isAutoRefresh);
  if (V.isAutoRefresh){
    getUpdatedText(e);
  }
}

function updateDiv(html) {
  // removeListeners();
  // if (!V.isAutoRefresh) {
  //   debug("waiting for manual refresh...")
  //   return;
  // }
  HTM_SUPP.workingDiv.innerHTML = html;
  // setListeners();
  setCursorPosToStartOf(document.getElementById(CURSOR.id));
  // updateBackup(C.backupIDs[1]);
}

function insertCursorPlaceholder(text) {
  return text.slice(0, V_SUPP.cursorOffsetNoMarks) + CURSOR.text + text.slice(V_SUPP.cursorOffsetNoMarks);
}

function displayRepeatsList(html) {
  // HTM_SUPP.infoDiv.innerHTML = html;
  HTM_SUPP.repeatsList.innerHTML = html;
}

function tmp_ShowResults(revisedText) {
  HTM_SUPP.infoDiv.innerHTML = `<strong>Cursor position</strong>: <i>${V_SUPP.cursorOffset} vs ${V_SUPP.cursorOffsetNoMarks}</i><br>${revisedText}`;
}

function setCursorPosToStartOf(el, textToInsert = "") {
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

function processText(rawText) {
  /*
  Cursor-related info:
  convertToHTML( ):
    adds in CURSOR.HTMLtext according to V_SUPP.cursorPosInTextArr

  splitText( ):
    searches for CURSOR.text and if it finds it:
      1. updates V_SUPP.cursorPosInTextArr
      2. removes it (so word can be processed normally)
  */
  // ## reset V.wordStats
  V.wordStats = {};
  // const text = (rawText.innerText) ? rawText.innerText : rawText;

  const text = rawText;
  if (typeof text === "object") return;
  // console.log('process:',text, typeof text)
  if (text) {
    const chunkedText = splitText(text);
    // debug("chunked text:", chunkedText)
    const textArr = findCompoundsAndFlattenArray(chunkedText);
    // debug("textArr:", textArr)
    const [resultsAsTextArr, wordCount] = addLookUps(textArr);
    const resultsAsHTML = convertToHTML(resultsAsTextArr);
    const repeatsAsHTML = buildRepeatList(wordCount);
    return [resultsAsHTML, repeatsAsHTML, wordCount];
  }
}

function debounce(callback, delay) {
  // ## add delay so that text is only processed after user stops typing
  let timeout;
  return function () {
    let originalArguments = arguments;

    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(this, originalArguments), delay);
  }
}

// function debug(msg) {
function debug(...params) {
  console.log(`* ${debug.caller.name.toUpperCase()}: `, params);
}
