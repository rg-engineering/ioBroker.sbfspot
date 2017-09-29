/*
 * homecontrol adapter für iobroker
 *
 * Created: 15.09.2016 21:31:28
 *  Author: Rene

Copyright(C)[2016, 2017][René Glaß]



*/

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils


// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.adapter('sbfspot');


//Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
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

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.debug('cleaned everything up...');
        callback();
    }
    catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(obj));

    //feuert auch, wenn adapter im admin anghalten oder gestartet wird...

    if (obj == null && myPort != null) {
        myPort.close();
    }

});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});



// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    try {
        main();
    }
    catch (e) {
        adapter.log.error('exception catch after ready [' + e + ']');
    }
});

function main() {

    if (typeof adapter.config.databasetype == 'undefined') {
        adapter.log.info("databasetype not defined. check settings and save");
        adapter.config.databasetype = "mySQL";
    }

    CheckInverterVariables();


    // force terminate after 1min
    // don't know why it does not terminate by itself...
    setTimeout(function () {
        adapter.log.warn('force terminate');
        process.exit(0);
    }, 60000);

    if (adapter.config.useBluetooth) {
        //here we use bluetooth or speedwire
        adapter.log.info("direct bluetooth connection not implenented yet");
    }
    else if (adapter.config.databasetype == 'mySQL') {

        adapter.log.info("start with mySQL");
        DB_Connect(function () {
            setTimeout(function () {
                adapter.stop();
            }, 6000);
        });
    }
    else {
        // here we use sqlite

        adapter.log.info("start with sqlite");

        DB_sqlite_Connect(function () {
            setTimeout(function () {
                adapter.stop();
            }, 6000);
        });
    }
    

}





