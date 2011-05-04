.PHONY: all clean install tags

PREFIX=/alt/local
INCDIR=$(PREFIX)/include
LIBDIR=$(PREFIX)/lib

LIBS=-lopencv_core -lopencv_imgproc -lopencv_highgui -lstdc++

INCLUDES=-I/opt/local/include -I/opt/local/include/opencv -I$(INCDIR)
LDFLAGS=-L/opt/local/lib $(LIBS) -L$(LIBDIR)
CPPFLAGS=-Wall -O3 $(INCLUDES)

INSTALL_PREFIX=$(PREFIX)

SSIM_OBJS=SSIM.o
SSIM=SSIM
DSSIM_OBJS=dssim.o
DSSIM=dssim

all: $(SSIM) $(DSSIM)

$(SSIM): $(SSIM_OBJS)
$(DSSIM): $(DSSIM_OBJS)

clean:
	rm -rf $(SSIM_OBJS) $(DSSIM_OBJS) $(DSSIM) $(SSIM) *.dSYM
	rm -f *.gcov *.gcda *.gcno

install: $(PROG)
	install -d $(INSTALL_PREFIX)/bin
	install $(PROG) $(INSTALL_PREFIX)/bin

tags:
	ctags -R .
