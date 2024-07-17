"""
This takes in a csv file which consists of 6 cols:
1) lemma
2) part of speech
3) Chinese gloss
4) notes
5) GEPT level
6) AWL wordlist level (if available)

And will change it into this:

[
        "abstract",               // lemma
        "jnv",                    // list of parts of speech (here: adj, noun, verb)
        [
            1,                    // GEPT level (int*)
            43,                   // AWL level (6*)
            3                     // status** (here: in both lists)
        ],
        # "抽象的，摘要|abstract"    // chinese gloss (if any) + separator + awl headword (if any)
        new: ["抽象的，摘要", "", "abstract"]    // chinese gloss (if any) + notes (if any) + awl headword (if any)
    ],

    * according to position in level_headings
    ** given by Pos enum:
      AWL_ONLY = 1
      GEPT_ONLY = 2
      AWL_AND_GEPT = 3

lemma > lemma
pos > pos
gloss > notes
notes > notes
GEPT level > level[0]
AWL level > level[1]  (+ AWL_INDEX)

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

pos_lookup = {
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
    OFFLIST = -1
    # AWL_OR_GEPT = 4 ## overlaps all others!


class C(Enum):
    LEMMA = 0
    POS = 1
    LEVEL = 2
    NOTES = 3


SEP = '"'
# NOTES_SEP = "|"


# def get_full_awl_list():
#   file = "../AWL/AWLallwords.tsv"
#   with open(file, mode='r') as f:
#     reader = csv.reader(f, delimiter='\t')
#     word_list = {}
#     for row in reader:
#       if len(row) < 1:
#         continue
#       # print(row, len(row))
#       level = row[1]
#       # words = row[2].split(",") if len(row) == 3 else []
#       words = [word.strip() for word in row[2].split(",")] if len(row) == 3 else []
#       word_list[row[0]] = [level, words]
#   # pprint(awl_list)
#   return word_list

def save_list_as_json(list, out_filename, top="", tail=""):
    with open(os.path.join(os.getcwd(), out_filename), "w") as out_file:
        if top:
            out_file.write(top)
        json.dump(list, out_file, indent=None)
        if tail:
            out_file.write(tail)


def return_separated_file_as_dict(file, sep="\t"):
    with open(file, mode="r") as f:
        reader = csv.reader(f, delimiter=sep)
        tmp = {}
        for uid, row in enumerate(reader):
            tmp[uid] = row
    return tmp


def return_separated_file_as_list(file, sep="\t"):
    with open(file, mode="r") as f:
        reader = csv.reader(f, delimiter=sep)
        tmp = []
        for row in reader:
            if row:
                tmp.append(row)
    return tmp


def return_list_from_json_file(filename):
    with open(filename, "r") as file:
        data = json.load(file)
    return data


def minimize_pos(pos):
    if pos:
        pos = pos.replace(".", "")
        pos = re.sub(r"[()/,]", " ", pos)
        pos = re.sub(r"\s{2,}", " ", pos).strip()
        # return " ".join([pov_lookup[item] for item in pos.split(" ")])
        return "".join([pos_lookup[item] for item in pos.split(" ")])

# def create_notes(gloss, notes):
#     tmp = [x for x in [gloss, notes] if x.strip()]
#     return "; ".join(tmp)

def create_notes(gloss, notes):
    ## the placeholder empty string is for awl headword (if any)
    return [gloss.strip(), notes.strip(), ""]


def normalize_cols(list):
    ur_lemma = 0
    ur_pos = 1
    ur_gloss = 2
    ur_notes = 3
    ur_gept = 4
    ur_awl = 5

    levels = {
        "e": 0,
        "i": 1,
        "h": 2
    }

    normalized = []
    for e in list:
        # awl_level = -1
        awl_level = Pos.OFFLIST.value
        # if e[ur_awl]:
        if len(e) == 6:
            awl_level = int(e[ur_awl].strip()[1:]) + AWL_INDEX
        normalized_entry = [
            e[ur_lemma].strip(),
            e[ur_pos].strip(),
            [
                levels[e[ur_gept][0].lower()],
                awl_level,
                Pos.GEPT_ONLY.value
            ],
            # e[ur_gloss] + "; " + e[ur_notes] + "|"
            #   e[ur_gloss].strip() + "; " + e[ur_notes].strip()
            create_notes(e[ur_gloss], e[ur_notes])
        ]
        normalized.append(normalized_entry)
    return normalized



def main():
    # raw_gept = return_separated_file_as_list("GEPTwordlist(updated2024).tsv")
    raw_gept = return_separated_file_as_list("GEPTwordlist.latest.tsv")
    raw_gept.pop(0) ## Remove header line
    gept_list = normalize_cols(raw_gept)
    gept_list.insert(0,
        # ["", "", [0, -1, 2], "dummy entry: 0 easily confused with undefined|"],
        ["", "", [0, Pos.OFFLIST.value, 2], ["dummy entry: 0 easily confused with undefined","",""]],
    )
    assert len(gept_list) == 8393 + 1  ## according to the spreadsheet (minus headers line)
    save_list_as_json(gept_list, "dbGEPT.json")
    # pprint(gept_list)
    print(f"updated raw_gept contains {len(raw_gept)} entries")
    print(f"updated gept_list contains {len(gept_list)} entries")


if __name__ == "__main__":
    main()