function AddInverterVariables(serial) {
    /*
    adapter.setObjectNotExists('SMA_inverter', {
        type: 'channel',
        role: 'inverter',
        common: { name: 'SMA inverter' },
        native: { location: adapter.config.location }
    });
    */
    adapter.setObjectNotExists(serial, {
        type: 'channel',
        role: 'inverter',
        common: { name: serial },
        native: { location: adapter.config.location }
    });

    adapter.setObjectNotExists( serial+'.Type', {
        type: 'state',
        common: { name: 'SMA inverter Serialnumber', type: 'string', role: 'serial', unit: '', read: true, write: false },
        native: { location:  serial + '.SerialNo'}
    });

    adapter.setObjectNotExists( serial + '.ETotal', {
        type: 'state',
        common: { name: 'SMA inverter Ertrag Total', type: 'number', role: 'ertrag', unit: 'W', read: true, write: false },
        native: { location:  serial + '.ETotal' }
    });

    adapter.setObjectNotExists( serial + '.EToday', {
        type: 'state',
        common: { name: 'SMA inverter Ertrag Today', type: 'number', role: 'ertrag', unit: 'W', read: true, write: false },
        native: { location:  serial + '.EToday' }
    });

    adapter.setObjectNotExists(serial + '.SW_Version', {
        type: 'state',
        common: { name: 'SMA inverter SW Version', type: 'string', role: 'version', unit: '', read: true, write: false },
        native: { location: serial + '.SW_Version' }
    });

    adapter.setObjectNotExists(serial + '.TotalPac', {
        type: 'state',
        common: { name: 'SMA inverter Total P ac', type: 'number', role: 'ertrag', unit: '', read: true, write: false },
        native: { location: serial + '.TotalPac' }
    });

    adapter.setObjectNotExists(serial + '.OperatingTime', {
        type: 'state',
        common: { name: 'SMA inverter Operating Time', type: 'number', role: 'ertrag', unit: 'h', read: true, write: false },
        native: { location: serial + '.OperatingTime' }
    });

    adapter.setObjectNotExists(serial + '.FeedInTime', {
        type: 'state',
        common: { name: 'SMA inverter Feed In Time', type: 'number', role: 'ertrag', unit: 'h', read: true, write: false },
        native: { location: serial + '.FeedInTime' }
    });

    adapter.setObjectNotExists(serial + '.Status', {
        type: 'state',
        common: { name: 'SMA inverter Status', type: 'string', role: 'ertrag', unit: '', read: true, write: false },
        native: { location: serial + '.FeedInTime' }
    });

    adapter.setObjectNotExists(serial + '.GridRelay', {
        type: 'state',
        common: { name: 'SMA inverter Status', type: 'string', role: 'ertrag', unit: '', read: true, write: false },
        native: { location: serial + '.GridRelay' }
    });

    adapter.setObjectNotExists(serial + '.Temperature', {
        type: 'state',
        common: { name: 'SMA inverter Status', type: 'number', role: 'ertrag', unit: '°C', read: true, write: false },
        native: { location: serial + '.Temperature' }
    });

    adapter.setObjectNotExists(serial + '.Pdc1', {
        type: 'state',
        common: { name: 'SMA inverter Power DC 1', type: 'number', role: 'ertrag', unit: 'W', read: true, write: false },
        native: { location: serial + '.Pdc1' }
    });
    adapter.setObjectNotExists(serial + '.Pdc2', {
        type: 'state',
        common: { name: 'SMA inverter Power DC 2', type: 'number', role: 'ertrag', unit: 'W', read: true, write: false },
        native: { location: serial + '.Pdc2' }
    });
    adapter.setObjectNotExists(serial + '.Idc1', {
        type: 'state',
        common: { name: 'SMA inverter Current DC 1', type: 'number', role: 'ertrag', unit: 'A', read: true, write: false },
        native: { location: serial + '.Idc1' }
    });
    adapter.setObjectNotExists(serial + '.Idc2', {
        type: 'state',
        common: { name: 'SMA inverter Current DC 2', type: 'number', role: 'ertrag', unit: 'A', read: true, write: false },
        native: { location: serial + '.Idc2' }
    });
    adapter.setObjectNotExists(serial + '.Udc1', {
        type: 'state',
        common: { name: 'SMA inverter Voltage DC 1', type: 'number', role: 'ertrag', unit: 'V', read: true, write: false },
        native: { location: serial + '.Udc1' }
    });
    adapter.setObjectNotExists(serial + '.Udc2', {
        type: 'state',
        common: { name: 'SMA inverter Voltage DC 2', type: 'number', role: 'ertrag', unit: 'V', read: true, write: false },
        native: { location: serial + '.Udc2' }
    });


    adapter.setObjectNotExists(serial + '.Pac1', {
        type: 'state',
        common: { name: 'SMA inverter Power AC 1', type: 'number', role: 'ertrag', unit: 'W', read: true, write: false },
        native: { location: serial + '.Pac1' }
    });
    adapter.setObjectNotExists(serial + '.Pac2', {
        type: 'state',
        common: { name: 'SMA inverter Power AC 2', type: 'number', role: 'ertrag', unit: 'W', read: true, write: false },
        native: { location: serial + '.Pac2' }
    });
    adapter.setObjectNotExists(serial + '.Pac3', {
        type: 'state',
        common: { name: 'SMA inverter Power AC 3', type: 'number', role: 'ertrag', unit: 'W', read: true, write: false },
        native: { location: serial + '.Pac3' }
    });
    adapter.setObjectNotExists(serial + '.Iac1', {
        type: 'state',
        common: { name: 'SMA inverter Current AC 1', type: 'number', role: 'ertrag', unit: 'A', read: true, write: false },
        native: { location: serial + '.Iac1' }
    });
    adapter.setObjectNotExists(serial + '.Iac2', {
        type: 'state',
        common: { name: 'SMA inverter Current AC 2', type: 'number', role: 'ertrag', unit: 'A', read: true, write: false },
        native: { location: serial + '.Iac2' }
    });
    adapter.setObjectNotExists(serial + '.Iac3', {
        type: 'state',
        common: { name: 'SMA inverter Current AC 3', type: 'number', role: 'ertrag', unit: 'A', read: true, write: false },
        native: { location: serial + '.Iac3' }
    });
    adapter.setObjectNotExists(serial + '.Uac1', {
        type: 'state',
        common: { name: 'SMA inverter Voltage AC 1', type: 'number', role: 'ertrag', unit: 'V', read: true, write: false },
        native: { location: serial + '.Uac1' }
    });
    adapter.setObjectNotExists(serial + '.Uac2', {
        type: 'state',
        common: { name: 'SMA inverter Voltage AC 2', type: 'number', role: 'ertrag', unit: 'V', read: true, write: false },
        native: { location: serial + '.Uac2' }
    });
    adapter.setObjectNotExists(serial + '.Uac3', {
        type: 'state',
        common: { name: 'SMA inverter Voltage AC 3', type: 'number', role: 'ertrag', unit: 'V', read: true, write: false },
        native: { location: serial + '.Uac3' }
    });

    adapter.setObjectNotExists(serial + '.Frequency', {
        type: 'state',
        common: { name: 'SMA inverter Frequency', type: 'number', role: 'ertrag', unit: 'Hz', read: true, write: false },
        native: { location: serial + '.Frequency' }
    });
    adapter.setObjectNotExists(serial + '.BT_Signal', {
        type: 'state',
        common: { name: 'SMA inverter BT_Signal', type: 'number', role: 'ertrag', unit: '%', read: true, write: false },
        native: { location: serial + '.BT_Signal' }
    });

    adapter.setObjectNotExists(serial + '.history.today', {
        type: 'state',
        common: { name: 'SMA inverter history today (JSON)', type: 'number', role: 'ertrag', unit: '', read: true, write: false },
        native: { location: serial + '.history.today' }
    });

    adapter.setObjectNotExists(serial + '.history.last30Days', {
        type: 'state',
        common: { name: 'SMA inverter history last 30 days (JSON)', type: 'number', role: 'ertrag', unit: '', read: true, write: false },
        native: { location: serial + '.history.last30Days' }
    });

    adapter.setObjectNotExists(serial + '.history.last12Months', {
        type: 'state',
        common: { name: 'SMA inverter history last 12 Months (JSON)', type: 'number', role: 'ertrag', unit: '', read: true, write: false },
        native: { location: serial + '.history.last12Months' }
    });

    adapter.setObjectNotExists(serial + '.history.years', {
        type: 'state',
        common: { name: 'SMA inverter history years (JSON)', type: 'number', role: 'ertrag', unit: '', read: true, write: false },
        native: { location: serial + '.history.years' }
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

//*****************************************************************************************************************
// mySQL
//
//

//these function are used for connection to mySQL database filled by sbfspot


var mysql_connection;

function DB_Connect(cb) {
    //var express = require("express");
    var mysql = require('mysql');
    mysql_connection = mysql.createConnection({
        host: adapter.config.sbfspotIP,
        user: adapter.config.sbfspotUser,
        password: adapter.config.sbfspotPassword,
        database: adapter.config.sbfspotDatabasename
    });


    mysql_connection.connect(function (err) {
        if (!err) {
            adapter.log.debug("mySql Database is connected ... ");
            DB_GetInverters();
        } else {
            adapter.log.error("Error connecting mySql database ... ");
        }
    });

    if (cb) cb();
}

function DB_GetInverters() {
    var query = 'SELECT * from Inverters';
    adapter.log.debug(query);
    mysql_connection.query(query, function (err, rows, fields) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));


            for (var i in rows) {
                adapter.log.info("got data from " + rows[0].Type + " " + rows[0].Serial);

                AddInverterVariables(rows[i].Serial);

                adapter.setState(rows[i].Serial + ".Type", { ack: true, val: rows[0].Type });
                //adapter.setState( rows[i].Serial + ".EToday", { ack: true, val: rows[0].EToday }); this is kW
                //adapter.setState(rows[i].Serial + ".ETotal", { ack: true, val: rows[0].ETotal }); this is kW
                adapter.setState(rows[i].Serial + ".SW_Version", { ack: true, val: rows[0].SW_Version });
                adapter.setState(rows[i].Serial + ".TotalPac", { ack: true, val: rows[0].TotalPac });
                adapter.setState(rows[i].Serial + ".OperatingTime", { ack: true, val: rows[0].OperatingTime });
                adapter.setState(rows[i].Serial + ".FeedInTime", { ack: true, val: rows[0].FeedInTime });
                adapter.setState(rows[i].Serial + ".Status", { ack: true, val: rows[0].Status });
                adapter.setState(rows[i].Serial + ".GridRelay", { ack: true, val: rows[0].GridRelay });
                adapter.setState(rows[i].Serial + ".Temperature", { ack: true, val: rows[0].Temperature });

                DB_GetInvertersData(rows[i].Serial);
            }
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });
}

