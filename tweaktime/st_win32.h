//
//  st_win32.h
//
//  Time functions for Win32 (kernel32.dll).
//
//  Copyright (C) 2020 by Matt Roberts,
//  All rights reserved.
//
//  License: GPL 3.0 (www.gnu.org)
//
//  See comments in 'build.bat'
//


#ifndef __ST_WIN32_H
#define __ST_WIN32_H
#include <stdint.h>
#include <sstream>
#include <Windows.h>

//
//  References:
//
//  https://docs.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-systemtime
//  https://docs.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-filetime
//  https://docs.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-getsystemtime
//  https://docs.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-setsystemtime
//  https://docs.microsoft.com/en-us/windows/win32/api/timezoneapi/nf-timezoneapi-systemtimetofiletime
//  https://docs.microsoft.com/en-us/windows/win32/api/timezoneapi/nf-timezoneapi-filetimetosystemtime
//

namespace KK5JY {
	//
	//  GetSystemTime() - wrapper around GetSystemTime(...)
	//
	inline double GetSystemTime(){
		// read the clock
		SYSTEMTIME st;
		GetSystemTime(&st);

		// convert to file time
		FILETIME ft;
		if (SystemTimeToFileTime(&st, &ft) == 0) {
			return 0.0;
		}

		// convert to total number of 100ns 'ticks' since epoch
		uint64_t count = (static_cast<uint64_t>(ft.dwHighDateTime) << 32) | (static_cast<uint64_t>(ft.dwLowDateTime));
		
		// convert to double seconds
		return static_cast<double>(count) / 10000000.0;
	}


	//
	//  SetSystemTime(double) - wrapper around SetSystemTime(...)
	//
	inline bool SetSystemTime(double to) {
		// convert double seconds to windows tick count
		uint64_t count = static_cast<uint64_t>(to * 10000000.0);

		// convert to file time
		FILETIME ft;
		ft.dwLowDateTime = count & 0xFFFFFFFF;
		ft.dwHighDateTime = (count >> 32) & 0xFFFFFFFF;

		// convert to system time
		SYSTEMTIME st;
		if ( ! FileTimeToSystemTime(&ft, &st)) {
			return false;
		}

		// save to system clock
		if ( ! SetSystemTime(&st)) {
			return false;
		}

		return true;
	}


	//
	//  GetLastErrorString() - return the last error as a string
	//
	inline std::string GetLastErrorString() {
		std::ostringstream out;
		out << GetLastError();
		return out.str();
	}
}
#endif // __ST_WIN32_H
