
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
    this.cursor = new Cursor();
    this.limit = new ShowLevelLimit();
  }

  init() {
    this.state = new State();
    this.wordlist = new Db(this.state.current.db_state);
    this.tabs.setTab(this.state.current.tab_state);
    if (!localStorage.getItem("mostRecent")) localStorage.setItem("mostRecent", this.backup.backupIDs[0]);
    setupEditing();
    HTM.form.reset();
    updateDropdownMenuOptions();
    this.limit.setLimit(true);
    setHelpState("fromSaved");
    addListeners();
    setFontState();
    console.log("app:", this)
  }

  reset(e) {
    this.state.forceDefault();
    this.tabs.resetTabs();
    this.wordlist.change(this.state.current.db_state);
    HTM.selectDb.value = this.state.current.db_state;
    setHelpState("reset");
    this.limit.reset();
    setFontState("reset");
  }
  static #instance;
}

class Tools {
  isEmpty(arr) {
    // TODO: simplify to !arr.length ?
    // return !arr?.flat(Infinity).length;
    let hasContent;
    if (!arr) hasContent = false;
    else if (typeof arr !== "object") hasContent = true;
    else hasContent = arr.length > 0;
    return !hasContent;
  }

  dedupeSimpleArray(arr) {
    if (typeof arr !== "object") return [arr];
    arr = [...new Set(arr)];
    // arr = arr.filter(el => el.length);
    return arr;
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
    // isKids() {
    return app.state.current.db_state === 2;
  }
}


class Db {
  name;
  db;
  show;
  hide;
  css;
  compounds;
  offlistDb;
  offlistLevel = 0;
  awl_level_offset = 37;
  kids_level_offset = 3;

  // ## These correlate with the numbers in the dBs
  level_headings = [
    "elem (A2)",
    "int (B1)",
    "hi-int (B2)",
    "Animals & insects (動物/昆蟲)",
    "Articles & determiners (冠詞/限定詞)",
    "Be & auxiliarie (be動詞/助動詞)",
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
    this.change(app.state.current.db_state)
    this.levelSubs = this.level_headings.concat(this.offlist_subs);
  }

  change(e) {
    let choice = (e.target) ? e.target.value : e;
    app.state.current.db_state = parseInt(choice);
    Entry.resetID();
    this.resetOfflistDb();
    // this.offlistDb = [new Entry("unused", "", [-1, -1, -1], "", 0)];
    if (app.state.current.db_state === 0) {
      this.name = "GEPT";
      this.db = this.createDbfromArray(makeGEPTdb());
      this.show = [HTM.G_level];
      this.hide = [HTM.K_theme, HTM.B_AWL];
      this.css = {
        _light: "#cfe0e8",
        _medium: "#87bdd8",
        _dark: "#3F7FBF",
        _accent: "#daebe8"
      };
    } else if (app.state.current.db_state === 1) {
      this.name = "BESTEP";
      let tmpDb = makeGEPTdb();
      this.db = this.createDbfromArray(tmpDb.concat(makeAWLdb()));
      this.show = [HTM.G_level, HTM.B_AWL];
      this.hide = [HTM.K_theme];
      this.css = {
        _light: "#e1e5bb",
        _medium: "#d6c373",
        _dark: "#3e4820",
        _accent: "#d98284"
      };
    } else {
      this.name = "GEPTKids";
      this.db = this.createDbfromArray(makeKIDSdb());
      this.show = [HTM.K_theme];
      this.hide = [HTM.G_level, HTM.B_AWL];
      this.css = {
        _light: "#f9ccac",
        _medium: "#f4a688",
        _dark: "#c1502e",
        _accent: "#fbefcc"
      };
    }
    this.compounds = this.buildCompoundsDb(this.db);
    for (const key in this.css) {
      const property = (key.startsWith("_")) ? `--${key.slice(1)}` : key;
      HTM.root_css.style.setProperty(property, this.css[key]);
    }
    // visibleLevelLimitSet();
    app.limit.setLimit();
    this.setDbTab2();
    this.setDbTab1();
    app.state.saveItem("db_state", app.state.current.db_state);
  }

