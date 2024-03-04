/*
Fixed:
excessive EOLs
compounds erase cursor placeholder
save app status anomalies
streamlined lookupDerivations
refresh & editing states not always respected
cursor needs to avoid <mark> elements
need to be able to add text after <mark> element / at end of text

TODO:
sort out in-place editing:
can write in <mark> in manual-refresh mode (with unpredictable results)
*/
// ## SETUP ############################################


init();
addListeners();


// TAB1 (words) CODE ## ############################################

// ***** INIT FUNCTIONS

function init() {
  setGlobalState();
  setDb_shared(V.currentDbChoice);
  setTab(V.currentTab);
  setEditingMode();
  HTM.form.reset();
  toggleFinalTextDiv();
  updateDropdownMenuOptions();
}

function updateDropdownMenuOptions() {
  HTM.selectDb.value = V.currentDbChoice;
  HTM.selectEditMode.value = (V.isInPlaceEditing) ? "1" : "0";
}

function setGlobalState() {
  if (!(C.SAVE_DB_STATE in localStorage)) setAppStateToDefault();
  let [
    dbState,
    tabState,
    refreshState,
    editState
  ] = retrieveAppState();
  // debug(`dbState:${dbState}, tabState:${tabState}, refreshState:${refreshState}, editState:${editState}`)
  V.currentDbChoice = dbState;
  V.currentTab = tabState;
  V.isAutoRefresh = (refreshState === "true");
  V.isInPlaceEditing = (editState === "true");
}

function addListeners() {
  addTabListeners();
  addMenuListeners();
  addWordInputListeners();
  addEditModeListeners();
}

function addWordInputListeners() {
  HTM.inputLemma.addEventListener("input", debounce(submitWordSearchForm, 500));
  for (const el of document.getElementsByTagName("input")) {
    if (el.type != "text") {
      const label = el.labels[0];
      if (label.htmlFor) label.addEventListener("click", registerLabelClick);
    }
  }
}

function addTabListeners() {
  for (const el of document.getElementsByClassName("tab")) {
    el.addEventListener("click", setTab);
  }
}

function addMenuListeners() {
  HTM.clearButton.addEventListener("click", clearTab);
  HTM.resetButton.addEventListener("click", resetApp);

  // ## for refresh button + settings menu
  HTM.selectDb.addEventListener("change", setDb_shared);
  HTM.selectFontSize.addEventListener("change", changeFont);
  HTM.selectRefresh.addEventListener("change", changeRefresh);
  HTM.selectEditMode.addEventListener("change", setEditingMode);
  HTM.refreshButton.addEventListener("click", requestRefresh);
  HTM.backupButton.addEventListener("click", showBackups);
  HTM.backupDialog.addEventListener("mouseleave", closeBackupDialog);
  HTM.backupSave.addEventListener("click", saveBackup);

  HTM.settingsMenu.addEventListener("mouseenter", dropdown);
  HTM.settingsMenu.addEventListener("mouseleave", dropdown);
}

function addEditModeListeners() {
  // HTM.workingDiv.addEventListener("keydown", catchKeyboardCopyEvent);
  HTM.workingDiv.addEventListener("paste", normalizePastedText);
  // ## having probs removing his event listener; leave & ignore with updateInputDiv
  HTM.workingDiv.addEventListener("keyup", debounce(updateInputDiv));

  if (V.isInPlaceEditing) {
    // ## "copy" only works from menu; add keydown listener to catch Ctrl_C
    HTM.workingDiv.addEventListener("copy", normalizeTextForClipboard);
    HTM.workingDiv.addEventListener("keydown", catchKeyboardCopyEvent);
    HTM.workingDiv.addEventListener("keydown", rejectMark);
    HTM.workingDiv.addEventListener("keyup", updateCursorPos);

  }
  else {
    // ## clear 'in-place' events
    HTM.workingDiv.removeEventListener("copy", normalizeTextForClipboard);
    HTM.workingDiv.removeEventListener("keydown", catchKeyboardCopyEvent);
    HTM.workingDiv.removeEventListener("keydown", rejectMark);
    HTM.workingDiv.removeEventListener("keyup", updateCursorPos);
  }
  setHoverEffects();
}

function setHoverEffects() {
  if (V.isInPlaceEditing) {
    HTM.finalTextDiv.removeEventListener("mouseover", hoverEffects);
    HTM.finalTextDiv.removeEventListener("mouseout", hoverEffects);

    HTM.workingDiv.addEventListener("mouseover", hoverEffects);
    HTM.workingDiv.addEventListener("mouseout", hoverEffects);

  } else {
    HTM.workingDiv.removeEventListener("mouseover", hoverEffects);
    HTM.workingDiv.removeEventListener("mouseout", hoverEffects);

    HTM.finalTextDiv.addEventListener("mouseover", hoverEffects);
    HTM.finalTextDiv.addEventListener("mouseout", hoverEffects);
  }
}

// *****  FUNCTIONS

