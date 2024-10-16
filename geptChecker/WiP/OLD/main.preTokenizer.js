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
  // setLevelState("fromSaved");
  // setRepeatState("fromSaved");
}

function updateDropdownMenuOptions() {
  HTM.selectDb.value = V.current.db_state;
}


function addListeners() {
  addTabListeners();
  addMenuListeners();
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
  // for (const el of document.getElementsByClassName("tab")) {
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
  HTM.backupSave.addEventListener("click", backupSave);
  for (const id of C.backupIDs) {
    document.getElementById(id).addEventListener("click", backupLoad);
  }

  HTM.settingsMenu.addEventListener("mouseenter", dropdown);
  HTM.settingsMenu.addEventListener("mouseleave", dropdown);
  // HTM.helpAll.addEventListener("click", visibleLevelLimitToggle);
  // HTM.helpDetails.addEventListener("toggle", setHelpState);
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
      if (localStorage.getItem("mostRecent") == id) content = "<span class='error'>Most Recent: </span>" + content;
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


// function backupReset() {
//   // ** logic: put current OR most recent change in first backup (2nd backup is constantly updated)
//   let mostRecent = getTextFromWorkingDiv();
//   if (!mostRecent) mostRecent = localStorage.getItem(localStorage.getItem("mostRecent"));
//   if (!mostRecent || !mostRecent.length) return;
//   localStorage.setItem(C.backupIDs[0], mostRecent);
//   localStorage.setItem("mostRecent", C.backupIDs[0]);
//   localStorage.setItem(C.backupIDs[1], "");
// }
// function backupReset() {
//   // ** logic: put current OR most recent change in first backup (2nd backup is constantly updated)
//   let mostRecent = getTextFromWorkingDiv();
//   if (!mostRecent) return;
//   localStorage.getItem()

//   localStorage.getItem(localStorage.getItem("mostRecent"));
//   if (!mostRecent || !mostRecent.length) return;
//   localStorage.setItem(C.backupIDs[0], mostRecent);
//   localStorage.setItem("mostRecent", C.backupIDs[0]);
//   localStorage.setItem(C.backupIDs[1], "");
// }

// function backupSave() {
//   let currentText = getTextFromWorkingDiv();
//   if (!currentText) return;
//   if (currentText !== localStorage.getItem(C.backupIDs[1])) {
//     localStorage.setItem(C.backupIDs[1], currentText);
//     localStorage.setItem("mostRecent", C.backupIDs[1]);
//     HTM.backupSave.innerText = "text saved";
//     HTM.backupSave.classList.add("error");
//   } else {
//     HTM.backupSave.innerText = "already saved";
//     HTM.backupSave.classList.add("error");
//   }
//   setTimeout(() => {
//     HTM.backupSave.innerText = "save backup";
//     HTM.backupSave.classList.remove("error");
//   }, 1000);
// }

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
      // localStorage.setItem(longTerm, shortTermSavedContent);
      appStateSaveItem(longTerm, shortTermSavedContent);
    }
    V.appHasBeenReset = false;
  }
  if (currentText !== localStorage.getItem(shortTerm)) {
    // localStorage.setItem(shortTerm, currentText);
    appStateSaveItem(shortTerm, currentText);
    HTM.backupSave.innerText = "text saved";
    HTM.backupSave.classList.add("error");
  } else {
    HTM.backupSave.innerText = "already saved";
    HTM.backupSave.classList.add("error");
  }
  setTimeout(() => {
    HTM.backupSave.innerText = "save backup";
    HTM.backupSave.classList.remove("error");
  }, 1000);
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
      // data[key].push(value.trim());
    }
    // data[key].push((Number.isInteger(digit)) ? digit : value.trim());
    // if (Number.isInteger(digit)) {
    //   data[key].push(digit);
    // } else if (value.trim()) {
    //   data[key].push(value.trim());
    // }
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
  // if (!results.length) {
  if (isEmpty(results)) {
    const word = stripOutRegex(find.term);
    let matchedIDarr = checkDerivations(word);
    matchedIDarr.push(lazyCheckAgainstCompounds(word))
    // debug(word, lazyCheckAgainstCompounds(word), matchedIDarr)
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkNegativePrefix(word, word);
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkAllowedVariants(word);
    if (idSuccessfullyMatched(matchedIDarr)) results = [getEntryById(...matchedIDarr)];
  }
  if (Number.isInteger(find.level[0])) {
    let tmp_matches = [];
    for (const level of find.level) {
      for (entry of results) {
        if (getLevel(entry)[C.GEPT_LEVEL] === level) tmp_matches.push(entry);
      }
    }
    results = tmp_matches;

  }
  // if (find.pos.length) {
  if (!isEmpty(find.pos)) {
    results = results.filter(el => getPoS(el)).filter(el => getPoS(el).search(find.pos) != -1);
  }
  // if (isBESTEP() && find.awl && find.awl.length) {
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
  tmpWord = word.replace(/-'\./g, "").split(" ").join("");
  // debug(tmpWord)
  let result = [];
  for (const [compound, id] of Object.entries(V.currentDb.compounds)) {
    // debug(tmpWord, compound.slice(0, tmpWord.length), id)
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
  return (isBESTEP() && level_arr[1] > -1) ? `<span class="awl-word">${word}</span>` : word;
}

function formatResultsAsHTML(results) {
  // if (!results.length) {
  if (isEmpty(results)) {
    return "<span class='error'><b>Search returned no results.</b></span>"
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
  // if (entry) return entry[0];
  // return (entry) ? entry[0] : undefined;
  return entry[0];

}

function getLemma(entry) {
  // if (entry) return entry[1];
  // return (entry) ? entry[1] : "";
  return entry[1];
}

function getPoS(entry) {
  // if (entry) return entry[2];
  // return (entry) ? entry[2] : "";
  return entry[2];
}

function getLevel(entry) {
  // if (entry) return entry[3];
  // return (entry) ? entry[3] : [];
  return entry[3];
}

function getNotes(entry) {
  let note = "";
  let awl_note = "";
  if (entry) {
    // let [note, awl_note] = entry[4].trim().split(C.NOTE_SEP);
    [note, awl_note] = entry[4].trim().split(C.NOTE_SEP);
    note = note ? `, ${note}` : "";
    awl_note = (isBESTEP() && awl_note) ? ` <span class="awl-note">(headword: <span class="awl-headword">${awl_note}</span>)</span>` : "";
    // return [note, awl_note]
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
    const relatedWords = classList.filter(name => name.slice(0, 4) === "all_")[0]
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
  // debug(refs)
  /*
  GET LEVEL FROM ID
  getLevelDetails(levelArr)
  */
  let html = "";
  for (const ref of refs.split(" ")) {
    const [id, normalizedWord, variantId] = ref.split(":");
    // const isOfflist = (variantId) ? true : false;
    const isVariant = !!variantId;
    // const entry = (isOfflist) ? getEntryById(variantId) : getEntryById(id);
    const entry = getEntryById(id);
    const word = isVariant ? getLemma(getEntryById(variantId)) : normalizedWord;
    // const [levelArr, levelNum, levelClass] = getLevelDetails(entry);
    const [levelArr, levelClass] = getLevelDetails(entry);
    // const lemma = buildDisplayLemma(entry, id, normalizedWord, variantId, isVariant);
    const lemma = buildDisplayLemma(entry, id, word, variantId, isVariant);
    const level = buildDisplayLevel(entry, id, levelArr, isVariant);
    const pos = `[${getExpandedPoS(entry)}]`;
    let [notes, awl_notes] = getNotes(entry);
    html += `<div class="word-detail ${levelClass}">${level}<br><span>${lemma}${pos}${notes}${awl_notes}</span></div>`;
  }
  return html;
}

function buildDisplayLemma(entry, id, normalizedWord, variantId, isVariant) {
  const lemma = getLemma(entry);
  // debug(normalizedWord, id, lemma, isOfflist, variantId)
  const isInflection = normalizedWord !== lemma.replace("'", "");  // ** to allow for contractions
  // debug(id, entry, normalizedWord, variantId, isInflection)
  let displayLemma = "";
  if (getPoS(entry) === "unknown") return displayLemma;
  if (isVariant) {
    displayLemma = `<em>** Use</em> <strong>${lemma}</strong> <em>instead of</em><br>"${normalizedWord}" `;
  } else if (isInflection) {
    displayLemma = `<strong>${normalizedWord}</strong> &lt; "${lemma}"`;
  } else {
    displayLemma = `<strong>${lemma}</strong>: `;
  }
  return displayLemma;
}

function buildDisplayLevel(entry, id, level_arr, isVariant) {
  let level;
  // ** If word is offlist, use its classification (digit/name, etc.) as level
  // if (!isVariant && id < 0) {
  if (!isVariant && isInOfflistDb(id)) {
    level = getPoS(entry);
  } else {
    level = V.level_subs[level_arr[0]];
    if (getAwlSublist(level_arr) >= 0) {
      level += `; ${V.level_subs[level_arr[1]]}`;
    }
  }
  level = `<em>${level}</em>`;
  return level;
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
  V.refreshRequired = true;
  updateInputDiv(e);
  backupSave();
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


function updateInputDiv(e) {
  if (!V.refreshRequired) return;
  signalRefreshNeeded("off");
  V.isExactMatch = true;
  // debug(Date.now())
  V.tallyOfRepeats = {};
  V.repeats = new Set();
  let revisedText = getRevisedText().trim();
  if (revisedText && revisedText !== CURSOR.text) {
    const [
      resultsHTML,
      repeatsHTML,
      levelStatsHTML,
      wordCount
    ] = processText(revisedText);
    displayProcessedText(resultsHTML, repeatsHTML, levelStatsHTML, wordCount);
    HTM.finalInfoDiv.innerText = "";
    backupSave();
  } else return;
}


function getRevisedText() {
  let revisedText = insertCursorPlaceholder(HTM.workingDiv, V.cursorOffsetNoMarks);
  // debug(JSON.stringify(revisedText))
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
  document.getElementById("level-details").addEventListener("toggle", setLevelState);
  document.getElementById("repeat-details").addEventListener("toggle", setRepeatState);
}

function displayWorkingText(html) {
  HTM.workingDiv.innerHTML = html;
  setCursorPos(document.getElementById(CURSOR.id));
}

function processText(rawText) {
  signalRefreshNeeded("off");
  V.idOfAM = getIdsByLemma("am")[0];
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
  V.tallyOfWordReps = {};
  if (typeof rawText === "object") return;
  const text = normalizeRawText(rawText);
  const chunkedText = splitText(text);
  const flatTextArr = findCompoundsAndFlattenArray(chunkedText);
  // debug(JSON.stringify(flatTextArr))
  // debug(flatTextArr)
  const [resultsAsTextArr, wordCount] = refineLookups(flatTextArr);
  // debug(resultsAsTextArr)
  const [totalWordCount, separateLemmasCount, levelStats] = getLevelStats(resultsAsTextArr);
  const resultsHTML = buildMarkupAsHTML(resultsAsTextArr) + "<span> </span>";
  // const repeatsAsHTML = buildRepeatList(wordCount);
  // return [resultsAsHTML, repeatsAsHTML, wordCount];
  const repeatsHTML = buildRepeatList(totalWordCount);
  const levelStatsHTML = buildLevelStats(separateLemmasCount, levelStats);
  return [resultsHTML, repeatsHTML, levelStatsHTML, totalWordCount];
}


function getLevelStats(textArr) {
  const firstAppearanceOfWord = [];
  const subsequentAppearances = [];
  for (const entry of textArr) {
    const isMetaCharacter = entry.length < 2;
    if (!isMetaCharacter) {
      let type = "";
      const [word, rawWord, [[id, reps]]] = entry;
      if (id < 0) {
        const isNotWord = getOfflistEntry(id)[2] !== "offlist";
        if (isNotWord) continue;
        level = -1;
      }
      if (reps === 1) {
        const [level, awlLevel] = (id > 0) ? getLevel(getEntryById(id)).slice(0,2) : [-1, -1];
        const info = [word, id, level, awlLevel];
        firstAppearanceOfWord.push(info)
      }
      else subsequentAppearances.push([word,id])
    }
  }
  const separateLemmasCount = firstAppearanceOfWord.length;
  // const repetitions = subsequentAppearances.length;
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
    // levelStats.push([level, levelText, lemmasAtThisLevel, Math.round(100 * (lemmasAtThisLevel / separateLemmasCount)) + "%"]);
    levelStats.push(addLevelStat(level, levelText, lemmasAtThisLevel, separateLemmasCount));
    if (isBESTEP() && level >= 38) {
      awlCount += lemmasAtThisLevel;
      awlEntries++;
    }
  }
  if (isBESTEP() && awlEntries > 1) levelStats.push(addLevelStat(37, "<b>AWL total</b>", awlCount, separateLemmasCount));
  // debug(separateLemmas, repetitions, totalWords)
  // debug(firstAppearanceOfWord, subsequentAppearances, lemmasBylevel, levelStats)
  return [totalWordCount, separateLemmasCount, levelStats];
}

function addLevelStat(level, levelText, lemmasAtThisLevel, separateLemmasCount) {
  return [level, levelText, lemmasAtThisLevel, Math.round(100 * (lemmasAtThisLevel / separateLemmasCount)) + "%"];
}

function displayRepeatsList(listOfRepeats, levelStatsHTML) {
  HTM.repeatsList.innerHTML = levelStatsHTML + listOfRepeats;
}

function splitText(rawText) {
  // console.log("split text:", rawText)
  /* To narrow down the hunt for compound words,
  the normalized text is first split into
  independent chunks by punctuation (which compounds can't cross)
  i.e. period, comma, brackets, ? ! (semi-)colons
  then divided on spaces. Creates an array of phrases > words.
      Each word is a sub array:
      1) normalized word
      2) word with caps + punctuation for display
  */
  // ## text format = [processed word for lookup + tagging, raw word for display]
  const raw_chunks = splitTextIntoPhrases(rawText);
  let arrayOfPhrases = [];
  let cursorFound = false;
  let wordToAdd;
  for (const phrase of raw_chunks) {
    let arrayOfWords = [];
    for (let [word_i, word] of phrase.split(/\s+/).entries()) {
      if (word.indexOf(EOL.text) >= 0) {
        wordToAdd = [EOL.text, EOL.HTMLtext];
      } else {
        if (!cursorFound) {
          // # Save position of cursor externally so it can be reinserted after text parsing
          const char_i = word.indexOf(CURSOR.text);
          if (char_i >= 0) {
            V.cursorPosInTextArr = [word_i, char_i];
            word = word.replace(CURSOR.text, "");
            cursorFound = true;
          }
        }
        let normalizedWord = word.replace(C.punctuation, "").toLowerCase();
        wordToAdd = [normalizedWord, word];
      }
      arrayOfWords.push(wordToAdd);
    }
    arrayOfPhrases.push(arrayOfWords);
  }
  return arrayOfPhrases;
}

function normalizeRawText(text) {
  return text
    .replace(/[\u2018\u2019']/g, " '")    // replace curly single quotes
    .replace(/[\u201C\u201D]/g, '"')      // replace curly double  quotes
    .replace(/…/g, "...")
    .replace(/(\r\n|\r|\n)/g, "\n")       // encode EOLs
    .replace(/\n{2,}/g, "\n")
    .replace(/\n/g, ` ${EOL.text} `)      // encode EOLs
    // .replace(/\n{2,}/g, ` ${EOL.text} `)  // encode EOLs
    .replace(/–/g, " -- ")                // pasted in em-dashes
    .replace(/—/g, " - ")
    .replace(/(\w)\/(\w)/g, "$1 / $2")    // insert spaces either side of slash
    .replace(/\s{2,}/gm, " ");            //
}

function splitTextIntoPhrases(text) {
  const tmp = text;
  // ** used ^^ as replacement markers to keep separate from @EOL@, @CSR@ etc.
  text = text.trim();
  text = text.replace(/\.{3}/g, "___"); // ** to protect ellipses (...)
  text = text.replace(/(p|a)\.(m)\./gi, "$1_$2_.");  // ** to protect wordlist version of A.M / P.M.
  // ** separate out digits
  // ** should catch any of: 10, 99%, 10.5, 6,001, 99.5%, 42.1%, $14.95, 20p, 2,000.50th, years etc.
  text = text.replace(/(\b\d{4}s?\b|([$£€¥₹]?((\d{1,3}(,\d{3})*(\.\d+)?)|\d+)([%¢c]|st|nd|rd|th)?))/g, "^^$1^^");
  // ** break at punctuation (include with digit)
  // text = text.replace(/(\^\^|[^\d][.\,;():?!])\s*/gi, "$1^^");
  text = text.replace(/(\^\^|[^\d][.\,;():?!])\s*/gi, "$1^^");
  // text = text.replace(/(\^\^)\s*/gi, "$1^^");
  // text = text.replace(/([^\d][.,;():?!"']+)\s*/gi, "$1^^");
  // text = text.replace(/([^\s][.,;():?!"']+\w)\s*/gi, "^^$1");
  text = text.replace(/\^{4,}/g, "^^");
  text = text.replace(/_\./g, "_"); // ** also to protect wordlist version of A.M. / P.M.
  text = text.split(/\s?\^\^\s?/);
  text = text.filter(el => el !== '');
  return text;
}

function findCompoundsAndFlattenArray(chunks) {
  let flatArray = [];
  for (const chunk of chunks) {
    /* for each word, checks normalized words to end of chunk in search of compound match
    then adds this as a match
    "tail" is the sequence of words in a chunk (punctuation delimited block) as an array.
    The function iterates through it, removing the first word each time
    */
    for (let word_i = 0; word_i <= chunk.length - 1; word_i++) {
      let tail = [];
      for (let j = word_i; j < chunk.length; j++) {
        tail.push(chunk[j][0])
      }
      let matches = [];
      const flattenedTail = tail.join("").replace(/-/g, "");
      for (const compound in V.currentDb.compounds) {
        if (flattenedTail.startsWith(compound)) {
          const id = V.currentDb.compounds[compound];
          // ** This cludge is to stop 'a.m.' matching with anything that begins 'am...'
          const isValidMatch = (compound.length === 2) ?  flattenedTail.length === 2 : true;
          // debug("^^", compound, flattenedTail, isValidMatch, V.isExactMatch)
          if (isValidMatch) {
            matches.push(id);
            break;
          }
          //   matches.push(id);
          // // ** Restore this compound needs to be corrected in-place
          // // const correctedCompound = normalizeCompounds(id, tail, chunk, word_i);
          // // chunk[word_i][1] = correctedCompound;
          //   break;
        }
      }
      chunk[word_i].push(matches);
    }
    // ** required so that all wordArrs have matches ready for the next stage
    chunk[chunk.length - 1].push([]);
    flatArray.push(...chunk);
  }
  return flatArray;
}

function normalizeCompounds(id, tail, chunk, word_i) {
  // ** replaces the current compound with the 'correct' wordlist version, preserving initial capitalization & surrounding punctuation
  // ** Currently not used as decided to clearly show form should be changed
  const wordlistLemma = getLemma(V.currentDb.db[id]);
  const rawCompound = chunk[word_i][1];
  const prefix = (rawCompound[0].match(C.punctuation_lite)) ? rawCompound[0] : "";
  const initial = (prefix.length) ? rawCompound.slice(0, 1) : rawCompound[0];
  const suffix = (rawCompound.slice(-1).match(C.punctuation_lite)) ? rawCompound.slice(-1) : "";
  const correctedCompound = tmpWord = initial + wordlistLemma.slice(1, wordlistLemma.length);
  // debug(correctedCompound, tail[0], wordlistLemma, ...chunk[word_i])
  return correctedCompound;
}


function pushMatch(matches, id) {
  matches.push([id, updateWordStats(id)]);
  return matches;
}

function refineLookups(textArr) {
  /* textArr = array of [ [normalized, rawWord, [match id to compound words]], ...]
  return => processedTextArr, array of [normalized-word, raw-word, [[matched-ID, duplicate-count], ...]]
    Words are counted + line breaks dealt with
    Normalized word sent to be checked against wordlist / variants, etc. in lookupWord()
    WordStats records the number of times a word is repeated: {word-id: count}
  */
  let processedTextArr = [];
  let wordCount = 0;
  for (let [word, rawWord, matchedCompoundsArr] of textArr) {
    rawWord = rawWord.replace(/_/g, ".");  // ** preserve wordlist rendering of A.M. / P.M.
    let secondPassMatchedIDs = [];
    // if (!word) continue;
    if (!word) {
      // debug(word, rawWord, matchedCompoundsArr)
      // processedTextArr.push([rawWord]);
    }
    if (word === EOL.text) {
      processedTextArr.push([word]);
    }
    else {
      wordCount++;
      for (const id of lookupWord(word, rawWord, matchedCompoundsArr)) {
        if (!id) continue;
        // ** by this point, the type of all words in offlistDb have been recorded there
        // ** pure & inflected lemmas are clear by being in currentDb.db
        // ** compounds have been merged seamlessly into single-word matches
        if (word === "i" && rawWord.includes("I")) word = "I";
        const compoundAlreadyMatched = (matchedCompoundsArr.length && isInOfflistDb(id));
        const isNotBeVerb = (id === V.idOfAM && rawWord.toLowerCase().includes(".m."));
        // debug(word, rawWord, id, ...matchedCompoundsArr)
        if (compoundAlreadyMatched) continue;
        if (isNotBeVerb) continue;
        const matchedEntry = getEntryById(id);
        if (getPoS(matchedEntry) === "contraction") wordCount--;
        secondPassMatchedIDs = pushMatch(secondPassMatchedIDs, id);
        // debug(word, rawWord, id, ...secondPassMatchedIDs, (id === V.idOfAM && rawWord.toLowerCase().includes(".m.")))
      }
      processedTextArr.push([word, rawWord, secondPassMatchedIDs]);
    }
  }
  // ** precessedTextArr = [word, rawWord, [ [id, no. of reps], ...]]
  return [processedTextArr, wordCount];
}


function updateWordStats(id) {
  if (!V.tallyOfWordReps[id]) {
    V.tallyOfWordReps[id] = 1;
  } else if (!["contraction", "unknown", "digit"].includes(getPoS(getEntryById(id)))) {
    V.tallyOfWordReps[id]++;
  }
  return V.tallyOfWordReps[id];
}

function markOfflist(word, type) {
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
    offlistEntry = [word, type, [LOOKUP.offlist_subs.indexOf(type) + LOOKUP.level_headings.length], ""];
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


function lookupWord(word, rawWord, matchedCompoundsArr) {
  // ** first, account for non-ascii, hyphenated words & contractions (which are listes with apostrophe to disambiguate from abbreviations, e.g. 'm = contraction, m = meter/mile)
  if (LOOKUP.symbols.includes(rawWord)) word = rawWord;
  else word = word.replace("-", "");
  let localMatchedIDarr;
  [localMatchedIDarr, word] = checkContractions(word, rawWord);
  if (isEmpty(localMatchedIDarr)) {
    localMatchedIDarr = getIdsByLemma(word);
    localMatchedIDarr = checkDerivations(word, localMatchedIDarr);
    // debug(JSON.stringify(localMatchedIDarr), word, matchedCompoundsArr)
    if (isEmpty(localMatchedIDarr)) localMatchedIDarr = checkNegativePrefix(word, rawWord);
    if (isEmpty(localMatchedIDarr) && isEmpty(matchedCompoundsArr)) {
      // localMatchedIDarr = [markOfflist(rawWord, "offlist")];
      localMatchedIDarr = [markOfflist(word, "offlist")];
      const offlistID = parseInt(localMatchedIDarr[0]);
      checkAllowedVariants(word, rawWord, offlistID);
    }
  }
  localMatchedIDarr = matchedCompoundsArr.concat(localMatchedIDarr);
  return localMatchedIDarr;
}

function idSuccessfullyMatched(idArr) {
  return idArr.some(id => id > 0);
}

function checkNegativePrefix(word, rawWord) {
  let matchedIDarr = [];
  const negativePrefixInfo = testForNegativePrefix(word);
  // debug(word,"derivations pass", matchedIDarr, isNoMatch, negativePrefixInfo)
  if (negativePrefixInfo) {
    const base = negativePrefixInfo;
    matchedIDarr = getIdsByLemma(base);
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkDerivations(base, matchedIDarr);
    // debug("B.",word, prefix, base, ...matchedIDarr, isNoMatch)
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

function getOfflistEntry(id) {
  id = translateToOfflistDbID(id);
  const entry = (V.offlistDb[id]) ? V.offlistDb[id] : [];
  return entry;
}

function translateToOfflistDbID(id) {
  if (typeof id === "object") id = id[0];
  return (id < 0) ? -id : id;
}

function checkAllowedVariants(word, rawWord, offlistID = 0) {
  const shouldUpdateOfflistDb = (offlistID !== 0);
  let matchedIDarr = checkVariantWords(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkVariantSuffixes(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkAbbreviations(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkGenderedNouns(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkVariantSpellings(word);
  if (isEmpty(matchedIDarr)) matchedIDarr = checkVariantHyphens(word, rawWord);
  if (!isEmpty(matchedIDarr)) {
    const offlistEntry = [offlistID, word, "variant", matchedIDarr, ""];
    // const offlistEntry = [offlistID, rawWord, "variant", matchedIDarr, ""];
    // debug(word, rawWord)
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
    // debug(word, V.isExactMatch, key, searchTerm, truncated)
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
    // debug(`${word}: ${searchTerm}=${truncated} ${searchTerm === truncated}`)
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


function checkVariantHyphens(word, rawWord) {
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
    // if (matchIDarr.length) {
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
  // debug(`${word} ->`, letters, replacement, indices)
  // if (indices.length) {
  if (!isEmpty(indices)) {
    for (const pos of indices) {
      const variant = word.slice(0, pos) + replacement + word.slice(pos + letters.length)
      matchedIDarr = getIdsByLemma(variant);
      if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkDerivations(variant);
      // debug(word, variant, ...matchedIDarr)
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
    checkDigits,
    checkNonAscii,
    checkSymbols,
    // checkContractions,
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
    // checkFinalS,
    checkRegularAdverbs,
  ]) {
    const result = guess(word);
    // debug("@", word, result, (result) ? !isEmpty(result) : "nowt")
    if (result && !isEmpty(result)) {
    // const resultLemma = (!isEmpty(result)) ? getLemma(getEntryById(result)) : "";
    // debug("**", result, resultLemma, LOOKUP.falseDerivations[resultLemma])
    // if (result && !isEmpty(result) && !LOOKUP.falseDerivations[resultLemma]) {
      // debug(word, result)
      localMatches.push(result);
      break;
    }
  }
  // ** -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
  const result = checkFinalS(word);
  // debug(word, result)
  if (result) {
    localMatches.push(result);
  }
  if (!localMatches || isEmpty(localMatches)) {
    return preMatchedIDarr;
  }
  preMatchedIDarr.push(...localMatches);
  return dedupeSimpleArray(preMatchedIDarr);
}

// function runChecks(word, matches) {
//   matches = checkDigits(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkNonAscii(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkSymbols(word);
//   if (!isEmpty(matches)) return matches;
//   // checkContractions,
//   matches = checkNames(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkArticle(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkIrregularNegatives(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkIrregularVerbs(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkIrregularPlurals(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkForeignPlurals(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkVing(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkVpp(word);
//   // debug(word, matches, (!!matches), isEmpty(matches))
//   if (!isEmpty(matches)) return matches;
//   matches = checkSuperlatives(word);
//   if (!isEmpty(matches)) return matches;
//   matches = checkComparatives(word);
//   if (!isEmpty(matches)) return matches;
//   // checkFinalS,
//   matches = checkRegularAdverbs(word);
//   if (!isEmpty(matches)) return matches;
//   else return [];
// }

function dedupeSimpleArray(arr) {
  if (typeof arr !== "object") arr = [arr];
  return [...new Set(arr)];
}

function dedupeById(arr, field = 0) {
  let tmp_ids = {};
  let dedupedArr = [];
  for (let el of arr) {
    // const id = el[0];
    const id = el[field];
    if (tmp_ids[id]) continue;
    else tmp_ids[id] = 1;
    dedupedArr.push(el);
  }
  return dedupedArr;
}

function checkDigits(word) {
  let result;
  if (word.match(/(\d+|\d+,\d+|\d+\.\d+|\d+,\d+\.d+)/i)) {
    result = markOfflist(word, "digit");
  }
  return result;
}

function checkNonAscii(word) {
  let result;
  if (!word.match(/[a-z]/i)) {
    result = markOfflist(word, "unknown");
  }
  return result;
}

function checkSymbols(word) {
  let result;
  if (LOOKUP.symbols.includes(word)) {
    result = markOfflist(word, "symbol");
  }
  return result;
}

function checkContractions(word, rawWord) {
  let result = [];
  if (rawWord.startsWith("'") && LOOKUP.contractions.includes(word)) {
    word = "'" + word;
    result = [markOfflist(word, "contraction")];
  }
  return [result, word];
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
  // debug(word, LOOKUP.irregPlural[word])
  if (lookup) {
    // result = winnowPoS(getIdsByLemma(lookup), ["n"])[0];
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
      // if (lookup.length) {
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
    // result = winnowPoS(findBaseForm(word, LOOKUP.s_subs), ["n", "v", "r"])[0];
    // debug(word, findBaseForm(word, LOOKUP.s_subs))
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
        // if (match && getPoS(match) === pos) {
        localMatches.push(id);
      }
    }
  }
  // if (!Array.isArray(localMatches)) localMatches = [localMatches];
  // debug(...localMatches)
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

function buildMarkupAsHTML(textArr) {
  // debug(...textArr)
  // ** textArr = array of [normalized-word, raw-word, [[matched-id, occurence]...]] for each word, repeat the raw-word for each match, but with different interpretations
  let htmlString = "";
  let isFirstWord = true;
  let wasEOL = false;
  let isEOL = false;
  let wasPunctuation = false;
  let wordIndex = 0;
  for (let [word, rawWord, matches] of textArr) {
    [isEOL, wasEOL, htmlString] = renderEOLsAsHTML(word, htmlString, wasEOL);
    // if (isEOL || !word || !matches[0]) continue;
    if (isEOL || !matches[0]) continue;
    const isPunctuation = (!word) ? "([".includes(rawWord) : false;
    const isContraction = getEntryById(matches[0][0])[2] == "contraction";
    // const leaveSpace = (isContraction || isFirstWord || wasEOL) ? "" : " ";
    const leaveSpace = (isContraction || isFirstWord || wasEOL || wasPunctuation) ? "" : " ";
    wasPunctuation = isPunctuation;
    // const leaveSpace = (isContraction || isFirstWord || wasEOL || !word) ? "" : " ";
    isFirstWord = false;
    // ** duplicateCount = running total; totalRepeats = total
    let matchCount = 0;
    let listOfMatches = [];
    for (let [id, duplicateCount] of matches) {
      let match = getEntryById(id);
      listOfMatches.push([word, id, getLevelNum(match)]);
      matchCount++;
      wasEOL = false;
    }
    wordIndex++;
    const groupedWord = getGroupedWordAsHTML(listOfMatches, wordIndex, word, rawWord, leaveSpace);
    htmlString += groupedWord;
  }
  return htmlString;
}

function getGroupedWordAsHTML(listOfMatches, wordIndex, word, rawWord, leaveSpace) {
  /*
  This, together with getSortedMatchesInfo() parses a complicated word-type system:
  in currentDb:
  pure lemmas (analyse, christmas)
  inflected pure lemmas (analyses, christmas) -> display lemma and dB lemma are different

  in offlistDb:
  variant lemmas (analyze, analyze, xmas) -> offlistDb labels it as "variant" & lists Db entry ids
  offlist / contractions / digits / symbols -> oflistDb labels type with string & number ()

  It does this by looking at the (first) id of the word:
  if positive, it is a pure or inflected lemma with all the information in the dB
  if negative, it is another type with its information stored in the offlistDb (see "->"" above for details)
  */
  let firstLemma, firstID, firstVariantID, levelsAreIdentical, isMultipleMatch, isVariant;
  [listOfMatches, [firstLemma, firstID, firstVariantID], levelsAreIdentical, isMultipleMatch, isVariant] = getSortedMatchesInfo(listOfMatches);
  const isVariantCompound = (word !== rawWord && isCompound(firstID));
  // debug(rawWord, firstID, isCompound(firstID), isVariant, isVariantCompound)
  let id = firstID;
  let variantClass = "";
  let variantRefLink = "";
  if (isVariant) {
    id = firstVariantID;
    variantClass = " variant";
    variantRefLink = `:${firstID}`;
  } else if (isVariantCompound) variantClass = " variant";
  const match = getEntryById(id);
  V.repeats.add(firstLemma + ":" + firstID);
  const ignoreRepeats = LOOKUP.repeatableWords.includes(getLemma(match));
  const [levelArr, levelClass] = getLevelDetails(match);
  const limit = (V.levelLimitStr && V.levelLimitActiveClassesArr.includes(levelClass)) ? ` ${C.LEVEL_LIMIT_CLASS}` : "";
  // debug(firstLemma, V.levelLimit, levelClass, C.levelLimitClass, limit, V.levelLimitActiveClasses)
  const [relatedWordsClass, duplicateClass, duplicateCountInfo, anchor] = getDuplicateDetails(firstID, ignoreRepeats);
  rawWord = insertCursorInHTML(listOfMatches.length, wordIndex, escapeHTMLentities(rawWord));
  const localWord = highlightAwlWord(levelArr, rawWord);
  const listOfLinks = listOfMatches.map(el => [`${el[1]}:${el[0]}${variantRefLink}`]).join(" ");
  let showAsMultiple = "";
  if (isMultipleMatch) showAsMultiple = (levelsAreIdentical) ? " multi-same" : " multi-diff";
  const classes = `${levelClass}${relatedWordsClass}${duplicateClass}${showAsMultiple}${variantClass}${limit}`;
  // debug(firstLemma, levelClass, V.levelLimitActiveClasses, V.levelLimitActiveClasses.includes(levelClass), limit, classes)
  // const displayWord = `${leaveSpace}<span data-entry="${listOfLinks}" class="${levelClass}${relatedWordsClass}${duplicateClass}${showAsMultiple}${variantClass}"${duplicateCountInfo}${anchor}>${localWord}</span>`;
  const displayWord = `${leaveSpace}<span data-entry="${listOfLinks}" class="${classes}"${duplicateCountInfo}${anchor}>${localWord}</span>`;
  return displayWord;
}


function getSortedMatchesInfo(matches) {
  /* given a list of matches in this format: ['given', 3118, 0],['given', 3119, 2]]
  i.e. [lemma, id, level]
  sort this list by level, lowest first
  return the lowest item & a flag specifying if matches all have same level
  REASON: the item to display should be the lowest level one
  also: it will not be marked as having multiple matches if they are all the same level
  */
  // const isMultipleMatch = (matches.length > 1);
  let lowest = matches[0];
  const firstEntry = getEntryById(lowest[1]);
  const isVariant = getPoS(firstEntry) === "variant";
  if (isVariant) matches = firstEntry[3].map(ID => [getLemma(getEntryById(ID)), ID, 0]);
  const isMultipleMatch = (matches.length > 1);
  // debug(...firstEntry, isVariant, matches)
  let levelsAreIdentical = true;
  if (isMultipleMatch) {
    let sorted = matches.sort((a, b) => a[2] - b[2]);
    lowest = sorted[0];
    let levels = sorted.map(el => el[2]);
    levelsAreIdentical = levels.every(el => el === levels[0]);
  }
  const result = [matches, lowest, levelsAreIdentical, isMultipleMatch, isVariant];
  // debug(matches, ...lowest, areSame, isMultipleMatch)
  return result;
}

function visibleLevelLimitToggle(e) {
  const [level, isValidSelection, resetPreviousSelectionRequired] = visibleLevelLimitInfo(e.target);
  if (isValidSelection) {
    // debug("valid")
    if (resetPreviousSelectionRequired) {
      // debug("reset required")
      visibleLevelLimitApply(V.levelLimitStr);
      V.levelLimitStr = "";
    }
    if (V.levelLimitStr) {
      // debug("previous selection:", ...V.levelLimitActiveClasses)
      visibleLevelLimitApply(V.levelLimitStr);
      V.levelLimitStr = "";
      V.levelLimitActiveClassesArr = [];
      V.current.limit_state = -1;
    } else {
      V.levelLimitStr = level;
      V.levelLimitActiveClassesArr = C.LEVEL_LIMITS.slice(C.LEVEL_LIMITS.indexOf(V.levelLimitStr));
      V.current.limit_state = C.LEVEL_LIMITS.indexOf(level);
      // debug("updated current.limit_state:", V.current.limit_state)
      // debug("about to select:", ...V.levelLimitActiveClasses)
      visibleLevelLimitApply(V.levelLimitStr, false);
    }
    appStateSaveItem("limit_state", V.current.limit_state);
    // debug("saved limit state:", localStorage.getItem("limit_state"), V.current.limit_state)

  }
  // else debug("ignore...")
}

function visibleLevelLimitInfo(el) {
  const level = el.className.split(" ")[0];
  const isValidSelection = level.startsWith("level") && level !== "level-e";
  const resetPreviousSelectionRequired = (isValidSelection && !!V.levelLimitActiveClassesArr.length && level !== V.levelLimitActiveClassesArr[0]);
  // debug(level, isValidSelection, resetPreviousSelectionRequired, ...V.levelLimitActiveClasses, V.levelLimitActiveClasses.length);
  return [level, isValidSelection, resetPreviousSelectionRequired];
}

function visibleLevelLimitApply(className, removeClass = true) {
  const classesToChange = (isEmpty(V.levelLimitActiveClassesArr)) ? C.LEVEL_LIMITS.slice(C.LEVEL_LIMITS.indexOf(className)) : V.levelLimitActiveClassesArr;
  let tmp = [];
  for (const level of classesToChange) {
    const targetElements = document.getElementsByClassName(level);
    tmp.push(targetElements.length);
    for (let i = 0; i < targetElements.length; i++) {
      // debug(`${i+1} of ${targetElements.length}: level=${level}, ${removeClass ? "remove" : "add"}: ${targetElements[i].classList}`)
      if (removeClass) {
        targetElements[i].classList.remove(C.LEVEL_LIMIT_CLASS);
      } else {
        targetElements[i].classList.add(C.LEVEL_LIMIT_CLASS);
      }
    }
  }
}

function visibleLevelLimitSet(fromSaved = false) {
  if (fromSaved) {
    V.levelLimitStr = (V.current.limit_state >= 0) ? C.LEVEL_LIMITS[V.current.limit_state] : "";
    V.levelLimitActiveClassesArr = (V.levelLimitStr) ? C.LEVEL_LIMITS.slice(V.current.limit_state) : [];
    // debug(`saved level: (${V.current.limit_state}) ${V.levelLimitStr} ->`, ...V.levelLimitActiveClassesArr)
  }
  if (V.levelLimitStr) {
    // debug("implementing limit...")
    visibleLevelLimitApply(V.levelLimitStr, false);
    // const id = V.levelLimit.slice(-3);
    // const classlist = document.getElementById(id).classList;
    // classlist.add(C.LEVEL_LIMIT_CLASS);
    // debug(id, classlist.contains(C.LEVEL_LIMIT_CLASS))
  }
  else {
    visibleLevelLimitApply(C.LEVEL_LIMITS[0])
  }
}

function visibleLevelLimitReset() {
  appStateSaveItem("limit_state", C.DEFAULT_STATE.limit_state);
  visibleLevelLimitSet(true);
  // if (V.levelLimitStr) {
  //   const id = V.levelLimitStr.slice(-3);
  //   document.getElementById(id)?.classList.remove(C.LEVEL_LIMIT_CLASS);
  //   V.levelLimitStr = "";
  // }
}

// function setHelpState(e) {
//   let el, mode;
//   if (e.target) {
//     el = e.target;
//     mode = "toggle";
//   } else {
//     el = HTM.helpDetails;
//     mode = e;
//   }
//   if (mode === "toggle") {
//     V.current.help_state = (el.hasAttribute("open")) ? 1 : 0;
//   }
//   else {
//     if (mode === "reset") V.current.help_state = C.DEFAULT_STATE.help_state;
//     if (V.current.help_state) el.setAttribute("open", "")
//     else el.removeAttribute("open");
//   }
//   appStateSaveItem("help_state", V.current.help_state);
//   // debug(mode, V.current.help_state, !!V.current.help_state, el.hasAttribute("open"))
// }

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
  // debug(mode, V.current.help_state, !!V.current.help_state, el.hasAttribute("open"))
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

function getDuplicateDetails(id, ignoreRepeats) {
  const totalRepeats = V.tallyOfWordReps[id];
  let duplicateClass = "";
  let duplicateCountInfo = "";
  let anchor = "";
  const relatedWordsClass = `all_${id}`;
  if (totalRepeats > 1 && !ignoreRepeats) {
    let tmp = V.tallyOfRepeats[id];
    if (!tmp) {
      V.tallyOfRepeats[id] = 1;
    } else V.tallyOfRepeats[id] += 1;
    duplicateClass = " duplicate";
    duplicateCountInfo = ' data-reps="' + totalRepeats + '"';
    anchor = ` id='${relatedWordsClass}_${V.tallyOfRepeats[id]}'`;
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


function escapeHTMLentities(text) {
  return text.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


function getLevelPrefix(entry) {
  const levelNum = getLevelNum(entry);
  let level = V.level_subs[levelNum];
  if (isKids() && levelNum < V.OFFLIST) level = "k";
  if (!level) level = "o";
  return level[0];
}

// function buildLevelStats(separateLemmasCount, levelStats) {
//   if (!separateLemmasCount || isKids()) return "";
//   let levelStatsHTMLstr = `<p><strong>Level statistics:</strong><em> (${separateLemmasCount} headwords)</em></p><div class="level-stats-cols">`
//   for (const [levelID, levelText, total, percent] of levelStats.sort((a,b)=>a[0]-b[0])){
//     if (levelID < 3) levelStatsHTMLstr += `<p class="level-${levelText[0]}">${levelText}: ${total} (${percent})</p>`;
//     else if (isBESTEP()) levelStatsHTMLstr += `<p class="level-a">${levelText}: ${total} (${percent})</p>`;
//   }
//   levelStatsHTMLstr = `<div id="level-stats">${levelStatsHTMLstr}</div></div>`;
//   return levelStatsHTMLstr;
// }

function buildLevelStats(separateLemmasCount, levelStats) {
  if (!separateLemmasCount || isKids()) return "";
  let levelStatsHTMLstr = `<summary><strong>Level statistics:</strong><em> (${separateLemmasCount} headwords)</em></summary><div class="level-stats-cols">`
  for (const [levelID, levelText, total, percent] of levelStats.sort((a,b)=>a[0]-b[0])){
    if (levelID < 3) levelStatsHTMLstr += `<p class="level-${levelText[0]}">${levelText}: ${total} (${percent})</p>`;
    else if (isBESTEP()) levelStatsHTMLstr += `<p class="level-a">${levelText}: ${total} (${percent})</p>`;
  }
  const toggleOpen = (V.current.level_state) ? " open" : "";
  levelStatsHTMLstr = `<details id="level-details"${toggleOpen}>${levelStatsHTMLstr}</div></details>`;
  return levelStatsHTMLstr;
}

// function buildRepeatList(wordCount) {
//   let countReps = 0;
//   let listOfRepeats = "";
//   if (!wordCount) {
//     V.tallyOfWordReps = {};
//   } else {
//     /* List of repeated lemmas
//     in line with display policy, if two lemmas are identical,
//     the id with the lowest level is linked/displayed
//     This fits with buildMarkupAsHTML()
//     same lemma, different rawWord: only first is displayed (i.e. 'learned (learns)')
//     */
//     const repeatsList = [...V.repeats].sort();
//     let idList = [];
//     for (const el of repeatsList) {
//       const [word, id] = el.split(":");
//       if (idList.includes(id)) continue;
//       else idList.push(id);
//       const entry = getEntryById(id);
//       const level_arr = getLevel(entry);
//       const isRepeated = V.tallyOfWordReps[id] > 1;
//       const isRepeatable = !LOOKUP.repeatableWords.includes(word);
//       const isWord = !LOOKUP.symbols.includes(word);
//       if (isRepeated && isRepeatable && isWord) {
//         countReps++;
//         let anchors = "";
//         for (let repetition = 1; repetition <= V.tallyOfWordReps[id]; repetition++) {
//           let display = repetition;
//           let displayClass = 'class="anchors" ';
//           if (repetition === 1) {
//             display = highlightAwlWord(level_arr, word);
//             displayClass = `class="level-${getLevelPrefix(entry)}" `;
//           }
//           anchors += ` <a href="#" ${displayClass}onclick="jumpToDuplicate('all_${id}_${repetition}'); return false;">${display}</a>`;
//         }
//         listOfRepeats += `<p data-entry="${id}" class='duplicate all_${id} level-${getLevelPrefix(entry)}'>${anchors}</p>`;
//       }
//     }
//     let repeatsHeader;
//     if (countReps) {
//       repeatsHeader = `<p id='all_repeats'><strong>${countReps} repeated word${(countReps === 1) ? "" : "s"}:</strong><br><em>Click on word / number to jump to that occurance.</em></p>`
//       listOfRepeats = `${repeatsHeader}<div id='repeats'>${listOfRepeats}</div>`;
//     } else {
//       listOfRepeats = "<p id='all_repeats'><strong>There are no significant repeated words.</strong></p>";
//     }
//   }
//   return listOfRepeats
// }

function buildRepeatList(wordCount) {
  let countReps = 0;
  let listOfRepeats = "";
  if (!wordCount) {
    V.tallyOfWordReps = {};
  } else {
    /* List of repeated lemmas
    in line with display policy, if two lemmas are identical,
    the id with the lowest level is linked/displayed
    This fits with buildMarkupAsHTML()
    same lemma, different rawWord: only first is displayed (i.e. 'learned (learns)')
    */
    const repeatsList = [...V.repeats].sort();
    let idList = [];
    for (const el of repeatsList) {
      const [word, id] = el.split(":");
      if (idList.includes(id)) continue;
      else idList.push(id);
      const entry = getEntryById(id);
      const level_arr = getLevel(entry);
      const isRepeated = V.tallyOfWordReps[id] > 1;
      const isRepeatable = !LOOKUP.repeatableWords.includes(word);
      const isWord = !LOOKUP.symbols.includes(word);
      if (isRepeated && isRepeatable && isWord) {
        countReps++;
        let anchors = "";
        for (let repetition = 1; repetition <= V.tallyOfWordReps[id]; repetition++) {
          let display = repetition;
          let displayClass = 'class="anchors" ';
          if (repetition === 1) {
            display = highlightAwlWord(level_arr, word);
            displayClass = `class="level-${getLevelPrefix(entry)}" `;
          }
          anchors += ` <a href="#" ${displayClass}onclick="jumpToDuplicate('all_${id}_${repetition}'); return false;">${display}</a>`;
        }
        listOfRepeats += `<p data-entry="${id}" class='duplicate all_${id} level-${getLevelPrefix(entry)}'>${anchors}</p>`;
      }
    }
    let repeatsHeader;
    if (countReps) {
      const toggleOpen = (V.current.repeat_state) ? " open" : "";
      repeatsHeader = `<details id="repeat-details"${toggleOpen}><summary id='all_repeats'><strong>${countReps} repeated word${(countReps === 1) ? "" : "s"}</strong></summary>`;
      listOfRepeats = `${repeatsHeader}<p><em>Click on word / number to jump to that occurrence.</em></p><div id='repeats'>${listOfRepeats}</div></details>`;
    } else {
      listOfRepeats = "<p id='all_repeats'><strong>There are no significant repeated words.</strong></p>";
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
  // HTM.finalLegend.innerHTML = `Checking against <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
  HTM.finalLegend.innerHTML = `Checking <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
  document.getElementById("help-kids").setAttribute("style", (isKids()) ? "display:block;" : "display:none;");
  document.getElementById("help-gept").setAttribute("style", (!isKids()) ? "display:block;" : "display:none;");
  document.getElementById("help-awl").setAttribute("style", (isBESTEP()) ? "display:block;" : "display:none;");
}

function getIdsByLemma(word) {
  // ** returns empty array or array of matched IDs [4254, 4255]
  if (typeof word !== "string" || !word) return [];
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
        // debug(word, ending, root + sub, ...tmp_match)
        localMatches.push(...tmp_match);
      }
    }
  }
  // debug(word, localMatches)
  return localMatches;
}

// function findBaseForm(word, subs, isSuffix = true) {
//   // ** Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
//   let localMatches = [];
//   const candidates = new Set();
//   // const affix_lookups = (isSuffix) ? "_suffix" : "_prefix";
//   // const toSuffix = -(subs[affix_lookups].length);
//   const toSuffix = -(subs["_suffix"].length);
//   for (const ending in subs) {
//     const i = -(ending.length);
//     const affix = subs[word.slice(i)];
//     if (affix != undefined) {
//       const candidate = word.slice(0, i) + affix;
//       debug(word, ending, affix, candidate)
//       candidates.add(candidate);
//     }
//   }
//   candidates.add(word.slice(0, toSuffix));
//   for (const candidate of candidates) {
//     const tmp_match = getIdsByLemma(candidate);
//     // if (tmp_match.length) localMatches.push(...tmp_match);
//     if (!isEmpty(tmp_match)) localMatches.push(...tmp_match);
//   }
//   return localMatches;
// }


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
  // V.currentTab = C.DEFAULT_tab;
  clearTab1();
  clearTab2();
  visibleLevelLimitReset();
  // HTM.selectDb.value = C.DEFAULT_db;
  // setTab(V.currentTab);
  // setDbShared(C.DEFAULT_db);
  setTab(V.current.tab_state);
  setDbShared(V.current.db_state);
  HTM.selectDb.value = V.current.db_state;
  setHelpState("reset");
  // setLevelState("reset");
  // setRepeatState("reset");
  visibleLevelLimitReset();
}

function appStateForceDefault() {
  for (const key in C.DEFAULT_STATE) {
    const defaultVal = C.DEFAULT_STATE[key];
    // localStorage.setItem(key, defaultVal)
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
  // localStorage.setItem("db_state", V.current.db_state);
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
  // const hasContent = !!arr || arr.length;
  let hasContent;
  if (!arr) hasContent = false;
  // else if (arr && typeof arr !== "object") hasContent = true;
  else if (typeof arr !== "object") hasContent = true;
  // else if (Array.isArray(arr)) hasContent = true;
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
  // visibleLevelLimitSet();
  displayDbNameInTab2();
  forceUpdateInputDiv();
}

function debounce(func, timeout = 500) {
  // debug(func.name === "updateInputDiv")
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
    // V.timer = timer;
  };
}

function debug(...params) {
  console.log(`DEBUG: ${debug.caller.name}> `, params);
  // console.log(`DEBUG:> `, params);
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
  // localStorage.setItem("tab_state", V.current.tab_state);
  appStateSaveItem("tab_state", V.current.tab_state);
  forceUpdateInputDiv();
  displayInputCursor();
  V.isExactMatch = !isFirstTab();
}


function setTabHead() {
  let mode = (isFirstTab()) ? "none" : "block";
  HTM.backupButton.style.display = mode;
  HTM.backupSave.style.display = mode;
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
  el.blur()
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
    HTM.textTabTag.style.fontStyle = "italic";
  }
  else {
    HTM.workingDiv.style.backgroundColor = "white";
    HTM.textTabTag.style.fontStyle = "normal";
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