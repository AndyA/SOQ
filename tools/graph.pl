#!/usr/bin/env perl

use strict;
use warnings;

use lib qw( lib );

use Data::Dumper;
use Data::Reshape qw( reshape );
use JSON::XS;
use List::Util qw( min max sum );
use Path::Class;
use SVG;
use Text::CSV_XS;

print graph( { sel => 'ssim' }, @ARGV )->xmlify;

sub graph {
  my ( $opt, @file ) = @_;
  my %opt = (
    maxpt  => 250,
    width  => 1000,
    height => 480,
    id     => 'graph',
    %$opt
  );
  my %data;
  my %raw;
  my ( $dmax, $dmin );
  for my $file ( @file ) {
    my $d = read_data( $file );
    {
      my ( undef, undef, $dd ) = reduce_data( $d, 1024 );
      $raw{$file} = $dd;
    }
    {
      my ( $min, $max, $dd ) = reduce_data( $d, $opt{maxpt} );
      $data{$file} = $dd;
      $dmin = min( grep defined, $dmin, $min );
      $dmax = max( grep defined, $dmax, $max );
    }
  }

  my $cooked = reshape {
    s{ ^ ( \{ .+? \} ) ( \[ \d+ \] ) ( \{ .+? \} ) ( \{ .+? \} ) }
    {$1$3$4$2}x;
  }
  \%raw;

  {
    # Write the json file ... somewhere :)
    my $json = common_prefix( @file ) . '.pretty.json';
    open my $jh, '>', $json or die "Can't write $json: $!\n";
    print $jh JSON::XS->new->pretty->encode( $cooked );
  }
  {
    my $json = common_prefix( @file ) . '.json';
    open my $jh, '>', $json or die "Can't write $json: $!\n";
    print $jh JSON::XS->new->encode( $cooked );
  }

  my $vscale = nice_ceil( $dmax );
  my @inset  = ( 10, 10, 10, 10 );
  my $gw     = $opt{width} - $inset[0] - $inset[2];
  my $gh     = $opt{height} - $inset[1] - $inset[3];

  my $xf = sub {
    my ( $x, $y ) = @_;
    return (
      $inset[0] + $x * $gw / $opt{maxpt},
      $inset[1] + ( $vscale - $y ) * $gh / $vscale
    );
  };

  my $svg = new SVG(
    id     => $opt{id},
    width  => $opt{width},
    height => $opt{height},
  );

  my @axis = ( [ 0, $vscale ], [ 0, 0 ], [ $opt{maxpt}, 0 ] );

  my $points = $svg->get_path(
    from_pairs( $xf, @axis ),
    -type   => 'polyline',
    -closed => 'false'
  );
  $svg->polyline(
    %$points,
    style => {
      'fill-opacity' => 0,
      'stroke'       => 'black',
      'stroke-width' => 1,
    }
  );

  my %col = ( R => 'red', G => 'green', B => 'blue' );
  #  my %col = ( G => 'green' );
  for my $file ( @file ) {
    while ( my ( $k, $col ) = each %col ) {
      plot_line( $svg, $xf, $data{$file}, "{$opt{sel}}{$k}", $col );
    }
  }

  return $svg;
}

sub common_prefix {
  my @s = @_;
  for my $pos ( 1 .. min( map length, @s ) - 1 ) {
    for my $s ( @s ) {
      return substr( $s, 0, $pos - 1 )
       unless substr( $s[0], 0, $pos ) eq substr( $s, 0, $pos );
    }
  }
  return '';
}

sub from_pairs {
  my ( $xf, @p ) = @_;
  my ( @xv, @yv );
  for ( @p ) {
    my ( $x, $y ) = $xf->( @$_ );
    push @xv, $x;
    push @yv, $y;
  }
  return ( x => \@xv, y => \@yv );
}

sub nice_ceil {
  my $n   = shift;
  my @seq = ( 2, 2.5, 2 );
  my $nn  = 0.001;
  while () {
    return $nn if $nn >= $n;
    my $factor = shift @seq;
    $nn *= $factor;
    push @seq, $factor;
  }
}

sub gg($) { eval qq{ sub { \$_[0]->$_[0] } } }

