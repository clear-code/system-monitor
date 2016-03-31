Download link: https://addons.mozilla.org/firefox/addon/system-monitor/

# How to build XPI package

## Ubuntu 12.04LTS

 1. Install required packages.
    
        $ sudo aptitude install git zip
    
 2. Clone the git repository of System Monitor (and checkout a released version
    you want to build if needed).
    
        $ git clone git@github.com:clear-code/system-monitor.git
        $ git tag -l
        $ git checkout refs/tags/X.X.X
    
 3. Build it.
    
        $ cd system-monitor-X.X.X
        $ make
    

## Windows

 1. Install required softwares.
    * Cygwin ( http://www.cygwin.com/ ) with following packages:
      * make
      * zip
 2. Clone the git repository of System Monitor (and checkout a released version
    you want to build if needed).
 3. Start "Cygwin Bash Shell", and run start building process.
    
        $ cd ~/system-monitor-X.X.X
        $ make
    

## Mac OS X (32bit, Intel processor)

 1. Clone the git repository of System Monitor (and checkout a released version
    you want to build if needed).
 2. Build it.
    
        $ cd ~/system-monitor-X.X.X
        $ make
    

# How to change the version number?

The version number is defined in a configuration file "VERSION".
After you modify it, you need to do re-make like:

    $ make
