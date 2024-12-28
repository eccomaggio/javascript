"""
Builds minimal lists for: ref2k & gz6k from:
published lists.
The published ref2k does not include PoS information, so this is extracted from the GEPT list
the gz6k list is checked against the partial version in the GEPT list
"""

import csv
import json
import os
import sys
import re
import string
from enum import Enum
from pprint import pprint
from collections import Counter
# import copy
import ast
import pandas as pd


pos_long_to_short_lookup = {
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
    "num": "m",
    "adv": "b",
    "prep": "p",
    "pron": "r",
    "int": "t",
    "inf": "f",
    "--": "n",  # titles are listed as 'noun' in main GEPT wordlist
    "n": "n",
    "v": "v",
    # "a": "a",
    # "d": "d",
    # "x": "x",
    # "j": "j",
    # "c": "c",
    # "i": "i",
    # "m": "m",
    # "b": "b",
    # "p": "p",
    # "r": "r",
    # "t": "t",
    # "f": "f",
    # "flexion": "",
    # "Vpp": "",
    # "DEL": "",
    # "Ving": "",
}


pov_short_to_long_lookup = {
  'n': ['n', 'noun'],
  'v': ['v', 'verb'],
  'a': ['art', 'article'],
  'd': ['det', 'determiner'],
  'x': ['aux', 'auxilliary'],
  'j': ['adj', 'adjective'],
  'c': ['conj', 'conjunction'],
  'i': ['int', 'interjection'],
  'm': ['num', 'number'],
  'b': ['adv', 'adverb'],
  'p': ['prep', 'preposition'],
  'r': ['pron', 'pronoun'],
  # 't': 'title',
  '--': ['n', 'noun'], # titles are listed as 'noun' in main GEPT wordlist
  }

level_names = {
  "gept": [
    "elementary",
    "intermediate",
    "high-intermediate",
    ],
"kids": [
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
    ],
    "awl": [
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
]}

# AWL_INDEX = 37


# class Pos(Enum):
#     N = "noun"
#     V = "verb"
#     ADJ = "adj"
#     ADV = "adv"
#     S = "flexion"
#     H = "headword"
#     VPP = "Vpp"
#     VING = "Ving"
#     UK = "UK"
#     DEL = "DEL"
#     AWL_ONLY = 1
#     GEPT_ONLY = 2
#     AWL_AND_GEPT = 3
#     OFFLIST = -1


# LEMMA = 0
# POS = 1
# LEVEL = 2
# NOTES = 3
# TO_DELETE = 4

# GEPT_LEVEL = 0
# AWL_LEVEL = 1
# STATUS = 2

# SEP = '"'
# shared_words = {}


def minimize_pos(pos_raw):
    if pos_raw:
        pos = pos_raw.replace(".", "")
        pos = re.sub(r"[()/,]", " ", pos)
        pos = re.sub(r"\s{2,}", " ", pos).strip()
        pos_array = pos.split(" ")
        parsed = [pos_long_to_short_lookup.get(item,"!") for item in pos_array]
        short_form = "".join(parsed).strip()
        return short_form


def get_normalized_list(filename, header=True):
    # comment_markers = "*/#"
    print(f">> getting list from: {filename}")
    wip_list = get_list_from_json(filename) if filename.endswith(".json") else get_list_from_tsv(filename)
    if header:
        wip_list = wip_list[1:]
    wip_list = parse_lists_and_ints(wip_list)
    # pprint(wip_list)
    # quit()
    # wip_list = [line for line in wip_list if weed_out_blanks_and_comments(line)]
    wip_list = weed_out_blanks_and_comments(wip_list)
    # pprint(wip_list)
    normalized = normalize_pos(wip_list)
    # normalized = [[line[0].lower(), *line[1:]] for line in normalized]
    normalized = [[lemma.lower(), *rest] for (lemma, *rest) in normalized]
    return normalized


def weed_out_blanks_and_comments(wip_list):
    return [line for line in wip_list if is_blank_or_comment(line)]


def is_blank_or_comment(line):
    comment_markers = "*/#"
    if not line or not line[0]:
        return False
    if line[0][0] in comment_markers:
        return False
    if isinstance(line[0], list) and line[0][0][0] in comment_markers:
        return False
    return True

def has_pos(field_count):
    return field_count > 2


