/*
 * sbfspot adapter für iobroker
 *
 * Created: 15.09.2016 21:31:28
 *  Author: Rene

Copyright(C)[2016, 2017][René Glaß]



*/

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
//var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const utils = require('@iobroker/adapter-core');

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
//this is the old version without compact
//var adapter = utils.adapter('sbfspot');


//new version with compact
let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'sbfspot',
        ready: function () {
            try {
                //adapter.log.debug('start');
                main();
            } catch (e) {
                adapter.log.error('exception catch after ready [' + e + ']');
            }
        }
    });
    adapter = new utils.Adapter(options);


    var FirstValue4History;
    var FirstDate4History;
    var numOfInverters;

    //---------- sqlite
    // https://github.com/mapbox/node-sqlite3
    let sqlite_db;

    //---------- mySQL
    var mysql_connection;

    //Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
    /*adapter.on('message', function (obj) {
        if (obj) {
            switch (obj.command) {
                case 'send':
                    // e.g. send email or pushover or whatever
                    console.log('send command');

                    // Send response in callback if required
                    if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
                    break;

            }
        }
    });
    */

    // is called when adapter shuts down - callback has to be called under any circumstances!
    /*
    adapter.on('unload', function (callback) {
        try {
            adapter.log.debug('cleaned everything up...');
            callback();
        }
        catch (e) {
            callback();
        }
    });
    */

    // is called if a subscribed object changes
    /*
        adapter.on('objectChange', function (id, obj) {
        // Warning, obj can be null if it was deleted
        adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(obj));

        //feuert auch, wenn adapter im admin anghalten oder gestartet wird...

        if (obj == null && myPort != null) {
            myPort.close();
        }

    });
    */
    // is called if a subscribed state changes
    /*adapter.on('stateChange', function (id, state) {
        // Warning, state can be null if it was deleted
        adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

        // you can use the ack flag to detect if it is status (true) or command (false)
        if (state && !state.ack) {
            adapter.log.info('ack is not set!');
        }
    });
    */


    // is called when databases are connected and adapter received configuration.
    // start here!
    /*adapter.on('ready', function () {
        try {
            main();
        }
        catch (e) {
            adapter.log.error('exception catch after ready [' + e + ']');
        }
    });
    */


    function main() {

        if (typeof adapter.config.databasetype == 'undefined') {
            adapter.log.error("databasetype not defined. check and update settings and save");
            adapter.terminate ? adapter.terminate(11) : process.exit(11);
        }

        CheckInverterVariables();


        // force terminate after 1min
        // don't know why it does not terminate by itself...
        setTimeout(function () {
            adapter.log.warn('force terminate');
            //process.exit(0);
            adapter.terminate ? adapter.terminate(11) : process.exit(11);
        }, 60000);

        if (adapter.config.useBluetooth) {
            //here we use bluetooth or speedwire
            adapter.log.info("direct bluetooth connection not implemented yet");
        } else {


            DB_Connect(function () {
                setTimeout(function () {
                    //adapter.stop();
                    adapter.log.error('force terminate in connect');
                    adapter.terminate ? adapter.terminate(11) : process.exit(11);
                }, 6000);
            });
        }
    }

    function AddInverterVariables(serial) {

        adapter.setObjectNotExists(serial, {
            type: 'channel',
            role: 'inverter',
            common: {name: serial},
            native: {location: adapter.config.location}
        });

        adapter.setObjectNotExists(serial + '.Type', {
            type: 'state',
            common: {
                name: 'SMA inverter Serialnumber',
                type: 'string',
                role: 'serial',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.SerialNo'}
        });

        adapter.setObjectNotExists(serial + '.ETotal', {
            type: 'state',
            common: {
                name: 'SMA inverter Ertrag Total',
                type: 'number',
                role: 'ertrag',
                unit: 'Wh',
                read: true,
                write: false
            },
            native: {location: serial + '.ETotal'}
        });

        adapter.setObjectNotExists(serial + '.EToday', {
            type: 'state',
            common: {
                name: 'SMA inverter Ertrag Today',
                type: 'number',
                role: 'ertrag',
                unit: 'Wh',
                read: true,
                write: false
            },
            native: {location: serial + '.EToday'}
        });

        adapter.setObjectNotExists(serial + '.SW_Version', {
            type: 'state',
            common: {
                name: 'SMA inverter SW Version',
                type: 'string',
                role: 'version',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.SW_Version'}
        });

        adapter.setObjectNotExists(serial + '.TotalPac', {
            type: 'state',
            common: {
                name: 'SMA inverter Total P ac',
                type: 'number',
                role: 'ertrag',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.TotalPac'}
        });

        adapter.setObjectNotExists(serial + '.OperatingTime', {
            type: 'state',
            common: {
                name: 'SMA inverter Operating Time',
                type: 'number',
                role: 'ertrag',
                unit: 'h',
                read: true,
                write: false
            },
            native: {location: serial + '.OperatingTime'}
        });

        adapter.setObjectNotExists(serial + '.FeedInTime', {
            type: 'state',
            common: {
                name: 'SMA inverter Feed In Time',
                type: 'number',
                role: 'ertrag',
                unit: 'h',
                read: true,
                write: false
            },
            native: {location: serial + '.FeedInTime'}
        });

        adapter.setObjectNotExists(serial + '.Status', {
            type: 'state',
            common: {name: 'SMA inverter Status', type: 'string', role: 'ertrag', unit: '', read: true, write: false},
            native: {location: serial + '.FeedInTime'}
        });

        adapter.setObjectNotExists(serial + '.GridRelay', {
            type: 'state',
            common: {name: 'SMA inverter Status', type: 'string', role: 'ertrag', unit: '', read: true, write: false},
            native: {location: serial + '.GridRelay'}
        });

        adapter.setObjectNotExists(serial + '.Temperature', {
            type: 'state',
            common: {name: 'SMA inverter Status', type: 'number', role: 'ertrag', unit: '°C', read: true, write: false},
            native: {location: serial + '.Temperature'}
        });

        adapter.setObjectNotExists(serial + '.Pdc1', {
            type: 'state',
            common: {
                name: 'SMA inverter Power DC 1',
                type: 'number',
                role: 'ertrag',
                unit: 'W',
                read: true,
                write: false
            },
            native: {location: serial + '.Pdc1'}
        });
        adapter.setObjectNotExists(serial + '.Pdc2', {
            type: 'state',
            common: {
                name: 'SMA inverter Power DC 2',
                type: 'number',
                role: 'ertrag',
                unit: 'W',
                read: true,
                write: false
            },
            native: {location: serial + '.Pdc2'}
        });
        adapter.setObjectNotExists(serial + '.Idc1', {
            type: 'state',
            common: {
                name: 'SMA inverter Current DC 1',
                type: 'number',
                role: 'ertrag',
                unit: 'A',
                read: true,
                write: false
            },
            native: {location: serial + '.Idc1'}
        });
        adapter.setObjectNotExists(serial + '.Idc2', {
            type: 'state',
            common: {
                name: 'SMA inverter Current DC 2',
                type: 'number',
                role: 'ertrag',
                unit: 'A',
                read: true,
                write: false
            },
            native: {location: serial + '.Idc2'}
        });
        adapter.setObjectNotExists(serial + '.Udc1', {
            type: 'state',
            common: {
                name: 'SMA inverter Voltage DC 1',
                type: 'number',
                role: 'ertrag',
                unit: 'V',
                read: true,
                write: false
            },
            native: {location: serial + '.Udc1'}
        });
        adapter.setObjectNotExists(serial + '.Udc2', {
            type: 'state',
            common: {
                name: 'SMA inverter Voltage DC 2',
                type: 'number',
                role: 'ertrag',
                unit: 'V',
                read: true,
                write: false
            },
            native: {location: serial + '.Udc2'}
        });

        adapter.setObjectNotExists(serial + '.Pac1', {
            type: 'state',
            common: {
                name: 'SMA inverter Power AC 1',
                type: 'number',
                role: 'ertrag',
                unit: 'W',
                read: true,
                write: false
            },
            native: {location: serial + '.Pac1'}
        });
        adapter.setObjectNotExists(serial + '.Pac2', {
            type: 'state',
            common: {
                name: 'SMA inverter Power AC 2',
                type: 'number',
                role: 'ertrag',
                unit: 'W',
                read: true,
                write: false
            },
            native: {location: serial + '.Pac2'}
        });
        adapter.setObjectNotExists(serial + '.Pac3', {
            type: 'state',
            common: {
                name: 'SMA inverter Power AC 3',
                type: 'number',
                role: 'ertrag',
                unit: 'W',
                read: true,
                write: false
            },
            native: {location: serial + '.Pac3'}
        });
        adapter.setObjectNotExists(serial + '.Iac1', {
            type: 'state',
            common: {
                name: 'SMA inverter Current AC 1',
                type: 'number',
                role: 'ertrag',
                unit: 'A',
                read: true,
                write: false
            },
            native: {location: serial + '.Iac1'}
        });
        adapter.setObjectNotExists(serial + '.Iac2', {
            type: 'state',
            common: {
                name: 'SMA inverter Current AC 2',
                type: 'number',
                role: 'ertrag',
                unit: 'A',
                read: true,
                write: false
            },
            native: {location: serial + '.Iac2'}
        });
        adapter.setObjectNotExists(serial + '.Iac3', {
            type: 'state',
            common: {
                name: 'SMA inverter Current AC 3',
                type: 'number',
                role: 'ertrag',
                unit: 'A',
                read: true,
                write: false
            },
            native: {location: serial + '.Iac3'}
        });
        adapter.setObjectNotExists(serial + '.Uac1', {
            type: 'state',
            common: {
                name: 'SMA inverter Voltage AC 1',
                type: 'number',
                role: 'ertrag',
                unit: 'V',
                read: true,
                write: false
            },
            native: {location: serial + '.Uac1'}
        });
        adapter.setObjectNotExists(serial + '.Uac2', {
            type: 'state',
            common: {
                name: 'SMA inverter Voltage AC 2',
                type: 'number',
                role: 'ertrag',
                unit: 'V',
                read: true,
                write: false
            },
            native: {location: serial + '.Uac2'}
        });
        adapter.setObjectNotExists(serial + '.Uac3', {
            type: 'state',
            common: {
                name: 'SMA inverter Voltage AC 3',
                type: 'number',
                role: 'ertrag',
                unit: 'V',
                read: true,
                write: false
            },
            native: {location: serial + '.Uac3'}
        });

        adapter.setObjectNotExists(serial + '.Frequency', {
            type: 'state',
            common: {
                name: 'SMA inverter Frequency',
                type: 'number',
                role: 'ertrag',
                unit: 'Hz',
                read: true,
                write: false
            },
            native: {location: serial + '.Frequency'}
        });
        adapter.setObjectNotExists(serial + '.BT_Signal', {
            type: 'state',
            common: {
                name: 'SMA inverter BT_Signal',
                type: 'number',
                role: 'ertrag',
                unit: '%',
                read: true,
                write: false
            },
            native: {location: serial + '.BT_Signal'}
        });

        adapter.setObjectNotExists(serial + '.timestamp', {
            type: 'state',
            common: {
                name: 'SMA inverter timestamp',
                type: 'number',
                role: 'ertrag',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.timestamp'}
        });

        adapter.setObjectNotExists(serial + '.lastup', {
            type: 'state',
            common: {name: 'SMA inverter lastup', type: 'string', role: 'ertrag', unit: '', read: true, write: false},
            native: {location: serial + '.lastup'}
        });
        adapter.setObjectNotExists(serial + '.error', {
            type: 'state',
            common: {name: 'SMA inverter error', type: 'string', role: 'ertrag', unit: '', read: true, write: false},
            native: {location: serial + '.error'}
        });


        adapter.setObjectNotExists(serial + '.history.today', {
            type: 'state',
            common: {
                name: 'SMA inverter history today (JSON)',
                type: 'number',
                role: 'ertrag',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.history.today'}
        });

        adapter.setObjectNotExists(serial + '.history.last30Days', {
            type: 'state',
            common: {
                name: 'SMA inverter history last 30 days (JSON)',
                type: 'number',
                role: 'ertrag',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.history.last30Days'}
        });

        adapter.setObjectNotExists(serial + '.history.last12Months', {
            type: 'state',
            common: {
                name: 'SMA inverter history last 12 Months (JSON)',
                type: 'number',
                role: 'ertrag',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.history.last12Months'}
        });

        adapter.setObjectNotExists(serial + '.history.years', {
            type: 'state',
            common: {
                name: 'SMA inverter history years (JSON)',
                type: 'number',
                role: 'ertrag',
                unit: '',
                read: true,
                write: false
            },
            native: {location: serial + '.history.years'}
        });
    }

    function CheckInverterVariables() {

    }


    /*
    var rows =
        [
            {
                'Serial': 2000562095,
                'Name': 'SN: 2000562095',
                'Type': 'SB 2500',
                'SW_Version': '12.09.121.R',
                'TimeStamp': 1490635803,
                'TotalPac': 0,
                'EToday': 14,
                'ETotal': 18341,
                'OperatingTime': 34898.7,
                'FeedInTime': 29490.5,
                'Status': 'OK',
                'GridRelay': '?',
                'Temperature': 0
            }]

    rows[0].Serial

    */

    /*
    var rows = [
        {
            'TimeStamp': 1490714113,
            'Serial': 2000562095,
            'Pdc1': 561,
            'Pdc2': 0,
            'Idc1': 2.358,
            'Idc2': 0,
            'Udc1': 238,
            'Udc2': 0,
            'Pac1': 538,
            'Pac2': 0,
            'Pac3': 0,
            'Iac1': 2.281,
            'Iac2': 0,
            'Iac3': 0,
            'Uac1': 236,
            'Uac2': 0,
            'Uac3': 0,
            'EToday': 13906,
            'ETotal': 18355308,
            'Frequency': 50.05,
            'OperatingTime': 34909.2,
            'FeedInTime': 29500.3,
            'BT_Signal': 76.8627,
            'Status': 'OK',
            'GridRelay': '?',
            'Temperature': 0
        }]
    */


    function DB_Connect(cb) {

        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {

            //var express = require("express");
            var mysql = require('mysql');

            if (adapter.config.databasetype == 'MariaDB') {
                adapter.log.info("start with MariaDB");
                adapter.log.debug("--- connecting to " + adapter.config.sbfspotIP + " " + adapter.config.sbfspotPort + " " + adapter.config.sbfspotDatabasename);

                mysql_connection = mysql.createConnection({
                    host: adapter.config.sbfspotIP,
                    user: adapter.config.sbfspotUser,
                    port: adapter.config.sbfspotPort,
                    password: adapter.config.sbfspotPassword,
                    database: adapter.config.sbfspotDatabasename
                });

            } else {
                adapter.log.info("start with mySQL");
                adapter.log.debug("--- connecting to " + adapter.config.sbfspotIP + " " + adapter.config.sbfspotDatabasename);

                mysql_connection = mysql.createConnection({
                    host: adapter.config.sbfspotIP,
                    user: adapter.config.sbfspotUser,
                    password: adapter.config.sbfspotPassword,
                    database: adapter.config.sbfspotDatabasename
                });
            }

            mysql_connection.connect(function (err) {
                if (!err) {
                    adapter.log.debug("mySql Database is connected ... ");
                    DB_GetInverters();
                } else {
                    adapter.log.error("Error connecting mySql database ... " + err);

                    adapter.terminate ? adapter.terminate(11) : process.exit(11);
                }
            });
        } else {
            var sqlite3 = require('sqlite3').verbose();
            adapter.log.info("start with sqlite");
            //adapter.log.debug("--- connecting to " + adapter.config.sqlite_path);

            const path = require('path')
            const dbPath = path.resolve(__dirname, adapter.config.sqlite_path)

            adapter.log.debug("--- connecting to " + dbPath);

            sqlite_db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE,
                function (err) {
                    // error handling;
                    if (!err) {
                        adapter.log.debug("sqlite Database is connected ...");
                        DB_GetInverters();
                    } else {
                        adapter.log.error("Error while performing Query / connection ... " + err);

                        //adapter.terminate ? adapter.terminate() : process.exit(0);
                    }
                });


        }
        if (cb) cb();
    }

    function DB_GetInverters() {
        var query = 'SELECT * from Inverters';
        numOfInverters = 0;
        adapter.log.debug(query);
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            mysql_connection.query(query, function (err, rows, fields) {
                GetInverter(err, rows);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {

                GetInverter(err, rows);
            });
        }
    }

    function GetInverter(err, rows) {
        if (!err) {

            adapter.log.debug('rows ' + JSON.stringify(rows));

            if (rows.length > 0) {

                for (var i in rows) {


                    adapter.log.info("got data from " + rows[i].Type + " with ID " + rows[i].Serial);

                    AddInverterVariables(rows[i].Serial);

                    adapter.setState(rows[i].Serial + ".Type", {ack: true, val: rows[i].Type});
                    //adapter.setState( rows[i].Serial + ".EToday", { ack: true, val: rows[i].EToday }); this is kW
                    //adapter.setState(rows[i].Serial + ".ETotal", { ack: true, val: rows[i].ETotal }); this is kW
                    adapter.setState(rows[i].Serial + ".SW_Version", {ack: true, val: rows[i].SW_Version});
                    adapter.setState(rows[i].Serial + ".TotalPac", {ack: true, val: rows[i].TotalPac});
                    adapter.setState(rows[i].Serial + ".OperatingTime", {ack: true, val: rows[i].OperatingTime});
                    adapter.setState(rows[i].Serial + ".FeedInTime", {ack: true, val: rows[i].FeedInTime});
                    adapter.setState(rows[i].Serial + ".Status", {ack: true, val: rows[i].Status});
                    adapter.setState(rows[i].Serial + ".GridRelay", {ack: true, val: rows[i].GridRelay});
                    adapter.setState(rows[i].Serial + ".Temperature", {ack: true, val: rows[i].Temperature});
                    adapter.setState(rows[i].Serial + ".timestamp", {ack: true, val: rows[i].TimeStamp});


                    var oDate = new Date(rows[i].TimeStamp * 1000);
                    var nDate = oDate.getDate();
                    var nMonth = oDate.getMonth() + 1;
                    var nYear = oDate.getFullYear();
                    var nHours = oDate.getHours();
                    var nMinutes = oDate.getMinutes();
                    var nSeconds = oDate.getSeconds();
                    var sLastup = nDate + "." + nMonth + "." + nYear + " " + nHours + ":" + nMinutes + ":" + nSeconds

                    adapter.setState(rows[i].Serial + ".lastup", {ack: true, val: sLastup});

                    var oToday = new Date();
                    var sError = "none";
                    if (Math.abs(oDate.getTime() - oToday.getTime()) > (24 * 60 * 60 * 1000)) {

                        sError = "sbfspot no update since " + sLastup + " ";

                        adapter.log.debug(sError);
                    }
                    adapter.setState(rows[i].Serial + ".error", {ack: true, val: sError});

                    numOfInverters++;
                    DB_GetInvertersData(rows[i].Serial);
                }
            } else {
                //
                adapter.log.debug("no inverter data found");
                DB_AddDummyData();

            }

        } else {
            adapter.log.error('Error while performing Query in GetInverter. ' + err);

            //Schreibrechte auf den DB-Ordner???

        }

    }


    function DB_GetInvertersData(serial) {

        //SELECT * from SpotData  where Serial ='2000562095' ORDER BY TimeStamp DESC LIMIT 1
        var query = 'SELECT * from SpotData  where Serial =' + serial + ' ORDER BY TimeStamp DESC LIMIT 1';
        adapter.log.debug(query);
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            //we only get one row = last one
            mysql_connection.query(query, function (err, rows, fields) {
                GetInverterData(err, rows, serial);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {
                GetInverterData(err, rows, serial);
            });
        }
    }

    function GetInverterData(err, rows, serial) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            for (var i in rows) {
                //must only be one row...

                // check if it is really today, otherwise set to zero
                var oDate = new Date(rows[i].TimeStamp * 1000);
                var nDay = oDate.getDate();
                var nMonth = oDate.getMonth() + 1;
                var nYear = oDate.getFullYear();

                var oDateToday = new Date();
                var nDayToday = oDateToday.getDate();
                var nMonthToday = oDateToday.getMonth() + 1;
                var nYearToday = oDateToday.getFullYear();


                adapter.setState(rows[i].Serial + ".Pdc1", {ack: true, val: rows[i].Pdc1});
                adapter.setState(rows[i].Serial + ".Pdc2", {ack: true, val: rows[i].Pdc2});
                adapter.setState(rows[i].Serial + ".Idc1", {ack: true, val: rows[i].Idc1});
                adapter.setState(rows[i].Serial + ".Idc2", {ack: true, val: rows[i].Idc2});
                adapter.setState(rows[i].Serial + ".Udc1", {ack: true, val: rows[i].Udc1});
                adapter.setState(rows[i].Serial + ".Udc2", {ack: true, val: rows[i].Udc2});

                adapter.setState(rows[i].Serial + ".Pac1", {ack: true, val: rows[i].Pac1});
                adapter.setState(rows[i].Serial + ".Pac2", {ack: true, val: rows[i].Pac2});
                adapter.setState(rows[i].Serial + ".Pac3", {ack: true, val: rows[i].Pac3});
                adapter.setState(rows[i].Serial + ".Iac1", {ack: true, val: rows[i].Iac1});
                adapter.setState(rows[i].Serial + ".Iac2", {ack: true, val: rows[i].Iac2});
                adapter.setState(rows[i].Serial + ".Iac3", {ack: true, val: rows[i].Iac3});
                adapter.setState(rows[i].Serial + ".Uac1", {ack: true, val: rows[i].Uac1});
                adapter.setState(rows[i].Serial + ".Uac2", {ack: true, val: rows[i].Uac2});
                adapter.setState(rows[i].Serial + ".Uac3", {ack: true, val: rows[i].Uac3});


                adapter.log.debug("### " + nDay + "." + nMonth + "." + nYear + " = " + nDayToday + "." + nMonthToday + "." + nYearToday);

                if (nDay == nDayToday && nMonth == nMonthToday && nYear == nYearToday) {
                    adapter.setState(rows[i].Serial + ".EToday", {ack: true, val: rows[i].EToday});
                } else {
                    adapter.setState(rows[i].Serial + ".EToday", {ack: true, val: 0});
                }
                adapter.setState(rows[i].Serial + ".ETotal", {ack: true, val: rows[i].ETotal});
                adapter.setState(rows[i].Serial + ".Frequency", {ack: true, val: rows[i].Frequency});
                adapter.setState(rows[i].Serial + ".BT_Signal", {ack: true, val: rows[i].BT_Signal});
            }

            //to do
            DB_CalcHistory_LastMonth(serial)
            //DB_Disconnect();
        } else {
            adapter.log.error('Error while performing Query in GetInverterData. ' + err);
        }
    }


    function DB_CalcHistory_LastMonth(serial) {

        //täglich im aktuellen Monat
        //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1501542000 AND TimeStamp<= 1504133999 Group By from_unixtime(TimeStamp, '%Y-%m-%d')
        //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1500406746112 AND TimeStamp<= 1502998746112 Group By from_unixtime(TimeStamp, '%Y-%m-%d')

        //füy mySQL:
        //SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y')
        //für sqlite
        //SELECT  strftime('%Y-%m-%d ', datetime(TimeStamp, 'unixepoch')) as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1511859131.474 AND TimeStamp<= 1514451131.474 Group By strftime('%Y-%m-%d ', datetime(TimeStamp, 'unixepoch'))

        var dateto = new Date(); //today
        var datefrom = new Date();
        datefrom.setDate(datefrom.getDate() - 30);
        //adapter.log.debug('from ' + datefrom.toDateString() + " to " + dateto.toDateString());
        //gettime gives milliseconds!!

        var query = "";
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            query = "SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%Y-%m-%d')";
        } else {
            query = "SELECT strftime('%Y-%m-%d', datetime(TimeStamp, 'unixepoch')) as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By strftime('%Y-%m-%d', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            mysql_connection.query(query, function (err, rows, fields) {

                CalcHistory_LastMonth(err, rows, serial);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {

                CalcHistory_LastMonth(err, rows, serial);
            });
        }
        ;
    }

    function CalcHistory_LastMonth(err, rows, serial) {

        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            //rows[{ "date": "2017-07-19", "ertrag": 12259 }, { "date": "2017-07-20", "ertrag": 9905 }, { "date": "2017-07-21", "ertrag": 12991 }, { "date": "2017-07-22", "ertrag": 9292 }, { "date": "2017-07-23", "ertrag": 7730 }, {


            var oLastDays = [];
            var daydata = {};

            for (var i in rows) {

                var data = rows[i];

                oLastDays.push({
                    "date": data["date"],
                    "value": data["ertrag"]
                });
                //adapter.log.debug(JSON.stringify(oLastDays));

            }

            adapter.setState(serial + '.history.last30Days', {ack: true, val: JSON.stringify(oLastDays)});

            DB_CalcHistory_Prepare(serial);
        } else {
            adapter.log.error('Error while performing Query in CalcHistory_LastMonth. ' + err);
        }

    }


    function DB_CalcHistory_Prepare(serial) {

        var dateto = new Date(); //today

        //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, ETotal  FROM `SpotData` ORDER by `TimeStamp` ASC LIMIT  1
        var query = "";
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            query = "SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, ETotal  FROM `SpotData` WHERE `Serial` = '" + serial + "' ORDER by `TimeStamp` ASC LIMIT  1";
        } else {
            query = "SELECT strftime('%Y-%m-%d', datetime(TimeStamp, 'unixepoch')) as date, ETotal  FROM `SpotData` WHERE `Serial` = '" + serial + "' ORDER by `TimeStamp` ASC LIMIT  1";
        }
        adapter.log.debug(query);

        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Prepare(err, rows, serial);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Prepare(err, rows, serial);
            });
        }
    }

    function CalcHistory_Prepare(err, rows, serial) {
        if (!err) {
            adapter.log.debug('prepare: rows ' + JSON.stringify(rows));

            for (var i in rows) {

                var data = rows[i];

                FirstValue4History = data["ETotal"];
                FirstDate4History = data["date"];

                adapter.log.debug(FirstDate4History + " " + FirstValue4History);
            }

            DB_CalcHistory_Today(serial);
        } else {
            adapter.log.error('Error while performing Query in CalcHistory_Prepare. ' + err);
        }
    }


    function DB_CalcHistory_Today(serial) {

        var dateto = new Date(); //today

        var datefrom = new Date();
        datefrom.setHours(0);
        datefrom.setMinutes(0);
        //adapter.log.debug('from ' + datefrom.toDateString() + " to " + dateto.toDateString());
        //gettime gives milliseconds!!

        var query = "";
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            query = "SELECT from_unixtime(TimeStamp, '%H:%i') as time, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%H:%i')";
        } else {
            query = "SELECT strftime('%H:%m', datetime(TimeStamp, 'unixepoch')) as time, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By strftime('%H-%i', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Today(err, rows, serial);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Today(err, rows, serial);
            });

        }
    }

    function CalcHistory_Today(err, rows, serial) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            var oLastDays = [];
            //var daydata = {};

            for (var i in rows) {

                var data = rows[i];

                oLastDays.push({
                    "time": data["time"],
                    "value": data["ertrag"]
                });
                //adapter.log.debug(JSON.stringify(oLastDays));
            }

            adapter.setState(serial + '.history.today', {ack: true, val: JSON.stringify(oLastDays)});

            DB_CalcHistory_Years(serial);
        } else {
            adapter.log.error('Error while performing Query in CalcHistory_Today. ' + err);
        }
    }


    function DB_CalcHistory_Years(serial) {
        //SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y')

        var query = "";
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            query = "SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag, Min(`ETotal`) as startertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' Group By from_unixtime(TimeStamp, '%Y')";
        } else {
            query = "SELECT strftime('%Y', datetime(TimeStamp, 'unixepoch')) as date, Max(`ETotal`) as ertrag, Min(`ETotal`) as startertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' Group By strftime('%Y', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Years(err, rows, serial);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Years(err, rows, serial);
            });

        }
    }


    function CalcHistory_Years(err, rows, serial) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            var oLastYears = [];
            //var yeardata = {};

            var installdate = new Date(adapter.config.install_date);
            var firstvaluedate = new Date(FirstDate4History);

            //adapter.log.debug("------ " + installdate.toDateString() + " " + firstvaluedate.toDateString());
            //adapter.log.debug("------ " + installdate.getUTCFullYear() + " < " + firstvaluedate.getUTCFullYear());

            var installyear = installdate.getUTCFullYear();
            var firstyear = true;
            var yearvalue = 0;
            for (var i in rows) {

                var data = rows[i];

                if (installdate.getUTCFullYear() < firstvaluedate.getUTCFullYear() && firstyear == true) {

                    var diffyears = firstvaluedate.getUTCFullYear() - installdate.getUTCFullYear();

                    var monthoffirstyear = 12 - installdate.getUTCMonth();
                    var monthoflastyear = firstvaluedate.getUTCMonth();
                    var months = monthoffirstyear + monthoflastyear + (diffyears - 1) * 12;

                    //adapter.log.debug("---- " + monthoffirstyear + " " + monthoflastyear);
                    var valuepermonth = FirstValue4History / months;

                    //adapter.log.debug("++++ yeardiff " + diffyears + " monthdiff " + months + " value per month " + valuepermonth);


                    for (var n = 0; n <= diffyears; n++) {

                        if (n == 0) {
                            yearvalue += monthoffirstyear * valuepermonth;
                        } else if (n == (diffyears)) {
                            yearvalue += monthoflastyear * valuepermonth + data["ertrag"] - data["startertrag"];

                            //adapter.log.debug("???? " + monthoflastyear + " " + data["ertrag"] + " " + data["startertrag"]);

                        } else {
                            yearvalue += 12 * valuepermonth;
                        }

                        adapter.log.debug((installyear + n) + " " + yearvalue);

                        oLastYears.push({
                            "year": installyear + n,
                            "value": parseInt(yearvalue)
                        });
                    }

                    /*
                    oLastYears.push({
                        "year": data["date"],
                        "value": data["ertrag"]
                    });
                    */
                } else {
                    yearvalue = data["ertrag"];
                    oLastYears.push({
                        "year": data["date"],
                        "value": yearvalue
                    });
                }
                firstyear = false;

            }
            adapter.log.debug(JSON.stringify(oLastYears));
            adapter.setState(serial + '.history.years', {ack: true, val: JSON.stringify(oLastYears)});

            DB_CalcHistory_Months(serial);
        } else {
            adapter.log.error('Error while performing Query in CalcHistory_Years. ' + err);
        }
    }

    function DB_CalcHistory_Months(serial) {

        var dateto = new Date(); //today

        var datefrom = new Date();
        datefrom.setHours(0);
        datefrom.setMinutes(0);

        datefrom.setFullYear(dateto.getFullYear() - 1);
        datefrom.setDate(1);

        //adapter.log.debug('DB_CalcHistory_Months: from ' + datefrom.toDateString() + " to " + dateto.toDateString());

        //SELECT from_unixtime(TimeStamp, '%Y-%m') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y-%m')

        var query = "";
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            query = "SELECT from_unixtime(TimeStamp, '%Y-%m') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%Y-%m')";
        } else {
            query = "SELECT strftime('%Y-%m', datetime(TimeStamp, 'unixepoch')) as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By strftime('%Y-%m', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Months(err, rows, serial);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Months(err, rows, serial);
            });

        }
    }

    function CalcHistory_Months(err, rows, serial) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            var oLastMonth = [];
            //var monthdata = {};

            for (var i in rows) {

                var data = rows[i];

                oLastMonth.push({
                    "month": data["date"],
                    "value": data["ertrag"]
                });
                //adapter.log.debug(JSON.stringify(oLastDays));
            }

            adapter.setState(serial + '.history.last12Months', {ack: true, val: JSON.stringify(oLastMonth)});

            DB_Disconnect();
        } else {
            adapter.log.error('Error while performing Query in CalcHistory_Months. ' + err);
        }
    }

    function DB_AddDummyData() {
        adapter.log.debug("add dummy data");

        //INSERT INTO`Inverters`(`Serial`, `Name`, `Type`, `SW_Version`, `TimeStamp`, `TotalPac`, `EToday`, `ETotal`, `OperatingTime`, `FeedInTime`, `Status`, `GridRelay`, `Temperature`) VALUES([value - 1], [value - 2], [value - 3], [value - 4], [value - 5], [value - 6], [value - 7], [value - 8], [value - 9], [value - 10], [value - 11], [value - 12], [value - 13])
        var query = "";
        query = "INSERT INTO`Inverters`(`Serial`, `Name`, `Type`, `SW_Version`, `TimeStamp`, `TotalPac`,"
        query += " `EToday`, `ETotal`, `OperatingTime`, `FeedInTime`, `Status`, `GridRelay`, `Temperature`) VALUES(";
        query += " 12345678, `SN: 1234567`, `SB Dummy`, `0.0` , 1548776704 , 0 ,";
        query += " 3, 3512, 50, 45, `okay`,  `?`, 37 ";
        query += ")";

        adapter.log.debug(query);
        if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
            mysql_connection.query(query, function (err, result) {

                if (err) {

                }

                adapter.terminate ? adapter.terminate(11) : process.exit(11);
            });
        } else {
            sqlite_db.all(query, function (err, rows) {

                if (err) {

                }

                adapter.terminate ? adapter.terminate(11) : process.exit(11);
            });

        }


    }

    function DB_Disconnect() {

        numOfInverters--;
        // wait for all data paths... last data path will close connection

        if (numOfInverters == 0) {
            adapter.log.debug("disconnect database");
            if (adapter.config.databasetype == 'mySQL' || adapter.config.databasetype == 'MariaDB') {
                mysql_connection.end();
            } else {
                sqlite_db.close();
            }

            adapter.log.info("all done ... ");

            adapter.terminate ? adapter.terminate(11) : process.exit(11);

        } else {
            adapter.log.debug("need to wait for disconnect");
        }
    }

    return adapter;
};

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
