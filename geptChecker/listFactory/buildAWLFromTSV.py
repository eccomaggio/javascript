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
  N = "noun "
  V = "verb "
  ADJ = "adj "
  ADV = "adv "
  S = "flexion "
  H = "headword "
  VPP = "Vpp "
  VING = "Ving "

LEMMA = 0
POS = 1
LEVEL = 2
NOTES = 3

SEP = "\""
# ALPHA = "[a-zA-Z]"


def create_awl_from_tsv(tsv_filename):
  awl_list = []
  # with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file, open(os.path.join(os.getcwd(),"out.json"),"w") as out_file:
  with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file:
    tsv_reader = csv.reader(tsv_file, delimiter="\t")
    for row in tsv_reader:
      if row:
        entries = [row[0]]
        level = int(row[1])
        # print(f'["{headword}","",[{level}],"headword"]')
        try:
          entries += row[2].split(",")
        except IndexError:
          pass
        for (i, entry) in enumerate(entries):
          notes = f"AWL-{level} "
          if i == 0:
            notes += "headword "
          gept_level = 1 if level <= 5 else 2
          pos = ""
          display = entry
          if entry.endswith("s"):
            notes += "flexion "
            entry = entry[:-1]
          if re.search("is[eia]", entry):
            notes += "UK "
          if entry.endswith("ing"):
            pos += Pos.VING.value
          elif entry.endswith("ed"):
            pos += Pos.VPP.value
          elif entry.endswith("ly"):
            pos += Pos.ADV.value
          elif entry.endswith("ble"):
            pos += Pos.ADJ.value
          elif entry.endswith("al"):
            pos += Pos.ADJ.value
          elif entry.endswith("ic"):
            pos += Pos.ADJ.value
          elif entry.endswith("ion"):
            pos += Pos.N.value
          elif entry.endswith("ty"):
            pos += Pos.N.value
          elif entry.endswith("ment"):
            pos += Pos.N.value
          elif entry.endswith("ize"):
            pos += Pos.V.value
          elif entry.endswith("ise"):
            pos += Pos.V.value

          # print(f'["{display.strip()}","",[{level}],"{notes.strip()}"]')
          # AWL_list += [[display.strip(),pos.strip(),[GEPTlevel,level],notes.strip()]]
        awl_list += [[display.strip(),pos.strip(),[gept_level,37 + level],notes.strip()]]
    return awl_list



def create_awl_list(awl_json, awl_tsv):
  awl_list = []
  full_path = os.path.join(os.getcwd(),awl_json)
  # if os.path.isfile(os.path.join(os.getcwd(),awl_all_filename)):
  if os.path.isfile(full_path):
    print("Grabbing AWL list from JSON...")
    # with open(os.path.join(os.getcwd(), awl_all_filename), "r") as awl_file:
    # with open(full_path) as awl_file:
    #   awl_list = json.load(awl_file)
      # awl_list = json.load(awl_file)
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
  count = 0
  for (i, entry) in enumerate(awl_list):
    for line in gept_list:
      if line[LEMMA] == entry[LEMMA]:
        count += 1
        # print(count, line[2], entry)
        # entry[LEVEL] = line[LEVEL]
        entry[LEVEL][0] = line[LEVEL][0]
        entry[NOTES] += " gept"
        break
  print(f"There are {count} GEPT words in the AWL wordlist")
  return awl_list



def update_gept_list(gept_list, awl_list):
  """
  Update GEPT list to show AWL sublist number if entry also in AWL
  """
  for gept_line in gept_list:
    for awl_line in awl_list:
      if gept_line[LEMMA] == awl_line[LEMMA]:
        gept_line[LEVEL] += [awl_line[LEVEL][1]]
        # gept_line[NOTES] += f" (AWL-{awl_line[LEVEL][1]-AWL_INDEX})"
      # gept_line[NOTES] = gept_line[NOTES].strip()
  return gept_list




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

  awl_list = create_awl_list(awl_full_json, awl_tsv)
  gept_list = get_list_from_json(gept_json)
  awl_list = add_gept_level(awl_list,gept_list)
  save_list(awl_list, awl_full_json)
  gept_list = update_gept_list(gept_list, awl_list)
  save_list(gept_list, new_gept_json)

