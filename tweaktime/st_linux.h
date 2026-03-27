//
//  st_linux.h
//
//  Time functions for Linux.
//
//  Copyright (C) 2020 by Matt Roberts,
//  All rights reserved.
//
//  License: GPL 3.0 (www.gnu.org)
//


#ifndef __ST_LINUX_H
#define __ST_LINUX_H
#include <sys/time.h>

namespace KK5JY {
	//
	//  GetSystemTime() - wrapper around gettimeofday(...)
	//
	inline double GetSystemTime(){
		// get the time, advance/retard it, and set it back
		struct timeval now;
		if (::gettimeofday(&now, 0) < 0) {
			return 0.0;
		}

		// convert to double seconds
		return static_cast<double>(now.tv_sec + (now.tv_usec / 1000000.0));
	}


	//
	//  SetSystemTime(double) - wrapper around settimeofday(...)
	//
	inline bool SetSystemTime(double to) {
		// convert back to timeval
		struct timeval now;
		now.tv_sec = static_cast<time_t>(to);
		now.tv_usec = static_cast<suseconds_t>((to - static_cast<time_t>(to)) * 1000000);

		// set the clock
		if (::settimeofday(&now, 0) < 0) {
			return false;
		}

		return true;
	}


	//
	//  GetLastErrorString() - return the last error as a string
	//
	inline std::string GetLastErrorString() {
		return std::string(::strerror(errno));
	}
}
#endif // __ST_LINUX_H
