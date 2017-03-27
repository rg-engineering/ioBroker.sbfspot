/*
 * homecontrol adapter für iobroker
 *
 * Created: 15.09.2016 21:31:28
 *  Author: Rene

Copyright(C)[2016, 2017][René Glaß]

Dieses Programm ist freie Software.Sie können es unter den Bedingungen der GNU General Public License, wie von der Free Software 
Foundation veröffentlicht, weitergeben und/ oder modifizieren, entweder gemäß Version 3 der Lizenz oder (nach Ihrer Option) jeder 
späteren Version.

Die Veröffentlichung dieses Programms erfolgt in der Hoffnung, daß es Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE,
    sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK.Details finden Sie in der
GNU General Public License.

Sie sollten ein Exemplar der GNU General Public License zusammen mit diesem Programm erhalten haben.Falls nicht,
    siehe < http://www.gnu.org/licenses/>.

*/

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils


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
    CheckInverterVariables();

    DB_Connect(function () {
        setTimeout(function () {
            adapter.stop();
        }, 6000);
    });

    // force terminate after 1min
    // don't know why it does not terminate by itself...
    setTimeout(function () {
        adapter.log.warn('force terminate');
        process.exit(0);
    }, 60000);

}


function DB_Connect(cb) {
    var express = require("express");
    var mysql = require('mysql');
    var connection = mysql.createConnection({
        host: adapter.config.sbfspotIP || 'localhost',
        user: adapter.config.sbfspotUser || 'SBFspotUser',
        password: adapter.config.sbfspotPassword || 'logger',
        database: adapter.config.sbfspotDatabasename || 'SBFspot'
    });
    var app = express();

    connection.connect(function (err) {
        if (!err) {
            adapter.log.debug("Database is connected ... nn");
            GetInverters();
        } else {
            adapter.log.error("Error connecting database ... nn");
        }
    });

    if (cb) cb();
}

function GetInverters() {
    connection.query('SELECT * from Inverters', function (err, rows, fields) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));


            AddInverterVariables(rows[0].Type.val);

            GetInvertersData(rows[0].Serial.val);
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });
}

function GetInvertersData(serial) {

    var query = 'SELECT * from SpotData where Serial =' + serial;
    connection.query(query, function (err, rows, fields) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));


            Disconnect();
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });

    
}

function Disconnect() {
    connection.end();
}


function AddInverterVariables(type) {

    adapter.setObjectNotExists('SMA_inverter.'+type, {
        type: 'channel',
        role: 'inverter',
        common: { name: 'SMA inverter '+type },
        native: { location: adapter.config.location }
    });

    adapter.setObjectNotExists('SMA_inverter.' + type+'.SerialNo', {
        type: 'state',
        role: 'serial',
        common: { name: 'SMA inverter Serialnumber' },
        native: { location: 'SMA_inverter.' + type + '.SerialNo'}
    });

    adapter.setObjectNotExists('SMA_inverter.' + type + '.ETotal', {
        type: 'state',
        role: 'ertrag',
        common: { name: 'SMA inverter Ertrag Total' },
        native: { location: 'SMA_inverter.' + type + '.ETotal' }
    });

    adapter.setObjectNotExists('SMA_inverter.' + type + '.EToday', {
        type: 'state',
        role: 'ertrag',
        common: { name: 'SMA inverter Ertrag Today' },
        native: { location: 'SMA_inverter.' + type + '.EToday' }
    });

}

function CheckInverterVariables() {
    adapter.setObjectNotExists('SMA_inverter', {
        type: 'channel',
        role: 'inverter',
        common: { name: 'SMA inverter' },
        native: { location: adapter.config.location }
    });
}