package Data::Reshape;

use strict;
use warnings;

use Data::Find qw( diter );

use base qw( Exporter );

our @EXPORT_OK = qw( reshape );

=head1 NAME

Data::Reshape - Reshape a data structure

=cut

sub reshape(&$) {
  my ( $tr, $data ) = @_;
  my $out  = undef;
  my $iter = diter $data;

  while ( defined( my $path = $iter->() ) ) {
    local $_ = $path;
    $tr->();
    my $outpath = $_;
    eval "\$out->$outpath = \$data->$path";
  }

  return $out;
}

1;

# vim:ts=2:sw=2:sts=2:et:ft=perl
