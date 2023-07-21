// to make way for in-place editing
// HTM.rawDiv.removeEventListener("input", debounce(processText, 500));
// HTM.rawDiv.removeEventListener("paste", normalizePastedText);

const V_SUPP = {
  cursorOffset: 0,
  cursorOffsetNoMarks: 0,
  isInMark: false,
  isKeyText: false
}

const HTM_SUPP = {
  workingDiv: HTM.rawDiv,
  doc: Document,
  win: Document.defaultView || Document.parentWindow,
  // workingDiv: document.getElementById("test"),
  infoDiv: HTM.finalTextDiv
}

// HTM_SUPP.workingDiv.addEventListener("keydown", updateDiv);
// HTM_SUPP.workingDiv.addEventListener("keyup", getUpdatedText);

function setListeners() {
  HTM_SUPP.workingDiv.addEventListener("keydown", updateDiv);
  HTM_SUPP.workingDiv.addEventListener("keyup", getUpdatedText);
}


function removeListeners() {
  HTM_SUPP.workingDiv.removeEventListener("keydown", updateDiv);
  HTM_SUPP.workingDiv.removeEventListener("keyup", getUpdatedText);
}

setListeners();

function getCursorOffsetIn(el) {
  // console.log("get cursor offset:", el)
  let cursorOffset = 0;
  let cursorOffsetNoMarks = 0;
  let divText = "";
  let isInMark = false;
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  // let sel = HTM_SUPP.win.getSelection();
  let sel = win.getSelection();
  if (sel.rangeCount > 0) {
    // const range = HTM_SUPP.win.getSelection().getRangeAt(0);
    // const preCursorRange = HTM_SUPP.doc.createRange();
    const range = win.getSelection().getRangeAt(0);
    const preCursorRange = doc.createRange();
    preCursorRange.selectNodeContents(el);
    preCursorRange.setEnd(range.endContainer, range.endOffset);
    cursorOffset = preCursorRange.toString().length;

    // const noMarksNodes = HTM_SUPP.doc.createElement("root");
    const noMarksNodes = doc.createElement("root");
    noMarksNodes.append(preCursorRange.cloneContents());
    cursorOffsetNoMarks = removeTagContentFromElement(noMarksNodes).length;
    // console.log("preCursorRange:", noMarksNodes.textContent);
    const cursorEl = range.startContainer.parentElement;
    isInMark = [cursorEl.tagName, cursorEl.parentElement.tagName, cursorEl.parentElement.parentElement.tagName].includes("MARK");
  }
  return [cursorOffset, cursorOffsetNoMarks, isInMark];
}

function removeTagContentFromElement(node, tagName) {
  tagName = tagName || "mark";
  let textWithoutMarks = "";
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

function updateDiv(e) {
  console.log("updateDiv...")
  // ## arrow keys (ctrl chars) have long text values, e.g. "rightArrow"
  let isInMark = false;
  V_SUPP.isKeyText = (e.key) ? e.key.length == 1 : false;
  [V_SUPP.cursorOffset, V_SUPP.cursorOffsetNoMarks, V_SUPP.isInMark] = getCursorOffsetIn(HTM_SUPP.workingDiv);
  // console.log(">>", V_SUPP.cursorOffset, "<<", V_SUPP.isInMark, V_SUPP.isKeyText, e.key);
  if (V_SUPP.isInMark && V_SUPP.isKeyText) {
    e.preventDefault();
  }
}

function getUpdatedText(e) {
  console.log("getUpdatedText...")
  const [,cursorPos,] = getCursorOffsetIn(HTM_SUPP.workingDiv);
  removeListeners;
  console.log("cursor pos:", cursorPos)
  const revisedText = removeTagContentFromElement(HTM_SUPP.workingDiv);
  [V_SUPP.cursorOffset, V_SUPP.cursorOffsetNoMarks, V_SUPP.isInMark] = getCursorOffsetIn(HTM_SUPP.workingDiv);

  // HTM_SUPP.infoDiv.innerHTML = `Cursor position: ${V_SUPP.cursorOffset} vs ${V_SUPP.cursorOffsetNoMarks}`;
  // HTM_SUPP.infoDiv.innerHTML += `<br>  ${revisedText.slice(0, V_SUPP.cursorOffsetNoMarks)}*${revisedText.slice(V_SUPP.cursorOffsetNoMarks)}`;
  const [resultsAsHTML, repeatsListAsHTML] = processText(revisedText);
  HTM_SUPP.infoDiv.innerHTML = repeatsListAsHTML;
  HTM_SUPP.workingDiv.innerHTML = resultsAsHTML;
  addBackCursor(HTM_SUPP.workingDiv, cursorPos);
  setListeners();
}

function addBackCursor(el, cursorPos=0) {
  cursorPos = 2;
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  const selectedText = win.getSelection();
  var selectedRange = doc.createRange();
  try {
    // selectedRange.setStart(el.childNodes[0], cursorPos);
    selectedRange.setStart(el.childNodes[0], cursorPos);
    selectedRange.collapse(true);

    selectedText.removeAllRanges();
    selectedText.addRange(selectedRange);
  } catch(error) {
    console.log(`cursorPos (${cursorPos}) out of range...`)
  }
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
    // console.log("chunked text:",chunkedText)
    const textArr = findCompounds(chunkedText);
    const [processedTextArr, wordCount] = addLookUps(textArr);
    // console.log("processed text array",processedTextArr)
    const htmlString = convertToHTML(processedTextArr);
    const listOfRepeats = buildRepeatList(wordCount);
    return [htmlString,listOfRepeats];
  //   displayCheckedText(htmlString, listOfRepeats, wordCount)

  //   updateBackup(C.backupIDs[1]);
  // } else {
  //   displayCheckedText();
  }
}
