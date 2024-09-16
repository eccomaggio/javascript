// "use strict";

// ## SETUP ############################################

const app = new App();
app.init();

// TAB1 (words) CODE ## ############################################

// ***** INIT FUNCTIONS



function getNotesAsHTML(entry) {
  let note = "";
  let awl_note = "";
  if (entry) {
    [note, awl_note] = entry.notes;
    note = note ? `, ${note}` : "";
    awl_note = (app.state.isBESTEP && awl_note) ? Tag.tag("span", ["class=awl-note"], ["(headword: ", Tag.tag("span", ["class=awl-headword"], [awl_note, ")"])]) : "";
  }
  return [note, awl_note];
}

function highlightAwlWord(levelArr, word) {
  return (app.state.isBESTEP && levelArr[1] >= 0) ? Tag.tag("span", ["class=awl-word"], [word]) : word;
}


// ## TAB2 (text) SETUP ############################################

function hoverEffects(e) {
  // ** references to parent elements are to reach embedded elements
  const el = e.target;
  if (typeof el.classList === 'undefined') return;
  // ** 1) show information text for elements with a 'data-entry' attribute
  if (el.dataset.entry || el.parentElement.dataset.entry) {
    const ref = (el.dataset.entry) ? el.dataset.entry : el.parentElement.dataset.entry;
    HTM.finalInfoDiv.innerHTML = displayEntryInfo(ref);
    HTM.finalInfoDiv.style.display = "flex";
  }

  // ** 2) remove highlighting after a jump to a duplicate
  el.classList.remove('jumpHighlight');

  // ** 3) show repeated words
  let classList = [].slice.apply(el.classList);
  const parentCList = [].slice.apply(el.parentElement.classList);
  if (parentCList.includes("duplicate")) classList = parentCList;
  if (classList.includes("duplicate")) {
    const relatedWords = classList.filter(name => name.startsWith("all_"))[0];
    const dupes = document.getElementsByClassName(relatedWords);
    toggleHighlight(dupes);
  }
  function toggleHighlight(els) {
    for (const el of els) {
      el.classList.toggle("highlight");
    }
  }
}


function displayEntryInfo(refs) {
  /*
  <div id="t2_final_info" style="display: flex;">
    <div class="word-detail level-e">
      <div><span class="dot">E</span> <em>elem (A2)</em><br></div>
      <span><strong>for</strong>: [preposition], 為了、給、(時間、距離)達;</span>
    </div>
    <div class="word-detail level-e">
      <div><span class="dot">E</span> <em>elem (A2)</em><br></div>
      <span><strong>for</strong>: [conjunction], 因為;</span>
    </div>
  </div>
  */
  let html = [];
  for (const ref of refs.split(" ")) {
    const [id, word, tokenType] = ref.split(":");
    const entry = app.wordlist.getEntryById(id);
    const [levelArr, levelClass] = getLevelDetails(entry.levelArr);
    const lemma = buildHTMLlemma(entry, id, word, tokenType);
    const levelTagArr = buildHTMLlevel(entry, id, levelArr, tokenType);
    // const levelTag = tag("div", [], [buildHTMLlevelDot(entry), " ", ...levelTagArr]);
    let levelTag = "";
    // if (isKids() && entry.levelGEPT !== 49) levelTag = Tag.tag("div", [], buildHTMLlevelKids(entry));
    if (app.state.isKids && entry.levelGEPT !== 49) levelTag = Tag.tag("div", [], buildHTMLlevelKids(entry));
    else levelTag = Tag.tag("div", [], [buildHTMLlevelDot(entry), " ", ...levelTagArr]);
    const pos = `[${entry.posExpansion}]`;
    let [notes, awl_notes] = getNotesAsHTML(entry);
    html.push(Tag.tag(
      "div",
      [`class=word-detail ${levelClass}`],
      [levelTag, Tag.tag("span", [], [...lemma, pos, notes, awl_notes])]
    ));
  }
  html = Tag.root(html);
  return html.stringify();
}


function buildHTMLlemma(entry, id, word, tokenType) {
  let displayLemma;
  if (entry.pos === "unknown") return displayLemma;
  if (tokenType === "wv") {
    displayLemma = [Tag.tag("em", [], "** Use "), Tag.tag("span", ["class=lemma"], entry.lemma), Tag.tag("em", [], " instead of "), Tag.tag("br"), word];
  } else if (tokenType === "wd") {
    displayLemma = [Tag.tag("span", ["class=lemma"], word), " < ", entry.lemma];
    // } else if (tokenType === "wn") {
  } else if (tokenType.startsWith("wn")) {
    displayLemma = [Tag.tag("span", ["class=lemma"], word), " negative of ", entry.lemma];
  } else {
    displayLemma = [Tag.tag("span", ["class=lemma"], entry.lemma)];
  }
  return displayLemma;
}

function buildHTMLlevel(entry, id, levelArr, tokenType) {
  let levelStr;
  // ** If word is offlist, use its classification (digit/name, etc.) as level
  if (tokenType !== "wv" && app.wordlist.isInOfflistDb(id)) {
    levelStr = entry.pos; // a string, e.g. "jn"
  }
  else if (["d", "y", "c", "wo"].includes(tokenType)) levelStr = "";
  else {
    levelStr = app.wordlist.levelSubs[levelArr[0]];
    if (entry.levelAWL >= 0) {
      levelStr += `; ${app.wordlist.levelSubs[levelArr[1]]}`;
    }
  }
  let level = [];
  if (levelStr) level = [Tag.tag("em", [], level), Tag.tag("br")];
  return level;
}

