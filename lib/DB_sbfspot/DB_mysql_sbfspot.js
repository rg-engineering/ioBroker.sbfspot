//these function are used for connection to mySQL database filled by sbfspot


var mysql_connection;

function DB_Connect(cb) {
    //var express = require("express");
    var mysql = require('mysql');
    mysql_connection = mysql.createConnection({
        host: adapter.config.sbfspotIP ,
        user: adapter.config.sbfspotUser ,
        password: adapter.config.sbfspotPassword ,
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

            adapter.log.info("got data from " + rows[0].Type + " " + rows[0].Serial);

            AddInverterVariables(rows[0].Serial);

            adapter.setState(rows[0].Serial + ".Type", { ack: true, val: rows[0].Type });
            //adapter.setState( rows[0].Serial + ".EToday", { ack: true, val: rows[0].EToday }); this is kW
            //adapter.setState(rows[0].Serial + ".ETotal", { ack: true, val: rows[0].ETotal }); this is kW
            adapter.setState(rows[0].Serial + ".SW_Version", { ack: true, val: rows[0].SW_Version });
            adapter.setState(rows[0].Serial + ".TotalPac", { ack: true, val: rows[0].TotalPac });
            adapter.setState(rows[0].Serial + ".OperatingTime", { ack: true, val: rows[0].OperatingTime });
            adapter.setState(rows[0].Serial + ".FeedInTime", { ack: true, val: rows[0].FeedInTime });
            adapter.setState(rows[0].Serial + ".Status", { ack: true, val: rows[0].Status });
            adapter.setState(rows[0].Serial + ".GridRelay", { ack: true, val: rows[0].GridRelay });
            adapter.setState(rows[0].Serial + ".Temperature", { ack: true, val: rows[0].Temperature });

            DB_GetInvertersData(rows[0].Serial);
        }
        else {
            adapter.log.error('Error while performing Query.');
        }
    });
}

function DB_GetInvertersData(serial) {
    var query = 'SELECT * from SpotData  where Serial =' + serial + ' ORDER BY TimeStamp DESC LIMIT 1';
    adapter.log.debug(query);
    mysql_connection.query(query, function (err, rows, fields) {
        if (!err) {
            adapter.log.debug('rows ' + JSON.stringify(rows));

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