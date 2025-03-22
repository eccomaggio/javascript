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

  testByLemma(targetLemma, [lemma, glevel, level, pos, matchType="contains"]) {
    const searchTerms = this.makeSearchTerms(lemma, glevel, level, pos, matchType);
    const resultsArr = app.word.runSearch(searchTerms);
    console.log(`** test by lemma: [${lemma} <- ${targetLemma}] = ${targetLemma === resultsArr[0].lemma}`, resultsArr)
  }

}

const T = new Tests(app.word.MATCHES);
T.testByCount("ADJS at INT level starting 'a'", 43, ["a",[2],[],"j","starts"]);
T.testByLemma("hiss", ["hissed",[],[],"","contains"]);