  createDbfromArray(db) {
    return db.map(entry => new Entry(...entry));
  }

  resetOfflistDb() {
    this.offlistDb = [new Entry("unused", "", [-1, -1, -1], "", 0)];
  }

  isInOfflistDb(idOrEntry) {
    const id = (Number.isInteger(idOrEntry)) ? idOrEntry : idOrEntry.id;
    return id < 0;
  }

  getEntriesByExactLemma(lemma) {
    // ** returns empty array or array of Entries
    lemma = lemma.toLowerCase();
    const entryList = this.db.filter(el => el.lemma.toLowerCase() === lemma);
    return entryList;
  }

  getEntriesByPartialLemma(lemma) {
    // lemma = lemma.toLowerCase();
    const entryList = this.db.filter(el => el.lemma.search(lemma) !== -1)
    return entryList;
  }

  getEntryById(id) {
    // ** a negative id signifies an offlist word
    let entry;
    if (id !== undefined) {
      let parsedId = parseInt(id);
      // const dB = (isInOfflistDb(parsedId)) ? V.offlistDb : V.currentDb.db;
      const dB = (app.wordlist.isInOfflistDb(parsedId)) ? app.wordlist.offlistDb : app.wordlist.db;
      parsedId = Math.abs(parsedId);
      entry = dB[parsedId]
    }
    return entry;
  }
  // lemmaIsInCompoundsDb(lemma) {
  //   return app.wordlist.compounds[lemma];
  // }

  buildCompoundsDb(dB) {
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

  setDbTab1() {
    this.displayDbNameInTab1();
    // document.getElementById('db_name1').textContent = this.name;
    // ** Allows for multiple elements to be toggled
    for (const el of this.show) {
      el.style.setProperty("display", "block");
    }
    for (const el of this.hide) {
      el.style.setProperty("display", "none");
    }
    wordSearch();
  }

  setDbTab2() {
    this.displayDbNameInTab2();
    forceUpdateInputDiv();
  }


  displayDbNameInTab1() {
    document.getElementById('db_name1').textContent = this.name;
  }

  displayDbNameInTab2(msg) {
    if (!msg) msg = "";
    HTM.finalLegend.innerHTML = Tag.root("Checking ", Tag.tag("span", ["id=db_name2", "class=dbColor"], [this.name]), " ", msg).stringify();
    document.getElementById("help-kids").setAttribute("style", (app.state.isKids) ? "display:list-item;" : "display:none;");
    document.getElementById("help-gept").setAttribute("style", (!app.state.isKids) ? "display:list-item;" : "display:none;");
    document.getElementById("help-awl").setAttribute("style", (app.state.isBESTEP) ? "display:list-item;" : "display:none;");
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
      // el.addEventListener("click", this.setTab);
      el.addEventListener("click", wrapper_setTab);
    }
    // this.htm.clearButton.addEventListener("click", this.clearTab);
    this.htm.clearButton.addEventListener("click", wrapper_clearTab);
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
    forceUpdateInputDiv();
    app.cursor.displayInputCursor();
    V.isExactMatch = !this.isFirstTab;
  }


  setTabHead() {
    let mode = (this.isFirstTab) ? "none" : "block";
    // HTM.backupButton.style.display = mode;
    app.backup.htm.backupButton.style.display = mode;
    // HTM.backupSave.style.display = mode;
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
    wordSearch();
    refreshLabels("t1_form");
  }

  clearTab2() {
    // backupSave();
    app.backup.save();
    HTM.workingDiv.innerText = "";
    HTM.finalInfoDiv.innerText = "";
    HTM.repeatsList.innerText = "";
    app.wordlist.displayDbNameInTab2();
    // V.appHasBeenReset = true;
    app.hasBeenReset = true;
    // backupReset();
  }

  resetTabs() {
    this.clearTab1;
    this.clearTab2;
    this.setTab(app.state.current.tab_state);
  }
}

