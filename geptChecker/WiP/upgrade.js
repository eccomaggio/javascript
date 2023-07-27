// to make way for in-place editing
// HTM.rawDiv.removeEventListener("input", debounce(processText, 500));
// HTM.rawDiv.removeEventListener("paste", normalizePastedText);

const V_SUPP = {
  cursorOffset: 0,
  cursorOffsetNoMarks: 0,
  isInMark: false,
  isKeyText: false,
  // # key: [index in textArr, index in normalized word]
  cursorPosInTextArr: [0,0],
}

const HTM_SUPP = {
  workingDiv: HTM.rawDiv,
  infoDiv: HTM.finalTextDiv,
  // cursorHTML: newCursor,
}

const CURSOR = {
  tag: "span",
  id: "cursorPosHere",
  // text: "@CRSR",
  text: "~",
}

const EOL = {
  text: "*EOL",
  HTMLtext: "<br>",
}

const newCursor = document.createElement(CURSOR.tag);
newCursor.setAttribute("id", CURSOR.id);
CURSOR.node = newCursor;
CURSOR.HTMLtext = newCursor.outerHTML;
// HTM_SUPP.workingDiv.insertBefore(HTM_SUPP.cursorHTML, HTM_SUPP.workingDiv.firstChild);
// setCursorPosToStartOf(HTM_SUPP.cursorHTML, V_SUPP.cursorText);
HTM_SUPP.workingDiv.insertBefore(CURSOR.node, HTM_SUPP.workingDiv.firstChild);
// setCursorPosToStartOf(CURSOR.node, V_SUPP.cursorText);
setCursorPosToStartOf(CURSOR.node);
HTM.finalInfoDiv.style.display = "flex";

// HTM_SUPP.workingDiv.addEventListener("keydown", updateDiv);
// HTM_SUPP.workingDiv.addEventListener("keyup", getUpdatedText);

function setListeners() {
  HTM_SUPP.workingDiv.addEventListener("keydown", updateCursorPos);
  HTM_SUPP.workingDiv.addEventListener("keyup", getUpdatedText);
}


function removeListeners() {
  HTM_SUPP.workingDiv.removeEventListener("keydown", updateCursorPos);
  HTM_SUPP.workingDiv.removeEventListener("keyup", getUpdatedText);
}

setListeners();

// function getCursorOffsetIn(el) {
//   // console.log("get cursor offset:", el)
//   let cursorOffset = 0;
//   let cursorOffsetNoMarks = 0;
//   let divText = "";
//   let isInMark = false;
//   const doc = el.ownerDocument || el.document;
//   const win = doc.defaultView || doc.parentWindow;
//   // let sel = HTM_SUPP.win.getSelection();
//   let sel = win.getSelection();
//   if (sel.rangeCount > 0) {
//     // const range = HTM_SUPP.win.getSelection().getRangeAt(0);
//     // const preCursorRange = HTM_SUPP.doc.createRange();
//     const range = win.getSelection().getRangeAt(0);
//     const preCursorRange = doc.createRange();
//     preCursorRange.selectNodeContents(el);
//     preCursorRange.setEnd(range.endContainer, range.endOffset);
//     cursorOffset = preCursorRange.toString().length;

//     // const noMarksNodes = HTM_SUPP.doc.createElement("root");
//     const noMarksNodes = doc.createElement("root");
//     noMarksNodes.append(preCursorRange.cloneContents());
//     cursorOffsetNoMarks = removeTagContentFromElement(noMarksNodes).length;
//     // console.log("preCursorRange:", noMarksNodes.textContent);
//     const cursorEl = range.startContainer.parentElement;
//     isInMark = [cursorEl.tagName, cursorEl.parentElement.tagName, cursorEl.parentElement.parentElement.tagName].includes("MARK");
//   }
//   return [cursorOffset, cursorOffsetNoMarks, isInMark];
// }