function isArrayElementInOtherArray(x, y) {
  for (let el of x) {
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

function showBackups(e) {
  /*
  1) on refresh, swap backup_0 to backup_1
  2) close backup dialog on mouseout
  3) close settings dialog when backup opens
  4) hide backup setting on tab 1
  5) ? rationalize dialogs so there is a coherent, extendable system
  */
  for (const id of C.backupIDs) {
    // debug(id, document.getElementById(id))
    const backup = document.getElementById(id)
    const lsContent = localStorage.getItem(id);
    let content = (lsContent) ? lsContent.trim() : "";
    if (content) {
      if (localStorage.getItem("mostRecent") == id) content = "<span class='level-o'>Most Recent: </span>" + content;
      backup.innerHTML = content;
      backup.disabled = false;
    } else {
      backup.innerHTML = "[empty]";
      backup.disabled = true;
    }
  }
  HTM.backupDialog.style.setProperty("display", "flex");
}

function loadBackup(id) {
  // const swap = JSON.parse(JSON.stringify(HTM.workingDiv.innerText));
  const swap = JSON.parse(JSON.stringify(grabText()));
  let restoredContent = localStorage.getItem(id);
  if (!restoredContent) return;
  if (V.isInPlaceEditing) {
    restoredContent = newlinesToEOLs(restoredContent);
  }
  HTM.workingDiv.innerText = restoredContent;
  // updateInputDiv();
  forceUpdateInputDiv();
  if (swap) localStorage.setItem(id, swap);
  closeBackupDialog("backup-dlg");
}

function updateBackup(id) {
  // ## current logic: 0=from last refresh, 1=regularly updated (if longer than prev)
  let thisBackup = localStorage.getItem(id);
  // if (localStorage.getItem(id).trim()) {
  if (thisBackup) {
    // let newContent = HTM.workingDiv.innerText.trim();
    let newContent = grabText();
    if (!newContent) return;
    for (let other of C.backupIDs) {
      // ## don't hold duplicate backups
      if (id != other && newContent == localStorage.getItem(other)) return;
    }
    // if (localStorage.getItem(id).length < newContent.length) window.localStorage.setItem(id, newContent)
    if (thisBackup.length < newContent.length) window.localStorage.setItem(id, newContent)
    localStorage.setItem("mostRecent", id);
  } else {
    localStorage.setItem(id, "")
  }
}

function resetBackup() {
  // ## logic: put current OR most recent change in first backup (2nd backup is constantly updated)
  // let mostRecent = HTM.workingDiv.innerText.trim();
  let mostRecent = grabText();
  if (!mostRecent) mostRecent = localStorage.getItem(localStorage.getItem("mostRecent"));
  if (!mostRecent || !mostRecent.length) return;
  localStorage.setItem(C.backupIDs[0], mostRecent);
  localStorage.setItem("mostRecent", C.backupIDs[0]);
  localStorage.setItem(C.backupIDs[1], "");
}

function saveBackup() {
  let currentText = grabText();
  if (!currentText) return;
  if (currentText !== localStorage.getItem(C.backupIDs[1])) {
    localStorage.setItem(C.backupIDs[1], currentText);
    localStorage.setItem("mostRecent", C.backupIDs[1]);
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

function closeBackupDialog(id) {
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
    //console.log(`r_l_Click: ${label.htmlFor} (${input.type}:${input.checked}) default:${defaultChecked.id} [${countChecked}]`);

    if (countChecked < 1) {
      defaultChecked.checked = true;
      defaultChecked.labels[0].classList.add("selected_txt");
      refreshLabels(parentID);
    }
    submitWordSearchForm(e_label);
  }
}

function refreshLabels(parentID) {
  //console.log(`*refreshLabels* parentID=${parentID}`);
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

function submitWordSearchForm(e) {
  let resultsCount = 0;
  let resultsArr = [];
  let HTMLstringToDisplay = "";
  const data = getFormData(e);
  let errorMsg = checkFormData(data);
  if (errorMsg) {
    HTMLstringToDisplay = markStringAsError(errorMsg);
  } else {
    resultsArr = executeFormDataLookup(data);
    resultsCount = resultsArr.length;
    if (resultsCount) {
      HTMLstringToDisplay = formatResultsAsHTML(resultsArr);
    } else {
      HTMLstringToDisplay = markStringAsError("No matches found for this term.");
    }
  }
  // debug(resultsCount, resultsArr)
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
  // ## Read & normalize raw data into 'data' object
  // debug("gept/kids/best",isGEPT(), isKids(), isBESTEP())
  for (let [key, value] of raw_data) {
    // ## default value of html option (but screws up db lookup)
    if (value === "-1") value = "";
    // ## ignore form elements that aren't required for current dB
    if (key === "level" && isKids()) continue;
    if (key === "theme" && !isKids()) continue;
    if (key === "awl" && !isBESTEP()) continue;
    const digit = parseInt(value)
    if (Number.isInteger(digit)) {
      data[key].push(digit);
    } else if (value.trim()) {
      data[key].push(value.trim());
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
  for (let el in data) {
    if (el === "match") continue;
    if (data[el].length) {
      status = 0;
      break;
    }
  }
  if (status === 3 && !data["match"].includes("contains")) status = 2;
  const term = data.term.join().split(" ")[0].toLowerCase();
  if (term.search(/[^a-z\-\s']/g) > -1) status = 1;
  const errorMsg = [
    "",
    "The only non-alphabetic characters allowed are space, apostrophe, and hyphen.",
    "Please enter at least one search term to restrict the number of results.",
    "Enter a search term."
  ][status];
  return errorMsg;
}

function executeFormDataLookup(data) {
  const term = data.term.join().split(" ")[0].toLowerCase();
  const matchType = C.MATCHES[data.match];
  const searchTerms = {
    term: new RegExp(matchType[0] + term + matchType[1], "i"),
    raw_term: term,
    level: (V.isKids) ? data.theme : data.level,
    awl: data.awl.map(x => (x < 100) ? x + C.awl_level_offset : x),
    pos: data.pos.join("|")
  };
  const resultsArr = refineSearch(searchTerms);
  return resultsArr;
}

function refineSearch(find) {
  let results = V.currentDb.db.filter(el => el[C.LEMMA].search(find.term) != -1);
  results = results.concat(getDerivedForms(find.term).map(el => getDbEntry(el)));
  if (find.level.length) {
    results = results.filter(el => find.level.indexOf(el[C.LEVEL][0]) > -1);
  }
  if (find.pos.length) {
    results = results.filter(el => el[C.POS]).filter(el => el[C.POS].search(find.pos) != -1);
  }
  if (isBESTEP() && find.awl && find.awl.length) {
    /*
    el[C.LEVEL][2]:
    1-in awl only
    2-in gept only
    3-in gept AND awl

    from search from (awl)
    100 = choose only words in AWL list
    200 = choose only words in GEPT list
    */
    if (find.awl == 200) {
      results = results.filter(el => el[C.LEVEL][2] >= 2);
    }
    else if (find.awl == 100) {
      results = results.filter(el => el[C.LEVEL][1] > -1);
    }
    else {
      results = results.filter(el => find.awl.indexOf(el[C.LEVEL][1]) > -1);
    }
  }
  results = results.filter(result => result[C.ID] > 0);
  return results;
}

function getDerivedForms(term) {
  // ### retrieve non-regex form of search term
  let raw_term = term.toString().slice(1, -2);
  for (const char of "^:.*$/") {
    raw_term = raw_term.replace(char, "");
  }
  let matches = [];
  matches = lookupDerivations([raw_term, raw_term]);
  // debug("getDerivedForms",raw_term,matches)
  return matches;
}

function getAwlSublist(level_arr) {
  return (isBESTEP() && level_arr[1]) ? level_arr[1] - C.awl_level_offset : -1;
}

function highlightAwlWord(level_arr, word) {
  return (isBESTEP() && level_arr[1] > -1) ? `<span class="awl-word">${word}</span>` : word;
}

function formatResultsAsHTML(results) {
  // console.log("formatresults*", results, !results)
  let output = "";
  let previousInitial = "";
  let currentInitial = "";
  let i = 0;
  for (const entry of results.sort(compareByLemma)) {
    currentInitial = (entry[C.LEMMA]) ? entry[C.LEMMA][0].toLowerCase() : "";
    if (currentInitial !== previousInitial) {
      output += formatResultsAsTablerows(currentInitial.toLocaleUpperCase(), "", "black", "");
    }
    const level_arr = entry[C.LEVEL];
    const awl_sublist = getAwlSublist(level_arr);
    const awlWord = highlightAwlWord(level_arr, entry[C.LEMMA]);
    const lemma = `<strong>${awlWord}</strong>`;
    const pos = `[${expandPos(entry)}]`;
    let level = V.level_subs[level_arr[0]];
    if (awl_sublist >= 0) level += `; AWL${awl_sublist}`;
    if (!level) continue;
    let [note, awl_note] = getNotes(entry);
    const col2 = `${lemma} <span class="show-pos">${pos}</span> <span class="show-level">${level}</span>${note}${awl_note}`;
    let class2 = (V.isKids) ? "level-e" : `level-${level[0]}`;
    output += formatResultsAsTablerows(`${i + 1}`, col2, "", class2);
    previousInitial = currentInitial;
    i++;
  }
  return "<table>" + output + "</table>";
}

function getNotes(entry) {
  let [note, awl_note] = entry[C.NOTE].trim().split(C.NOTE_SEP);
  note = note ? `, ${note}` : "";
  awl_note = (isBESTEP() && awl_note) ? ` <span class="awl-note">(headword: <span class="awl-headword">${awl_note}</span>)</span>` : "";
  return [note, awl_note]
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
  // displayWordSearchResults([]);
  submitWordSearchForm();
  refreshLabels("t1_form");
  // HTM.resultsText.innerHTML = "";
}


// ## TAB2 (text) SETUP ############################################

function hoverEffects(e) {
  // ## references to parent elements are to reach embedded elements
  const el = e.target;
  if (typeof el.classList === 'undefined') return;
  // ## 1) show information text
  // const tooltip = el.firstElementChild;
  if (el.dataset.entry || el.parentElement.dataset.entry) {
    const ref = (el.dataset.entry) ? el.dataset.entry : el.parentElement.dataset.entry;
    HTM.finalInfoDiv.innerHTML = displayEntryInfo(ref);
    HTM.finalInfoDiv.style.display = "flex";
  }

  // ## 2) remove highlighting after a jump to a duplicate
  el.classList.remove('jumpHighlight');

  // ## 3) show repeated words
  let classList = [].slice.apply(el.classList);
  const parentCList = [].slice.apply(el.parentElement.classList);
  if (parentCList.includes("duplicate")) classList = parentCList;
  if (classList.includes("duplicate")) {
    const relatedWords = classList.filter(name => name.slice(0, 4) === "all_")[0]
    const dupes = document.getElementsByClassName(relatedWords);
    toggleHighlight(dupes);
  }
  // const isMouseOver = e.type === "mouseover";
  function toggleHighlight(els) {
    for (let el of els) {
      el.classList.toggle("highlight");
    }
  }
}

function displayEntryInfo(ref) {
  const [id, normalizedWord] = ref.split(":");
  const entry = getDbEntry(id);
  // console.log("display entry info>",ref, id, normalizedWord,entry)
  let lemma = "";
  if (entry[C.POS] !== "unknown") {
    lemma = (normalizedWord && normalizedWord !== entry[C.LEMMA]) ? `${normalizedWord} (${entry[C.LEMMA]})` : entry[C.LEMMA];
    lemma = `<strong>${lemma}</strong>: `;
  }
  let level;
  // ## If word is offlist, use its classification (digit/name, etc.) as level
  if (id < 0) {
    level = entry[C.POS];
  } else {
    let level_arr = entry[C.LEVEL];
    level = V.level_subs[level_arr[0]];
    if (getAwlSublist(level_arr) >= 0) {
      level += `; ${V.level_subs[level_arr[1]]}`;
    }
  }
  level = `<em>${level}</em>`;
  const pos = `[${expandPos(entry)}]`;
  let [notes, awl_notes] = getNotes(entry);
  const html = `${level}<span>${lemma}${pos}${notes}${awl_notes}</span>`;
  return html;
}


function expandPos(entry) {
  const pos_str = entry[C.POS];
  if (entry[C.ID] < 0) return pos_str;
  const pos = (pos_str) ? pos_str.split("").map(el => LOOKUP.pos_expansions[el]).join(", ") : "";
  return pos;
}

// ## if text is pasted in, this is where processing starts
function normalizePastedText(e) {
  // ## preventDefault needed to prevent cursor resetting to start of div at every paste
  e.preventDefault();
  let paste = (e.clipboardData || window.clipboardData).getData('text');
  const selection = window.getSelection();
  selection.getRangeAt(0).insertNode(document.createTextNode(paste));
  V.isTextEdit = true;
  requestRefresh(e);
  saveBackup();
  V.isTextEdit = false;
}

function catchKeyboardCopyEvent(e) {
  // let isV = (e.keyCode === 86 || e.key === "v"); // this is to detect keyCode
  let isC = (e.keyCode === 67 || e.key === "c"); // this is to detect keyCode
  // let isCtrl = (e.keyCode === 17 || e.key === "Control");
  // let isMeta = (e.keyCode === 91 || e.key === "Meta");
  if (isC && (e.metaKey || e.ctrlKey)) {
    // debug("kachink! Meta_C was pressed!")
    normalizeTextForClipboard();
  }
}


function updateInputDiv(e) {
  // debug("refresh...", V.isAutoRefresh, V.refreshRequested)
  // ## I have to make this check because I can't reliably remove the eventlistener of 'debounce(func)'
  /*
  This is the common gateway for all refresh & edit modes
  so... break into modules for ease of separation.
  LOGIC:
  If manual refresh:
    remove eventListener updateInputDiv from workingDiv
    if 2-col
      update finalTextDiv
    else (in-place)
      update workingDiv
else (autorefresh):
  if 2-col:
    on keydown/keyup in workingDiv
      updateInputDiv
  else (in-place):
    on keydown/keyup in workingDiv
      updateInputDiv
  */
  if (V.isAutoRefresh || V.refreshRequested) {
    let revisedText = grabRevisedText();
    if (revisedText) {
      const [
        resultsAsHTML,
        repeatsAsHTML,
        wordCount
      ] = processText(revisedText);
      displayProcessedText(resultsAsHTML, repeatsAsHTML, wordCount);
      // V.forceUpdate = false;
      // V.skipMarkup = false;
      HTM.finalInfoDiv.innerText = "";
    } else {
      return;
    }
  }
  else {
    // debug("event listener not removed :S")
    return;
  }
}


function requestRefresh(e) {
  // ## need to close the request to make sure it gets reset
  V.refreshRequested = true;
  // debug(V.refreshRequested)
  updateInputDiv(e);
  V.refreshRequested = false;
}

function grabRevisedText() {
  let revisedText;
  if (V.isInPlaceEditing) {
    if (V.isTextEdit || V.refreshRequested) {
      revisedText = insertCursorPlaceholder(HTM.workingDiv, V.cursorOffsetNoMarks);
    }
    else {
      debug("not a valid text edit");
      revisedText = "";
    }
  }
  else {
    // ## 2-COL EDITING
    revisedText = HTM.workingDiv.innerText.trim();
  }
  return revisedText;
}

function grabText(){
  let currentText;
  if (V.isInPlaceEditing) {
    currentText = newlinesToPlaintext(removeTags(HTM.workingDiv)).innerText;
    currentText = EOLsToNewlines(currentText);
  } else {
    currentText = HTM.workingDiv.innerText;
  }
  currentText = currentText.trim();
  return currentText;
}

function displayProcessedText(resultsAsHTML, repeatsAsHTML, wordCount) {
  displayDbNameInTab2(getWordCountForDisplay(wordCount));
  displayRepeatsList(repeatsAsHTML);
  displayWorkingText(resultsAsHTML);
}

function displayWorkingText(html) {
  if (V.isInPlaceEditing) {
    HTM.workingDiv.innerHTML = html;
    setCursorPos(document.getElementById(CURSOR.id));
  } else {
    HTM.finalTextDiv.innerHTML = html;
  }
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
  if (typeof rawText === "object") return;
  const text = normalizeRawText(rawText);
  // debug(">> has cursor?", text.indexOf(CURSOR.text))
  const chunkedText = splitText(text);
  const flatTextArr = findCompoundsAndFlattenArray(chunkedText);
  const [resultsAsTextArr, wordCount] = pushLookups(flatTextArr);
  const resultsAsHTML = buildMarkupAsHTML(resultsAsTextArr) + "<span> </span>";
  // debug(resultsAsHTML)
  const repeatsAsHTML = buildRepeatList(wordCount);
  return [resultsAsHTML, repeatsAsHTML, wordCount];
}

function displayRepeatsList(listOfRepeats) {
  HTM.repeatsList.innerHTML = listOfRepeats;
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
  // let indexOfCurrentWord = 0;
  let cursorFound = false;
  let wordToAdd;
  for (let phrase of raw_chunks) {
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
  // debug(rawText,arrayOfPhrases)
  return arrayOfPhrases;
}

function normalizeRawText(text) {
  return text
    .replace(/[\u2018\u2019']/g, " '") // ## replace curly single quotes
    .replace(/[\u201C\u201D]/g, '"')   // ## replace curly double  quotes
    .replace(/…/g, "...")
    .replace(/(\r\n|\r|\n)/g, "\n") // encode EOLs
    .replace(/\n{2,}/g, "\n")
    .replace(/\n/g, ` ${EOL.text} `) // encode EOLs
    .replace(/–/g, " -- ")  // pasted in em-dashes
    .replace(/—/g, " - ")
    .replace(/(\w)\/(\w)/g, "$1 / $2")
    .replace(/\s{2,}/gm, " ");
}

function splitTextIntoPhrases(text) {
  // ## used ^^ as replacement markers to keep separate from @EOL@, @CSR@ etc.
  text = text.trim();
  // ## separate out digits
  // # should catch any of: 10, 99%, 10.5, 6,001, 99.5%, 42.1%, $14.95, 20p, 2,000.50th, years etc.
  // text = text.replace(/([$£€¥₹]?((\d{1,3}(,\d{3})*(.\d+)?)|\d+)([%¢cp]|st|nd|rd|th)?)/g, "^^$1^^")
  text = text.replace(/(\b\d{4}\b|([$£€¥₹]?((\d{1,3}(,\d{3})*(\.\d+)?)|\d+)([%¢cp]|st|nd|rd|th)?))/g, "^^$1^^")
  // ## break at punctuation (include with digit)
  // text = text.replace(/(\^\^|^\d)([.,;():?!])\s+/gi, "$2^^")
  text = text.replace(/(\^\^|^\d)([.,;():?!])\s*/gi, "$2^^")
  text = text.replace(/\^{4,}/g, "^^");
  text = text.split(/\s?\^\^\s?/);
  text = text.filter(el => el !== '');
  // debug(text)
  return text;
}

function findCompoundsAndFlattenArray(chunks) {
  let flatArray = [];
  for (let chunk of chunks) {
    /* for each word, checks normalized words to end of chunk in search of compound match
    then adds this as a match
    "tail" is the sequence of words in a chunk (punctuation delimited block) as an array.
    The function iterates through it, removing the first word each time
    */
    // console.log("chunk:",chunk)
    for (let word_i = 0; word_i <= chunk.length - 1; word_i++) {
      let tail = [];
      for (let j = word_i; j < chunk.length; j++) {
        tail.push(chunk[j][0])
      }
      let matches = [];
      const flattenedTail = tail.join("").replace(/-/g, "");
      // console.log("tail:",flattenedTail)
      for (let compound in V.currentDb.compounds) {
        if (flattenedTail.startsWith(compound)) {
          const c_id = V.currentDb.compounds[compound];
          pushMatch(matches, c_id);
        }
      }
      chunk[word_i].push(matches);
    }
    // ## required so that all wordArrs have matches ready for the next stage
    chunk[chunk.length - 1].push([]);
    flatArray.push(...chunk);
  }
  // debug(flatArray)
  return flatArray;
}

function pushMatch(matches, id) {
  matches.push([id, updateWordStats(id)]);
  return this;
}

function pushLookups(textArr) {
  /* textArr = array of [normalized, raw]
  return => processedTextArr, array of [normalized-word, raw-word, [[matched-ID, duplicate-count], ...]]
    Words are counted + line breaks dealt with
    Normalized word sent to be checked against wordlist
    WordStats records the number of times a word is repeated: {word-id: count}
  */
  let processedTextArr = [];
  let wordCount = 0;
  let matches = [];
  // ## capture EOL and insert line breaks
  for (const wordArr of textArr) {
    let [word, rawWord, preMatchArr] = wordArr;
    // const word = wordArr[0];
    const matchedIDs = [];
    if (word === EOL.text) {
      processedTextArr.push([word]);
    } else {
      matches = lookupWord(wordArr);
      if (word) wordCount++;
      for (let id of matches) {
        // ## do not check compounds (already checked)
        if (!id) continue;
        if (V.currentDb.db[id] && V.currentDb.db[id][C.isCOMPOUND]) continue;
        const match = getDbEntry(id);
        // ## don't count contractions as separate words
        if (["contraction"].includes(match[C.POS])) { wordCount-- };
        if (!V.currentDb.compounds[word]) pushMatch(matchedIDs, id);
      }
      // ## filter out matched compounds without spaces
      preMatchArr.push(...matchedIDs);
      processedTextArr.push([word, rawWord, preMatchArr]);
    }
  }
  return [processedTextArr, wordCount];
}

function updateWordStats(id) {
  if (!V.wordStats[id]) {
    V.wordStats[id] = 1;
  } else if (!["contraction", "unknown", "digit"].includes(getDbEntry(id)[C.POS])) {
    V.wordStats[id]++;
  }
  return V.wordStats[id];
}

function markOfflist(word, type) {
  // ## adds entry to offlistDb & returns ID (always negative number)
  // ## This creates a dummy dB entry for offlist words
  let offlistEntry = [];
  let offlistID;
  let isUnique = true;
  for (const i in V.offlistDb) {
    if (V.offlistDb[i][C.LEMMA] === word) {
      isUnique = false;
      // offlistEntry = V.offlistDb[i];
      offlistID = V.offlistDb[i][0];
      break;
    }
  }
  if (isUnique) {
    offlistID = -(V.offlistIndex);
    // offlistEntry = [-(V.offlistIndex), word, type, [LOOKUP.offlist_subs.indexOf(type) + LOOKUP.level_headings.length], ""];
    offlistEntry = [offlistID, word, type, [LOOKUP.offlist_subs.indexOf(type) + LOOKUP.level_headings.length], ""];
    V.offlistDb.push(offlistEntry);
    V.offlistIndex++
  }
  // return offlistEntry[0];
  return [offlistID];
}

function lookupWord([word, rawWord]) {
  if (LOOKUP.symbols.includes(rawWord)) {
    word = rawWord;
  }
  let matches = dbLookup(word);
  matches = lookupDerivations([word, rawWord], matches);
  return matches;
}


function lookupDerivations([word, rawWord], matches = []) {
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

  for (const guess of [
    checkDigits,
    checkUnknown,
    checkSymbols,
    checkContractions,
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
    checkRegAdv,
  ]) {
    const result = guess(word);
    if (result) {
      matches.push(...result);
      break;
    }
  }

  // ## -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
  const result = checkFinalS(word);
  if (result) {
    matches.push(...result);
  }

  if (!matches.length) {
    matches.push(markOfflist(word, "offlist"));
  }
  return dedupeArray(matches);
}

function dedupeArray(array) {
  return [...new Set(array)];
}

function checkDigits(word) {
  if (word.match(/(\d+|\d+,\d+|\d+\.\d+|\d+,\d+\.d+)/i)) {
    return markOfflist(word, "digit");
  }
}

function checkUnknown(word) {
  if (!word.match(/[a-z]/i)) {
    return markOfflist(word, "unknown");
  }
}

function checkSymbols(word) {
  if (LOOKUP.symbols.includes(word)) {
    return markOfflist(word, "symbol");
  }
}

function checkContractions(word) {
  if (LOOKUP.contractions.includes(word)) {
    return markOfflist(word, "contraction");
  }
}

function checkNames(word) {
  if (LOOKUP.personalNames.includes(word)) {
    return markOfflist(word, "personal name");
  }
}

function checkArticle(word) {
  if (word === "an") {
    return dbLookup("a");
  }
}

function checkIrregularNegatives(word) {
  const lookup = LOOKUP.irregNegVerb[word];
  if (lookup) {
    return winnowPoS(dbLookup(lookup), ["x", "v"]);
  }
}

function checkIrregularVerbs(word) {
  const lookup = LOOKUP.irregVerb[word];
  if (lookup) {
    return winnowPoS(dbLookup(lookup), ["x", "v"]);
  }
}

function checkIrregularPlurals(word) {
  const lookup = LOOKUP.irregPlural[word];
  if (lookup) {
    return winnowPoS(dbLookup(lookup), ["n"]);
  }
}

function checkForeignPlurals(word) {
  if (word.length <= 2) return;
  for (const [plural, singular] of LOOKUP.foreign_plurals) {
    const root = word.slice(0, -plural.length);
    const ending = word.slice(-plural.length);
    if (ending === plural) {
      const lookup = dbLookup(root + singular);
      if (lookup.length) {
        return winnowPoS(lookup, ["n"]);
      }
    }
  }
}

function checkVing(word) {
  if (word.endsWith("ing")) {
    return winnowPoS(findBaseForm(word, LOOKUP.g_subs), ["v"]);
  }
}

function checkVpp(word) {
  if (word.endsWith("ed")) {
    return winnowPoS(findBaseForm(word, LOOKUP.d_subs), ["v"]);
  }
}

function checkSuperlatives(word) {
  if (word.endsWith("st")) {
    return winnowPoS(findBaseForm(word, LOOKUP.est_subs), ["j"]);
  }
}

function checkComparatives(word) {
  if (word.endsWith("r")) {
    return winnowPoS(findBaseForm(word, LOOKUP.er_subs), ["j"]);
  }
}

function checkFinalS(word) {
  if (word.endsWith("s")) {
    // ## pronouns ("r") included to allow 'others'
    return winnowPoS(findBaseForm(word, LOOKUP.s_subs), ["n", "v", "r"]);
  }
}

function checkRegAdv(word) {
  if (word.endsWith("ly")) {
    return winnowPoS(findBaseForm(word, LOOKUP.y_subs), ["j"]);
  }
}

function winnowPoS(roughMatches, posArr) {
  // ## returns array, empty or otherwise
  let localMatches = [];
  for (const id of roughMatches) {
    const match = getDbEntry(id);
    for (const pos of posArr) {
      if (match && match[C.POS].includes(pos)) localMatches.push(id);
    }
  }
  return localMatches;
}

function getDbEntry(id) {
  // ## a negative id signifies an offlist word
  if (id === undefined) return;
  id = parseInt(id);
  const dB = (id >= 0) ? V.currentDb.db : V.offlistDb;
  id = Math.abs(id);
  return dB[id];
}

function buildMarkupAsHTML(textArr) {
  // debug(textArr)
  /* ## textArr = array of [normalized-word, raw-word, [[matched-id, occurence]...]]
  for each word, repeat the raw-word for each match, but with different interpretations
  */
  let htmlString = "";
  let isFirstWord = true;
  let wasEOL = false;
  let wordIndex = 0;
  for (let [word, rawWord, wordInfo] of textArr) {
    // debug("wordInfo for:", word, wordInfo)
    if (word === EOL.text) {
      htmlString += EOL.HTMLtext;
      wasEOL = true;
      continue;
    }
    rawWord = escapeHTMLentities(rawWord);
    let leaveSpace = " ";
    if ((wordInfo[0] && getDbEntry(wordInfo[0][0])[2] == "contraction") || isFirstWord || wasEOL) {
      leaveSpace = "";
    }
    isFirstWord = false;
    // ## duplicateCount = running total; totalRepeats = total
    const matches = wordInfo;
    let matchCount = 0;
    for (const [id, count] of matches) {
      if (!word) continue;
      const match = getDbEntry(id);
      let displayWord = "";
      const ignoreRepeats = LOOKUP.repeatableWords.includes(match[C.LEMMA]);
      const levelArr = match[C.LEVEL];
      const levelNum = levelArr[0];
      const levelClass = "level-" + getLevelPrefix(levelNum);
      const totalRepeats = V.wordStats[id];
      let duplicateClass = "";
      const duplicateCount = count;
      const relatedWordsClass = ` all_${id}`;
      let anchor = "";
      let showDuplicateCount = "";
      // debug(totalRepeats, match[C.LEMMA], ignoreRepeats)
      if (totalRepeats > 1 && !ignoreRepeats) {
        duplicateClass = " duplicate";
        // showDuplicateCount = "<sup>" + totalRepeats + "</sup>";
        showDuplicateCount = ' data-reps="' + totalRepeats + '"';
        anchor = ` id='all_${id}_${duplicateCount}'`;
      }
      // if (isWithoutCursor && V.isInPlaceEditing) {
      if (V.isInPlaceEditing && matchCount === 0) {
        const [word_i, char_i] = V.cursorPosInTextArr;
        if (wordIndex === word_i) {
          rawWord = rawWord.slice(0, char_i) + CURSOR.HTMLtext + rawWord.slice(char_i);
        }
      }
      let localWord = highlightAwlWord(levelArr, rawWord);
      displayWord = `${leaveSpace}<span data-entry="${id}:${word}" class="${levelClass}${relatedWordsClass}${duplicateClass}"${showDuplicateCount}${anchor}>${localWord}</span>`;
      if (matchCount > 0) {
        if (matchCount < matches.length) displayWord = " /" + (leaveSpace ? "" : " ") + displayWord;
        displayWord = "<mark>" + displayWord + "</mark>";
      }
      htmlString += displayWord;
      matchCount++;
      wasEOL = false;
    }
    wordIndex++;
  }
  // ## add this to even up </p><p> added in in lieu of EOLs
  // htmlString = "<p>" + htmlString + "</p>";
  return htmlString;
}

function escapeHTMLentities(text) {
  return text.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getLevelPrefix(level_num) {
  let level = V.level_subs[level_num];
  if (V.isKids && level_num < V.OFFLIST) level = "k";
  return level[0];
}

function buildRepeatList(wordCount) {
  let countReps = 0;
  let listOfRepeats = "";
  if (!wordCount) {
    V.wordStats = {};
  } else {
    for (const key of Object.keys(V.wordStats).sort(compareByLemma)) {
      const entry = getDbEntry(key);
      const word = entry[C.LEMMA];
      const level_arr = entry[C.LEVEL];
      if (
        V.wordStats[key] > 1 &&
        !LOOKUP.repeatableWords.includes(word) &&
        !LOOKUP.symbols.includes(word)
      ) {
        countReps++;
        let anchors = "";
        for (let repetition = 1; repetition <= V.wordStats[key]; repetition++) {
          let display = repetition;
          let displayClass = 'class="anchors" ';
          if (repetition === 1) {
            display = highlightAwlWord(level_arr, word);
            displayClass = `class="level-${getLevelPrefix(level_arr[0])}" `;
          }
          anchors += ` <a href="#" ${displayClass}onclick="jumpToDuplicate('all_${key}_${repetition}'); return false;">${display}</a>`;
        }
        listOfRepeats += `<p data-entry="${key}" class='duplicate all_${key} level-${getLevelPrefix(level_arr[0])}'>${anchors}</p>`;
      }
    }
    let repeatsHeader;
    if (countReps) {
      repeatsHeader = `<p id='all_repeats'><strong>${countReps} repeated word${(countReps === 1) ? "" : "s"}:</strong><br><em>Click on word / number to jump to that occurance.</em></p>`
      listOfRepeats = `${repeatsHeader}<div id='repeats'>${listOfRepeats}</div>`;
    } else {
      listOfRepeats = "<p id='all_repeats'><strong>There are no significant repeated words.</strong></p>";
    }
  }
  return listOfRepeats
}

function compareByLemma(a, b) {
  const lemmaA = getDbEntry(a)[C.LEMMA].toLowerCase();
  const lemmaB = getDbEntry(b)[C.LEMMA].toLowerCase();
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
  HTM.finalLegend.innerHTML = `Checking against <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
}

function dbLookup(word) {
  // ## returns empty array or array of matched IDs [4254, 4255]
  if (typeof word !== "string") throw new Error("Search term must be a string.")
  if (!word) return [];
  word = word.toLowerCase();
  const searchResults = V.currentDb.db
    .filter(el => el[C.LEMMA].toLowerCase() === word)
    .map(el => el[C.ID]);
  return searchResults;
}


function findBaseForm(word, subs) {
  /* Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
  */
  let localMatches = [];
  const candidates = new Set();
  const toSuffix = -(subs["_suffix"].length);
  for (const key in subs) {
    const i = -(key.length);
    const suffix = subs[word.slice(i)];
    if (suffix != undefined) {
      candidates.add(word.slice(0, i) + suffix);
    }
  }
  candidates.add(word.slice(0, toSuffix));
  for (const candidate of candidates) {
    const tmp_match = dbLookup(candidate);
    if (tmp_match.length) localMatches.push(...tmp_match);
  }
  return localMatches;
}

function clearTab2() {
  HTM.workingDiv.innerText = "";
  HTM.finalTextDiv.innerHTML = "";
  // HTM.finalLegend.innerHTML = displayDbNameInTab2();
  HTM.finalInfoDiv.innerText = "";
  HTM.repeatsList.innerText = "";
  displayDbNameInTab2();
  resetBackup();
}

// function isNumeric(n) {
//   return (typeof n === 'number' || !isNaN(parseInt(n)))
// }


// ## SLIDER code ############################################

function changeFont(e) {
  // console.log("font",e.target.value)
  const fontSize = e.target.value + "px";
  HTM.root_css.style.setProperty("--font-size", fontSize);
}

function changeRefresh(e) {
  V.isAutoRefresh = parseInt(e.target.value) === 1;
  localStorage.setItem(C.SAVE_REFRESH_STATE_BOOL, V.isAutoRefresh);
  setRefreshButton();
  // debug("is auto-refresh", V.isAutoRefresh, e.target.value, localStorage.getItem(C.SAVE_REFRESH_STATE))
}

function setRefreshButton() {
  // HTM.toggleRefresh.value = (V.isAutoRefresh) ? "1" : "0";
  if (V.isAutoRefresh || isFirstTab()) {
    // if (!HTM.selectRefresh.firstElementChild.disabled) HTM.selectRefresh.selectedIndex = 0;
    HTM.selectRefresh.selectedIndex = 0;
    hideRefreshButton();
  } else {
    HTM.selectRefresh.selectedIndex = 1;
    showRefreshButton();
    forceUpdateInputDiv();
  }
}

function hideRefreshButton() {
  HTM.refreshButton.style.display = "none";
}

function showRefreshButton() {
  HTM.refreshButton.style.display = "block";
}

function setEditingMode(e) {
  if (e) {
    V.isInPlaceEditing = Boolean(parseInt(e.target.value));
    localStorage.setItem(C.SAVE_EDIT_STATE_BOOL, V.isInPlaceEditing);
  }
  // debug("is in-place editing?", V.isInPlaceEditing)
  if (V.isInPlaceEditing) {
    HTM.finalTextDiv.innerHTML = "";
    // ## In-place editing is very glitchy in autorefresh mode!
    V.isAutoRefresh = false;
    setRefreshButton();
    forceUpdateInputDiv();
  } else {
    HTM.workingDiv.innerText = convertMarkupToText(HTM.workingDiv);
  }
  setRefreshModeOption();
  addEditModeListeners();
  toggleFinalTextDiv();
  forceUpdateInputDiv();
}

function setRefreshModeOption() {
  // ## Greys out the autorefresh option
  if (V.isInPlaceEditing) {
    HTM.selectRefresh.firstElementChild.disabled = true;
  } else {
    HTM.selectRefresh.firstElementChild.disabled = false;
  }
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

function toggleFinalTextDiv() {
  // HTM.finalTextDiv.style.flexGrow = (V.isInPlaceEditing) ? "0" : "1";
  if (V.isInPlaceEditing) {
    HTM.finalTextDiv.style.display = "none";
  } else {
    // HTM.finalTextDiv.style.display = "flex";
    HTM.finalTextDiv.style.display = "block";
    // HTM.finalTextDiv.style.flexGrow = 1;
  }
}

function jumpToDuplicate(id) {
  // ## clean up previous highlights
  const cssClass = "jumpHighlight";
  for (element of document.getElementsByClassName(cssClass)) {
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
  setAppStateToDefault();
  V.currentTab = C.DEFAULT_tab;
  clearTab1();
  clearTab2();
  HTM.selectDb.value = C.DEFAULT_db;
  V.isAutoRefresh = C.DEFAULT_is_autorefresh;
  V.isInPlaceEditing = C.DEFAULT_is_inplace_edit;

  setRefreshButton();
  setRefreshModeOption();
  setTab(V.currentTab);
  setDb_shared(C.DEFAULT_db);
}

function setAppStateToDefault() {
  localStorage.setItem(C.SAVE_DB_STATE, C.DEFAULT_db);
  localStorage.setItem(C.SAVE_ACTIVE_TAB_INDEX, C.DEFAULT_tab);
  localStorage.setItem(C.SAVE_REFRESH_STATE_BOOL, C.DEFAULT_is_autorefresh);
  localStorage.setItem(C.SAVE_EDIT_STATE_BOOL, C.DEFAULT_is_inplace_edit);
}

function retrieveAppState() {
  return [
    localStorage.getItem(C.SAVE_DB_STATE),
    localStorage.getItem(C.SAVE_ACTIVE_TAB_INDEX),
    localStorage.getItem(C.SAVE_REFRESH_STATE_BOOL),
    localStorage.getItem(C.SAVE_EDIT_STATE_BOOL)
  ];
}


function setDb_shared(e) {
  let choice = (e.target) ? e.target.value : e;
  // choice = parseInt(choice);
  V.currentDbChoice = parseInt(choice);
  // debug("currentDbChoice", V.currentDbChoice)
  V.currentDb = [];
  if (V.currentDbChoice === C.GEPT) {
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
  } else if (V.currentDbChoice === C.BESTEP) {
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
  V.currentDb.compounds = buildListOfCompoundWords(V.currentDb.db);
  for (let key in V.currentDb.css) {
    const property = key[0] == "_" ? `--${key.slice(1)}` : key;
    HTM.root_css.style.setProperty(property, V.currentDb.css[key]);
  }
  setDb_tab2();
  setDb_tab1();
  localStorage.setItem(C.SAVE_DB_STATE, V.currentDbChoice);
}

function isGEPT() {
  return V.currentDbChoice === C.GEPT;
}

function isBESTEP() {
  return V.currentDbChoice === C.BESTEP;
}

function isKids() {
  return V.currentDbChoice === C.Kids;
}

function buildListOfCompoundWords(dB) {
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
    const word = entry[C.LEMMA].toLowerCase();
    const id = entry[C.ID];
    const splitWord = word.split(/[-'\s]/g);
    if (splitWord.length > 1) {
      const newCompound = splitWord.join("");
      entry[C.isCOMPOUND] = true;
      compounds[newCompound] = id;
    }
  }
  return compounds;
}

function setDb_tab1() {
  displayDbNameInTab1();
  // ## Allows for multiple elements to be toggled
  for (let el of V.currentDb.show) {
    el.style.setProperty("display", "block");
  }
  for (let el of V.currentDb.hide) {
    el.style.setProperty("display", "none");
  }
  submitWordSearchForm();
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
  // console.log(`* ${debug.caller.name.toUpperCase()}: `, params);
  // console.log(">", arguments.callee.caller.toString().match(/showMe\((\S)\)/)[1])
  console.log(`DEBUG: ${debug.caller.name}> `, params);
}

// ## TABS ############################################

function setTab(tab) {
  tab = (tab.target) ? tab.target : HTM.tabHead.children[tab];
  let i = 0;
  for (const content of HTM.tabBody.children) {
    if (tab === HTM.tabHead.children[i]) {
      V.currentTab = i;
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
  // if (isFirstTab()) {
  //   // safeStyleDisplay(HTM.toggleRefresh);
  //   // safeStyleDisplay(HTM.toggleEditMode);
  //   HTM.selectRefresh.style.display = "none";
  //   HTM.selectEditMode.style.display = "none";
  //   HTM.backupButton.style.display = "none";
  //   HTM.backupSave.style.display = "none";
  //   displayDbNameInTab1();
  // } else {
  //   // safeStyleDisplay(HTM.toggleRefresh, "block");
  //   // safeStyleDisplay(HTM.toggleEditMode, "block");
  //   HTM.selectRefresh.style.display = "block";
  //   HTM.selectEditMode.style.display = "block";
  //   HTM.backupButton.style.display = "block";
  //   HTM.backupSave.style.display = "block";
  //   displayDbNameInTab2();
  // }
  setTabHead();
  localStorage.setItem(C.SAVE_ACTIVE_TAB_INDEX, V.currentTab);
  setRefreshButton();
  displayInputCursor();
}

function safeStyleDisplay(el, displayState = "none") {
  try {
    el.style.display = displayState;
  } catch (error) {
    debug(error)
  }
  // if (el.hasOwnProperty("style")) el.style.display = displayState;
}

function setTabHead() {
  let mode = (isFirstTab()) ? "none" : "block";
    HTM.selectRefresh.style.display = mode;
    HTM.selectEditMode.style.display = mode;
    HTM.backupButton.style.display = mode;
    HTM.backupSave.style.display = mode;
}

function isFirstTab() {
  // debug(">>>current tab=", V.currentTab, parseInt(V.currentTab) === 0)
  return parseInt(V.currentTab) === 0;
}

function displayInputCursor() {
  if (isFirstTab()) HTM.inputLemma.focus();
  else HTM.workingDiv.focus();
}


// ## IN-PLACE EDITING CODE######################################
// currently in upgrade.js
