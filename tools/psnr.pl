#!/usr/bin/env perl

use strict;
use warnings;

use Data::Dumper;
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
  my %child  = ();
  my %work   = ();
  my %worker = ();

  my $base = dir( "psnr-$$" );

  for my $vid ( $ref, $env ) {
    ( my $name = $vid ) =~ s/\W+/_/g;
    my $dir = dir( $base, $name );
    $dir->rmtree if -d "$dir";
    $dir->mkpath;
    my $out     = file( $dir, '%08d.bmp' );
    my $log     = file( $dir, 'ffmpeg.log' );
    my $pidfile = file( $dir, 'ffmpeg.pid' );

    my $pid = fork;
    die "Can't fork, won't fork: $!\n"
     unless defined $pid;

    if ( $pid ) {
      $child{$pid}++;
      $worker{$vid} = {
        pidfile => "$pidfile",
        ppid    => $pid,
        state   => 'starting',
        out     => "$out",
      };
      next;
    }

    my $ffpid
     = extract_to( $vid, $out, file( $dir, 'ffmpeg.log' )->stringify );
    {
      open my $ph, '>', "$pidfile" or die "Can't write $pidfile: $!\n";
      print $ph "$ffpid\n";
    }
    wait;
    die "ffmpeg failed: $?" if $?;

    exit;
  }

  WAIT: {
    sleep 1;
    for my $w ( values %worker ) {
      if ( -f $w->{pidfile} ) {
        open my $ph, '<', $w->{pidfile}
         or die "Can't read ", $w->{pidfile}, ": $!\n";
        chomp( my $ffpid = <$ph> );
        $w->{pid}   = $ffpid;
        $w->{state} = 'running';
      }
    }
    redo WAIT if grep { !exists $_->{pid} } values %worker;
  }

  #  print Dumper( \%worker );

  my @data = ();
  my $next = 1;
  CMP: while () {
    while ( ( my $gotpid = waitpid( -1, WNOHANG ) ) > 0 ) {
      print "Reaping $gotpid\n";
      delete $child{$gotpid};
    }

    for my $vid ( $ref, $env ) {
      my $fn = sprintf $worker{$vid}{out}, $next + 50;
      if ( -f $fn && $worker{$vid}{state} eq 'running' ) {
        print "Pausing worker $worker{$vid}{pid}\n";
        kill STOP => $worker{$vid}{pid};
        $worker{$vid}{state} = 'stopped';
      }
    }

    my @f = grep { -f }
     map { sprintf $_->{out}, $next } @worker{ $ref, $env };
    last CMP unless @f || keys %child;
    unless ( @f == 2 ) {
      last CMP unless keys %child;
      for my $w ( values %worker ) {
        if ( $w->{state} ne 'running' ) {
          print "Resuming worker $w->{pid}\n";
          kill CONT => $w->{pid};
          $w->{state} = 'running';
        }
      }
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
  my ( $vid, $out, $log ) = @_;
  my @cmd = (
    'ffmpeg',
    -i => "$vid",
    -s => $Opt{size},
    -f => 'image2',
    "$out"
  );
  print join( ' ', @cmd ), "\n";
  my $pid = fork;
  die unless defined $pid;
  open STDERR, '>', $log or die "Can't write $log: $!\n";
  exec @cmd unless $pid;
  return $pid;
}

# vim:ts=2:sw=2:sts=2:et:ft=perl

