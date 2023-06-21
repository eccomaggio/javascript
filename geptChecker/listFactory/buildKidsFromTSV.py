import csv
import os
import re
import string

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

pov_lookup = {
  'n': 'noun',
  'v': 'verb',
  'art': 'art.',
  'det': 'determiner',
  'aux': 'aux.',
  'adj': 'adj.',
  'conj': 'conj.',
  'interj': 'interj.',
  'number': 'number',
  'adv': 'adv.',
  'prep': 'prep.',
  'pron': 'pron.',
  # '--': 'title',
  '--': 'noun', # titles are listed as 'noun' in main GEPT wordlist
  }

sep = "\""

files = os.listdir('.')
tsv_filename = ""
alpha = "[a-zA-Z]"
# print(files)
for file in files:
  if file.endswith('.tsv'):
    tsv_filename = file

with open(os.path.join(os.getcwd(),tsv_filename), "r") as tsv_file, open(os.path.join(os.getcwd(),"out.test"),"w") as out_file:
  tsv_reader = csv.reader(tsv_file, delimiter="\t")
  categories = list(dict.fromkeys([col[1] for col in tsv_reader if col[1] and re.match(alpha,col[1])]))
  tsv_file.seek(0)
  POVs = list(dict.fromkeys([col[2] for col in tsv_reader if col[2] and re.match(alpha, col[2])]))
  tsv_file.seek(0)
  """
  Tests here to:
  1) weed out chinese headings
  2) split alternate entries (in the form "coke/cola")
  3) ignore occasional inconsistencies (i.e. 'adv.' vs 'adv')
  """
  for row in tsv_reader:
    lemmaRaw = row[0]
    lemma = lemmaRaw.split("/")
    # normalizedLemma = lemma.replace("-","")
    normalizedLemma = lemma[0].translate(str.maketrans('', '', string.punctuation))
    normalizedLemma = normalizedLemma.replace(" ","")
    if (normalizedLemma.isalpha() and normalizedLemma.isascii()):
      tmpPov = row[2].replace(".","")
      pov = [pov_lookup[el.strip().replace(".","")] for el in row[2].split("/")]
      cat = cat_lookup.index(row[1])
      notes = row[3]
      # print(f"[{sep}{lemma}{sep},{sep}{'/'.join(pov)}{sep},[{cat}], {sep}{notes}{sep}],")
      out_file.write(f"[{sep}{lemma[0]}{sep},{sep}{'/'.join(pov)}{sep},[{cat}], {sep}{notes}{sep}],\n")
      try:
        lemma[1]
        out_file.write(f"[{sep}{lemma[1]}{sep},{sep}{'/'.join(pov)}{sep},[{cat}], {sep}{notes}{sep}],\n")
      except Exception:
        pass


print(f"cats: {categories}")
# print(f"POVs: {POVs}")

