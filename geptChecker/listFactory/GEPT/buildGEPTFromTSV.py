"""
This takes in a csv file which consists of 4 cols:
1) lemma
2) part of speech
3) Chinese gloss
4) notes
5) GEPT level
6) wordlist level (if available)

And will change it into this:

[
        "abstract",               // lemma
        "jnv",                    // list of parts of speech (here: adj, noun, verb)
        [
            1,                    // GEPT level (int*)
            43,                   // AWL level (6*)
            3                     // status** (here: in both lists)
        ],
        "抽象的，摘要|abstract"    // chinese gloss (if any) + separator + awl headword (if any)
    ],

    * according to position in level_headings
    ** given by Pos enum:
      AWL_ONLY = 1
      GEPT_ONLY = 2
      AWL_AND_GEPT = 3

This script refactors it as a GEPTwordlistTool style list:
lemma, PoS space-sep string, [GEPT level number], notes

A note is made of the AWL-sublist number
whether it is a headword

Several time-saving guesses are made (which will need to be edited for a final list):
UK spelling
Part of speech

The file should be called AWLallwords.tsv


TO DO:
run it against the GEPT word list & add in:
1) is the word in the GEPT list
2) if so, what is its GEPT level

output file as a .json file (so it can be used by javascript)
"""

import csv
import json
import os
import sys
import re
import string
from enum import Enum
from dataclasses import dataclass
from pprint import pprint

# @dataclass
# class Pos:
#     noun: str = "n"
#     verb: str = "v"
#     art: str = "a"
#     det: str = "d"
#     determiner: str = "d"
#     aux: str = "x"
#     adj: str = "j"
#     conj: str = "c"
#     interj: str = "i"
#     number: str = "m"
#     adv: str = "b"
#     prep: str = "p"
#     pron: str = "r"
#     int: str = "t"
#     inf: str = "f"

pov_lookup = {
    "noun": "n",
    "verb": "v",
    "art": "a",
    "det": "d",
    "determiner": "d",
    "aux": "x",
    "adj": "j",
    "conj": "c",
    "interj": "i",
    "number": "m",
    "adv": "b",
    "prep": "p",
    "pron": "r",
    "int": "t",
    "inf": "f",
    # '--': 'title',
    "--": "n",  # titles are listed as 'noun' in main GEPT wordlist
}

# pov_lookup = {
#   'n': 'noun',
#   'v': 'verb',
#   'art': 'art.',
#   'det': 'determiner',
#   'aux': 'aux.',
#   'adj': 'adj.',
#   'conj': 'conj.',
#   'interj': 'interj.',
#   'number': 'number',
#   'adv': 'adv.',
#   'prep': 'prep.',
#   'pron': 'pron.',
#   # '--': 'title',
#   '--': 'noun', # titles are listed as 'noun' in main GEPT wordlist
#   }

# pov_lookup = {
#   'n': 'noun',
#   'v': 'verb',
#   'a': 'art.',
#   'd': 'determiner',
#   'x': 'aux.',
#   'j': 'adj.',
#   'c': 'conj.',
#   'i': 'interj.',
#   'm': 'number',
#   'b': 'adv.',
#   'p': 'prep.',
#   'r': 'pron.',
#   # 't': 'title',
#   '--': 'noun', # titles are listed as 'noun' in main GEPT wordlist
#   }

level_headings = [
    "elementary",
    "intermediate",
    "high-intermediate",
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
    "AWL sublist 1",
    "AWL sublist 2",
    "AWL sublist 3",
    "AWL sublist 4",
    "AWL sublist 5",
    "AWL sublist 6",
    "AWL sublist 7",
    "AWL sublist 8",
    "AWL sublist 9",
    "AWL sublist 10",
]

AWL_INDEX = 37


class Pos(Enum):
    N = "noun"
    V = "verb"
    ADJ = "adj"
    ADV = "adv"
    S = "flexion"
    H = "headword"
    VPP = "Vpp"
    VING = "Ving"
    UK = "UK"
    DEL = "DEL"
    AWL_ONLY = 1
    GEPT_ONLY = 2
    AWL_AND_GEPT = 3
    # AWL_OR_GEPT = 4 ## overlaps all others!


class C(Enum):
  LEMMA = 0
  POS = 1
  LEVEL = 2
  NOTES = 3

SEP = '"'
NOTES_SEP = "|"


def get_full_awl_list():
  file = "../AWL/AWLallwords.tsv"
  with open(file, mode='r') as f:
    reader = csv.reader(f, delimiter='\t')
    word_list = {}
    for row in reader:
      if len(row) < 1:
        continue
      # print(row, len(row))
      level = row[1]
      # words = row[2].split(",") if len(row) == 3 else []
      words = [word.strip() for word in row[2].split(",")] if len(row) == 3 else []
      word_list[row[0]] = [level, words]
  # pprint(awl_list)
  return word_list


def get_csv_list(file, sep='\t'):
  with open(file, mode='r') as f:
    reader = csv.reader(f,delimiter=sep)
    tmp = {}
    # line_number = 1
    for uid, row in enumerate(reader):
        tmp[uid] = row
        # line_number += 1
    # pprint(reader)
  return tmp


def minimize_pos(pos):
    if pos:
        pos = pos.replace(".", "")
        pos = re.sub("[()/,]", " ", pos)
        pos = re.sub("\s{2,}", " ", pos).strip()
        # return " ".join([pov_lookup[item] for item in pos.split(" ")])
        return "".join([pov_lookup[item] for item in pos.split(" ")])


def main():
    # awl_list = get_full_AWL_list()
    gept_list = get_csv_list("./GEPTwordlist(updated2024).tsv")
    for id, entry in gept_list.items():
       print(id, entry)
    print(gept_list[0])


if __name__ == '__main__':
  main()