function DB_GetInvertersData(serial) {

    //SELECT * from SpotData  where Serial ='2000562095' ORDER BY TimeStamp DESC LIMIT 1
    var query = 'SELECT * from SpotData  where Serial =' + serial + ' ORDER BY TimeStamp DESC LIMIT 1';
    adapter.log.debug(query);
    mysql_connection.query(query, function (err, rows, fields) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            //should only be one row...
            adapter.setState(rows[0].Serial + ".Pdc1", { ack: true, val: rows[0].Pdc1 });
            adapter.setState(rows[0].Serial + ".Pdc2", { ack: true, val: rows[0].Pdc2 });
            adapter.setState(rows[0].Serial + ".Idc1", { ack: true, val: rows[0].Idc1 });
            adapter.setState(rows[0].Serial + ".Idc2", { ack: true, val: rows[0].Idc2 });
            adapter.setState(rows[0].Serial + ".Udc1", { ack: true, val: rows[0].Udc1 });
            adapter.setState(rows[0].Serial + ".Udc2", { ack: true, val: rows[0].Udc2 });

            adapter.setState(rows[0].Serial + ".Pac1", { ack: true, val: rows[0].Pac1 });
            adapter.setState(rows[0].Serial + ".Pac2", { ack: true, val: rows[0].Pac2 });
            adapter.setState(rows[0].Serial + ".Pac3", { ack: true, val: rows[0].Pac3 });
            adapter.setState(rows[0].Serial + ".Iac1", { ack: true, val: rows[0].Iac1 });
            adapter.setState(rows[0].Serial + ".Iac2", { ack: true, val: rows[0].Iac2 });
            adapter.setState(rows[0].Serial + ".Iac3", { ack: true, val: rows[0].Iac3 });
            adapter.setState(rows[0].Serial + ".Uac1", { ack: true, val: rows[0].Uac1 });
            adapter.setState(rows[0].Serial + ".Uac2", { ack: true, val: rows[0].Uac2 });
            adapter.setState(rows[0].Serial + ".Uac3", { ack: true, val: rows[0].Uac3 });

            adapter.setState(rows[0].Serial + ".EToday", { ack: true, val: rows[0].EToday });
            adapter.setState(rows[0].Serial + ".ETotal", { ack: true, val: rows[0].ETotal });
            adapter.setState(rows[0].Serial + ".Frequency", { ack: true, val: rows[0].Frequency });
            adapter.setState(rows[0].Serial + ".BT_Signal", { ack: true, val: rows[0].BT_Signal });

            DB_CalcHistory_LastMonth(serial)
            //DB_Disconnect();
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });
}

