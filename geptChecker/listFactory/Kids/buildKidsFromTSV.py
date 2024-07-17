"""
This file needs updating. Currently only creates a clean .tsv file. Need also to create .JSON
"""


import csv
import json
import os
import re
import string
from pprint import pprint

cat_lookup = [
  'elementary',
  'intermediate',
  'high-intermediate',
  'Animals & insects (動物/昆蟲)',
  'Articles & determiners (冠詞/限定詞)',
  'Be & auxiliarie (be動詞/助動詞)',
  'Clothing & accessories (衣服/配件)',
  'Colors (顏色)',
  'Conjunctions (連接詞)',
  'Family (家庭)',
  'Food & drink (食物/飲料)',
  'Forms of address (稱謂)',
  'Geographical terms (地理名詞)',
  'Health (健康)',
  'Holidays & festivals',
  'Houses & apartments (房子/公寓)',
  'Interjections (感嘆詞)',
  'Money (金錢)',
  'Numbers (數字)',
  'Occupations (工作)',
  'Other adjectives (其他形容詞)',
  'Other adverbs (其他副詞)',
  'Other nouns (其他名詞)',
  'Other verbs (其他動詞)',
  'Parts of body (身體部位)',
  'People (人)',
  'Personal characteristics (個性/特點)',
  'Places & directions (地點/方位)',
  'Prepositions (介系詞)',
  'Pronouns (代名詞)',
  'School (學校)',
  'Sizes & measurements (尺寸/計量)',
  'Sports, interest & hobbies (運動/興趣/嗜好)' ,
  'Tableware (餐具)',
  'Time (時間)',
  'Transportation (運輸)',
  'Weather & nature (天氣/自然)',
  'Wh-words (疑問詞)'
  ]

# pos_lookup = {
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

pos_lookup = {
  'n': 'n',
  'v': 'v',
  'art': 'a',
  'det': 'd',
  'aux': 'x',
  'adj': 'j',
  'conj': 'c',
  'interj': 'i',
  'number': 'm',
  'adv': 'b',
  'prep': 'p',
  'pron': 'r',
  # '--': 'title',
  '--': 'n', # titles are listed as 'noun' in main GEPT wordlist
  }

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

def get_tsv_file():
  files = os.listdir('.')
  tsv_filename = ""
  for file in files:
    if file.endswith('.tsv'):
      tsv_filename = file
      break
  return tsv_filename

def streamline(list):
  tmp = []
  kids_heading_index_offset = 3
  for i, row in enumerate(list):
    if i == 0:
      continue
    lemma_raw = row[0]
    lemma = lemma_raw.split("/")
    # normalized_lemma = lemma[0].translate(str.maketrans('', '', string.punctuation))
    # normalized_lemma = normalized_lemma.replace(" ","")
    # if (normalized_lemma.isalpha() and normalized_lemma.isascii()):
      # tmpPov = row[2].replace(".","")
    pos = "".join([pos_lookup[el.strip().replace(".","")] for el in row[2].split("/")])
    # cat = cat_lookup.index(row[1]) + kids_heading_index_offset
    cat = cat_lookup.index(row[1])
    notes = row[3]
    # out_file.write(f"[{sep}{lemma[0]}{sep},{sep}{'/'.join(pos)}{sep},[{cat}], {sep}{notes}{sep}],\n")
    # entry = [lemma[0], pos, cat, notes]
    tmp.append([lemma[0], pos, [cat,-1,4], [notes,"",""]])
    try:
      tmp.append([lemma[1], pos, [cat,-1,4], [notes,"",""]])
    except Exception:
      pass
  return tmp




if __name__ == "__main__":
  tsv_filename = get_tsv_file()
  kids = return_separated_file_as_list(tsv_filename)
  kids = streamline(kids)
  pprint(kids)
  kids.insert(0,
      ["", "", [0, -1, 4], ["dummy entry: 0 easily confused with undefined","",""]],
  )
  save_list_as_json(kids, "dbKids.json")


# print(f"cats: {categories}")
# # print(f"POVs: {POVs}")

