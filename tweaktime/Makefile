#
#
#   Makefile
#
#   Copyright (C) 2019,2020 by Matt Roberts.
#   License: GNU GPL3 (www.gnu.org)
#
#

INSTALL_PATH=/usr/local/bin

all: tweaktime ctweaktime
rebuild: clean all

ctweaktime: ctweaktime.cc
	g++ $(CXXFLAGS) -o $@ $@.cc

tweaktime: tweaktime.cc
	g++ $(CXXFLAGS) -o $@ $@.cc

clean:
	rm -f tweaktime ctweaktime *.o

strip: all
	strip --strip-unneeded tweaktime

install: all strip
	install -g root -o root -m 0755 tweaktime $(INSTALL_PATH)
	install -g root -o root -m 0755 ctweaktime $(INSTALL_PATH)

# EOF