sub plot_line {
  my ( $svg, $xf, $data, $path, $col ) = @_;
  my ( $min, $max, $avg ) = map { gg $path . "{$_}" } qw( min max avg );
  if ( 1 ) {
    my @xv = ();
    my @yv = ();
    for ( my $x = 0; $x < @$data; $x++ ) {
      my ( $xx, $yy ) = $xf->( $x, $min->( $data->[$x] ) );
      push @xv, $xx;
      push @yv, $yy;
    }
    for ( my $x = @$data - 1; $x >= 0; $x-- ) {
      my ( $xx, $yy ) = $xf->( $x, $max->( $data->[$x] ) );
      push @xv, $xx;
      push @yv, $yy;
    }
    my $points = $svg->get_path(
      x       => \@xv,
      y       => \@yv,
      -type   => 'polygon',
      -closed => 'true'
    );
    $svg->polygon(
      %$points,
      style => {
        'fill-opacity'   => 0.2,
        'fill'           => $col,
        'stroke-opacity' => 0.2,
        'stroke'         => $col,
        'stroke-width'   => 1,
      }
    );
  }
  if ( 1 ) {
    my @xv = ();
    my @yv = ();
    for ( my $x = 0; $x < @$data; $x++ ) {
      my ( $xx, $yy ) = $xf->( $x, $avg->( $data->[$x] ) );
      push @xv, $xx;
      push @yv, $yy;
    }
    my $points = $svg->get_path(
      x       => \@xv,
      y       => \@yv,
      -type   => 'polyline',
      -closed => 'false'
    );
    $svg->polyline(
      %$points,
      style => {
        'fill-opacity' => 0,
        'stroke'       => $col,
        'stroke-width' => 1,
      }
    );
  }
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

sub type_of {
  return 'undefined' unless defined $_[0];
  return 'scalar' unless ref $_[0];
  return 'ref-' . type_of( ${ $_[0] } ) if 'REF' eq ref $_[0];
  return ref $_[0];
}

sub reduce_slice {
  my ( $cb, $ctx, @sl ) = @_;
  my %seen_type = ();
  $seen_type{ type_of( $_ ) }++ for @sl;
  my @ty = sort keys %seen_type;
  die "Multiple types: ", join( ', ', @ty ), "\n" if @ty > 1;
  my $ty = $ty[0];
  if ( $ty eq 'scalar' ) {
    $$ctx = $cb->( @sl );
  }
  elsif ( $ty eq 'HASH' ) {
    my %keys = ();
    for my $el ( @sl ) {
      $keys{$_}++ for keys %$el;
    }
    my $val = {};
    $$ctx = $val;
    for my $k ( keys %keys ) {
      reduce_slice( $cb, \$val->{$k},
        grep { defined } map { $_->{$k} } @sl );
    }
  }
  elsif ( $ty eq 'ARRAY' ) {
    my $max = max( map { scalar @$_ } @sl );
    my $val = [];
    $$ctx = $val;
    for ( my $i = 0; $i < $max; $i++ ) {
      reduce_slice( $cb, \$val->[$i],
        grep { defined } map { $_->[$i] } @sl );
    }
  }
}

sub reduce_data {
  my ( $data, $maxpt ) = @_;
  my $per = max( 1, int( @$data / $maxpt ) );
  my @out = ();
  my ( $dmin, $dmax );
  for ( my $pos = 0; $pos < @$data; $pos += $per ) {
    my $out = undef;
    my $lim = min( $pos + $per, scalar @$data );
    reduce_slice(
      sub {
        my @sl = @_;

        my ( $min, $max, $avg )
         = ( 0 + min( @sl ), 0 + max( @sl ), sum( @sl ) / @sl );
        $dmin = min( grep defined, $dmin, $min );
        $dmax = max( grep defined, $dmax, $max );

        return {
          min => $min,
          max => $max,
          avg => $avg,
        };
      },
      \$out,
      @{$data}[ $pos .. $lim - 1 ]
    );
    push @out, $out;
  }
  return ( $dmin, $dmax, \@out );
}

sub read_data {
  my $file = shift;
  my $csv  = Text::CSV_XS->new;
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

