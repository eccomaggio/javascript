/*
Key to .json vocabulary lists: (AWL based on the table at https://www.eapfoundation.com/vocab/academic/awllists/#):
1) headword
2) sublist number
3) optional word family words

[
    "abstract",                lemma
    "jnv",                     list of parts of speech (here: adj, noun, verb)
    [
        1,                     GEPT level (int+)
        43,                    AWL level (6+)
        3                      status++ (here: in both lists)
    ],
    [chinese, notes, awl headword]
], ...

    + according to position in level_headings
    ++ given by Pos enum:
      AWL_ONLY = 1
      GEPT_ONLY = 2
      AWL_AND_GEPT = 3
      new: OFFLIST = -1
      new: KIDS = 4
*/


const LOOKUP = {
  // splitHere: "___",

  // // ## These are used in the tab 1 GUI
  // // legends: {
  // //   term: "Search",
  // //   match: "Match",
  // //   level: "Level",
  // //   theme: "Theme",
  // //   pos: "PoS",
  // //   results: "Results",
  // // },

  // abbreviations: {
  //   mon: "monday",
  //   tue: "tuesday",
  //   tues: "tuesday",
  //   wed: "wednesday",
  //   weds: "wednesday",
  //   thu: "thursday",
  //   thur: "thursday",
  //   thurs: "thursday",
  //   fri: "friday",
  //   sat: "saturday",
  //   sun: "saturday",
  //   jan: "january",
  //   feb: "february",
  //   mar: "march",
  //   apr: "april",
  //   jun: "june",
  //   jul: "july",
  //   aug: "august",
  //   sep: "september",
  //   sept: "september",
  //   oct: "october",
  //   nov: "november",
  //   dec: "december",
  //   vol: "volume",
  //   kg: "kilogram",
  //   km: "kilometer",
  //   gm: "gram",
  //   cm: "centimeter",
  //   mm: "millimeter",
  //   lb: "pound",
  //   oz: "ounce",
  //   l: "liter",
  //   m: "meter:mile",
  //   p: "page:penny",
  //   g: "gram",
  //   _: [5,4,3,2,1],
  // },

  // repeatableWords: [
  //   "a",
  //   "an",
  //   "and",
  //   "but",
  //   "or",
  //   "so",
  //   "the",
  //   "this",
  //   "that",
  //   "these",
  //   "those",
  //   "here",
  //   "there",
  //   "not",
  //   "no",
  //   "yes",
  //   "be",
  //   "are",
  //   "have",
  //   "had",
  //   "do",
  //   "he",
  //   "him",
  //   "his",
  //   "I",
  //   "i",
  //   "is",
  //   "are",
  //   "was",
  //   "were",
  //   "me",
  //   "mine",
  //   "my",
  //   "you",
  //   "your",
  //   "yours",
  //   "she",
  //   "her",
  //   "hers",
  //   "it",
  //   "its",
  //   "we",
  //   "us",
  //   "our",
  //   "ours",
  //   "they",
  //   "their",
  //   "theirs",
  //   "one",
  //   "this",
  //   "that",
  //   "these",
  //   "those",
  //   "who",
  //   "which",
  //   "where",
  //   "when",
  //   "how",
  //   "why",
  //   "what",
  //   "that",
  //   "more",
  //   "in",
  //   "on",
  //   "at",
  //   "of",
  //   "by",
  //   "with",
  //   "to",
  //   "from",
  //   "for",
  //   "m",
  //   "re",
  //   "ve",
  //   "ll",
  //   "d",
  //   "t",
  //   "s",
  //   "wh",
  //   "yn",
  //   "sr",
  //   "some",
  //   "other",
  //   "about",
  //   "&"
  // ],

}