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

var mysql_db = require(__dirname + '/lib/DB_sbfspot/DB_mysql_sbfspot');

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
var adapter = utils.adapter('myhomecontrol_sbfspot');


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

    if (typeof adapter.databasetype == 'undefined') {
        adapter.log.info("databasetype not defined. check settings and save");
        adapter.config.databasetype = "mySQL";
    }

    CheckInverterVariables();


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
    // force terminate after 1min
    // don't know why it does not terminate by itself...
    setTimeout(function () {
        adapter.log.warn('force terminate');
        process.exit(0);
    }, 60000);

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

