
"use strict"

const x = ["hottest", "drier", "fatter", "running", "bluer", "slower", "fitted", "dubbed", "tried", "guesses", "matches", "finally", "rarely", "fully", "wholly", "slowly", "basically", "dog", "lend", "happy", "bang", "sir", "first"]

const suffixChecks = [
  ["es", findRootEs, ["n", "v"]],
  ["s", findRootEs, ["n", "v"]],
  ["ing", findRootErEstEdIng, ["v"]],
  ["ed", findRootErEstEdIng, ["v"]],
  ["est", findRootErEstEdIng, ["j"]],
  ["er", findRootErEstEdIng, ["j"]],
  ["ly", findRootLy, ["j", "v"]], // added verbs to allow for 'satisfy-ing-ly' etc.
];

const s_subs = {
  ies: ["y"],
  oes: ["o"],
  ves: ["fe", "f"],
  es: ["e", ""],
  s: [""],
  _: [3, 2, 1]
}

const ly_subs = {
  ily: ["y"],
  lly: ["l", "ll", "le"],
  ely: ["e"],
  ically: ["ic"],
  bly: ["ble"],
  ly: [""],
  _: [6, 3, 2]
}

function checkAllSuffixes(word) {
  let matchedEntryArr = [];
  for (const [suffix, check, pos] of suffixChecks) {
    if (word.endsWith(suffix)) {
      matchedEntryArr = check(word, suffix);
    }
  }
  return matchedEntryArr;
}

function findRootErEstEdIng(word, suffix) {
  /* works for -er, -est, -ing, -ed
  Logic:
  biGGer/st, swiMMing, fiTTed
  drIer/st, trIed
  slow > slower/st/ing/ed vs linE > liner/ing/d
  */
  let matchedEntryArr = [];
  if (!word.endsWith(suffix)) return matchedEntryArr;
  let root = word.slice(0, -suffix.length);
  const ult = root.slice(-1);
  const penult = root.slice(-2, -1)
  //console.log(root, suffix, ult, penult)
  if (ult === penult) root = [root.slice(0, -1)];
  else if (ult === "i") root = [root.slice(0, -1) + "y"];
  else root = [root, root + "e"];
  return root;
}

function findRootLy(word, suffix) {
  return lookupForArray(word, ly_subs);
}

function findRootEs(word, suffix) {
  return lookupForArray(word, s_subs);
}

function lookupForArray(word, lookup) {
  let matchedEnding = "";
  let matchedEntryArr = [];
  for (let i of lookup["_"]) {
    if (i > word.length) continue;
    const root = word.slice(0,-i)
    // const ending = word.slice(-i);
    matchedEnding = lookup[word.slice(-i)];
    if (matchedEnding?.length) {
      for (let el of matchedEnding) {
        // TODO: check this doesn't return empty items:w

        // matchedEntryArr.push(...app.db.getEntriesByExactLemma(el));
        matchedEntryArr.push(root + el);
      }
      break;
    }
  }
  return matchedEntryArr;
}


function lookupForString(word, lookup) {
  let match = "";
  let matchedEntryArr = [];
  for (let i of lookup["_"]) {
    if (i > word.length) break;
    match = lookup[word.slice(0, i)];
    if (match) {
      matchedEntryArr.push(...app.db.getEntriesByExactLemma(el));
      break;
    }
  }
  return matchedEntryArr;
}

for (let word of x) {
  const result = checkAllSuffixes(word)
  console.log(word, ">>", ...result)
}