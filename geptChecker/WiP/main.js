// "use strict";

// ## SETUP ############################################

const app = new App();
app.init();

// TAB1 (words) CODE ## ############################################

// ***** INIT FUNCTIONS


function setupEditing(e) {
  HTM.finalInfoDiv.classList.remove("word-detail");
  // app.listeners.addEditing();
  // forceUpdateInputDiv();
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
    const searchTerms = wordBuildSearchTerms(data);
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
    if (!app.tools.isEmpty(data[el])) {
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
  // TODO: refactor using sub functions to make process clearer
  const search = new Search(searchTerms.raw_lemma, app.wordlist.getEntriesByPartialLemma(searchTerms.lemma));
  let matchedEntries = search.matchedEntries;
  // let [type, matchedEntries] = checkAgainstLookups(searchTerms.raw_lemma, app.wordlist.getEntriesByPartialLemma(searchTerms.lemma));
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
  if (!app.tools.isEmpty(searchTerms.pos)) {
    matchedEntries = matchedEntries.filter(el => el.pos).filter(el => el.pos.search(searchTerms.pos) != -1);
  }
  if (app.state.isBESTEP && !app.tools.isEmpty(searchTerms?.awl)) {
    /*
    el[app.limit.LEVEL][2]:
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
    if (searchTerms.awl[0] === Entry.FIND_GEPT_ONLY) {
      matchedEntries = matchedEntries.filter(el => el.levelStatus === Entry.GEPT_ONLY);
    }
    else if (searchTerms.awl[0] === Entry.FIND_AWL_ONLY) {
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
  if (app.tools.isEmpty(results)) {
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
    let level = app.wordlist.levelSubs[entry.levelGEPT];
    if (entry.levelAWL >= 0) level += `; AWL${entry.levelAWL}`;
    if (!level) continue;
    let [note, awl_note] = getNotesAsHTML(entry);
    const col2 = [lemma, Tag.tag("span", ["class=show-pos"], [pos]), " ", Tag.tag("span", ["class=show-level"], [level]), note, awl_note];
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


// function formatResultsAsTablerows(col1, col2, class1, class2, row) {
function formatResultsAsTablerows(col1, col2, class1, class2) {
  class1 = (class1) ? `class=${class1}` : "";
  class2 = (class2) ? `class=${class2}` : "";
  // row = (row) ? `class=${row}` : "";
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