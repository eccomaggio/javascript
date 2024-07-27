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
  addTabListeners();
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

function addTabListeners() {
  for (const el of document.getElementsByTagName("tab-tag")) {
    el.addEventListener("click", setTab);
  }
}

function addMenuListeners() {
  HTM.clearButton.addEventListener("click", clearTab);
  // HTM.resetButton.addEventListener("click", resetApp);
  HTM.resetButton.addEventListener("click", app.reset);

  // ## for refresh button + settings menu
  HTM.selectDb.addEventListener("change", setDbShared);
  HTM.selectFontSize.addEventListener("change", changeFont);
  HTM.backupButton.addEventListener("click", backupShow);
  HTM.backupDialog.addEventListener("mouseleave", backupDialogClose);
  // HTM.backupSave.addEventListener("click", backupSave);
  HTM.backupSave2.addEventListener("click", backupSave);
  for (const id of C.backupIDs) {
    document.getElementById(id).addEventListener("click", backupLoad);
  }

  HTM.settingsMenu.addEventListener("mouseenter", dropdown);
  HTM.settingsMenu.addEventListener("mouseleave", dropdown);
  // HTM.helpAll.addEventListener("click", visibleLevelLimitToggle);
  // HTM.helpDetails.addEventListener("toggle", setHelpState);
}

function addHTMLlisteners() {
  HTM.kidsTheme.addEventListener("change", updateKidstheme);
}

function addDetailListeners() {
  HTM.helpAll.addEventListener("click", visibleLevelLimitToggle);
  HTM.help_state.addEventListener("toggle", setHelpState);
  // HTM.level_state.addEventListener("toggle", setLevelState);
  // HTM.repeat_state.addEventListener("toggle", setRepeatState);
}

function addEditingListeners() {
  HTM.workingDiv.addEventListener("paste", normalizePastedText);
  // ## having probs removing his event listener; leave & ignore with updateInputDiv
  // HTM.workingDiv.addEventListener("keyup", debounce(updateInputDiv, 5000));
  // ** "copy" only works from menu; add keydown listener to catch Ctrl_C
  HTM.workingDiv.addEventListener("copy", normalizeTextForClipboard);
  HTM.workingDiv.addEventListener("keydown", catchKeyboardCopyEvent);
  HTM.workingDiv.addEventListener("keyup", updateCursorPos);
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

function backupShow(e) {
  /*
  1) on refresh, swap backup_0 to backup_1
  2) close backup dialog on mouseout
  3) close settings dialog when backup opens
  4) hide backup settings on tab 1

  An html popup is populated with backups stored in local storage;
  The popup is then displayed to the user
  The text in the popups is actually in a button; clicking it populates the InputDiv
  */
  for (const id of C.backupIDs) {
    const backup = document.getElementById(id)
    const lsContent = localStorage.getItem(id);
    let content = (lsContent) ? lsContent.trim() : "";
    if (content) {
      // if (localStorage.getItem("mostRecent") == id) content = "<span class='warning'>Most Recent: </span>" + content;
      if (localStorage.getItem("mostRecent") == id) content = Tag.tag("span", ["class=warning"], ["Most Recent: "]).stringify() + content;
      backup.innerHTML = content;
      backup.disabled = false;
    } else {
      backup.innerHTML = "[empty]";
      backup.disabled = true;
    }
  }
  HTM.backupDialog.style.setProperty("display", "flex");
}

function backupLoad(e) {
  /* Get backup from chosen buffer and replace contents of workingDiv with it
  Buffer contents are then loaded with the old workingDiv content to allow undo*/
  const id = e.target.id;
  const swap = JSON.parse(JSON.stringify(getTextFromWorkingDiv()));
  let restoredContent = localStorage.getItem(id);
  if (!restoredContent) return;
  restoredContent = newlinesToEOLs(restoredContent);
  HTM.workingDiv.innerText = restoredContent;
  forceUpdateInputDiv();
  // if (swap) localStorage.setItem(id, swap);
  // if (swap) appStateSaveItem(id, swap);
  if (swap) app.state.saveItem(id, swap);
  backupDialogClose("backup-dlg");
}


function backupSave() {
  /*
  logic
  on save:
  IF: nothing in div:
    do nothing
  ELSE:
    IF: V.appHasBeenReset AND longterm content != short term content:
      move short_term > long term
      save div > short_term
    ELSE: overwrite short_term with div
  */
  let currentText = getTextFromWorkingDiv();
  if (!currentText) return;
  const [shortTerm, longTerm] = C.backupIDs;
  if (V.appHasBeenReset) {
    const shortTermSavedContent = localStorage.getItem(shortTerm);
    const longTermSavedContent = localStorage.getItem(longTerm);
    if (shortTermSavedContent !== longTermSavedContent) {
      app.state.saveItem(longTerm, shortTermSavedContent);
    }
    V.appHasBeenReset = false;
  }
  if (currentText !== localStorage.getItem(shortTerm)) {
    app.state.saveItem(shortTerm, currentText);
    // HTM.backupSave.innerText = "text saved";
    // HTM.backupSave.classList.add("error");
  }
  // else {
  //   HTM.backupSave.innerText = "already saved";
  //   HTM.backupSave.classList.add("error");
  // }
  // setTimeout(() => {
  //   HTM.backupSave.innerText = "save backup";
  //   HTM.backupSave.classList.remove("error");
  // }, 1000);
  textMarkup();
}


function backupDialogClose(id) {
  if (id.target) id = "backup-dlg";
  document.getElementById(id).style.display = "none";
}

// ######### Tab 1 (look up word)

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
    if (key === "level" && isKids()) continue;
    if (key === "theme" && !isKids()) continue;
    if (key === "awl" && !isBESTEP()) continue;
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
  .lemmaRaw (non regex)
  .db (0=gept, 1=awl, 2=kids) use C.GEPT/BESTEP/Kids
  .level
  .sublist (i.e. awl/gept/both/awl level)
  */
  let lemma = data.term.join().toLowerCase();
  const matchType = C.MATCHES[data.match];
  const searchTerms = {
    lemma: new RegExp(matchType[0] + lemma + matchType[1], "i"),
    raw_lemma: lemma,
    level: (isKids()) ? data.theme : data.level,
    awl: data.awl.map(x => (x < 100) ? x + C.awl_level_offset : x),
    pos: data.pos.join("|")
  };
  return searchTerms;
}

