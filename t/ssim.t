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
GetOptions( 'regen' => \$REGEN ) or die "\n";

my %test = (
  q10  => { R => '0.8307', G => '0.8426', B => '0.8099' },
  q20  => { R => '0.8932', G => '0.9034', B => '0.8710' },
  q30  => { R => '0.9185', G => '0.9281', B => '0.8992' },
  q40  => { R => '0.9324', G => '0.9411', B => '0.9142' },
  q50  => { R => '0.9416', G => '0.9495', B => '0.9242' },
  q60  => { R => '0.9490', G => '0.9567', B => '0.9328' },
  q70  => { R => '0.9580', G => '0.9648', B => '0.9439' },
  q80  => { R => '0.9672', G => '0.9731', B => '0.9530' },
  q90  => { R => '0.9794', G => '0.9830', B => '0.9686' },
  q100 => { R => '0.9906', G => '0.9952', B => '0.9786' },
);

my %results = ();

plan tests => 5 * keys %test;

while ( my ( $name, $want ) = each %test ) {
  my $file = File::Spec->catfile( CORPUS, "$name.jpg" );
  ok -f $file, "$name: $file exists";
  my $got = soq( ORIG, $file );
  $results{$name} = $got;
  is join( '', sort keys %$got ), join( '', sort keys %$want ),
   "$name: keys match";
  for my $chan ( keys %$got ) {
    ok abs( $want->{$chan} - $got->{$chan} ) < EPSILON,
     "$name: $chan value OK";
  }
}

if ( $REGEN ) {
  print Data::Dumper->new( [ \%results ], ['*test'] )->Quotekeys( 0 )
   ->Dump;
}

sub soq {
  my @cmd = ( SOQ, '--ssim', @_ );
  my %r = ();
  open my $ch, '-|', @cmd or die SOQ, " failed: $!\n";
  while ( <$ch> ) {
    chomp;
    /^(\w+):\s*(\d+(?:\.\d+)?)$/ or die "Bad output line: $_\n";
    $r{$1} = $2;
  }
  return \%r;
}

# vim:ts=2:sw=2:et:ft=perl

