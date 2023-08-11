// ## SETUP ############################################


initialize();
addListeners();


// TAB1 (words) CODE ## ############################################

// ***** INIT FUNCTIONS

function initialize() {
  let [
    dbState,
    tabState,
    refreshState,
    editState
  ] = retrieveAppState();
  // ## Apply defaults if nothing in storage
  dbState = (dbState) ? dbState : C.DEFAULT_db;
  tabState = (tabState) ? tabState : C.DEFAULT_tab;
  refreshState = (refreshState) ? refreshState : C.DEFAULT_refresh;
  editState = (editState) ? editState : C.DEFAULT_edit;
  // debug(`db:${dbState}, tab:${tabState}, isAutoRefresh: ${refreshState}, isIn-Place: ${editState}`)

  changeDb_shared(dbState);
  displayDbNameInTab2();

  V.currentTab = tabState;
  activateTab(HTM.tabHead.children[V.currentTab]);
  clearTab1();

  V.isAutoRefresh = (refreshState === "0");
  V.isInPlaceEditing = (editState === "0");
  // setEditModeListeners();
  toggleFinalTextDiv();

  // # update dropdown menu select options
  HTM.changeDb.value = dbState;
  HTM.toggleRefresh.value = refreshState;
  HTM.toggleEditMode.value = editState;
  toggleRefreshButton();
  refreshLabels("t1_form");
}

function addListeners() {
  document.getElementById("t1_theme_select");
  // .addEventListener("change", submitWordSearchForm);

  HTM.inputLemma.addEventListener("input", debounce(submitWordSearchForm, 500));

  for (const el of document.getElementsByTagName("input")) {
    if (el.type != "text") {
      const label = el.labels[0];
      if (label.htmlFor) label.addEventListener("click", registerLabelClick);
    }
  }
  // ## for tabs
  for (const el of document.getElementsByClassName("tab")) {
    el.addEventListener("click", activateTab);
  }
  // ## for refresh button
  HTM.clearButton.addEventListener("click", clearTab);
  HTM.resetButton.addEventListener("click", resetApp);

  // ## for refresh button + settings menu
  HTM.changeDb.addEventListener("change", changeDb_shared);
  HTM.changeFontSize.addEventListener("change", changeFont);
  HTM.toggleRefresh.addEventListener("change", changeRefresh);
  HTM.toggleEditMode.addEventListener("change", changeEditingMode);
  HTM.refreshButton.addEventListener("click", getUpdatedText);
  HTM.backupButton.addEventListener("click", showBackups);
  HTM.backupDialog.addEventListener("mouseleave", closeBackupDialog);
  HTM.backupSave.addEventListener("click", saveBackup);

  HTM.settingsMenu.addEventListener("mouseenter", dropdown);
  HTM.settingsMenu.addEventListener("mouseleave", dropdown);

  setEditModeListeners();
}

