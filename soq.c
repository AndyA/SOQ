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

#include <getopt.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <cv.h>
#include <highgui.h>

#define PROG "soq"
#define VERSION "0.01"

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

typedef void ( *result_cb ) ( const char *name, double value, void *ctx );

static void
ssim( IplImage * img1, IplImage * img2, result_cb cb, void *ctx ) {
  const static char *chan[] = { "B", "G", "R" };
  double C1 = 6.5025, C2 = 58.5225;
  IplImage *img1_img2 = NULL, *img1_sq = NULL, *img2_sq = NULL,
      *mu1 = NULL, *mu2 = NULL,
      *mu1_sq = NULL, *mu2_sq = NULL, *mu1_mu2 = NULL,
      *sigma1_sq = NULL, *sigma2_sq = NULL, *sigma12 = NULL,
      *ssim_map = NULL, *temp1 = NULL, *temp2 = NULL, *temp3 = NULL;
  int i;

  int nChan = img1->nChannels;
  int d = img1->depth;
  CvSize size = cvSize( img1->width, img1->height );

  img1_sq = cvCreateImage( size, d, nChan );
  img2_sq = cvCreateImage( size, d, nChan );
  img1_img2 = cvCreateImage( size, d, nChan );

  cvPow( img1, img1_sq, 2 );
  cvPow( img2, img2_sq, 2 );
  cvMul( img1, img2, img1_img2, 1 );

  mu1 = cvCreateImage( size, d, nChan );
  mu2 = cvCreateImage( size, d, nChan );

  mu1_sq = cvCreateImage( size, d, nChan );
  mu2_sq = cvCreateImage( size, d, nChan );
  mu1_mu2 = cvCreateImage( size, d, nChan );

  sigma1_sq = cvCreateImage( size, d, nChan );
  sigma2_sq = cvCreateImage( size, d, nChan );
  sigma12 = cvCreateImage( size, d, nChan );

  temp1 = cvCreateImage( size, d, nChan );
  temp2 = cvCreateImage( size, d, nChan );
  temp3 = cvCreateImage( size, d, nChan );

  ssim_map = cvCreateImage( size, d, nChan );
  /*************************** END INITS **********************************/

  //////////////////////////////////////////////////////////////////////////
  // PRELIMINARY COMPUTING
  cvSmooth( img1, mu1, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvSmooth( img2, mu2, CV_GAUSSIAN, 11, 11, 1.5, 0 );

  cvPow( mu1, mu1_sq, 2 );
  cvPow( mu2, mu2_sq, 2 );
  cvMul( mu1, mu2, mu1_mu2, 1 );

  cvSmooth( img1_sq, sigma1_sq, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvAddWeighted( sigma1_sq, 1, mu1_sq, -1, 0, sigma1_sq );

  cvSmooth( img2_sq, sigma2_sq, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvAddWeighted( sigma2_sq, 1, mu2_sq, -1, 0, sigma2_sq );

  cvSmooth( img1_img2, sigma12, CV_GAUSSIAN, 11, 11, 1.5, 0 );
  cvAddWeighted( sigma12, 1, mu1_mu2, -1, 0, sigma12 );

  //////////////////////////////////////////////////////////////////////////
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

  // ((2*mu1_mu2 + C1).*(2*sigma12 + C2))./((mu1_sq + mu2_sq + C1).*(sigma1_sq + sigma2_sq + C2))
  cvDiv( temp3, temp1, ssim_map, 1 );

  CvScalar index_scalar = cvAvg( ssim_map, NULL );

  for ( i = 2; i >= 0; i-- ) {
    cb( chan[i], index_scalar.val[i], ctx );
  }

  cvReleaseImage( &img1_img2 );
  cvReleaseImage( &img1_sq );
  cvReleaseImage( &img2_sq );
  cvReleaseImage( &mu1 );
  cvReleaseImage( &mu2 );
  cvReleaseImage( &mu1_sq );
  cvReleaseImage( &mu2_sq );
  cvReleaseImage( &mu1_mu2 );
  cvReleaseImage( &sigma1_sq );
  cvReleaseImage( &sigma2_sq );
  cvReleaseImage( &sigma12 );
  cvReleaseImage( &ssim_map );
  cvReleaseImage( &temp1 );
  cvReleaseImage( &temp2 );
  cvReleaseImage( &temp3 );
}

static void
result( const char *name, double value, void *ctx ) {
  ( void ) ctx;
  printf( "%s: %0.4f\n", name, value );
}

static void
usage( void ) {
  fprintf( stderr, "Usage: " PROG " [options] <original> <version>\n\n"
           "Options:\n"
           "      --ssim      Perform SSIM analysis\n"
           "  -V, --version   See version number\n"
           "  -h, --help      See this text\n\n" );
  exit( 1 );
}

int
main( int argc, char **argv ) {
  int ch;

  IplImage *img1 = NULL, *img2 = NULL,
      *img1_temp = NULL, *img2_temp = NULL;

  void ( *func ) ( IplImage * orig, IplImage * ver, result_cb cb,
                   void *ctx ) = ssim;

  static struct option opts[] = {
    {"help", no_argument, NULL, 'h'},
    {"ssim", no_argument, NULL, '\1'},
    {"version", no_argument, NULL, 'V'},
    {NULL, 0, NULL, 0}
  };

  while ( ch = getopt_long( argc, argv, "hV\1", opts, NULL ), ch != -1 ) {
    switch ( ch ) {
    case 'V':
      printf( "%s %s\n", PROG, VERSION );
      return 0;
    case '\1':
      func = ssim;
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

  img1_temp = cvLoadImage( argv[0], CV_LOAD_IMAGE_ANYCOLOR );
  img2_temp = cvLoadImage( argv[1], CV_LOAD_IMAGE_ANYCOLOR );

  if ( !img1_temp ) {
    die( "Could not read image file %s", argv[1] );
  }

  if ( !img2_temp ) {
    die( "Could not read image file %s", argv[2] );
  }

  int x = img1_temp->width, y = img1_temp->height;
  int nChan = img1_temp->nChannels, d = IPL_DEPTH_32F;
  CvSize size = cvSize( x, y );

  // Convert to floating point
  img1 = cvCreateImage( size, d, nChan );
  img2 = cvCreateImage( size, d, nChan );

  cvConvert( img1_temp, img1 );
  cvConvert( img2_temp, img2 );
  cvReleaseImage( &img1_temp );
  cvReleaseImage( &img2_temp );

  func( img1, img2, result, NULL );

  cvReleaseImage( &img1 );
  cvReleaseImage( &img2 );

  return 0;
}