function buildHTMLlevelDot(entry) {
  let html = "";
  // if (!isKids()) {
  if (!app.state.isKids) {
    const geptLevel = entry.levelGEPT;
    html = (geptLevel <= 2) ? Tag.tag("span", ["class=dot"], [["E", "I", "H"][geptLevel]]) : "";
  }
  if (app.state.isBESTEP && entry.levelAWL > 0) html = Tag.root(html, ...buildHTMLlevelAWL(entry));
  return html;
}

function buildHTMLlevelAWL(entry) {
  return [" ", Tag.tag("span", ["class=awl-level"], [`AWL ${entry.levelAWL}`])];
}

function buildHTMLlevelKids(entry) {
  // return [" ", Tag.tag("span", ["class=awl-level"], [LOOKUP.level_headings[entry.levelGEPT]])];
  return [" ", Tag.tag("span", ["class=awl-level"], [app.wordlist.level_headings[entry.levelGEPT]])];
}

// ** if text is pasted in, this is where processing starts
function normalizePastedText(e) {
  // ** preventDefault needed to prevent cursor resetting to start of div at every paste
  e.preventDefault();
  let paste = (e.clipboardData || window.clipboardData).getData('text');
  const selection = window.getSelection();
  selection.getRangeAt(0).insertNode(document.createTextNode(paste));
  signalRefreshNeeded("on");
  app.text.refresh(e);
}

function catchKeyboardCopyEvent(e) {
  // let isV = (e.keyCode === 86 || e.key === "v"); // this is to detect keyCode
  let isC = (e.keyCode === 67 || e.key === "c"); // this is to detect keyCode
  // let isCtrl = (e.keyCode === 17 || e.key === "Control");
  // let isMeta = (e.keyCode === 91 || e.key === "Meta");
  if (isC && (e.metaKey || e.ctrlKey)) {
    normalizeTextForClipboard();
  }
}


function getLevelDetails(levelArr) {
  const levelClass = "level-" + getLevelPrefix(levelArr[0]);
  return [levelArr, levelClass];
}



function getLevelPrefix(levelGEPT) {
  let level = app.wordlist.levelSubs[levelGEPT];
  if (app.state.isKids && levelGEPT < app.wordlist.offlistLevel) level = "k";
  if (!level) level = "o";
  return level[0];
}



function compareByLemma(a, b) {
  const lemmaA = a.lemma.toLowerCase();
  const lemmaB = b.lemma.toLowerCase();
  if (lemmaA < lemmaB) {
    return -1;
  }
  if (lemmaA > lemmaB) {
    return 1;
  }
  return 0;
}

function getWordCountForDisplay(wordCount) {
  const numOfWords = (wordCount > 0)
    ? Tag.tag("span", ["class=text-right dark"], [
      "(",
      wordCount,
      " word",
      app.tools.pluralNoun(wordCount),
      ")",
      // tag("a", ["href=#all_repeats", "class=medium"], [" >&#x25BC;"]),
      Tag.tag("a", ["href=#all_repeats", "class=medium"]),
    ])
    : "";
  return numOfWords;
}


// ## COMMON ELEMENTS ######################################


function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

function debug(...params) {
  console.log(`DEBUG: ${debug.caller.name}> `, params);
}

function signalRefreshNeeded(mode) {
  if (mode === "on") {
    V.refreshRequired = true;
    HTM.workingDiv.style.backgroundColor = "ivory";
    // HTM.textTabTag.style.fontStyle = "italic";
    app.tabs.htm.textTabTag.style.fontStyle = "italic";
    // HTM.backupSave2.style.display = "block";
    app.backup.htm.backupSave2.style.display = "block";
  }
  else {
    V.refreshRequired = false;
    HTM.workingDiv.style.backgroundColor = "white";
    // HTM.textTabTag.style.fontStyle = "normal";
    app.tabs.htm.textTabTag.style.fontStyle = "normal";
    // HTM.backupSave2.style.display = "none";
    app.backup.htm.backupSave2.style.display = "none";
  }
}

function normalizeTextForClipboard(e) {
  // TODO: do we even need to capture copied text anymore, now there are no <mark>s??
  if (!e) {
    e = new ClipboardEvent('paste', { clipboardData: new DataTransfer() });
  }
  const sel = document.getSelection();
  let copiedText = sel.getRangeAt(0).toString();
  let normalizedText = copiedText;
  e.clipboardData.setData("text/plain", normalizedText);
  e.preventDefault();
}


function EOLsToNewlines(text) {
  // const re = RegExp("\\s*" + EOL.text + "\\s*", "g");
  const re = RegExp(EOL.text, "g");
  const noEOLs = text.replace(re, "\n");
  return noEOLs;
}

function newlinesToEOLs(text) {
  // return text.replace("\n", " " + EOL.text + " ");
  return text.replace("\n", EOL.text);
}

function forceUpdateInputDiv() {
  V.refreshRequired = true;
  app.text.refresh();
  // V.refreshRequested = false;
}

// function renderEOLsAsHTML(word, htmlString, wasEOL) {
//   const isEOL = word === EOL.text;
//   if (isEOL) {
//     htmlString += EOL.HTMLtext;
//     wasEOL = true;
//   }
//   return [isEOL, wasEOL, htmlString];
// }