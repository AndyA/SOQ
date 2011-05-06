/*
 * The equivalent of Zhou Wang's SSIM matlab code using OpenCV.
 * from http://www.cns.nyu.edu/~zwang/files/research/ssim/index.html
 * The measure is described in :
 * "Image quality assessment: From error measurement to structural similarity"
 * C++ code by Rabah Mehdi. http://mehdi.rabah.free.fr/SSIM
 *
 * This implementation is under the public domain.
 * @see http://creativecommons.org/licenses/publicdomain/
 * The original work may be under copyrights. 
 */

#include <ctype.h>
#include <getopt.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <cv.h>
#include <highgui.h>

#define PROG "soq"
#define VERSION "0.01"

#define PSNR(x) ( 10.0 * log10( 255.0 * 255.0 / (x) ))

typedef void ( *result_cb ) ( const char *name, double value, void *ctx );

typedef struct {
  result_cb cb;
  void *ctx;
} closure;

static void
die( const char *msg, ... ) {
  va_list ap;
  va_start( ap, msg );
  fprintf( stderr, "Fatal: " );
  vfprintf( stderr, msg, ap );
  fprintf( stderr, "\n" );
  va_end( ap );
  exit( 1 );
}

static IplImage *
load_image( const char *filename ) {
  IplImage *iraw = cvLoadImage( filename, CV_LOAD_IMAGE_ANYCOLOR );
  IplImage *icooked = NULL;

  if ( !iraw ) {
    die( "Could not read image file %s", filename );
  }

  CvSize size = cvSize( iraw->width, iraw->height );
  icooked = cvCreateImage( size, IPL_DEPTH_32F, iraw->nChannels );
  cvConvert( iraw, icooked );
  cvReleaseImage( &iraw );

  return icooked;
}

static IplImage *
img_new( CvSize size, int depth, int nChannels ) {
  IplImage *inew = cvCreateImage( size, depth, nChannels );
  if ( !inew ) {
    die( "Out of memory" );
  }
  return inew;
}

static IplImage *
img_like( const IplImage * img ) {
  CvSize size = cvSize( img->width, img->height );
  return img_new( size, img->depth, img->nChannels );
}

/* *INDENT-OFF* */
static struct color_map {
  const char *in;
  const char *out;
  int code;
} color_map[] = {
  { "RGB", "YUV", CV_RGB2YCrCb },
  { "BGR", "YUV", CV_BGR2YCrCb },
  { "YUV", "RGB", CV_YCrCb2RGB },
  { "YUV", "BGR", CV_YCrCb2BGR }, 
  { "RGB", "BGR", CV_RGB2BGR },
  { "BGR", "RGB", CV_BGR2RGB },
  { NULL, NULL, 0 }
};
/* *INDENT-ON* */

static void
to4cc( char out[5], const char *in ) {
  int i;
  for ( i = 0; i < 4 && in[i]; i++ ) {
    out[i] = toupper( in[i] );
  }
  for ( ; i < 5; i++ ) {
    out[i] = '\0';
  }
}

static int
colour_mapping( const char *in, const char *out ) {
  char in4cc[5], out4cc[5], cmin4cc[5], cmout4cc[5];
  struct color_map *cm = color_map;

  to4cc( in4cc, in );
  to4cc( out4cc, out );

  while ( cm->in ) {
    to4cc( cmin4cc, cm->in );
    to4cc( cmout4cc, cm->out );
    if ( 0 == memcmp( in4cc, cmin4cc, 4 ) &&
         0 == memcmp( out4cc, cmout4cc, 4 ) ) {
      return cm->code;
    }
    cm++;
  }
  return -1;
}

static int
adjust_colourspace( IplImage ** img, const char *in, const char *out ) {
  int code;
  IplImage *nimg = NULL;
  char in4cc[5], out4cc[5];
  to4cc( in4cc, in );
  to4cc( out4cc, out );

  if ( !memcmp( in4cc, out4cc, 4 ) ) {
    return 0;
  }

  if ( code = colour_mapping( in, out ), code < 0 ) {
    die( "No colour mapping %s -> %s", in4cc, out4cc );
  }

  nimg = img_like( *img );
  cvCvtColor( *img, nimg, code );
  strncpy( nimg->channelSeq, out, 4 );
  cvReleaseImage( img );
  *img = nimg;

  return 1;
}

static int
adjust_size( IplImage ** img, CvSize size ) {
  IplImage *nimg;

  if ( ( *img )->width == size.width && ( *img )->height == size.height ) {
    return 0;
  }

  nimg = img_new( size, ( *img )->depth, ( *img )->nChannels );
  cvResize( *img, nimg, CV_INTER_CUBIC );
  cvReleaseImage( img );
  *img = nimg;

  return 1;
}

