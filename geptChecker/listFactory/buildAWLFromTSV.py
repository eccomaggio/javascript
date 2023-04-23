"""
This takes in a csv file (based on the table at https://www.eapfoundation.com/vocab/academic/awllists/#:~:text=in%20the%20AWL.-,the%20academic%20word%20list,-Headword) which consists of three cols:
1) headword
2) sublist number
3) optional word family words

This script refactors it as a GEPTwordlistTool style list:
lemma, PoS space-sep string, [GEPT level number], notes

A note is made of the AWL-sublist number
whether it is a headword

Several time-saving guesses are made (which will need to be edited for a final list):
UK spelling
Part of speech:w

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
import re
import string
from enum import Enum
from pprint import pprint

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
  "AWL sublist 10"
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

LEMMA = 0
POS = 1
LEVEL = 2
NOTES = 3

SEP = "\""
# ALPHA = "[a-zA-Z]"
shared_words = {}


def create_awl_from_tsv(tsv_filename):
  awl_list = []
  # with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file, open(os.path.join(os.getcwd(),"out.json"),"w") as out_file:
  with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file:
    tsv_reader = csv.reader(tsv_file, delimiter="\t")
    for row in tsv_reader:
      if row:
        headword = row[0]
        level = int(row[1])
        entries = [headword]
        try:
          entries += row[2].split(",")
        except IndexError:
          pass
        for (i, entry) in enumerate(entries):
          notes = []
          # notes += [f"AWL_{level}"]
          notes += ["headword"] if i == 0 else [f"headword_{headword}"]
          gept_level = 1 if level <= 5 else 2
          pos = []
          display = entry
          if entry.endswith("s"):
            # notes += [Pos.S.value]
            pos += [Pos.S.value]
            pos += [Pos.DEL.value]
            entry = entry[:-1] ## Remove '-s' to reveal root
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
            pos += [Pos.DEL.value]
          elif entry.endswith("ble"):
            pos += [Pos.ADJ.value]
          elif entry.endswith("al"):
            pos += [Pos.ADJ.value]
          elif entry.endswith("ic"):
            pos += [Pos.ADJ.value]
          elif entry.endswith("ion"):
            pos += [Pos.N.value]
          elif entry.endswith("ty"):
            pos += [Pos.N.value]
          elif entry.endswith("ment"):
            pos += [Pos.N.value]
          elif entry.endswith("ize"):
            pos += [Pos.V.value]
          # elif entry.endswith("ise"):
          #   pos += [Pos.V.value]

          awl_list += [[display.strip()," ".join(pos),[gept_level,37 + level]," ".join(notes)]]

    return awl_list



def create_awl_list(awl_json, awl_tsv):
  awl_list = []
  full_path = os.path.join(os.getcwd(),awl_json)
  if os.path.isfile(full_path):
    print("Grabbing AWL list from JSON...")
    awl_list = get_list_from_json(awl_json)
  else:
    print("Creating AWL list from CSV...")
    awl_list = create_awl_from_tsv(awl_tsv)
  # pprint(AWL_list)
  print(f"AWL contains {len(awl_list)} entries")
  return awl_list



def add_gept_level(awl_list, gept_list):
  """
  Add GEPT level to AWL entry (if word in GEPT list)
  """
  global shared_words
  count = 0
  for awl_line in awl_list:
    for gept_line in gept_list:
      if gept_line[LEMMA] == awl_line[LEMMA]:
        awl_line[LEVEL][0] = gept_line[LEVEL][0]
        if "gept" not in awl_line[NOTES].split(" "):
          awl_line[NOTES] += " gept"
        count += 1
        shared_words[gept_line[LEMMA]] = 1
        break
  print(f"There are {count} GEPT words in the AWL wordlist.")
  return awl_list



def deal_with_duplicates(gept_list, awl_list):
  """
  Update GEPT list to show AWL sublist number if entry also in AWL
  Mark duplicate entry in AWL for deletion
  """
  global shared_words
  count = 0
  for gept_line in gept_list:
    for awl_line in awl_list:
      if gept_line[LEMMA] == awl_line[LEMMA]:
        gept_line[LEVEL] += [awl_line[LEVEL][1]]
        awl_line[POS] += " " + Pos.DEL.value
        count += 1
        shared_words[gept_line[LEMMA]] += 1
        # gept_line[NOTES] += f" (AWL-{awl_line[LEVEL][1]-AWL_INDEX})"
      # gept_line[NOTES] = gept_line[NOTES].strip()
  print(f"There are {count} AWL words in the GEPT wordlist.")
  return gept_list


def get_homonyms(list):
  lemmas = {}
  for el in list:
    lemmas[el[LEMMA]] = 0
  for el in list:
    lemmas[el[LEMMA]] += 1
  homonyms = [x for x in lemmas if lemmas[x] > 1]
  # check how many of these homonyms there are in the AWL (should = discrepancy 967-958 = 9)
  # print("count of homonyms in gept:", len(homonyms_in_gept))
  # print(f"Homonyms in GEPT list = {homonyms_in_gept}")
  return homonyms



def add_pos_corrections(list, pos_corrections_filename):
  # awl_pos_corrections = [[line[LEMMA], line[POS]] for line in awl_list]
  # save_list(awl_pos_corrections,pos_corrections_filename)
  awl_pos_corrections = get_list_from_json(pos_corrections_filename)
  # print("compare master with corrections:",len(awl_list), len(awl_pos_corrections))
  # print("before:", list[6])
  list_of_corrected_ids = []
  for (i,entry) in enumerate(list):
    if entry[POS] != awl_pos_corrections[i][POS]:
      list_of_corrected_ids += [i]
      entry[POS] = awl_pos_corrections[i][POS]
  # print("after:", list[6])
  return (list, list_of_corrected_ids)



def get_list_from_json(json_filename):
  with open(os.path.join(os.getcwd(),json_filename), "r") as f:
    return json.load(f)



def save_list(list, out_filename):
  with open(os.path.join(os.getcwd(),out_filename), "w") as out_file:
    json.dump(list,out_file, indent=None)





# print(f"There are {count} AWL words in the GEPT wordlist")

# print(gept_line)
# gept_awl_filename = "GEPTwithAWL.json"
# with open(os.path.join(os.getcwd(),gept_awl_filename), "w") as out_file:
#   json.dump(gept_list,out_file, indent=None)

if __name__ == "__main__":
  # files = os.listdir('.')
  awl_tsv = "AWLallwords.tsv"
  awl_full_json = "AWLlist.full.json"
  awl_gept_json = "AWLlist.gept.json"
  gept_json = "dbGEPT.json"
  new_gept_json = "dbGEPT.new.json"
  awl_for_gept_json = "dbAWL.new.json"
  pos_corrections_filename = "awl_pos_corrections.json"

  #### Load the two wordlists (if awl wordlist json does not exist, create it)
  awl_list = create_awl_list(awl_full_json, awl_tsv)
  gept_list = get_list_from_json(gept_json)

  #### Add in mutual references between the two lists
  awl_list = add_gept_level(awl_list,gept_list)
  # save_list(awl_list, awl_full_json)
  gept_list = deal_with_duplicates(gept_list, awl_list)

  #### Check for internal consistency (expand this) & generate stats
  print("shared words:",len(shared_words))
  homonyms_in_gept = get_homonyms(gept_list)
  print("homonyms in gept:", len(homonyms_in_gept))
  # print(homonyms_in_gept)

  #### Make (automated) manual corrections
  #### Manually adjust corrections list to implement corrects. "DEL" = delete this entry
  awl_list, corrected_ids = add_pos_corrections(awl_list, pos_corrections_filename)

  awl_raw_count = len(awl_list)
  print(f"AWL list total: {awl_raw_count}; Corrected entries:")
  for i in corrected_ids:
    print(f"*{awl_list[i]}")
  awl_list = [entry for entry in awl_list if Pos.DEL.value not in entry[POS].split(" ")]
  awl_final_count = len(awl_list)
  print(f"Total AWL list entries after thinning: {awl_final_count} ({awl_final_count - awl_raw_count} entries removed from total of {awl_final_count + awl_raw_count})")

  #### Output final awl list & updated GEPT list
  # save_list(gept_list, new_gept_json)
  save_list(awl_list, awl_for_gept_json)


