# !/usr/bin/python

"""
Purpose: Toggle an html file between using file-internal resources
and external files (applies to none-http(s) .js & .css files only)

Output:
1) in deconstruct mode, it outputs out.min.html with links to css&js AND independent css&js files
2) in assemble mode, it outputs a single, integrated file called out.htm
These html files can be further renamed as desired

Command line: toggleWordlistHTML.py <optional filename> (defaults to wordlistCheck.html)

Logic:
open geptchecker
read through each line
ignore anything commented out (in html / css / javascript) EXCEPT:

create files if encounter:
<script blah title="blah.js"></script>
—> <script blah src="blah.js"></script>

<style blah title="blah.css"></style>
—> <link href="blah.css" rel="stylesheet" />

OR if finds above links to external files,
open filename & replace link with contents into tags

DONE: implement splitting into separate files
DONE: why doesn't set_mode see links in the header??
DONE: implement importing files

"""
import sys
import os.path
import re
# from tkinter import W

isSplitMode = True
isInComment = False
isInStyle = False
isInScript = False
current_external_file = None
buffer = ""

rx = {
"opener_style" : re.compile('(^.*?)<style\s+[^>]*data-title="(.+?)"') ,
"close_style" :  re.compile('(^.*?)</style>'),
"opener_script" : re.compile('(^.*?)<script\s+[^>]*data-title="(.+?)"'),
"close_script" : re.compile('(^.*?)</script>'),
"html_open_comment" : re.compile('(^.*?)<!--'),
"html_full_comment" : re.compile('(^.*?)<!--.*?-->(.*$)'),
"html_close_comment" : re.compile('-->(.*$)'),
"style_link" : re.compile('(^.*?)<link\s+?rel="stylesheet"\s+?href="(.+?)"'),
"script_link" : re.compile('(^.*?)<script\s+?src="(.+?)"'),
"external_link" : re.compile('https?:')
}


def get_file_name(prog_file_name=''):
  """
  use filename specified at commandline
  OR if none, use filename specified in program
  OR if none, default to default_file_name
  """
  ## Establish name
  default_file_name = "wordlistTool.html"
  try:
    file_name = sys.argv[1]
  except IndexError:
    # print(f"No filename specified; I'll look for {default_file_name}")
    file_name = prog_file_name if prog_file_name else default_file_name

  ## Establish file exists
  if os.path.isfile(file_name):
    print("file_name:",file_name)
    return file_name
  else:
    print(f'Sorry. "{file_name}" could not be found.')
    quit()



def build_files(file_name):
  global isInStyle
  global isInScript
  global isSplitMode
  # out_file_name = "out.htm"
  with open(file_name, "r", encoding="utf-8") as input:
    set_mode(input)
    if isSplitMode:
      out_file_name = "out.min.html"
    else:
      out_file_name = "out.html"
    print("isSplitMode:",isSplitMode)
    print(f"Your HTML file is: {out_file_name}")
    # file in write mode
    with open(out_file_name, "w") as html_out:
      # Write each line from input file to html_out file using loop
      for raw_line in input:
        if isSplitMode:
          disassemble_file(raw_line,html_out)
        else:
          assemble_file(raw_line,html_out)


def assemble_file(raw_line,html_out):
  """

  """
  global buffer
  global rx
  file_name = ""
  file_type = ""
  line = remove_comments(raw_line)
  if line:
    match = re.search(rx["script_link"], line)
    if match:
      file_type = "script"
    else:
      match = re.search(rx["style_link"], line)
      if match:
        file_type = "style"
    if match:
      file_name = match.group(2)
      padding = match.group(1)
      if not re.search(rx["external_link"], file_name):
        print(f"attempting get data from {file_name}")
        buffer = f'{padding}<{file_type} data-title="{file_name}">\n'
        with open(file_name, "r", encoding="utf-8") as source_file:
          buffer += source_file.read()
        buffer += f"{padding}</{file_type}>\n"
        html_out.write(buffer)
        buffer = ""
        return
  html_out.write(raw_line)


def disassemble_file(raw_line,html_out):
  global isInStyle
  global isInScript
  to_print = ""
  is_skip = False
  line = remove_comments(raw_line)
  if line:
    if not isInStyle:
      (to_print,isInScript,is_skip) = export_parts(line,raw_line,"script",isInScript)
    if not (isInScript or is_skip):
      (to_print,isInStyle,is_skip) = export_parts(line,raw_line,"style",isInStyle)
  if not (isInScript or isInStyle or is_skip):
    html_out.write(raw_line)
  elif to_print:
    html_out.write(to_print)

def set_mode(html_file):
  """
  Checks through file for either:
  <link rel="stylesheet" href=
  <script src=
  WITHOUT http(s): (i.e. an external link)
  IF it finds one of these, it assumes the entire file is for re-assembling
  otherwise, it assumes the whole file is for splitting
  """
  global isSplitMode
  global rx
  for i, raw_line in enumerate(html_file):
    if not isSplitMode:
      break
    line = remove_comments(raw_line)
    if line:
      for item in ("script_link","style_link"):
        match = re.search(rx[item],line)
        if match and not re.search(rx["external_link"],line):
          # print(item,line)
          isSplitMode = False
  ## reset to beginning of file
  html_file.seek(0)


def remove_comments(line):
  """
  remove comments so that dead text in them is not matched
  """
  global isInComment
  global rx
  ## check that we're not inside an HTML comment
  if isInComment:
    match = re.search(rx["html_close_comment"],line)
    if match:
      # print("!!!!",line)
      isInComment = False
      line = match.group(1)
    else:
      ## discard commented out lines
      return ""
  ## check for opening HTML comment
  else:
    match = re.search(rx["html_open_comment"],line)
    if match:
      """
      check if comment ends on same line:
      return any surrounding non-comment text
      ELSE
      return only beginning text and declare in-comment
      """
      whole_match = re.search(rx["html_full_comment"],line)
      if whole_match:
        # print("1-line comment >>",line)
        line = whole_match.group(1) + whole_match.group(2)
      else:
        isInComment = True
        line = match.group(1)
  return line



def export_parts(line,raw_line,mode,is_in_part):
  """
  look for style / script elements (@title contains file name)
  replace them with links to files
  copy contents of tags into external files
  TODO: write the lines to the appropriate file
  """
  global current_external_file
  global buffer
  global rx
  is_style = (mode == "style")
  if is_style:
    re_opener = rx["opener_style"]
    re_close = rx["close_style"]
  else:
    re_opener = rx["opener_script"]
    re_close = rx["close_script"]
  to_print = ""
  is_skip = False
  if is_in_part:
    match = re.search(re_close,line)
    if match:
      is_in_part = False
      is_skip = True
      write_part()
    else:
      # print(f"export:{current_external_file}",line)
      buffer += raw_line
  else:
    match = re.search(re_opener,line)
    if match:
      file_name = match.group(2)
      print(mode, file_name)
      is_in_part = True
      current_external_file = file_name
      if is_style:
        link = f'{match.group(1)}<link rel="stylesheet" href="{file_name}">\n'
      else:
        link = f'{match.group(1)}<script src="{file_name}"></script>\n'
      to_print = link
  return (to_print,is_in_part,is_skip)

def write_part():
  global buffer
  global current_external_file
  with open(current_external_file, "w", encoding="utf-8") as out_file:
    out_file.write(buffer)
  buffer = ""
  current_external_file = None


def main():
  build_files(get_file_name())


main()
