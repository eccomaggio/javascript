// "use strict";
/*

*/
// ## SETUP ############################################

const app = new App();
app.init();
// const app2 = new App();

// TAB1 (words) CODE ## ############################################

// ***** INIT FUNCTIONS


function updateDropdownMenuOptions() {
  HTM.selectDb.value = app.state.current.db_state;
}


function addListeners() {
  // addTabListeners();
  addMenuListeners();
  addHTMLlisteners();
  addDetailListeners();
  addWordInputListeners();
  addEditingListeners();
}

function addWordInputListeners() {
  HTM.inputLemma.addEventListener("input", debounce(wordSearch, 500));
  for (const el of document.getElementsByTagName("input")) {
    if (el.type != "text") {
      const label = el.labels[0];
      if (label.htmlFor) label.addEventListener("click", registerLabelClick);
    }
  }
}

// function addTabListeners() {
//   for (const el of document.getElementsByTagName("tab-tag")) {
//     el.addEventListener("click", setTab);
//   }
// }

function changeDbWrapper(e) {
  app.wordlist.change(e);
}

function setTabWrapper(e) {
  app.tabs.setTab(e);
}

function clearTabWrapper(e) {
  app.tabs.clearTab(e);
}

function resetWrapper(e) {
  app.reset(e);
}

function backupSaveWrapper(e) {
  app.backup.save(e);
}

function backupShowWrapper(e) {
  app.backup.show(e);
}

function backupLoadWrapper(e) {
  app.backup.load(e);
}

function backupDialogCloseWrapper(e) {
  app.backup.dialogClose(e);
}

function updateCursorPosWrapper(e) {
  app.cursor.updatePos(e);
}

function addMenuListeners() {
  // HTM.clearButton.addEventListener("click", clearTab);
  HTM.resetButton.addEventListener("click", resetWrapper);

  // ## for refresh button + settings menu
  HTM.selectDb.addEventListener("change", changeDbWrapper);
  HTM.selectFontSize.addEventListener("change", changeFont);

  HTM.settingsMenu.addEventListener("mouseenter", dropdown);
  HTM.settingsMenu.addEventListener("mouseleave", dropdown);
}

function addHTMLlisteners() {
  HTM.kidsTheme.addEventListener("change", updateKidstheme);
}

function addDetailListeners() {
  HTM.helpAll.addEventListener("click", visibleLevelLimitToggle);
  HTM.help_state.addEventListener("toggle", setHelpState);
}

function addEditingListeners() {
  HTM.workingDiv.addEventListener("paste", normalizePastedText);
  // ## having probs removing his event listener; leave & ignore with updateInputDiv
  // HTM.workingDiv.addEventListener("keyup", debounce(updateInputDiv, 5000));
  // ** "copy" only works from menu; add keydown listener to catch Ctrl_C
  HTM.workingDiv.addEventListener("copy", normalizeTextForClipboard);
  HTM.workingDiv.addEventListener("keydown", catchKeyboardCopyEvent);
  // HTM.workingDiv.addEventListener("keyup", updateCursorPos);
  HTM.workingDiv.addEventListener("keyup", updateCursorPosWrapper);
  setHoverEffects();
}

function setHoverEffects() {
  HTM.workingDiv.addEventListener("mouseover", hoverEffects);
  HTM.workingDiv.addEventListener("mouseout", hoverEffects);
}

// *****  FUNCTIONS

function dropdown(e) {
  // ## toggle visibility of settings dropdown
  // ## was originally handled in css but firefox has mouseout quirks
  // ## https://stackoverflow.com/questions/46831247/select-triggers-mouseleave-event-on-parent-element-in-mozilla-firefox
  if (e.relatedTarget === null) {
    return;
  }
  HTM.settingsContent.style.display = (e.type == "mouseenter") ? "flex" : "none";
}


function registerLabelClick(e_label) {
  const label = e_label.target;
  if (label.htmlFor) {
    const input = document.getElementById(label.htmlFor);
    let parentID = label.htmlFor.split("_")[1];
    //console.log(`*registerLabelClick* parentID=${parentID}`);
    if (parentID) {
      parentID = "t1_" + parentID;
    } else {
      return;
    }
    const allInputs = document
      .getElementById(parentID)
      .querySelectorAll("input");
    let defaultChecked;
    let countChecked = 0;

    allInputs.forEach((el) => {
      const el_label = el.labels[0];
      if (el.defaultChecked) defaultChecked = el;
      // LOGIC:
      // 1) clicked element must be checked
      // 2) de-select an already-checked input
      if (el.id == input.id) {
        if (input.checked) {
          input.checked = false;
          el_label.classList.remove("selected_txt");
        } else {
          el.checked = true;
          el_label.classList.add("selected_txt");
        }
      }
      // LOGIC: in a group, if 1 radio checked, all others unchecked
      // 1) if already radio selected, no others selections allowed
      // 2) if el is radio, then it can't be selected
      else if (input.type == "radio" || el.type == "radio") {
        el.checked = false;
        el_label.classList.remove("selected_txt");
      }
      // LOGIC: remaining checkboxes are unaffected
      if (el.checked) countChecked += 1;
    });

    if (countChecked < 1) {
      defaultChecked.checked = true;
      defaultChecked.labels[0].classList.add("selected_txt");
      refreshLabels(parentID);
    }
    wordSearch(e_label);
  }
}

function refreshLabels(parentID) {
  const parent = document.getElementById(parentID);
  if (!parent) return;
  const allInputs = parent.querySelectorAll("input");
  allInputs.forEach((el) => {
    const label = el.labels[0];
    if (label) {
      if (el.defaultChecked) label.classList.add("selected_txt");
      else label.classList.remove("selected_txt");
    }
  });
}


function wordSearch(e) {
  let resultsArr = [];
  let HTMLstringToDisplay = "";
  const data = wordGetFormData(e);
  V.isExactMatch = (data.match[0] === "exact");
  let errorMsg = wordValidateFormData(data);
  if (errorMsg) {
    HTMLstringToDisplay = markStringAsError(errorMsg);
  } else {
    searchTerms = wordBuildSearchTerms(data);
    resultsArr = wordRunSearch(searchTerms);
    HTMLstringToDisplay = wordFormatResultsAsHTML(resultsArr);
  }
  wordDisplayResults(HTMLstringToDisplay, resultsArr.length);
}

function markStringAsError(str) {
  return Tag.tag("span", ["class=error"], [str]).stringify();
}

function updateKidstheme(e) {
  const selection = e.target;
  debug(selection.tagName, selection.value)
  selection.dataset.chosen = selection.value;
  wordSearch();
  // HTM.form.submit();
}

function wordGetFormData(e) {
  let raw_data = new FormData(HTM.form);
  if (e) e.preventDefault();
  let data = {
    term: [],
    match: [],
    level: [],
    theme: [],
    awl: [],
    pos: []
  };
  // ** Read & normalize raw data into 'data' object
  for (let [key, value] of raw_data) {
    // ## default value of html option (but screws up db lookup)
    if (value === "-1") value = "";
    // ## ignore form elements that aren't required for current dB
    // if (key === "level" && isKids()) continue;
    // if (key === "theme" && !isKids()) continue;
    // if (key === "awl" && !isBESTEP()) continue;
    if (key === "level" && app.state.isKids) continue;
    if (key === "theme" && !app.state.isKids) continue;
    if (key === "awl" && !app.state.isBESTEP) continue;
    const digit = parseInt(value)
    if (Number.isInteger(digit)) data[key].push(digit);
    else {
      const strVal = value.trim();
      if (strVal) data[key].push(strVal);
    }
  }
  return data;
}