function wordRunSearch(searchTerms) {
  // debug(searchTerms)
  // let results = V.currentDb.db.filter(el => el.lemma.search(searchTerms.lemma) != -1);
  let results = getIdsByPartialLemma(searchTerms.lemma);
  if (isEmpty(results)) {
    const word = searchTerms.raw_lemma;
    let matchedIDarr = checkDerivations(word);
    matchedIDarr.push(lazyCheckAgainstCompounds(word))
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkNegativePrefix(word);
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkAllowedVariants(word);
    if (idSuccessfullyMatched(matchedIDarr)) results = [getEntryById(...matchedIDarr)];
  }
  if (Number.isInteger(searchTerms.level[0])) {
    let tmp_matches = [];
    for (const level of searchTerms.level) {
      for (const entry of results) {
        if (entry.levelGEPT === level) tmp_matches.push(entry);
      }
    }
    results = tmp_matches;
  }
  if (!isEmpty(searchTerms.pos)) {
    results = results.filter(el => el.pos).filter(el => el.pos.search(searchTerms.pos) != -1);
  }
  if (isBESTEP() && !isEmpty(searchTerms?.awl)) {
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
      results = results.filter(el => el.levelStatus === C.GEPT_ONLY);
    }
    else if (searchTerms.awl[0] === C.FIND_AWL_ONLY) {
      results = results.filter(el => el.levelAWL > 0);
    }
    else {
      results = results.filter(el => searchTerms.awl.indexOf(el.levelAWLraw) > -1);
    }
  }
  results = results.filter(result => result.id > 0);
  debug(results)
  return results;
}

