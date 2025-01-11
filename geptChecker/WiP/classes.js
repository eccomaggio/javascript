
class App {
  state;
  wordlist;
  hasBeenReset = true;
  constructor() {
    if (App.#instance) {
      throw new Error("Only one app is allowed to run at a time.");
    }
    App.#instance = this;
    this.tools = new Tools();
    this.tabs = new TabController();
    this.backup = new Backup();
    this.listeners = new EventListeners();
    this.ui = new UI();
    this.search = new GenericSearch();
    this.info = new InformationPanes();
    this.word = new WordSearch();
    this.text = new Text();
    this.parser = new Parser();
    this.stats = new WordStatistics();
    this.repeats = new Repeats();
  }

  init() {
    this.state = new State();
    this.cursor = new Cursor();
    this.limit = new ShowLevelLimit();
    this.wordlist = new Db(this.state.current.db_state);
    this.tabs.setTab(this.state.current.tab_state);
    if (!localStorage.getItem("mostRecent")) localStorage.setItem("mostRecent", this.backup.backupIDs[0]);
    this.ui.setupEditing();
    HTM.form.reset();
    this.state.updateDbInMenu();
    this.state.setHelp("fromSaved");
    this.listeners.addAll();
    this.state.setFont();
    console.log("app:", this)
  }

  reset(e) {
    this.state.forceDefault();
    this.tabs.resetTabs();
    this.wordlist.change(this.state.current.db_state);
    HTM.selectDb.value = this.state.current.db_state;
    this.state.setHelp("reset");
    this.limit.reset();
    this.state.setFont("reset");
  }
  static #instance;
}

class EventListeners {
  detailID = "repeat-details";
  addAll() {
    // addTabListeners();
    this.addMenu();
    this.addHTML();
    this.addDetail();
    this.addWordInput();
    this.addEditing();
  }

  addWordInput() {
    // HTM.inputLemma.addEventListener("input", debounce(app.word.wordSearch.bind(app.word), 500));
    HTM.inputLemma.addEventListener("input", debounce(function (e) { app.word.search() }, 500));
    for (const el of document.getElementsByTagName("input")) {
      if (el.type != "text") {
        const label = el.labels[0];
        if (label.htmlFor) label.addEventListener("click", function (e) { app.ui.registerLabelClick(e) }, false);
      }
    }
  }


  addMenu() {
    // HTM.clearButton.addEventListener("click", clearTab);
    HTM.resetButton.addEventListener("click", function (e) { app.reset(e) }, false);

    // ## for refresh button + settings menu
    HTM.selectDb.addEventListener("change", function (e) { app.wordlist.change(e) }, false);
    HTM.selectFontSize.addEventListener("change", function (e) { app.state.changeFont(e) }, false);

    HTM.settingsMenu.addEventListener("mouseenter", function (e) { app.ui.dropdown(e) }, false);
    HTM.settingsMenu.addEventListener("mouseleave", function (e) { app.ui.dropdown(e) }, false);
  }

  addHTML() {
    HTM.kidsTheme.addEventListener("change", function (e) { app.word.updateKidstheme(e) }, false);
  }

  addDetail() {
    HTM.helpAll.addEventListener("click", function (e) { app.limit.toggle(e) }, false);
    HTM.help_state.addEventListener("toggle", function (e) { app.state.setHelp(e) }, false);
  }

  addEditing() {
    HTM.workingDiv.addEventListener("paste", function(e) { app.tools.normalizePastedText(e)}, false);
    // ## having probs removing his event listener; leave & ignore with updateInputDiv
    // HTM.workingDiv.addEventListener("keyup", debounce(updateInputDiv, 5000));
    // ** "copy" only works from menu; add keydown listener to catch Ctrl_C
    HTM.workingDiv.addEventListener("copy", function(e) { app.tools.normalizeTextForClipboard(e) }, false);
    HTM.workingDiv.addEventListener("keydown", function(e) { app.tools.catchKeyboardCopyEvent(e) }, false);
    HTM.workingDiv.addEventListener("keyup", function (e) { app.cursor.updatePos(e) }, false);
    this.setHoverEffect();
  }

  setHoverEffect() {
    HTM.workingDiv.addEventListener("mouseover", function(e) { app.info.hoverEffects(e) }, false);
    HTM.workingDiv.addEventListener("mouseout", function(e) { app.info.hoverEffects(e) }, false);
  }

  addDetailToggle(levelDetailsTag) {
    // ** Added here as don't exist when page loaded; automatically garbage-collected when el destroyed
    if (levelDetailsTag) levelDetailsTag.addEventListener("toggle", function (e) { app.state.setLevel(e) }, false);
    document.getElementById("repeat-details").addEventListener("toggle", function (e) { app.state.setRepeat(e) }, false);
  }
}

class UI {
  refreshRequired = false;
  refreshPermitted = true;
  isExactMatch = true;   // if false, it will match partial words, e.g. an > analytical

  setupEditing(e) {
    HTM.finalInfoDiv.classList.remove("word-detail");
  }

  // *****  FUNCTIONS

  dropdown(e) {
    // ## toggle visibility of settings dropdown
    // ## was originally handled in css but firefox has mouseout quirks
    // ## https://stackoverflow.com/questions/46831247/select-triggers-mouseleave-event-on-parent-element-in-mozilla-firefox
    if (e.relatedTarget === null) {
      return;
    }
    HTM.settingsContent.style.display = (e.type == "mouseenter") ? "flex" : "none";
  }


  registerLabelClick(e_label) {
    const label = e_label.target;
    if (label.htmlFor) {
      const input = document.getElementById(label.htmlFor);
      let parentID = label.htmlFor.split("_")[1];
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
        /* LOGIC:
         1) clicked element must be checked
         2) de-select an already-checked input */
        if (el.id == input.id) {
          if (input.checked) {
            input.checked = false;
            el_label.classList.remove("selected_txt");
          } else {
            el.checked = true;
            el_label.classList.add("selected_txt");
          }
        }
        /* LOGIC: in a group, if 1 radio checked, all others unchecked
         1) if already radio selected, no others selections allowed
         2) if el is radio, then it can't be selected */
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
        this.refreshLabels(parentID);
      }
      app.word.search(e_label);
    }
  }

  refreshLabels(parentID) {
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

  resetLevelInputs() {
    const allInputs = HTM.form.querySelectorAll("input[name='level']");
    allInputs.forEach(el => {
      el.checked = (parseInt(el.value) === -1);
      el.parentElement.classList.toggle("selected_text", el.checked); // * utilizes the toggle 'force' option
    });

    const allOptions = HTM.form.querySelectorAll("select[name='level'] > option");
    allOptions.forEach(el => {
      el.selected = (parseInt(el.value) === -1);
    });
  }


  getNotesAsHTML(entry) {
    let note = "";
    let awl_note = "";
    if (entry) {
      note = entry.notes;
      note = (note) ? `, ${note}` : "";
      awl_note = entry.awlHeadword;
      awl_note = (app.state.isBESTEP && awl_note) ? Tag.tag("span", ["class=awl-note"], ["(headword: ", Tag.tag("span", ["class=awl-headword"], [awl_note, ")"])]) : "";
    }
    return [note, awl_note];
  }

  highlightAwlWord(levelArr, lemma) {
    const result = (app.state.isBESTEP && levelArr.awl) ? Tag.tag("span", ["class=awl-word"], [lemma]) : lemma;
    return result;
  }


  getLevelPrefix(levels) {
    let levelText;
    const offlistID = levels.offlistTypeID;
    if (offlistID) {
      levelText = app.wordlist.offlist_subs[offlistID - 100][0];
      // TODO: change the numbering of offlist_subs to be triggered by minus numbers
    }
    else {
      const db_headingsCount = app.ui.getLevelHeadingArr().length;
      const levelInt = (levels.level === -1) ? 0 : levels.level;
      if (levelInt || levels.hasGept) {
        if (app.state.isGEPT && this.getLevelHeading(levelInt)) {
          levelText = this.getLevelHeading(levelInt)[0];
        }
        else if (app.state.isBESTEP) {
          // logic: use GEPT if available; else use AWL
          const geptHeading = this.getLevelHeading(levels.gept, 0);
          levelText = (geptHeading) ? geptHeading[0] : `awl${levelInt}`;
        }
        else if (app.state.isKids && levelInt <= db_headingsCount) {
          levelText = "k";
        }
        else if (app.state.isGZ6K && levelInt <= db_headingsCount) {
          levelText = `gz${levelInt}`;
        }
        else if (app.state.isREF2K && levelInt <= db_headingsCount) {
          levelText = `r${levelInt}`;
        }
      }
      if (!levelText) levelText = "o"
    }
    return levelText;
  }


  getLevelHeading(level, db_index=-1) {
    // * the -1 is because headings are indexed from zero & levels from 1
    return this.getLevelHeadingArr(db_index)[level - 1];
  }

  getLevelHeadingArr(db_index=-1) {
    // * the -1 is because headings are indexed from zero & levels from 1
    if (db_index < 0) db_index = app.state.current.db_state;
    return app.wordlist.headings[db_index];

  }

  signalRefreshNeeded(mode) {
    if (mode === "on") {
      this.refreshRequired = true;
      HTM.workingDiv.style.backgroundColor = "ivory";
      app.tabs.htm.textTabTag.classList.add("to-refresh");
      app.backup.htm.backupSave2.style.display = "block";
    }
    else {
      this.refreshRequired = false;
      this.refreshPermitted = false;
      // * This delay is required to stop accidental refresh requests during refresh process!
      debounce(()=>this.refreshPermitted = true, 1000);
      HTM.workingDiv.style.backgroundColor = "white";
      app.tabs.htm.textTabTag.classList.remove("to-refresh");
      app.backup.htm.backupSave2.style.display = "none";
    }
  }

  forceUpdateInputDiv() {
    this.refreshRequired = true;
    app.text.refresh();
  }
}

class Tools {
  NBSP = String.fromCharCode(160);
  // SplitHere = "___";

  isEmpty(arr) {
    if (typeof arr !== "object") return arr;
    else return !arr?.flat(Infinity).length;
  }

  dedupeSimpleArray(arr) {
    if (typeof arr !== "object") return [arr];
    arr = [...new Set(arr)];
    return arr;
  }

  pluralNoun(amount) {
    return (amount > 1) ? "s" : "";
  }

  normalizePastedText(e) {
    // ** preventDefault needed to prevent cursor resetting to start of div at every paste
    e.preventDefault();
    let paste = (e.clipboardData || window.clipboardData).getData('text');
    const selection = window.getSelection();
    selection.getRangeAt(0).insertNode(document.createTextNode(paste));
    app.ui.signalRefreshNeeded("on");
    app.text.refresh(e);
  }

  catchKeyboardCopyEvent(e) {
    // let isV = (e.keyCode === 86 || e.key === "v"); // this is to detect keyCode
    let isC = (e.keyCode === 67 || e.key === "c"); // this is to detect keyCode
    // let isCtrl = (e.keyCode === 17 || e.key === "Control");
    // let isMeta = (e.keyCode === 91 || e.key === "Meta");
    if (isC && (e.metaKey || e.ctrlKey)) {
      this.normalizeTextForClipboard();
    }
  }