function wordValidateFormData(data) {
  let status = 3;
  /* key for status:
  0 = contains a valid search term outside of "match"
  1 = contains a character other than space/apostrophe/hypen
  2 = contains a non-default match term but no lemma (which match requires)
  3 = contains nothing beyond the default "match=contains"
  */
  for (const el in data) {
    if (el === "match") continue;
    if (!isEmpty(data[el])) {
      status = 0;
      break;
    }
  }
  if (status === 3 && !data["match"].includes("contains")) status = 2;
  const term = data.term.join().split(" ")[0].toLowerCase();
  if (term.search(/[^a-z\-\s'\.]/g) > -1) status = 1;
  const errorMsg = [
    "",
    "The only non-alphabetic characters allowed are space, apostrophe, and hyphen.",
    "Please enter at least one search term to restrict the number of results.",
    "Enter a search term."
  ][status];
  return errorMsg;
}

function wordBuildSearchTerms(data) {
  // TODO: refine searchterms:
  /*
  .lemma (regex version)
  .raw_lemma (non regex)
  .db (0=gept, 1=awl, 2=kids) use C.GEPT/BESTEP/Kids
  .level
  .sublist (i.e. awl/gept/both/awl level)
  */
  let lemma = data.term.join().toLowerCase();
  const matchType = C.MATCHES[data.match];
  const searchTerms = {
    lemma: new RegExp(matchType[0] + lemma + matchType[1], "i"),
    raw_lemma: lemma,
    // level: (isKids()) ? data.theme : data.level,
    level: (app.state.isKids) ? data.theme : data.level,
    // awl: data.awl.map(x => (x < 100) ? x + C.awl_level_offset : x),
    awl: data.awl.map(x => (x < 100) ? x + app.wordlist.awl_level_offset : x),
    pos: data.pos.join("|")
  };
  return searchTerms;
}

function wordRunSearch(searchTerms) {
  let [type, matchedEntries] = checkAgainstLookups(searchTerms.raw_lemma, getEntriesByPartialLemma(searchTerms.lemma));
  matchedEntries.push(lazyCheckAgainstCompounds(searchTerms.raw_lemma));
  if (Number.isInteger(searchTerms.level[0])) {
    let tmp_matches = [];
    for (const level of searchTerms.level) {
      for (const entry of matchedEntries) {
        if (entry.levelGEPT === level) tmp_matches.push(entry);
      }
    }
    matchedEntries = tmp_matches;
  }
  if (!isEmpty(searchTerms.pos)) {
    matchedEntries = matchedEntries.filter(el => el.pos).filter(el => el.pos.search(searchTerms.pos) != -1);
  }
  if (app.state.isBESTEP && !isEmpty(searchTerms?.awl)) {
    /*
    el[C.LEVEL][2]:
    1-in awl only
    // 2-in gept only
    -1 in gept only
    3-in gept AND awl

    from search from (awl)
    form control returns:
    200=GEPT words,
    100=all AWL words,
    1-10 AWL levels
    */
    if (searchTerms.awl[0] === C.FIND_GEPT_ONLY) {
      matchedEntries = matchedEntries.filter(el => el.levelStatus === C.GEPT_ONLY);
    }
    else if (searchTerms.awl[0] === C.FIND_AWL_ONLY) {
      matchedEntries = matchedEntries.filter(el => el.levelAWL > 0);
    }
    else {
      matchedEntries = matchedEntries.filter(el => searchTerms.awl.indexOf(el.levelAWLraw) > -1);
    }
  }
  matchedEntries = matchedEntries.filter(result => result.id > 0);
  return matchedEntries;
}

function lazyCheckAgainstCompounds(word) {
  const tmpWord = word.replace(/-'\./g, "").split(" ").join("");
  let result = [];
  // for (const [compound, id] of Object.entries(V.currentDb.compounds)) {
  for (const [compound, id] of Object.entries(app.wordlist.compounds)) {
    if (compound.startsWith(tmpWord)) {
      result.push(id);
      break;
    }
  }
  return result;
}


function highlightAwlWord(levelArr, word) {
  return (app.state.isBESTEP && levelArr[1] >= 0) ? Tag.tag("span", ["class=awl-word"], [word]) : word;
}

function wordFormatResultsAsHTML(results) {
  if (isEmpty(results)) {
    return Tag.tag("span", ["class=warning"], ["Search returned no results."]).stringify();
  }
  let output = [];
  let previousInitial = "";
  let currentInitial = "";
  let i = 0;
  for (const entry of results.sort(compareByLemma)) {
    currentInitial = (entry.lemma) ? entry.lemma[0].toLowerCase() : "";
    if (currentInitial !== previousInitial) {
      output.push(formatResultsAsTablerows(currentInitial.toLocaleUpperCase(), "", "black", ""));
    }
    const awlWord = highlightAwlWord(entry.levelArr, entry.lemma);
    const lemma = Tag.tag("strong", [], [awlWord]);
    const pos = `[${entry.posExpansion}]`;
    let level = V.levelSubs[entry.levelGEPT];
    if (entry.levelAWL >= 0) level += `; AWL${entry.levelAWL}`;
    if (!level) continue;
    let [note, awl_note] = getNotesAsHTML(entry);
    const col2 = [lemma, Tag.tag("span", ["class=show-pos"], [pos]), " ", Tag.tag("span", ["class=show-level"], [level]), note, awl_note];
    // let class2 = (isKids()) ? "level-e" : `level-${level[0]}`;
    let class2 = (app.state.isKids) ? "level-e" : `level-${level[0]}`;
    output.push(formatResultsAsTablerows(`${i + 1}`, col2, "", class2));
    previousInitial = currentInitial;
    i++;
  }
  return Tag.tag("table", [], [...output]).stringify();
}


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


function formatResultsAsTablerows(col1, col2, class1, class2, row) {
  class1 = (class1) ? `class=${class1}` : "";
  class2 = (class2) ? `class=${class2}` : "";
  row = (row) ? `class=${row}` : "";
  return Tag.tag("tr", [], [
    Tag.tag("td", [class1], [col1]),
    Tag.tag("td", [class2], [...col2]),
  ]);
}

function wordDisplayResults(resultsAsHtmlString, resultCount = 0) {
  let text = LOOKUP.legends.results;
  if (resultCount) text += ` (${resultCount})`;
  HTM.resultsLegend.innerHTML = text;
  HTM.resultsText.innerHTML = resultsAsHtmlString;
}

// function clearTab1() {
//   HTM.form.reset();
//   wordSearch();
//   refreshLabels("t1_form");
// }


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
    const entry = getEntryById(id);
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
  } else if (tokenType === "wn") {
    displayLemma = [Tag.tag("span", ["class=lemma"], word), " negative of ", entry.lemma];
  } else {
    displayLemma = [Tag.tag("span", ["class=lemma"], entry.lemma)];
  }
  return displayLemma;
}

function buildHTMLlevel(entry, id, levelArr, tokenType) {
  let levelStr;
  // ** If word is offlist, use its classification (digit/name, etc.) as level
  if (tokenType !== "wv" && isInOfflistDb(id)) {
    levelStr = entry.pos; // a string, e.g. "jn"
  }
  else if (["d", "y", "c", "wo"].includes(tokenType)) levelStr = "";
  else {
    levelStr = V.levelSubs[levelArr[0]];
    // if (getAwlSublist(levelArr) >= 0) {
    if (entry.levelAWL >= 0) {
      levelStr += `; ${V.levelSubs[levelArr[1]]}`;
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
  return [" ", Tag.tag("span", ["class=awl-level"], [LOOKUP.level_headings[entry.levelGEPT]])];
}

// ** if text is pasted in, this is where processing starts
function normalizePastedText(e) {
  // ** preventDefault needed to prevent cursor resetting to start of div at every paste
  e.preventDefault();
  let paste = (e.clipboardData || window.clipboardData).getData('text');
  const selection = window.getSelection();
  selection.getRangeAt(0).insertNode(document.createTextNode(paste));
  signalRefreshNeeded("on");
  textMarkup(e);
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


function textMarkup(e) {
  if (!V.refreshRequired) return;
  signalRefreshNeeded("off");
  let revisedText = textGetLatest().trim();
  if (revisedText) {
    V.isExactMatch = true;
    V.setOfLemmaID = new Set();
    // app.wordlist.offlistDb = [new Entry("unused", "", [-1, -1, -1], "", 0)];
    // app.wordlist.offlistIndex = 0;
    app.wordlist.resetOfflistDb();
    let tokenArr = textdivideIntoTokens(revisedText);
    revisedText = null;
    tokenArr = textLookupCompounds(tokenArr);
    tokenArr = textLookupSimples(tokenArr);
    // debug(taggedTokenArr)
    textBuildHTML(tokenArr);
    // backupSave();
    app.backup.save();
    signalRefreshNeeded("off");
    app.cursor.setPos(document.getElementById(app.cursor.id));
  }
}


function textGetLatest() {
  let revisedText = app.cursor.insertPlaceholder(HTM.workingDiv, this.cursorOffsetNoMarks);
  if (revisedText === app.cursor.text) revisedText = "";
  return revisedText;
}

function getTextFromWorkingDiv() {
  let currentText = app.cursor.newlinesToPlaintext(app.cursor.removeTags(HTM.workingDiv)).innerText;
  currentText = EOLsToNewlines(currentText);
  currentText = currentText.trim();
  return currentText;
}

function textDisplay(resultsHTML, repeatsHTML, levelStatsHTML, wordCount) {
  app.wordlist.displayDbNameInTab2(getWordCountForDisplay(wordCount));
  displayRepeatsList(repeatsHTML, levelStatsHTML);
  displayWorkingText(resultsHTML);
  // ** Added here as don't exist when page loaded; automatically garbage-collected when el destroyed
  const levelDetailsTag = document.getElementById("level-details");
  if (levelDetailsTag) levelDetailsTag.addEventListener("toggle", setLevelState);
  // document.getElementById("level-details").addEventListener("toggle", setLevelState);
  document.getElementById("repeat-details").addEventListener("toggle", setRepeatState);
  // HTM.finalInfoDiv.innerText = "";
}

function displayWorkingText(html) {
  HTM.workingDiv.innerHTML = html;
  // setCursorPos(document.getElementById(CURSOR.id));
}


function textdivideIntoTokens(rawText) {
  signalRefreshNeeded("off");
  if (typeof rawText === "object") return;
  let text = normalizeRawText(rawText);
  let tokenArr = tokenize(text);
  return tokenArr;
}

function textBuildHTML(tokenArr) {
  const [totalWordCount, separateLemmasCount, levelStats] = getAllLevelStats(tokenArr);
  const resultsHTML = buildHTMLtext(tokenArr);
  tokenArr = null;
  const repeatsHTML = buildHTMLrepeatList(totalWordCount);
  const levelStatsHTML = buildHTMLlevelStats(separateLemmasCount, levelStats);
  textDisplay(resultsHTML, repeatsHTML, levelStatsHTML, totalWordCount);
}


function split(text) {
  text = text.replaceAll(/(A|P)\.(M)\./ig, "$1qqq$2qqq");           // protect preferred A.M. / P.M.
  text = text.replaceAll(/(\d)(a|p\.?m\.?\b)/ig, "$1 $2");          // separate 7pm > 7 pm
  const re = new RegExp("(\\w+)(" + app.cursor.text + ")(\\w+)", "g");  // catch cursor
  text = text.replaceAll(re, "$1$3$2");                             // move cursor to word end (to preserve word for lookup)
  text = text.replaceAll("\n", EOL.text);                            // catch newlines
  text = text.replaceAll(/([#\$£]\d)/g, "___$1");                   // ensure currency symbols stay with number
  text = text.trim();
  return text.split(/\___|\b/);                                     // use triple underscore as extra breakpoint
}


// function tokenize(textArr) {
function tokenize(text) {
  let textArr = split(text);
  textArr = tokenize1(textArr);   // identify main tokens
  textArr = tokenize2(textArr);   // confirm identification + prepare for grouping
  textArr = tokenize3(textArr);   // fine-tune position of splits
  textArr = tokenize4(textArr);
  debug(textArr)
  return textArr;
}

function tokenize1(textArr) {
  // Pass 1: identify possible tokens
  let tmpArr = [];
  for (let el of textArr) {
    if (!el.length) continue;
    let token = "**";
    if (/^\s+$/.test(el)) token = "s";               // space
    else if (el === "-") token = "s";                // hyphen
    else if (el === "'") token = "a";                // apostrophe
    else if (/\d/.test(el)) token = "d";             // digit
    else if (/[#$£]/.test(el)) token = "$";          // pre-digit punctuation (i.e. money etc.)
    else if (/[%¢]/.test(el)) token = "%";           // post-digit punctuation (i.e. money etc.)
    else if (/[+\-=@*<>&]/.test(el)) token = "y";  // symbols
    else if (el === ".") token = "@";                // punctuation digit (i.e. occurs in digits)
    else if (el === ",") token = "@";
    else if (/["',./?!()[\]]/.test(el)) token = "p";                // punctuation
    else if (el.indexOf("qqq") >= 0) [el, token] = [el.replaceAll("qqq", "."), "w"];
    // else if (el.indexOf(EOL.simpleText) >= 0) [el, token] = ["", "me"];    // metacharacter newline
    else if (el.indexOf(EOL.simpleText) >= 0) [el, token] = ["", "pe"];    // punctuation newline
    else if (el.indexOf(app.cursor.simpleText) >= 0) [el, token] = ["", "mc"]; // metacharacter cursor
    else if (/--/.test(el)) token = "p";                                   // m-dash
    else if (/\s/.test(el) && el.indexOf("-") >= 0) token = "p";           // dash (i.e. punctuation)
    else if (/[a-zA-Z]/.test(el)) token = "w";                             // word
    tmpArr.push([el, token]);
  }
  return tmpArr;
}

function tokenize2(textArr) {
  // Pass 2: use context to identify tokens & assign suitability to compound search
  const max = textArr.length - 1;
  const CMD = {
    combine: "+",
    delete: "-",
  }
  for (let i = 0; i <= max; i++) {
    const prev = (i > 0) ? textArr[i - 1] : [null, "-"];
    let next = (i < max) ? textArr[i + 1] : [null, "-"];
    let curr = textArr[i];
    // ** create patterns of elements for easy identification
    const c_n = curr[1] + next[1];
    const p_c_n = prev[1] + c_n;
    let entry = [];
    if (p_c_n === "waw") entry.push(CMD.combine, "c");  // contractions
    else if (c_n === "$d") entry.push(CMD.combine, "d");  // currency signs
    else if (c_n === "d%") entry.push(CMD.combine, "d");  // post-digit punctuation
    else if (c_n === "d@") entry.push(CMD.combine, "d");  // decimal point / thousand separator
    else if (p_c_n === "d@d") entry.push(CMD.combine, "d");  // decimal point / thousand separator
    curr.push(...entry);
  }
  return textArr;
}

function tokenize3(textArr) {
  // Pass 3: Merge specified chunks
  const TOKEN = 0;    // word or punctuation
  const TYPE = 1;     // w (word), s (space/hypen), d (digit), p (punctuation mark)
  const CMD = 2;      // + = combine with next; - = delete
  const newTYPE = 3;  // if combining, what is new type

  let tmpTokenArr = [];
  let acc = [];
  for (let el of textArr) {
    if (el[CMD] === "-") continue;
    const accumulatorEmpty = !!acc.length;
    // const combineWithNext = !!el[CMD];
    // const combineWithNext = el[CMD] === "+";
    // if (combineWithNext) {
    if (el[CMD] === "+") {
      if (accumulatorEmpty) acc = [acc[TOKEN] + el[TOKEN], el[newTYPE]];
      else acc = [el[TOKEN], el[newTYPE]];
    }
    else {
      if (accumulatorEmpty) {
        acc = [acc[TOKEN] + el[TOKEN], acc[TYPE]];
        tmpTokenArr.push(new Token(...acc));
        acc = [];
      }
      else tmpTokenArr.push(new Token(...[el[TOKEN], el[TYPE]]));
    }
  }
  return tmpTokenArr;
}

function tokenize4(taggedTokenArr) {
  // ** to deal with measurements i.e. num+abbrev. (no space)
  let tmpTokenArr = [];
  for (let token of taggedTokenArr) {
    // for (let candidate of token.candidates) {
    let toAdd = [];
    if (token.type === "d") {
      for (let el of Object.keys(LOOKUP.abbreviations)) {
        const ending = token.lemma.slice(-el.length)
        if (ending === el) {
          const num = token.lemma.slice(0, -el.length)
          toAdd.push(new Token(num, "d", []), new Token(ending, "w", []))
          break;
        }
      }
    }
    if (!toAdd.length) toAdd.push(token)
    tmpTokenArr.push(...toAdd);
    // }
  }
  return tmpTokenArr;
}


function textLookupCompounds(tokenArr) {
  // ** This must be the first look up done (check this is true!)
  const len = Object.keys(tokenArr).length;
  for (let i = 0; i < len; i++) {
    const token = tokenArr[i];
    if (token.type.startsWith("w")) {
      let j = i;
      let wordBlob = "";
      while (j < len && !tokenArr[j].type.startsWith("p")) {
        const tmpToken = tokenArr[j];
        if (tmpToken.type.startsWith("w")) wordBlob += tmpToken.lemma;
        j++;
      }
      wordBlob = wordBlob.toLowerCase();
      // for (const [compound, id] of Object.entries(V.currentDb.compounds)) {
      for (const [compound, id] of Object.entries(app.wordlist.compounds)) {
        if (wordBlob.startsWith(compound)) {
          token.appendMatches(getEntryById(id));
          break;
        }
      }
    }
  }
  return tokenArr;
}


function getAllLevelStats(tokenArr) {
  /*
  firstAppearanceOfWord = [lemma, id, gept level, awl level]
  */
  const [firstAppearanceOfWord, totalWordCount] = getFirstAppearanceOfEachWord(tokenArr);
  const separateLemmasCount = firstAppearanceOfWord.length;
  let lemmasBylevel = getListOfFirstAppearancesByLemma(firstAppearanceOfWord);
  let levelStats = [];
  let awlCount = 0;
  let awlEntries = 0;
  for (const level in lemmasBylevel) {
    const levelText = (level > -1) ? LOOKUP.level_headings[level] : "offlist";
    const lemmasAtThisLevel = lemmasBylevel[level];
    const currStat = buildLevelStat(level, levelText, lemmasAtThisLevel, separateLemmasCount);
    levelStats.push(currStat);
    if (app.state.isBESTEP && level >= 38) {
      awlCount += lemmasAtThisLevel;
      awlEntries++;
    }
  }
  if (app.state.isBESTEP && awlEntries > 1) levelStats.push(buildLevelStat(37, Tag.tag("b", [], ["AWL total"]), awlCount, separateLemmasCount));
  return [totalWordCount, separateLemmasCount, levelStats];
}


function getFirstAppearanceOfEachWord(tokenArr) {
  const firstAppearanceOfWord = []; // [lemma, id, gept level, awl level]
  const subsequentAppearances = []; // [lemma, id]
  for (const token of tokenArr) {
    // ** only need to look at the first candidate as all candidates point to same token lemma
    if (token.type.startsWith("w")) {
      let level;
      let awlLevel;
      const firstMatch = token.matches[0];
      if (token.count === 0) {
        // debug(token.lemma, token, firstMatch)
        if (token.type === "wo") {
          [level, awlLevel] = [-1, -1];
        }
        else {
          // [level, awlLevel] = getEntryById(firstID).levelArr.slice(0, 2);
          [level, awlLevel] = firstMatch.levelArr.slice(0, 2);
        }
        const info = [token.lemma, firstMatch.id, level, awlLevel];
        firstAppearanceOfWord.push(info)
      }
      else subsequentAppearances.push([token.lemma, firstMatch.id])
    }
  }
  const separateLemmasCount = firstAppearanceOfWord.length;
  const totalWordCount = separateLemmasCount + subsequentAppearances.length;
  return [firstAppearanceOfWord, totalWordCount];
}

function getListOfFirstAppearancesByLemma(firstAppearanceOfWord) {
  let lemmasBylevel = {};
  for (const [word, id, geptLevel, awlLevel] of firstAppearanceOfWord) {
    // ** NB awl words are also included in the GEPT level counts
    lemmasBylevel[geptLevel] = (lemmasBylevel[geptLevel] || 0) + 1;
    if (awlLevel > -1) lemmasBylevel[awlLevel] = (lemmasBylevel[awlLevel] || 0) + 1;
  }
  return lemmasBylevel;
}

function buildLevelStat(level, levelText, lemmasAtThisLevel, separateLemmasCount) {
  return [level, levelText, lemmasAtThisLevel, Math.round(100 * (lemmasAtThisLevel / separateLemmasCount)) + "%"];
}

function displayRepeatsList(listOfRepeats, levelStatsHTML) {
  HTM.repeatsList.innerHTML = levelStatsHTML + listOfRepeats;
}


function normalizeRawText(text) {
  return text
    // .replace(/[\u2018\u2019']/g, " '")    // replace curly single quotes
    .replace(/[\u2018\u2019']/g, "'")    // replace curly single quotes
    .replace(/[\u201C\u201D]/g, '"')      // replace curly double  quotes
    .replace(/…/g, "...")
    .replace(/(\r\n|\r|\n)/g, "\n")       // encode EOLs
    .replace(/\n{2,}/g, "\n")
    .replace(/\n/g, ` ${EOL.text} `)      // encode EOLs
    .replace(/–/g, " -- ")                // pasted in em-dashes
    .replace(/—/g, " - ")
    .replace(/(\w)\/(\w)/g, "$1 / $2")    // insert spaces either side of slash
    .replace(/\s{2,}/gm, " ");            //
}


function textLookupSimples(tokenArr) {
  // Provide lookups for all non-punctuation tokens + log repetitions
  const expansions = {
    c: "contraction",
    d: "digit",
    y: "symbol",
  };
  V.tallyOfIDreps = {};
  for (let token of tokenArr) {
    // ** ignore compounds for now; they are dealt with separately
    if (token.type === "w") {
      const [revisedType, matchedEntries] = lookupWord(token.lemma);
      if (!isEmpty(matchedEntries)) {
        token.appendMatches(matchedEntries);
        token.type = revisedType;
        token.count = updateTallyOfIDreps(token.matches);
      }
    }
    else if (["c", "d", "y"].includes(token.type)) {
      token.overwriteMatches(markOfflist(token.lemma, expansions[token.type]));
    }
  }
  return tokenArr;
}

function updateTallyOfIDreps(entryArr) {
  for (const entry of entryArr) {
    V.tallyOfIDreps[entry.id] = V.tallyOfIDreps[entry.id] + 1 || 0;
  }
  return V.tallyOfIDreps[entryArr[0].id];
}


function markOfflist(word, offlistType) {
  word = word.trim();
  // ** adds entry to offlistDb & returns ID (always negative number)
  // ** This creates a dummy dB entry for offlist words
  let offlistEntry = [];
  let offlistID;
  let isUnique = true;
  for (const entry of app.wordlist.offlistDb) {
    if (entry.lemma === word) {
      isUnique = false;
      offlistEntry = entry;
      break;
    }
  }
  if (isUnique) {
    offlistEntry = addNewEntryToOfflistDb([word, offlistType, [LOOKUP.offlist_subs.indexOf(offlistType) + LOOKUP.level_headings.length, -1, -1], ""]);
  }
  return offlistEntry;
}


function addNewEntryToOfflistDb(entryContents) {
  const offlistID = -(app.wordlist.offlistDb.length);
  const newEntry = new Entry(...entryContents, offlistID);
  app.wordlist.offlistDb.push(newEntry);
  app.wordlist.offlistIndex++;
  return newEntry;
}


function lookupWord(word) {
  // const originalWord = word;
  word = word.toLowerCase();
  let matchedEntries;
  let tokenType = "w";
  [tokenType, matchedEntries] = checkAgainstLookups(word, getEntriesByExactLemma(word), tokenType);
  if (isEmpty(matchedEntries)) {
    matchedEntries = [markOfflist(word.toLowerCase(), "offlist")];
    tokenType = "wo"   // wo=offlist word
  }
  const results = [tokenType, matchedEntries];
  return results;
}

function checkAgainstLookups(word, exactMatches, tokenType="") {
  /*
  algorithm:
  IF direct match(es) found for WORD:
    return match(es) DIRECTLY
  ELSE:
	  check for variant spelling / negative prefix & if true, revise spelling of WORD
	  check for derivations / variants / names etc.
  */
  let matchedEntries = [];
  if (isEmpty(exactMatches)) {
    let revisedSpelling = "";
    [revisedSpelling, matchedEntries, tokenType] = checkForEnglishSpelling(word, tokenType);
    if (isEmpty(matchedEntries)) {
      matchedEntries = checkNegativePrefix(word);
      if (!isEmpty(matchedEntries)) {
        revisedSpelling = matchedEntries[0].lemma;
        tokenType += "n"
      }
    }
    word = revisedSpelling;
    const matchedDerivedEntries = checkDerivations(word);
    if (!isEmpty(matchedDerivedEntries)) {
      matchedEntries.push(...matchedDerivedEntries);
      tokenType = tokenType + "d";
    }
    if (isEmpty(matchedEntries)) {
      matchedEntries = checkAllowedVariants(word);
      if (!isEmpty(matchedEntries)) tokenType = tokenType + "v";
    }
  }
  else matchedEntries = exactMatches;
  return [tokenType, matchedEntries];
}


function checkForEnglishSpelling(word, tokenType) {
  // returns => [lemma, [ids...], type]
  let exactMatches = checkVariantSpellings(word);
  if (isEmpty(exactMatches)) exactMatches = checkVariantSuffixes(word);
  if (!isEmpty(exactMatches)) {
    word = exactMatches[0].lemma;
    tokenType += "v";
  }
  return [word, exactMatches, tokenType];
}

function idSuccessfullyMatched(idArr) {
  return idArr.some(id => id > 0);
}

function checkNegativePrefix(word) {
  // TODO: only for adj/adv
  let matchedEntries = [];
  const prefix = hasNegativePrefix(word);
  if (prefix) {
    const base = prefix;
    matchedEntries = getEntriesByExactLemma(base);
    if (!idSuccessfullyMatched(matchedEntries)) matchedEntries = checkDerivations(base, matchedEntries);
  }
  return matchedEntries;
}

function hasNegativePrefix(word) {
  // ** returns undefined (falsey) if no prefix found; else [prefix, base]
  let prefix = "";
  if (word.length > 4) {
    const possiblePrefix = word.slice(0, 2);
    if (LOOKUP.prefixes.includes(possiblePrefix)) {
      prefix = word.slice(2);
    }
  }
  return prefix;
}




function checkVariantSuffixes(word) {
  let matchedLemmas = [];
  let matchedEntries = [];
  if (word.endsWith("s")) word = word.slice(0, -1);
  else if (word.endsWith("d")) word = word.slice(0, -1);
  else if (word.endsWith("ing")) word = word.slice(0, -3);
  if (word.endsWith("e")) word = word.slice(0, -1);
  for (const [variant, replacement] of LOOKUP.variantSuffixes) {
    const len = variant.length;
    const root = word.slice(0, -len);
    const suffix = word.slice(-len);
    if (variant === suffix) {
      matchedLemmas.push(root + replacement);
    }
  }
  if (!isEmpty(matchedLemmas)) {
    for (const lemma of matchedLemmas) {
      const variant = getEntriesByExactLemma(lemma);
      if (variant) matchedEntries.push(...variant);
    }
  }
  return matchedEntries;
}


// function checkVariantHyphens(word) {
//   let matchIDarr = [];
//   if (word.length > 4 && word.includes("-")) {
//     const deHyphenatedWord = word.replace("-", "");
//     matchIDarr = getIdsByLemma(deHyphenatedWord);
//     if (!idSuccessfullyMatched(matchIDarr)) matchIDarr = checkDerivations(deHyphenatedWord);
//   }
//   return matchIDarr;
// }

function checkVariantSpellings(word) {
  let matchedEntries = [];
  if (LOOKUP.notLetterVariant.includes(word)) return matchedEntries;
  for (const [letters, replacement] of LOOKUP.variantLetters) {
    matchedEntries = subLettersAndCheckForMatches(word, letters, replacement);
    if (!isEmpty(matchedEntries)) {
      break;
    }
  }
  return matchedEntries;
}

function subLettersAndCheckForMatches(word, letters, replacement) {
  // N.B. this also checks for derivations
  let matchedEntries = [];
  const re = new RegExp(letters, "gi")
  let found;
  let indices = [];
  while ((found = re.exec(word)) !== null) {
    indices.push(found.index);
  }
  if (!isEmpty(indices)) {
    for (const pos of indices) {
      const variant = word.slice(0, pos) + replacement + word.slice(pos + letters.length)
      matchedEntries = getEntriesByExactLemma(variant);
      if (matchedEntries.length) break;
      matchedEntries = checkDerivations(variant);
      if (matchedEntries.length) break;
    }
  }
  return matchedEntries;
}



function checkAllowedVariants(word, offlistID = 0) {
  const shouldUpdateOfflistDb = (offlistID !== 0);
  let matchedIDarr = [];
  for (let check of [
    checkVariantWords,
    checkAbbreviations,
    checkGenderedNouns,
  ]) {
    let result = check(word);
    if (result.length) {
      matchedIDarr.push(...result);
      break;
    }
  }
  if (!isEmpty(matchedIDarr) && offlistID !== 0) {
    // V.offlistDb[-offlistID] = [offlistID, word, "variant", matchedIDarr, ""];
    app.wordlist.offlistDb[-offlistID] = [offlistID, word, "variant", matchedIDarr, ""];
  }
  return matchedIDarr;
}

function checkVariantWords(word) {
  let match = "";
  let matchedEntries = []
  for (let key of Object.keys(LOOKUP.variantWords)) {
    const truncated = word.slice(0, key.length)
    const searchTerm = (V.isExactMatch) ? key : key.slice(0, word.length);
    if (searchTerm === truncated) {
      match = LOOKUP.variantWords[key];
      matchedEntries = getEntriesByExactLemma(match)
      break;
    }
  }
  return matchedEntries;
}

function checkAbbreviations(word) {
  word = word.replace(".", "");
  let matchedEntries = [];
  if (LOOKUP.abbreviations.hasOwnProperty(word)) {
    const match = LOOKUP.abbreviations[word];
    for (const lemma of match.split(":")) {
      matchedEntries.push(...getEntriesByExactLemma(lemma));
    }
  }
  return matchedEntries;
}

function checkGenderedNouns(word) {
  let lemma = "";
  let matchedEntries = []
  for (let key of Object.keys(LOOKUP.gendered_nouns)) {
    const truncated = word.slice(0, key.length)
    const searchTerm = (V.isExactMatch) ? key : key.slice(0, word.length);
    if (searchTerm === truncated) {
      lemma = LOOKUP.gendered_nouns[key];
      matchedEntries = getEntriesByExactLemma(lemma)
      break;
    }
  }
  return matchedEntries;
}


function checkDerivations(word, preMatchedIDarr = []) {
  // returns => array of matched ids
  // NB. always returns a match, even if it is just "offlist"
  /* Tests
  negatives = aren't won't cannot
  irregular pasts = hidden written stole lain
  irregular plurals = indices, cacti, criteria, phenomena, radii, formulae, bases, children, crises
  Ving = "bobbing begging swimming buzzing picnicking hoping dying going flying"
  Vpp = robbed gagged passed busied played visited
  Superlatives = "longest hottest prettiest closest soonest"
  Comparatives = "longer hotter prettier closer sooner"
  Final-s =  families tries potatoes scarves crises boxes dogs
  regular ADVs =  happily clumsily annually finely sensibly sadly automatically
  */
  if (!LOOKUP.falseDerivations.includes(word)) {
    let localMatches = [];
    for (const guess of [
      checkNames,
      checkArticle,
      checkIrregularNegatives,
      checkIrregularVerbs,
      checkIrregularPlurals,
      checkForeignPlurals,
      checkAllSuffixes,
      // checkNegativePrefix,
    ]) {
      const result = guess(word);
      if (result?.length) {
        localMatches.push(...result);
        break;
      }
    }
    if (localMatches.length) {
      preMatchedIDarr.push(...localMatches);
    }
  }
  preMatchedIDarr = dedupeSimpleArray(preMatchedIDarr);
  // debug("===", preMatchedIDarr.length,...preMatchedIDarr)
  return preMatchedIDarr;
}


function dedupeSimpleArray(arr) {
  if (typeof arr !== "object") return [arr];
  arr = [...new Set(arr)];
  // arr = arr.filter(el => el.length);
  return arr;
}


function checkNames(word) {
  let matchedEntry = [];
  if (LOOKUP.personalNames.includes(word)) {
    // result.push(...markOfflist(word, "name"));
    matchedEntry.push(markOfflist(word, "name"));
  }
  return matchedEntry;
}

function checkArticle(word) {
  let matchedEntry = [];
  if (word === "an") {
    // result.push(...getIdsByLemma("a")[0]);
    matchedEntry.push(...getEntriesByExactLemma("a"));
  }
  return matchedEntry;
}


function checkIrregularNegatives(word) {
  let matchedEntries = [];
  const lookup = LOOKUP.irregNegVerb[word];
  if (lookup) {
    matchedEntries.push(...winnowPoS(getEntriesByExactLemma(lookup), ["x", "v"]));
  }
  return matchedEntries;
}

function checkIrregularVerbs(word) {
  let matchedEntries = [];
  const lookup = LOOKUP.irregVerb[word];
  if (lookup) {
    matchedEntries.push(...winnowPoS(getEntriesByExactLemma(lookup), ["x", "v"]));
  }
  return matchedEntries;
}

function checkIrregularPlurals(word) {
  let matchedEntries = [];
  const lookup = LOOKUP.irregPlural[word];
  if (lookup) {
    // ** words in the lookup are most likely the correct word (and 'others / yourselves' aren't nouns!)
    matchedEntries.push(...getEntriesByExactLemma(lookup));
  }
  return matchedEntries;
}


function checkForeignPlurals(word) {
  let matchedEntries = [];
  if (word.length <= 2) return;
  for (const [plural, singular] of LOOKUP.foreign_plurals) {
    const root = word.slice(0, -plural.length);
    const ending = word.slice(-plural.length);
    if (ending === plural) {
      const lookup = getEntriesByExactLemma(root + singular);
      if (!isEmpty(lookup)) {
        matchedEntries.push(...winnowPoS(lookup, ["n"]));
        break;
      }
    }
  }
  return matchedEntries;
}

function checkAllSuffixes(word) {
  const suffixChecks = [
    ["s", LOOKUP.s_subs, ["n", "v"]],
    ["ing", LOOKUP.ing_subs, ["v"]],
    ["ed", LOOKUP.ed_subs, ["v"]],
    ["st", LOOKUP.est_subs, ["j"]],
    ["r", LOOKUP.er_subs, ["j"]],
    ["ly", LOOKUP.ly_subs, ["j"]],
  ];
  let matchedEntries = [];
  for (let el of suffixChecks) {
    const rawMatches = checkForSuffix(word, ...el);
    if (rawMatches.length) matchedEntries.push(...rawMatches);
    // debug(word, el[0], !!rawMatches.length, ...rawMatches, rawMatches, matches)
    if (matchedEntries.length && el[0] !== "s") break;
    // ** -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
  }
  return matchedEntries;
}


function checkForSuffix(word, suffix, lookup, pos) {
  let matchEntries = [];
  if (word.endsWith(suffix)) {
    matchEntries.push(...winnowPoS(findBaseForm(word, lookup), pos));
  }
  // debug(">>>>>", result.length, ...result, result)
  return matchEntries;
}

function winnowPoS(entryList, posArr) {
  // ** Returns possible IDs of derivations as array, or empty array
  let matchedEntries = [];
  for (const entry of entryList) {
    for (const pos of posArr) {
      if (entry && entry.pos.includes(pos)) {
        matchedEntries.push(entry);
      }
    }
  }
  // debug("???", localMatches.length, ...localMatches, localMatches)
  return matchedEntries;
}


function getEntryById(id) {
  // ** a negative id signifies an offlist word
  let entry;
  if (id !== undefined) {
    let parsedId = parseInt(id);
    // const dB = (isInOfflistDb(parsedId)) ? V.offlistDb : V.currentDb.db;
    const dB = (isInOfflistDb(parsedId)) ? app.wordlist.offlistDb : app.wordlist.db;
    parsedId = Math.abs(parsedId);
    entry = dB[parsedId]
  }
  return entry;
}


function buildHTMLtext(tokenArr) {
  let toWrapInHTML = ["w", "wc", "wv", "wn","wo", "wd", "c", "d", "y"];
  // ** word/compound/variant/offlist/derivation, contraction, decimal, y=symbol?
  let htmlString = "";
  let wordIndex = 0;
  for (let token of tokenArr) {
    const firstType = token.type;
    if (firstType === "pe") htmlString += EOL.HTMLtext;
    else if (firstType === "mc") htmlString += app.cursor.HTMLtext;
    else if (!toWrapInHTML.includes(firstType)) htmlString += token.lemma;
    else {
      wordIndex++;
      const groupedWord = buildHTMLword(token, wordIndex);
      htmlString += groupedWord;
    }
  }
  return htmlString;
}

function buildHTMLword(token, wordIndex) {
  // ** expects populated list of matches (therefore requires textLookupSimples)
  if (!token.matches.length) console.log(`WARNING: No match for this item (${token.lemma})!!`)
  let word = token.lemma;
  const [
    sortedByLevel,
    levelsAreIdentical
  ] = getSortedMatchesInfo(token);
  const firstID = sortedByLevel[0][0];
  // TODO: this currently doesn't look at the type of each candidate; is it worth changing?
  const firstType = sortedByLevel[0][2];
  let variantClass = (firstType.type === "wv") ? " variant" : "";
  if (firstType.startsWith("w")) V.setOfLemmaID.add(token.lemma.toLowerCase() + ":" + firstID);
  const ignoreThisRep = LOOKUP.repeatableWords.includes(token.lemma.toLowerCase());
  const [
    levelArr,
    levelClass
  ] = getLevelDetails(sortedByLevel[0][1]);
  const limit = (V.levelLimitStr && V.levelLimitActiveClassesArr.includes(levelClass)) ? ` ${C.LEVEL_LIMIT_CLASS}` : "";
  const [
    relatedWordsClass,
    duplicateClass,
    duplicateCountInfo,
    anchor
  ] = getDuplicateDetails(token, firstID);
  word = app.cursor.insertInHTML(token.length, wordIndex, word);
  const localWord = highlightAwlWord(levelArr, word);
  // ** listOfLinks = id:lemma:type
  // let listOfLinksArr = token.matches.map(id => `${id}:${token.lemma.trim()}:${token.type}`);
  let listOfLinksArr = token.matches.map(entry => `${entry.id}:${token.lemma.trim()}:${token.type}`);
  let showAsMultiple = "";
  if (sortedByLevel.length > 1) showAsMultiple = (levelsAreIdentical) ? "multi-same" : "multi-diff";
  const classes = [levelClass, relatedWordsClass, duplicateClass, showAsMultiple, variantClass, limit].join(" ");
  const displayWord = Tag.tag("span", [`data-entry=${listOfLinksArr.join(" ")}`, `class=${classes}`, duplicateCountInfo, anchor], [localWord]);
  return displayWord.stringify();
}


function getSortedMatchesInfo(token) {
  let matches = token.matches;
  let idLevelArr = [];   // ** [[0:id, 1:[gept,awl, status], 2:tokenType], ...]]
  // for (const id of matches) {
  //   idLevelArr.push([id, getEntryById(id).levelArr, token.type])
  // }
  for (const entry of matches) {
    idLevelArr.push([entry.id, entry.levelArr, token.type])
  }
  let levelsAreIdentical = true;
  if (idLevelArr.length > 1) {
    idLevelArr.sort((a, b) => a[1][0] - b[1][0]);
    levelsAreIdentical = idLevelArr.map(el => el[1]).every(level => level[0] === idLevelArr[0][1][0]);
  }
  return [idLevelArr, levelsAreIdentical]
}

function visibleLevelLimitToggle(e) {
  const [level, isValidSelection, resetPreviousSelectionRequired] = visibleLevelLimitInfo(e.target);
  if (isValidSelection) {
    if (resetPreviousSelectionRequired) {
      visibleLevelLimitApply(V.levelLimitStr);
      V.levelLimitStr = "";
    }
    if (V.levelLimitStr) {
      visibleLevelLimitApply(V.levelLimitStr);
      V.levelLimitStr = "";
      V.levelLimitActiveClassesArr = [];
      app.state.current.limit_state = -1;
    } else {
      V.levelLimitStr = level;
      V.levelLimitActiveClassesArr = C.LEVEL_LIMITS.slice(C.LEVEL_LIMITS.indexOf(V.levelLimitStr));
      app.state.current.limit_state = C.LEVEL_LIMITS.indexOf(level);
      visibleLevelLimitApply(V.levelLimitStr, false);
    }
    app.state.saveItem("limit_state", app.state.current.limit_state);
  }
}

function visibleLevelLimitInfo(el) {
  const level = el.className.split(" ")[0];
  const isValidSelection = level.startsWith("level") && level !== "level-e";
  const resetPreviousSelectionRequired = (isValidSelection && !!V.levelLimitActiveClassesArr.length && level !== V.levelLimitActiveClassesArr[0]);
  return [level, isValidSelection, resetPreviousSelectionRequired];
}

function visibleLevelLimitApply(className, removeClass = true) {
  const classesToChange = (isEmpty(V.levelLimitActiveClassesArr)) ? C.LEVEL_LIMITS.slice(C.LEVEL_LIMITS.indexOf(className)) : V.levelLimitActiveClassesArr;
  for (const level of classesToChange) {
    const targetElements = document.getElementsByClassName(level);
    for (const el of targetElements) {
      if (removeClass) {
        el.classList.remove(C.LEVEL_LIMIT_CLASS);
      } else {
        el.classList.add(C.LEVEL_LIMIT_CLASS);
      }
    }
  }
}

function visibleLevelLimitSet(fromSaved = false) {
  if (fromSaved) {
    V.levelLimitStr = (app.state.current.limit_state >= 0) ? C.LEVEL_LIMITS[app.state.current.limit_state] : "";
    V.levelLimitActiveClassesArr = (V.levelLimitStr) ? C.LEVEL_LIMITS.slice(app.state.current.limit_state) : [];
  }
  if (V.levelLimitStr) {
    visibleLevelLimitApply(V.levelLimitStr, false);
  }
  else {
    visibleLevelLimitApply(C.LEVEL_LIMITS[0])
  }
}

function visibleLevelLimitReset() {
  app.state.saveItem("limit_state", app.state.default.limit_state);
  visibleLevelLimitSet(true);
}


function setHelpState(e) {
  setDetailState(e, "help_state");
}

function setRepeatState(e) {
  setDetailState(e, "repeat_state");
}

function setLevelState(e) {
  setDetailState(e, "level_state");
}


function setDetailState(e, destination) {
  let el, mode;
  if (e.target) {
    el = e.target;
    mode = "toggle";
  } else {
    el = HTM[destination];
    mode = e;
  }
  if (mode === "toggle") {
    app.state.current[destination] = (el.hasAttribute("open")) ? 1 : 0;
  }
  else {
    if (mode === "reset") app.state.current[destination] = app.state.default[destination];
    if (app.state.current[destination] && el) el.setAttribute("open", "")
    else if (el) el.removeAttribute("open");
  }
  app.state.saveItem(destination, app.state.current[destination]);
}


function renderEOLsAsHTML(word, htmlString, wasEOL) {
  const isEOL = word === EOL.text;
  if (isEOL) {
    htmlString += EOL.HTMLtext;
    wasEOL = true;
  }
  return [isEOL, wasEOL, htmlString];
}

function getDuplicateDetails(token, id) {
  const ignoreThisRep = LOOKUP.repeatableWords.includes(token.lemma.toLowerCase());
  const totalReps = V.tallyOfIDreps[id];
  let duplicateClass = "";
  let duplicateCountInfo = "";
  let anchor = "";
  const relatedWordsClass = `all_${id}`;
  if (totalReps > 0 && !ignoreThisRep) {
    duplicateClass = "duplicate";
    duplicateCountInfo = `data-reps=${totalReps}`;
    anchor = `id=${relatedWordsClass}_${token.count + 1}`;
  }
  return [relatedWordsClass, duplicateClass, duplicateCountInfo, anchor];
}


function getLevelDetails(levelArr) {
  const levelClass = "level-" + getLevelPrefix(levelArr[0]);
  return [levelArr, levelClass];
}


function escapeHTML(text) {
  // return encodeURIComponent(text);
  if (/[<>&"]/.test(text)) {
    // text = text.replaceAll(/&/g, "&amp;");
    text = text.replaceAll(/</g, "&lt;");
    text = text.replaceAll(/>/g, "&gt;");
    // text = text.replaceAll(/"/g, "&quot;");
  }
  return text;
}


function getLevelPrefix(levelGEPT) {
  // const levelNum = entry.levelGEPT;
  let level = V.levelSubs[levelGEPT];
  // if (isKids() && levelGEPT < V.OFFLIST) level = "k";
  if (app.state.isKids && levelGEPT < app.wordlist.offlistLevel) level = "k";
  if (!level) level = "o";
  return level[0];
}


function buildHTMLlevelStats(separateLemmasCount, levelStats) {
  /*
  <details id="level-details"${toggleOpen}>
    <summary class="all-repeats">
      Level statistics:<em> (${separateLemmasCount} headwords)</em>
    </summary>
    <div class="level-stats-cols">
      <p class="level..."></p>
    </div>
  </details>
  */
  let levelStatsHTML = "";
  // if (!separateLemmasCount || isKids()) return levelStatsHTML;
  if (!separateLemmasCount || app.state.isKids) return levelStatsHTML;
  let tmpStats = [];
  for (const [levelID, levelText, total, percent] of levelStats.sort((a, b) => a[0] - b[0])) {
    if (levelID < 3) tmpStats.push(Tag.tag("p", [`class=level-${levelText[0]}`], [levelText, ": ", total, " (", percent, ")"]));
    else if (app.state.isBESTEP) tmpStats.push(Tag.tag("p", ["class=level-a"], [levelText, ": ", total, " (", percent, ")"]));
  }
  const toggleOpen = (app.state.current.level_state) ? " open" : "";
  levelStatsHTML = Tag.root([Tag.tag("details", ["id=level-details", toggleOpen], [
    Tag.tag("summary", ["class=all-repeats"], [
      "Level statistics:",
      Tag.tag("em", [], [separateLemmasCount, " headwords"]),
    ]),
    Tag.tag("div", ["class=level-stats-cols"], [...tmpStats])
  ])
  ]);
  return levelStatsHTML.stringify();
}


function buildHTMLrepeatList(wordCount) {
  let countAllReps = 0;
  let repeatsHeader;
  let listOfRepeats = [];
  const idForEventListener = "repeat-details";
  if (wordCount) {
    /* List of repeated lemmas
    in line with display policy, if two lemmas are identical,
    the id with the lowest level is linked/displayed
    This fits with buildMarkupAsHTML()
    same lemma, different rawWord: only first is displayed (i.e. 'learned (learns)')
    */
    const repeatsList = [...V.setOfLemmaID].sort();
    let idList = [];
    for (const el of repeatsList) {
      const [word, id] = el.split(":");
      if (idList.includes(id)) continue;
      else idList.push(id);
      const entry = getEntryById(id);
      const totalReps = V.tallyOfIDreps[id];
      const isRepeatable = !LOOKUP.repeatableWords.includes(word);
      if (totalReps > 0 && isRepeatable) {
        countAllReps++;
        let anchors = [];
        for (let rep = 1; rep <= totalReps + 1; rep++) {
          let display = rep;
          let displayClass = "class=anchors";
          if (rep === 1) {
            display = highlightAwlWord(entry.levelArr, word);
            displayClass = `class=level-${getLevelPrefix(entry.levelGEPT)}`;
          }
          anchors.push(" ", Tag.tag("a", ["href=#", displayClass, `onclick=jumpToDuplicate('all_${id}_${rep}'); return false;`], [display]));
        }
        listOfRepeats.push(Tag.tag("p", [`data-entry=${id}`, `class=duplicate all_${id} level-${getLevelPrefix(entry.levelGEPT)}`], [...anchors]));
      }
    }
    if (countAllReps > 0) {
      const toggleOpen = (app.state.current.repeat_state) ? " open" : "";
      repeatsHeader = Tag.tag("details", [`id=${idForEventListener}`, toggleOpen], [
        Tag.tag("summary", ["id=all_repeats", "class=all-repeats"], [
          countAllReps,
          ` significant repeated word${(countAllReps === 1) ? "" : "s"}`,
        ]),
        Tag.tag("p", [], [
          Tag.tag("em", [], ["Click on word / number to jump to that occurrence."])
        ]),
        Tag.tag("div", ["id=repeats"], [...listOfRepeats]),
      ]);
    }
  }
  if (!repeatsHeader) {
    repeatsHeader = Tag.tag("p", [`id=${idForEventListener}`], [
      Tag.tag("span", ["id=all_repeats", "class=all-repeats"], ["There are no significant repeated words."])]);
  }
  return repeatsHeader.stringify();
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
  const numOfWords = (wordCount > 0) ? Tag.tag("span", ["class=text-right dark"], [
    "(",
    wordCount,
    " word",
    pluralNoun(wordCount),
    ")",
    // tag("a", ["href=#all_repeats", "class=medium"], [" >&#x25BC;"]),
    Tag.tag("a", ["href=#all_repeats", "class=medium"]),
  ]) : "";
  return numOfWords;
}

function pluralNoun(amount) {
  return (amount > 1) ? "s" : "";
}


function getEntriesByExactLemma(lemma) {
  // ** returns empty array or array of Entries
  lemma = lemma.toLowerCase();
  const entryList = app.wordlist.db
    .filter(el => el.lemma.toLowerCase() === lemma);
  return entryList;
}

function getEntriesByPartialLemma(lemma) {
  // lemma = lemma.toLowerCase();
  const entryList = app.wordlist.db
    .filter(el => el.lemma.search(lemma) !== -1)
  return entryList;
}

function findBaseForm(word, subs) {
  // ** Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
  let matchedEntries = [];
  for (const [ending, sub] of subs) {
    const root = word.slice(0, -ending.length);
    if ((root + ending) === word) {
      const candidate = root + sub;
      const tmp_match = getEntriesByExactLemma(candidate);
      if (!isEmpty(tmp_match)) {
        matchedEntries.push(...tmp_match);
      }
    }
  }
  return matchedEntries;
}


// function clearTab2() {
//   backupSave();
//   HTM.workingDiv.innerText = "";
//   HTM.finalInfoDiv.innerText = "";
//   HTM.repeatsList.innerText = "";
//   app.wordlist.displayDbNameInTab2();
//   V.appHasBeenReset = true;
//   // backupReset();
// }


// ## SLIDER code ############################################

function changeFont(e) {
  const fontSize = e.target.value + "px";
  HTM.root_css.style.setProperty("--font-size", fontSize);
}


function setupEditing(e) {
  HTM.finalInfoDiv.classList.remove("word-detail");
  addEditingListeners();
  // forceUpdateInputDiv();
}


// function convertMarkupToText(el) {
//   const re = new RegExp("\s*" + EOL.text + "\s*", "g");
//   el = removeTags(el);
//   el = newlinesToPlaintext(el);
//   const HTMLtoPlainText = el.innerText
//     .replace(/\s{2,}/g, " ")
//     .replace(re, "\n")
//     .replace(/\n\s/g, "\n")
//     .replace(/\n{2,}/g, "\n");
//   return HTMLtoPlainText;
// }


function jumpToDuplicate(id) {
  // ** clean up previous highlights
  const cssClass = "jumpHighlight";
  for (const element of document.getElementsByClassName(cssClass)) {
    element.classList.remove(cssClass)
  }
  const duplicate = document.getElementById(id);
  if (duplicate) {
    duplicate.classList.add(cssClass);
    duplicate.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ## COMMON ELEMENTS ######################################

// function clearTab(event) {
//   event.preventDefault();
//   if (isFirstTab()) {
//     clearTab1();
//   } else {
//     clearTab2();
//   }
//   displayInputCursor();
// }


function isInOfflistDb(idOrEntry) {
  const id = (Number.isInteger(idOrEntry)) ? idOrEntry : idOrEntry.id;
  return id < 0;
}

function lemmaIsInCompoundsDb(lemma) {
  return app.wordlist.compounds[lemma];
}

function isEmpty(arr) {
  // TODO: simplify to !arr.length ?
  // return !arr?.flat(Infinity).length;
  let hasContent;
  if (!arr) hasContent = false;
  else if (typeof arr !== "object") hasContent = true;
  else hasContent = arr.length > 0;
  return !hasContent;
}


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
  textMarkup();
  // V.refreshRequested = false;
}