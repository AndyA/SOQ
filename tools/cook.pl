#!/usr/bin/env perl

use strict;
use warnings;

use lib qw( lib );

use Data::Dumper;
use Data::Reshape qw( reshape );
use Getopt::Long;
use JSON::XS;
use List::Util qw( min max sum );
use Path::Class;
use Text::CSV_XS;

my %Opt = ( outdir => '.', minpts => 10 );

GetOptions(
  'o|outdir:s' => \$Opt{outdir},
  'm|minpts:i' => \$Opt{minpts},
) or die "\n";

cook( \%Opt, @ARGV );

sub cook {
  my ( $opt, @file ) = @_;
  my %raw = map { $_ => read_data( $_ ) } @file;

  print "Reshaping data\n";
  my $cooked = to_mma(
    reshape {
      s{ ^ ( \{ .+? \} ) ( \[ \d+ \] ) ( \{ .+? \} ) ( \{ .+? \} ) }
    {$1$3$4$2}x;
    }
    \%raw
  );
  my $orig_len = get_length( $cooked );

  my $scale = 1;
  while () {
    my $len = get_length( $cooked );
    last if $len < $opt->{minpts};
    my $json = file( $opt->{outdir}, "g${scale}.json" );
    print "Writing $json ($len points)\n";
    open my $jh, '>', "$json" or die "Can't write $json: $!\n";
    print $jh JSON::XS->new->pretty->encode(
      {
        meta => {
          scale  => $scale,
          title  => 'My lovely data',
          length => $orig_len,
        },
        data => $cooked
      }
    );
    $cooked = half_scale( $cooked );
    $scale *= 2;
  }
}

sub get_length {
  my $data = shift;
  return max( map { get_length( $_ ) } values %$data )
   if 'HASH' eq ref $data;
  return scalar @$data;
}

sub to_mma {
  my $data = shift;
  if ( 'HASH' eq ref $data ) {
    my $out = {};
    while ( my ( $k, $v ) = each %$data ) {
      $out->{$k} = to_mma( $v );
    }
    return $out;
  }
  return [ map { ref $_ ? $_ : { min => $_, max => $_, avg => $_ } }
     @$data ];
}

sub half_scale {
  my $data = shift;

  if ( 'HASH' eq ref $data ) {
    my $out = {};
    while ( my ( $k, $v ) = each %$data ) {
      $out->{$k} = half_scale( $v );
    }
    return $out;
  }

  my $out  = [];
  my $step = 2;

  for ( my $i = 0; $i < @$data; $i += $step ) {
    my @sl = @{$data}[ $i .. min( $i + $step, scalar @$data ) - 1 ];
    push @$out,
     {
      min => min( map { $_->{min} } @sl ),
      max => max( map { $_->{max} } @sl ),
      avg => sum( map { $_->{avg} } @sl ) / @sl,
     };
  }
  return $out;
}

sub put_path {
  my ( $h, $k, @p ) = @_;
  my $v = pop @p;
  if ( @p ) {
    put_path( $h->{$k} ||= {}, @p, $v );
    return;
  }

  $h->{$k} = $v;
}

sub read_data {
  my $file = shift;
  print "Reading $file\n";
  my $csv = Text::CSV_XS->new;
  open my $fh, '<', $file or die "Can't read $file: $!\n";
  my @data = ();
  my @fld  = ();
  ROW: while ( my $row = $csv->getline( $fh ) ) {
    unless ( @fld ) {
      @fld = @$row;
      next ROW;
    }

    my %rec = ();
    @rec{@fld} = @$row;
    my $datum = {};
    while ( my ( $k, $v ) = each %rec ) {
      put_path( $datum, split( /[.]/, $k ), $v );
    }
    push @data, $datum;
  }
  $csv->eof or $csv->error_diag();
  close $fh;
  return \@data;
}

# vim:ts=2:sw=2:sts=2:et:ft=perl