  normalizeTextForClipboard(e) {
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


  EOLsToNewlines(text) {
    // const re = RegExp("\\s*" + EOL.text + "\\s*", "g");
    const re = RegExp(EOL.text, "g");
    const noEOLs = text.replace(re, "\n");
    return noEOLs;
  }

  newlinesToEOLs(text) {
    // return text.replace("\n", " " + EOL.text + " ");
    return text.replace("\n", EOL.text);
  }
}

class WordSearch {
  MATCHES = {
    exact: ["^", "$"],
    contains: ["", ""],
    starts: ["^", ".*"],
    ends: [".*", "$"]
  };

  search(e) {
    let resultsArr = [];
    let resultType = "";
    let HTMLstringToDisplay = "";
    const data = this.getFormData(e);
    app.ui.isExactMatch = (data.match[0] === "exact");
    let errorMsg = this.validateFormData(data);
    if (errorMsg) {
      HTMLstringToDisplay = this.markStringAsError(errorMsg);
    } else {
      const searchTerms = this.buildSearchTerms(data);
      [resultsArr, resultType] = this.runSearch(searchTerms);
      HTMLstringToDisplay = this.formatResultsAsHTML(resultsArr, resultType);
    }
    this.displayResults(HTMLstringToDisplay, resultsArr.length);
  }

  markStringAsError(str) {
    return Tag.tag("span", ["class=error"], [str]).stringify();
  }

  updateKidstheme(e) {
    const selection = e.target;
    // debug(selection.tagName, selection.value)
    selection.dataset.chosen = selection.value;
    this.search(e);
    // HTM.form.submit();
  }

  getFormData(e) {
    let raw_data = new FormData(HTM.form);
    if (e) e.preventDefault();
    let data = {
      term: [],
      match: [],
      glevel: [],
      level: [],
      pos: []
    };
    // ** Read & normalize raw data into 'data' object
    for (let [key, value] of raw_data) {
      // ## default value of html option (but screws up db lookup)
      if (value === "-1") value = "";
      const digit = parseInt(value)
      if (Number.isInteger(digit)) data[key].push(digit);
      else {
        const strVal = value.trim();
        if (strVal) data[key].push(strVal);
      }
    }
    return data;
  }

