{ pkgs }: {
  deps = [
    pkgs.util-linux
    pkgs.bashInteractive
    pkgs.nodePackages.bash-language-server
    pkgs.man
  ];
}