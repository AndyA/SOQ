#!perl

use strict;
use warnings;

use Data::Dumper;
use File::Spec;
use Getopt::Long;
use Test::More;

use constant SOQ => File::Spec->catfile( '.', 'soq' );
use constant CORPUS  => 'corpus';
use constant ORIG    => File::Spec->catfile( CORPUS, 'orig.jpg' );
use constant EPSILON => 0.001;

my $REGEN = 0;
my $ONLY  = undef;
GetOptions(
  'regen'  => \$REGEN,
  'only:s' => \$ONLY,
) or die "\n";

my %test = (
  q90 => {
    ssim => { R => '0.9794',  G => '0.9830',  B => '0.9686' },
    mse  => { R => '6.5217',  G => '4.0692',  B => '9.8413' },
    psnr => { R => '39.9872', G => '42.0357', B => '38.2003' }
  },
  q80 => {
    ssim => { R => '0.9672',  G => '0.9731',  B => '0.9530' },
    mse  => { R => '10.0848', G => '7.5761',  B => '14.3094' },
    psnr => { R => '38.0941', G => '39.3363', B => '36.5746' }
  },
  q70 => {
    ssim => { R => '0.9580',  G => '0.9648',  B => '0.9439' },
    mse  => { R => '14.4207', G => '11.0445', B => '19.5711' },
    psnr => { R => '36.5409', G => '37.6993', B => '35.2147' }
  },
  q10 => {
    ssim => { R => '0.8307',  G => '0.8426',  B => '0.8099' },
    mse  => { R => '89.0479', G => '72.6990', B => '117.3061' },
    psnr => { R => '28.6346', G => '29.5155', B => '27.4376' }
  },
  q40 => {
    ssim => { R => '0.9324',  G => '0.9411',  B => '0.9142' },
    mse  => { R => '26.9280', G => '21.4044', B => '35.6512' },
    psnr => { R => '33.8288', G => '34.8258', B => '32.6101' }
  },
  q50 => {
    ssim => { R => '0.9416',  G => '0.9495',  B => '0.9242' },
    mse  => { R => '22.3231', G => '17.6220', B => '29.7483' },
    psnr => { R => '34.6433', G => '35.6703', B => '33.3962' }
  },
  q100 => {
    ssim => { R => '0.9906',  G => '0.9952',  B => '0.9786' },
    mse  => { R => '3.8636',  G => '1.0514',  B => '7.2675' },
    psnr => { R => '42.2609', G => '47.9130', B => '39.5169' }
  },
  q30 => {
    ssim => { R => '0.9185',  G => '0.9281',  B => '0.8992' },
    mse  => { R => '34.1500', G => '27.2041', B => '44.5448' },
    psnr => { R => '32.7969', G => '33.7845', B => '31.6428' }
  },
  q60 => {
    ssim => { R => '0.9490',  G => '0.9567',  B => '0.9328' },
    mse  => { R => '18.6967', G => '14.4548', B => '24.9736' },
    psnr => { R => '35.4132', G => '36.5307', B => '34.1560' }
  },
  q20 => {
    ssim => { R => '0.8932',  G => '0.9034',  B => '0.8710' },
    mse  => { R => '48.0002', G => '39.0155', B => '63.6543' },
    psnr => { R => '31.3184', G => '32.2184', B => '30.0925' }
  }
);

my %results = ();

my @mode = qw( ssim mse psnr );
if ( defined $ONLY ) {
  my $like = qr{@{[join '|', map quotemeta, split ',', $ONLY]}};
  @mode = grep { /^$like$/ } @mode;
}

plan tests => ( 1 + 4 * @mode ) * keys %test;

while ( my ( $name, $want ) = each %test ) {
  my $file = File::Spec->catfile( CORPUS, "$name.jpg" );
  ok -f $file, "$name: $file exists";
  for my $mode ( @mode ) {
    my $got = soq( "--$mode", ORIG, $file );
    $results{$name}{$mode} = $got;
    is join( '', sort keys %$got ),
     join( '', sort keys %{ $want->{$mode} } ),
     "$name, $mode: keys match";
    for my $chan ( keys %$got ) {
      ok abs( $want->{$mode}{$chan} - $got->{$chan} ) < EPSILON,
       "$name, $mode: $chan value OK";
    }
  }
}

if ( $REGEN ) {
  print Data::Dumper->new( [ \%results ], ['*test'] )->Quotekeys( 0 )
   ->Dump;
}

sub soq {
  my @cmd = ( SOQ, @_ );
  my %r = ();
  open my $ch, '-|', @cmd or die SOQ, " failed: $!\n";
  while ( <$ch> ) {
    chomp;
    /^(.+?):\s*(\d+(?:\.\d+)?)$/ or die "Bad output line: $_\n";
    my ( $k, $v ) = ( $1, $2 );
    $k =~ s/(.*?)\.//;
    $r{$k} = $v;
  }
  return \%r;
}

# vim:ts=2:sw=2:et:ft=perl

