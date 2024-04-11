"""
prints out a quick comparison of entries between the new and old GEPT lists

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
from itertools import zip_longest

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


# def save_list_as_json(list, out_filename, top="", tail=""):
#     with open(os.path.join(os.getcwd(), out_filename), "w") as out_file:
#         if top:
#             out_file.write(top)
#         json.dump(list, out_file, indent=None)
#         if tail:
#             out_file.write(tail)


# def return_separated_file_as_dict(file, sep="\t"):
#     with open(file, mode="r") as f:
#         reader = csv.reader(f, delimiter=sep)
#         tmp = {}
#         for uid, row in enumerate(reader):
#             tmp[uid] = row
#     return tmp


# def return_separated_file_as_list(file, sep="\t"):
#     with open(file, mode="r") as f:
#         reader = csv.reader(f, delimiter=sep)
#         tmp = []
#         for row in reader:
#             if row:
#                 tmp.append(row)
#     return tmp


def return_list_from_json_file(filename):
    with open(filename, "r") as file:
        data = json.load(file)
    return data


def main():
    new_list = return_list_from_json_file("./dbGEPT.json")
    new_lemmas = [entry[C.LEMMA.value] for entry in new_list]

    old_list = return_list_from_json_file("./PRIOR.dbGEPT.json")
    old_lemmas = [entry[C.LEMMA.value] for entry in old_list]

    not_in_new = [entry for entry in old_lemmas if entry not in new_lemmas]
    not_in_old = [entry for entry in new_lemmas if entry not in old_lemmas]


    print(f"{len(new_list)} entries in the new list")
    print(f"{len(old_list)} entries in the old list")
    print(f"The new list has {len(new_list) - len(old_list)} more entries than the old list.")
    print(f"\nEntries dropped from the new list ({len(not_in_new)}):")
    print(", ".join(not_in_new))
    print(f"\nEntries added to the new list ({len(not_in_old)}):")
    print(", ".join(not_in_old))

    # compared = list(zip_longest(not_in_new,not_in_old, fillvalue=""))
    # print("not in new","not in old")
    # pprint(compared)

    # print("In old but not in new:")
    # pprint(not_in_new)

    # print("In new but not in old:")
    # pprint(not_in_old)


if __name__ == "__main__":
    main()
