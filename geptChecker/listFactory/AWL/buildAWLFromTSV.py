"""
This takes in a csv file (based on the table at https://www.eapfoundation.com/vocab/academic/awllists/#:~:text=in%20the%20AWL.-,the%20academic%20word%20list,-Headword) which consists of three cols:
1) headword
2) sublist number
3) optional word family words

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

follow this procedure:
create raw awl
add in corrections
add in correlations to gept
add in short pos forms
=> full awl
pull out entries shared with gept
=> final awl

"""

import csv
import json
import os
import sys
import re
import string
from enum import Enum
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


LEMMA = 0
POS = 1
LEVEL = 2
NOTES = 3

GEPT_LEVEL = 0
AWL_LEVEL = 1
STATUS = 2

SEP = '"'
# NOTES_SEP = "|"
# ALPHA = "[a-zA-Z]"
shared_words = {}


def create_awl_from_tsv(tsv_filename):
    awl_list = []
    ## Not required due to newly Americanized wordlist
    # headword_corrections = {
    #     "utilise": "utilize",
    #     "maximise": "maximize",
    #     "minimise": "minimize",
    #     "licence": "license",
    #     "labour": "labor",
    #     "criteria": "criterion",
    # }
    # with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file, open(os.path.join(os.getcwd(),"out.json"),"w") as out_file:
    with open(os.path.join(os.getcwd(), tsv_filename), "r") as tsv_file:
        tsv_reader = csv.reader(tsv_file, delimiter="\t")
        for row in tsv_reader:
            if row:
                headword = row[0]
                level = int(row[1])
                entries = [headword]
                # try:
                #     headword = headword_corrections[headword]
                # except KeyError:
                #     pass
                try:
                    entries += row[2].split(",")
                except IndexError:
                    pass
                for i, entry in enumerate(entries):
                    # notes = []
                    # awl_info = f"{NOTES_SEP}{headword}"
                    # notes += [awl_info]
                    # notes = ["", "", headword]
                    gept_level = 1 if level <= 5 else 2
                    pos = []
                    display = entry
                    if entry.endswith("s"):
                        # notes += [Pos.S.value]
                        pos += [Pos.S.value]
                        pos += [Pos.DEL.value]
                        entry = entry[:-1]  ## Remove '-s' to reveal root
                    if re.search("is[eia]", entry):
                        # notes += [Pos.UK.value]
                        pos += [Pos.UK.value]
                        pos += [Pos.DEL.value]
                    if entry.endswith("ing"):
                        pos += [Pos.VING.value]
                        pos += [Pos.DEL.value]
                    elif entry.endswith("ed"):
                        pos += [Pos.VPP.value]
                        pos += [Pos.DEL.value]
                    elif entry.endswith("ly"):
                        pos += [Pos.ADV.value]
                        ## GEPT often includes ADVs as lemmas
                        # pos += [Pos.DEL.value]

                    elif entry.endswith("ble"):
                        pos += [Pos.ADJ.value]
                    elif entry.endswith("ive"):
                        pos += [Pos.ADJ.value]
                    elif entry.endswith("al"):
                        pos += [Pos.ADJ.value]
                    elif entry.endswith("ic"):
                        pos += [Pos.ADJ.value]
                    elif entry.endswith("nt"):
                        pos += [Pos.ADJ.value]
                    elif entry.endswith("ful"):
                        pos += [Pos.ADJ.value]
                    elif entry.endswith("less"):
                        pos += [Pos.ADJ.value]

                    elif entry.endswith("ion"):
                        pos += [Pos.N.value]
                    elif entry.endswith("ism"):
                        pos += [Pos.N.value]
                    elif entry.endswith("ncy"):
                        pos += [Pos.N.value]
                    elif entry.endswith("ty"):
                        pos += [Pos.N.value]
                    elif entry.endswith("or"):
                        pos += [Pos.N.value]
                    elif entry.endswith("er"):
                        pos += [Pos.N.value]
                    elif entry.endswith("ment"):
                        pos += [Pos.N.value]
                    elif entry.endswith("ness"):
                        pos += [Pos.N.value]

                    elif entry.endswith("ize"):
                        pos += [Pos.V.value]
                    # elif entry.endswith("ise"):
                    #   pos += [Pos.V.value]

                    awl_list += [
                        [
                            display.strip(),
                            " ".join(pos),
                            [gept_level, 37 + level, Pos.AWL_ONLY.value],
                            # " ".join(notes),
                            ["", "", headword]
                        ]
                    ]

        return awl_list