function lazyCheckAgainstCompounds(word) {
  const tmpWord = word.replace(/-'\./g, "").split(" ").join("");
  let result = [];
  for (const [compound, id] of Object.entries(V.currentDb.compounds)) {
    if (compound.startsWith(tmpWord)) {
      result.push(id);
      break;
    }
  }
  return result;
}


function highlightAwlWord(levelArr, word) {
  return (isBESTEP() && levelArr[1] >= 0) ? Tag.tag("span", ["class=awl-word"], [word]) : word;
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
    let class2 = (isKids()) ? "level-e" : `level-${level[0]}`;
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
    awl_note = (isBESTEP() && awl_note) ? Tag.tag("span", ["class=awl-note"], ["(headword: ", Tag.tag("span", ["class=awl-headword"], [awl_note, ")"])]) : "";
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

function clearTab1() {
  HTM.form.reset();
  wordSearch();
  refreshLabels("t1_form");
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
    const entry = getEntryById(id);
    const [levelArr, levelClass] = getLevelDetails(entry.levelArr);
    const lemma = buildHTMLlemma(entry, id, word, tokenType);
    const levelTagArr = buildHTMLlevel(entry, id, levelArr, tokenType);
    // const levelTag = tag("div", [], [buildHTMLlevelDot(entry), " ", ...levelTagArr]);
    let levelTag = "";
    if (isKids() && entry.levelGEPT !== 49) levelTag = Tag.tag("div", [], buildHTMLlevelKids(entry));
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
  if (!isKids()) {
    const geptLevel = entry.levelGEPT;
    html = (geptLevel <= 2) ? Tag.tag("span", ["class=dot"], [["E", "I", "H"][geptLevel]]) : "";
  }
  if (isBESTEP() && entry.levelAWL > 0) html = Tag.root(html, ...buildHTMLlevelAWL(entry));
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
    let taggedTokenArr = textdivideIntoTokens(revisedText);
    revisedText = null;
    taggedTokenArr = textLookupCompounds(taggedTokenArr);
    taggedTokenArr = textLookupSimples(taggedTokenArr);
    // debug(taggedTokenArr)
    textBuildHTML(taggedTokenArr);
    backupSave();
    signalRefreshNeeded("off");
    setCursorPos(document.getElementById(CURSOR.id));
  }
}


function textGetLatest() {
  let revisedText = insertCursorPlaceholder(HTM.workingDiv, V.cursorOffsetNoMarks);
  if (revisedText === CURSOR.text) revisedText = "";
  return revisedText;
}

function getTextFromWorkingDiv() {
  let currentText = newlinesToPlaintext(removeTags(HTM.workingDiv)).innerText;
  currentText = EOLsToNewlines(currentText);
  currentText = currentText.trim();
  return currentText;
}

function textDisplay(resultsHTML, repeatsHTML, levelStatsHTML, wordCount) {
  displayDbNameInTab2(getWordCountForDisplay(wordCount));
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
  let taggedTokenArr = tokenize(text);
  return taggedTokenArr;
}

function textBuildHTML(resultsAsTokenArr) {
  const [totalWordCount, separateLemmasCount, levelStats] = getAllLevelStats(resultsAsTokenArr);
  const resultsHTML = buildHTMLtext(resultsAsTokenArr);
  resultsAsTokenArr = null;
  const repeatsHTML = buildHTMLrepeatList(totalWordCount);
  const levelStatsHTML = buildHTMLlevelStats(separateLemmasCount, levelStats);
  textDisplay(resultsHTML, repeatsHTML, levelStatsHTML, totalWordCount);
}


function split(text) {
  text = text.replaceAll(/(A|P)\.(M)\./ig, "$1qqq$2qqq");           // protect preferred A.M. / P.M.
  text = text.replaceAll(/(\d)(a|p\.?m\.?\b)/ig, "$1 $2");          // separate 7pm > 7 pm
  const re = new RegExp("(\\w+)(" + CURSOR.text + ")(\\w+)", "g");  // catch cursor
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
    else if (el.indexOf(CURSOR.simpleText) >= 0) [el, token] = ["", "mc"]; // metacharacter cursor
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
      for (const [compound, id] of Object.entries(V.currentDb.compounds)) {
        if (wordBlob.startsWith(compound)) {
          token.matches.push(id);
          // token.type = "wc";
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
    if (isBESTEP() && level >= 38) {
      awlCount += lemmasAtThisLevel;
      awlEntries++;
    }
  }
  if (isBESTEP() && awlEntries > 1) levelStats.push(buildLevelStat(37, Tag.tag("b", [], ["AWL total"]), awlCount, separateLemmasCount));
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
      const firstID = token.matches[0];
      if (token.count === 0) {
        if (token.type === "wo") {
          [level, awlLevel] = [-1, -1];
        }
        else {
          [level, awlLevel] = getEntryById(firstID).levelArr.slice(0, 2);
        }
        const info = [token.lemma, firstID, level, awlLevel];
        firstAppearanceOfWord.push(info)
      }
      else subsequentAppearances.push([token.lemma, firstID])
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


function textLookupSimples(textArr) {
  // Provide lookups for all non-punctuation tokens + log repetitions
  const expansions = {
    c: "contraction",
    d: "digit",
    y: "symbol",
  };
  V.tallyOfIDreps = {};
  for (let token of textArr) {
    // ** ignore compounds for now; they are dealt with separately
    if (token.type === "w") {
      // const [revisedType, localMatches] = lookupWord(token.lemma, token.type, token.matches);
      const [revisedType, localMatches] = lookupWord(token.lemma);
      if (!isEmpty(localMatches)) {
        token.matches.push(...localMatches);
        token.type = revisedType;
        token.count = updateTallyOfIDreps(token.matches);
      }
    }
    else if (["c", "d", "y"].includes(token.type)) {
      token.matches = [markOfflist(token.lemma, expansions[token.type])];
    }
  }
  return textArr;
}

function updateTallyOfIDreps(idArr) {
  for (const id of idArr) {
    V.tallyOfIDreps[id] = V.tallyOfIDreps[id] + 1 || 0;
  }
  return V.tallyOfIDreps[idArr[0]];
}


function markOfflist(word, offlistType) {
  word = word.trim();
  // ** adds entry to offlistDb & returns ID (always negative number)
  // ** This creates a dummy dB entry for offlist words
  let offlistEntry = [];
  let offlistID;
  let isUnique = true;
  for (const entry of V.offlistDb) {
    if (entry.lemma === word) {
      isUnique = false;
      offlistID = entry.id;
      break;
    }
  }
  if (isUnique) {
    offlistEntry = [word, offlistType, [LOOKUP.offlist_subs.indexOf(offlistType) + LOOKUP.level_headings.length, -1, -1], ""];
    offlistID = addNewEntryToOfflistDb(offlistEntry);
  }
  return offlistID;
}


function addNewEntryToOfflistDb(entry) {
  const offlistID = -(V.offlistIndex);
  V.offlistDb.push(new Entry(...entry, offlistID));
  V.offlistIndex++;
  return offlistID;
}


function lookupWord(word) {
  // const originalWord = word;
  word = word.toLowerCase();
  let type = "w";
  let exactMatches = getIdsByExactLemma(word);
  if (isEmpty(exactMatches)) [word, exactMatches, type] = checkForEnglishSpelling(word, type);
  // debug(word, (type === "wv") ? `(${originalWord})` : "", type, exactMatches)
  let localMatchedIDarr;
  if (isEmpty(exactMatches)) {
    while (true) {
      localMatchedIDarr = checkDerivations(word);
      if (!isEmpty(localMatchedIDarr)) {
        localMatchedIDarr = [type + "d", localMatchedIDarr];  // wd=derived word (e.g. play<played)
        break;
      }
      localMatchedIDarr = checkAllowedVariants(word);
      if (!isEmpty(localMatchedIDarr)) {
        localMatchedIDarr = [type, localMatchedIDarr];  // wv=variant word (e.g. color<colour)
        break;
      }
      // else if (isEmpty(exactMatches)) {
      else {
        localMatchedIDarr = ["wo", [markOfflist(word.toLowerCase(), "offlist")]]; // wo=offlist word
        break;
      }
    }
  }
  else localMatchedIDarr = [type, exactMatches];
  return localMatchedIDarr;
}


function checkForEnglishSpelling(word, type) {
  let exactMatches = checkVariantSpellings(word);
  if (isEmpty(exactMatches)) exactMatches = checkVariantSuffixes(word);
  if (!isEmpty(exactMatches)) {
    word = getEntryById(exactMatches[0]).lemma;
    type += "v";
  }
  return [word, exactMatches, type];
}

function idSuccessfullyMatched(idArr) {
  return idArr.some(id => id > 0);
}

function checkNegativePrefix(word) {
  let matchedIDarr = [];
  const negativePrefixInfo = testForNegativePrefix(word);
  if (negativePrefixInfo) {
    const base = negativePrefixInfo;
    matchedIDarr = getIdsByExactLemma(base);
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkDerivations(base, matchedIDarr);
  }
  return matchedIDarr;
}

function testForNegativePrefix(word) {
  // ** returns undefined (falsey) if no prefix found; else [prefix, base]
  let result;
  if (word.length > 4) {
    const possiblePrefix = word.slice(0, 2);
    if (LOOKUP.prefixes.includes(possiblePrefix)) {
      result = word.slice(2);
    }
  }
  return result;
}



function checkVariantWords(word) {
  let match = "";
  let matchIDarr = []
  for (let key of Object.keys(LOOKUP.variantWords)) {
    const truncated = word.slice(0, key.length)
    const searchTerm = (V.isExactMatch) ? key : key.slice(0, word.length);
    if (searchTerm === truncated) {
      match = LOOKUP.variantWords[key];
      matchIDarr = getIdsByExactLemma(match)
      break;
    }
  }
  return matchIDarr;
}

function checkGenderedNouns(word) {
  let match = "";
  let matchIDarr = []
  for (let key of Object.keys(LOOKUP.gendered_nouns)) {
    const truncated = word.slice(0, key.length)
    const searchTerm = (V.isExactMatch) ? key : key.slice(0, word.length);
    if (searchTerm === truncated) {
      match = LOOKUP.gendered_nouns[key];
      matchIDarr = getIdsByExactLemma(match)
      break;
    }
  }
  return matchIDarr;
}

function checkAbbreviations(word) {
  word = word.replace(".", "");
  let matchIDarr = [];
  if (LOOKUP.abbreviations.hasOwnProperty(word)) {
    const match = LOOKUP.abbreviations[word];
    for (const lemma of match.split(":")) {
      matchIDarr.push(...getIdsByExactLemma(lemma));
    }
  }
  return matchIDarr;
}


function checkVariantSuffixes(word) {
  let localMatches = [];
  let matchIDarr = [];
  if (word.endsWith("s")) word = word.slice(0, -1);
  else if (word.endsWith("d")) word = word.slice(0, -1);
  else if (word.endsWith("ing")) word = word.slice(0, -3);
  if (word.endsWith("e")) word = word.slice(0, -1);
  for (const [variant, replacement] of LOOKUP.variantSuffixes) {
    const len = variant.length;
    const root = word.slice(0, -len);
    const suffix = word.slice(-len);
    if (variant === suffix) {
      localMatches.push(root + replacement);
    }
  }
  if (!isEmpty(localMatches)) {
    for (const match of localMatches) {
      const variant = getIdsByExactLemma(match);
      if (variant) matchIDarr.push(...variant);
    }
  }
  return matchIDarr;
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
  let matchIDarr = [];
  if (LOOKUP.notLetterVariant.includes(word)) return matchIDarr;
  for (const [letters, replacement] of LOOKUP.variantLetters) {
    matchIDarr = replaceLetters(word, letters, replacement);
    if (!isEmpty(matchIDarr)) {
      break;
    }
  }
  return matchIDarr;
}

function replaceLetters(word, letters, replacement) {
  let matchedIDarr = [];
  const re = new RegExp(letters, "gi")
  let found;
  let indices = [];
  while ((found = re.exec(word)) !== null) {
    indices.push(found.index);
  }
  if (!isEmpty(indices)) {
    for (const pos of indices) {
      const variant = word.slice(0, pos) + replacement + word.slice(pos + letters.length)
      matchedIDarr = getIdsByExactLemma(variant);
      if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkDerivations(variant);
      if (idSuccessfullyMatched(matchedIDarr)) break;
    }
  }
  return matchedIDarr;
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
    V.offlistDb[-offlistID] = [offlistID, word, "variant", matchedIDarr, ""];
  }
  return matchedIDarr;
}


function checkDerivations(word, preMatchedIDarr = []) {
  /*
  returns => array of matched ids
  NB. always returns a match, even if it is just "offlist"
  */

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
      checkNegativePrefix,
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
  let result = [];
  if (LOOKUP.personalNames.includes(word)) {
    // result.push(...markOfflist(word, "name"));
    result.push(markOfflist(word, "name"));
  }
  return result;
}

function checkArticle(word) {
  let result = [];
  if (word === "an") {
    // result.push(...getIdsByLemma("a")[0]);
    result.push(...getIdsByExactLemma("a"));
  }
  return result;
}


function checkIrregularNegatives(word) {
  let result = [];
  const lookup = LOOKUP.irregNegVerb[word];
  if (lookup) {
    // result.push(...winnowPoS(getIdsByLemma(lookup), ["x", "v"]));
    result.push(...winnowPoS(getIdsByExactLemma(lookup), ["x", "v"]));
  }
  return result;
}

function checkIrregularVerbs(word) {
  let result = [];
  const lookup = LOOKUP.irregVerb[word];
  if (lookup) {
    result.push(...winnowPoS(getIdsByExactLemma(lookup), ["x", "v"]));
  }
  return result;
}

function checkIrregularPlurals(word) {
  let result = [];
  const lookup = LOOKUP.irregPlural[word];
  if (lookup) {
    // ** words in the lookup are most likely the correct word (and 'others / yourselves' aren't nouns!)
    result.push(...getIdsByExactLemma(lookup));
  }
  return result;
}

function checkForeignPlurals(word) {
  let result = [];
  if (word.length <= 2) return;
  for (const [plural, singular] of LOOKUP.foreign_plurals) {
    const root = word.slice(0, -plural.length);
    const ending = word.slice(-plural.length);
    if (ending === plural) {
      const lookup = getIdsByExactLemma(root + singular);
      if (!isEmpty(lookup)) {
        result.push(...winnowPoS(lookup, ["n"]));
        break;
      }
    }
  }
  return result;
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
  let matches = [];
  for (let el of suffixChecks) {
    const rawMatches = checkForSuffix(word, ...el);
    if (rawMatches.length) matches.push(...rawMatches);
    // debug(word, el[0], !!rawMatches.length, ...rawMatches, rawMatches, matches)
    if (matches.length && el[0] !== "s") break;
    // ** -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
  }
  return matches;
}


function checkForSuffix(word, suffix, lookup, pos) {
  // debug(word, suffix, lookup, pos)
  let result = [];
  if (word.endsWith(suffix)) {
    result.push(...winnowPoS(findBaseForm(word, lookup), pos));
  }
  // debug(">>>>>", result.length, ...result, result)
  return result;
}


function winnowPoS(roughMatches, posArr) {
  // ** Returns possible IDs of derivations as array, or empty array
  let localMatches = [];
  for (const id of roughMatches) {
    const match = getEntryById(id);
    for (const pos of posArr) {
      if (match && match.pos.includes(pos)) {
        localMatches.push(id);
      }
    }
  }
  // debug("???", localMatches.length, ...localMatches, localMatches)
  return localMatches;
}

function getEntryById(id) {
  // ** a negative id signifies an offlist word
  let result;
  if (id !== undefined) {
    let parsedId = parseInt(id);
    const dB = (isInOfflistDb(parsedId)) ? V.offlistDb : V.currentDb.db;
    parsedId = Math.abs(parsedId);
    result = dB[parsedId]
  }
  return result;
}


function buildHTMLtext(tokenArr) {
  let toWrapInHTML = ["w", "wc", "wv", "wo", "wd", "c", "d", "y"];
  // ** word/compound/variant/offlist/derivation, contraction, decimal, y=symbol?
  let htmlString = "";
  let wordIndex = 0;
  for (let token of tokenArr) {
    const firstType = token.type;
    if (firstType === "pe") htmlString += EOL.HTMLtext;
    else if (firstType === "mc") htmlString += CURSOR.HTMLtext;
    else if (!toWrapInHTML.includes(firstType)) htmlString += token.lemma;
    else {
      wordIndex++;
      const groupedWord = buildHTMLword(token, wordIndex);
      htmlString += groupedWord;
    }
  }
  return htmlString;
}

function buildHTMLword(token, wordIndex, matchesIdLevelArr) {
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
  word = insertCursorInHTML(token.length, wordIndex, word);
  const localWord = highlightAwlWord(levelArr, word);
  // ** listOfLinks = id:lemma:type
  let listOfLinksArr = token.matches.map(id => `${id}:${token.lemma.trim()}:${token.type}`);
  let showAsMultiple = "";
  if (sortedByLevel.length > 1) showAsMultiple = (levelsAreIdentical) ? "multi-same" : "multi-diff";
  const classes = [levelClass, relatedWordsClass, duplicateClass, showAsMultiple, variantClass, limit].join(" ");
  const displayWord = Tag.tag("span", [`data-entry=${listOfLinksArr.join(" ")}`, `class=${classes}`, duplicateCountInfo, anchor], [localWord]);
  return displayWord.stringify();
}


function getSortedMatchesInfo(token) {
  let matches = token.matches;
  let idLevelArr = [];   // ** [[0:id, 1:[gept,awl, status], 2:tokenType], ...]]
  for (const id of matches) {
    idLevelArr.push([id, getEntryById(id).levelArr, token.type])
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

function insertCursorInHTML(matchCount, wordIndex, rawWord) {
  if (matchCount === 0) {
    const [word_i, char_i] = V.cursorPosInTextArr;
    if (wordIndex === word_i) {
      rawWord = rawWord.slice(0, char_i) + CURSOR.HTMLtext + rawWord.slice(char_i);
    }
  }
  return rawWord;
}

// function getDuplicateDetails(id, ignoreRepeats, reps) {
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
  if (isKids() && levelGEPT < V.OFFLIST) level = "k";
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
  if (!separateLemmasCount || isKids()) return levelStatsHTML;
  let tmpStats = [];
  for (const [levelID, levelText, total, percent] of levelStats.sort((a, b) => a[0] - b[0])) {
    if (levelID < 3) tmpStats.push(Tag.tag("p", [`class=level-${levelText[0]}`], [levelText, ": ", total, " (", percent, ")"]));
    else if (isBESTEP()) tmpStats.push(Tag.tag("p", ["class=level-a"], [levelText, ": ", total, " (", percent, ")"]));
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

function displayDbNameInTab1() {
  document.getElementById('db_name1').textContent = V.currentDb.name;
}

function displayDbNameInTab2(msg) {
  if (!msg) msg = "";
  HTM.finalLegend.innerHTML = Tag.root("Checking ", Tag.tag("span", ["id=db_name2", "class=dbColor"], [V.currentDb.name]), " ", msg).stringify();
  document.getElementById("help-kids").setAttribute("style", (isKids()) ? "display:list-item;" : "display:none;");
  document.getElementById("help-gept").setAttribute("style", (!isKids()) ? "display:list-item;" : "display:none;");
  document.getElementById("help-awl").setAttribute("style", (isBESTEP()) ? "display:list-item;" : "display:none;");
}

function getIdsByExactLemma(lemma) {
  // ** returns empty array or array of matched IDs [4254, 4255]
  lemma = lemma.toLowerCase();
  const searchResults = V.currentDb.db
    .filter(el => el.lemma.toLowerCase() === lemma)
    .map(el => el.id);
  return searchResults;
}

function getIdsByPartialLemma(lemma) {
  // lemma = lemma.toLowerCase();
  const searchResults = V.currentDb.db
    .filter(el => el.lemma.search(lemma) !== -1)
  return searchResults;
}

function findBaseForm(word, subs) {
  // ** Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
  let localMatches = [];
  for (const [ending, sub] of subs) {
    const root = word.slice(0, -ending.length);
    if ((root + ending) === word) {
      const candidate = root + sub;
      const tmp_match = getIdsByExactLemma(candidate);
      if (!isEmpty(tmp_match)) {
        localMatches.push(...tmp_match);
      }
    }
  }
  return localMatches;
}


function clearTab2() {
  backupSave();
  HTM.workingDiv.innerText = "";
  HTM.finalInfoDiv.innerText = "";
  HTM.repeatsList.innerText = "";
  displayDbNameInTab2();
  V.appHasBeenReset = true;
  // backupReset();
}


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


function convertMarkupToText(el) {
  const re = new RegExp("\s*" + EOL.text + "\s*", "g");
  el = removeTags(el);
  el = newlinesToPlaintext(el);
  const HTMLtoPlainText = el.innerText
    .replace(/\s{2,}/g, " ")
    .replace(re, "\n")
    .replace(/\n\s/g, "\n")
    .replace(/\n{2,}/g, "\n");
  return HTMLtoPlainText;
}


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

function clearTab(event) {
  event.preventDefault();
  if (isFirstTab()) {
    clearTab1();
  } else {
    clearTab2();
  }
  displayInputCursor();
}


function setDbShared(e) {
  let choice = (e.target) ? e.target.value : e;
  app.state.current.db_state = parseInt(choice);
  // V.currentDb = [];
  Entry.resetID();
  if (app.state.current.db_state === C.GEPT) {
    V.currentDb = {
      name: "GEPT",
      db: createDbfromArray(makeGEPTdb()),
      show: [HTM.G_level],
      hide: [HTM.K_theme, HTM.B_AWL],
      css: {
        _light: "#cfe0e8",
        _medium: "#87bdd8",
        _dark: "#3F7FBF",
        _accent: "#daebe8"
      }
    };
  } else if (app.state.current.db_state === C.BESTEP) {
    let tmpDb = makeGEPTdb();
    V.currentDb = {
      name: "BESTEP",
      db: createDbfromArray(tmpDb.concat(makeAWLdb())),
      show: [HTM.G_level, HTM.B_AWL],
      hide: [HTM.K_theme],
      css: {
        _light: "#e1e5bb",
        _medium: "#d6c373",
        _dark: "#3e4820",
        _accent: "#d98284"
      }
    };
  } else {
    V.currentDb = {
      name: "GEPTKids",
      db: createDbfromArray(makeKIDSdb()),
      show: [HTM.K_theme],
      hide: [HTM.G_level, HTM.B_AWL],
      css: {
        _light: "#f9ccac",
        _medium: "#f4a688",
        _dark: "#c1502e",
        _accent: "#fbefcc"
      }
    };
  }
  V.currentDb.compounds = buildCompoundsDb(V.currentDb.db);
  for (const key in V.currentDb.css) {
    const property = (key.startsWith("_")) ? `--${key.slice(1)}` : key;
    HTM.root_css.style.setProperty(property, V.currentDb.css[key]);
  }
  visibleLevelLimitSet();
  setDbTab2();
  setDbTab1();
  app.state.saveItem("db_state", app.state.current.db_state);
}

function createDbfromArray(db) {
  return db.map(entry => new Entry(...entry));
}

function isGEPT() {
  return app.state.current.db_state === C.GEPT;
}

function isBESTEP() {
  return app.state.current.db_state === C.BESTEP;
}

function isKids() {
  return app.state.current.db_state === C.Kids;
}

function isInOfflistDb(idOrEntry) {
  const id = (Number.isInteger(idOrEntry)) ? idOrEntry : idOrEntry.id;
  return id < 0;
}

function lemmaIsInCompoundsDb(lemma) {
  return V.currentDb.compounds[lemma];
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

function buildCompoundsDb(dB) {
  /* ##
  A) goes through currentDb and checks for compounds (words containing spaces / hyphens)
  These are a problem as spaces are used to divide words;
  This function creates a table of items (compounds) to be checked against the text
  before it is divided into words. All compounds are converted into 3 forms:
  1) compoundword, 2) compound word, 3) compound-word

  B) updates database to include isCOMPOUND marker to avoid searching for words twice
  (as compounds and single words)
  */
  let compounds = {};
  for (let entry of dB) {
    const word = entry.lemma.trim().toLowerCase();
    const id = entry.id;
    const splitWord = word.split(/[-'\s\.]/g);
    if (splitWord.length > 1) {
      const newCompound = splitWord.join("");
      compounds[newCompound] = id;
      // ** to catch A.M. and P.M.
      if (/[ap]\.m\./.test(word)) compounds[word] = id;
    }
  }
  return compounds;
}

function setDbTab1() {
  displayDbNameInTab1();
  // ** Allows for multiple elements to be toggled
  for (const el of V.currentDb.show) {
    el.style.setProperty("display", "block");
  }
  for (const el of V.currentDb.hide) {
    el.style.setProperty("display", "none");
  }
  wordSearch();
}

function setDbTab2() {
  displayDbNameInTab2();
  forceUpdateInputDiv();
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

// ## TABS ############################################

function setTab(tab) {
  tab = (tab.currentTarget) ? tab.currentTarget : HTM.tabHead.children[tab];
  let i = 0;
  for (const content of HTM.tabBody.children) {
    if (tab === HTM.tabHead.children[i]) {
      app.state.current.tab_state = i;
      HTM.tabHead.children[i].classList.add("tab-on");
      HTM.tabHead.children[i].classList.remove("tab-off");
      content.style.display = "flex";
    } else {
      HTM.tabHead.children[i].classList.add("tab-off");
      HTM.tabHead.children[i].classList.remove("tab-on");
      content.style.display = "none";
    }
    i++;
  }
  setTabHead();
  app.state.saveItem("tab_state", app.state.current.tab_state);
  forceUpdateInputDiv();
  displayInputCursor();
  V.isExactMatch = !isFirstTab();
}


function setTabHead() {
  let mode = (isFirstTab()) ? "none" : "block";
  HTM.backupButton.style.display = mode;
  // HTM.backupSave.style.display = mode;
}

function isFirstTab() {
  return parseInt(app.state.current.tab_state) === 0;
}

function displayInputCursor() {
  if (isFirstTab()) HTM.inputLemma.focus();
  else HTM.workingDiv.focus();
}


// ## IN-PLACE EDITING CODE######################################
// currently in upgrade.js

// ## CURSOR HANDLING ######################################

function insertCursorPlaceholder(el, index) {
  let plainText = newlinesToPlaintext(removeTags(el)).innerText;
  const updatedText = plainText.slice(0, index) + CURSOR.text + plainText.slice(index);
  return updatedText;
}

function getCursorInfoInEl(element) {
  let preCursorOffset = 0;
  let preCursorOffsetNoMarks = 0;
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
  // const marks = divTextCopy.querySelectorAll(tagName);
  return divTextCopy;
}

function newlinesToPlaintext(divText) {
  // ** Typing 'Enter' creates a <div>
  const divs = divText.querySelectorAll("div");
  for (let el of divs) {
    el.before(` ${EOL.text} `);
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
  el.blur()
  el.focus();
}


function updateCursorPos(e) {
  const keypress = e.key;
  if (!keypress) return;
  if (["Backspace", "Enter"].includes(keypress) || keypress.length === 1) signalRefreshNeeded("on");
  V.oldCursorOffset = V.cursorOffset;
  [
    V.cursorOffset,
    V.cursorOffsetNoMarks,
  ] = getCursorInfoInEl(HTM.workingDiv);
  if (V.refreshRequired) {
    const tags = document.querySelectorAll(":hover");
    const currTag = tags[tags.length - 1];
    if (currTag) currTag.setAttribute("class", "unprocessed");
  }
  getCursorIncrement(keypress)
}

function signalRefreshNeeded(mode) {
  if (mode === "on") {
    V.refreshRequired = true;
    HTM.workingDiv.style.backgroundColor = "ivory";
    HTM.textTabTag.style.fontStyle = "italic";
    HTM.backupSave2.style.display = "block";
  }
  else {
    V.refreshRequired = false;
    HTM.workingDiv.style.backgroundColor = "white";
    HTM.textTabTag.style.fontStyle = "normal";
    HTM.backupSave2.style.display = "none";
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