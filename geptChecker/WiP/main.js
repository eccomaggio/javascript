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

// ## TAB1 (words) SETUP ############################################


addListeners();
finalInit();


// TAB1 (words) CODE ## ############################################

// ***** INIT FUNCTIONS

function addListeners() {
  document
    .getElementById("t1_theme_select");
    // .addEventListener("change", submitWordSearchForm);

  document.getElementById("t1_term_i").addEventListener("input", debounce(submitWordSearchForm, 500));

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
  document.getElementById("clear_button").addEventListener("click", resetTab);
  document.getElementById("reset_button").addEventListener("click", resetApp);

  // ## for refresh button + settings menu
  document.getElementById("set-db").addEventListener("change", changeDb_shared);
  document.getElementById("set-font").addEventListener("change", changeFont);
  document.getElementById("set-refresh").addEventListener("change", changeRefresh);
  HTM.refreshButton.addEventListener("click", processText);
  HTM.backupButton.addEventListener("click", showBackups);
  HTM.backupDialog.addEventListener("mouseleave", closeBackupDialog);
  HTM.backupSave.addEventListener("click", saveBackup);

  // ## for text input box
  // HTM.rawDiv.addEventListener("input", processText);
  HTM.rawDiv.addEventListener("input", debounce(processText, 500));
  HTM.rawDiv.addEventListener("paste", normalizePastedText);

  HTM.finalTextDiv.addEventListener("mouseover", hoverEffects);
  HTM.finalTextDiv.addEventListener("mouseout", hoverEffects);
  document.getElementById("dropdown").addEventListener("mouseenter", dropdown)
  document.getElementById("dropdown").addEventListener("mouseleave", dropdown)
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

function finalInit() {
  const appStatus = localStorage.getItem(C.SAVE_DB_STATE)
  changeDb_shared((appStatus | 0));
  HTM.dbDropdown.value = appStatus;
  refreshLabels("t1_form");
  resetTab1();
  // console.log("offlist db",V.offlistDb)
}

// *****  FUNCTIONS

function showBackups(e) {
  /*
  1) on refresh, swap backup_0 to backup_1
  2) close backup dialog on mouseout
  3) close settings dialog when backup opens
  4) hide backup setting on tab 1
  5) ? rationalize dialogs so there is a coherent, extenable system
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
  const swap = JSON.parse(JSON.stringify(HTM.rawDiv.innerText));
  const restoredContent = localStorage.getItem(id);
  if (!restoredContent) return;
  HTM.rawDiv.innerText = restoredContent;
  processText(HTM.rawDiv);
  if (swap) localStorage.setItem(id, swap);
  closeBackupDialog("backup-dlg");
}

function updateBackup(id) {
  // ## current logic: 0=from last refresh, 1=regularly updated (if longer than prev)
  if (window.localStorage.getItem(id)) {
    let newContent = HTM.rawDiv.innerText.trim();
    if (!newContent) return;
    for (let other of C.backupIDs) {
      // ## don't hold duplicate backups
      if (id != other && newContent == localStorage.getItem(other)) return;
    }
    if (window.localStorage.getItem(id).length < newContent.length) window.localStorage.setItem(id, newContent)
    localStorage.setItem("mostRecent", id);
  } else {
    window.localStorage.setItem(id, " ")
  }
}

function resetBackup() {
  // ## logic: put current OR most recent change in first backup (2nd backup is constantly updated)
  let mostRecent = HTM.rawDiv.innerText.trim();
  if (!mostRecent) mostRecent = localStorage.getItem(localStorage.getItem("mostRecent"));
  if (!mostRecent || !mostRecent.trim().length) return;
  localStorage.setItem(C.backupIDs[0], mostRecent);
  localStorage.setItem("mostRecent", C.backupIDs[0]);
  localStorage.setItem(C.backupIDs[1], "");
}

function saveBackup() {
  const currentText = HTM.rawDiv.innerText;
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
  let stringToDisplay = "";
  if (!errorMsg) {
    resultsArr = executeFormDataLookup(data);
    resultsCount = resultsArr.length;
    stringToDisplay = formatResultsAsHTML(resultsArr);
  } else {
    stringToDisplay = `<p class='error'>${errorMsg}</p>`;
  }
  displayWordSearchResults(stringToDisplay, resultsCount);
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
  let resultsArr = [];
  let errorMsg = "";
  const term = data.term.join().split(" ")[0].toLowerCase();
  // console.log("Search for:" + JSON.stringify(data).replace(/[\[\]\{\}]/g, "");
  if (isEmptySearch(data)) {
    errorMsg = "Please enter at least one search term to restrict the number of results.";
  }
  else if (term.search(/[^a-zA-Z\-\s']/g) > -1) {
    errorMsg = "The only non-alphabetic characters allowed are space, apostrophe, and hyphen.";
  }
  return errorMsg;
}

function isEmptySearch(searchTerms) {
  for (let el in searchTerms) {
    if (el === "match") continue;
    if (searchTerms[el].length) return false;
  }
  return true;
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

function displayWordSearchResults(resultsAsHtmlString, resultCount=0) {
  let text = LOOKUP.legends.results;
  if (resultCount) text += ` (${resultCount})`;
  HTM.resultsLegend.innerHTML = text;
  HTM.resultsText.innerHTML = resultsAsHtmlString;
}

function resetTab1() {
  HTM.form.reset();
  displayWordSearchResults([]);
  refreshLabels("t1_form");
  HTM.resultsText.innerHTML = "";
}


// ## TAB2 (text) SETUP ############################################

HTM.finalInfoDiv.style.display = "none";
HTM.finalLegend.innerHTML = displayDbName();

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
  paste = paste.replace(/[\n\r]+/g, "\n\n");
  selection.getRangeAt(0).insertNode(document.createTextNode(paste));
  processText(e);
  // resetBackup();
  saveBackup();
  // console.log("debug *normalize*", paste)
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

// ## if text is typed in, this is where processing starts
function processText(raw) {
  // ## reset V.wordStats
  V.wordStats = {};
  // ## need to distinguish between typed / button / pasted input
  // ## and interact with auto-refresh toggle
  const isTyped = (raw.type === 'input' || raw.type === 'paste');
  const isClick = (raw.type === 'click');
  if ((isTyped && V.isAutoRefresh) || isClick || !raw.type) {
    raw = HTM.rawDiv;
  } else return;
  if (raw.innerText.trim()) {
    const chunkedText = splitText(raw.innerText);
    // console.log("chunked text:",chunkedText)
    const textArr = findCompounds(chunkedText);
    const [processedTextArr, wordCount] = addLookUps(textArr);
    // console.log("processed text array",processedTextArr)
    let htmlString = convertToHTML(processedTextArr);
    const listOfRepeats = buildRepeatList(wordCount);
    displayCheckedText(htmlString, listOfRepeats, wordCount)

    updateBackup(C.backupIDs[1]);
  } else {
    displayCheckedText();
  }
}

function splitText(raw_text) {
  /* To narrow down the hunt for compound words,
  the normalized text is first split into
  independent chunks by punctuation (which compounds can't cross)
  i.e. period, comma, brackets, ? ! (semi-)colons
  then divided on spaces. Creates an array of phrases > words.
      Each word is a sub array:
      1) normalized word
      2) word with caps + punctuation for display
  */
  // ## text = [processed word for lookup + tagging, raw word for display]
  raw_text = raw_text
    .replace(/[\u2018\u2019']/g, " '") // ## replace curly single quotes
    .replace(/[\u201C\u201D]/g, '"')   // ## replace curly double  quotes
    .replace(/…/g, "...")
    .replace(/[\n\r]+/g, " *EOL ") // encode EOLs
    // .replace(/\u2014/g, " -- ")
    .replace(/–/g, " -- ")  // pasted in em-dashes
    .replace(/—/g, " - ")
    .replace(/(\w)\/(\w)/g, "$1 / $2");
  const raw_chunks = raw_text
    .trim()
    .replace(/([.,;():?!])\s+/gi, "$1@@")
    .split("@@");

  let chunks = [];
  for (let chunk of raw_chunks) {
    let chunkArr = [];
    for (let word of chunk.split(/\s+/)) {
      if (word.includes("*EOL")) {
        chunkArr.push(["*EOL", "<br>"]);
      } else {
        let normalizedWord = word.replace(C.punctuation, "").toLowerCase();
        chunkArr.push([normalizedWord, word]);
      }
    }
    chunks.push(chunkArr);
  }
  return chunks;
}

function findCompounds(chunks) {
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
    if (word === "*EOL") {
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
        // if (!V.currentDb.compounds[word]) matchedIDs.push([id, updateWordStats(id)]);
        if (!V.currentDb.compounds[word]) addMatch(matchedIDs, id);
      }
      // ## filter out matched compounds without spaces
      preMatchArr.push(...matchedIDs);
      processedTextArr.push([word, wordArr[1], preMatchArr]);
    }
  }
  // console.log("processedT arr:", processedTextArr)
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

function lookupWord([word, raw_word]) {
  // let matches = dbLookup([word, raw_word]);
  let matches = dbLookup(word);
  matches = lookupDerivations([word, raw_word], matches);
  return matches;
}

function lookupDerivations([word, raw_word], matches = []) {
  /*
  returns => array of matched ids
  NB. always returns a match, even if it is just "offlist"
  */
  // let matches = [];
  if (word.match(/\d/i)) {
    matches.push(markOfflist(word, "digit"));
    return matches;
  }
  else if (!word.match(/[a-z]/i)) {
    matches.push(markOfflist(word, "unknown"));
    return matches;
  }
  else if (LOOKUP.contractions.includes(word)) {
    matches.push(markOfflist(word, "contraction"));
  }
  else if (LOOKUP.setOfCommonNames.has(word) && (raw_word[0] === raw_word[0].toUpperCase())) {
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
        /* ## test: families tries potatoes scarves crises boxes dogs ## Filter out adjs (can't take '-s') */
        const candidates = findBaseForm(word, LOOKUP.s_subs);
        for (const id of candidates) {
          const candidate = getDbEntry(id);
          if (candidate.length > 0 && candidate[C.POS] !== "j") {
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
  // console.log("lookupDerivations", word, matches)
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
  if (!textArr.length) console.log("nowt doin'!")
  let htmlString = "";
  let isFirstWord = true;
  let wasEOL = false;
  for (let wordArr of textArr) {
    let word = wordArr[0];
    if (word === "*EOL") {
      htmlString += "<br><br>";
      wasEOL = true;
      continue;
    }
    const rawWord = wordArr[1];
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
      const hideAlternatives = (matchCount > 0) ? ["<mark>", "</mark> "] : ["", ""];
      let localWord = highlightAwlWord(level_arr, rawWord);
      const origLemma = (V.currentDb.db[id]) ? V.currentDb.db[id][C.LEMMA] : word;
      if (origLemma.search(/[-'\s]/) >= 0) localWord = origLemma;
      // displayWord = `${leaveSpace}<span data-entry="${id}:${word}" class="${levelClass}${relatedWordsClass}${duplicateClass}"${anchor}>${localWord + showDuplicateCount}</span>`;
      displayWord = `${leaveSpace}<span data-entry="${id}:${word}" class="${levelClass}${relatedWordsClass}${duplicateClass}"${showDuplicateCount}${anchor}>${localWord}</span>`;
      // if (matchCount < matches.length - 1) displayWord += " /" + (leaveSpace ? "" : " ");
      if (matchCount > 0 && matchCount < matches.length) displayWord = " /" + (leaveSpace ? "" : " ") + displayWord;
      htmlString += hideAlternatives[0] + displayWord + hideAlternatives[1];
      matchCount++;
      wasEOL = false;
    }
  }
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
      if (V.wordStats[key] > 1 && !LOOKUP.repeatableWords.includes(word)) {
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
    listOfRepeats = `<p id='all_repeats'><strong>${countReps} repeated word${(countReps === 1) ? "" : "s"}:</strong><br><em>Click on a number to jump to the word.</em></p><div id='repeats'>` + listOfRepeats;
    listOfRepeats += "</div>";
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

function displayCheckedText(htmlText, listOfRepeats, wordCount) {
  if (!htmlText) {
    htmlText = "<span class='error'>Please input some text.</span>"
    HTM.finalInfoDiv.style.display = "none";
  } else {
    if (listOfRepeats) {
      htmlText += listOfRepeats;
    } else {
      htmlText += "<h1>There are no significant repeated words.</h1>"
    }
    // const numOfWords = (wordCount > 0) ? `<span class="text-right dark">(c.${wordCount} word${(wordCount > 1 ? "s" : "")}) <a href='#all_repeats' class='medium'>&#x25BC;</a></span>` : "";
    const numOfWords = (wordCount > 0) ? `<span class="text-right dark">(c.${wordCount} word${(pluralNoun(wordCount))}) <a href='#all_repeats' class='medium'>&#x25BC;</a></span>` : "";
    HTM.finalLegend.innerHTML = displayDbName(numOfWords);
    HTM.finalInfoDiv.style.display = "flex";
  }
  HTM.finalTextDiv.innerHTML = htmlText;
  HTM.finalInfoDiv.innerHTML = "";
}

function pluralNoun(amount) {
  return (amount > 1) ? "s" : "";
}

function displayDbName(msg) {
  if (!msg) msg = "";
  return `Checked against <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
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

function resetTab2() {
  HTM.rawDiv.innerText = "";
  HTM.finalTextDiv.innerHTML = "";
  HTM.finalLegend.innerHTML = displayDbName();
  HTM.finalInfoDiv.innerText = "";
  HTM.finalInfoDiv.style.display = "none";
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
  V.isAutoRefresh = (parseInt(e.target.value) === 0);
  // console.log("changerefresh: isAutoRefresh=",isAutoRefresh)
  if (V.isAutoRefresh) {
    HTM.refreshButton.style.display = "none";
  } else {
    HTM.refreshButton.style.display = "block";
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
  } else console.log("eh-jumpToDupe", id)
}

// ## COMMON ELEMENTS ######################################

function resetTab(event) {
  event.preventDefault();
  if (isTab1()) {
    resetTab1();
  } else {
    resetTab2();
  }
}

function resetApp() {
  localStorage.setItem(C.SAVE_DB_STATE, 0);
  localStorage.setItem(C.SAVE_TAB_STATE, 0);
  V.currentTab = 0;
  resetTab1();
  resetTab2();
  HTM.dbDropdown.value = 0;
  activateTab(HTM.tabHead.children[0]);
  changeDb_shared(0);
}


function changeDb_shared(e) {
  let choice = (e.target) ? parseInt(e.target.value) : e;
  V.currentDb = [];
  if (choice === 0) {
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
  processText(HTM.rawDiv);
}

// ## TABS ############################################

V.currentTab = localStorage.getItem(C.SAVE_TAB_STATE);
V.currentTab = (V.currentTab) ? V.currentTab : "0";
activateTab(HTM.tabHead.children[V.currentTab]);

function activateTab(tab) {
  if (tab.target) tab = tab.target
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
    document.getElementById("set-refresh").style.display = "none";
    HTM.backupButton.style.display = "none";
    HTM.backupSave.style.display = "none";
  } else {
    document.getElementById("set-refresh").style.display = "block";
    HTM.backupButton.style.display = "block";
    HTM.backupSave.style.display = "block";

  }
  localStorage.setItem(C.SAVE_TAB_STATE, V.currentTab);
}

function isTab1() {
  return V.currentTab === 0;
}