def normalize_pos(wip_list):
    normalized = []
    field_count = len(wip_list[1])
    if has_pos(field_count):
        is_long_pos = is_long_form_pos(wip_list)
        for line in wip_list:
            lemma, pos, *rest = line
            if is_long_pos:
                pos = minimize_pos(pos)
                if not pos or "!" in pos:
                    print(">>> unidentified PoS:", pos, line)
            pos = alphabetize_pos(pos)
            new_line = [lemma, pos, *rest]
            normalized.append(new_line)
    else:
        print("no PoS available")
    normalized = normalized if normalized else wip_list
    return normalized


def alphabetize_pos(pos):
    if isinstance(pos, list):
        pos = pos[0]
    if pos:
        return "".join(sorted(list(pos)))
    else:
        return ""


def is_long_form_pos(wip_list):
    pos_is_long_form = False
    pos_is_long_form = True if "adj" in " ".join([line[1] for line in wip_list]) else False
    print("Pos is in long form?", pos_is_long_form)
    return pos_is_long_form


def print_sample(lists):
    print(f"\nThere are {len(lists)} lists.")
    for entry in lists:
        name, current_list = entry
        print(f"{name} has {len(current_list)} entries and {len(current_list[0])} fields:")
        for i in range(0,10):
            print(f"{pad(i + 1)}: {current_list[i]}")
        index_of_final_entry = len(current_list) - 1
        print(f"{pad("...")}\n{pad(index_of_final_entry + 1)}: {current_list[index_of_final_entry]}\n")


def pad(text, spaces=4, dir="r"):
    text = str(text)
    result = text.rjust(spaces) if dir == "r" else text.ljust(spaces)
    # result = text.ljust(spaces) if dir == "left" else text.rjust(spaces)
    return result


def compare_two_lists(list1, list2, name1, name2):
    if len(list1) >= len(list2):
        list_a, name_a = (list1, name1)
        list_b, name_b = (list2, name2)
    else:
        list_a, name_a = (list2, name2)
        list_b, name_b = (list1, name1)
    lemmas_a = [entry[0] for entry in list_a]
    lemmas_b = [entry[0] for entry in list_b]
    dupes_a = count_duplicates(lemmas_a)
    dupes_b = count_duplicates(lemmas_b)
    print(f"dupes: {name_a} ({len(dupes_a)}) {dupes_a}")
    print(f"dupes: {name_b} ({len(dupes_b)}) {dupes_b}")
    print(f"<{name_a}> has {len(list_a)} entries with {len(dupes_a)} duplicates; ", end="")
    print(f"<{name_b}> has {len(list_b)} entries with {len(dupes_b)} duplicates. ", end="")
    print(f"Difference = {len(list_a) - len(list_b)}.")

    missing_from_a = [entry for entry in list_b if entry[0] not in lemmas_a]
    missing_from_b = [entry for entry in list_a if entry[0] not in lemmas_b]
    shared = [entry for entry in list_a if entry[0] in lemmas_b]
    print(f"Entries in <{name_b}> but not in <{name_a}> ({len(missing_from_a)} entries):")
    pprint(missing_from_a[:10])
    print(f"Entries in <{name_a}> but not in <{name_b}> ({len(missing_from_b)} entries):")
    pprint(missing_from_b[:10])
    # pprint(missing_from_b)
    print(f"Entries in both <{name_a}> and <{name_b}> ({len(shared)} entries):")
    pprint(shared[:10])


def count_duplicates(list):
    counter = Counter(list)
    return {key: value for key, value in counter.items() if value > 1}


def expand_ref2k_using_gept(ref2k, gept):
    """
    dupe_check adds a stringified version of the entry to weed out entries
    (like 'break') which distinguished lemmas with same PoS but different glosses.
    the ref2k list does not distinguish these
    """
    hand_coded_expansions = get_list_from_json("ref2k_hand_coded_expansions.json")
    hand_coded_expansions = [[entry[0].lower(), alphabetize_pos(entry[1]), entry[2]] for entry in hand_coded_expansions]
    # print(hand_coded_expansions)
    result = []
    dupe_check = []
    missing_from_gept = []
    for entry_2k in ref2k:
        lemma, levels = entry_2k
        match_found = False
        for entry_gept in gept:
            lemma_gept, pos_gept, levels_gept, *rest = entry_gept
            if lemma.lower() == lemma_gept.lower():
                # print(f"{lemma} = {lemma_gept}")
                match_found = True
                expanded = [lemma, pos_gept, levels]
                if (checksum := "".join(str(expanded))) not in dupe_check:
                    result.append(expanded)
                dupe_check.append(checksum)
        if not match_found:
            if (expanded := get_entries_by_lemma(lemma, hand_coded_expansions)):
                result.extend(expanded)
                # print("!!!", expanded)
            else:
                missing = [lemma, "!", entry_2k[1]]
                result.append(missing)
                missing_from_gept.append(missing)
    # save_list_as_json(missing_from_gept, "missing_from_gept.tmp.json")
    return result


