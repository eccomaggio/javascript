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
        // if (word.search(/[-'\s]/) >= 0) {
        if (splitWord.length > 1) {
          // if (splitWord.length > C.compoundMaxLen) C.compoundMaxLen = splitWord.length;
          const newCompound = splitWord.join("");
          entry[C.isCOMPOUND] = true;
          compounds[newCompound] = id;
        }
      }
      // console.log("compounds:", compounds)
      return compounds;
    }

    // ## TAB1 (words) SETUP ############################################


    addListeners();
    finalInit();


    // TAB1 (words) CODE ## ############################################

    // ***** INIT FUNCTIONS

    function addListeners() {
      document
        .getElementById("t1_theme_select")
        .addEventListener("change", submitForm);

      document.getElementById("t1_term_i").addEventListener("input", submitForm);

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
      document.getElementById("reset_button").addEventListener("click", resetTab);

      // ## for refresh button + settings menu
      document.getElementById("set-db").addEventListener("change", changeDb_shared);
      document.getElementById("set-font").addEventListener("change", changeFont);
      document.getElementById("set-refresh").addEventListener("change", changeRefresh);
      HTM.refreshButton.addEventListener("click", processText);
      HTM.backupButton.addEventListener("click", showBackups);
      HTM.backupDialog.addEventListener("mouseleave", closeDialog);
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
      // ## was originally handled in css but firefox has weird mouseout quirks
      // ## https://stackoverflow.com/questions/46831247/select-triggers-mouseleave-event-on-parent-element-in-mozilla-firefox
      if (e.relatedTarget === null) {
        return;
      }
      HTM.settingsContent.style.display = (e.type == "mouseenter") ? "flex" : "none";
    }

    function finalInit() {
      changeDb_shared(0);
      // changeDb_words();
      refreshLabels("t1_form");
      resetTab1();
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
      closeDialog("backup-dlg");
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

    function closeDialog(id) {
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
        submitForm(e_label);
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

    function getInputs(parentID) {
      let tag = "input";
      if (parentID == "theme") tag = "option";
      return document.getElementById(parentID).querySelectorAll(tag);
    }

    function submitForm(event) {
      let results = [];
      let resultString = "";
      let errorMsg = "";
      let raw_data = new FormData(HTM.form);
      if (event) event.preventDefault();

      let data = {
        term: [],
        match: [],
        level: [],
        theme: [],
        awl: [],
        pos: []
      };
      for (let [key, value] of raw_data) {
        // ## default value of option (but screws up db lookup)
        if (value === "-1") value = "";
        if (key === "level" && V.currentDb.isKids) continue;
        if (key === "theme" && (V.currentDb.isGEPT || V.currentDb.isBEST)) continue;
        if (key === "awl" && (V.currentDb.isGEPT || V.currentDb.isKids)) continue;
        const digit = parseInt(value);
        if (Number.isInteger(digit)) {
          // console.log("digit:",digit)
          data[key].push(digit);
        } else if (value.trim()) {
          data[key].push(value.trim());
        }
      }
      // console.log("Search for:" + JSON.stringify(data).replace(/[\[\]\{\}]/g, ""));

      let term = data.term.join().toLowerCase();
      // ** Substitute theme data for level in GEPTKids search
      // ** otherwise theme data is disregarded
      let level = data.level;
      const awl = data.awl.map(x => x + C.awl_index0);
      // console.log({awl})
      if (V.currentDb.isKids) level = data.theme;
      const pos = data.pos.join("|");
      const searchTerms = term + level + pos;
      if (!searchTerms) {
        errorMsg = "Please enter at least one search term to restrict the number of results.";
      }
      else if (term.search(/[^a-zA-Z\s\-\s\']/g) > -1) {
        errorMsg = "The only non-alphabetic characters allowed are space, apostrophe, and hyphen.";
      }
      else {
        const checkTerm = term.split(" ");
        // console.log("debug *submitForm*2",checkTerm,checkTerm.length)

        if (checkTerm.length > 1) {
          // errorMsg = "You can only search for one word at a time.<br>";
          term = checkTerm[0];
        }
        const context = data.match.join().split(":");
        term = context ? context[0] + term + context[1] : term;
        term = new RegExp(term, "i");
        results = get_results({
          term: term,
          level: level,
          awl: awl,
          pos: pos
        });
        resultString = format_results(results);
      }
      if (errorMsg) errorMsg = "<p class='error'>" + errorMsg + "</p>";
      display_results([errorMsg + resultString, results.length]);
    }

    function get_results(find) {
      const regex = new RegExp(find.term, 'i');
      let results = V.currentDb.db.filter(el => el[C.LEMMA].search(regex) != -1);
      if (find.level.length) {
        results = results.filter(el => find.level.indexOf(el[C.LEVEL][0]) > -1);
      }
      if (find.pos) {
        results = results.filter(el => el[C.POS].search(find.pos) != -1);
      }
      if (V.isBEST && find.awl && find.awl.length) {
        const resultsInAWL = results.filter(el => find.awl.indexOf(el[C.LEVEL][1]) > -1);
        let resultsInGEPT = [];
        // ** Add in GEPT list words if required
        if (find.awl.indexOf(100 + C.awl_index0) >= 0) {
          resultsInGEPT = results.filter(el => typeof el[C.LEVEL][1] === 'undefined');
        }
        results = resultsInAWL.concat(resultsInGEPT);
      }
      // ## remove the dummy 0 entry from results
      if (results.length && !results[0][0]) {
        results.shift();
      }
      return results;
    }

    function getAwlSublist(level_arr) {
      return (level_arr[1] && V.isBEST) ? level_arr[1] - C.awl_index0 : -1;

    }

    function format_results(results) {
      // console.log("debug *formatresults*", results, !results)
      let output = "";
      let previousInitial = "";
      let currentInitial = "";
      let i = 0;
      if (!results.length) {
        output = "<tr><td></td><td class='error'>No matching words found.</td></tr>";
      } else {
        for (const entry of results.sort(compareByLemma)) {
          currentInitial = (entry[C.LEMMA]) ? entry[C.LEMMA][0].toLowerCase() : "";
          if (currentInitial !== previousInitial) {
            output += format_results_as_tablerows(currentInitial.toLocaleUpperCase(), "", "black", "");
          }
          const lemma = `<strong>${entry[C.LEMMA]}</strong>`;
          const pos = `[${entry[C.POS].trim()}]`;
          const level_arr = entry[C.LEVEL];
          const awl_sublist = getAwlSublist(level_arr);
          // const awl_indicator = (awl_sublist >= 0) ? `; AWL${awl_sublist}` : "";
          let level = V.level_subs[level_arr[0]];
          if (awl_sublist >= 0) level += `; AWL${awl_sublist}`;
          if (!level) continue;
          let note = entry[C.NOTE].trim();
          note = note ? `, ${note}` : "";
          // const col2 = `${lemma}${awl_indicator} <span class="pos">${pos}</span> ${level}${note}`;
          const col2 = `${lemma} <span class="show-pos">${pos}</span> <span class="show-level">${level}</span>${note}`;
          // let class2 = (V.currentDb.name === "GEPTKids") ? "level-e" : `level-${level[0]}`;
          let class2 = (V.currentDb.isKids) ? "level-e" : `level-${level[0]}`;
          // const class2 = `level-${level[0]}`;
          // output += format_results_as_tablerows(`${i + 1}${awl_indicator}`, col2, "", class2);
          output += format_results_as_tablerows(`${i + 1}`, col2, "", class2);
          previousInitial = currentInitial;
          i++;
        }
      }
      return "<table>" + output + "</table>";
    }

    function format_results_as_tablerows(col1, col2, class1, class2, row) {
      class1 = (class1) ? ` class="${class1}"` : "";
      class2 = (class2) ? ` class="${class2}"` : "";
      row = (row) ? ` class="${row}"` : "";
      return (`<tr${row}><td${class1}>${col1}</td><td${class2}>${col2}</td></tr>\n`)
    }

    function display_results(output) {
      const resultText = output[0];
      const resultCount = output[1];
      let text = lookup.legends.results;
      if (resultCount) text += ` (${resultCount})`;
      HTM.resultsLegend.innerHTML = text;
      HTM.resultsText.innerHTML = resultText;
    }

    function resetTab1() {
      HTM.form.reset();
      display_results([]);
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
        // for (let i = 0; i < els.length; i++) {
        //   els[i].classList.toggle("highlight");
        // }
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
      let level_arr = entry[C.LEVEL];
      let level = V.level_subs[level_arr[0]];
      // let awl_sublist = getAwlSublist(level_arr);
      // if (awl_sublist >= 0){
      if (getAwlSublist(level_arr) >= 0) {
        level += `; ${V.level_subs[level_arr[1]]}`;
      }
      level = `<em>${level}</em>`;
      const pos = `[${entry[C.POS]}]`;
      const notes = (entry[C.NOTE]) ? ` ${entry[C.NOTE]}` : "";
      const html = `${level}<span>${lemma}${pos}${notes}</span>`;
      return html;
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
        const textArr = findCompounds(chunkedText);
        const [processedTextArr, wordCount] = addLookUps(textArr);
        const htmlString = convertToHTML(processedTextArr);
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
        .replace(/([\.,;()\:\?\!])\s+/gi, "$1@@")
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
        */
        for (let word_i = 0; word_i < chunk.length - 1; word_i++) {
          let tail = [];
          for (let j = word_i; j < chunk.length; j++) {
            tail.push(chunk[j][0])
          }
          let matches = [];
          for (let compound in V.currentDb.compounds) {
            if (V.currentDb.compounds.hasOwnProperty(compound)) {
              const [c_lemma, c_id] = [compound, V.currentDb.compounds[compound]];
              if (tail.join("").startsWith(c_lemma)) addMatch(matches, c_id);
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
          matches = lookUpWord(wordArr);
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
        tmp = [-(V.offlistIndex), word, type, [lookup.offlist_subs.indexOf(type) + lookup.level_headings.length], ""];
        V.offlistDb.push(tmp);
        V.offlistIndex++
      }
      return tmp[0];
    }

    function lookUpWord([word, raw_word]) {
      /*
      returns => array of matched ids
      NB. always returns a match, even if it is just "offlist"
      */
      let matches = [];
      if (word.match(/\d/i)) {
        matches.push(markOfflist(word, "digit"));
        return matches;
      }
      else if (!word.match(/[a-z]/i)) {
        matches.push(markOfflist(word, "unknown"));
        return matches;
      }
      else if (lookup.contractions.includes(word)) {
        matches.push(markOfflist(word, "contraction"));
      }
      else if (lookup.setOfCommonNames.has(word) && (raw_word[0] === raw_word[0].toUpperCase())) {
        // console.log("name:",word, raw_word[0], /^[A-Z]*$/.test(raw_word[0]),raw_word[0] === raw_word[0].toUpperCase());
        matches.push(markOfflist(word, "proper name"))
      }
      // else {
      else if (V.currentDb.language == "en") {
        matches = dbLookup(word);
        if (lookup.irregNegVerb[word]) {
          /* ## test = hidden written stole lain */
          const candidate = dbLookup(lookup.irregNegVerb[word])[0];
          // ## Check for GEPTKids to ensure word is in the very limited wordlist
          if (candidate) matches.push(candidate);
        }
        else if (lookup.irregVerb[word]) {
          /* ## test = aren't won't cannot */
          const candidate = dbLookup(lookup.irregVerb[word])[0];
          // ## Check for GEPTKids to ensure word is in the very limited wordlist
          if (candidate) matches.push(candidate);
        }
        if (word.slice(-3) == "ing") {
          /* ## test = "bobbing begging swimming buzzing picnicking hoping dying going flying" */
          addToMatches(word, matches, lookup.g_subs, "verb");
        }
        if (word.slice(-2) == "ed") {
          /* ## test = robbed gagged passed busied played visited */
          addToMatches(word, matches, lookup.d_subs, "verb");
        }
        if (!matches.length) {
          if (word.slice(-2) == "st") {
            /* ## test = "longest hottest prettiest closest soonest" */
            addToMatches(word, matches, lookup.est_subs, "ad");
          }
          else if (word.slice(-1) == "r") {
            /* ## test = "longer hotter prettier closer sooner" */
            addToMatches(word, matches, lookup.er_subs, "ad");
          }
          else if (word.slice(-1) == "s") {
            /* ## test: families tries potatoes scarves crises boxes dogs ## Filter out adjs (can't take '-s') */
            const candidates = findBaseForm(word, lookup.s_subs);
            for (const id of candidates) {
              const candidate = getDbEntry(id);
              if (candidate.length > 0 && candidate[C.POS] !== "adj.") {
                matches.push(id);
              }
            }
          }
          else if (word.slice(-2) == "ly") {
            /* ## test: happily clumsily annually finely sensibly sadly automatically */
            addToMatches(word, matches, lookup.y_subs, "adj");
          }
          else if (lookup.irregPlural[word]) {
            /* ## test: indices, cacti, criteria, phenomena, radii, HTM.formulae, bases, children, crisis */
            matches.push(dbLookup(lookup.irregPlural[word])[0]);
          }
          for (const match of checkForeignPlurals(word)) {
            matches.push(...match)
          }
          // if (!(matches.length || matches[0])) {
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
      // console.log("getDbEntry debug",id,dB[id])
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
        // let tmp = [];
        for (const [id, count] of matches) {
          const match = getDbEntry(id);
          let displayWord = "";
          const ignoreRepeats = lookup.repeatableWords.includes(match[C.LEMMA]);
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
            showDuplicateCount = "<sup>" + totalRepeats + "</sup>";
            anchor = ` id='all_${id}_${duplicateCount}'`;
          }
          let localWord = rawWord;
          // console.log("Localword:",localWord,id)
          const origLemma = (V.currentDb.db[id]) ? V.currentDb.db[id][C.LEMMA] : word;
          if (origLemma.search(/[-'\s]/) >= 0) localWord = origLemma;
          displayWord = `${leaveSpace}<span data-entry="${id}:${word}" class="${levelClass}${relatedWordsClass}${duplicateClass}"${anchor}>${localWord + showDuplicateCount}</span>`;
          if (matchCount < matches.length - 1) displayWord += " /" + (leaveSpace ? "" : " ");
          htmlString += displayWord;
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
        // listOfRepeats = "";
      } else {
        for (const key of Object.keys(V.wordStats).sort(compareByLemma)) {
          const entry = getDbEntry(key);
          const word = entry[C.LEMMA];
          if (V.wordStats[key] > 1 && !lookup.repeatableWords.includes(word)) {
            countReps++;
            let anchors = "";
            for (let x = 1; x <= V.wordStats[key]; x++) {
              let display = x;
              let displayClass = 'class="anchors" ';
              if (x === 1) {
                display = word;
                displayClass = `class="level-${getLevelPrefix(entry[C.LEVEL][0])}" `;
              }
              anchors += ` <a href="#" ${displayClass}onclick="jumpToDuplicate('all_${key}_${x}'); return false;">${display}</a>`;
            }
            listOfRepeats += `<p data-entry="${key}" class='duplicate all_${key} level-${getLevelPrefix(entry[C.LEVEL][0])}'>${anchors}</p>`;
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
        const numOfWords = (wordCount > 0) ? `<span class="text-right dark">(c.${wordCount} word${(wordCount > 1 ? "s" : "")}) <a href='#all_repeats' class='medium'>&#x25BC;</a></span>` : "";
        HTM.finalLegend.innerHTML = displayDbName(numOfWords);
        HTM.finalInfoDiv.style.display = "flex";
      }
      HTM.finalTextDiv.innerHTML = htmlText;
      HTM.finalInfoDiv.innerHTML = "";
    }

    function displayDbName(msg) {
      if (!msg) msg = "";
      return `Checked against <span id='db_name2' class='dbColor'>${V.currentDb.name}</span>${msg}`;
    }

    function dbLookup(word, pos) {
      // ## returns list of matched IDs
      const search = {
        term: `^${word.toLowerCase()}$`,
        level: "",
        pos: pos
      };
      const searchResults = get_results(search);
      const matches = [];
      // ## return only the IDs
      // for (const i in get_results(search)) {
      for (const i in searchResults) {
        if (searchResults[i]) matches.push(searchResults[i][0]);
      }
      // console.log("*dbLookup* matches=",search, matches)
      return matches;
    }

    function findBaseForm(word, subs) {
      /* Uses lookup tables to apply spelling rules to return underlying base HTM.form candidates
      */
      let localMatches = [];
      const candidates = new Set();
      const toSuffix = -(subs["_suffix"].length);
      //console.log("debug *findBaseForm", subs)
      for (const key in subs) {
        const i = -(key.length);
        const suffix = subs[word.slice(i)];
        if (suffix != undefined) {
          candidates.add(word.slice(0, i) + suffix);
        }
      }
      candidates.add(word.slice(0, toSuffix));
      for (const candidate of candidates) {
        // console.log("debug *findBaseForm2*",candidate)
        const tmp_match = dbLookup(candidate);
        if (tmp_match.length) localMatches.push(...tmp_match);
      }
      // console.log("findBaseForm", localMatches)
      return localMatches;
    }

    function checkForeignPlurals(word) {
      let candidates = [];
      for (const ending of lookup.foreign_plurals) {
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
      // console.log(`*resetTab* id=${event.target.id}, isTab1=${isTab1()}`);
      if (isTab1()) {
        resetTab1();
      } else {
        resetTab2();
      }
    }


    function changeDb_shared(e) {
      let choice = (e.target) ? parseInt(e.target.value) : e;
      V.currentDb = [];
      if (choice === 0) {
        V.currentDb = {
          name: "GEPT",
          db: indexDb(makeGEPTdb()),
          show: [HTM.G_level],
          hide: [HTM.K_theme,HTM.B_AWL],
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
          db: indexDb(tmpDb.concat(makeAWL())),
          show: [HTM.G_level,HTM.B_AWL],
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
          hide: [HTM.G_level,HTM.B_AWL],
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
      submitForm();
    }

    function changeDb_text() {
      //rawDiv.dispatchEvent(new Event("input"));
      const dbNameText = document.getElementById('db_name2');
      // document.getElementById('db_name2').textContent = currentDb.name;
      if (dbNameText) dbNameText.textContent = V.currentDb.name;
      processText(HTM.rawDiv);
    }

    // ## TABS ############################################

    const tabHead = document.getElementById("tab-head");
    const tabBody = document.getElementById("tab-body");
    let currentTab = 0;
    activateTab(tabHead.children[0]);

    function activateTab(tab) {
      if (tab.target) tab = tab.target
      let i = 0;
      for (const content of tabBody.children) {
        if (tab === tabHead.children[i]) {
          currentTab = i;
          tabHead.children[i].classList.add("tab-on");
          tabHead.children[i].classList.remove("tab-off");
          content.style.display = "flex";
        } else {
          tabHead.children[i].classList.add("tab-off");
          tabHead.children[i].classList.remove("tab-on");
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
    }

    function isTab1() {
      return currentTab === 0;
    }