class ShowLevelLimit {
  LEVEL_LIMIT_CLASS = "wrong";
  LEVEL_LIMITS = ["level-i", "level-h", "level-o"];
  BASE_LEVEL = "level-e";
  classNameCSS = "";
  activeClassesArr = [];

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
    // const isValidSelection = level.startsWith("level") && level !== "level-e";
    const isValidSelection = level.startsWith("level") && level !== this.BASE_LEVEL;
    const resetPreviousSelectionRequired = (isValidSelection && !!this.activeClassesArr.length && level !== this.activeClassesArr[0]);
    return [level, isValidSelection, resetPreviousSelectionRequired];
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

  setLimit(fromSaved = false) {
    if (fromSaved) {
      this.classNameCSS = (app.state.current.limit_state >= 0) ? this.LEVEL_LIMITS[app.state.current.limit_state] : "";
      this.activeClassesArr = (this.classNameCSS) ? this.LEVEL_LIMITS.slice(app.state.current.limit_state) : [];
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
    this.setLimit(true);
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
    this.htm.backupButton.addEventListener("click", wrapper_backupShow);
    this.htm.backupDialog.addEventListener("mouseleave", wrapper_backupDialogClose);
    // this.htm.backupSave.addEventListener("click", backupSave);
    this.htm.backupSave2.addEventListener("click", wrapper_backupSave);
    for (const id of this.backupIDs) {
      document.getElementById(id).addEventListener("click", wrapper_backupLoad);
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
    const swap = JSON.parse(JSON.stringify(getTextFromWorkingDiv()));
    let restoredContent = localStorage.getItem(id);
    if (!restoredContent) return;
    restoredContent = newlinesToEOLs(restoredContent);
    HTM.workingDiv.innerText = restoredContent;
    forceUpdateInputDiv();
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
    let currentText = getTextFromWorkingDiv().trim();
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
    textMarkup();
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
  // text = C.SLICE + "CRSR" + C.SLICE;

  offset = 0;
  oldOffsetb = 0;
  increment = 0;

  constructor() {
    this.text = C.SplitHere + this.simpleText + C.SplitHere;
  }

  displayInputCursor() {
    if (app.tabs.isFirstTab) HTM.inputLemma.focus();
    else HTM.workingDiv.focus();
  }

  insertPlaceholder(el, index) {
    // let plainText = this.newlinesToPlaintext(el).innerText;
    let plainText = el.innerText;
    const updatedText = plainText.slice(0, index) + this.text + plainText.slice(index);
    // console.log("insertPH:", updatedText)
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
    // const divs = divText.querySelectorAll("div, br, hr");
    // let divs = divText.querySelectorAll("div");
    let divs = divText.querySelectorAll("br");
    // if (!divs) divs = divText.querySelectorAll("hr");
    for (let el of divs) {
      // console.log("newlinesToPT:", el, divText.innerHTML)
      // el.before(` ${EOL.text} `);
      el.before(EOL.text);
      // el.before(C.NBSP);
    }
    // ** Pasting in text creates <br> (so have to search for both!)
    // const EOLs = divText.querySelectorAll("br, hr");
    // for (let el of EOLs) {
    //   console.log("newlinesToPT: found>", el)
    //   // el.textContent = ` ${EOL.text} `;
    //   el.before(` ${EOL.text} `);
    //   // el.remove();
    // }
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
    if (["Backspace", "Enter"].includes(keypress) || keypress.length === 1) signalRefreshNeeded("on");
    this.oldCursorOffset = this.offset;
    this.offset = this.getInfoInEl(HTM.workingDiv);
    if (this.refreshRequired) {
      const tags = document.querySelectorAll(":hover");
      const currTag = tags[tags.length - 1];
      if (currTag) currTag.setAttribute("class", "unprocessed");
    }
    this.getIncrement(keypress)
  }

  insertInHTML(matchCount, wordIndex, rawWord) {
    if (matchCount === 0) {
      const [word_i, char_i] = this.cursorPosInTextArr;
      if (wordIndex === word_i) {
        rawWord = rawWord.slice(0, char_i) + this.HTMLtext + rawWord.slice(char_i);
      }
    }
    return rawWord;
  }
}

class Search {

  constructor(word, preMatchedEntries, tokenType) {
    [
      this.tokenType,
      this.matchedEntries,
    ] = this.checkAgainstLookups(word, preMatchedEntries, tokenType)
  }

  checkAgainstLookups(word, exactMatches, tokenType = "") {
    /*
    algorithm:
    IF direct match(es) found for WORD:
      return match(es) DIRECTLY
    ELSE:
      check for variant spelling / negative prefix & if true, revise spelling of WORD
      check for derivations / variants / names etc.
    */
    let matchedEntries = [];
    if (app.tools.isEmpty(exactMatches)) {
      let revisedSpelling = "";
      [revisedSpelling, matchedEntries, tokenType] = this.checkForEnglishSpelling(word, tokenType);
      if (app.tools.isEmpty(matchedEntries)) {
        matchedEntries = this.checkNegativePrefix(word);
        if (!app.tools.isEmpty(matchedEntries)) {
          revisedSpelling = matchedEntries[0].lemma;
          tokenType += "n"
        }
      }
      word = revisedSpelling;
      const matchedDerivedEntries = this.checkDerivations(word);
      // console.log("checkAgainstLookups derviations>>", matchedDerivedEntries)
      if (!app.tools.isEmpty(matchedDerivedEntries)) {
        matchedEntries.push(...matchedDerivedEntries);
        tokenType = tokenType + "d";
      }
      if (app.tools.isEmpty(matchedEntries)) {
        matchedEntries = this.checkAllowedVariants(word);
        if (!app.tools.isEmpty(matchedEntries)) tokenType = tokenType + "v";
      }
    }
    else matchedEntries = exactMatches;
    return [tokenType, matchedEntries];
  }


  checkForEnglishSpelling(word, tokenType) {
    // returns => [lemma, [ids...], type]
    let exactMatches = this.checkVariantSpellings(word);
    if (app.tools.isEmpty(exactMatches)) exactMatches = this.checkVariantSuffixes(word);
    // if (!isEmpty(exactMatches)) {
    else {
      word = exactMatches[0].lemma;
      tokenType += "v";
    }
    return [word, exactMatches, tokenType];
  }

  idSuccessfullyMatched(idArr) {
    return idArr.some(id => id > 0);
  }

  checkNegativePrefix(word) {
    // TODO: only for adj/adv
    let matchedEntries = [];
    const prefix = this.hasNegativePrefix(word);
    if (prefix) {
      const base = prefix;
      matchedEntries = app.wordlist.getEntriesByExactLemma(base);
      // if (!idSuccessfullyMatched(matchedEntries)) matchedEntries = checkDerivations(base, matchedEntries);
      if (!matchedEntries.length) matchedEntries = this.checkDerivations(base, matchedEntries);
    }
    return matchedEntries;
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
    if (!app.tools.isEmpty(matchedLemmas)) {
      for (const lemma of matchedLemmas) {
        const variant = app.wordlist.getEntriesByExactLemma(lemma);
        if (variant) matchedEntries.push(...variant);
      }
    }
    return matchedEntries;
  }


  checkVariantSpellings(word) {
    let matchedEntries = [];
    if (LOOKUP.notLetterVariant.includes(word)) return matchedEntries;
    for (const [letters, replacement] of LOOKUP.variantLetters) {
      matchedEntries = this.subLettersAndCheckForMatches(word, letters, replacement);
      if (!app.tools.isEmpty(matchedEntries)) {
        break;
      }
    }
    return matchedEntries;
  }

  subLettersAndCheckForMatches(word, letters, replacement) {
    // N.B. this also checks for derivations
    let matchedEntries = [];
    const re = new RegExp(letters, "gi")
    let found;
    let indices = [];
    while ((found = re.exec(word)) !== null) {
      indices.push(found.index);
    }
    if (!app.tools.isEmpty(indices)) {
      for (const pos of indices) {
        const variant = word.slice(0, pos) + replacement + word.slice(pos + letters.length)
        matchedEntries = app.wordlist.getEntriesByExactLemma(variant);
        if (matchedEntries.length) break;
        matchedEntries = this.checkDerivations(variant);
        if (matchedEntries.length) break;
      }
    }
    return matchedEntries;
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
    if (!app.tools.isEmpty(matchedIDarr) && offlistID !== 0) {
      app.wordlist.offlistDb[-offlistID] = [offlistID, word, "variant", matchedIDarr, ""];
    }
    return matchedIDarr;
  }

  checkVariantWords(word) {
    let match = "";
    let matchedEntries = []
    for (let key of Object.keys(LOOKUP.variantWords)) {
      const truncated = word.slice(0, key.length)
      const searchTerm = (V.isExactMatch) ? key : key.slice(0, word.length);
      if (searchTerm === truncated) {
        match = LOOKUP.variantWords[key];
        matchedEntries = app.wordlist.getEntriesByExactLemma(match)
        break;
      }
    }
    return matchedEntries;
  }

  checkAbbreviations(word) {
    word = word.replace(".", "");
    let matchedEntries = [];
    if (LOOKUP.abbreviations.hasOwnProperty(word)) {
      const match = LOOKUP.abbreviations[word];
      for (const lemma of match.split(":")) {
        matchedEntries.push(...app.wordlist.getEntriesByExactLemma(lemma));
      }
    }
    return matchedEntries;
  }

  checkGenderedNouns(word) {
    let lemma = "";
    let matchedEntries = []
    for (let key of Object.keys(LOOKUP.gendered_nouns)) {
      const truncated = word.slice(0, key.length)
      const searchTerm = (V.isExactMatch) ? key : key.slice(0, word.length);
      if (searchTerm === truncated) {
        lemma = LOOKUP.gendered_nouns[key];
        matchedEntries = app.wordlist.getEntriesByExactLemma(lemma)
        break;
      }
    }
    return matchedEntries;
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
        // checkNegativePrefix,
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
    // debug("===", preMatchedIDarr.length,...preMatchedIDarr)
    return preMatchedIDarr;
  }



  checkNames(word) {
    let matchedEntry = [];
    if (LOOKUP.personalNames.includes(word)) {
      // result.push(...markOfflist(word, "name"));
      matchedEntry.push(markOfflist(word, "name"));
    }
    return matchedEntry;
  }

  checkArticle(word) {
    let matchedEntry = [];
    if (word === "an") {
      // result.push(...getIdsByLemma("a")[0]);
      matchedEntry.push(...app.wordlist.getEntriesByExactLemma("a"));
    }
    return matchedEntry;
  }


  checkIrregularNegatives(word) {
    let matchedEntries = [];
    const lookup = LOOKUP.irregNegVerb[word];
    if (lookup) {
      matchedEntries.push(...this.winnowPoS(app.wordlist.getEntriesByExactLemma(lookup), ["x", "v"]));
    }
    return matchedEntries;
  }

  checkIrregularVerbs(word) {
    let matchedEntries = [];
    const lookup = LOOKUP.irregVerb[word];
    if (lookup) {
      matchedEntries.push(...this.winnowPoS(app.wordlist.getEntriesByExactLemma(lookup), ["x", "v"]));
    }
    return matchedEntries;
  }

  checkIrregularPlurals(word) {
    let matchedEntries = [];
    const lookup = LOOKUP.irregPlural[word];
    if (lookup) {
      // ** words in the lookup are most likely the correct word (and 'others / yourselves' aren't nouns!)
      matchedEntries.push(...app.wordlist.getEntriesByExactLemma(lookup));
    }
    return matchedEntries;
  }


  checkForeignPlurals(word) {
    let matchedEntries = [];
    if (word.length <= 2) return;
    for (const [plural, singular] of LOOKUP.foreign_plurals) {
      const root = word.slice(0, -plural.length);
      const ending = word.slice(-plural.length);
      if (ending === plural) {
        const lookup = app.wordlist.getEntriesByExactLemma(root + singular);
        if (!app.tools.isEmpty(lookup)) {
          matchedEntries.push(...this.winnowPoS(lookup, ["n"]));
          break;
        }
      }
    }
    return matchedEntries;
  }

  checkAllSuffixes(word) {
    const suffixChecks = [
      ["s", LOOKUP.s_subs, ["n", "v"]],
      ["ing", LOOKUP.ing_subs, ["v"]],
      ["ed", LOOKUP.ed_subs, ["v"]],
      ["st", LOOKUP.est_subs, ["j"]],
      ["r", LOOKUP.er_subs, ["j"]],
      ["ly", LOOKUP.ly_subs, ["j"]],
    ];
    let matchedEntries = [];
    for (let check of suffixChecks) {
      // console.log("checkAllSuffixes", word, ...check, this);
      const rawMatches = this.checkForSuffix(word, ...check);
      if (rawMatches.length) matchedEntries.push(...rawMatches);
      // debug(word, el[0], !!rawMatches.length, ...rawMatches, rawMatches, matches)
      if (matchedEntries.length && check[0] !== "s") break;
      // ** -es (-s plural) overlaps with -is > -es in foreignPlurals, so both need to be applied
    }
    return matchedEntries;
  }


  checkForSuffix(word, suffix, lookup, pos) {
    // console.log("checkForSuffix:", word, suffix, lookup)
    let matchEntries = [];
    if (word.endsWith(suffix)) {
      matchEntries.push(...this.winnowPoS(findBaseForm(word, lookup), pos));
    }
    // debug(">>>>>", result.length, ...result, result)
    return matchEntries;
  }

  winnowPoS(entryList, posArr) {
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

}

class Entry {
  static currID = 0;
  static AWL_ONLY = 1;
  static GEPT_ONLY = -1;
  static AWL_AND_GEPT = 3;
  static FIND_AWL_ONLY = 100;
  static FIND_GEPT_ONLY = 200;

  constructor(lemma, pos, levelArr, notes, id) {
    if (id !== undefined) this._id = id;
    else {
      this._id = Entry.currID;
      Entry.incrementID();
    }
    this._lemma = lemma;
    this._pos = pos;
    this._levelArr = levelArr;
    this._notes = notes;
    // this._compound =
  }

  get id() { return this._id }
  get lemma() { return this._lemma }
  get pos() { return this._pos }

  get posExpansion() {
    const pos_str = this._pos;
    if (this._id < 0) return pos_str;
    return (pos_str) ? pos_str.split("").map(el => app.wordlist.pos_expansions[el]).join(", ") : "";
  }

  get levelArr() { return this._levelArr }
  get levelGEPT() { return this._levelArr[0] }
  // get levelAWL() { return this._levelArr[1] - C.awl_level_offset }
  get levelAWL() { return this._levelArr[1] - app.wordlist.awl_level_offset }

  get levelAWLraw() { return this._levelArr[1] }
  get levelStatus() { return this._levelArr[1] }

  get notes() {
    let note = this._notes[0];
    if (this._notes[1]) note += `; ${this._notes[1]}`;
    return [note, this._notes[2]];
  }

  static incrementID() { Entry.currID++ }
  static resetID() { Entry.currID = 0 }
}


class Token {
  /*
  Token{id, lemma, matches=[id] type, count}
  CHANGED; matches now = [Entry]
  */
  constructor(lemma, type = "", matches = [], count = 0) {
    this.lemma = lemma;
    this.type = type;
    // this.matches = matches;
    this.matches = [];
    this.appendMatches(matches);
    this.count = count;
  }

  appendMatches(entryList) {
    // ** function accepts entries as a single Entry or as list of Entries
    // ** i.e. Entry or [Entry] o [Entry, Entry, ...] are all fine
    if (!Array.isArray(entryList)) entryList = [entryList];
    for (const entry of entryList) {
      if (entry instanceof Entry) this.matches.push(entry);
      else throw new TypeError("Entry.matches must be an array of Entries.")
    }
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
      // console.log("attrs:",...this.attrs)
      for (const el of this.attrs) {
        if (el.length) {
          const strEl = (el.length === 1) ? el[0][0] : `${el[0]}="${el[1]}"`;
          if (strEl) tmpAttrs += " " + strEl;
        }
      }
      // tmpAttrs = this.attrs.map(
      //   el => (el.length === 1)
      //     ? ` ${el}`
      //     : ` ${el[0]}="${el[1]}"`
      // ).join("");
    }
    return `<${this.name}${tmpAttrs}>${tmpContent}</${this.name}>`;
  }


  static tag(name, attrs = [], content = []) {
    return new Tag(name, attrs, content);
  }

  // static attr(name, value) {
  //   return new Attr(name, value);
  // }

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