def get_entries_by_lemma(lemma, list):
    lemma = lemma.lower()
    matched_entries = []
    for entry in list:
        if entry[0].lower() == lemma:
            matched_entries.append(entry)
    return matched_entries


def pad_out_tsv(list, count):
    """
    This is necessary as VS Code deletes trailing spaces, including tabs!
    """
    revised_list = []
    for entry in list:
        if current_count := len(entry) < count:
            for entry in list:
                for _ in range(count - current_count):
                    entry.append([])
        revised_list.append(entry)
    return revised_list



###########################################################################

def get_list_from_json(json_filename):
    with open(os.path.join(os.getcwd(), json_filename), "r") as f:
        result = json.load(f)
        return result


def get_list_from_tsv(file, sep="\t"):
    with open(file, mode="r") as f:
        reader = list(csv.reader(f, delimiter=sep))
    return reader


def save_list_as_json(list, out_filename, top="", tail=""):
    with open(os.path.join(os.getcwd(), out_filename), "w") as out_file:
        if top:
            out_file.write(top)
        json.dump(list, out_file, indent=None)
        if tail:
            out_file.write(tail)


def save_list_as_tsv(list, out_filename):
    with open(os.path.join(os.getcwd(), out_filename), "w") as out_file:
        tsv_writer = csv.writer(out_file, delimiter="\t", lineterminator="\n")
        tsv_writer.writerows(list)

def parse_lists_and_ints(wip_list):
    tmp = []
    for i, row in enumerate(wip_list):
        if row:
            # print(f"row {i}: ({len(row)} entries)")
            new_row = []
            for j, field in enumerate(row):
                try:
                    field = ast.literal_eval(field)
                    # print(f"\tfield {j}: {field}")
                except (ValueError, SyntaxError) as e:
                    # print(f"\tfield {j} has a problem: type = {field} ({type(field)} - {type(e)}) ")
                    pass
                new_row.append(field)
            tmp.append(new_row)
    return tmp


# PROCESSING FROM RAW ###########################################################################

