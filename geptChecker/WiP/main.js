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
}

function updateDropdownMenuOptions() {
  HTM.selectDb.value = V.current.db_state;
}


function addListeners() {
  addTabListeners();
  addMenuListeners();
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
}

function addEditingListeners() {
  HTM.workingDiv.addEventListener("paste", normalizePastedText);
  // ## having probs removing his event listener; leave & ignore with updateInputDiv
  HTM.workingDiv.addEventListener("keyup", debounce(updateInputDiv, 5000));

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
  if (swap) localStorage.setItem(id, swap);
  backupDialogClose("backup-dlg");
}


function backupReset() {
  // ** logic: put current OR most recent change in first backup (2nd backup is constantly updated)
  let mostRecent = getTextFromWorkingDiv();
  if (!mostRecent) mostRecent = localStorage.getItem(localStorage.getItem("mostRecent"));
  if (!mostRecent || !mostRecent.length) return;
  localStorage.setItem(C.backupIDs[0], mostRecent);
  localStorage.setItem("mostRecent", C.backupIDs[0]);
  localStorage.setItem(C.backupIDs[1], "");
}

function backupSave() {
  let currentText = getTextFromWorkingDiv();
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

function runSearch(data) {
  const term = data.term.join().split(" ")[0].toLowerCase();
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
  if (!results.length) {
    const word = stripOutRegex(find.term);
    let matchedIDarr = checkDerivations(word);
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkNegativePrefix(word, word);
    if (!idSuccessfullyMatched(matchedIDarr)) matchedIDarr = checkSpellingVariants(word);
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
  if (find.pos.length) {
    results = results.filter(el => getPoS(el)).filter(el => getPoS(el).search(find.pos) != -1);
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
  if (!results.length) {
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
  /*
  GET LEVEL FROM ID
  getLevelDetails(levelArr)
  */
  let html = "";
  for (const ref of refs.split(" ")) {
    const [id, normalizedWord, variantId] = ref.split(":");
    // const isOfflist = (variantId) ? true : false;
    const isOfflist = !!variantId;
    const entry = (isOfflist) ? getEntryById(variantId) : getEntryById(id);
    // const [levelArr, levelNum, levelClass] = getLevelDetails(entry);
    const [levelArr, levelClass] = getLevelDetails(entry);
    const lemma = buildDisplayLemma(entry, id, normalizedWord, variantId, isOfflist);
    const level = buildDisplayLevel(entry, id, levelArr, isOfflist);
    const pos = `[${getExpandedPoS(entry)}]`;
    let [notes, awl_notes] = getNotes(entry);
    html += `<div class="word-detail ${levelClass}">${level}<br><span>${lemma}${pos}${notes}${awl_notes}</span></div>`;
  }
  return html;
}

function buildDisplayLemma(entry, id, normalizedWord, variantId, isOfflist) {
  let displayLemma = "";
  if (getPoS(entry) !== "unknown") {
    const lemma = getLemma(entry);
    if (normalizedWord && normalizedWord !== lemma) {
      if (isOfflist) {
        displayLemma = `<em>** Use</em> <strong>${lemma}</strong> <em>instead of</em><br>${normalizedWord} `;
      }
      else {
        displayLemma = `<strong>${normalizedWord}</strong> (<em>from</em> ${lemma})`;
      }
    } else {
      displayLemma = `<strong>${lemma}</strong>: `;
    }
  }
  return displayLemma;
}

function buildDisplayLevel(entry, id, level_arr, isOfflist) {
  let level;
  // ** If word is offlist, use its classification (digit/name, etc.) as level
  if (!isOfflist && id < 0) {
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
  if (getId(entry) < 0) return pos_str;
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
  // debug(Date.now())
  V.tallyOfRepeats = {};
  V.repeats = new Set();
  let revisedText = getRevisedText().trim();
  if (revisedText && revisedText !== CURSOR.text) {
    const [
      resultsAsHTML,
      repeatsAsHTML,
      wordCount
    ] = processText(revisedText);
    displayProcessedText(resultsAsHTML, repeatsAsHTML, wordCount);
    HTM.finalInfoDiv.innerText = "";
  } else return;
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

function displayProcessedText(resultsAsHTML, repeatsAsHTML, wordCount) {
  displayDbNameInTab2(getWordCountForDisplay(wordCount));
  displayRepeatsList(repeatsAsHTML);
  displayWorkingText(resultsAsHTML);
}

function displayWorkingText(html) {
  HTM.workingDiv.innerHTML = html;
  setCursorPos(document.getElementById(CURSOR.id));
}

function processText(rawText) {
  signalRefreshNeeded("off");
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
  const chunkedText = splitText(text);
  const flatTextArr = findCompoundsAndFlattenArray(chunkedText);
  const [resultsAsTextArr, wordCount] = pushLookups(flatTextArr);
  const resultsAsHTML = buildMarkupAsHTML(resultsAsTextArr) + "<span> </span>";
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
  // ** used ^^ as replacement markers to keep separate from @EOL@, @CSR@ etc.
  text = text.trim();
  // ** separate out digits
  // ** should catch any of: 10, 99%, 10.5, 6,001, 99.5%, 42.1%, $14.95, 20p, 2,000.50th, years etc.
  text = text.replace(/(\b\d{4}s?\b|([$£€¥₹]?((\d{1,3}(,\d{3})*(\.\d+)?)|\d+)([%¢cp]|st|nd|rd|th)?))/g, "^^$1^^")
  // ** break at punctuation (include with digit)
  text = text.replace(/(\^\^|^\d)([.,;():?!])\s*/gi, "$2^^")
  text = text.replace(/\^{4,}/g, "^^");
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
          const c_id = V.currentDb.compounds[compound];
          matches = pushMatch(matches, c_id);
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


function pushMatch(matches, id) {
  matches.push([id, updateWordStats(id)]);
  return matches;
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
  // ** capture EOL and insert line breaks
  for (const wordArr of textArr) {
    let [word, rawWord, preMatchArr] = wordArr;
    let matchedIDs = [];
    if (word === EOL.text) {
      processedTextArr.push([word]);
    }
    else {
      if (!word) continue;
      matches = lookupWord(wordArr);
      // debug(textArr, matches)
      if (word) wordCount++;
      for (const id of matches) {
        // if (!id.length) continue;
        if (!id) continue;
        // ** do not check compounds (already checked)
        // debug("what??", id)
        if (V.currentDb.db[id] && V.currentDb.db[id][C.isCOMPOUND]) continue;
        const matchedEntry = getEntryById(id);
        // ** don't include contractions in word count
        if (!matchedEntry) continue;
        if (getPoS(matchedEntry) === "contraction") wordCount--;
        if (!V.currentDb.compounds[word]) {
          matchedIDs = pushMatch(matchedIDs, id);
        }
      }
      // debug("??",matchedIDs, matchedIDs.length)
      // ** filter out matched compounds without spaces
      preMatchArr.push(...matchedIDs);
      processedTextArr.push([word, rawWord, preMatchArr]);
    }
  }
  // debug(">>",processedTextArr)
  return [processedTextArr, wordCount];
}

function updateWordStats(id) {
  if (!V.wordStats[id]) {
    V.wordStats[id] = 1;
  } else if (!["contraction", "unknown", "digit"].includes(getPoS(getEntryById(id)))) {
    V.wordStats[id]++;
  }
  return V.wordStats[id];
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
      // offlistID = entry[0];
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

function lookupWord([word, rawWord]) {
  if (LOOKUP.symbols.includes(rawWord)) {
    word = rawWord;
  }
  let matchedIDarr = getIdsByLemma(word);
  matchedIDarr = checkDerivations(word, matchedIDarr);
  if (matchedIDarr.length === 0) matchedIDarr = checkNegativePrefix(word, rawWord);
  if (!matchedIDarr.length) matchedIDarr = [markOfflist(rawWord, "offlist")];
  // ** matches[0] = [id] if matched; [[-1]] if no match so far
  const offlistEntry = getOfflistEntry(parseInt(matchedIDarr[0]));
  const isOfflist = offlistEntry.includes("offlist");
  if (isOfflist) {
    const offlistID = parseInt(matchedIDarr[0]);
    checkSpellingVariants(word, rawWord, offlistID);
    // ** don't add these to matches; add to V.offlistDb
  }
  matchedIDarr = dedupeSimpleArray(matchedIDarr);
  return matchedIDarr;
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
  if (typeof id === "object") id = id[0];
  if (id < 0) id = -id;
  const entry = (V.offlistDb[id]) ? V.offlistDb[id] : [];
  return entry;
}

function checkSpellingVariants(word, rawWord, offlistID = 0) {
  const shouldUpdateOfflistDb = (offlistID !== 0);
  let matchIDarr = checkVariantWords(word);
  // debug("variant word?", word, matchIDarr, matchIDarr.length)
  if (!matchIDarr.length) matchIDarr = checkVariantSuffixes(word);
  // debug("variant suffix?", word, matchIDarr, matchIDarr.length)
  if (!matchIDarr.length) matchIDarr = checkVariantLetters(word);
  // debug("variant letters?", word, matchIDarr, matchIDarr.length)
  if (!matchIDarr.length) matchIDarr = checkVariantHyphens(word, rawWord);
  if (matchIDarr.length) {
    const offlistEntry = [offlistID, word, "variant", matchIDarr, ""];
    if (shouldUpdateOfflistDb) V.offlistDb[-offlistID] = offlistEntry;
  }
  return matchIDarr;
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

function checkVariantSuffixes(word) {
  let match;
  let matchIDarr = [];
  if (word.endsWith("s")) word = word.slice(0, -1);
  else if (word.endsWith("d")) word = word.slice(0, -1);
  else if (word.endsWith("ing")) word = word.slice(0, -3);
  if (word.endsWith("e")) word = word.slice(0, -1);
  for (const key of Object.keys(LOOKUP.variantSuffixes)) {
    const len = key.length;
    const root = word.slice(0, -len);
    const suffix = word.slice(-len);
    if (key === suffix) {
      match = root + LOOKUP.variantSuffixes[suffix];
      break;
    }
  }
  if (match) {
    matchIDarr = getIdsByLemma(match);
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

function checkVariantLetters(word) {
  let matchIDarr = [];
  if (LOOKUP.notLetterVariant.includes(word)) return matchIDarr;
  for (const [letters, replacement] of LOOKUP.variantLetters) {
    matchIDarr = replaceLetters(word, letters, replacement);
    if (matchIDarr.length) {
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
  if (indices.length) {
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

function checkDerivations(word, matches = []) {
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
    return matches;
  }
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
    checkRegularAdverbs,
  ]) {
    const result = guess(word);
    // if (result) debug(word, result)
    if (result) {
      matches.push(result);
      break;
    }
  }
  // ## -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
  const result = checkFinalS(word);
  if (result) {
    matches.push(result);
  }
  if (!matches.length) {
    return [];
    // matches.push(markOfflist(word, "offlist"));
  }
  return dedupeSimpleArray(matches);
}


function dedupeSimpleArray(array) {
  return [...new Set(array)];
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

function checkUnknown(word) {
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

function checkContractions(word) {
  let result;
  if (LOOKUP.contractions.includes(word)) {
    result = markOfflist(word, "contraction");
  }
  return result;
}

function checkNames(word) {
  let result;
  if (LOOKUP.personalNames.includes(word)) {
    result = markOfflist(word, "personal name");
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
    result = winnowPoS(getIdsByLemma(lookup), ["n"])[0];
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
      if (lookup.length) {
        // return winnowPoS(lookup, ["n"])[0];
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
    result = winnowPoS(findBaseForm(word, LOOKUP.g_subs), ["v"])[0];
  }
  return result;
}

function checkVpp(word) {
  let result;
  if (word.endsWith("ed")) {
    result = winnowPoS(findBaseForm(word, LOOKUP.d_subs), ["v"])[0];
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
    // ## pronouns ("r") included to allow 'others'
    result = winnowPoS(findBaseForm(word, LOOKUP.s_subs), ["n", "v", "r"])[0];
  }
  return result;
}

function checkRegularAdverbs(word) {
  let result;
  if (word.endsWith("ly")) {
    result = winnowPoS(findBaseForm(word, LOOKUP.y_subs), ["j"])[0];
  }
  return result;
}


function winnowPoS(roughMatches, posArr) {
  // ** Returns possible IDs of derivations as array, or empty array
  let localMatches = [];
  for (const id of roughMatches) {
    const match = getEntryById(id);
    for (const pos of posArr) {
      // if (match && match[C.POS].includes(pos)) {
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
    const isOfflist = parsedId < 0;
    const dB = (isOfflist) ? V.offlistDb : V.currentDb.db;
    parsedId = Math.abs(parsedId);
    result = dB[parsedId]
  }
  // debug(id, parsedId, variant, dB[parsedId]);
  // return dB[parsedId];
  return result;
}

function buildMarkupAsHTML(textArr) {
  // ** textArr = array of [normalized-word, raw-word, [[matched-id, occurence]...]] for each word, repeat the raw-word for each match, but with different interpretations
  let htmlString = "";
  let isFirstWord = true;
  let wasEOL = false;
  let isEOL = false;
  let wordIndex = 0;
  for (let [word, rawWord, matches] of textArr) {
    [isEOL, wasEOL, htmlString] = renderEOLsAsHTML(word, htmlString, wasEOL);
    if (isEOL || !word || !matches[0]) continue;
    const isContraction = getEntryById(matches[0][0])[2] == "contraction";
    const leaveSpace = (isContraction || isFirstWord || wasEOL) ? "" : " ";
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
    const groupedWord = getGroupedWordAsHTML(listOfMatches, wordIndex, rawWord, leaveSpace);
    htmlString += groupedWord;
  }
  return htmlString;
}

function getGroupedWordAsHTML(listOfMatches, wordIndex, rawWord, leaveSpace) {
  const [[displayLemma, displayID, displayLevel], levelsAreIdentical, isMultipleMatch] = getSortedMatchesInfo(listOfMatches);
  // ** variant
  let variantEntry;
  let isVariant;
  let variantClass = "";
  if (displayID < 0) {
    isVariant = getPoS(getEntryById(displayID)) === "variant";
    if (isVariant) variantEntry = getEntryById(displayLevel);
  }
  const match = getEntryById(displayID);
  V.repeats.add(displayLemma + ":" + displayID);
  const ignoreRepeats = LOOKUP.repeatableWords.includes(getLemma(match));
  const entryToShow = (isVariant) ? variantEntry : match;
  // const [levelArr, levelNum, levelClass] = getLevelDetails(entryToShow);
  const [levelArr, levelClass] = getLevelDetails(entryToShow);
  const [relatedWordsClass, duplicateClass, duplicateCountInfo, anchor] = getDuplicateDetails(displayID, ignoreRepeats);
  rawWord = insertCursorInHTML(listOfMatches.length, wordIndex, escapeHTMLentities(rawWord));
  const localWord = highlightAwlWord(levelArr, rawWord);
  let listOfLinks = listOfMatches.map(el => [`${el[1]}:${el[0]}`]).join(" ");
  // ** This assumes (safely) that variants will have only one match
  if (isVariant) {
    listOfLinks += `:${getId(variantEntry)}`;
    variantClass = " variant";
  }
  const groupedWord = createGroupedWordInHTML(leaveSpace, listOfLinks, levelClass, relatedWordsClass, duplicateClass, duplicateCountInfo, anchor, localWord, levelsAreIdentical, isMultipleMatch, variantClass);
  return groupedWord;
}

function createGroupedWordInHTML(leaveSpace, listOfLinks, levelClass, relatedWordsClass, duplicateClass, duplicateCountInfo, anchor, localWord, levelsAreIdentical, isMultipleMatch, variantClass) {
  let showAsMultiple = "";
  if (isMultipleMatch) showAsMultiple = (levelsAreIdentical) ? " multi-same" : " multi-diff";
  let displayWord = `${leaveSpace}<span data-entry="${listOfLinks}" class="${levelClass}${relatedWordsClass}${duplicateClass}${showAsMultiple}${variantClass}"${duplicateCountInfo}${anchor}>${localWord}</span>`;
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
  const isMultipleMatch = (matches.length > 1);
  let lowest = matches[0];
  let areSame = true;
  if (isMultipleMatch) {
    let sorted = matches.sort((a, b) => a[2] - b[2]);
    lowest = sorted[0];
    let levels = sorted.map(el => el[2]);
    areSame = levels.every(el => el === levels[0]);
  }
  return [lowest, areSame, isMultipleMatch];
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
  const totalRepeats = V.wordStats[id];
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
  // const levelNum = getLevelNum(entry);
  const levelClass = "level-" + getLevelPrefix(entry);
  // return [getLevel(entry), levelNum, levelClass];
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
  // if (isKids() && levelNum < 37) level = "k";
  if (!level) level = "o";
  return level[0];
}


function buildRepeatList(wordCount) {
  let countReps = 0;
  let listOfRepeats = "";
  if (!wordCount) {
    V.wordStats = {};
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
      const isRepeated = V.wordStats[id] > 1;
      const isRepeatable = !LOOKUP.repeatableWords.includes(word);
      const isWord = !LOOKUP.symbols.includes(word);
      if (isRepeated && isRepeatable && isWord) {
        countReps++;
        let anchors = "";
        for (let repetition = 1; repetition <= V.wordStats[id]; repetition++) {
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
      repeatsHeader = `<p id='all_repeats'><strong>${countReps} repeated word${(countReps === 1) ? "" : "s"}:</strong><br><em>Click on word / number to jump to that occurance.</em></p>`
      listOfRepeats = `${repeatsHeader}<div id='repeats'>${listOfRepeats}</div>`;
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
  HTM.finalLegend.innerHTML = `Checking against <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
  const levelInfo1 = "<span class='level-e'>elem (A2) / Kids</span>, <span class='level-i'> int (B1)</span>, <span class='level-h'>hi-int (B2)</span>";
  const levelInfo2 = "<span class='level-o'>off-list</span>";
  const repeatInfo1 = "<span class='multi-diff'>double underline</span> = multiple levels";
  const repeatInfo2 = "superscript<sup>n</sup> = number of repetitions";
  const variantInfo = "<span class='variant'>wavy underline</span> = form to avoid";
  const refreshInfo = "To <b>refresh markup</b>, click the 'Text' tab or wait 5 seconds without typing.";
  const awlHelp = (isBESTEP()) ? "<li><span class='awl-word'>dotted underline</span> = AWL word</li>" : "";
  HTM.finalLegend.innerHTML += `<details class='instructions'><summary class='in-list-header'>HELP</summary><ul><li>${levelInfo1}</li><li>${levelInfo2}</li>${awlHelp}<li>${repeatInfo1}</li><li>${variantInfo}</li><li>${repeatInfo2}</li><li>${refreshInfo}</li></ul></details>`;
}

function getIdsByLemma(word) {
  // ** returns empty array or array of matched IDs [4254, 4255]
  // if (typeof word !== "string") throw new Error("Search term must be a string.")
  if (typeof word !== "string" || !word) return [];
  word = word.toLowerCase();
  const searchResults = V.currentDb.db
    .filter(el => getLemma(el).toLowerCase() === word)
    .map(el => getId(el));
  return searchResults;
}


function findBaseForm(word, subs, isSuffix = true) {
  // ** Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
  let localMatches = [];
  const candidates = new Set();
  const affix_lookups = (isSuffix) ? "_suffix" : "_prefix";
  const toSuffix = -(subs[affix_lookups].length);
  for (const derivedForm in subs) {
    const i = -(derivedForm.length);
    const affix = subs[word.slice(i)];
    if (affix != undefined) {
      const candidate = word.slice(0, i) + affix;
      candidates.add(candidate);
    }
  }
  candidates.add(word.slice(0, toSuffix));
  for (const candidate of candidates) {
    const tmp_match = getIdsByLemma(candidate);
    if (tmp_match.length) localMatches.push(...tmp_match);
  }
  return localMatches;
}

// function removePrefix(word) {
//   const prefix = word.slice(0,2);
//   let baseForm = word.slice(2);
//   let match = [];
//   if (LOOKUP.prefixes.includes(prefix)) {
//     const tmp = getIdsByLemma(baseForm);
//     if (tmp) match = [tmp[0]];
//   }
//   // debug(prefix, baseForm, match, match.length)
//   return match;
// }


function clearTab2() {
  HTM.workingDiv.innerText = "";
  HTM.finalInfoDiv.innerText = "";
  HTM.repeatsList.innerText = "";
  displayDbNameInTab2();
  backupReset();
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
  // HTM.selectDb.value = C.DEFAULT_db;
  // setTab(V.currentTab);
  // setDbShared(C.DEFAULT_db);
  setTab(V.current.tab_state);
  setDbShared(V.current.db_state);
  HTM.selectDb.value = V.current.db_state;
}

function appStateForceDefault() {
  for (const key in C.state) {
    const defaultVal = C.state[key];
    localStorage.setItem(key, defaultVal)
    V.current[key] = defaultVal;
    // debug(key, defaultVal)
  }
  // localStorage.setItem(C.SAVE_DB_STATE, C.DEFAULT_db);
  // localStorage.setItem(C.SAVE_ACTIVE_TAB_INDEX, C.DEFAULT_tab);
}

function appStateReadFromStorage() {
  // return [
  //   localStorage.getItem(C.SAVE_DB_STATE),
  //   localStorage.getItem(C.SAVE_ACTIVE_TAB_INDEX),
  // ];
  let retrieved_items = {};
  for (const key in C.state) {
    const retrieved_item = localStorage.getItem(key);
    retrieved_items[key] = (retrieved_item) ? parseInt(retrieved_item) : C.state[key];
  }
  // debug(retrieved_items)
  return retrieved_items;
}

function appStateWriteToCurrent() {
  const retrieved_items = appStateReadFromStorage();
  // debug("??",retrieved_items)
  for (const key in retrieved_items) {
    const value = retrieved_items[key];
    V.current[key] = value;
    // debug(key, value)
  }
}

// function appStateSetOLD() {

//   if (!(C.SAVE_DB_STATE in localStorage)) appStateForceDefault();
//   let [
//     dbState,
//     tabState,
//   ] = appStateGet();
//   V.currentDbChoice = dbState;
//   V.currentTab = tabState;
// }

function setDbShared(e) {
  let choice = (e.target) ? e.target.value : e;
  // V.currentDbChoice = parseInt(choice);
  V.current.db_state = parseInt(choice);
  V.currentDb = [];
  // if (V.currentDbChoice === C.GEPT) {
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
    // } else if (V.currentDbChoice === C.BESTEP) {
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
  V.currentDb.compounds = makeCompoundsDb(V.currentDb.db);
  for (const key in V.currentDb.css) {
    // const property = (key[0] == "_") ? `--${key.slice(1)}` : key;
    const property = (key.startsWith("_")) ? `--${key.slice(1)}` : key;
    HTM.root_css.style.setProperty(property, V.currentDb.css[key]);
  }
  setDb_tab2();
  setDbTab1();
  // localStorage.setItem(C.SAVE_DB_STATE, V.currentDbChoice);
  localStorage.setItem("db_state", V.current.db_state);
}

function isGEPT() {
  // return V.currentDbChoice === C.GEPT;
  return V.current.db_state === C.GEPT;
}

function isBESTEP() {
  return V.current.db_state === C.BESTEP;
}

function isKids() {
  // return V.currentDbChoice === C.Kids;
  return V.current.db_state === C.Kids;
}

function makeCompoundsDb(dB) {
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
    const splitWord = word.split(/[-'\s]/g);
    if (splitWord.length > 1) {
      const newCompound = splitWord.join("");
      entry[C.isCOMPOUND] = true;
      compounds[newCompound] = id;
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
  // debug(func.name === "updateInputDiv")
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
    // V.timer = timer;
  };
}

function debug(...params) {
  // console.log(`* ${debug.caller.name.toUpperCase()}: `, params);
  // console.log(">", arguments.callee.caller.toString().match(/showMe\((\S)\)/)[1])
  console.log(`DEBUG: ${debug.caller.name}> `, params);
}

// ## TABS ############################################

function setTab(tab) {
  tab = (tab.currentTarget) ? tab.currentTarget : HTM.tabHead.children[tab];
  let i = 0;
  for (const content of HTM.tabBody.children) {
    if (tab === HTM.tabHead.children[i]) {
      // V.currentTab = i;
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
  // localStorage.setItem(C.SAVE_ACTIVE_TAB_INDEX, V.currentTab);
  // localStorage.setItem(C.state.tab[0], V.current.tab_state);
  localStorage.setItem("tab_state", V.current.tab_state);
  forceUpdateInputDiv();
  displayInputCursor();
  // V.isExactMatch = (isFirstTab()) ? false : true;
  V.isExactMatch = isFirstTab();
}


function setTabHead() {
  let mode = (isFirstTab()) ? "none" : "block";
  HTM.backupButton.style.display = mode;
  HTM.backupSave.style.display = mode;
  // HTM.refreshIcon.style.display = mode;
}

function isFirstTab() {
  // debug(">>>current tab=", V.currentTab, parseInt(V.currentTab) === 0)
  // return parseInt(V.currentTab) === 0;
  return parseInt(V.current.tab_state) === 0;
}

function displayInputCursor() {
  if (isFirstTab()) HTM.inputLemma.focus();
  else HTM.workingDiv.focus();
}


// ## IN-PLACE EDITING CODE######################################
// currently in upgrade.js
