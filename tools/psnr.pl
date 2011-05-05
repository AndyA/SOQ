#!/usr/bin/env perl

use strict;
use warnings;

use Getopt::Long;
use POSIX ":sys_wait_h";
use Path::Class;

use constant SOQ => './soq';

my %Opt = (
  size   => '1024x576',
  output => 'report.csv',
  mode   => 'ssim,psnr',
);

GetOptions(
  'size:s' => \$Opt{size},
  'o:s'    => \$Opt{output},
) or die "\n";

my @opt = grep { /^-/ } @ARGV;
my @arg = grep { !/^-/ } @ARGV;

my @mode = split /,/, $Opt{mode};

die "Usage: $0 --size <W>x<H> <refvid> <encvid>\n"
 unless @arg == 2;

my $data = psnr( @arg, @opt );
{
  print "Writing report to $Opt{output}\n";
  open my $fh, '>', $Opt{output}
   or die "Can't write $Opt{output}: $!\n";
  my @cols = ();
  for my $rec ( @$data ) {
    unless ( @cols ) {
      @cols = sort keys %$rec;
      print $fh csv( @cols ), "\n";
    }
    print $fh csv( @{$rec}{@cols} ), "\n";
  }
}

sub csv { join ',', map qq{"$_"}, @_ }

sub psnr {
  my ( $ref, $env, @opt ) = @_;
  my %child = ();
  my %work  = ();

  my $base = dir( "psnr-$$" );

  for my $vid ( $ref, $env ) {
    ( my $name = $vid ) =~ s/\W+/_/g;
    my $dir = dir( $base, $name );
    $dir->rmtree if -d "$dir";
    $dir->mkpath;
    my $out = file( $dir, '%08d.bmp' );
    my $log = file( $dir, 'ffmpeg.log' );
    $work{$vid} = "$out";

    my $pid = fork;
    die "Can't fork, won't fork: $!\n"
     unless defined $pid;

    if ( $pid ) {
      $child{$pid}++;
      next;
    }

    extract_to( $vid, $out );

    exit;
  }

  my @data = ();
  my $next = 1;
  CMP: while () {
    while ( ( my $gotpid = waitpid( -1, WNOHANG ) ) > 0 ) {
      print "Reaping $gotpid\n";
      delete $child{$gotpid};
    }
    my @f = grep { -f } map { sprintf $_, $next } @work{ $ref, $env };
    last CMP unless @f || keys %child;
    unless ( @f == 2 ) {
      last CMP unless keys %child;
      sleep 1;
      redo CMP;
    }

    my $rec = {};
    for my $mode ( @mode ) {
      my $rm = soq( "--$mode", @opt, @f );
      while ( my ( $k, $v ) = each %$rm ) {
        $rec->{"$mode.$k"} = $v;
      }
    }

    push @data, $rec;

    unlink for @f;
    $next++;
  }
  $base->rmtree;
  return \@data;
}

sub soq {
  my @cmd = ( SOQ, @_ );
  print join( ' ', @cmd ), "\n";
  my $rec = {};
  open my $ch, '-|', @cmd or die SOQ, " failed: $!\n";
  while ( <$ch> ) {
    chomp;
    /^(.+?):\s+(.+)$/ or die "Bad output: $_\n";
    $rec->{$1} = $2;
  }
  close $ch or die SOQ, " failed: $?\n";
  return $rec;
}

sub extract_to {
  my ( $vid, $out ) = @_;
  my @cmd = (
    'ffmpeg',
    -i => "$vid",
    -s => $Opt{size},
    -f => 'image2',
    "$out"
  );
  print join( ' ', @cmd ), "\n";
  system @cmd and die "ffmpeg failed: $?\n";
}

# vim:ts=2:sw=2:sts=2:et:ft=perl