def process_from_raw():
    # files = os.listdir('.')
    awl_full_tsv = "../AWL/awl_full.tsv"    ## fully processed awl, with shared entries
    gept_json_file = "../GEPT/dbGEPT.json"      ## original GEPT wordlist
    kids_json_file = "../Kids/dbKids.json"

    gz6k_1_tsv = "111學年度起適用.A-Z.tsv"
    gz6k_2_tsv = "../gaozhong6k/gz6k.tsv"
    combo_2k_tsv = "2000_combo.tsv"
    comp_file = "(2024更新版)GEPT各級.國高中字表對照-中高級.tsv"


    #### Load wordlists
    awl = get_normalized_list(awl_full_tsv)
    gept = get_normalized_list(gept_json_file)
    kids = get_normalized_list(kids_json_file)
    gz6k = get_normalized_list(gz6k_1_tsv)
    # gz6k_raw_2 = get_normalized_list(gz6k_2_tsv)
    ref2k = get_normalized_list(combo_2k_tsv)
    comp_gept = get_normalized_list(comp_file)

    comp_gept = pad_out_tsv(comp_gept,6)

    # print_sample({
    #     "gept": gept,
    #     "awl": awl,
    #     "kids": kids,
    #     "gz6k": gz6k,
    #     "ref2k": ref2k,
    #     "comp": comp_gept,
    #     })

    # print_sample(lists)

    ref2k_from_gept = [[*entry[0:3], entry[6]] for entry in comp_gept if entry[6]]
    gz6k_from_gept = [[*entry[0:3], entry[7]] for entry in comp_gept if entry[7]]

    # print_sample({"ref2k_from_gept" : ref2k_from_gept, "gz6k_from_gept" : gz6k_from_gept})
    # compare_two_lists(ref2k_raw, ref2k_from_gept, "ref2k", "ref2k from GEPT")
    # ref2k_expanded = expand_ref2k_raw_using_gept(ref2k, comp_gept)
    # print(f"\nref2k_expanded ({len(ref2k_expanded)} entries)")
    # print(ref2k_expanded)
    # save_list_as_json(ref2k_expanded,"ref2k_expanded.json")

    ref2k = expand_ref2k_using_gept(ref2k, comp_gept)
    # pos_check2 = [entry for entry in ref2k if "!" in entry[1]]

    # compare_two_lists(gz6k_raw_1, gz6k_from_gept, "gz6k_1", "gz6k from GEPT")
    # compare_two_lists(gz6k_raw_1, gz6k_raw_2, "gz6k_1", "gz6k_2")

    # for entry in awl:
    #     print([entry[0], entry[1], entry[2]])

    awl = [[entry[0], entry[1], entry[2][1], entry[3][2]] for entry in awl]
    # awl = [[entry[0], entry[1], entry[2][1], entry[3]] for entry in awl]
    # awl = [entry for entry in awl]
    gept = [[entry[0], entry[1], entry[2][0], entry[3]] for entry in gept]
    kids = [[entry[0], entry[1], entry[2][0], entry[3]] for entry in kids]

    gept = sorted(gept)
    kids = sorted(kids)
    awl = sorted(awl)
    gz6k = sorted(gz6k)
    ref2k = sorted(ref2k)

    save_list_as_tsv(gept, "../masterWordlists/gept.tsv")
    save_list_as_tsv(kids, "../masterWordlists/kids.tsv")
    save_list_as_tsv(awl, "../masterWordlists/awl.tsv")
    save_list_as_tsv(gz6k, "../masterWordlists/gz6k.tsv")
    save_list_as_tsv(ref2k, "../masterWordlists/ref2k.tsv")

    # return {
    #     "gept": gept,
    #     "awl": awl,
    #     "kids": kids,
    #     "gz6k": gz6k,
    #     "ref2k": ref2k,
    #     # "comp": comp_gept,
    #     }

    return [
        ["gept", gept],
        ["awl", awl],
        ["kids", kids],
        ["gz6k", gz6k],
        ["ref2k", ref2k],
        # ["comp", comp_gept],
        ]


def load_lists_from_master_tsvs():
    return [
        ["gept", get_list_from_tsv("../masterWordlists/gept.tsv")],
        ["awl", get_list_from_tsv("../masterWordlists/awl.tsv")],
        ["kids", get_list_from_tsv("../masterWordlists/kids.tsv")],
        ["gz6k", get_list_from_tsv("../masterWordlists/gz6k.tsv")],
        ["ref2k", get_list_from_tsv("../masterWordlists/ref2k.tsv")],
        # ["comp",],
        ]


def compile_master_list(word_lists):
    master_list_as_dict = {}
    for i, (name, list) in enumerate(word_lists):
        for entry in list:
            lemma, pos, level = entry[:3]
            notes = entry[3] if (len(entry) == 4) else ""
            headword = make_unique_headword(entry)
            levels = [[] for _ in range(len(word_lists))]
            master_list_as_dict[headword] =[lemma, pos, levels, notes]
    master_list_as_dict = add_levels_to_master_by_list(word_lists, master_list_as_dict)
    return sorted(master_list_as_dict.values())



def add_levels_to_master_by_list(word_lists, master_list_as_dict):
    for i, (name, list) in enumerate(word_lists):
        for entry in list:
            if master_list_as_dict.get(headword := make_unique_headword(entry)):
                master_list_as_dict[headword][2][i] = [entry[2]]
    return master_list_as_dict


def make_unique_headword(entry):
    lemma, pos, *_ = entry
    return f"{lemma}_{pos}"








###########################################################################

if __name__ == "__main__":
    # word_lists = process_from_raw()
    word_lists = load_lists_from_master_tsvs()
    print_sample(word_lists)

    master_list = compile_master_list(word_lists)
    save_list_as_tsv(master_list, "master_list.tsv")
    print(f"The master list has {len(master_list)} entries.")