function DB_CalcHistory_LastMonth(serial) {

    //täglich im aktuellen Monat
    //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1501542000 AND TimeStamp<= 1504133999 Group By from_unixtime(TimeStamp, '%Y-%m-%d')
    //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1500406746112 AND TimeStamp<= 1502998746112 Group By from_unixtime(TimeStamp, '%Y-%m-%d')


    //SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y')
    
    var dateto = new Date(); //today
    var datefrom = new Date();
    datefrom.setDate(datefrom.getDate() - 30);
    //adapter.log.debug('from ' + datefrom.toDateString() + " to " + dateto.toDateString());
    //gettime gives milliseconds!!
    var query = "SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime()/1000 + " AND TimeStamp<= " + dateto.getTime()/1000 + " Group By from_unixtime(TimeStamp, '%Y-%m-%d')";
    adapter.log.debug(query);
    mysql_connection.query(query, function (err, rows, fields) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            //rows[{ "date": "2017-07-19", "ertrag": 12259 }, { "date": "2017-07-20", "ertrag": 9905 }, { "date": "2017-07-21", "ertrag": 12991 }, { "date": "2017-07-22", "ertrag": 9292 }, { "date": "2017-07-23", "ertrag": 7730 }, {


            var oLastDays = [];
            var daydata ={};

            for (var i in rows)  {

                var data = rows[i];

                oLastDays.push({
                    "date": data["date"],
                    "value": data["ertrag"]
                });
                //adapter.log.debug(JSON.stringify(oLastDays));

            }

            adapter.setState(serial + '.history.last30Days', { ack: true, val: JSON.stringify(oLastDays) });

            DB_CalcHistory_Today(serial);
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });


}