  validateFormData(data) {
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
    // if (term.search(/[^a-z\-\s'\.]/g) > -1) status = 1;
    if (term.search(/[^a-z\-\s'.]/g) > -1) status = 1;
    const errorMsg = [
      "",
      "The only non-alphabetic characters allowed are space, apostrophe, and hyphen.",
      "Please enter at least one search term to restrict the number of results.",
      "Enter a search term."
    ][status];
    return errorMsg;
  }

  buildSearchTerms(data) {
    let lemma = data.term.join().toLowerCase();
    const matchType = this.MATCHES[data.match];
    let modifiedLevel = data.level;
    // if (app.state.isBESTEP) modifiedLevel = data.level.map( level => (level < 100) ? level + app.wordlist.awl_level_offset : level);
    if (app.state.isBESTEP) modifiedLevel = data.level;
    const searchTerms = {
      lemma: new RegExp(matchType[0] + lemma + matchType[1], "i"),
      raw_lemma: lemma,
      glevel: data.glevel,
      level: modifiedLevel,
      pos: data.pos.join("|")
    };
    return searchTerms;
  }

  runSearch(searchTerms) {
    // TODO: refactor using sub functions to make process clearer
    searchTerms.raw_lemma = this.removeNegativeSuffix(searchTerms.raw_lemma);
    console.log("searchterms:",searchTerms)
    let tokenType;
    let matchedEntryArr = app.wordlist.getEntriesByPartialLemma(searchTerms.lemma);
    [tokenType, matchedEntryArr] = app.search.checkAgainstLookups(searchTerms.raw_lemma, matchedEntryArr);
    matchedEntryArr.push(this.lazyCheckAgainstCompounds(searchTerms.raw_lemma));
    if (Number.isInteger(searchTerms.glevel[0]) && (app.state.isGEPT || app.state.isBESTEP)) {
      let tmp_matches = [];
      for (const level of searchTerms.glevel) {
        for (const entry of matchedEntryArr) {
          if (entry.gept === level) tmp_matches.push(entry);
        }
      }
      matchedEntryArr = tmp_matches;
    }
    if (searchTerms.pos.length) {
      matchedEntryArr = matchedEntryArr.filter(el => el.pos?.search(searchTerms.pos) != -1);
    }
    if (searchTerms?.level.length){
      if (app.state.isBESTEP) {
        if (searchTerms.level[0] === Entry.FIND_GEPT_ONLY) {
          matchedEntryArr = matchedEntryArr.filter(entry => entry.gept);
        }
        else if (searchTerms.level[0] === Entry.FIND_AWL_ONLY) {
          matchedEntryArr = matchedEntryArr.filter(entry => entry.awl);
        }
        else {
          matchedEntryArr = matchedEntryArr.filter(entry => searchTerms.level.indexOf(entry.level) > -1);
        }
      }
      else if (app.state.isGZ6K) {
          matchedEntryArr = matchedEntryArr.filter(entry => searchTerms.level.indexOf(entry.level) > -1);
      }
      else if (app.state.isREF2K && searchTerms.level.length) {
          matchedEntryArr = matchedEntryArr.filter(entry => searchTerms.level.indexOf(entry.level) > -1);
      }

    }
    matchedEntryArr = matchedEntryArr.filter(result => result.id > 0);
    return [matchedEntryArr, tokenType];
  }

  removeNegativeSuffix (word) {
    const negVerbStemIndex = word.indexOf("'");
    const truncatedWord = (negVerbStemIndex > 0) ? word.slice(0, negVerbStemIndex) : word;
    return truncatedWord;
  }

  lazyCheckAgainstCompounds(word) {
    const tmpWord = word.replace(/-'\./g, "").split(" ").join("");
    let result = [];
    for (const [compound, id] of Object.entries(app.wordlist.compounds)) {
      if (compound.startsWith(tmpWord)) {
        result.push(id);
        break;
      }
    }
    return result;
  }


  formatResultsAsHTML(results, resultType) {
    let resultsAsTags;
    // const db_index = app.state.current.db_state;
    // const levelHeadings = app.wordlist.headings[db_index];
    const levelHeadings = app.ui.getLevelHeadingArr();
    if (app.tools.isEmpty(results)) {
      resultsAsTags = Tag.tag("span", ["class=warning"], ["Search returned no results."]);
    }
    else {
      const lemmaPrefix = (resultType.length > 1) ? "≈ " : "";
      let output = [];
      let previousInitial = "";
      let currentInitial = "";
      let i = 0;
      for (const entry of results.sort(this.compareByLemma)) {
        currentInitial = (entry.lemma) ? entry.lemma[0].toLowerCase() : "";
        if (currentInitial !== previousInitial) {
          output.push(this.formatResultsAsTablerows(currentInitial.toLocaleUpperCase(), "", "black", ""));
        }
        const awlWord = app.ui.highlightAwlWord(entry.levelArr, entry.lemma);
        const lemma = Tag.tag("strong", [], [awlWord]);
        let pos;
        if (entry.posExpansion) pos = `[${entry.posExpansion}]`;
        else {
          pos = "";
          console.log("PoS information missing from entry in wordlist:", entry.lemma);
        }
        // TODO: generalize this for all levels, maybe using separate level heading list in defaults
        // let level = app.wordlist.headings[db_index][entry.level];
        // let level = levelHeadings[entry.level - 1];
        let level = app.ui.getLevelHeading(entry.level);
        if (app.state.isBESTEP) {
          const tmpGEPT = app.ui.getLevelHeading(entry.gept, 0);
          level = [tmpGEPT,level].filter(entry => entry).join("/");
        }
        // if (!level) continue;
        let [note, awl_note] = app.ui.getNotesAsHTML(entry);
        // console.log(`>> format results as html: ${entry.lemma}, ${entry.level}, ${entry.levelArr}, heading=${levelHeadings[entry.level]}, note=${note}`)
        const col2 = [lemmaPrefix, lemma, ": ", Tag.tag("span", ["class=show-pos"], [pos]), " ", Tag.tag("span", ["class=show-level"], [level]), note, awl_note];
        let class2 = "level-" + app.ui.getLevelPrefix(entry.levelArr);
        // console.log(">>>>", entry, class2)
        output.push(this.formatResultsAsTablerows(`${i + 1}`, col2, "", class2));
        previousInitial = currentInitial;
        i++;
      }
      resultsAsTags = Tag.tag("table", [], [...output]);
    }
    return resultsAsTags.stringify();
  }


  formatResultsAsTablerows(col1, col2, class1, class2) {
    class1 = (class1) ? `class=${class1}` : "";
    class2 = (class2) ? `class=${class2}` : "";
    return Tag.tag("tr", [], [
      Tag.tag("td", [class1], [col1]),
      Tag.tag("td", [class2], [...col2]),
    ]);
  }

  displayResults(resultsAsHtmlString, resultCount = 0) {
    let text = LOOKUP.legends.results;
    if (resultCount) text += ` (${resultCount})`;
    HTM.resultsLegend.innerHTML = text;
    HTM.resultsText.innerHTML = resultsAsHtmlString;
  }

  compareByLemma(a, b) {
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
}

class Repeats {
  repsByLemma = {};

  buildHTMLrepeatList() {
    const repeatedLemmas = Object.keys(this.repsByLemma).sort();
    const totalOfRepeatedLemmas = repeatedLemmas.length;
    let repeatsHeader;
    let listOfRepeats = [];
    if (totalOfRepeatedLemmas) {
      for (const lemma of repeatedLemmas) {
        const [totalReps, id] = this.repsByLemma[lemma];
        const entry = app.wordlist.getEntryById(id);
        let anchors = [];
        for (let rep = 1; rep <= totalReps + 1; rep++) {
          let displayText = rep;
          let displayClass = "class=anchors";
          if (rep === 1) {
            displayText = app.ui.highlightAwlWord(entry.levelArr, lemma);
            displayClass = `class=level-${app.ui.getLevelPrefix(entry.levelArr)}`;
          }
          anchors.push(" ", Tag.tag("a", ["href=#", displayClass, `onclick=app.repeats.jumpToDuplicate('all_${id}_${rep}'); return false;`], [displayText]));
        }
        listOfRepeats.push(Tag.tag("p", [`data-entry=${id}`, `class=duplicate all_${id} level-${app.ui.getLevelPrefix(entry.levelArr)}`], [...anchors]));
      }
      const toggleOpen = (app.state.current.repeat_state) ? " open" : "";
      repeatsHeader = Tag.tag("details", [`id=${app.listeners.detailID}`, toggleOpen], [
        Tag.tag("summary", ["id=all_repeats", "class=all-repeats"], [
          totalOfRepeatedLemmas,
          ` significant repeated word${app.tools.pluralNoun(totalOfRepeatedLemmas)}`,
        ]),
        Tag.tag("p", [], [
          Tag.tag("em", [], ["Click on word / number to jump to that occurrence."])
        ]),
        Tag.tag("div", ["id=repeats"], [...listOfRepeats]),
      ]);
    }
    else {
      repeatsHeader = Tag.tag("p", [`id=${app.listeners.detailID}`], [
        Tag.tag("span", ["id=all_repeats", "class=all-repeats"], ["There are no significant repeated words."])]);
    }
    return repeatsHeader.stringify();
  }

  displayList(listOfRepeats, levelStatsHTML) {
    HTM.repeatsList.innerHTML = levelStatsHTML + listOfRepeats;
  }

  jumpToDuplicate(id) {
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

  countReps(tokenArr) {
    const [repsByLemma, repsByTokenID] = this.identifyRepeats(tokenArr);
    for (const i in tokenArr){
      const token = tokenArr[i];
      const info = this.buildTagInfo(token, repsByLemma, repsByTokenID, i);
      token.info = info;
      if (token.type.startsWith("w") && info.totalReps > 0) {
        token.info.thisRep = this.countPrevious(token, tokenArr, i);
      }
    }
  }

  countPrevious(token, tokenArr, indexOfToken) {
    let count = 0;
    const lemma = token.info.repeatedLemma;
    for (let i=0; i < indexOfToken; i++) {
      if (tokenArr[i].info.repeatedLemma === lemma) count++;
    }
    return count;
  }

  identifyRepeats(tokenArr) {
    const allFrequenciesByLemma = app.stats.allLemmas;
    const allLemmasByTokenID = app.stats.allLemmasByTokenID;
    let repsByLemma = {};
    for (const lemma of Object.keys(allFrequenciesByLemma)) {
      if (allFrequenciesByLemma[lemma][0] && !LOOKUP.repeatableWords.includes(lemma)) repsByLemma[lemma] = allFrequenciesByLemma[lemma];
    }
    this.repsByLemma = repsByLemma;
    const listOfRepeatedLemmas = Object.keys(repsByLemma);
    let repsByTokenID = {};
    for (const id of Object.keys(allLemmasByTokenID)){
      if (listOfRepeatedLemmas.includes(allLemmasByTokenID[id])) repsByTokenID[id] = allLemmasByTokenID[id];
    }
    return [repsByLemma, repsByTokenID];
  }

  buildTagInfo(token, repsByLemma, repsByToken, indexOfToken){
    let info = {};
    if (token.type.startsWith("w")){
      const totalReps = repsByLemma[repsByToken[indexOfToken]]?.[0] || 0;
      const thisRep = -1;
      const repeatedLemma = repsByToken[indexOfToken] || "";
      info = {
        totalReps: totalReps,
        thisRep: thisRep,
        repeatedLemma: repeatedLemma,
        displayLevel: token.matches[0].gept,
      }
    }
    return info;
  }

  checkIfLevelsDiffer(token){
    const levelsDiffer = (token.matches.length > 1) && token.matches.some(el => el.gept !== token.matches[0].gept);
    return levelsDiffer;
  }

}

class WordStatistics {
  allLemmas = {};  // * { lemma : [totalFrequency, entryID, GEPTlevel]}
  allLemmasByTokenID = {};

  totalWordCount = 0; // includes numbers etc
  totalLemmaCount = 0; // all headwords (including offlist, but not numbers etc.)

  logAllWords(tokenArr) {
    // TODO: generalize logging for different wordlists here
    let wordCount = 0;
    let allFrequenciesByLemma = {}; // * {lemma : [frequency starting from 0, entry id]}
    let allLemmasByTokenID = {};    // * {token id : lemma} to allow many (token) to 1 (lemma) linking
    for (const i in tokenArr){
      const token = tokenArr[i];
      if (!["m", "s", "c", "p", "@"].includes(token?.type[0])) wordCount++;
      const firstEntry = token.matches[0];
      if (firstEntry) {
        const lemma = app.wordlist.getEntryById(firstEntry.id).lemma;
        if (token?.type.startsWith("w")) {
          let frequency = 0;
          if (allFrequenciesByLemma[lemma]?.[0] >= 0) frequency = allFrequenciesByLemma[lemma][0] + 1;
          allFrequenciesByLemma[lemma] = [frequency, firstEntry.id, firstEntry.gept, firstEntry.level];
          allLemmasByTokenID[i] = lemma;
        }
      }
    }
    this.allLemmas = allFrequenciesByLemma;
    this.allLemmasByTokenID = allLemmasByTokenID;
    this.totalWordCount = wordCount;
    this.totalLemmaCount = Object.keys(allFrequenciesByLemma).length;
  }


  getAllLevelStats() {
    const lemmasByLevel = this.compileLemmasByLevel();
    let statsForThisLevel = []  // [level, levelText, lemmaSubTotal, percent of total lemmas]
    for (const [key, levelsByList] of Object.entries(lemmasByLevel)) {
      for (let [level, lemmaArr] of Object.entries(levelsByList)) {
        if (!app.state.isBESTEP && key === "gept") continue;
        level = parseInt(level);
        const lemmaTotalAtThisLevel = lemmaArr.length;
        const percentAtThisLevel = Math.round(100 * (lemmaTotalAtThisLevel / this.totalLemmaCount));
        let levelText = this.getLevelText(key, level);
        let levelPrefix = this.getlevelPrefixForCSS(key, level);
        statsForThisLevel.push([level, levelPrefix, levelText, lemmaTotalAtThisLevel, percentAtThisLevel + "%"]);
      }
    }
    // console.log("stats for this level:",statsForThisLevel)
    return statsForThisLevel;
  }

  getLevelText(key, level){
    let levelText;
    if (app.state.isBESTEP && key === "gept") levelText = app.ui.getLevelHeading(level, 0);  // get GEPT headings
    else levelText = app.ui.getLevelHeading(level);  // get current level headings
    if (!levelText) levelText = "offlist";
    return levelText;
  }

  getlevelPrefixForCSS(key, level) {
    let levelArr = new Levels();
    if (key === "curr") levelArr.levels[app.state.current.db_state] = level;
    else levelArr.levels[0] = level;
    return app.ui.getLevelPrefix(levelArr);
  }

  addOrUpdate(list, index, value) {
    list[index] = (list[index]) ? list[index].concat([value]) : [value];
    return list[index];
  }

  compileLemmasByLevel() {
    // console.log("allLemmas:",this.allLemmas)
    let lemmasByLevel = {gept: {}, curr: {}}  // {level : [lemma, lemma, ...]}
    for (let [lemma, [freq, id, geptLevel, currLevel]] of Object.entries(this.allLemmas)){
      geptLevel = parseInt(geptLevel);
      currLevel = parseInt(currLevel);
      if (geptLevel && app.state.isBESTEP) {
        lemmasByLevel["gept"][geptLevel] = this.addOrUpdate(lemmasByLevel["gept"], geptLevel, lemma);
      }
      lemmasByLevel["curr"][currLevel] = this.addOrUpdate(lemmasByLevel["curr"], currLevel, lemma);
    }
    // console.log("lemmas by level", lemmasByLevel)
    return lemmasByLevel;
  }

  buildHTMLlevelStats(tokenArr) {
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
    const levelStats = this.getAllLevelStats();
    let levelStatsHTML = "";
    if (!this.totalLemmaCount) return levelStatsHTML;
    let tmpStats = [];
    for (let [levelID, levelPrefix, levelText, total, percent] of levelStats) {
      let levelDisplayText = levelText;
      if (app.state.isKids) {
        // * to trim kids' theme names to manageable display length
        const match = /\((.+?)\)/.exec(levelText);
        if (match) levelDisplayText = match[1];
      }
      tmpStats.push(Tag.tag("p", [`class=level-${levelPrefix}`], [levelDisplayText, ": ", total, " (", percent, ")"]));
    }
    const toggleOpen = (app.state.current.level_state) ? " open" : "";
    levelStatsHTML = Tag.root([Tag.tag("details", ["id=level-details", toggleOpen], [
      Tag.tag("summary", ["class=all-repeats"], [
        "Level statistics:",
        Tag.tag("em", [], [this.totalLemmaCount, " headwords"]),
      ]),
      Tag.tag("div", ["class=level-stats-cols"], [...tmpStats])
    ])
    ]);
    return levelStatsHTML.stringify();
  }
}

class Text {
  refresh(e) {
    if (!app.ui.refreshRequired) return;
    app.ui.signalRefreshNeeded("off");
    let revisedText = this.textGetWithCursor().trim();
    if (revisedText) {
      const tokenArr = app.parser.markup(revisedText);
      app.repeats.countReps(tokenArr)
      this.textBuildHTML(tokenArr);
      app.backup.save();
    }
  }

  textGetWithCursor() {
    let revisedText = app.cursor.insertPlaceholder(HTM.workingDiv, app.cursor.offset);
    if (revisedText === app.cursor.text) revisedText = "";
    return revisedText;
  }

  render(resultsHTML, repeatsHTML, levelStatsHTML, wordCount) {
    app.wordlist.displayDbNameInTab2(this.getWordCountAsHTML(wordCount));
    app.repeats.displayList(repeatsHTML, levelStatsHTML);
    this.textDisplayWorking(resultsHTML);
    app.listeners.addDetailToggle(document.getElementById("level-details"));
  }

  getWordCountAsHTML(wordCount) {
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

  textDisplayWorking(html) {
    HTM.workingDiv.innerHTML = html;
  }

  textBuildHTML(tokenArr) {
    const repeatsHTML = app.repeats.buildHTMLrepeatList();
    const levelStatsHTML = app.stats.buildHTMLlevelStats(tokenArr);
    this.render(this.buildHTMLtext(tokenArr), repeatsHTML, levelStatsHTML, app.stats.totalWordCount);
    app.cursor.setPos(document.getElementById(app.cursor.id));
  }

  buildHTMLtext(tokenArr) {
    let toWrapInHTML = ["w", "wc", "wv", "wn", "wo", "wd", "wdv", "wvd", "c", "d", "y", "wnd"];
    // ** word/compound/variant/offlist/derivation, contraction, decimal, y=symbol?
    let htmlString = "";
    let wordIndex = 0;
    for (let token of tokenArr) {
      const firstType = token.type;
      if (firstType === "pe") htmlString += `\n${EOL.HTMLtext}`;
      else if (firstType === "mc") htmlString += app.cursor.HTMLtext;
      else if (!toWrapInHTML.includes(firstType)) htmlString += token.lemma;
      else {
        wordIndex++;
        const groupedWord = this.buildHTMLword(token, wordIndex);
        htmlString += groupedWord;
      }
    }
    return htmlString;
  }

  buildHTMLword(token, wordIndex) {
    // ** expects populated list of matches (therefore requires textLookupSimples)
    let word = {
      lemma: token.lemma,
      id: token.matches[0].id,
      type: token.type,
      levelArr: token.matches[0].levelArr,
      level: token.matches[0].gept,
      matches: token.matches,
      matchCount: token.matches.length,
      totalReps: token.info.totalReps,
      thisRep: token.info.thisRep,
      isMixedLevels: token.isMixedLevels,
    }
    if (!word.matchCount) console.warn(`Unprocessed item (${word.lemma})!!`)
    const renderedWord = app.ui.highlightAwlWord(word.levelArr, word.lemma);
    const variantClass = (word.type.includes("v")) ? " variant" : "";
    const [levelClass,
      limitClass,
      multiLevelClass
    ] = this.renderLevelInfo(word);
    const [relatedWordsClass,
      repStatusClass,
      dataReps,
      idLinkingReps
    ] = this.renderRepsInfo(word);
    let listOfLinksArr = word.matches.map(entry => `${entry.id}:${word.lemma.trim()}:${word.type}`);
    const classes = this.getSpaceSeparatedList([levelClass, relatedWordsClass, repStatusClass, variantClass, limitClass, multiLevelClass]);
    const displayWord = Tag.tag("span", [`data-entry=${listOfLinksArr.join(" ")}`, `class=${classes}`, dataReps, idLinkingReps], [renderedWord]);
    return displayWord.stringify();
  }

  renderRepsInfo(word) {
    let relatedWordsClass = `all_${word.id}`;
    let [repStatusClass, dataReps, idLinkingReps] = ["", "", ""];
    if (word.totalReps > 0) {
      repStatusClass = "duplicate";
      dataReps = `data-reps=${word.totalReps}`;
      idLinkingReps = `id=${relatedWordsClass}_${word.thisRep + 1}`;
    }
    return [relatedWordsClass, repStatusClass, dataReps, idLinkingReps];
  }

  renderLevelInfo(word) {
    const levelClass = "level-" + app.ui.getLevelPrefix(word.levelArr);
    // console.log(">> render level info:", app.state.current.db_state,word.lemma, word.levelArr[app.state.current.db_state], levelClass,...word.levelArr)
    const limitClass = app.limit.renderAsCSS(levelClass);
    let multiLevelStatusClass = "";
    if (word.matchCount > 1) multiLevelStatusClass = (word.isMixedLevels) ? "multi-diff" : "multi-same";
    return [levelClass, limitClass, multiLevelStatusClass];
  }

  getSpaceSeparatedList(list) {
    return list.filter(el => el).join(" ");
  }
}


class Parser {
  wordlikeTokenTypes = {
    c: "contraction",
    d: "digit",
    y: "symbol",
  };

  splitAtUnderscoreOrBoundary = new RegExp(`${LOOKUP.splitHere}|\\b`);

  markup(revisedText) {
    app.ui.signalRefreshNeeded("off");
    app.ui.isExactMatch = true;
    app.wordlist.resetOfflistDb();
    let tokenArr = this.divideIntoTokens(revisedText);
    revisedText = null;
    tokenArr = this.lookupCompounds(tokenArr);
    tokenArr = this.lookupSimples(tokenArr);
    tokenArr = this.addfixes(tokenArr);
    app.stats.logAllWords(tokenArr);
    console.log({tokenArr});
    return tokenArr;
  }

  divideIntoTokens(rawText) {
    app.ui.signalRefreshNeeded("off");
    if (typeof rawText === "object") return;
    let text = this.normalizeRawText(rawText);
    let tokenArr = this.tokenizePipeline(text);
    return tokenArr;
  }

  tokenizePipeline(text) {
    let textArr = this.split(text);
    textArr = this.tokenize1(textArr);   // identify main tokens
    textArr = this.tokenize2(textArr);   // confirm identification + prepare for grouping
    textArr = this.tokenize3(textArr);   // fine-tune position of splits
    textArr = this.tokenize4(textArr);
    return textArr;
  }


  split(text) {
    text = text.replaceAll(/(A|P)\.(M)\./ig, "$1qqq$2qqq");           // protect preferred A.M. / P.M.
    text = text.replaceAll(/(\d)(a|p\.?m\.?\b)/ig, "$1 $2");          // separate 7pm > 7 pm
    const re = new RegExp("(\\w+)(" + app.cursor.text + ")(\\w+)", "g");  // catch cursor
    text = text.replaceAll(re, "$1$3$2");                             // move cursor to word end (to preserve word for lookup)
    // text = text.replaceAll("\n", EOL.text);                        // catch newlines (already caught by normalizeRawText)
    text = text.replaceAll(/([#\$£]\d)/g, "___$1");                   // ensure currency symbols stay with number
    text = text.trim();
    return text.split(this.splitAtUnderscoreOrBoundary);              // use triple underscore as extra breakpoint
  }


  tokenize1(textArr) {
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
      else if (/[+\-=@*<>&]/.test(el)) token = "y";    // symbols
      else if (el === ".") token = "@";                // punctuation digit (i.e. occurs in digits)
      else if (el === ",") token = "@";
      else if (/["',./?!()[\]]/.test(el)) token = "p";                // punctuation
      else if (el.indexOf("qqq") >= 0) [el, token] = [el.replaceAll("qqq", "."), "w"];
      else if (el.indexOf(EOL.simpleText) >= 0) [el, token] = ["", "pe"];    // punctuation newline
      else if (el.indexOf(app.cursor.simpleText) >= 0) [el, token] = ["", "mc"]; // metacharacter cursor
      else if (/--/.test(el)) token = "p";                                   // m-dash
      else if (/\s/.test(el) && el.indexOf("-") >= 0) token = "p";           // dash (i.e. punctuation)
      else if (/[a-zA-Z]/.test(el)) token = "w";                             // word
      tmpArr.push([el, token]);
    }
    return tmpArr;
  }

  tokenize2(textArr) {
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

  tokenize3(textArr) {
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
        } else tmpTokenArr.push(new Token(...[el[TOKEN], el[TYPE]]));
      }
    }
    return tmpTokenArr;
  }

  tokenize4(taggedTokenArr) {
    // ** to deal with measurements i.e. num+abbrev. (no space)
    let tmpTokenArr = [];
    for (let token of taggedTokenArr) {
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
    }
    return tmpTokenArr;
  }


addfixes(tokenArr){
  // * deals with annoying/misleading matches, e.g. <haven't> is not related to <haven>!
  for (let i=0; i < tokenArr.length; i++){
    const currToken = tokenArr[i];
    const nextToken = (i < tokenArr.length) ? tokenArr[i + 1] : "";

    if (currToken.lemma === "haven" && nextToken.lemma === "'t") {
      const auxHaveVerb = app.wordlist.getEntriesByExactLemma("have").filter(match => match.pos.includes("x"));
      currToken.overwriteMatches(auxHaveVerb);
    }
  }
  return tokenArr;
}


  lookupCompounds(tokenArr) {
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
        for (const [compound, [id, levelArr]] of Object.entries(app.wordlist.compounds)) {
          if (wordBlob.startsWith(compound) && levelArr.isInCurrentList) {
            token.appendMatches(app.wordlist.getEntryById(id));
            break;
          }
        }
      }
    }
    return tokenArr;
  }

  isInWordlist(levelArr) {
    let level;
    if (levelArr?.length) {
      if (app.state.isBESTEP) level = (levelArr[0][0] || levelArr[1][0]);
      else level = levelArr[app.state.current.db_state][0];
    }
    return level;
  }


  normalizeRawText(text) {
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/,/g, ",")        // replace curly comma
      .replace(/…/g, "...")
      .replace(/(\r\n|\r|\n)/g, "\n")          // encode EOLs
      .replace(/\n{2,}/g, "\n")
      .replace(/\n/g, `${EOL.text}`)           // encode EOLs
      .replace(/–/g, " -- ")                   // pasted in em-dashes
      .replace(/—/g, " - ")
      .replace(/(\w)\/(\w)/g, "$1 / $2")       // insert spaces either side of slash
      .replace(/\s{2,}/gm, " ");               //
  }

  lookupSimples(tokenArr) {
    // Provide lookups for all non-punctuation tokens + log repetitions
    for (let token of tokenArr) {
      // ** ignore compounds for now; they are dealt with separately
      if (token.type === "w") {
        const [revisedType, matchedEntryArr] = this.lookupWord(token.lemma);
        if (matchedEntryArr.length) {
          token.appendMatches(matchedEntryArr);
          this.removeOfflistIfMatchFound(token)
          token.type = revisedType;
        }
      }
      else if (Object.keys(this.wordlikeTokenTypes).includes(token.type)) {
        token.overwriteMatches(this.markOfflist(token.lemma, this.wordlikeTokenTypes[token.type]));
      }
    }
    return tokenArr;
  }

  removeOfflistIfMatchFound(token) {
    if (token.matches.some(el => el.id < 0) && token.matches.some(el => el.id > 0) ) {
      token.overwriteMatches(token.matches.filter(el => el.id > 0));
    }
    return token;
  }


  markOfflist(word, offlistType) {
    word = word.trim();
    // ** adds entry to offlistDb & returns ID (always negative number)
    // ** This creates a dummy dB entry for offlist words
    let offlistEntry;
    let isUnique = true;
    for (const entry of app.wordlist.offlistDb) {
      if (entry.lemma === word) {
        isUnique = false;
        offlistEntry = entry;
        break;
      }
    }
    if (isUnique) {
      // TODO: this catches offlist/contractions etc. - make the workings more integrated/transparent
      const offlistTypeShortForm = (offlistType === "symbol") ? "y" : offlistType[0];
      const offlistID = 100 + ["u", "o","c", "d", "y"].indexOf(offlistTypeShortForm);
      offlistEntry = this.addNewEntryToOfflistDb([word, offlistType, [offlistID, -1, -1, -1, -1], ""]);
    }
    return offlistEntry;
  }

  addNewEntryToOfflistDb(entryContents) {
    const offlistID = -(app.wordlist.offlistDb.length);
    const newEntry = new Entry(...entryContents, offlistID);
    app.wordlist.offlistDb.push(newEntry);
    app.wordlist.offlistIndex++;
    return newEntry;
  }

  lookupWord(word) {
    word = word.toLowerCase();
    let [tokenType, matchedEntryArr] = app.search.checkAgainstLookups(word, app.wordlist.getEntriesByExactLemma(word));
    if (!matchedEntryArr.length) {
      matchedEntryArr = [this.markOfflist(word.toLowerCase(), "offlist")];
    }
    const results = [tokenType, matchedEntryArr];
    return results;
  }

  findBaseForm(word, subs) {
    // ** Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
    let matchedEntryArr = [];
    for (const [ending, sub] of subs) {
      const root = word.slice(0, -ending.length);
      if ((root + ending) === word) {
        const candidate = root + sub;
        const tmp_match = app.wordlist.getEntriesByExactLemma(candidate);
        // * to deal with things like "surpris-ing-ly", "alledg-ed-ly"
        if (!tmp_match.length && word.endsWith("ly")) {
          const tmp_match = app.wordlist.getEntriesByExactLemma(app.search.removeObviousSuffixes(word));
        }
        if (tmp_match.length) matchedEntryArr.push(...tmp_match);
      }
    }
    return matchedEntryArr;
  }
}


class InformationPanes {
  hoverEffects(e) {
    // ** references to parent elements are to reach embedded elements
    const el = e.target;
    if (typeof el.classList === 'undefined') return;
    // ** 1) show information text for elements with a 'data-entry' attribute
    if (el.dataset.entry || el.parentElement.dataset.entry) {
      const ref = (el.dataset.entry) ? el.dataset.entry : el.parentElement.dataset.entry;
      HTM.finalInfoDiv.innerHTML = this.displayEntryInfo(ref);
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
      this.toggleHighlight(dupes);
    }
  }

  toggleHighlight(els) {
    for (const el of els) {
      el.classList.toggle("highlight");
    }
  }
  displayEntryInfo(refs) {
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
      const levelClass = "level-" + app.ui.getLevelPrefix(entry.levelArr);
      const lemma = this.buildHTMLlemma(entry, id, word, tokenType);
      const levelTagArr = this.buildHTMLlevel(entry, id, tokenType);
      const levelTag = (entry.gept <= 99)
        ? Tag.tag("div", [], [this.buildHTMLlevelDot(entry), " ", ...levelTagArr])
        : "";
      const pos = `[${entry.posExpansion}]`;
      let [notes, awl_notes] = app.ui.getNotesAsHTML(entry);
      html.push(Tag.tag(
        "div",
        [`class=word-detail ${levelClass}`],
        [levelTag, Tag.tag("span", [], [...lemma, pos, notes, awl_notes])]
      ));
    }
    html = Tag.root(html);
    return html.stringify();
  }


  buildHTMLlemma(entry, id, word, tokenType) {
    let displayLemma;
    if (entry.pos === "unknown") return displayLemma;
    if (tokenType === "wv") {
      displayLemma = [entry.lemma, " ≈ ", Tag.tag("span", ["class=lemma"], word)];
    } else if (tokenType === "wd") {
      displayLemma = [word, " < ", Tag.tag("span", ["class=lemma"], entry.lemma)];
    } else if (tokenType === "wn") {
      displayLemma = [word, Tag.tag("em", [], " negative of "), Tag.tag("span", ["class=lemma"], entry.lemma)];
    } else displayLemma = [Tag.tag("span", ["class=lemma"], entry.lemma)];
    return displayLemma;
  }


  buildHTMLlevel(entry, id, tokenType) {
    let levelStr;
    // ** If word is offlist, use its classification (digit/name, etc.) as level
    if (tokenType !== "wv" && app.wordlist.isInOfflistDb(id)) {
      levelStr = entry.pos; // a string, e.g. "jn"
    }
    else if (["d", "y", "c", "wo"].includes(tokenType)) levelStr = "";
    else if (app.state.isBESTEP && entry.gept) levelStr = app.ui.getLevelHeading(entry.gept, 0);
    else levelStr = app.ui.getLevelHeading(entry.level);
    let level = (levelStr) ? [Tag.tag("em", [], levelStr), Tag.tag("br")] : [];
    return level;
  }


  buildHTMLlevelDot(entry) {
    let html = "";
    let dotText;
    if (app.state.isKids) {
      dotText = "";
    }
    else if (app.state.isGZ6K) {
      dotText = entry.level;
    }
    else if (app.state.isREF2K) {
      dotText = entry.level;
    }
    else if (entry.gept >=0 && entry.gept <= 3) {
        dotText = ["E", "I", "H"][entry.gept - 1];
    }
    html = (dotText) ? Tag.tag("span", ["class=dot"], [dotText]) : "";
    if (app.state.isBESTEP && entry.awl >= 1) html = Tag.root(html, ...this.buildHTMLlevelAWL(entry));
    return html;
  }


  buildHTMLlevelAWL(entry) {
    return [" ", Tag.tag("span", ["class=awl-level"], [`AWL ${entry.level}`])];
  }

  buildHTMLlevelKids(entry) {
    return [" ", Tag.tag("span", ["class=awl-level"], ["level-k"])];
  }
}

class State {
  default = {
    db_state: 0,
    tab_state: 0,
    limit_state: -1,  // ** index in app.limit.LEVEL_LIMITS of lowest level to show strikethrough (e.g. 1 = hi-int)
    help_state: 1,
    level_state: 1,
    repeat_state: 1,
    font_state: "11",
  };

  current = {};

  FONT_UNIT = "pt";

  constructor() {
    const retrieved_items = this.readFromStorage();
    for (const key in retrieved_items) {
      const value = retrieved_items[key];
      this.current[key] = value;
    }
  }


  setDetail(e, destination) {
    let el, mode;
    if (e.target) {
      el = e.target;
      mode = "toggle";
    } else {
      el = HTM[destination];
      mode = e;
    }
    if (mode === "toggle") {
      this.current[destination] = (el.hasAttribute("open")) ? 1 : 0;
    }
    else {
      if (mode === "reset") this.current[destination] = this.default[destination];
      if (this.current[destination] && el) el.setAttribute("open", "")
      else if (el) el.removeAttribute("open");
    }
    this.saveItem(destination, this.current[destination]);
  }
  forceDefault() {
    for (const key in this.default) {
      const defaultVal = this.default[key];
      this.saveItem(key, defaultVal)
      this.current[key] = defaultVal;
    }
  }

  readFromStorage() {
    let retrieved_items = {};
    for (const key in this.default) {
      const retrieved_item = localStorage.getItem(key);
      retrieved_items[key] = (retrieved_item) ? parseInt(retrieved_item) : this.default[key];
    }
    return retrieved_items;
  }


  saveItem(item, value) {
    localStorage.setItem(item, value);
  }

  get isGEPT() {
    return app.state.current.db_state === 0;
  }

  get isBESTEP() {
    return app.state.current.db_state === 1;
  }

  get isKids() {
    return app.state.current.db_state === 2;
  }

  get isGZ6K() {
    return app.state.current.db_state === 3;
  }

  get isREF2K() {
    return app.state.current.db_state === 4;
  }

  setHelp(e) {
    this.setDetail(e, "help_state");
  }

  setRepeat(e) {
    this.setDetail(e, "repeat_state");
  }

  setLevel(e) {
    this.setDetail(e, "level_state");
  }

  changeFont(e) {
    // ** if called without parameters, defaults to app.state.current value
    const fontSize = (e ? e.target.value : app.state.current.font_state);
    HTM.root_css.style.setProperty("--font-size", fontSize + this.FONT_UNIT);
    this.saveItem("font_state", fontSize);
  }

  setFont(reset = "") {
    const fontSize = (reset ? this.default.font_state : this.current.font_state);
    this.current.font_state = fontSize;
    this.changeFont();
    for (const el of HTM.selectFontSize.children) {
      el.selected = (el.value == fontSize);
    }
  }

  updateDbInMenu() {
    HTM.selectDb.value = this.current.db_state;
  }

}


class Db {
  name;
  factory;
  db;
  toShow;
  levelLimits;
  toHide = [HTM.G_level, HTM.K_theme, HTM.B_AWL, HTM.GZ_level, HTM.R_level];
  css;
  compounds;
  offlistDb;

  defaults = [
    {name: "GEPT",
    toShow: [HTM.G_level],
    levelLimits: ["level-e", "level-i", "level-h", "level-o"],
    css: {
      _light: "#cfe0e8",
      _medium: "#87bdd8",
      _dark: "#3F7FBF",
      _accent: "#daebe8"
    }},
    {name: "BESTEP",
    toShow: [HTM.G_level, HTM.B_AWL],
    levelLimits: ["level-e", "level-i", "level-h", "level-o"],
    css: {
      _light: "#e1e5bb",
      _medium: "#d6c373",
      _dark: "#3e4820",
      _accent: "#d98284"
    }},
    {name: "GEPTKids",
    toShow: [HTM.K_theme],
    levelLimits: ["level-k", "level-o"],
    css: {
      _light: "#f9ccac",
      _medium: "#f4a688",
      _dark: "#c1502e",
      _accent: "#fbefcc"
    }},
    {name: "GZ6K",
    toShow: [HTM.GZ_level],
    levelLimits: ["level-gz1", "level-gz2", "level-gz3", "level-gz4", "level-gz5", "level-gz6", "level-gz7", "level-o"],
    css: {
      _light: "#C7BFD9",
      _medium: "#087E8B",
      _dark: "#0B3954",
      _accent: "#FF5A5F"
    }},
    {name: "REF2K",
    toShow: [HTM.R_level],
    levelLimits: ["level-800", "level-2k"],
    css: {
      _light: "#cbbcf6",
      _medium: "#a06ee1",
      _dark: "#421b9b",
      _accent: "#72b896"
    }}
  ];

  headings = [
  [
    "elem (A2)",
    "int (B1)",
    "hi-int (B2)",
  ],
  [
    "AWL 1",
    "AWL 2",
    "AWL 3",
    "AWL 4",
    "AWL 5",
    "AWL 6",
    "AWL 7",
    "AWL 8",
    "AWL 9",
    "AWL 10",
  ],
  [
    "Animals & insects (動物/昆蟲)",
    "Articles & determiners (冠詞/限定詞)",
    "Be & auxiliaries (be動詞/助動詞)",
    "Clothing & accessories (衣服/配件)",
    "Colors (顏色)",
    "Conjunctions (連接詞)",
    "Family (家庭)",
    "Food & drink (食物/飲料)",
    "Forms of address (稱謂)",
    "Geographical terms (地理名詞)",
    "Health (健康)",
    "Holidays & festivals",
    "Houses & apartments (房子/公寓)",
    "Interjections (感嘆詞)",
    "Money (金錢)",
    "Numbers (數字)",
    "Occupations (工作)",
    "Other adjectives (其他形容詞)",
    "Other adverbs (其他副詞)",
    "Other nouns (其他名詞)",
    "Other verbs (其他動詞)",
    "Parts of body (身體部位)",
    "People (人)",
    "Personal characteristics (個性/特點)",
    "Places & directions (地點/方位)",
    "Prepositions (介系詞)",
    "Pronouns (代名詞)",
    "School (學校)",
    "Sizes & measurements (尺寸/計量)",
    "Sports, interest & hobbies(運動 / 興趣 / 嗜好)",
    "Tableware (餐具)",
    "Time (時間)",
    "Transportation (運輸)",
    "Weather & nature (天氣/自然)",
    "Wh-words (疑問詞)",
  ],
  [
    "level 1",
    "level 2",
    "level 3",
    "level 4",
    "level 5",
    "level 6",
    "supplement",
  ],
  [
    "basic 800",
    "basic 1200",
  ],
  ];


  // ## Computed levels
  offlist_subs = [
    "unknown",
    "offlist",
    "contraction",
    "digit",
    "name",
    "symbol",
  ];


  // ## PoS expansions
  pos_expansions = {
    n: 'noun',
    v: 'verb',
    a: 'article',
    d: 'determiner',
    x: 'auxilliary verb',
    j: 'adjective',
    c: 'conjunction',
    i: 'interjection',
    m: 'number',
    b: 'adverb',
    p: 'preposition',
    r: 'pronoun',
    t: 'interjection',
    f: 'infinitive',
  };

  constructor() {
    // *format: [lemma, pos, [levels: gept, awl, kids, gz6k, ref2k], [notes: gloss, note, awl-headword]]
    // add in dummy element at index 0 to start count from 1
    this.db = this.createDbfromArray([[]].concat(make_db()));
    this.compounds = this.buildCompoundsDb(this.db);
    this.change(app.state.current.db_state)
  }

  change(e) {
    let choice = (e.target) ? e.target.value : e;
    app.state.current.db_state = parseInt(choice);
    Entry.resetID();
    this.resetOfflistDb();
    const currentDb = this.defaults[app.state.current.db_state];
    for (const key of Object.keys(currentDb)) {
      // console.log(key, "=>", currentDb[key])
      this[key] = currentDb[key];
    }
    // this.db = this.createDbfromArray(this.factory());
    // this.compounds = this.buildCompoundsDb(this.db);
    // TODO: fix this so that it clears the CSS highlighting!!!
    app.ui.resetLevelInputs();
    // HTM.form.reset(); // To prevent conflicting "level" selections bleeding between dBs (see the HTML)
    for (const key in this.css) {
      const property = (key.startsWith("_")) ? `--${key.slice(1)}` : key;
      HTM.root_css.style.setProperty(property, this.css[key]);
    }
    app.limit.loadLimits(this.levelLimits);
    app.limit.setLimits();
    this.setDbTab2();
    this.setDbTab1();
    app.state.saveItem("db_state", app.state.current.db_state);
  }

  createDbfromArray(db) {
    return db.map(entry => new Entry(...entry));
  }


  resetOfflistDb() {
    this.offlistDb = [new Entry("unused", "", [-1, -1, -1, -1, -1], "", 0)];
  }

  isInOfflistDb(idOrEntry) {
    const id = (Number.isInteger(idOrEntry)) ? idOrEntry : idOrEntry.id;
    return id < 0;
  }

  getEntriesByExactLemma(lemma) {
    // ** returns empty array or array of Entries
    const entryList = this.db.filter(entry => entry.isInCurrentList && entry.lemma.toLowerCase() === lemma);
    return entryList;
  }


  getEntriesByPartialLemma(searchLemma) {
    let entryList;
    if (app.state.isBESTEP) {
      entryList = this.db.filter(entry => (entry.gept || entry.awl) && entry.lemma.search(searchLemma) >= 0);
    }
    else entryList = this.db.filter(entry => entry.isInCurrentList && entry.lemma.search(searchLemma) >= 0);
    return entryList;
  }

  getEntryById(id) {
    // ** a negative id signifies an offlist word
    let entry;
    if (id !== undefined) {
      let parsedId = parseInt(id);
      const dB = (app.wordlist.isInOfflistDb(parsedId)) ? app.wordlist.offlistDb : app.wordlist.db;
      parsedId = Math.abs(parsedId);
      entry = dB[parsedId]
    }
    return entry;
    // return (entry.isInCurrentList) ? entry : null;
  }

  buildCompoundsDb(db) {
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
    for (let entry of db) {
      if (!entry.lemma) continue;  // * ignore first dummy entry
      const word = entry.lemma;
      const id = entry.id;
      const splitWord = word.split(/[-'\s\.]/g);
      if (splitWord.length > 1) {
        const newCompound = splitWord.join("");
        compounds[newCompound] = [id, entry.levelArr];
        // ** to catch A.M. and P.M.
        // if (/[ap]\.m\./.test(word)) compounds[word] = [id, ];
      }
    }
    return compounds;
  }

  setDbTab1() {
    this.displayDbNameInTab1();
    // ** Allows for multiple elements to be toggled
    for (const el of this.toHide) {
      el.style.setProperty("display", "none");
    }
    for (const el of this.toShow) {
      el.style.setProperty("display", "block");
    }
    app.word.search();
  }

  setDbTab2() {
    this.displayDbNameInTab2();
    app.ui.forceUpdateInputDiv();
  }


  displayDbNameInTab1() {
    document.getElementById('db_name1').textContent = this.name;
  }

  displayDbNameInTab2(msg) {
    if (!msg) msg = "";
    HTM.finalLegend.innerHTML = Tag.root("Checking ", Tag.tag("span", ["id=db_name2", "class=dbColor"], [this.name]), " ", msg).stringify();
    document.getElementById("help-kids").setAttribute("style", (app.state.isKids) ? "display:list-item;" : "display:none;");
    document.getElementById("help-gept").setAttribute("style", (app.state.isGEPT || app.state.isBESTEP) ? "display:list-item;" : "display:none;");
    document.getElementById("help-awl").setAttribute("style", (app.state.isBESTEP) ? "display:list-item;" : "display:none;");
    document.getElementById("help-gz6k").setAttribute("style", (app.state.isGZ6K) ? "display:list-item;" : "display:none;");
  }
}

class TabController {
  htm = {
    tabHead: document.getElementsByTagName("tab-head")[0],
    tabBody: document.getElementsByTagName("tab-body")[0],
    textTabTag: document.getElementById("t1_tab_tag"),
    clearButton: document.getElementById("clear_btn"),
  }

  constructor() {
    for (const el of document.getElementsByTagName("tab-tag")) {
      el.addEventListener("click", this.setTab.bind(this));
    }
    this.htm.clearButton.addEventListener("click", this.clearTab.bind(this));
  }


  setTab(tab) {
    tab = (tab.currentTarget) ? tab.currentTarget : this.htm.tabHead.children[tab];
    let i = 0;
    for (const content of this.htm.tabBody.children) {
      if (tab === this.htm.tabHead.children[i]) {
        app.state.current.tab_state = i;
        this.htm.tabHead.children[i].classList.add("tab-on");
        this.htm.tabHead.children[i].classList.remove("tab-off");
        content.style.display = "flex";
      } else {
        this.htm.tabHead.children[i].classList.add("tab-off");
        this.htm.tabHead.children[i].classList.remove("tab-on");
        content.style.display = "none";
      }
      i++;
    }
    this.setTabHead();
    app.state.saveItem("tab_state", app.state.current.tab_state);
    app.ui.forceUpdateInputDiv();
    app.cursor.displayInputCursor();
    app.ui.isExactMatch = !this.isFirstTab;
  }


  setTabHead() {
    let mode = (this.isFirstTab) ? "none" : "block";
    app.backup.htm.backupButton.style.display = mode;
  }

  get isFirstTab() {
    return parseInt(app.state.current.tab_state) === 0;
  }

  clearTab(event) {
    event.preventDefault();
    if (this.isFirstTab) {
      this.clearTab1();
    } else {
      this.clearTab2();
    }
    app.cursor.displayInputCursor();
  }

  clearTab1() {
    HTM.form.reset();
    app.word.search();
    app.ui.refreshLabels("t1_form");
  }

  clearTab2() {
    app.backup.save();
    HTM.workingDiv.innerText = "";
    HTM.finalInfoDiv.innerText = "";
    HTM.repeatsList.innerText = "";
    app.wordlist.displayDbNameInTab2();
    app.ui.signalRefreshNeeded("off");
    app.hasBeenReset = true;
  }

  resetTabs() {
    this.clearTab1;
    this.clearTab2;
    this.setTab(app.state.current.tab_state);
  }
}

class ShowLevelLimit {
  LEVEL_LIMIT_CLASS = "wrong";
  LEVEL_LIMITS;
  BASE_LEVEL;
  classNameCSS = "";
  activeClassesArr = [];
  requiresInitialization = true;

  loadLimits(limitArr) {
    // console.log("limits:", limitArr)
    this.LEVEL_LIMITS = limitArr;
    this.BASE_LEVEL = limitArr[0];
  }

  toggle(e) {
    const [level, isValidSelection, resetPreviousSelectionRequired] = this.info(e.target);
    if (isValidSelection) {
      if (resetPreviousSelectionRequired) {
        this.apply(this.classNameCSS);
        this.string = "";
      }
      if (this.classNameCSS) {
        this.apply(this.classNameCSS);
        this.classNameCSS = "";
        this.activeClassesArr = [];
        app.state.current.limit_state = -1;
      } else {
        this.classNameCSS = level;
        this.activeClassesArr = this.LEVEL_LIMITS.slice(this.LEVEL_LIMITS.indexOf(this.classNameCSS));
        app.state.current.limit_state = this.LEVEL_LIMITS.indexOf(level);
        this.apply(this.classNameCSS, false);
      }
      app.state.saveItem("limit_state", app.state.current.limit_state);
    }
  }

  info(el) {
    const level = el.className.split(" ")[0];
    const isValidSelection = level.startsWith("level") && level !== this.BASE_LEVEL;
    const resetPreviousSelectionRequired = (isValidSelection && !!this.activeClassesArr.length && level !== this.activeClassesArr[0]);
    return [level, isValidSelection, resetPreviousSelectionRequired];
  }

  renderAsCSS(levelClass){
    return (this.classNameCSS && this.exceedsLimit(levelClass)) ? this.LEVEL_LIMIT_CLASS : "";

  }

  apply(className, removeClass = true) {
    const classesToChange = (app.tools.isEmpty(this.activeClassesArr)) ? this.LEVEL_LIMITS.slice(this.LEVEL_LIMITS.indexOf(className)) : this.activeClassesArr;
    for (const level of classesToChange) {
      const targetElements = document.getElementsByClassName(level);
      for (const el of targetElements) {
        if (removeClass) {
          el.classList.remove(this.LEVEL_LIMIT_CLASS);
        } else {
          el.classList.add(this.LEVEL_LIMIT_CLASS);
        }
      }
    }
  }

  setLimits() {
    if (this.requiresInitialization) {
      this.classNameCSS = (app.state.current.limit_state >= 0) ? this.LEVEL_LIMITS[app.state.current.limit_state] : "";
      this.activeClassesArr = (this.classNameCSS) ? this.LEVEL_LIMITS.slice(app.state.current.limit_state) : [];
      this.requiresInitialization = false;
    }
    if (this.classNameCSS) {
      this.apply(this.classNameCSS, false);
    }
    else {
      this.apply(this.LEVEL_LIMITS[0])
    }
  }

  exceedsLimit(className) {
    return this.activeClassesArr.includes(className);
  }

  reset() {
    app.state.saveItem("limit_state", app.state.default.limit_state);
    this.setLimits(true);
  }

}

class Backup {
  htm = {
    backupButton: document.getElementById("backup-btn"),
    backupDialog: document.getElementById("backup-dlg"),
    backupSave: document.getElementById("backup-save"),
    backupSave2: document.getElementById("backup-save2"),
  };
  backupIDs = ["long_term", "short_term"];

  constructor() {
    this.htm.backupButton.addEventListener("click", this.show.bind(this));
    this.htm.backupDialog.addEventListener("mouseleave", this.dialogClose.bind(this));
    this.htm.backupSave2.addEventListener("click", this.save.bind(this));
    for (const id of this.backupIDs) {
      document.getElementById(id).addEventListener("click", this.load.bind(this));
    }

  }

  show(e) {
    /*
    1) on refresh, swap backup_0 to backup_1
    2) close backup dialog on mouseout
    3) close settings dialog when backup opens
    4) hide backup settings on tab 1

    An html popup is populated with backups stored in local storage;
    The popup is then displayed to the user
    The text in the popups is actually in a button; clicking it populates the InputDiv
    */
    for (const id of this.backupIDs) {
      const backup = document.getElementById(id)
      const lsContent = localStorage.getItem(id);
      let content = (lsContent) ? lsContent.trim() : "";
      if (content) {
        if (localStorage.getItem("mostRecent") == id) content = Tag.tag("span", ["class=warning"], ["Most Recent: "]).stringify() + content;
        backup.innerHTML = content;
        backup.disabled = false;
      } else {
        backup.innerHTML = "[empty]";
        backup.disabled = true;
      }
    }
    this.htm.backupDialog.style.setProperty("display", "flex");
  }

  load(e) {
    /* Get backup from chosen buffer and replace contents of workingDiv with it
    Buffer contents are then loaded with the old workingDiv content to allow undo*/
    const id = e.target.id;
    const swap = JSON.parse(JSON.stringify(this.getTextWithoutCursor()));
    let restoredContent = localStorage.getItem(id);
    if (!restoredContent) return;
    restoredContent = app.tools.newlinesToEOLs(restoredContent);
    HTM.workingDiv.innerText = restoredContent;
    app.ui.forceUpdateInputDiv();
    // if (swap) localStorage.setItem(id, swap);
    // if (swap) appStateSaveItem(id, swap);
    if (swap) app.state.saveItem(id, swap);
    this.dialogClose("backup-dlg");
  }


  save() {
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
    let currentText = this.getTextWithoutCursor().trim();
    if (!currentText) return;
    const [shortTermID, longTermID] = this.backupIDs;
    const shortTermSavedContent = localStorage.getItem(shortTermID).trim();
    // console.log("current == saved?", shortTermSavedContent === currentText)
    if (app.hasBeenReset) {
      const longTermSavedContent = localStorage.getItem(longTermID).trim();
      // console.log("shortterm == longterm?", shortTermSavedContent === longTermSavedContent)
      if (shortTermSavedContent !== longTermSavedContent) {
        app.state.saveItem(longTermID, shortTermSavedContent);
      }
      app.hasBeenReset = false;
    }
    // if (currentText !== localStorage.getItem(shortTermID)) {
    if (currentText !== shortTermSavedContent) {
      app.state.saveItem(shortTermID, currentText);
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

    // app.text.refresh();
  }

  getTextWithoutCursor() {
    let currentText = app.cursor.newlinesToPlaintext(HTM.workingDiv).innerText;
    currentText = app.tools.EOLsToNewlines(currentText);
    currentText = currentText.trim();
    return currentText;
  }

  dialogClose(id) {
    if (id.target) id = "backup-dlg";
    document.getElementById(id).style.display = "none";
  }

}

class Cursor {
  tag = "span";
  id = "cursorPosHere";
  HTMLtext = "<span id='cursorPosHere'></span>";
  simpleText = "CRSR";

  offset = 0;
  oldOffsetb = 0;
  increment = 0;

  constructor() {
    this.text = LOOKUP.splitHere + this.simpleText + LOOKUP.splitHere;
  }

  displayInputCursor() {
    if (app.tabs.isFirstTab) HTM.inputLemma.focus();
    else HTM.workingDiv.focus();
  }

  insertPlaceholder(el, index) {
    let plainText = el.innerText;
    const updatedText = plainText.slice(0, index) + this.text + plainText.slice(index);
    return updatedText;
  }

  getInfoInEl(element) {
    let preCursorOffset = 0;
    let sel = window.getSelection();
    if (sel.rangeCount > 0) {
      // ** Create a range stretching from beginning of div to cursor
      const currentRange = sel.getRangeAt(0);
      const preCursorRange = document.createRange();
      preCursorRange.selectNodeContents(element);
      preCursorRange.setEnd(currentRange.endContainer, currentRange.endOffset);
      let preCursorHTML = this.rangeToHTML(preCursorRange);
      preCursorHTML = this.newlinesToPlaintext(preCursorHTML);
      preCursorOffset = preCursorHTML.innerText.length;
    }
    return [preCursorOffset];
  }

  rangeToHTML(range) {
    const nodes = document.createElement("root");
    nodes.append(range.cloneContents());
    return nodes;
  }

  newlinesToPlaintext(divText) {
    // ** Typing 'Enter' creates a <div>
    let divs = divText.querySelectorAll("br");
    for (let el of divs) {
      el.before(EOL.text);
    }
    return divText;
  }

  getIncrement(keypress) {
    this.increment = 0;
    if (this.offset < this.oldCursorOffset) this.increment = -1;
    if (this.offset > this.oldCursorOffset) this.increment = 1;
  }

  setPos(el, textToInsert = "") {
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

  updatePos(e) {
    const keypress = e.key;
    if (!keypress) return;
    if (["Backspace", "Enter"].includes(keypress) || keypress.length === 1) app.ui.signalRefreshNeeded("on");
    this.oldCursorOffset = this.offset;
    this.offset = this.getInfoInEl(HTM.workingDiv);
    // if (this.refreshRequired) {
    if (app.ui.refreshPermitted && app.ui.refreshRequired) {
      const tags = document.querySelectorAll(":hover");
      const currTag = tags[tags.length - 1];
      if (currTag) currTag.setAttribute("class", "unprocessed");
    }
    this.getIncrement(keypress)
  }
}

class GenericSearch {
  suffixChecks = [
    ["s", LOOKUP.s_subs, ["n", "v"]],
    ["ing", LOOKUP.ing_subs, ["v"]],
    ["ed", LOOKUP.ed_subs, ["v"]],
    ["st", LOOKUP.est_subs, ["j"]],
    ["r", LOOKUP.er_subs, ["j"]],
    // ["ly", LOOKUP.ly_subs, ["j"]],
    ["ly", LOOKUP.ly_subs, ["j", "v"]], // added verbs to allow for 'satisfy-ing-ly' etc.
  ];


  checkAgainstLookups(word, exactMatches) {
    let tokenType = "w";
    let matchedEntryArr = [];
    if (exactMatches.length) {
      matchedEntryArr = exactMatches;
    }
    else {
      const checks = [
        // [this.checkForEnglishSpelling, "wb"],
        [this.checkDerivations, "wd"],
        [this.checkForEnglishSpelling, "wv"],
        [this.checkAllowedVariants, "wv"],
        [this.checkNegativePrefix, "wn"],
      ];
      for (let [checkFunc, type] of checks) {
        matchedEntryArr = checkFunc.bind(this)(word);
        if (matchedEntryArr) {
          tokenType = type;
          break;
        }
      }
    }
    if (!matchedEntryArr.length) tokenType = "wo";  // offlist
    return [tokenType, matchedEntryArr];
  }



  checkForEnglishSpelling(word) {
    // returns => [lemma, [ids...], type]
    let matchedEntryArr = this.checkVariantSpellings(word);
    if (!matchedEntryArr.length) matchedEntryArr = this.checkVariantSuffixes(word);
    return matchedEntryArr;
  }


  checkNegativePrefix(word) {
    let matchedEntryArr = [];
    const prefix = this.hasNegativePrefix(word);
    if (prefix) {
      const base = prefix;
      matchedEntryArr = app.wordlist.getEntriesByExactLemma(base);
      if (!matchedEntryArr.length) matchedEntryArr = this.checkDerivations(base, matchedEntryArr);
    }
    return matchedEntryArr;
  }

  hasNegativePrefix(word) {
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


  checkVariantSuffixes(word) {
    let matchedLemmas = [];
    let matchedEntryArr = [];
    word = this.removeObviousSuffixes(word);
    for (const [variant, replacement] of LOOKUP.variantSuffixes) {
      const len = variant.length;
      const root = word.slice(0, -len);
      const suffix = word.slice(-len);
      if (variant === suffix) {
        matchedLemmas.push(root + replacement);
      }
    }
    if (!app.tools.isEmpty(matchedLemmas)) {
      for (const lemma of matchedLemmas) {
        const variant = app.wordlist.getEntriesByExactLemma(lemma);
        if (variant) matchedEntryArr.push(...variant);
      }
    }
    return matchedEntryArr;
  }

  removeObviousSuffixes(word) {
    if (word.endsWith("s")) word = word.slice(0, -1);
    else if (word.endsWith("d")) word = word.slice(0, -1);
    else if (word.endsWith("ing")) word = word.slice(0, -3);
    if (word.endsWith("e")) word = word.slice(0, -1);
    return word;
  }

  checkVariantSpellings(word) {
    let matchedEntryArr = [];
    if (LOOKUP.notLetterVariant.includes(word)) return matchedEntryArr;
    for (const [letters, replacement] of LOOKUP.variantLetters) {
      matchedEntryArr = this.subLettersAndCheckForMatches(word, letters, replacement);
      // if (!app.tools.isEmpty(matchedEntryArr)) {
      if (matchedEntryArr.length) {
        break;
      }
    }
    return matchedEntryArr;
  }

  subLettersAndCheckForMatches(word, letters, replacement) {
    // N.B. this also checks for derivations
    let matchedEntryArr = [];
    const re = new RegExp(letters, "gi")
    let found;
    let indices = [];
    while ((found = re.exec(word)) !== null) {
      indices.push(found.index);
    }
    if (!app.tools.isEmpty(indices)) {
      for (const pos of indices) {
        const variant = word.slice(0, pos) + replacement + word.slice(pos + letters.length)
        matchedEntryArr = app.wordlist.getEntriesByExactLemma(variant);
        if (matchedEntryArr.length) break;
        matchedEntryArr = this.checkDerivations(variant);
        if (matchedEntryArr.length) break;
      }
    }
    return matchedEntryArr;
  }


  checkAllowedVariants(word, offlistID = 0) {
    const shouldUpdateOfflistDb = (offlistID !== 0);
    let matchedIDarr = [];
    for (let check of [
      this.checkVariantWords,
      this.checkAbbreviations,
      this.checkGenderedNouns,
    ]) {
      let result = check(word);
      if (result.length) {
        matchedIDarr.push(...result);
        break;
      }
    }
    if (matchedIDarr.length && offlistID !== 0) {
      app.wordlist.offlistDb[-offlistID] = [offlistID, word, "variant", matchedIDarr, ""];
    }
    return matchedIDarr;
  }

  checkVariantWords(word) {
    let match = "";
    let matchedEntryArr = []
    word = app.search.removeObviousSuffixes(word);
    for (let key of Object.keys(LOOKUP.variantWords)) {
      const searchTerm = (app.ui.isExactMatch) ? key : key.slice(0, word.length);
      // console.log("check variant words:", word, searchTerm, searchTerm === word)
      if (searchTerm === word) {
        match = LOOKUP.variantWords[key];
        matchedEntryArr = app.wordlist.getEntriesByExactLemma(match)
        break;
      }
    }
    return matchedEntryArr;
  }


  checkAbbreviations(word) {
    word = word.replace(".", "");
    let matchedEntryArr = [];
    if (LOOKUP.abbreviations.hasOwnProperty(word)) {
      const match = LOOKUP.abbreviations[word];
      for (const lemma of match.split(":")) {
        matchedEntryArr.push(...app.wordlist.getEntriesByExactLemma(lemma));
      }
    }
    return matchedEntryArr;
  }

  checkGenderedNouns(word) {
    let lemma = "";
    let matchedEntryArr = []
    for (let key of Object.keys(LOOKUP.gendered_nouns)) {
      const truncated = word.slice(0, key.length)
      const searchTerm = (app.ui.isExactMatch) ? key : key.slice(0, word.length);
      if (searchTerm === truncated) {
        lemma = LOOKUP.gendered_nouns[key];
        matchedEntryArr = app.wordlist.getEntriesByExactLemma(lemma)
        break;
      }
    }
    return matchedEntryArr;
  }


  checkDerivations(word, preMatchedIDarr = []) {
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
        this.checkNames,
        this.checkArticle,
        this.checkIrregularNegatives,
        this.checkIrregularVerbs,
        this.checkIrregularPlurals,
        this.checkForeignPlurals,
        this.checkAllSuffixes,
      ]) {
        const result = guess.bind(this)(word);
        if (result?.length) {
          localMatches.push(...result);
          break;
        }
      }
      if (localMatches.length) {
        preMatchedIDarr.push(...localMatches);
      }
    }
    preMatchedIDarr = app.tools.dedupeSimpleArray(preMatchedIDarr);
    return preMatchedIDarr;
  }



  checkNames(word) {
    let matchedEntryArr = [];
    if (LOOKUP.personalNames.includes(word)) {
      matchedEntryArr.push(app.parser.markOfflist(word, "name"));
    }
    return matchedEntryArr;
  }

  checkArticle(word) {
    let matchedEntryArr = [];
    if (word === "an") {
      matchedEntryArr.push(...app.wordlist.getEntriesByExactLemma("a"));
    }
    return matchedEntryArr;
  }


  checkIrregularNegatives(word) {
    let matchedEntryArr = [];
    const lookup = LOOKUP.irregNegVerb[word];
    /* assume (e.g. do / have) that if there are two matches, one will be the full verb & one the aux.; return only the aux. If only one match, assume it is an anomalous verb like dare / need, not a full aux., so return the single match. */
    if (lookup) {
      const entries = app.wordlist.getEntriesByExactLemma(lookup);
      if (entries.length > 1) {
        const auxiliaryVerb = entries.filter(entry => entry.pos.includes("x"));
        matchedEntryArr.push(...auxiliaryVerb);
      }
      else if (entries.length) matchedEntryArr.push(entries[0]);
    }
    return matchedEntryArr;
  }

  checkIrregularVerbs(word) {
    let matchedEntryArr = [];
    const lookup = LOOKUP.irregVerb[word];
    if (lookup) {
      matchedEntryArr.push(...this.winnowPoS(app.wordlist.getEntriesByExactLemma(lookup), ["x", "v"]));
    }
    return matchedEntryArr;
  }

  checkIrregularPlurals(word) {
    let matchedEntryArr = [];
    const lookup = LOOKUP.irregPlural[word];
    if (lookup) {
      // ** words in the lookup are most likely the correct word (and 'others / yourselves' aren't nouns!)
      matchedEntryArr.push(...app.wordlist.getEntriesByExactLemma(lookup));
    }
    return matchedEntryArr;
  }


  checkForeignPlurals(word) {
    let matchedEntryArr = [];
    if (word.length <= 2) return;
    for (const [plural, singular] of LOOKUP.foreign_plurals) {
      const root = word.slice(0, -plural.length);
      const ending = word.slice(-plural.length);
      if (ending === plural) {
        const lookup = app.wordlist.getEntriesByExactLemma(root + singular);
        if (!app.tools.isEmpty(lookup)) {
          matchedEntryArr.push(...this.winnowPoS(lookup, ["n"]));
          break;
        }
      }
    }
    return matchedEntryArr;
  }

  checkAllSuffixes(word) {
    let matchedEntryArr = [];
    for (let check of this.suffixChecks) {
      const rawMatches = this.checkForSuffix(word, ...check);
      if (rawMatches.length) matchedEntryArr.push(...rawMatches);
      if (matchedEntryArr.length && check[0] !== "s") break;
      // ** -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
    }
    return matchedEntryArr;
  }


  checkForSuffix(word, suffix, lookup, pos) {
    let matchEntryArr = [];
    if (word.endsWith(suffix)) {
      matchEntryArr.push(...this.winnowPoS(app.parser.findBaseForm(word, lookup), pos));
    }
    return matchEntryArr;
  }

  winnowPoS(entryList, posArr) {
    // ** Returns possible IDs of derivations as array, or empty array
    let matchedEntryArr = [];
    for (const entry of entryList) {
      for (const pos of posArr) {
        // if (entry && entry.pos?.includes(pos)) {
        if (entry?.pos?.includes(pos)) {
          matchedEntryArr.push(entry);
        }
      }
    }
    return matchedEntryArr;
  }

}

class Entry {
  static currID = 0;
  static FIND_AWL_ONLY = 100;
  static FIND_GEPT_ONLY = 200;

  constructor(lemma, pos, levelArr, notes, id) {
    if (id !== undefined) this._id = id;
    else {
      this._id = Entry.currID;
      Entry.incrementID();
    }
    if (!lemma) {
      this._lemma = "";
      this._pos = "";
      // this._levelArr = [];
      this._levels = new Levels();
      this._notes = [];
    }
    else {
      this._lemma = lemma;
      this._pos = pos;
      this._levels = new Levels(levelArr);
      this._notes = notes;
    }
  }


  get id() { return this._id }
  get lemma() { return this._lemma }
  get pos() { return this._pos }

  get posExpansion() {
    const pos_str = this._pos;
    if (this._id < 0) return pos_str;
    return (pos_str) ? pos_str.split("").map(el => app.wordlist.pos_expansions[el]).join(", ") : "";
  }


  get levelArr() { return this._levels };
  // get levelArr() { return this.levelArr };
  get gept() { return this._levels.gept };
  get awl() { return this._levels.awl };
  get kids() { return this._levels.kids };
  get gz6k() { return this._levels.gz6k };
  get ref2k() { return this._levels.ref2k };
  get level() { return this._levels.level };

  get offlistTypeID() { return this._levels.offlistTypeID };

  get hasGept() { return !!this.gept };
  get hasAwl() { return !!this.awl };
  get hasKids() { return !!this.kids };
  get hasGz6k() { return !!this.gz6k };
  get hasRef2k() { return !!this.ref2k };
  get isInCurrentList() {
    return !!this.level;
  }


  get notes() {
    const gloss = this._notes[0];
    const note = this._notes[1]
    let text = (note) ? `${gloss}; ${note}` : gloss;
    return text;
  }

  get awlHeadword() {
    return this._notes[2];
  }

  static incrementID() { Entry.currID++ }
  static resetID() { Entry.currID = 0 }
}


class Token {
  /*{lemma: str,
    type: str,
    matches: [entry, ...],
    info: {
       totalReps: int,
       thisRep: int,
       repeatedLemma: str,
       displayLevel: int}
  }*/

  constructor(lemma, type = "", matches = []) {
    this.lemma = lemma;
    this.type = type;
    if (matches.length) this.appendMatches(matches)
    else this.matches = [];
    this.info = {};
  }


  appendMatches(entryList) {
    // ** function accepts entries as a single Entry or as list of Entries
    // ** i.e. Entry or [Entry] o [Entry, Entry, ...] are all fine
    if (!this.matches) this.matches = [];
    if (!Array.isArray(entryList)) entryList = [entryList];
    for (const entry of entryList) {
      if (entry instanceof Entry) this.matches.push(entry);
      else throw new TypeError(`Entry.matches for <${this.lemma}> must be an array of Entries.`)
    }
    // * Sort matches by their GEPT level (low to high)
    if (this.matches.length > 1){
      this.matches = this.matches.sort((a,b) => a.gept - b.gept);
    }
  }

  get isMixedLevels() {
    if (this.matches.length < 2) return false;
    const geptLevelOfMatches = this.matches.map(match => match.gept);
    return new Set(geptLevelOfMatches).size === geptLevelOfMatches.length;
  }

  overwriteMatches(entryList) {
    this.matches = [];
    this.appendMatches(entryList);
  }
}


class Tag {
  /*
  [name, attrs=["property=value", ...], content=[]]
  */
  constructor(name, attrs = [], content = []) {
    if (typeof content === "string") content = [content];
    this.isEmpty = !attrs.length && !content.length;
    this.name = name;
    if (typeof attrs === "string") attrs = [attrs];
    this.attrs = attrs.map(el => {
      let tmp = el.split("=");
      return (tmp.length === 1) ? [tmp] : [tmp[0], this.escapeHTML(tmp[1])];
    });
    this.content = content.map(el => (typeof el === "string") ? this.escapeHTML(el) : el);
  }

  escapeHTML(text) {
    if (!text) return "";
    return text.replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': " &quot;" }[char]));
  }

  stringify() {
    if (!this.name) return "";
    if (this.isEmpty) return `<${this.name}>`;
    let tmpContent = "";
    for (let el of this.content) {
      if (!el) continue;
      if (typeof el === "number") el = el.toString();
      tmpContent += (typeof el === "string") ? el : el.stringify();
    }
    // ** <root> is used to render a chain of html/text tags; it is not itself rendered
    if (this.name === "root") return [tmpContent];
    let tmpAttrs = "";
    if (this.attrs.length) {
      for (const el of this.attrs) {
        if (el.length) {
          const strEl = (el.length === 1) ? el[0][0] : `${el[0]}="${el[1]}"`;
          if (strEl) tmpAttrs += " " + strEl;
        }
      }
    }
    return `<${this.name}${tmpAttrs}>${tmpContent}</${this.name}>`;
  }


  static tag(name, attrs = [], content = []) {
    return new Tag(name, attrs, content);
  }

  static root(content = []) {
    // ** GUARD#1 accept Tags/strings/numbers as single array OR as individual arguments
    if (arguments.length === 1) {
      const firstArg = arguments[0];
      if (Array.isArray(firstArg)) content = firstArg;
      else content = [firstArg];
    }
    else if (arguments.length > 1) content = [...arguments];
    // ** GUARD#2 resolve any mistakenly included arrays
    content = content.reduce((acc, el) => {
      (Array.isArray(el)) ? acc.push(...el.flat(Infinity)) : acc.push(el);
      return acc;
    }, []);

    return new Tag("root", [], content);
  }
}

class Levels {
  constructor() {
    // accepts several arguments:
    // () or (0) -> array populated with 0's;
    // (x, x, x, x, x) or ([x, x, x, x, x]) -> fully populated array
    // otherwise error message + empty arr
    this.levels = [];
    let args = Object.values(arguments);
    const argLenIs1 = args.length === 1;
    if (argLenIs1 && Array.isArray(args[0])) args = args[0];
    if (args.length === 5) this.levels = args;
    else if (!args.length || (argLenIs1 && args[0] === 0)) this.levels = [0,0,0,0,0];
    else console.warn(`Expected 5 or 0 values but got ${args.length}: ${args}`);
  }

  get levelArr() { return this.levels }
  get gept() { return this.levels[0] };
  get awl() { return this.levels[1] };
  get kids() { return this.levels[2] };
  get gz6k() { return this.levels[3] };
  get ref2k() { return this.levels[4] };
  get level() {
    let result = this.levels[app.state.current.db_state];
    if (!result && app.state.isBESTEP) result = this.gept;
    return result;
  }

  get offlistTypeID() {
    let id = 0;
    if (this.gept > 100 && this.awl === -1) id = this.gept;
    return id;
  }
  get hasGept() { return !!this.gept };
  get hasAwl() { return !!this.awl };
  get hasKids() { return !!this.kids };
  get hasGz6k() { return !!this.gz6k };
  get hasRef2k() { return !!this.ref2k };
  get isInCurrentList() {
    return !!this.level;
  }
}