# def create_awl_list(awl_json, awl_tsv):
#     """
#     If pre-complied json file exists, it reads that
#     otherwise create the list
#     """
#     # awl_list = []
#     # full_path = os.path.join(os.getcwd(),awl_json)
#     # if os.path.isfile(full_path):
#     #   print("Grabbing AWL list from JSON...")
#     #   awl_list = get_list_from_json(awl_json)
#     # else:
#     #   print("Creating AWL list from CSV...")
#     #   awl_list = create_awl_from_tsv(awl_tsv)
    # awl_list = create_awl_from_tsv(awl_tsv)
    # # save_list_as_json(awl_list, awl_json)
    # # pprint(AWL_list)
    # # print(f"AWL contains {len(awl_list)} entries")
    # return awl_list


def consolidate_with_gept(awl_list, gept_list):
    """
    Add GEPT level to AWL entry (if word in GEPT list)
    Add AWL level to GEPT (or -1 if offlist)
    Create 3-part LEVEL: [GEPT level, AWL level, status (i.e. which list lemma belongs to)] for both lists
    """
    print("**Consolidating the two lists...")
    global shared_words
    # count = 0
    tmp_shared_entries = []
    for awl_line in awl_list:
        for gept_line in gept_list:
            if gept_line[LEMMA] == awl_line[LEMMA]:
                # gept_line[POS] = awl_line[POS]
                combined_level = [
                    gept_line[LEVEL][0],
                    awl_line[LEVEL][1],
                    Pos.AWL_AND_GEPT.value,
                ]
                gept_line[LEVEL] = awl_line[LEVEL] = combined_level
                # combined_notes = gept_line[NOTES] + "; " + awl_line[NOTES]
                # gept_line[NOTES] = awl_line[NOTES] = combined_notes
                ## CHANGED to accommodate new note design: [chinese, notes, awl headword]
                combined_notes = [*gept_line[NOTES][:2], awl_line[NOTES][2]]
                gept_line[NOTES] = awl_line[NOTES] = combined_notes
                tmp_shared_entries.append(awl_line)
                shared_words[gept_line[LEMMA]] = 1
    print(f"\t{len(tmp_shared_entries)} entries are shared between AWL & GEPT.")
    tmp_shared_del = [e for e in tmp_shared_entries if Pos.DEL.value in e[POS]]
    tmp_shared = [e for e in tmp_shared_entries if Pos.DEL.value not in e[POS]]
    print(f"\t{len(tmp_shared_del)} of these are marked for deletion; leaving {len(tmp_shared)} entries shared.")
    for gept_line in gept_list:
        if len(gept_line[LEVEL]) == 1:
            # gept_line[NOTES] += f"{NOTES_SEP}"
            gept_line[LEVEL] = [gept_line[LEVEL][0], Pos.OFFLIST.value, Pos.GEPT_ONLY.value]
    return (awl_list, gept_list, tmp_shared)


# def add_pos_corrections(list, pos_corrections_filename):
def add_pos_corrections(list, pos_corrections_dict_file):
    """
    CURRENTLY IGNORES AWL LEVEL INFO IN NEW GEPT LIST; use as check??
    This routine implements the manual PoS corrections
    """
    print("**Adding PoS corrections...")
    # awl_pos_corrections = get_list_from_json(pos_corrections_filename)
    # corrections_dict = { entry[0] : entry[1] for entry in awl_pos_corrections}
    # save_list_as_json(corrections_dict, pos_corrections_dict_file)
    awl_pos_corrections_dict = get_list_from_json(pos_corrections_dict_file)
    list_of_corrected_ids = []
    print("\tlemmas missing from corrections list:")
    for i, entry in enumerate(list):
        replacement_pos = awl_pos_corrections_dict.get(entry[LEMMA])
        if replacement_pos:
            if entry[POS] != replacement_pos:
                list_of_corrected_ids += [i]
                entry[POS] = replacement_pos
        else:
            ## No correction found
            print([entry[0],entry[1]], ",")
    print(f"\t{len(list_of_corrected_ids)} corrections made. ")
    # return (list, list_of_corrected_ids)
    return (list)

