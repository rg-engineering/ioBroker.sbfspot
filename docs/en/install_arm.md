

First we need to install some packages:

>sudo apt-get update
>sudo apt-get --no-install-recommends install bluetooth libbluetooth-dev
>sudo apt-get install libboost-date-time-dev libboost-system-dev libboost-filesystem-dev libboost-regex-dev
>sudo apt-get install libboost-all-dev
>sudo apt-get install sqlite3 libsqlite3-dev


then check the existing users
>less /etc/passwd

user iobroker should be available

then we create some folders
>cd ~
>mkdir projects
>cd projects
>mkdir smadata
>mkdir SBFspot
>cd SBFspot

>sudo mkdir /var/log/sbfspot.3
>sudo chown -R iobroker:iobroker /var/log/sbfspot.3

and now we download the source code
we have two possibilities:

1. latest version
>git clone https://github.com/SBFspot/SBFspot .

2. released versions (here as a example version 3.6.0)
sbfspot_version=3.6.0
>wget –c https://github.com/SBFspot/SBFspot/archive/V$sbfspot_version.tar.gz
>tar -xvf V$sbfspot_version.tar.gz -C SBFspot --strip-components 1

then we start compilation and installation
>cd ~/projects/SBFspot/SBFspot
>make sqlite
>sudo make install_sqlite

we create a database
>cd ~/projects/smadata
>sqlite3 SBFspot.db < ~/projects/SBFspot/SBFspot/CreateSQLiteDB.sql

now we can test whether database is installed correctly
>sqlite3 SBFspot.db
>SQLite version 3.16.2 2017-01-06 16:32:41
>Enter ".help" for usage hints.
>sqlite> select * from config;
>SchemaVersion|1
>sqlite>.quit


finally we need to configure sbfspot

to do



in adapter admin we just need to set the path to database

/home/datalogger/projects/smadata/SBFspot.db