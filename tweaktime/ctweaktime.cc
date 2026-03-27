//
//  ctweaktime.cc
//
//  Simple interactive interface to ctweaktime.
//
//  Copyright (C) 2019,2020 by Matt Roberts,
//  All rights reserved.
//
//  License: GPL 3.0 (www.gnu.org)
//

#include <iostream>
#include <stdint.h>
#include <stdio.h>
#ifdef _MSC_BUILD
#include <conio.h>
#else
#include <termios.h>
#include <unistd.h>
#endif

using namespace std;

static int32_t duration = 100;
static int32_t total = 0;
static char buffer[128];


//
//  step(...) - move the clock
//
static void step(int32_t howMuch) {
	#ifdef _MSC_BUILD
	_snprintf(buffer, sizeof(buffer), "tweaktime %d", howMuch);
	#else
	snprintf(buffer, sizeof(buffer), "tweaktime %d", howMuch);
	#endif
	int result = ::system(buffer);
	if (result == 0) {
		total += howMuch;
		cout << "Step clock by " << howMuch << " ms, " << total << " total." << endl;
	}
}


//
//  status() - talk about current program state
//
static void status() {
	cout << "Current step is " << duration << " ms." << endl;
	cout.flush();
}


//
//  main(...)
//
int main (int argc, char** argv) {
	#ifndef _MSC_BUILD
	const bool isTTY = isatty(0);
	// set 'cin' to RAW
	::termios io, toRestore;
	if (isTTY) {
		::tcgetattr(0, &toRestore);
		::tcgetattr(0, &io);
		io.c_lflag = 0;
		::tcsetattr(0, TCSANOW, &io);
	}
	#endif

	cout << "Use < and > to step the clock." << endl;
	cout << "Use + and - to change the step amount." << endl;
	cout << "Use Q or ESC to exit." << endl;
	status();

	try {
		while (cin) {
			#ifdef _MSC_BUILD
			char ch = _getch();
			#else
			char ch = cin.get();
			#endif
			if (!cin) break;

			ch = toupper(ch);

			// exit?
			if (ch == 27 || ch == 3 || ch == 'Q')
				break;

			switch (ch) {
				case '=':
				case '+':
					// allow adjustment above 50ms in 50ms increments
					// allow adjustment between 10ms and 50ms in 10ms increments
					if (duration >= 50) {
						duration += 50;
					} else {
						duration += 10;
					}
					status();
					break;
				case '_':
				case '-':
					// allow adjustment down to 50ms in 50ms increments
					// allow adjustment between 50ms and 10ms in 10ms increments
					if (duration > 50) {
						duration -= 50;
						status();
					} else if (duration > 10) {
						duration -= 10;
						status();
					}
					break;
				case ',':
				case '<':
					step(-duration);
					break;
				case '.':
				case '>':
					step(duration);
					break;
			}
		}
	} catch (const std::exception &e) {
		// nop
	}

	#ifndef _MSC_BUILD
	if (isTTY) {
		::tcsetattr(0, TCSANOW, &toRestore);
		std::cout << endl;
	}
	#endif
}

// EOF: ctweaktime.cc
