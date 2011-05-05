.PHONY: all clean install tags

PREFIX=/alt/local
INCDIR=$(PREFIX)/include
LIBDIR=$(PREFIX)/lib

LIBS=-lopencv_core -lopencv_imgproc -lopencv_highgui -lstdc++

INCLUDES=-I/opt/local/include -I/opt/local/include/opencv -I$(INCDIR)
LDFLAGS=-L/opt/local/lib $(LIBS) -L$(LIBDIR)
OPTIMIZE=-O3
CPPFLAGS=$(EXTRAFLAGS) -Wall $(OPTIMIZE) -Wno-unused-function $(INCLUDES)

INSTALL_PREFIX=$(PREFIX)

SOQ_OBJS=soq.o
SOQ=soq

all: $(SOQ)

$(SOQ): $(SOQ_OBJS)

clean:
	rm -rf $(SOQ_OBJS) $(SOQ) *.dSYM
	rm -f *.gcov *.gcda *.gcno

install: $(PROG)
	install -d $(INSTALL_PREFIX)/bin
	install $(SOQ) $(INSTALL_PREFIX)/bin

tags:
	ctags -R *.c inc

test: $(SOQ)
	prove t/*.t