def remove_deleted_entries(list):
    print("**Removing entries marked for deletion...")
    reduced_list = [
        entry for entry in list if Pos.DEL.value not in entry[POS].split(" ")
    ]
    return reduced_list

def remove_shared_entries_from_awl(awl_list):
    print("**Removing shared entries from AWL...")
    truncated = [entry for entry in awl_list if entry[LEVEL][STATUS] != Pos.AWL_AND_GEPT.value]
    tmp_shared = [entry for entry in awl_list if entry[LEVEL][STATUS] == Pos.AWL_AND_GEPT.value]
    print(f"\t{len(tmp_shared)} shared entries removed.")
    return (truncated, tmp_shared)

# def create_additions_list(pos_corrections_filename, additions_filename):
#     """
#     Extract a list of all potential missing entries (as marked with @ during manual correction)
#     Create a json list for manual adjustment.
#     The entries in this file will then be added to the master AWL list.
#     (Missing entries consist of:
#     1) words which have Vpp/Ving/Vs but not infinitive.
#     As the GEPT list infers inflections from infinitive, this version of the AWL
#     replaces all inflected forms with a single infinitive form
#     2) words which have UK spelling -ise, but do not consistently include US -ize spelling)

#     """
#     ## Now superceded as AWL list has been cleaned up & Americanized
#     corrections = get_list_from_json(pos_corrections_filename)
#     additions = []
#     if os.path.exists(awl_additions_filename):
#         additions = get_list_from_json(additions_filename)
#     else:
#         additions_raw = [
#             entry[LEMMA] for entry in corrections if entry[POS].find("@") != -1
#         ]
#         additions = [entry for entry in awl_list if entry[LEMMA] in additions_raw]
#     # print("additions",additions)
#     # print("to add:", additions_list)
#     # save_list(additions, additions_filename)
#     return additions


def minimize_pos(pos):
    if pos:
        # print(">>>>>", pos)
        pos = pos.replace(".", "")
        pos = re.sub(r"[()/,]", " ", pos)
        pos = re.sub(r"\s{2,}", " ", pos).strip()
        # return " ".join([pov_lookup[item] for item in pos.split(" ")])
        return "".join([pos_lookup[item] if pos_lookup.get(item) else item for item in pos.split(" ")])
        # return "".join([pov_lookup[item] for item in pos.split(" ")])


def get_list_from_json(json_filename):
    with open(os.path.join(os.getcwd(), json_filename), "r") as f:
        return json.load(f)


def save_list_as_json(list, out_filename, top="", tail=""):
    with open(os.path.join(os.getcwd(), out_filename), "w") as out_file:
        if top:
            out_file.write(top)
        json.dump(list, out_file, indent=None)
        if tail:
            out_file.write(tail)


def write_list_as_tsv(list, out_filename):
    with open(os.path.join(os.getcwd(), out_filename), "w") as out_file:
        tsv_writer = csv.writer(out_file, delimiter="\t", lineterminator="\n")
        tsv_writer.writerows(list)


# print(f"There are {count} AWL words in the GEPT wordlist")

# print(gept_line)
# gept_awl_filename = "GEPTwithAWL.json"
# with open(os.path.join(os.getcwd(),gept_awl_filename), "w") as out_file:
#   json.dump(gept_list,out_file, indent=None)

