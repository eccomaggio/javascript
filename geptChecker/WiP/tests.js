class Tests {
  constructor(lookupTable) {
    this.lookupTable = lookupTable;
  }

  makeSearchTerms(lemma, glevel, level, pos, matchType) {
    const matchRegex = this.lookupTable[matchType];
    return {
      lemma: new RegExp(matchRegex[0] + lemma + matchRegex[1], "i"),
      raw_lemma: lemma,
      glevel: glevel,
      level: level,
      pos: pos,
      isExactMatch: matchType === "exact",
      hasOtherTerms: !!(glevel.length + level.length + pos.length),
    };
  }

  testByCount(msg, count, [lemma, glevel, level, pos, matchType="contains"]) {
    const searchTerms = this.makeSearchTerms(lemma, glevel, level, pos, matchType);
    const resultsArr = app.word.runSearch(searchTerms);
    console.log(`** test by count: [${msg}] = ${count === resultsArr.length}`)
  }

  // testByLemma(targetLemma, testLemma, [glevel, level, pos, matchType="contains"]) {
  //   const searchTerms = this.makeSearchTerms(testLemma, glevel, level, pos, matchType);
  //   const resultsArr = app.word.runSearch(searchTerms);
  //   console.log(`** test by lemma: [${testLemma} <- ${targetLemma}] = ${targetLemma === resultsArr[0].lemma}`, resultsArr)
  // }

  testByLemma(msg, lemmaTests, [glevel, level, pos, matchType="contains"]) {
    // console.log("** test by lemma:")
    console.log("\n",msg)
    for (const test of lemmaTests) {
      let [derivedWord, lemma] = test.split("<");
      [derivedWord, lemma] = [derivedWord.trim(), lemma.trim()];
      const searchTerms = this.makeSearchTerms(derivedWord, glevel, level, pos, matchType);
      const resultsArr = app.word.runSearch(searchTerms);
      const candidates = resultsArr.map(entry => entry.lemma);
      const result = candidates.includes(lemma);
      if (result) console.log(`\t${derivedWord} <- ${lemma} (\x1B[32;49;1m${result}\x1B[m)`, resultsArr)
      else console.error(`\t${derivedWord} <- ${lemma} (\x1B[31;49;1m${result}\x1B[m)`, resultsArr)
    }
  }

  testRunningText(text, target) {
    console.log("***>>>***", app.parser.markup(text));
  }

}

const T = new Tests(app.word.MATCHES);
const basicTerms = [[],[],"","contains"];
T.testByCount("ADJS at INT level starting 'a'", 43, ["a",[2],[],"j","starts"]);
T.testByLemma(
  "final -s",
  ["hissed < hiss", "toes<toe", "matches < match", "loaves < loaf", "fixes < fix", "representatives < representative", "lives < life", "buzzes < buzz", "rushes < rush", "rates < rate", "rats < rat"],
  basicTerms);
T.testByLemma(
  "-ly ADVs",
  ["happily < happy", "finally < final", "clumsily < clumsy", "finely < fine", "sensibly < sensible", "sadly < sad", "automatically < automatic"],
  basicTerms);
T.testByLemma(
  "irregular negative verbs",
  ["aren't < be", "won't < will", "cannot < can"],
  basicTerms);

T.testByLemma(
  "irregular pasts",
  ["hidden < hide", "written < write", "stole < steal", "lain < lie"],
  basicTerms);

T.testByLemma(
  "irregular plurals",
  ["indices < index", "cacti < cactus", "criteria < criterion", "phenomena < phenomenon", "radii < radius", "formulae < formula", "bases < basis", "children < child", "crises < crisis"],
  basicTerms);

T.testByLemma(
  "regular Vings",
  ["bobbing < bob", "begging < beg", "swimming < swim", "buzzing < buzz", "picnicking < picnic", "panicking < panic", "hoping < hope", "dying < die", "going < go",  "flying < fly"],
  basicTerms);

T.testByLemma(
  "regular Vpps",
  ["robbed < rob", "logged < log", "passed < pass", "busied < busy", "played < play", "visited < visit"],
  basicTerms);

T.testByLemma(
  "regular superlatives",
  [ "longest < long", "hottest < hot", "prettiest < pretty", "closest < close", "soonest < soon"],
  basicTerms);

T.testByLemma(
  "regular comparisons",
  [ "longer < long", "hotter < hot", "prettier < pretty", "closer < close",  "sooner < soon"],
  basicTerms);

T.testByLemma(
  "foreign plurals",
  ["fora < forum", "criteria < criterion", "indices < index", "indexes < index", "fishermen < fisherman"],
  basicTerms);

T.testByLemma(
  "negative suffixes",
  ["illegal < legal", "inedible < edible", "impractical < practical", "irresponsible < responsible"],
  basicTerms);

T.testByLemma(
  "contractions",
  ["I'm < be", "she'll < will", "we've < have"],
  basicTerms);

T.testByLemma(
  "irregular plurals",
  ["geese < goose", "mice < mouse", "oxen < ox"],
  basicTerms);

T.testByLemma(
  "irregular negative verbs",
  ["daren't < dare", "aren't < be", "don't < do", "cannot < can", "couldn't < could", "won't < will"],
  basicTerms);

T.testByLemma(
  "irregular verbs",
  ["arose < arise", "begun < begin", "began < begin", "dealt < deal", "forgave < forgive", "hanged < hang", "hung < hang", "underwent < undergo", "won < win"],
  basicTerms);

T.testByLemma(
  "variant words",
  ["bookshop < bookstore", "catalogue < catalog", "cheque < check", "enquiry < inquiry", "postman < mail carrier", "xmas < christmas", "cab < taxi", "carer < caretaker", "tyre < tire", "centigrade < celsius", "catalogue < catalog"],
  basicTerms);

T.testByLemma(
  "variant spellings",
  ["traveller < traveler", "mould < mold"],
  basicTerms);

T.testByLemma(
  "gendered nouns",
  ["businessman < businessperson", "stewardess < steward"],
  basicTerms);

// T.testByLemma(
//   "",
//   [""],
//   basicTerms);

// T.testByLemma(
//   "",
//   [""],
//   basicTerms);

T.testRunningText("I'm coming to a bear.")