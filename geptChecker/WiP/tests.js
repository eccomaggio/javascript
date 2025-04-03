class Tests {
  // constructor(lookupTable) {
  //   this.lookupTable = lookupTable;
  // }


  makeSearchTerms(lemma, glevel, level, pos, matchType) {
    const terms = app.word.buildSearchTerms({
      term: [lemma],
      level: level,
      glevel: glevel,
      pos: [pos],
      match: [matchType],
    });
    return terms;
  }
  testByCount(msg, count, [lemma, glevel, level, pos, matchType="contains"]) {
    this.displayTestTitle("verify number of matches per search");
    const searchTerms = this.makeSearchTerms(lemma, glevel, level, pos, matchType);
    const resultsArr = app.word.runSearch(searchTerms);
    const hasExpectedNumberOfMatches = count === resultsArr.length;
    // console.log(`** test by count: [${msg}] = ${count === resultsArr.length}`, resultsArr)
    this.displayTestResult(hasExpectedNumberOfMatches, `\x1B[1m${msg}\x1B[m (\x1B[32;49;1m${hasExpectedNumberOfMatches}\x1B[m)`, resultsArr)
  }

  testByLemma(msg, lemmaTests, [glevel, level, pos, matchType="contains"]) {
    this.displayTestTitle(msg);
    for (const test of lemmaTests) {
      let [derivedWord, lemma] = test.split("<");
      [derivedWord, lemma] = [derivedWord.trim(), lemma.trim()];
      const searchTerms = this.makeSearchTerms(derivedWord, glevel, level, pos, matchType);
      const resultsArr = app.word.runSearch(searchTerms);
      const candidates = resultsArr.map(entry => entry.lemma);
      const result = candidates.includes(lemma);
      this.displayTestResult(result, `\x1B[1m${derivedWord} \x1B[0m<- ${lemma} (\x1B[32;49;1m${result}\x1B[m)`, resultsArr)
    }
  }

  testRunningText(text, matches, msg="continuous text") {
    this.displayTestTitle(msg);
    const result = app.parser.markup(text);
    // const contents = result.filter(token=>token?.matches[0]).map(token=>token.matches[0].id);
    const contents = this.testTokenArray(result);
    const textMatchesTarget = this.areTheSame(contents, matches);
    this.displayTestResult(textMatchesTarget, `<${text}> parsed \x1B[1m${(textMatchesTarget) ? "" : "in"}correctly.\x1B[m`, contents)
    // console.log("***>>>***", contents, matches, this.areTheSame(contents,matches));
  }

  testTokenArray(tokenArr) {
    return tokenArr.filter(token=>token?.matches[0]).map(token=>token.matches[0].id);
  }

  areTheSame(arr1, arr2) {
    let result = true;
    if (arr1.length === arr2.length) {
      for (let i=0; i<arr1.length; i++) {
        if (arr1[i] !== arr2[i]) result = false;
      }
    }
    else result = false;
    return result;
  }

  displayTestResult(isPass, msg, data="") {
    if (isPass) console.log("\t" + msg, data);
    else console.error("\t" + msg, data);
  }

  displayTestTitle(title) {
    console.log(`\n** \x1B[34;49;10m${title}\x1B[m`);
  }

}

const T = new Tests(app.word.MATCHES);
const basicTerms = [[],[],"","contains"];
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

T.testRunningText(
  "I'm, you'll, she's, we've, they'd, we're",
  [4374, -1, 10077, -2, 7938, -3, 9827, -4, 9014, -5, 9827, -6],
  "contractions");

T.testRunningText("I'm colouring; can't stop 20cm.", [4374, -1, 1637, 1219, 8523, -2]);

T.testByCount("ADJS at INT level starting 'a'", 43, ["a",[2],[],"j","starts"]);
T.testByCount("all adjs at int level ending with -ed", 25, [["ed"], [2],[], "j", "ends"]);