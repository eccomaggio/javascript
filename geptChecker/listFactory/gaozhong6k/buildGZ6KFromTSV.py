"""
This takes in a csv file of the 高中6K字-108版 wordlist which consists of 3 cols:
1) lemma
2) part of speech
3) GEPT level
and a header with column names

And will change it into this:

[
        "abstract",               // lemma
        "jnv",                    // list of parts of speech (here: adj, noun, verb)
        [
            1,                    // GEPT level (int*)
            43,                   //  level (6*)
            3                     // status** (here: in both lists)
        ],
        ""                        // notes (always empty with this list)
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
    GZ6K = 4
    OFFLIST = -1
    # AWL_OR_GEPT = 4 ## overlaps all others!


class C(Enum):
    LEMMA = 0
    POS = 1
    LEVEL = 2
    NOTES = 3

SEP = '"'

def save_list_to_javascript(list, out_filename, top="", tail=""):
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
    """
    if item found in pos_lookup, returns the curated alternative
    else return the item stripped of spaces/periods
    """
    if pos:
        pos = pos.replace(".", "")
        pos = re.sub(r"[()/,]", " ", pos)
        pos = re.sub(r"\s{2,}", " ", pos).strip()
        return "".join([pos_lookup.get(item, item) for item in pos.split(" ")])


def normalize_cols(list):
    ur_lemma = 0
    ur_pos = 1
    ur_level = 2

    normalized = []
    list.pop(0) ## Remove header line
    for entry in list:
        entry = [el.strip() for el in entry]
        normalized_entry = [
            # entry[ur_lemma].strip(),
            # minimize_pos(entry[ur_pos].strip()),
            # [Pos.OFFLIST.value, entry[ur_level], Pos.GZ6K.value],
            entry[ur_lemma],
            minimize_pos(entry[ur_pos]),
            [Pos.OFFLIST.value, int(entry[ur_level]), Pos.GZ6K.value],
            "",
        ]
        normalized.append(normalized_entry)
    return normalized


def add_header(list):
    list.insert(0,
        ["", "", [0, Pos.OFFLIST.value, Pos.GZ6K.value], ["dummy entry: 0 easily confused with undefined","",""]],
    )
    return list


def main():
    raw_gz6k_file = "gz6k.tsv"
    gz6k_js_file = "dbGZ6K.js"
    gz6k_json_file = "dbGZ6K.json"

    raw_list = return_separated_file_as_list(raw_gz6k_file)
    formatted_list = normalize_cols(raw_list)
    formatted_list = add_header(formatted_list)
    assert len(formatted_list) == 6171 ## according to the spreadsheet (minus headers line)
    save_list_to_javascript(formatted_list, gz6k_json_file)
    save_list_to_javascript(formatted_list, gz6k_js_file, "function makeGZ6Kdb() {\n return", "\n;}")
    # pprint(gept_list)
    print(f"raw wordlist contains {len(raw_list)} entries")
    print(f"formatted wordlist contains {len(formatted_list)} entries")


if __name__ == "__main__":
    main()
