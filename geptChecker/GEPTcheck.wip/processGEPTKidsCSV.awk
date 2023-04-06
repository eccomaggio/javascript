#! /bin/awk -f

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
