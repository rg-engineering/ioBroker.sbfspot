//these function are used for connection to sqlite database filled by sbfspot

// https://github.com/mapbox/node-sqlite3


var sqlite_db;

function DB_sqlite_Connect(cb) {
    //var express = require("express");
    var mysqlite = require('sqlite');

    var sqlite_db = new sqlite.Database(adapter.config.sqlite_path);

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

        adapter.setState(rows[0].Serial + ".Type", { ack: true, val: row.Type });
        //adapter.setState( rows[0].Serial + ".EToday", { ack: true, val: row.EToday }); this is kW
        //adapter.setState(rows[0].Serial + ".ETotal", { ack: true, val: row.ETotal }); this is kW
        adapter.setState(rows[0].Serial + ".SW_Version", { ack: true, val: row.SW_Version });
        adapter.setState(rows[0].Serial + ".TotalPac", { ack: true, val: row.TotalPac });
        adapter.setState(rows[0].Serial + ".OperatingTime", { ack: true, val: row.OperatingTime });
        adapter.setState(rows[0].Serial + ".FeedInTime", { ack: true, val: row.FeedInTime });
        adapter.setState(rows[0].Serial + ".Status", { ack: true, val: row.Status });
        adapter.setState(rows[0].Serial + ".GridRelay", { ack: true, val: row.GridRelay });
        adapter.setState(rows[0].Serial + ".Temperature", { ack: true, val: row.Temperature });

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
        adapter.setState(row.Serial + ".Iac2", { ack: true, val: rows.Iac2 });
        adapter.setState(row.Serial + ".Iac3", { ack: true, val: row.Iac3 });
        adapter.setState(rows.Serial + ".Uac1", { ack: true, val: row.Uac1 });
        adapter.setState(row.Serial + ".Uac2", { ack: true, val: row.Uac2 });
        adapter.setState(row.Serial + ".Uac3", { ack: true, val: rows.Uac3 });

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