function getCursorOffsetIn(element) {
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

function removeTagContentFromElement(node, tagName) {
  tagName = tagName || "mark";
  // let textWithoutMarks = "";
  const divText = node.cloneNode(true);
  const marks = divText.querySelectorAll(tagName);
  for (let i = 0; i < marks.length; i++) {
    marks[i].innerHTML = "";
  }
  // return divText.textContent;
  const flatText = divText.innerText;
  // console.log("removeTagContent:",flatText)
  // return divText.innerText;
  return flatText;
}

// function updateCursorPos(e) {
//   console.log("updateDiv...")
//   // ## arrow keys (ctrl chars) have long text values, e.g. "rightArrow"
//   let isInMark = false;
//   V_SUPP.isKeyText = (e.key) ? e.key.length == 1 : false;
//   [V_SUPP.cursorOffset, V_SUPP.cursorOffsetNoMarks, V_SUPP.isInMark] = getCursorOffsetIn(HTM_SUPP.workingDiv);
//   // console.log(">>", V_SUPP.cursorOffset, "<<", V_SUPP.isInMark, V_SUPP.isKeyText, e.key);
//   if (V_SUPP.isInMark && V_SUPP.isKeyText) {
//     e.preventDefault();
//   }
// }
function updateCursorPos(e) {
  // ## arrow keys (ctrl chars) have long text values, e.g. "rightArrow"
  // let isInMark = false;
  V_SUPP.isKeyText = (e.key) ? e.key.length === 1 : false;
  [
    V_SUPP.cursorOffset,
    V_SUPP.cursorOffsetNoMarks,
    V_SUPP.isInMark
  ] = getCursorOffsetIn(HTM_SUPP.workingDiv);
  console.log("updated cursor pos:", V_SUPP.cursorOffset, V_SUPP.cursorOffsetNoMarks)
  // console.log(">>", V_SUPP.cursorOffset, "<<", V_SUPP.isInMark, V_SUPP.isKeyText, e.key);
  // ## discard new text if cursor is in non-editable area (i.e. in <mark>)
  if (V_SUPP.isInMark && V_SUPP.isKeyText) {
    e.preventDefault();
  }
}

function getUpdatedText(e) {
  // debug("1." + HTM_SUPP.workingDiv.textContent)
  // CURSOR.node.remove();
  // debug("2." + HTM_SUPP.workingDiv.textContent)
  let revisedText = removeTagContentFromElement(HTM_SUPP.workingDiv);
  if (!revisedText) return;
  [
    V_SUPP.cursorOffset,
    V_SUPP.cursorOffsetNoMarks,
    V_SUPP.isInMark
  ] = getCursorOffsetIn(HTM_SUPP.workingDiv);
  revisedText = revisedText.slice(0, V_SUPP.cursorOffsetNoMarks) + CURSOR.text + revisedText.slice(V_SUPP.cursorOffsetNoMarks);
  debug(V_SUPP.cursorOffsetNoMarks, !!revisedText, revisedText)
  tmp_ShowResults(revisedText);
  // HTM_SUPP.infoDiv.innerHTML = `Cursor position: ${V_SUPP.cursorOffset} vs ${V_SUPP.cursorOffsetNoMarks}`;
  // HTM_SUPP.infoDiv.innerHTML += `<br>  ${revisedText.slice(0, V_SUPP.cursorOffsetNoMarks)}*${revisedText.slice(V_SUPP.cursorOffsetNoMarks)}`;
  const [resultsAsHTML, repeatsAsHTML, wordCount] = processText(revisedText);
  HTM_SUPP.infoDiv.innerHTML = repeatsAsHTML;
  moveCursorMarker();
  removeListeners();
  HTM_SUPP.workingDiv.innerHTML = resultsAsHTML;
  // if (!(V_SUPP.isInMark && V_SUPP.isKeyText)) moveCursorMarker();
  setListeners();
  if (resultsAsHTML) {
    displayCheckedText(resultsAsHTML, repeatsAsHTML, wordCount)
    // updateBackup(C.backupIDs[1]);
  } else {
    displayCheckedText();
  }
  // addBackCursor(HTM_SUPP.workingDiv, cursorPos);

}

function tmp_ShowResults(revisedText) {
  HTM_SUPP.infoDiv.innerHTML = `Cursor position: ${V_SUPP.cursorOffset} vs ${V_SUPP.cursorOffsetNoMarks}`;
  HTM_SUPP.infoDiv.innerHTML += `<br>  ${revisedText.slice(0, V_SUPP.cursorOffsetNoMarks)}*${revisedText.slice(V_SUPP.cursorOffsetNoMarks)}`;
}

function moveCursorMarker() {
  const currentRange = window.getSelection().getRangeAt(0);
  // const cursorParent = HTML.cursorMarker.parentElement;
  // HTM_SUPP.cursorHTML.parentElement.removeChild(HTM_SUPP.cursorHTML);
  // currentRange.insertNode(HTM_SUPP.cursorHTML);
  CURSOR.node.parentElement.removeChild(CURSOR.node);
  currentRange.insertNode(CURSOR.node);
}

// function addBackCursor(el, cursorPos=0) {
//   cursorPos = 2;
//   const doc = el.ownerDocument || el.document;
//   const win = doc.defaultView || doc.parentWindow;
//   const selectedText = win.getSelection();
//   var selectedRange = doc.createRange();
//   try {
//     // selectedRange.setStart(el.childNodes[0], cursorPos);
//     selectedRange.setStart(el.childNodes[0], cursorPos);
//     selectedRange.collapse(true);

//     selectedText.removeAllRanges();
//     selectedText.addRange(selectedRange);
//   } catch(error) {
//     console.log(`cursorPos (${cursorPos}) out of range...`)
//   }
//   el.focus();
// }

function setCursorPosToStartOf(el, textToInsert = "") {
  console.log("setCurPos:", el, newCursor)
  const selectedText = window.getSelection();
  const selectedRange = document.createRange();
  // selectedRange.setStart(text_div.childNodes[0], 45);
  selectedRange.setStart(el, 0);
  if (textToInsert) {
    const text = document.createTextNode(textToInsert);
    selectedRange.insertNode(text);
  }
  selectedRange.collapse(true);
  selectedText.removeAllRanges();
  selectedText.addRange(selectedRange);
  // text_div.focus();
  el.focus();
}

function processText(rawText) {
  // ## reset V.wordStats
  V.wordStats = {};
  // const text = (rawText.innerText) ? rawText.innerText : rawText;
  const text = rawText;
  if (typeof text === "object") return;
  // console.log('process:',text, typeof text)
  if (text) {
    const chunkedText = splitText(text);
    console.log("chunked text:",chunkedText)
    const textArr = findCompounds(chunkedText);
    const [resultsAsTextArr, wordCount] = addLookUps(textArr);
    // console.log("processed text array",processedTextArr)
    const resultsAsHTML = convertToHTML(resultsAsTextArr);
    const repeatsAsHTML = buildRepeatList(wordCount);
    return [resultsAsHTML, repeatsAsHTML, wordCount];
    //   displayCheckedText(htmlString, listOfRepeats, wordCount)

    //   updateBackup(C.backupIDs[1]);
    // } else {
    //   displayCheckedText();
  }
}

// function debug(msg) {
function debug(...params) {
  const msg = params.join(" ")
  console.log(`* ${debug.caller.name.toUpperCase()}: ${msg}`);
}