function setEditModeListeners(){
  // document.body.addEventListener("keydown", catchKeyboardCopyEvent);
  HTM.workingDiv.addEventListener("keydown", catchKeyboardCopyEvent);
  HTM.workingDiv.addEventListener("paste", normalizePastedText);

  if (V.isInPlaceEditing) {
    // debug("listeners set for in-place")
    // HTM.workingDiv.removeEventListener("paste", normalizePastedText);
    HTM.workingDiv.removeEventListener("input", debounce(getUpdatedText, 500))
    HTM.finalTextDiv.removeEventListener("mouseover", hoverEffects);
    HTM.finalTextDiv.removeEventListener("mouseout", hoverEffects);

    // ## "copy" only works from menu; add keydown listener to catch Ctrl_C
    // HTM.workingDiv.addEventListener("keydown", catchKeyboardCopyEvent);
    HTM.workingDiv.addEventListener("copy", removeMarkupFromCopiedText);
    HTM.workingDiv.addEventListener("keydown", saveCursorPos);
    // HTM.workingDiv.addEventListener("keyup", debounce(refreshGatekeeper, 500));
    HTM.workingDiv.addEventListener("keyup",refreshGatekeeper);
    HTM.workingDiv.addEventListener("mouseover", hoverEffects);
    HTM.workingDiv.addEventListener("mouseout", hoverEffects);
  }
  else {
    // debug("listeners set for 2-col")
    // HTM.workingDiv.removeEventListener("keydown", catchKeyboardCopyEvent);
    HTM.workingDiv.removeEventListener("copy", removeMarkupFromCopiedText);
    HTM.workingDiv.removeEventListener("keydown", saveCursorPos);
    // HTM.workingDiv.removeEventListener("keyup", debounce(refreshGatekeeper, 500));
    HTM.workingDiv.removeEventListener("keyup",refreshGatekeeper);
    HTM.workingDiv.removeEventListener("mouseover", hoverEffects);
    HTM.workingDiv.removeEventListener("mouseout", hoverEffects);

    // HTM.workingDiv.addEventListener("paste", normalizePastedText);
    HTM.workingDiv.addEventListener("input", debounce(refreshGatekeeper, 500))
    HTM.finalTextDiv.addEventListener("mouseover", hoverEffects); //
    HTM.finalTextDiv.addEventListener("mouseout", hoverEffects); //
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
  const swap = JSON.parse(JSON.stringify(HTM.workingDiv.innerText));
  const restoredContent = localStorage.getItem(id);
  if (!restoredContent) return;
  HTM.workingDiv.innerText = normalizeRawText(restoredContent);
  getUpdatedText();
  if (swap) localStorage.setItem(id, swap);
  closeBackupDialog("backup-dlg");
}

function updateBackup(id) {
  // ## current logic: 0=from last refresh, 1=regularly updated (if longer than prev)
  if (localStorage.getItem(id)) {
    let newContent = HTM.workingDiv.innerText.trim();
    if (!newContent) return;
    for (let other of C.backupIDs) {
      // ## don't hold duplicate backups
      if (id != other && newContent == localStorage.getItem(other)) return;
    }
    if (localStorage.getItem(id).length < newContent.length) window.localStorage.setItem(id, newContent)
    localStorage.setItem("mostRecent", id);
  } else {
    localStorage.setItem(id, " ")
  }
}

function resetBackup() {
  // ## logic: put current OR most recent change in first backup (2nd backup is constantly updated)
  let mostRecent = HTM.workingDiv.innerText.trim();
  if (!mostRecent) mostRecent = localStorage.getItem(localStorage.getItem("mostRecent"));
  if (!mostRecent || !mostRecent.trim().length) return;
  localStorage.setItem(C.backupIDs[0], mostRecent);
  localStorage.setItem("mostRecent", C.backupIDs[0]);
  localStorage.setItem(C.backupIDs[1], "");
}

function saveBackup() {
  const currentText = HTM.workingDiv.innerText;
  if (currentText && currentText.trim() !== localStorage.getItem(C.backupIDs[1])) {
    localStorage.setItem(C.backupIDs[1], currentText.trim());
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

function registerLabelClick(e_label) {
  const label = e_label.target;
  if (label.htmlFor) {
    const input = document.getElementById(label.htmlFor);
    let parentID = label.htmlFor.split("_")[1];
    //console.log(`*registerLabelClick* parentID=${parentID}`);
    if (!parentID) {
      return;
    } else {
      parentID = "t1_" + parentID;
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
  const data = getFormData(e);
  let errorMsg = checkFormData(data);
  let resultsCount = 0;
  let resultsArr = [];
  let HTMLstringToDisplay = "";
  if (!errorMsg) {
    resultsArr = executeFormDataLookup(data);
    resultsCount = resultsArr.length;
    // HTMLstringToDisplay = formatResultsAsHTML(resultsArr);
    if (!resultsCount) errorMsg = "No matches found for this term."
  }
  if (errorMsg) {
    HTMLstringToDisplay = `<p class='error'>${errorMsg}</p>`;
  } else {
    HTMLstringToDisplay = formatResultsAsHTML(resultsArr);
  }
  displayWordSearchResults(HTMLstringToDisplay, resultsCount);
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
  for (let [key, value] of raw_data) {
    // ## default value of html option (but screws up db lookup)
    if (value === "-1") value = "";
    // ## ignore form elements that aren't required for current dB
    if (key === "level" && V.currentDb.isKids) continue;
    if (key === "theme" && (V.currentDb.isGEPT || V.currentDb.isBEST)) continue;
    if (key === "awl" && (V.currentDb.isGEPT || V.currentDb.isKids)) continue;
    const digit = parseInt(value);
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
  // console.log({status},errorMsg, data)
  return errorMsg;
}

// function isEmptySearch(searchTerms) {
//   for (let el in searchTerms) {
//     if (el === "match") {
//       isContains = searchTerms[el].includes("contains");
//       console.log("in match:", searchTerms[el], isContains)
//       continue;
//     }
// if (searchTerms[el].length) return false;
//   }
//   return true;
// }

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
  // console.log("get results for term:", find.term,results.length, results)
  // console.log("get results for term:", find, find.level.length || find.awl.length || find.pos.length)
  results = results.concat(getDerivedForms(find.term).map(el => getDbEntry(el)));
  if (find.level.length) {
    results = results.filter(el => find.level.indexOf(el[C.LEVEL][0]) > -1);
  }
  if (find.pos.length) {
    results = results.filter(el => el[C.POS]).filter(el => el[C.POS].search(find.pos) != -1);
  }
  if (V.isBEST && find.awl && find.awl.length) {
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
  // console.log("refined search results",results)
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
  return (V.isBEST && level_arr[1]) ? level_arr[1] - C.awl_level_offset : -1;
}
function highlightAwlWord(level_arr, word) {
  return (V.isBEST & level_arr[1] > -1) ? `<span class="awl-word">${word}</span>` : word;
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
    // const pos = `[${entry[C.POS].trim()}]`;
    const pos = `[${expandPos(entry)}]`;
    // const awl_indicator = (awl_sublist >= 0) ? `; AWL${awl_sublist}` : "";
    let level = V.level_subs[level_arr[0]];
    if (awl_sublist >= 0) level += `; AWL${awl_sublist}`;
    if (!level) continue;
    let [note, awl_note] = getNotes(entry);
    const col2 = `${lemma} <span class="show-pos">${pos}</span> <span class="show-level">${level}</span>${note}${awl_note}`;
    let class2 = (V.currentDb.isKids) ? "level-e" : `level-${level[0]}`;
    output += formatResultsAsTablerows(`${i + 1}`, col2, "", class2);
    previousInitial = currentInitial;
    i++;
  }
  return "<table>" + output + "</table>";
}

function getNotes(entry) {
  let [note, awl_note] = entry[C.NOTE].trim().split(C.NOTE_SEP);
  note = note ? `, ${note}` : "";
  awl_note = (V.isBEST && awl_note) ? ` <span class="awl-note">(headword: <span class="awl-headword">${awl_note}</span>)</span>` : "";
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

// HTM.finalInfoDiv.style.display = "none";
// // HTM.finalLegend.innerHTML = displayDbNameInTab2();
// displayDbNameInTab2();

// ## TAB2 (text) CODE ############################################

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
  // const pos = `[${entry[C.POS]}]`;
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
  // paste = paste.replace(/[\n\r]+/g, "\n\n");
  paste = normalizeRawText(paste);
  paste = paste.replace(` ${EOL.text} `,"\n");
  selection.getRangeAt(0).insertNode(document.createTextNode(paste));
  getUpdatedText(e);
  // resetBackup();
  saveBackup();
}

function catchKeyboardCopyEvent(e) {
  // let isV = (e.keyCode === 86 || e.key === "v"); // this is to detect keyCode
  let isC = (e.keyCode === 67 || e.key === "c"); // this is to detect keyCode
  let isCtrl = (e.keyCode === 17 || e.key === "Control");
  let isMeta = (e.keyCode === 91 || e.key === "Meta");
  if (isC && (e.metaKey || e.ctrlKey)){
      // debug("kachink! Meta_C was pressed!")
      removeMarkupFromCopiedText();
  }
}

function refreshGatekeeper(e) {
  // debug("autorefresh",V.isAutoRefresh);
  if (V.isAutoRefresh) {
    getUpdatedText(e);
  }
}

function getUpdatedText(e) {
  // debug("isInPlaceEditing?", V.isInPlaceEditing)
  if (V.isInPlaceEditing) {
    [
      V.cursorOffset,
      V.cursorOffsetNoMarks,
    ] = getCursorInfoInEl(HTM.workingDiv);
    // debug(V.isTextEdit,V.isInMark,e)
    // if (V.isTextEdit && !V.isInMark) {
      // ## changeEditMode sets e to "update" to ensure text is reprocessed
    if ((!V.isTextEdit || V.isInMark) && e !== "update") {
      // debug("reset cursor only")
      setCursorPosToStartOf(document.getElementById(CURSOR.id));
      return;
    } else {
      // debug("welcome to Oz");
      let revisedText = removeTagContentFromElement(HTM.workingDiv);
      if (!revisedText) return;
      revisedText = insertCursorPlaceholder(revisedText);
      const [
        resultsAsHTML,
        repeatsAsHTML,
        wordCount
      ] = processText(revisedText);
      displayTextSearchResults(resultsAsHTML, repeatsAsHTML, wordCount);
    }
  }
  else {
    let revisedText = HTM.workingDiv.innerText.trim();
    if (revisedText){
      const [
        resultsAsHTML,
        repeatsAsHTML,
        wordCount
      ] = processText(HTM.workingDiv.innerText);
      displayTextSearchResults(resultsAsHTML, repeatsAsHTML, wordCount);
    } else return;
  }
}

function displayTextSearchResults(resultsAsHTML, repeatsAsHTML, wordCount) {
  displayRepeatsList(repeatsAsHTML);
  displayDbNameInTab2(getWordCountForDisplay(wordCount));
  updateTextInputDiv(resultsAsHTML);
}

function updateTextInputDiv(html) {
  if (V.isInPlaceEditing) {
    HTM.workingDiv.innerHTML = html;
    setCursorPosToStartOf(document.getElementById(CURSOR.id));
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
  const text = rawText.trim();
  if (text) {
    const chunkedText = splitText(text);
    const flatTextArr = findCompoundsAndFlattenArray(chunkedText);
    const [resultsAsTextArr, wordCount] = addLookUps(flatTextArr);
    const resultsAsHTML = convertToHTML(resultsAsTextArr);
    const repeatsAsHTML = buildRepeatList(wordCount);
    return [resultsAsHTML, repeatsAsHTML, wordCount];
  }
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
  rawText = normalizeRawText(rawText);
  const raw_chunks = splitTextIntoPhrases(rawText);
  let arrayOfPhrases = [];
  let indexOfCurrentWord = 0;
  let cursorFound = false;
  for (let phrase of raw_chunks) {
    let arrayOfWords = [];
    for (let word of phrase.split(/\s+/)) {
      if (word.indexOf(EOL.text) >= 0) {
        arrayOfWords.push([EOL.text, EOL.HTMLtext]);
      } else {
        if (!cursorFound) {
          // # Save position of cursor externally so it can be reinserted after text parsing
          const indexOfCursorText = word.indexOf(CURSOR.text);
          if (indexOfCursorText >= 0) {
            V.cursorPosInTextArr = [
              indexOfCurrentWord,
              indexOfCursorText
            ];
            word = word.replace(CURSOR.text, "");
            cursorFound = true;
          }
          indexOfCurrentWord++;
        }
        let normalizedWord = word.replace(C.punctuation, "").toLowerCase();
        arrayOfWords.push([normalizedWord, word]);
      }
    }
    arrayOfPhrases.push(arrayOfWords);
  }
  return arrayOfPhrases;
}

function normalizeRawText(text) {
  return text
    .replace(/[\u2018\u2019']/g, " '") // ## replace curly single quotes
    .replace(/[\u201C\u201D]/g, '"')   // ## replace curly double  quotes
    .replace(/…/g, "...")
    .replace(/[\n\r]+/g, "\n")
    .replace(/[\n\r]/g, ` ${EOL.text} `) // encode EOLs
    .replace(/–/g, " -- ")  // pasted in em-dashes
    .replace(/—/g, " - ")
    .replace(/(\w)\/(\w)/g, "$1 / $2");
}

function splitTextIntoPhrases(text) {
  return text
    .trim()
    .replace(/([.,;():?!])\s+/gi, "$1@@") // ## break at punctuation
    // .replace(/(\d+\s*)/g, "@@$1@@")      // ## separate out digits
    .replace(/((\d+(\.|\,)?\d+|\d+)%?)/g, "@@$1@@")      // ## separate out digits
    // # should catch any of: 10, 99%, 10.5, 6,001, 99.5%, 42.1%
    .split("@@");
}

function findCompoundsAndFlattenArray(chunks) {
  let tmp = [];
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
          addMatch(matches, c_id);
        }
      }
      chunk[word_i].push(matches);
    }
    // ## required so that all wordArrs have matches ready for the next stage
    chunk[chunk.length - 1].push([]);
    tmp.push(...chunk);
  }
  return tmp;
}

function addLookUps(textArr) {
  /* textArr = array of [normalized, raw]
  return => processedTextArr, array of [normalized-word, raw-word, [[matched-ID, duplicate-count], ...]]
    Words are counted + line breaks dealt with
    Normalized word sent to be checked against wordlist
    WordStats records the number of times a word is repeated: {word-id: count}
  */
  let processedTextArr = [];
  let wordCount = 0;
  let matches = [];
  // ## capture EOL and insert <br>
  for (const wordArr of textArr) {
    const word = wordArr[0];
    let preMatchArr = wordArr[2];
    const matchedIDs = [];
    // if (word === "*EOL") {
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
        if (!V.currentDb.compounds[word]) addMatch(matchedIDs, id);
      }
      // ## filter out matched compounds without spaces
      preMatchArr.push(...matchedIDs);
      processedTextArr.push([word, wordArr[1], preMatchArr]);
    }
  }
  return [processedTextArr, wordCount];
}

function addMatch(matches, id) {
  matches.push([id, updateWordStats(id)]);
  return this;
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
  let tmp = "";
  let isUnique = true;
  for (const i in V.offlistDb) {
    if (V.offlistDb[i][C.LEMMA] === word) {
      isUnique = false;
      tmp = V.offlistDb[i];
      break;
    }
  }
  if (isUnique) {
    tmp = [-(V.offlistIndex), word, type, [LOOKUP.offlist_subs.indexOf(type) + LOOKUP.level_headings.length], ""];
    V.offlistDb.push(tmp);
    V.offlistIndex++
  }
  return tmp[0];
}

function lookupWord([word, rawWord]) {
  if (LOOKUP.symbols.includes(rawWord)){
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
  if (word.match(/\d/i)) {
    matches.push(markOfflist(word, "digit"));
    return matches;
  }
  else if (LOOKUP.symbols.includes(word)) {
    matches.push(markOfflist(word, "symbol"));
  }
  else if (!word.match(/[a-z]/i)) {
    matches.push(markOfflist(word, "unknown"));
    return matches;
  }
  else if (LOOKUP.contractions.includes(word)) {
    matches.push(markOfflist(word, "contraction"));
  }
  else if (LOOKUP.setOfCommonNames.has(word) && (rawWord[0] === rawWord[0].toUpperCase())) {
    matches.push(markOfflist(word, "proper name"))
  }
  else if (V.currentDb.language === "en") {
    // matches = dbLookup(word); ## remove as produces accidental recursions
    if (LOOKUP.irregNegVerb[word]) {
      /* ## test = hidden written stole lain */
      const candidate = dbLookup(LOOKUP.irregNegVerb[word])[0];
      // ## Check for GEPTKids to ensure word is in the very limited wordlist
      if (candidate) matches.push(candidate);
    }
    else if (LOOKUP.irregVerb[word]) {
      /* ## test = aren't won't cannot */
      const candidate = dbLookup(LOOKUP.irregVerb[word])[0];
      // ## Check for GEPTKids to ensure word is in the very limited wordlist
      if (candidate) matches.push(candidate);
    }
    if (word.slice(-3) === "ing") {
      /* ## test = "bobbing begging swimming buzzing picnicking hoping dying going flying" */
      addToMatches(word, matches, LOOKUP.g_subs, "v");

    }
    if (word.slice(-2) === "ed") {
      /* ## test = robbed gagged passed busied played visited */
      addToMatches(word, matches, LOOKUP.d_subs, "v");
    }
    if (!matches.length) {
      if (word.slice(-2) === "st") {
        /* ## test = "longest hottest prettiest closest soonest" */
        addToMatches(word, matches, LOOKUP.est_subs, "j");
      }
      else if (word.slice(-1) === "r") {
        /* ## test = "longer hotter prettier closer sooner" */
        addToMatches(word, matches, LOOKUP.er_subs, "j");
      }
      else if (word.slice(-1) === "s") {
        /* ## test: families tries potatoes scarves crises boxes dogs ## only noun/verb/pronoun can take '-s') */
        const candidates = findBaseForm(word, LOOKUP.s_subs);
        for (const id of candidates) {
          const candidate = getDbEntry(id);
          if (
            candidate.length > 0 &&
            // candidate[C.POS] !== "j"
            isArrayElementInOtherArray(
              ["n", "v","r"],
              candidate[C.POS]
              )
            ) {
            matches.push(id);
          }
        }
      }
      else if (word.slice(-2) === "ly") {
        /* ## test: happily clumsily annually finely sensibly sadly automatically */
        addToMatches(word, matches, LOOKUP.y_subs, "j");
      }
      else if (LOOKUP.irregPlural[word]) {
        /* ## test: indices, cacti, criteria, phenomena, radii, HTM.formulae, bases, children, crisis */
        matches.push(dbLookup(LOOKUP.irregPlural[word])[0]);
      }
      for (const match of checkForeignPlurals(word)) {
        matches.push(...match)
      }
      if (typeof matches[0] === 'undefined') {
        matches.push(markOfflist(word, "offlist"));
      }
    }
  }
  return matches;
}

function addToMatches(word, matches, lookup, pos) {
  for (const id of findBaseForm(word, lookup)) {
    const match = getDbEntry(id);
    if (match[C.POS].includes(pos)) matches.push(id);
  }
}

function getDbEntry(id) {
  // ## a negative id signifies an offlist word
  if (id === undefined) return;
  id = parseInt(id);
  const dB = (id >= 0) ? V.currentDb.db : V.offlistDb;
  id = Math.abs(id);
  return dB[id];
}

function convertToHTML(textArr) {
  /* ## textArr = array of [normalized-word, raw-word, [[matched-id, occurence]...]]
  for each word, repeat the raw-word for each match, but with different interpretations
  */
  let htmlString = "";
  let isFirstWord = true;
  let wasEOL = false;
  let wordIndex = 0;
  for (let wordArr of textArr) {
    let word = wordArr[0];
    // debug(word, word === EOL.text, wordIndex, wordIndex == V_SUPP.cursorPosInTextArr[0])
    if (word === EOL.text) {
      htmlString += EOL.HTMLtext;
      wasEOL = true;
      continue;
    }
    let rawWord = wordArr[1]
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    let leaveSpace = " ";
    if ((wordArr[2][0] && getDbEntry(wordArr[2][0][0])[2] == "contraction") || isFirstWord || wasEOL) {
      leaveSpace = "";
    }
    isFirstWord = false;
    // ## duplicateCount = running total; totalRepeats = total
    const matches = wordArr[2];
    let matchCount = 0;
    for (const [id, count] of matches) {
      const match = getDbEntry(id);
      let displayWord = "";
      const ignoreRepeats = LOOKUP.repeatableWords.includes(match[C.LEMMA]);
      const level_arr = match[C.LEVEL];
      const level_num = level_arr[0];
      const levelClass = "level-" + getLevelPrefix(level_num);
      const totalRepeats = V.wordStats[id];
      let duplicateClass = "";
      const duplicateCount = count;
      const relatedWordsClass = ` all_${id}`;
      let anchor = "";
      let showDuplicateCount = "";
      if (totalRepeats > 1 && !ignoreRepeats) {
        duplicateClass = " duplicate";
        // showDuplicateCount = "<sup>" + totalRepeats + "</sup>";
        showDuplicateCount = ' data-reps="' + totalRepeats + '"';
        anchor = ` id='all_${id}_${duplicateCount}'`;
      }
      // # Add in cursor marker
      if (V.isInPlaceEditing) {
        const [word_i, pos_i] = V.cursorPosInTextArr;
        if (wordIndex === word_i) {
          rawWord = rawWord.slice(0, pos_i) + CURSOR.HTMLtext + rawWord.slice(pos_i);
        }
      }
      let localWord = highlightAwlWord(level_arr, rawWord);
      const origLemma = (V.currentDb.db[id]) ? V.currentDb.db[id][C.LEMMA] : word;
      if (origLemma.search(/[-'\s]/) >= 0) {
        localWord = origLemma;
      }
      // debug(`localWord: ${localWord}, wordArr: ${wordArr}`)
      displayWord = `${leaveSpace}<span data-entry="${id}:${word}" class="${levelClass}${relatedWordsClass}${duplicateClass}"${showDuplicateCount}${anchor}>${localWord}</span>`;
      if (matchCount > 0 && matchCount < matches.length) displayWord = " /" + (leaveSpace ? "" : " ") + displayWord;
      if (matchCount > 0) {
        htmlString += `<mark>${displayWord}</mark>`;
      } else htmlString += displayWord;
      matchCount++;
      wasEOL = false;
    }
    wordIndex++;
  }
  htmlString = "<p>" + htmlString + "</p>";
  return htmlString;
}

function getLevelPrefix(level_num) {
  let level = V.level_subs[level_num];
  if (V.currentDb.isKids && level_num < V.OFFLIST) level = "k";
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
      listOfRepeats = "<p id='all_repeats'><strong>There are no significant repeated words</strong></p>";
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

function displayDbNameInTab2(msg) {
  if (!msg) msg = "";
  HTM.finalLegend.innerHTML = `Checking against <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
}

function dbLookup(word) {
  // ## returns array of matched IDs
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

function checkForeignPlurals(word) {
  let candidates = [];
  for (const ending of LOOKUP.foreign_plurals) {
    const len = ending[0].length;
    const guess = word.slice(0, -len) + ending[1];
    if (ending[0] === word.slice(-len)) {
      const result = dbLookup(guess);
      if (result.length) candidates.push(result)
    }
  }
  return candidates;
}

function clearTab2() {
  HTM.workingDiv.innerText = "";
  HTM.finalTextDiv.innerHTML = "";
  HTM.finalLegend.innerHTML = displayDbNameInTab2();
  HTM.finalInfoDiv.innerText = "";
  // HTM.finalInfoDiv.style.display = "none";
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
  V.isAutoRefresh = (e.target.value === "0");
  toggleRefreshButton();
  localStorage.setItem(C.SAVE_REFRESH_STATE, (V.isAutoRefresh) ? "0" : "1");
  getUpdatedText();
  // debug("is auto-refresh", V.isAutoRefresh, e.target.value, localStorage.getItem(C.SAVE_REFRESH_STATE))
}

function toggleRefreshButton() {
  // debug("isAutoRefresh:",V.isAutoRefresh)
  if (V.isAutoRefresh || isTab1()) {
    HTM.refreshButton.style.display = "none";
    HTM.refreshButtonSpacer.style.display = "none";
  } else {
    HTM.refreshButton.style.display = "block";
    HTM.refreshButtonSpacer.style.display = "block";
    getUpdatedText();
  }
}

function changeEditingMode(e) {
  V.isInPlaceEditing = (e.target.value === "0");
  localStorage.setItem(C.SAVE_EDIT_STATE, (V.isInPlaceEditing) ? "0" : "1");
  if (V.isInPlaceEditing) {
    HTM.finalTextDiv.innerHTML = "";
  } else {
    HTM.workingDiv.innerText = removeTagContentFromElement(HTM.workingDiv);
  }
  setEditModeListeners();
  getUpdatedText("update");
  toggleFinalTextDiv();
  // displayInputCursor();
  // debug("is in-place", V.isInPlaceEditing, e.target.value, localStorage.getItem(C.SAVE_EDIT_STATE))
}

function toggleFinalTextDiv() {
  HTM.finalTextDiv.style.flexGrow = (V.isInPlaceEditing) ? "0" : "1";
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
  } else console.log("eh-jumpToDupe", id)
}

// ## COMMON ELEMENTS ######################################

function clearTab(event) {
  event.preventDefault();
  if (isTab1()) {
    clearTab1();
  } else {
    clearTab2();
  }
  displayInputCursor();
}

function resetApp() {
  localStorage.setItem(C.SAVE_DB_STATE, C.DEFAULT_db);
  localStorage.setItem(C.SAVE_TAB_STATE, C.DEFAULT_tab);
  localStorage.setItem(C.SAVE_REFRESH_STATE, C.DEFAULT_refresh);
  localStorage.setItem(C.SAVE_EDIT_STATE, C.DEFAULT_edit);
  // V.currentTab = 0;
  V.currentTab = C.DEFAULT_tab;
  clearTab1();
  clearTab2();
  // HTM.changeDb.value = 0;
  HTM.changeDb.value = C.DEFAULT_db;
  HTM.toggleEditMode = C.DEFAULT_edit;
  HTM.toggleRefresh = C.DEFAULT_refresh;
  toggleRefreshButton();
  activateTab(HTM.tabHead.children[0]);
  changeDb_shared(0);
}

function retrieveAppState() {
  // localStorage.getItem(C.SAVE_DB_STATE);
  // localStorage.getItem(C.SAVE_TAB_STATE);
  // localStorage.getItem(C.SAVE_REFRESH_STATE);
  // localStorage.getItem(C.SAVE_EDIT_STATE);
  return [
    localStorage.getItem(C.SAVE_DB_STATE),
    localStorage.getItem(C.SAVE_TAB_STATE),
    localStorage.getItem(C.SAVE_REFRESH_STATE),
    localStorage.getItem(C.SAVE_EDIT_STATE)
  ];
}


function changeDb_shared(e) {
  let choice = (e.target) ? e.target.value : e;
  choice = parseInt(choice);
  V.currentDb = [];
  if (choice === parseInt(C.DEFAULT_db)) {
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
    V.isKids = false;
    V.isBEST = false;
    V.isGEPT = true;
  } else if (choice === 1) {
    let tmpDb = makeGEPTdb();
    V.currentDb = {
      name: "BEST",
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
    V.isKids = false;
    V.isBEST = true;
    V.isGEPT = false;
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
    V.isKids = true;
    V.isBEST = false;
    V.isGEPT = false;
  }
  V.currentDb.language = "en";
  V.currentDb.compounds = buildListOfCompoundWords(V.currentDb.db);
  for (let key in V.currentDb.css) {
    const property = key[0] == "_" ? `--${key.slice(1)}` : key;
    HTM.root_css.style.setProperty(property, V.currentDb.css[key]);
  }
  changeDb_text();
  changeDb_words();
  localStorage.setItem(C.SAVE_DB_STATE, choice);
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

function changeDb_words() {
  document.getElementById('db_name1').textContent = V.currentDb.name;
  // ## Allows for multiple elements to be toggled
  for (let el of V.currentDb.show) {
    el.style.setProperty("display", "block");
  }
  for (let el of V.currentDb.hide) {
    el.style.setProperty("display", "none");
  }
  submitWordSearchForm();
}

function changeDb_text() {
  const dbNameText = document.getElementById('db_name2');
  if (dbNameText) dbNameText.textContent = V.currentDb.name;
  getUpdatedText();
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

function debug(...params) {
  console.log(`* ${debug.caller.name.toUpperCase()}: `, params);
}

// ## TABS ############################################

// V.currentTab = localStorage.getItem(C.SAVE_TAB_STATE);
// V.currentTab = (V.currentTab) ? V.currentTab : "0";
// activateTab(HTM.tabHead.children[V.currentTab]);

function activateTab(tab) {
  if (tab.target) tab = tab.target
  // debug(tab)
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
  if (isTab1()) {
    // document.getElementById("set-refresh").style.display = "none";
    // if (HTM.toggleRefresh.hasOwnProperty("style")){
    //   HTM.toggleRefresh.style.display = "none";
    // }
    // if HTM.toggleEditMode.style.display = "none";
    safeStyleDisplay(HTM.toggleRefresh);
    safeStyleDisplay(HTM.toggleEditMode);
    HTM.backupButton.style.display = "none";
    HTM.backupSave.style.display = "none";
  } else {
    // document.getElementById("set-refresh").style.display = "block";
    // HTM.toggleRefresh.style.display = "block";
    // HTM.toggleEditMode.style.display = "block";
    safeStyleDisplay(HTM.toggleRefresh, "block");
    safeStyleDisplay(HTM.toggleEditMode, "block");
    HTM.backupButton.style.display = "block";
    HTM.backupSave.style.display = "block";
    displayDbNameInTab2();
    // HTM.workingDiv.focus();
  }
  toggleRefreshButton();
  localStorage.setItem(C.SAVE_TAB_STATE, V.currentTab);
  displayInputCursor();
}

function safeStyleDisplay(el, displayState="none") {
  if (el.hasOwnProperty("style")) el.style.display = displayState;
}

function isTab1() {
  return V.currentTab === 0;
}

function displayInputCursor(){
  if(isTab1()) HTM.inputLemma.focus();
  else HTM.workingDiv.focus();
}


// ## CURSOR HANDLING ######################################

function insertCursorPlaceholder(text) {
  return text.slice(0, V.cursorOffsetNoMarks) + CURSOR.text + text.slice(V.cursorOffsetNoMarks);
}

function getCursorInfoInEl(element) {
  let cursorOffset = 0;
  let cursorOffsetNoMarks = 0;
  // let divText = "";
  let isInMark = false;
  let sel = window.getSelection();
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
  V.isTextEdit = (e.key) ? e.key === "Backspace" || e.key.length === 1 : false;
  [, , V.isInMark] = getCursorInfoInEl(HTM.workingDiv);
  // console.log("\n")
  // debug("updated cursor pos:", e.key, V_SUPP.cursorOffset, V_SUPP.cursorOffsetNoMarks)
  // console.log(">>", V_SUPP.cursorOffset, "<<", V_SUPP.isInMark, V_SUPP.isKeyText, e.key);
  // ## discard new text if cursor is in non-editable area (i.e. in <mark>)
  if (V.isInMark && V.isTextEdit) {
    e.preventDefault();
  }
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

function removeMarkupFromCopiedText(e) {
  if (!e) {
    e = new ClipboardEvent('paste', { clipboardData: new DataTransfer() });
  }
  const sel = document.getSelection();
  // debug(sel)
  const copiedText = document.createRange();
  copiedText.setStart(sel.anchorNode, sel.anchorOffset);
  copiedText.setEnd(sel.focusNode, sel.focusOffset);
  // event.clipboardData.setData("text/plain", sel.toString().toUpperCase());
  let normalizedText = getCopyWithoutMarks(copiedText).replace(EOL.text, "\n");
  normalizedText = normalizedText.replace(/\s{2,}/gm, " ");
  e.clipboardData.setData("text/plain", normalizedText);
  e.preventDefault();
}