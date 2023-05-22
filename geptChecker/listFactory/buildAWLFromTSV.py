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
import sys
import re
import string
from enum import Enum
from pprint import pprint


pov_lookup = {
  'noun': 'n',
  'verb': 'v',
  'art': 'a',
  'det': 'd',
  'determiner': 'd',
  'aux': 'x',
  'adj': 'j',
  'conj': 'c',
  'interj': 'i',
  'number': 'm',
  'adv': 'b',
  'prep': 'p',
  'pron': 'r',
  'int': 't',
  'inf': 'f',
  # '--': 'title',
  '--': 'n', # titles are listed as 'noun' in main GEPT wordlist
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
  AWL_ONLY = 1
  GEPT_ONLY = 2
  AWL_AND_GEPT = 3
  # AWL_OR_GEPT = 4 ## overlaps all others!

LEMMA = 0
POS = 1
LEVEL = 2
NOTES = 3

SEP = "\""
NOTES_SEP = "|"
# ALPHA = "[a-zA-Z]"
shared_words = {}


def create_awl_from_tsv(tsv_filename):
  awl_list = []
  headword_corrections = {
      "utilise": "utilize",
      "maximise": "maximize",
      "minimise": "minimize",
      "licence": "license",
      "labour": "labor",
      "criteria": "criterion"
  }
  # with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file, open(os.path.join(os.getcwd(),"out.json"),"w") as out_file:
  with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file:
    tsv_reader = csv.reader(tsv_file, delimiter="\t")
    for row in tsv_reader:
      if row:
        headword = row[0]
        level = int(row[1])
        entries = [headword]
        try:
          headword = headword_corrections[headword]
        except KeyError:
          pass
        try:
          entries += row[2].split(",")
        except IndexError:
          pass
        for (i, entry) in enumerate(entries):
          notes = []
          awl_info = f"{NOTES_SEP}{headword}"
          notes += [awl_info]
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

          awl_list += [[display.strip()," ".join(pos),[gept_level,37 + level, Pos.AWL_ONLY.value], " ".join(notes)]]

    return awl_list



def create_awl_list(awl_json, awl_tsv):
  """
  If pre-complied json file exists, it reads that
  otherwise create the list
  """
  awl_list = []
  # full_path = os.path.join(os.getcwd(),awl_json)
  # if os.path.isfile(full_path):
  #   print("Grabbing AWL list from JSON...")
  #   awl_list = get_list_from_json(awl_json)
  # else:
  #   print("Creating AWL list from CSV...")
  #   awl_list = create_awl_from_tsv(awl_tsv)
  awl_list = create_awl_from_tsv(awl_tsv)
  save_list(awl_list, awl_json)
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
      if gept_line[LEMMA] == awl_line[LEMMA] and Pos.DEL.value not in awl_line[POS].split(" "):
        """
        LOGIC: if entry in both lists, update GEPT, delete AWL
        (because GEPT list is used as a stand alone; AWL only in combination with GEPT)
        """
        gept_line[POS] = awl_line[POS]
        gept_line[LEVEL] = [gept_line[LEVEL][0],awl_line[LEVEL][1],Pos.AWL_AND_GEPT.value]
        gept_line[NOTES] += awl_line[NOTES]
        awl_line[POS] += " " + Pos.DEL.value
        count += 1
        shared_words[gept_line[LEMMA]] = 1
  print(f"There are {count} GEPT words in the AWL wordlist.")
  for gept_line in gept_list:
    # if NOTES_SEP not in gept_line[NOTES]:
    if len(gept_line[LEVEL]) == 1:
      # gept_line[NOTES] += f"{NOTES_SEP}- {Pos.GEPT_ONLY.value}"
      gept_line[NOTES] += f"{NOTES_SEP}"
      gept_line[LEVEL] = [gept_line[LEVEL][0],-1,Pos.GEPT_ONLY.value]
  return (awl_list, gept_list)



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
  """
  AWL list & corrected list should same number of entries.
  The corrected list is automatically compiled but manually corrected.
  This routine implements the manual corrections
  """
  # awl_pos_corrections = [[line[LEMMA], line[POS]] for line in awl_list]
  # save_list(awl_pos_corrections,pos_corrections_filename)
  awl_pos_corrections = get_list_from_json(pos_corrections_filename)

  # print("compare master with corrections:",len(awl_list), len(awl_pos_corrections))
  # print("before:", list[6])

  """ to debug: for some reason, the automated process drops
{'conceptualisation', 'derivation', 'derivations', 'conceptualise', 'undefined', 'derive'}
from the corrections list
as the following 4 lines of test show:
  """
  # awl_set = set([el[0] for el in list])
  # corr_set = set([el[0] for el in awl_pos_corrections])
  # print("difference:",awl_set.difference(corr_set))
  # sys.exit()
  list_of_corrected_ids = []
  for (i,entry) in enumerate(list):
    tmp = [el for el in awl_pos_corrections if el[LEMMA] == entry[LEMMA]]
    # print("test:",entry, tmp)
    if not len(tmp):
      print(entry)
      continue
    # corrected_entry = awl_pos_corrections[i]
    corrected_entry = tmp[0]
    # if corrected_entry[LEMMA].find("estimat") != -1:
    #   print("compare: id=", i, entry[:2], corrected_entry, entry[POS] != corrected_entry[POS])
    if entry[POS] != corrected_entry[POS]:
      list_of_corrected_ids += [i]
      entry[POS] = corrected_entry[POS]
  # print("after:", list[6])
  # sys.exit()
  return (list, list_of_corrected_ids)


def create_additions_list(pos_corrections_filename, additions_filename):
  """
  Extract a list of all potential missing entries (as marked with @ during manual correction)
  Create a json list for manual adjustment.
  The entries in this file will then be added to the master AWL list.
  (Missing entries consist of:
  1) words which have Vpp/Ving/Vs but not infinitive.
  As the GEPT list infers inflections from infinitive, this version of the AWL
  replaces all inflected forms with a single infinitive form
  2) words which have UK spelling -ise, but do not consistently include US -ize spelling)

  """
  corrections = get_list_from_json(pos_corrections_filename)
  additions = []
  if os.path.exists(awl_additions_filename):
    additions = get_list_from_json(additions_filename)
  else:
    additions_raw = [entry[LEMMA] for entry in corrections if entry[POS].find("@") != -1]
    additions = [entry for entry in awl_list if entry[LEMMA] in additions_raw]
  # print("additions",additions)
  # print("to add:", additions_list)
  # save_list(additions, additions_filename)
  return additions


def minimize_pos(pos):
  if pos:
    pos = pos.replace(".","")
    pos = re.sub("[()/,]"," ", pos)
    pos = re.sub("\s{2,}", " ", pos).strip()
    # return " ".join([pov_lookup[item] for item in pos.split(" ")])
    return "".join([pov_lookup[item] for item in pos.split(" ")])


def get_list_from_json(json_filename):
  with open(os.path.join(os.getcwd(),json_filename), "r") as f:
    return json.load(f)



def save_list(list, out_filename, top="", tail=""):
  with open(os.path.join(os.getcwd(),out_filename), "w") as out_file:
    if top:
      out_file.write(top)
    json.dump(list,out_file, indent=None)
    if tail:
      out_file.write(tail)





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
  pos_corrections_filename = "awl_pos_corrections.json"
  awl_additions_filename = "awl_additions.json"
  new_gept_json = "dbGEPT.new.json"
  awl_for_gept_json = "dbAWL.new.json"
  new_gept_javascript = "dbGEPT.new.js"
  new_awl_javascript = "dbAWL.new.js"

  kids_json = "dbKids.json"
  new_kids_javascript = "dbKids.new.js"

  #### Load the two wordlists (if awl wordlist json does not exist, create it)
  awl_list = create_awl_list(awl_full_json, awl_tsv)
  gept_list = get_list_from_json(gept_json)

  #### Make (automated) manual corrections
  #### Manually adjust corrections list to implement corrects. "DEL" = delete this entry
  awl_list, corrected_ids = add_pos_corrections(awl_list, pos_corrections_filename)

  #### Add in mutual references between the two lists
  # awl_list = add_gept_level(awl_list,gept_list)
  awl_list, gept_json = add_gept_level(awl_list,gept_list)
  # save_list(awl_list, awl_full_json)
  # gept_list = deal_with_duplicates(gept_list, awl_list)

  #### Check for internal consistency (expand this) & generate stats
  # print("shared words:",len(shared_words))
  # homonyms_in_gept = get_homonyms(gept_list)
  # print("homonyms in gept:", len(homonyms_in_gept))

  #### Make additions list if necessary
  # make it so that it just loads the file if additions.json already exists.
  infinitives_to_add = create_additions_list(pos_corrections_filename,awl_additions_filename)

  awl_raw_count = len(awl_list)
  print(f"AWL list total: {awl_raw_count}; Corrected entries:")
  # for i in corrected_ids:
  #   print(f"@{awl_list[i]}")
  awl_list = [entry for entry in awl_list if Pos.DEL.value not in entry[POS].split(" ")]
  awl_list = awl_list + infinitives_to_add
  awl_final_count = len(awl_list)
  print(f"Total AWL list entries after thinning: {awl_final_count} ({awl_final_count - awl_raw_count} entries removed from total of {awl_final_count + awl_raw_count})")

  #### Turn POS list into short format
  # print("!!!!!",minimize_pos("adj./adv./prep./noun"))
  gept_list = [[el[LEMMA], minimize_pos(el[POS]), el[LEVEL], el[NOTES]] for el in gept_list]
  awl_list = [[el[LEMMA], minimize_pos(el[POS]), el[LEVEL], el[NOTES]] for el in awl_list]

  # print(gept_list)
  # sys.exit("bye bye")

  #### Output final awl list & updated GEPT list
  save_list(gept_list, new_gept_json)
  # save_list(sorted(awl_list, key=lambda entry: entry[0]), awl_for_gept_json)
  save_list(awl_list, awl_for_gept_json)



  #### Output lists as javascript files
  save_list(gept_list, new_gept_javascript,"function makeGEPTdb() {\n return","\n;}")
  save_list(awl_list, new_awl_javascript,"function makeAWLdb() {\n return","\n;}")

  kids_list = get_list_from_json(kids_json)
  kids_list = [[el[LEMMA], minimize_pos(el[POS]), el[LEVEL], el[NOTES]] for el in kids_list]
  save_list(kids_list, new_kids_javascript,"function makeKIDSdb() {\n return","\n;}")