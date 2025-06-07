#!/bin/sh


#todo

#    Config Daten von außen übergebbar


cd ~
mkdir projects
cd projects

sudo apt update

sudo apt -y install make g++
sudo apt -y --no-install-recommends install bluetooth libbluetooth-dev
sudo apt -y install libboost-date-time-dev libboost-system-dev libboost-filesystem-dev libboost-regex-dev
sudo apt -y install libboost-all-dev

sudo apt -y install sqlite3 libsqlite3-dev

sudo mkdir /var/sbfspot.3
sudo mkdir /var/sbfspot.3/smadata
sudo mkdir /var/sbfspot.3/logs
sudo chown -R $USER:$USER /var/sbfspot.3/
sudo chmod -R 777 /var/sbfspot.3/


sudo apt -y install git
git clone https://github.com/SBFspot/SBFspot.git

cd SBFspot
git checkout tags/V3.9.12

cd ~/projects/SBFspot/SBFspot
make sqlite

sudo make install_sqlite


cd /usr/local/bin/sbfspot.3
sudo cp SBFspot.default.cfg SBFspot.cfg

sudo sed -i 's/BTAddress=00:00:00:00:00:00/BTAddress=01:01:01:01:01:01/' SBFspot.cfg

sudo sed -i 's/OutputPath=\/home\/pi\/smadata\/%Y/OutputPath=\/var\/sbfspot.3\/smadata\/%Y/' SBFspot.cfg
sudo sed -i 's/OutputPathEvents=\/home\/pi\/smadata\/%Y\/Events/OutputPathEvents=\/var\/sbfspot.3\/smadata\/%Y\/Events/' SBFspot.cfg
sudo sed -i 's/SQL_Database=\/home\/pi\/smadata\/SBFspot.db/SQL_Database=\/var\/sbfspot.3\/smadata\/SBFspot.db/' SBFspot.cfg


cd /usr/local/bin/sbfspot.3

sudo touch daydata
sudo chmod 775 daydata
sudo chown  $USER:$USER daydata

cat >> daydata << EOF
#!/bin/bash
#
log=/var/sbfspot.3/logs/MyPlant_$(date '+%Y%m%d').log
/usr/local/bin/sbfspot.3/SBFspot -v -ad1 -am0 -ae0 >>$log
EOF

sudo chmod +x daydata

sudo touch monthdata
sudo chmod 775 monthdata
sudo chown  $USER:$USER monthdata

cat >> monthdata << EOF
#!/bin/bash
#
log=/var/sbfspot.3/logs/MyPlant_$(date '+%Y%m').log
/usr/local/bin/sbfspot.3/SBFspot -v -sp0 -ad0 -am1 -ae1 -finq >>$log
EOF

sudo chmod +x monthdata

(crontab -l 2>/dev/null; echo "*/5 6-22 * * * /usr/local/bin/sbfspot.3/daydata") | crontab -
(crontab -l 2>/dev/null; echo "55 05 * * * /usr/local/bin/sbfspot.3/monthdata") | crontab -

cd /var/sbfspot.3/smadata
sqlite3 SBFspot.db < ~/projects/SBFspot/SBFspot/CreateSQLiteDB.sql

sudo apt -y install libcurl4-openssl-dev

cd ~/projects/SBFspot/SBFspotUploadDaemon
make sqlite

sudo make install_sqlite

cd /usr/local/bin/sbfspot.3
sudo cp SBFspotUpload.default.cfg SBFspotUpload.cfg

sudo sed -i 's/PVoutput_SID=/PVoutput_SID=123456789/' SBFspotUpload.cfg
sudo sed -i 's/PVoutput_Key=/PVoutput_Key=123456789/' SBFspotUpload.cfg

sudo sed -i 's/SQL_Database=\/home\/pi\/smadata\/SBFspot.db/SQL_Database=\/var\/sbfspot.3\/smadata\/SBFspot.db/' SBFspotUpload.cfg

sudo sed -i 's/LogDir=\/var\log\/sbfspot.3\//LogDir=\/var\/sbfspot.3\/logs\/' SBFspotUpload.cfg


cd /usr/local/bin/sbfspot.3/

sudo touch SBFspotUpload.service
sudo chmod 775 SBFspotUpload.service
sudo chown  $USER:$USER SBFspotUpload.service

cat >> SBFspotUpload.service << EOF
[Unit]
Description=SBFspot Upload Daemon
After=mysql.service mariadb.service network.target

[Service]
User=datalogger
Type=simple
TimeoutStopSec=10
ExecStart=/usr/local/bin/sbfspot.3/SBFspotUploadDaemon
Restart=on-success
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable /usr/local/bin/sbfspot.3/SBFspotUpload.service
sudo systemctl start SBFspotUpload