static int
make_like( IplImage ** img, const IplImage * ref ) {
  CvSize size = cvSize( ref->width, ref->height );
  return adjust_colourspace( img, ( *img )->channelSeq, ref->channelSeq ) +
      adjust_size( img, size );
}

static void
mse( IplImage * img1, IplImage * img2, result_cb cb, void *ctx ) {
  IplImage *err = img_like( img1 );
  int i;

  cvSub( img1, img2, err, NULL );
  cvPow( err, err, 2 );
  CvScalar mse = cvAvg( err, NULL );
  cvReleaseImage( &err );

  for ( i = 0; i < img1->nChannels; i++ ) {
    char cn[2] = "?";
    cn[0] = img1->channelSeq[i];
    cb( cn, mse.val[i], ctx );
  }
}

static void
psnr_cb( const char *name, double value, void *ctx ) {
  closure *cl = ( closure * ) ctx;
  cl->cb( name, PSNR( value ), cl->ctx );
}

static void
psnr( IplImage * img1, IplImage * img2, result_cb cb, void *ctx ) {
  closure cl;
  cl.cb = cb;
  cl.ctx = ctx;
  mse( img1, img2, psnr_cb, ( void * ) &cl );
}

static void
ssim( IplImage * img1, IplImage * img2, result_cb cb, void *ctx ) {
  double C1 = 6.5025, C2 = 58.5225;
  IplImage *img1_img2 = NULL, *img1_sq = NULL, *img2_sq = NULL,
      *mu1 = NULL, *mu2 = NULL,
      *mu1_sq = NULL, *mu2_sq = NULL, *mu1_mu2 = NULL,
      *sigma1_sq = NULL, *sigma2_sq = NULL, *sigma12 = NULL,
      *ssim_map = NULL, *temp1 = NULL, *temp2 = NULL, *temp3 = NULL;
  int i;

  img1_sq = img_like( img1 );
  mu1 = img_like( img1 );
  mu1_sq = img_like( img1 );
  sigma1_sq = img_like( img1 );
  cvPow( img1, img1_sq, 2 );
  cvSmooth( img1, mu1, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvPow( mu1, mu1_sq, 2 );
  cvSmooth( img1_sq, sigma1_sq, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvAddWeighted( sigma1_sq, 1, mu1_sq, -1, 0, sigma1_sq );
  cvReleaseImage( &img1_sq );

  img2_sq = img_like( img1 );
  mu2 = img_like( img1 );
  mu2_sq = img_like( img1 );
  sigma2_sq = img_like( img1 );
  cvPow( img2, img2_sq, 2 );
  cvSmooth( img2, mu2, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvPow( mu2, mu2_sq, 2 );
  cvSmooth( img2_sq, sigma2_sq, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvAddWeighted( sigma2_sq, 1, mu2_sq, -1, 0, sigma2_sq );
  cvReleaseImage( &img2_sq );

  mu1_mu2 = img_like( img1 );
  sigma12 = img_like( img1 );
  img1_img2 = img_like( img1 );
  cvMul( img1, img2, img1_img2, 1 );
  cvMul( mu1, mu2, mu1_mu2, 1 );
  cvSmooth( img1_img2, sigma12, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvAddWeighted( sigma12, 1, mu1_mu2, -1, 0, sigma12 );
  cvReleaseImage( &mu1 );
  cvReleaseImage( &mu2 );

  temp1 = img_like( img1 );
  temp2 = img_like( img1 );
  temp3 = img_like( img1 );

  // FORMULA

  // (2*mu1_mu2 + C1)
  cvScale( mu1_mu2, temp1, 2, 0 );
  cvAddS( temp1, cvScalarAll( C1 ), temp1, NULL );

  // (2*sigma12 + C2)
  cvScale( sigma12, temp2, 2, 0 );
  cvAddS( temp2, cvScalarAll( C2 ), temp2, NULL );

  // ((2*mu1_mu2 + C1).*(2*sigma12 + C2))
  cvMul( temp1, temp2, temp3, 1 );

  // (mu1_sq + mu2_sq + C1)
  cvAdd( mu1_sq, mu2_sq, temp1, NULL );
  cvAddS( temp1, cvScalarAll( C1 ), temp1, NULL );

  // (sigma1_sq + sigma2_sq + C2)
  cvAdd( sigma1_sq, sigma2_sq, temp2, NULL );
  cvAddS( temp2, cvScalarAll( C2 ), temp2, NULL );

  // ((mu1_sq + mu2_sq + C1).*(sigma1_sq + sigma2_sq + C2))
  cvMul( temp1, temp2, temp1, 1 );

  // ((2*mu1_mu2 + C1).*(2*sigma12 + C2))./((mu1_sq + mu2_sq 
  //    + C1).*(sigma1_sq + sigma2_sq + C2))
  ssim_map = img_like( img1 );
  cvDiv( temp3, temp1, ssim_map, 1 );
  CvScalar index_scalar = cvAvg( ssim_map, NULL );
  cvReleaseImage( &ssim_map );

  cvReleaseImage( &img1_img2 );
  cvReleaseImage( &mu1_sq );
  cvReleaseImage( &mu2_sq );
  cvReleaseImage( &mu1_mu2 );
  cvReleaseImage( &sigma1_sq );
  cvReleaseImage( &sigma2_sq );
  cvReleaseImage( &sigma12 );
  cvReleaseImage( &temp1 );
  cvReleaseImage( &temp2 );
  cvReleaseImage( &temp3 );

  for ( i = 0; i < img1->nChannels; i++ ) {
    char cn[2] = "?";
    cn[0] = img1->channelSeq[i];
    cb( cn, index_scalar.val[i], ctx );
  }

}

static void
result( const char *name, double value, void *ctx ) {
  printf( "%s.%s: %0.4f\n", ( char * ) ctx, name, value );
}

static void
nop( const char *name, double value, void *ctx ) {
  ( void ) name;
  ( void ) value;
  ( void ) ctx;
}

static void
usage( void ) {
  fprintf( stderr, "Usage: " PROG " [options] <original> <version>\n\n"
           "Options:\n"
           "      --psnr            Perform PSNR analysis\n"
           "      --ssim            Perform SSIM analysis\n"
           "      --mse             Perform MSE analysis\n"
           "  -B, --benchmark=N     Run analusis N times\n"
           "  -C, --colourspace=X   Convert to named colourspace (RGB/BGR/YUV)\n"
           "  -V, --version         See version number\n"
           "  -h, --help            See this text\n\n" );
  exit( 1 );
}

static unsigned long
parse_int( const char *s ) {
  char *endp;
  unsigned long ul = strtoul( s, &endp, 10 );
  if ( *endp || endp == s ) {
    die( "Bad number: %s", s );
  }
  return ul;
}

int
main( int argc, char **argv ) {
  int ch;
  char *colourspace = NULL;
  int do_ssim = 0, do_psnr = 0, do_mse = 0;
  unsigned long i, bm = 1;

  IplImage *img1 = NULL, *img2 = NULL;

  static struct option opts[] = {
    {"help", no_argument, NULL, 'h'},
    {"ssim", no_argument, NULL, '\1'},
    {"psnr", no_argument, NULL, '\2'},
    {"mse", no_argument, NULL, '\3'},
    {"colourspace", required_argument, NULL, 'C'},
    {"colorspace", required_argument, NULL, 'C'},
    {"benchmark", required_argument, NULL, 'B'},
    {"version", no_argument, NULL, 'V'},
    {NULL, 0, NULL, 0}
  };

  while ( ch =
          getopt_long( argc, argv, "hV\1\2\3B:C:", opts, NULL ),
          ch != -1 ) {
    switch ( ch ) {
    case 'V':
      printf( "%s %s\n", PROG, VERSION );
      return 0;
    case '\1':
      do_ssim++;
      break;
    case '\2':
      do_psnr++;
      break;
    case '\3':
      do_mse++;
      break;
    case 'B':
      bm = parse_int( optarg );
      break;
    case 'C':
      colourspace = optarg;
      break;
    case 'h':
    default:
      usage(  );
    }
  }

  argc -= optind;
  argv += optind;

  if ( argc != 2 ) {
    usage(  );
  }

  img1 = load_image( argv[0] );
  img2 = load_image( argv[1] );

  if ( colourspace ) {
    adjust_colourspace( &img2, img2->channelSeq, colourspace );
  }

  make_like( &img1, img2 );

  if ( bm > 1 ) {
    printf( "Benchmark mode; looping %lu times\n", bm );
  }

  for ( i = 0; i < bm; i++ ) {
    result_cb cb = i ? nop : result;
    if ( do_psnr || !( do_ssim || do_mse ) ) {
      psnr( img1, img2, cb, "psnr" );
    }
    if ( do_ssim ) {
      ssim( img1, img2, cb, "ssim" );
    }
    if ( do_mse ) {
      mse( img1, img2, cb, "mse" );
    }
  }

  cvReleaseImage( &img1 );
  cvReleaseImage( &img2 );

  return 0;
}
