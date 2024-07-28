
class App {
  state;
  db;
  hasBeenReset = true;
  constructor() {
    if (App.#instance) {
      throw new Error("Only one app is allowed to run at a time.");
    }
    App.#instance = this;
    this.tabs = new TabController();
    this.backup = new Backup();
  }

  init() {
    this.state = new State();
    console.log("app:", this)
    // setDbShared(this.state.current.db_state);
    this.wordlist = new Db(this.state.current.db_state);
    this.tabs.setTab(this.state.current.tab_state);
    setupEditing();
    HTM.form.reset();
    updateDropdownMenuOptions();
    visibleLevelLimitSet(true);
    setHelpState("fromSaved");
    addListeners();
  }

  reset(e) {
    this.state.forceDefault();
    this.tabs.resetTabs();
    // this.tabs.clearTab1();
    // this.tabs.clearTab2();
    visibleLevelLimitReset();
    // setTab(V.current.tab_state);
    // setDbShared(V.current.db_state);
    // HTM.selectDb.value = V.current.db_state;
    // this.tabs.setTab(this.state.current.tab_state);
    this.wordlist.change(this.state.current.db_state);
    HTM.selectDb.value = this.state.current.db_state;
    setHelpState("reset");
    visibleLevelLimitReset();
  }
  static #instance;
}


class State {
  default = {
    db_state: 0,
    tab_state: 0,
    limit_state: -1,
    help_state: 1,
    level_state: 1,
    repeat_state: 1,
  };

  current = {};

  constructor() {
    const retrieved_items = this.readFromStorage();
    for (const key in retrieved_items) {
      const value = retrieved_items[key];
      this.current[key] = value;
    }
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
  // offlistDb = [new Entry("unused", "", [-1, -1, -1], "", 0)];
  offlistDb;
  // offlistIndex = 1;
  offlistLevel = 0;

  constructor() {
    this.change(app.state.current.db_state)
  }

  // function setDbShared(e) {
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
    visibleLevelLimitSet();
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
      el.addEventListener("click", setTabWrapper);
    }
    // this.htm.clearButton.addEventListener("click", this.clearTab);
    this.htm.clearButton.addEventListener("click", clearTabWrapper);
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
    displayInputCursor();
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
    displayInputCursor();
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

class Backup {
  htm = {
    backupButton: document.getElementById("backup-btn"),
    backupDialog: document.getElementById("backup-dlg"),
    backupSave: document.getElementById("backup-save"),
    backupSave2: document.getElementById("backup-save2"),
  };
  backupIDs = ["long_term", "short_term"];

  constructor() {
    this.htm.backupButton.addEventListener("click", backupShowWrapper);
    this.htm.backupDialog.addEventListener("mouseleave", backupDialogCloseWrapper);
    // this.htm.backupSave.addEventListener("click", backupSave);
    this.htm.backupSave2.addEventListener("click", backupSaveWrapper);
    for (const id of this.backupIDs) {
      document.getElementById(id).addEventListener("click", backupLoadWrapper);
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
    console.log("current == saved?", shortTermSavedContent === currentText)
    if (app.hasBeenReset) {
      const longTermSavedContent = localStorage.getItem(longTermID).trim();
      console.log("shortterm == longterm?", shortTermSavedContent === longTermSavedContent)
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

class Entry {
  static currID = 0;
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
    return (pos_str) ? pos_str.split("").map(el => LOOKUP.pos_expansions[el]).join(", ") : "";
  }

  get levelArr() { return this._levelArr }
  get levelGEPT() { return this._levelArr[0] }
  get levelAWL() { return this._levelArr[1] - C.awl_level_offset }

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
  */
  constructor(lemma, type = "", matches = [], count = 0) {
    this.lemma = lemma;
    this.type = type;
    this.matches = matches;
    this.count = count;
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
      tmpAttrs = this.attrs.map(
        el => (el.length === 1)
          ? ` ${el}`
          : ` ${el[0]}="${el[1]}"`
      ).join("");
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