function DB_CalcHistory_Today(serial) {

    var dateto = new Date(); //today

    var datefrom = new Date();
    datefrom.setHours(0);
    datefrom.setMinutes(0);
    //adapter.log.debug('from ' + datefrom.toDateString() + " to " + dateto.toDateString());
    //gettime gives milliseconds!!
    var query = "SELECT from_unixtime(TimeStamp, '%HH:%mm') as time, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%HH:%mm')";
    adapter.log.debug(query);
    mysql_connection.query(query, function (err, rows, fields) {
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

            adapter.setState(serial + '.history.today', { ack: true, val: JSON.stringify(oLastDays) });

            DB_CalcHistory_Years(serial);
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });


}



function DB_CalcHistory_Years(serial) {
    //SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y')
    var query = "SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag, Min(`ETotal`) as startertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' Group By from_unixtime(TimeStamp, '%Y')";
    adapter.log.debug(query);
    mysql_connection.query(query, function (err, rows, fields) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

            var oLastYears = [];
            //var yeardata = {};

            var firstyear = true;
            var yearvalue = 0;
            for (var i in rows) {

                var data = rows[i];

                var installdate = new Date(adapter.config.install_date);

                var installyear = installdate.getUTCFullYear();

                if (installyear < data["date"] && firstyear == true) {

                    var diff = data["date"] - installyear;
                    var dataperyear = data["ertrag"] / (diff+1);

                    adapter.log.debug("yeardiff " + diff + " value per year " + dataperyear);

                    
                    for (var n = 0; n <= diff; n++) {

                        yearvalue += dataperyear;

                        oLastYears.push({
                            "year": installyear + n,
                            "value": yearvalue
                        });
                    }

                    /*
                    oLastYears.push({
                        "year": data["date"],
                        "value": data["ertrag"]
                    });
                    */
                }
                else {
                    yearvalue = data["ertrag"];
                    oLastYears.push({
                        "year": data["date"],
                        "value": yearvalue
                    });
                }
                firstyear = false;
                
            }

            adapter.setState(serial + '.history.years', { ack: true, val: JSON.stringify(oLastYears) });

            DB_CalcHistory_Months(serial);
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });


}

function DB_CalcHistory_Months(serial) {

    var dateto = new Date(); //today

    var datefrom = new Date();
    datefrom.setHours(0);
    datefrom.setMinutes(0);

    datefrom.setFullYear(dateto.getFullYear() - 1);
    datefrom.setDate(1);

    adapter.log.debug('DB_CalcHistory_Months: from ' + datefrom.toDateString() + " to " + dateto.toDateString());

    //SELECT from_unixtime(TimeStamp, '%Y-%m') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y-%m')
    var query = "SELECT from_unixtime(TimeStamp, '%Y-%m') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%Y-%m')";
    adapter.log.debug(query);
    mysql_connection.query(query, function (err, rows, fields) {
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

            adapter.setState(serial + '.history.last12Months', { ack: true, val: JSON.stringify(oLastMonth) });

            DB_Disconnect();
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });


}


function DB_Disconnect() {
    mysql_connection.end();
}

//***********************************************************************************************************************
// sqlite
//
//

//these function are used for connection to sqlite database filled by sbfspot

// https://github.com/mapbox/node-sqlite3


var sqlite_db;

