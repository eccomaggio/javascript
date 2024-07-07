// "use strict";
/*

*/
// ## SETUP ############################################
init();
addListeners();

// TAB1 (words) CODE ## ############################################

// ***** INIT FUNCTIONS

function init() {
  appStateWriteToCurrent();
  setDbShared(V.current.db_state);
  setTab(V.current.tab_state);
  setupEditing();
  HTM.form.reset();
  updateDropdownMenuOptions();
  visibleLevelLimitSet(true);
  setHelpState("fromSaved");
}

function updateDropdownMenuOptions() {
  HTM.selectDb.value = V.current.db_state;
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
  HTM.inputLemma.addEventListener("input", debounce(prepareSearch, 500));
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
  HTM.resetButton.addEventListener("click", resetApp);

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

function isArrayElementInOtherArray(x, y) {
  for (const el of x) {
    if (y.indexOf(el) > -1) return true;
  }
  return false;
}

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
      if (localStorage.getItem("mostRecent") == id) content = "<span class='warning'>Most Recent: </span>" + content;
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
  if (swap) appStateSaveItem(id, swap);
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
      appStateSaveItem(longTerm, shortTermSavedContent);
    }
    V.appHasBeenReset = false;
  }
  if (currentText !== localStorage.getItem(shortTerm)) {
    appStateSaveItem(shortTerm, currentText);
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
  updateInputDiv();
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
    prepareSearch(e_label);
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


function prepareSearch(e) {
  let resultsCount = 0;
  let resultsArr = [];
  let HTMLstringToDisplay = "";
  const data = getFormData(e);
  V.isExactMatch = (data.match[0] === "exact");
  let errorMsg = checkFormData(data);
  if (errorMsg) {
    HTMLstringToDisplay = markStringAsError(errorMsg);
  } else {
    resultsArr = runSearch(data);
    resultsCount = resultsArr.length;
    HTMLstringToDisplay = formatResultsAsHTML(resultsArr);
  }
  displayWordSearchResults(HTMLstringToDisplay, resultsCount);
}

function markStringAsError(str) {
  return `<span class='error'>${str}</span>`;
}

function updateKidstheme(e) {
  const selection = e.target;
  debug(selection.tagName, selection.value)
  selection.dataset.chosen = selection.value;
  prepareSearch();
  // HTM.form.submit();
}

function getFormData(e) {
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

function checkFormData(data) {
  let status = 3;
  /* key for status:
  0 = contains a valid search term outside of "match"
  1 = contains a character other than space/apostrophe/hypen
  2 = contains a non-default match term but no lemma (which match requires)
  3 = contains nothing beyond the default "match=contains"
  */
  for (const el in data) {
    if (el === "match") continue;
    // if (data[el].length) {
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

function runSearch(data) {
  // let term = data.term.join().split(" ")[0].toLowerCase();
  let term = data.term.join().toLowerCase();
  // term.replace(/\s\-\.\'/g, "");
  const matchType = C.MATCHES[data.match];
  const searchTerms = {
    term: new RegExp(matchType[0] + term + matchType[1], "i"),
    raw_term: term,
    // level: (V.isKids) ? data.theme : data.level,
    level: (isKids()) ? data.theme : data.level,
    awl: data.awl.map(x => (x < 100) ? x + C.awl_level_offset : x),
    pos: data.pos.join("|")
  };
  const resultsArr = refineSearch(searchTerms);
  return resultsArr;
}

function refineSearch(find) {
  let results = V.currentDb.db.filter(el => getLemma(el).search(find.term) != -1);
  if (isEmpty(results)) {
    const word = stripOutRegex(find.term);
    let matchedIDarr = checkDerivations(word);
    matchedIDarr.push(lazyCheckAgainstCompounds(word))
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkNegativePrefix(word);
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkAllowedVariants(word);
    if (idSuccessfullyMatched(matchedIDarr)) results = [getEntryById(...matchedIDarr)];
  }
  if (Number.isInteger(find.level[0])) {
    let tmp_matches = [];
    for (const level of find.level) {
      for (const entry of results) {
        if (getLevel(entry)[C.GEPT_LEVEL] === level) tmp_matches.push(entry);
      }
    }
    results = tmp_matches;
  }
  if (!isEmpty(find.pos)) {
    results = results.filter(el => getPoS(el)).filter(el => getPoS(el).search(find.pos) != -1);
  }
  if (isBESTEP() && !isEmpty(find?.awl)) {
    /*
    el[C.LEVEL][2]:
    1-in awl only
    2-in gept only
    3-in gept AND awl

    from search from (awl)
    100 = choose only words in AWL list
    200 = choose only words in GEPT list
    */
    if (find.awl == C.FIND_GEPT_ONLY) {
      results = results.filter(el => getLevel(el)[C.STATUS] >= C.GEPT_ONLY);
    }
    else if (find.awl == C.FIND_AWL_ONLY) {
      results = results.filter(el => getLevel(el)[C.AWL_LEVEL] > -1);
    }
    else {
      results = results.filter(el => find.awl.indexOf(getLevel(el)[C.AWL_LEVEL]) > -1);
    }
  }
  results = results.filter(result => getId(result) > 0);
  return results;
}

function lazyCheckAgainstCompounds(word) {
  const tmpWord = word.replace(/-'\./g, "").split(" ").join("");
  let result = [];
  for (const [compound, id] of Object.entries(V.currentDb.compounds)) {
    if (tmpWord === compound.slice(0, tmpWord.length)) {
      result.push(id);
      break;
    }
  }
  return result;
}

function stripOutRegex(term) {
  // **# retrieve non-regex form of search term
  let raw_term = term.toString().slice(1, -2);
  for (const char of "^:.*$/") {
    raw_term = raw_term.replace(char, "");
  }
  return raw_term;
}

function getDerivedForms(term) {
  const raw_term = stripOutRegex(term);
  let matches = [];
  matches = checkDerivations(raw_term);
  return matches;
}

function getAwlSublist(level_arr) {
  return (isBESTEP() && level_arr[1]) ? level_arr[1] - C.awl_level_offset : -1;
}

function highlightAwlWord(level_arr, word) {
  return (isBESTEP() && level_arr[1] >= 0) ? `<span class="awl-word">${word}</span>` : word;
}

function formatResultsAsHTML(results) {
  if (isEmpty(results)) {
    return "<span class='warning'><b>Search returned no results.</b></span>"
  }
  let output = "";
  let previousInitial = "";
  let currentInitial = "";
  let i = 0;
  for (const entry of results.sort(compareByLemma)) {
    currentInitial = (getLemma(entry)) ? getLemma(entry)[0].toLowerCase() : "";
    if (currentInitial !== previousInitial) {
      output += formatResultsAsTablerows(currentInitial.toLocaleUpperCase(), "", "black", "");
    }
    const level_arr = getLevel(entry);
    const awl_sublist = getAwlSublist(level_arr);
    const awlWord = highlightAwlWord(level_arr, getLemma(entry));
    const lemma = `<strong>${awlWord}</strong>`;
    const pos = `[${getExpandedPoS(entry)}]`;
    let level = V.level_subs[level_arr[0]];
    if (awl_sublist >= 0) level += `; AWL${awl_sublist}`;
    if (!level) continue;
    let [note, awl_note] = getNotes(entry);
    const col2 = `${lemma} <span class="show-pos">${pos}</span> <span class="show-level">${level}</span>${note}${awl_note}`;
    let class2 = (isKids()) ? "level-e" : `level-${level[0]}`;
    output += formatResultsAsTablerows(`${i + 1}`, col2, "", class2);
    previousInitial = currentInitial;
    i++;
  }
  return "<table>" + output + "</table>";
}

function getId(entry) {
  return entry[0];

}

function getLemma(entry) {
  return entry[1];
}

function getPoS(entry) {
  return entry[2];
}

function getLevel(entry) {
  return entry[3];
}

function getNotes(entry) {
  let note = "";
  let awl_note = "";
  if (entry) {
    [note, awl_note] = entry[4].trim().split(C.NOTE_SEP);
    note = note ? `, ${note}` : "";
    awl_note = (isBESTEP() && awl_note) ? ` <span class="awl-note">(headword: <span class="awl-headword">${awl_note}</span>)</span>` : "";
  }
  return [note, awl_note];
}

function isCompound(entryOrID) {
  const result = (Array.isArray(entryOrID)) ? entryOrID?.[5] : getEntryById(entryOrID)?.[5];
  return result;
}
function formatResultsAsTablerows(col1, col2, class1, class2, row) {
  class1 = (class1) ? ` class="${class1}"` : "";
  class2 = (class2) ? ` class="${class2}"` : "";
  row = (row) ? ` class="${row}"` : "";
  return (`<tr${row}><td${class1}>${col1}</td><td${class2}>${col2}</td></tr>\n`)
}

function displayWordSearchResults(resultsAsHtmlString, resultCount = 0) {
  let text = LOOKUP.legends.results;
  if (resultCount) text += ` (${resultCount})`;
  HTM.resultsLegend.innerHTML = text;
  HTM.resultsText.innerHTML = resultsAsHtmlString;
}

function clearTab1() {
  HTM.form.reset();
  prepareSearch();
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
  debug(refs)
  let html = "";
  for (const ref of refs.split(" ")) {
    const [id, word, tokenType] = ref.split(":");
    const entry = getEntryById(id);
    const [levelArr, levelClass] = getLevelDetails(entry);
    const lemma = buildHTMLlemma(entry, id, word, tokenType);
    let level = buildHTMLlevel(entry, id, levelArr, tokenType);
    if (level) {
      const levelDot = buildHTMLlevelDot(entry);
      level = `<div>${levelDot} ${level}</div>`;
    }
    const pos = `[${getExpandedPoS(entry)}]`;
    let [notes, awl_notes] = getNotes(entry);
    notes = notes.split(";").filter(el => !!el.trim()).join(";");
    html += `<div class="word-detail ${levelClass}">${level}<span>${lemma}${pos}${notes}${awl_notes}</span></div>`;
  }
  return html;
}


function buildHTMLlemma(entry, id, word, tokenType) {
  const lemma = getLemma(entry);
  let displayLemma = "";
  if (getPoS(entry) === "unknown") return displayLemma;
  if (tokenType === "wv") {
    displayLemma = `<em>** Use</em> <strong>${lemma}</strong> <em>instead of</em><br>"${word}" `;
  } else if (tokenType === "wd") {
    displayLemma = `<strong>${word}</strong> &lt; "${lemma}"`;
  } else {
    displayLemma = `<strong>${lemma}</strong>: `;
  }
  return displayLemma;
}

function buildHTMLlevel(entry, id, level_arr, tokenType) {
  let level;
  // ** If word is offlist, use its classification (digit/name, etc.) as level
  if (tokenType !== "wv" && isInOfflistDb(id)) {
    level = getPoS(entry);
  }
  else if (["d", "y", "c", "wo"].includes(tokenType)) level = "";
  else {
    level = V.level_subs[level_arr[0]];
    if (getAwlSublist(level_arr) >= 0) {
      level += `; ${V.level_subs[level_arr[1]]}`;
    }
  }
  if (level) level = `<em>${level}</em><br>`;
  return level;
}

function buildHTMLlevelDot(entry) {
  let html = "";
  if (!isKids()) {
    const levelNum = getLevelNum(entry);
    html = (levelNum <= 2) ? `<span class="dot">${["E", "I", "H"][levelNum]}</span>` : "";
  }
  return html;
}

function getExpandedPoS(entry) {
  const pos_str = getPoS(entry);
  if (isInOfflistDb(entry)) return pos_str;
  const pos = (pos_str) ? pos_str.split("").map(el => LOOKUP.pos_expansions[el]).join(", ") : "";
  return pos;
}

// ** if text is pasted in, this is where processing starts
function normalizePastedText(e) {
  // ** preventDefault needed to prevent cursor resetting to start of div at every paste
  e.preventDefault();
  let paste = (e.clipboardData || window.clipboardData).getData('text');
  const selection = window.getSelection();
  selection.getRangeAt(0).insertNode(document.createTextNode(paste));
  // V.refreshRequired = true;
  signalRefreshNeeded("on");
  updateInputDiv(e);
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


// function updateInputDiv(e) {
//   if (!V.refreshRequired) return;
//   signalRefreshNeeded("off");
//   let revisedText = getRevisedText().trim();
//   if (revisedText === CURSOR.text) revisedText = "";
//   // debug(revisedText, !!revisedText, revisedText === CURSOR.text)
//   if (revisedText) {
//     // signalRefreshNeeded("off");
//     V.isExactMatch = true;
//     V.setOfLemmaID = new Set();
//     const [
//       resultsHTML,
//       repeatsHTML,
//       levelStatsHTML,
//       wordCount
//     ] = processText(revisedText);
//     displayProcessedText(resultsHTML, repeatsHTML, levelStatsHTML, wordCount);
//     HTM.finalInfoDiv.innerText = "";
//     backupSave();
//   signalRefreshNeeded("off");
//     setCursorPos(document.getElementById(CURSOR.id));
//   }
// }


function updateInputDiv(e) {
  if (!V.refreshRequired) return;
  signalRefreshNeeded("off");
  let revisedText = getRevisedText().trim();
  if (revisedText === CURSOR.text) revisedText = "";
  if (revisedText) {
    V.isExactMatch = true;
    V.setOfLemmaID = new Set();
    const resultsAsTextArr = lookups(revisedText);
    debug(resultsAsTextArr)
    revisedText = null;
    const [
      resultsHTML,
      repeatsHTML,
      levelStatsHTML,
      wordCount
    ] = buildHTML(resultsAsTextArr);
    displayProcessedText(resultsHTML, repeatsHTML, levelStatsHTML, wordCount);
    backupSave();
    signalRefreshNeeded("off");
    setCursorPos(document.getElementById(CURSOR.id));
  }
}
function getRevisedText() {
  let revisedText = insertCursorPlaceholder(HTM.workingDiv, V.cursorOffsetNoMarks);
  return revisedText;
}

function getTextFromWorkingDiv() {
  let currentText = newlinesToPlaintext(removeTags(HTM.workingDiv)).innerText;
  currentText = EOLsToNewlines(currentText);
  currentText = currentText.trim();
  return currentText;
}

function displayProcessedText(resultsHTML, repeatsHTML, levelStatsHTML, wordCount) {
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


function lookups(rawText) {
  signalRefreshNeeded("off");
  if (typeof rawText === "object") return;
  let text;
  text = normalizeRawText(rawText);
  text = chunkText(text);
  text = lookupCompoundWords(text);
  let resultsAsTextArr = lookupAllWords(text);
  return resultsAsTextArr;
}

function buildHTML(resultsAsTextArr) {
  const [totalWordCount, separateLemmasCount, levelStats] = getAllLevelStats(resultsAsTextArr);
  const resultsHTML = buildHTMLtext(resultsAsTextArr);
  resultsAsTextArr = "";
  const repeatsHTML = buildHTMLrepeatList(totalWordCount);
  const levelStatsHTML = buildHTMLlevelStats(separateLemmasCount, levelStats);
  return [resultsHTML, repeatsHTML, levelStatsHTML, totalWordCount];
}


function chunkText(text) {
  let textArr = split(text);
  textArr = tokenize(textArr);
  return textArr;
}

function split(text) {
  text = text.replaceAll(/(A|P)\.(M)\./ig, "$1qqq$2qqq");           // protect preferred A.M. / P.M.
  text = text.replaceAll(/(\d)(a|p\.?m\.?\b)/ig, "$1 $2");          // separate 7pm > 7 pm
  const re = new RegExp("(\\w+)(" + CURSOR.text + ")(\\w+)", "g");  // catch cursor
  text = text.replaceAll(re, "$1$3$2");                             // move cursor to end of word (to preserve word for lookup)
  text = text.replaceAll("\n",EOL.text);                            // catch newlines
  text = text.replaceAll(/([#\$£]\d)/g, "___$1");                   // ensure currency symbols stay with number
  text = text.trim();
  return text.split(/\___|\b/);                                     // use triple underscore as extra breakpoint
}


function tokenize(textArr) {
  textArr = tokenize1(textArr);   // identify main tokens
  textArr = tokenize2(textArr);   // confirm identification + prepare for grouping
  textArr = tokenize3(textArr);   // fine-tune position of splits
  textArr = tokenize4(textArr);   // split into phrases (preparing for compound identification)
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
    // else if (el.indexOf("<") >= 0) [el, token] = [el.replaceAll("<", "&lt;")];
    // else if (el.indexOf(">") >= 0) [el, token] = [el.replaceAll(">", "&gt;")];
    else if (el === ".") token = "@";                // punctuation digit (i.e. occurs in digits)
    else if (el === ",") token = "@";
    else if (/["',./?!()[\]]/.test(el)) token = "p";                // punctuation
    else if (el.indexOf("qqq") >= 0) [el, token] = [el.replaceAll("qqq", "."), "w"];
    else if (el.indexOf(EOL.simpleText) >= 0) [el, token] = ["", "me"];    // metacharacter newline
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

  let tmpArr = [];
  let acc = [];
  for (let el of textArr) {
    if (el[CMD] === "-") continue;
    const accumulatorEmpty = !!acc.length;
    const combineWithNext = !!el[CMD];
    if (combineWithNext) {
      if (accumulatorEmpty) acc = [acc[TOKEN] + el[TOKEN], el[newTYPE]];
      else acc = [el[TOKEN], el[newTYPE]];
    }
    else {
      if (accumulatorEmpty) {
        acc = [acc[TOKEN] + el[TOKEN], acc[TYPE]];
        tmpArr.push(acc);
        acc = [];
      }
      else tmpArr.push([el[TOKEN], el[TYPE]]);
    }
  }
  return tmpArr;
}


function tokenize4(textArr) {
  // Pass 4: Mark punctuation-delimited chunks
  const TOKEN = 0;    // word or punctuation
  const TYPE = 1;     // w (word), s (space/hypen), d (digit), p (punctuation mark)
  const inPhraseTypes = "wsc";

  let tmpArr = [];
  let chunk = [];
  let prevWasInPhrase, currIsInPhrase;
  for (let el of textArr) {
    currIsInPhrase = inPhraseTypes.includes(el[TYPE]);
    const isStartOfNewPhrase = !prevWasInPhrase && currIsInPhrase;
    if (isStartOfNewPhrase) {
      tmpArr.push(chunk);
      chunk = [];
    }
    chunk.push(el);
    prevWasInPhrase = currIsInPhrase;
  }
  tmpArr.push(chunk);
  // for (let i of tmpArr) debug(i.map(el=>el[TOKEN]).join(""))
  return tmpArr;
}


function lookupCompoundWords(chunks) {
  // ** for each word (token[1]==="w"), search within punctuation-delimited chunk for compound match
  const TOKEN = 0;    // word or punctuation
  const TYPE = 1;     // w (word), s (space/hypen), d (digit), p (punctuation mark)

  let flatArray = [];
  for (const chunk of chunks) {
    for (let word = 0; word <= chunk.length - 1; word++) {
      let match = [];
      if (chunk[word][TYPE].startsWith("w")) {
        let flattenedTail = chunk.slice(word).reduce((acc, entry) => {
          acc.push((entry[TYPE].startsWith("w")) ? entry[TOKEN].toLowerCase() : "");
          return acc;
        }, []).join("");
        for (const compound in V.currentDb.compounds) {
          if (flattenedTail.startsWith(compound)) {
            match = [V.currentDb.compounds[compound]]
            break;
          }
        }
      }
      flatArray.push([...chunk[word], match]);
    }
  }
  return flatArray;
}

function getAllLevelStats(textArr) {
  const firstAppearanceOfWord = [];
  const subsequentAppearances = [];
  for (const entry of textArr) {
    if (entry[1].startsWith("w")) {
      let level;
      let awlLevel;
      const [word, type, idArr, reps] = entry;
      const firstID = idArr[0];
      if (type === "wo") level = -1;
      if (reps === 0) {
        [level, awlLevel] = (firstID > 0) ? getLevel(getEntryById(firstID)).slice(0, 2) : [-1, -1];
        const info = [word, firstID, level, awlLevel];
        firstAppearanceOfWord.push(info)
      }
      else subsequentAppearances.push([word, firstID])
    }
  }
  const separateLemmasCount = firstAppearanceOfWord.length;
  const totalWordCount = separateLemmasCount + subsequentAppearances.length;
  let lemmasBylevel = {};
  for (const [word, id, geptLevel, awlLevel] of firstAppearanceOfWord) {
    // ** NB awl words are also included in the GEPT level counts
    lemmasBylevel[geptLevel] = (lemmasBylevel[geptLevel] || 0) + 1;
    if (awlLevel > -1) lemmasBylevel[awlLevel] = (lemmasBylevel[awlLevel] || 0) + 1;
  }
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
  if (isBESTEP() && awlEntries > 1) levelStats.push(buildLevelStat(37, "<b>AWL total</b>", awlCount, separateLemmasCount));
  return [totalWordCount, separateLemmasCount, levelStats];
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


function lookupAllWords(textArr) {
  // Provide lookups for all non-punctuation tokens + log repetitions
  const expansions = {
    c: "contraction",
    d: "digit",
    y: "symbol",
  };
  let processedTextArr = [];
  V.tallyOfIDreps = {};
  let repeatCount = 0;
  for (let entry of textArr) {
    let [word, type, runningMatchesArr] = entry;
    if (word === EOL.text) {
      processedTextArr.push([word, type]);
    }
    else if (type.startsWith("w")) {
      const [revisedType, localMatches] = lookupWord(word, type, runningMatchesArr);
      if (!isEmpty(localMatches)) {
        type = revisedType;
        runningMatchesArr = localMatches;
      }
      repeatCount = updateTallyOfIDreps(runningMatchesArr);
    }
    else if (["c", "d", "y"].includes(type)) {
      runningMatchesArr = [markOfflist(word, expansions[type])];
    }
    processedTextArr.push([word, type, runningMatchesArr, repeatCount]);
  }
  return processedTextArr;
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
    if (getLemma(entry) === word) {
      isUnique = false;
      offlistID = getId(entry);
      break;
    }
  }
  if (isUnique) {
    offlistEntry = [word, offlistType, [LOOKUP.offlist_subs.indexOf(offlistType) + LOOKUP.level_headings.length], ""];
    offlistID = addNewEntryToOfflistDb(offlistEntry);
  }
  return offlistID;
}


function addNewEntryToOfflistDb(entry) {
  const offlistID = -(V.offlistIndex);
  V.offlistDb.push([offlistID, ...entry]);
  V.offlistIndex++;
  return offlistID;
}


function lookupWord(word, type, matchedCompoundsArr = []) {
  word = word.toLowerCase();
  // ** wd = derived word; wv = variant word; wo = offlist word
  // ** Assumes word is lowercase
  // ** first, account for non-ascii, hyphenated words & contractions (which are listes with apostrophe to disambiguate from abbreviations, e.g. 'm = contraction, m = meter/mile)
  // NEW return [type, matchedArr]: type= w (word), wd (derived word), wv (variant word)
  let localMatchedIDarr;
  localMatchedIDarr = getIdsByLemma(word);
  if (!isEmpty(localMatchedIDarr)) return [type, matchedCompoundsArr.concat(localMatchedIDarr)];
  localMatchedIDarr = checkDerivations(word);
  if (!isEmpty(localMatchedIDarr)) return ["wd", matchedCompoundsArr.concat(localMatchedIDarr)];
  localMatchedIDarr = checkAllowedVariants(word);
  if (!isEmpty(localMatchedIDarr)) return ["wv", matchedCompoundsArr.concat(localMatchedIDarr)];
  if (!isEmpty(matchedCompoundsArr)) return ["wc", matchedCompoundsArr];
  else return ["wo", [markOfflist(word.toLowerCase(), "offlist")]];
}


function idSuccessfullyMatched(idArr) {
  return idArr.some(id => id > 0);
}

function checkNegativePrefix(word) {
  let matchedIDarr = [];
  const negativePrefixInfo = testForNegativePrefix(word);
  if (negativePrefixInfo) {
    const base = negativePrefixInfo;
    matchedIDarr = getIdsByLemma(base);
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


function translateToOfflistDbID(id) {
  if (typeof id === "object") id = id[0];
  return (id < 0) ? -id : id;
}

function checkAllowedVariants(word, offlistID = 0) {
  const shouldUpdateOfflistDb = (offlistID !== 0);
  let matchedIDarr = checkVariantWords(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkVariantSuffixes(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkAbbreviations(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkGenderedNouns(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkVariantSpellings(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkVariantHyphens(word);
  if (!isEmpty(matchedIDarr)) {
    const offlistEntry = [offlistID, word, "variant", matchedIDarr, ""];
    if (shouldUpdateOfflistDb) V.offlistDb[-offlistID] = offlistEntry;
  }
  return matchedIDarr;
}

function checkVariantWords(word) {
  let match = "";
  let matchIDarr = []
  for (let key of Object.keys(LOOKUP.variantWords)) {
    const truncated = word.slice(0, key.length)
    const searchTerm = (V.isExactMatch) ? key : key.slice(0, word.length);
    if (searchTerm === truncated) {
      match = LOOKUP.variantWords[key];
      matchIDarr = getIdsByLemma(match)
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
      matchIDarr = getIdsByLemma(match)
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
      matchIDarr.push(...getIdsByLemma(lemma));
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
      const variant = getIdsByLemma(match);
      if (variant) matchIDarr.push(...variant);
    }
  }
  return matchIDarr;
}


function checkVariantHyphens(word) {
  let matchIDarr = [];
  if (word.length > 4 && word.includes("-")) {
    const deHyphenatedWord = word.replace("-", "");
    matchIDarr = getIdsByLemma(deHyphenatedWord);
    if (!idSuccessfullyMatched(matchIDarr)) matchIDarr = checkDerivations(deHyphenatedWord);
  }
  return matchIDarr;
}

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
      matchedIDarr = getIdsByLemma(variant);
      if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkDerivations(variant);
      if (idSuccessfullyMatched(matchedIDarr)) break;
    }
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
  if (LOOKUP.falseDerivations.includes(word)) {
    return preMatchedIDarr;
  }

  // let localMatches = runChecks(word, matches);

  let localMatches = [];
  for (const guess of [
    checkNames,
    checkArticle,
    checkIrregularNegatives,
    checkIrregularVerbs,
    checkIrregularPlurals,
    checkForeignPlurals,
    checkVing,
    checkVpp,
    checkSuperlatives,
    checkComparatives,
    checkRegularAdverbs,
    checkNegativePrefix,
  ]) {
    const result = guess(word);
    if (result && !isEmpty(result)) {
      localMatches.push(result);
      break;
    }
  }
  // ** -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
  const result = checkFinalS(word);
  if (result) {
    localMatches.push(result);
  }
  if (!localMatches || isEmpty(localMatches)) {
    return preMatchedIDarr;
  }
  preMatchedIDarr.push(...localMatches);
  return dedupeSimpleArray(preMatchedIDarr);
}


function dedupeSimpleArray(arr) {
  if (typeof arr !== "object") arr = [arr];
  return [...new Set(arr)];
}


function checkNames(word) {
  let result;
  if (LOOKUP.personalNames.includes(word)) {
    result = markOfflist(word, "name");
  }
  return result;
}

function checkArticle(word) {
  let result;
  if (word === "an") {
    result = getIdsByLemma("a")[0];
  }
  return result;
}


function checkIrregularNegatives(word) {
  let result;
  const lookup = LOOKUP.irregNegVerb[word];
  if (lookup) {
    result = winnowPoS(getIdsByLemma(lookup), ["x", "v"])[0];
  }
  return result;
}

function checkIrregularVerbs(word) {
  let result;
  const lookup = LOOKUP.irregVerb[word];
  if (lookup) {
    result = winnowPoS(getIdsByLemma(lookup), ["x", "v"])[0];
  }
  return result;
}

function checkIrregularPlurals(word) {
  let result;
  const lookup = LOOKUP.irregPlural[word];
  if (lookup) {
    // ** words in the lookup are most likely the correct word (and 'others / yourselves' aren't nouns!)
    result = getIdsByLemma(lookup);
  }
  return result;
}

function checkForeignPlurals(word) {
  let result;
  if (word.length <= 2) return;
  for (const [plural, singular] of LOOKUP.foreign_plurals) {
    const root = word.slice(0, -plural.length);
    const ending = word.slice(-plural.length);
    if (ending === plural) {
      const lookup = getIdsByLemma(root + singular);
      if (!isEmpty(lookup)) {
        result = winnowPoS(lookup, ["n"])[0];
        break;
      }
    }
  }
  return result;
}

function checkVing(word) {
  let result;
  if (word.endsWith("ing")) {
    result = winnowPoS(findBaseForm(word, LOOKUP.ing_subs), ["v"])[0];
  }
  return result;
}

function checkVpp(word) {
  let result;
  if (word.endsWith("ed")) {
    result = winnowPoS(findBaseForm(word, LOOKUP.ed_subs), ["v"])[0];
  }
  return result;
}

function checkSuperlatives(word) {
  let result;
  if (word.endsWith("st")) {
    result = winnowPoS(findBaseForm(word, LOOKUP.est_subs), ["j"])[0];
  }
  return result;
}

function checkComparatives(word) {
  let result;
  if (word.endsWith("r")) {
    result = winnowPoS(findBaseForm(word, LOOKUP.er_subs), ["j"])[0];
  }
  return result;
}

function checkFinalS(word) {
  let result;
  if (word.endsWith("s")) {
    // ** DISREGARD: pronouns ("r") included to allow 'others' (allows 'thems'!!)
    result = winnowPoS(findBaseForm(word, LOOKUP.s_subs), ["n", "v"])[0];
  }
  return result;
}

function checkRegularAdverbs(word) {
  let result;
  if (word.endsWith("ly")) {
    result = winnowPoS(findBaseForm(word, LOOKUP.ly_subs), ["j"])[0];
  }
  return result;
}


function winnowPoS(roughMatches, posArr) {
  // ** Returns possible IDs of derivations as array, or empty array
  let localMatches = [];
  for (const id of roughMatches) {
    const match = getEntryById(id);
    for (const pos of posArr) {
      if (match && getPoS(match).includes(pos)) {
        localMatches.push(id);
      }
    }
  }
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

function buildHTMLtext(textArr) {
  let htmlString = "";
  let wordIndex = 0;
  for (let [word, type, matchIDarr, reps] of textArr) {
    // debug(word, word === "<")
    // word = escapeHTML(word);
    if (type.startsWith("m")) {
      if (type === "me") htmlString += EOL.HTMLtext;
      else htmlString += CURSOR.HTMLtext;
    }
    let toWrapInHTML = ["w", "wc", "wv", "wo", "wd", "c", "d", "y"];
    if (toWrapInHTML.includes(type)) {
      // ** duplicateCount = running total; totalRepeats = total
      let matchCount = 0;
      let lemmaIdLevelArr = [];
      for (let id of matchIDarr) {
        let match = getEntryById(id);
        // lemmaIdLevelArr.push([word, id, getLevelNum(match)]);
        lemmaIdLevelArr.push([escapeHTML(word), id, getLevelNum(match)]);
        matchCount++;
      }
      wordIndex++;
      const groupedWord = buildHTMLword(lemmaIdLevelArr, wordIndex, type, reps);
      htmlString += groupedWord;
    }
    else htmlString += word;
  }
  return htmlString;
}

// function escapeHTML(word) {
//   // word = word.replaceAll("<", "&amp;lt;");
//   // word = word.replaceAll(">", "&amp;gt;");
//   word = word.replaceAll("<", "&lt;");
//   word = word.replaceAll(">", "&gt;");
//   // if (word === "<") word = "&lt;";
//   // else if (word === ">") word = "&gt;";
//   return word;
// }

// function doubleEscapeHTML(word) {
//   word = word.replaceAll("<", "&amp;lt;");
//   word = word.replaceAll(">", "&amp;gt;");
//   // word = word.replaceAll("<", "&lt;");
//   // word = word.replaceAll(">", "&gt;");
//   // if (word === "<") word = "&lt;";
//   // else if (word === ">") word = "&gt;";
//   return word;
// }

function buildHTMLword(lemmaIdLevelArr, wordIndex, type, reps) {
  let word = lemmaIdLevelArr[0][0];
  const [
    sortedByLevel,
    levelsAreIdentical
  ] = getSortedMatchesInfo(lemmaIdLevelArr);
  const [
    firstLemma,
    firstID,
    firstLevel
  ] = sortedByLevel[0];
  const firstMatch = getEntryById(firstID);
  let variantClass = (type === "wv") ? " variant": "";
  // let variantRefLink = "";
  if (type.startsWith("w")) V.setOfLemmaID.add(firstLemma.toLowerCase() + ":" + firstID);
  const ignoreThisRep = LOOKUP.repeatableWords.includes(firstLemma.toLowerCase());
  const [
    levelArr,
    levelClass
  ] = getLevelDetails(firstMatch);
  const limit = (V.levelLimitStr && V.levelLimitActiveClassesArr.includes(levelClass)) ? ` ${C.LEVEL_LIMIT_CLASS}` : "";
  const [
    relatedWordsClass,
    duplicateClass,
    duplicateCountInfo,
    anchor
  ] = getDuplicateDetails(firstID, ignoreThisRep, reps);
  word = insertCursorInHTML(lemmaIdLevelArr.length, wordIndex, word);
  // word = insertCursorInHTML(lemmaIdLevelArr.length, wordIndex, escapeHTMLentities(word));
  // word = insertCursorInHTML(lemmaIdLevelArr.length, wordIndex, escapeHTML(word));
  const localWord = highlightAwlWord(levelArr, word);
  let listOfLinks = lemmaIdLevelArr.map(el => [`${el[1]}:${el[0].trim()}:${type}`]).join(" ");
  // listOfLinks = escapeHTML(listOfLinks);
  // debug(">>", listOfLinks)
  let showAsMultiple = "";
  if (sortedByLevel.length > 1) showAsMultiple = (levelsAreIdentical) ? " multi-same" : " multi-diff";
  const classes = `${levelClass}${relatedWordsClass}${duplicateClass}${showAsMultiple}${variantClass}${limit}`;
  const displayWord = `<span data-entry="${escapeHTML(listOfLinks)}" class="${classes}"${duplicateCountInfo}${anchor}>${localWord}</span>`;
  // const displayWord = `<span data-entry="${listOfLinks}" class="${classes}"${duplicateCountInfo}${anchor}>${localWord}</span>`;
  // debug(listOfLinks, escapeHTML(listOfLinks))
  return displayWord;
}


function getSortedMatchesInfo(lemmaIdLevelArr) {
  let sorted = lemmaIdLevelArr;
  let levelsAreIdentical = true;
  if (lemmaIdLevelArr.length > 1) {
    sorted = lemmaIdLevelArr.sort((a, b) => a[2] - b[2]);
    levelsAreIdentical = sorted.map(el => el[2]).every(level => level === lemmaIdLevelArr[0][2]);
  }
  return [sorted, levelsAreIdentical]
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
      V.current.limit_state = -1;
    } else {
      V.levelLimitStr = level;
      V.levelLimitActiveClassesArr = C.LEVEL_LIMITS.slice(C.LEVEL_LIMITS.indexOf(V.levelLimitStr));
      V.current.limit_state = C.LEVEL_LIMITS.indexOf(level);
      visibleLevelLimitApply(V.levelLimitStr, false);
    }
    appStateSaveItem("limit_state", V.current.limit_state);
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
  // let tmp = [];
  for (const level of classesToChange) {
    const targetElements = document.getElementsByClassName(level);
    // tmp.push(targetElements.length);
    // for (let i = 0; i < targetElements.length; i++) {
    //   if (removeClass) {
    //     targetElements[i].classList.remove(C.LEVEL_LIMIT_CLASS);
    //   } else {
    //     targetElements[i].classList.add(C.LEVEL_LIMIT_CLASS);
    //   }
    // }
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
    V.levelLimitStr = (V.current.limit_state >= 0) ? C.LEVEL_LIMITS[V.current.limit_state] : "";
    V.levelLimitActiveClassesArr = (V.levelLimitStr) ? C.LEVEL_LIMITS.slice(V.current.limit_state) : [];
  }
  if (V.levelLimitStr) {
    visibleLevelLimitApply(V.levelLimitStr, false);
  }
  else {
    visibleLevelLimitApply(C.LEVEL_LIMITS[0])
  }
}

function visibleLevelLimitReset() {
  appStateSaveItem("limit_state", C.DEFAULT_STATE.limit_state);
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
  // const destination = "help_state";
  let el, mode;
  if (e.target) {
    el = e.target;
    mode = "toggle";
  } else {
    el = HTM[destination];
    mode = e;
  }
  if (mode === "toggle") {
    V.current[destination] = (el.hasAttribute("open")) ? 1 : 0;
  }
  else {
    if (mode === "reset") V.current[destination] = C.DEFAULT_STATE[destination];
    if (V.current[destination] && el) el.setAttribute("open", "")
    else if (el) el.removeAttribute("open");
  }
  appStateSaveItem(destination, V.current[destination]);
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

function getDuplicateDetails(id, ignoreRepeats, reps) {
  const totalReps = V.tallyOfIDreps[id];
  let duplicateClass = "";
  let duplicateCountInfo = "";
  let anchor = "";
  const relatedWordsClass = `all_${id}`;
  if (totalReps > 0 && !ignoreRepeats) {
    duplicateClass = " duplicate";
    duplicateCountInfo = ' data-reps="' + totalReps + '"';
    anchor = ` id='${relatedWordsClass}_${reps + 1}'`;
  }
  return [" " + relatedWordsClass, duplicateClass, duplicateCountInfo, anchor];
}


function getLevelDetails(entry) {
  const levelClass = "level-" + getLevelPrefix(entry);
  return [getLevel(entry), levelClass];
}


function getLevelNum(entry) {
  return getLevel(entry)[0];
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

function unEscapeHTML(encodedText) {
  return decodeURIComponent(encodedText);
}


function getLevelPrefix(entry) {
  const levelNum = getLevelNum(entry);
  let level = V.level_subs[levelNum];
  if (isKids() && levelNum < V.OFFLIST) level = "k";
  if (!level) level = "o";
  return level[0];
}


function buildHTMLlevelStats(separateLemmasCount, levelStats) {
  let levelStatsHTMLstr = "";
  if (!separateLemmasCount || isKids()) return levelStatsHTMLstr;
  levelStatsHTMLstr = `<summary class="all-repeats">Level statistics:<em> (${separateLemmasCount} headwords)</em></summary><div class="level-stats-cols">`
  for (const [levelID, levelText, total, percent] of levelStats.sort((a, b) => a[0] - b[0])) {
    if (levelID < 3) levelStatsHTMLstr += `<p class="level-${levelText[0]}">${levelText}: ${total} (${percent})</p>`;
    else if (isBESTEP()) levelStatsHTMLstr += `<p class="level-a">${levelText}: ${total} (${percent})</p>`;
  }
  const toggleOpen = (V.current.level_state) ? " open" : "";
  levelStatsHTMLstr = `<details id="level-details"${toggleOpen}>${levelStatsHTMLstr}</div></details>`;
  return levelStatsHTMLstr;
}


function buildHTMLrepeatList(wordCount) {
  let countAllReps = 0;
  // let countOfRepeatedLemmas = 0;
  let listOfRepeats = "";
  // if (!wordCount) {
  //   V.tallyOfIDreps = {}; // ????? not necessary??
  // } else {
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
        let anchors = "";
        for (let rep = 1; rep <= totalReps + 1; rep++) {
          let display = rep;
          let displayClass = 'class="anchors" ';
          if (rep === 1) {
            display = highlightAwlWord(getLevel(entry), word);
            displayClass = `class="level-${getLevelPrefix(entry)}" `;
          }
          anchors += ` <a href="#" ${displayClass}onclick="jumpToDuplicate('all_${id}_${rep}'); return false;">${display}</a>`;
        }
        listOfRepeats += `<p data-entry="${id}" class='duplicate all_${id} level-${getLevelPrefix(entry)}'>${anchors}</p>`;
      }
    }
    let repeatsHeader;
    const idForEventListener = "repeat-details";
    if (countAllReps > 0) {
      const toggleOpen = (V.current.repeat_state) ? " open" : "";
      repeatsHeader = `<details id="${idForEventListener}"${toggleOpen}><summary id="all_repeats" class="all-repeats">${countAllReps} significant repeated word${(countAllReps === 1) ? "" : "s"}</summary>`;
      listOfRepeats = `${repeatsHeader}<p><em>Click on word / number to jump to that occurrence.</em></p><div id="repeats">${listOfRepeats}</div></details>`;
    } else {
      listOfRepeats = `<p id="${idForEventListener}"><span id="all_repeats" class="all-repeats">There are no significant repeated words.</span></p>`;
    }
  }
  return listOfRepeats
}


function compareByLemma(a, b) {
  const lemmaA = getLemma(getEntryById(a)).toLowerCase();
  const lemmaB = getLemma(getEntryById(b)).toLowerCase();
  if (lemmaA < lemmaB) {
    return -1;
  }
  if (lemmaA > lemmaB) {
    return 1;
  }
  return 0;
}

function getWordCountForDisplay(wordCount) {
  const numOfWords = (wordCount > 0) ? `<span class="text-right dark">(c.${wordCount} word${(pluralNoun(wordCount))}) <a href='#all_repeats' class='medium'>&#x25BC;</a></span>` : "";
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
  HTM.finalLegend.innerHTML = `Checking <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
  document.getElementById("help-kids").setAttribute("style", (isKids()) ? "display:list-item;" : "display:none;");
  document.getElementById("help-gept").setAttribute("style", (!isKids()) ? "display:list-item;" : "display:none;");
  document.getElementById("help-awl").setAttribute("style", (isBESTEP()) ? "display:list-item;" : "display:none;");
}

function getIdsByLemma(word) {
  // ** returns empty array or array of matched IDs [4254, 4255]
  word = word.toLowerCase();
  const searchResults = V.currentDb.db
    .filter(el => getLemma(el).toLowerCase() === word)
    .map(el => getId(el));
  return searchResults;
}

function findBaseForm(word, subs) {
  // ** Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
  let localMatches = [];
  for (const [ending, sub] of subs) {
    const root = word.slice(0, -ending.length);
    if ((root + ending) === word) {
      const candidate = root + sub;
      const tmp_match = getIdsByLemma(candidate);
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

function resetApp() {
  appStateForceDefault();
  clearTab1();
  clearTab2();
  visibleLevelLimitReset();
  setTab(V.current.tab_state);
  setDbShared(V.current.db_state);
  HTM.selectDb.value = V.current.db_state;
  setHelpState("reset");
  visibleLevelLimitReset();
}

function appStateForceDefault() {
  for (const key in C.DEFAULT_STATE) {
    const defaultVal = C.DEFAULT_STATE[key];
    appStateSaveItem(key, defaultVal)
    V.current[key] = defaultVal;
  }
}

function appStateReadFromStorage() {
  let retrieved_items = {};
  for (const key in C.DEFAULT_STATE) {
    const retrieved_item = localStorage.getItem(key);
    retrieved_items[key] = (retrieved_item) ? parseInt(retrieved_item) : C.DEFAULT_STATE[key];
  }
  return retrieved_items;
}

function appStateWriteToCurrent() {
  const retrieved_items = appStateReadFromStorage();
  for (const key in retrieved_items) {
    const value = retrieved_items[key];
    V.current[key] = value;
  }
}

function appStateSaveItem(item, value) {
  localStorage.setItem(item, value);
}


function setDbShared(e) {
  let choice = (e.target) ? e.target.value : e;
  V.current.db_state = parseInt(choice);
  V.currentDb = [];
  if (V.current.db_state === C.GEPT) {
    V.currentDb = {
      name: "GEPT",
      db: indexDb(makeGEPTdb()),
      show: [HTM.G_level],
      hide: [HTM.K_theme, HTM.B_AWL],
      css: {
        _light: "#cfe0e8",
        _medium: "#87bdd8",
        _dark: "#3F7FBF",
        _accent: "#daebe8"
      }
    };
  } else if (V.current.db_state === C.BESTEP) {
    let tmpDb = makeGEPTdb();
    V.currentDb = {
      name: "BESTEP",
      db: indexDb(tmpDb.concat(makeAWLdb())),
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
      db: indexDb(makeKIDSdb()),
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
  setDb_tab2();
  setDbTab1();
  appStateSaveItem("db_state", V.current.db_state);
}

function isGEPT() {
  return V.current.db_state === C.GEPT;
}

function isBESTEP() {
  return V.current.db_state === C.BESTEP;
}

function isKids() {
  return V.current.db_state === C.Kids;
}

function isInOfflistDb(idOrEntry) {
  const id = (Number.isInteger(idOrEntry)) ? idOrEntry : getId(idOrEntry);
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
    const word = getLemma(entry).trim().toLowerCase();
    const id = getId(entry);
    const splitWord = word.split(/[-'\s\.]/g);
    if (splitWord.length > 1) {
      const newCompound = splitWord.join("");
      entry[C.isCOMPOUND] = true;
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
  prepareSearch();
}

function setDb_tab2() {
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
      V.current.tab_state = i;
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
  appStateSaveItem("tab_state", V.current.tab_state);
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
  return parseInt(V.current.tab_state) === 0;
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
    currTag.setAttribute("class", "unprocessed");
  }
  getCursorIncrement(keypress)
}

function signalRefreshNeeded(mode) {
  if (mode === "on") {
    V.refreshRequired = true;
    HTM.workingDiv.style.backgroundColor = "ivory";
    HTM.textTabTag.style.fontStyle = "italic";
    HTM.backupSave2.style.display =  "block";
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
  updateInputDiv();
  // V.refreshRequested = false;
}