#! /bin/awk -f
# superceded by python file; for interest only

BEGIN { 
	FS = "\t"
	OFS = ""
	print "return ["
}
/[a-zA-Z]/ { 

	sub("\r", "", $4);
	print "[ \"", $1, "\", \"", $2, "\", \"", $3, "\", \"", $4, "\"],"

}

END { print "];" }