function DB_sqlite_Connect(cb) {
    //var express = require("express");
    var sqlite3 = require('sqlite3').verbose();

    adapter.log.debug("--- connecting to " + adapter.config.sqlite_path);

    sqlite_db = new sqlite3.Database(adapter.config.sqlite_path);


    adapter.log.debug("sqlite Database is connected ...");
    DB_sqlite_GetInverters();

    if (cb) cb();
}

function DB_sqlite_GetInverters() {
    var query = 'SELECT * from Inverters';
    adapter.log.debug(query);

    sqlite_db.each(query, function (err, row) {

        adapter.log.debug('row ' + JSON.stringify(row));

        adapter.log.info("got data from " + row.Type + " " + row.Serial);

        AddInverterVariables(row.Serial);

        adapter.setState(row.Serial + ".Type", { ack: true, val: row.Type });
        //adapter.setState( rows[0].Serial + ".EToday", { ack: true, val: row.EToday }); this is kW
        //adapter.setState(rows[0].Serial + ".ETotal", { ack: true, val: row.ETotal }); this is kW
        adapter.setState(row.Serial + ".SW_Version", { ack: true, val: row.SW_Version });
        adapter.setState(row.Serial + ".TotalPac", { ack: true, val: row.TotalPac });
        adapter.setState(row.Serial + ".OperatingTime", { ack: true, val: row.OperatingTime });
        adapter.setState(row.Serial + ".FeedInTime", { ack: true, val: row.FeedInTime });
        adapter.setState(row.Serial + ".Status", { ack: true, val: row.Status });
        adapter.setState(row.Serial + ".GridRelay", { ack: true, val: row.GridRelay });
        adapter.setState(row.Serial + ".Temperature", { ack: true, val: row.Temperature });

        DB_sqlite_GetInvertersData(row.Serial);

    });
}

function DB_sqlite_GetInvertersData(serial) {
    var query = 'SELECT * from SpotData  where Serial =' + serial + ' ORDER BY TimeStamp DESC LIMIT 1';
    adapter.log.debug(query);
    sqlite_db.each(query, function (err, row) {
        adapter.log.debug('row ' + JSON.stringify(row));

        adapter.setState(row.Serial + ".Pdc1", { ack: true, val: row.Pdc1 });
        adapter.setState(row.Serial + ".Pdc2", { ack: true, val: row.Pdc2 });
        adapter.setState(row.Serial + ".Idc1", { ack: true, val: row.Idc1 });
        adapter.setState(row.Serial + ".Idc2", { ack: true, val: row.Idc2 });
        adapter.setState(row.Serial + ".Udc1", { ack: true, val: row.Udc1 });
        adapter.setState(row.Serial + ".Udc2", { ack: true, val: row.Udc2 });

        adapter.setState(row.Serial + ".Pac1", { ack: true, val: row.Pac1 });
        adapter.setState(row.Serial + ".Pac2", { ack: true, val: row.Pac2 });
        adapter.setState(row.Serial + ".Pac3", { ack: true, val: row.Pac3 });
        adapter.setState(row.Serial + ".Iac1", { ack: true, val: row.Iac1 });
        adapter.setState(row.Serial + ".Iac2", { ack: true, val: row.Iac2 });
        adapter.setState(row.Serial + ".Iac3", { ack: true, val: row.Iac3 });
        adapter.setState(row.Serial + ".Uac1", { ack: true, val: row.Uac1 });
        adapter.setState(row.Serial + ".Uac2", { ack: true, val: row.Uac2 });
        adapter.setState(row.Serial + ".Uac3", { ack: true, val: row.Uac3 });

        adapter.setState(row.Serial + ".EToday", { ack: true, val: row.EToday });
        adapter.setState(row.Serial + ".ETotal", { ack: true, val: row.ETotal });
        adapter.setState(row.Serial + ".Frequency", { ack: true, val: row.Frequency });
        adapter.setState(row.Serial + ".BT_Signal", { ack: true, val: row.BT_Signal });

        DB_sqlite_Disconnect();

    });
}

function DB_sqlite_Disconnect() {
    sqlite_db.close();
}