if __name__ == "__main__":
    # files = os.listdir('.')
    # awl_tsv_urfile = "AWLallwords.tsv"
    awl_tsv_urfile = "AWL_base_file.tsv"          ## original awl wordlist, by heading
    awl_raw_json_file = "AWL_raw.json"          ## rough expansion of this into wordlist format
    awl_full_json_file = "AWLlist.full.json"    ## fully processed awl, with shared entries
    # awl_gept_json_file = "AWLlist.gept.json"
    # gept_json_file = "../dbGEPT.json"
    gept_json_file = "../GEPT/dbGEPT.json"      ## original GEPT wordlist
    # pos_corrections_file = "awl_pos_corrections.json"
    pos_corrections_dict_file = "awl_pos_corrections_dict.json"
    # awl_additions_filename = "awl_additions.json"
    new_gept_json_file = "dbGEPT.new.json"      ## contains AWL correlations
    awl_for_gept_json_file = "dbAWL.new.json"   ## lacks entries shared with GEPT
    new_gept_js_file = "dbGEPT.new.js"          ## as above but for import into wordlist
    new_awl_js_file = "dbAWL.new.js"

    kids_json_file = "../Kids/dbKids.json"
    new_kids_js_file = "dbKids.new.js"

    #### Load the two wordlists (if awl wordlist json does not exist, create it)
    # awl_raw = create_awl_list(awl_full_json_file, awl_tsv_urfile)
    awl_raw = create_awl_from_tsv(awl_tsv_urfile)
    gept_list = get_list_from_json(gept_json_file)
    save_list_as_json(awl_raw, awl_raw_json_file)

    print(f"gept_list has {len(gept_list)} entries")
    print(f"awl_raw has {len(awl_raw)} entries")

    #### Make (automated) manual corrections
    #### Manually adjust corrections list to implement corrections. "DEL" = delete this entry
    #### Remove items marked to be deleted
    awl_corrected = add_pos_corrections(awl_raw, pos_corrections_dict_file)
    print(f"\tawl_corrected has {len(awl_corrected)} entries.")

    awl_consolidated, gept_json_file, tmp_shared_1 = consolidate_with_gept(awl_corrected, gept_list)
    print(f"\tawl_consolidated has {len(awl_consolidated)} entries")

    awl_slim = remove_deleted_entries(awl_consolidated)
    print(f"\tawl_slim has {len(awl_slim)} entries, with {len(awl_consolidated) - len(awl_slim)} entries removed.")

    awl_truncated, tmp_shared_2 = remove_shared_entries_from_awl(awl_slim)
    print(f"\tawl_truncated has {len(awl_truncated)} entries, with {len(tmp_shared_2)} shared with GEPT")
    print(f"Discrepancy between shared entries ({len(tmp_shared_1)} and {len(tmp_shared_2)}) arises from multiple entries for lemmas with different meanings in GEPT vs single lemma entries for AWL.")

    # disparity = set(tmp_shared_1) ^ (tmp_shared_2)
    # disparity = [e for e in tmp_shared_2 if (e not in tmp_shared_1)]
    # pprint(disparity)
    # disparity = zip(tmp_shared_1,tmp_shared_2)
    # for i, el in enumerate(disparity):
    #     print(i, el[0][0], ">>", el[1][0])

    #### Turn POS list into short format
    # print("!!!!!",minimize_pos("adj./adv./prep./noun"))
    gept_list_final = [
        [el[LEMMA], minimize_pos(el[POS]), el[LEVEL], el[NOTES]] for el in gept_list
    ]
    awl_list_final = [
        [el[LEMMA], minimize_pos(el[POS]), el[LEVEL], el[NOTES]] for el in awl_truncated
    ]
    print(f"awl_list_final has {len(awl_list_final)} entries")

    save_list_as_json(gept_list_final, new_gept_json_file)
    # save_list_as_json(awl_list_final, awl_for_gept_json_file)
    save_list_as_json(
        gept_list_final, new_gept_js_file, "function makeGEPTdb() {\n return", "\n;}"
    )
    save_list_as_json(awl_list_final, new_awl_js_file, "function makeAWLdb() {\n return", "\n;}")

    ## CURRENTLY no kids.json :S Need to rewrite buildKidsFromTSV.py to create this!
    kids_list = get_list_from_json(kids_json_file)
    kids_list = [
        [el[LEMMA], minimize_pos(el[POS]), el[LEVEL], el[NOTES]] for el in kids_list
    ]
    save_list_as_json(
        kids_list, new_kids_js_file, "function makeKIDSdb() {\n return", "\n;}"
    )

    # write_list_as_tsv(awl_list, "awl.tsv")
    awl_entries_in_GEPT = [entry for entry in gept_list_final if entry[LEVEL][STATUS] == Pos.AWL_AND_GEPT.value]
    # full_awl_list = awl_list + awl_entries_in_GEPT
    print("Total of GEPT list entries:", len(gept_list))
    print("Total of AWL list entries not in GEPT:", len(awl_list_final))
    print("Total of all AWL list entries:", len(awl_slim))
    # print(awl_entries_in_GEPT)
    # write_list_as_tsv(full_awl_list, "awl_full.tsv")
    write_list_as_tsv(awl_slim, "awl_full.tsv")
    write_list_as_tsv(gept_list, "gept.tsv")
    # write_list_as_tsv(kids_list, "kids.tsv")
