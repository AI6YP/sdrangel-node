//
//  tweaktime.cc
//
//  Adjust system time manually and incrementally.
//
//  Copyright (C) 2019,2020 by Matt Roberts,
//  All rights reserved.
//
//  License: GPL 3.0 (www.gnu.org)
//

#include <cstring>
#include <iostream>
#include <limits>

#ifdef _MSC_BUILD
#include "st_win32.h" // Win32 (kernel32.dll) time functions
#else
#include "st_linux.h" // Linux time functions
#endif

using namespace std;

// enable extra output to standard error
//#define LOCAL_DEBUG

//
//  usage()
//
static void usage(const std::string &s) {
	int idx = -1;
	for (std::string::const_iterator i = s.begin(); i != s.end(); ++i) {
		if (*i == '/') {
			idx = 1 + (i - s.begin());
		}
	}
	string t;
	if (idx >= 0) {
		t = s.substr(idx);
	} else {
		t = s;
	}
	cerr << "Usage: " << t.c_str() << " [+|-]<msec>" << endl;
}


//
//  main(...)
//
int main (int argc, char**argv) {
	// check the argument count
	if (argc != 2) {
		usage(argv[0]);
		return 1;
	}

	// check the format of the offset string
	for (int i = 0; i != strlen(argv[1]); ++i) {
		switch (argv[1][i]) {
			case '+':
			case '-':
				if (i != 0) {
					usage(argv[0]);
					return 2;
				}
				break;
			default:
				if (!isdigit(argv[1][i])) {
					usage(argv[0]);
					return 2;
				}
				break;
		}
	}

	// read the offset, and convert to sec
	const double offset = atoi(argv[1]) / 1000.0; // msec -> sec
	if (offset == 0.0)
		return 4;
	
	// read the system time
	double now_real = KK5JY::GetSystemTime();
	if (now_real <= 0.0) {
		cerr << "GetSystemTime() call failed: " << KK5JY::GetLastErrorString() << endl;
		return 3;
	}

	#ifdef LOCAL_DEBUG
	cerr.precision(std::numeric_limits<double>::max_digits10);
	cerr << "Time was: " << now_real << endl;
	#endif

	// add the requested offset
	now_real += offset;

	#ifdef LOCAL_DEBUG
	cerr.precision(std::numeric_limits<double>::max_digits10);
	cerr << "Time now: " << now_real << endl;
	#endif

	// and write back the new time
	if ( ! KK5JY::SetSystemTime(now_real)) {
		cerr << "SetSystemTime(...) call failed: " << KK5JY::GetLastErrorString() << endl;
		return 3;
	}

	return 0;
}

// EOF
