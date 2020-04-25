/*
 * sbfspot adapter für iobroker
 *
 * Created: 15.09.2016 21:31:28
 *  Author: Rene

Copyright(C)[2016-2020][René Glaß]



*/

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

const utils = require("@iobroker/adapter-core");

let adapter;
function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: "sbfspot",
        ready: function () {
            try {
                adapter.log.debug("start");
                main();
            } catch (e) {
                adapter.log.error("exception catch after ready [" + e + "]");
            }
        }
    });
    adapter = new utils.Adapter(options);
    return adapter;
}

let FirstValue4History;
let FirstDate4History;
let numOfInverters;

//---------- sqlite
//https://www.npmjs.com/package/better-sqlite3
let sqlite_db;
//---------- mySQL
let mysql_connection;


function main() {

    if (typeof adapter.config.databasetype == "undefined") {
        adapter.log.error("databasetype not defined. check and update settings and save");
        adapter.terminate ? adapter.terminate(11) : process.exit(11);
    }

    CheckInverterVariables();

    setTimeout(function () {
        //adapter.stop();
        adapter.log.error("force terminate in connect");
        adapter.terminate ? adapter.terminate(11) : process.exit(11);
    }, 6000);

    DB_Connect();
}

function AddInverterVariables(serial) {

    //This will be refused in future versions.Please report this to the developer.
    //The id 1100173807 has an invalid type!: Expected "string" or "object", received "number".
    //need a string instead of number as id
    adapter.setObjectNotExists(serial.toString(), {
        type: "channel",
        role: "inverter",
        common: { name: serial },
        native: { location: adapter.config.location }
    });
    adapter.setObjectNotExists(serial + ".Type", {
        type: "state",
        common: {
            name: "SMA inverter Serialnumber",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: { location: serial + ".SerialNo" }
    });
    adapter.extendObject(serial + ".Type", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".ETotal", {
        type: "state",
        common: {
            name: "SMA inverter Ertrag Total",
            type: "number",
            role: "value",
            unit: "Wh",
            read: true,
            write: false
        },
        native: { location: serial + ".ETotal" }
    });
    adapter.extendObject(serial + ".ETotal", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".EToday", {
        type: "state",
        common: {
            name: "SMA inverter Ertrag Today",
            type: "number",
            role: "value",
            unit: "Wh",
            read: true,
            write: false
        },
        native: { location: serial + ".EToday" }
    });
    adapter.extendObject(serial + ".EToday", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".SW_Version", {
        type: "state",
        common: {
            name: "SMA inverter SW Version",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: { location: serial + ".SW_Version" }
    });
    adapter.extendObject(serial + ".SW_Version", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".TotalPac", {
        type: "state",
        common: {
            name: "SMA inverter Total P AC",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: { location: serial + ".TotalPac" }
    });
    adapter.extendObject(serial + ".TotalPac", {
        common: {
            name: "SMA inverter Total P AC",
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".OperatingTime", {
        type: "state",
        common: {
            name: "SMA inverter Operating Time",
            type: "number",
            role: "value",
            unit: "h",
            read: true,
            write: false
        },
        native: { location: serial + ".OperatingTime" }
    });
    adapter.extendObject(serial + ".OperatingTime", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".FeedInTime", {
        type: "state",
        common: {
            name: "SMA inverter Feed In Time",
            type: "number",
            role: "value",
            unit: "h",
            read: true,
            write: false
        },
        native: { location: serial + ".FeedInTime" }
    });
    adapter.extendObject(serial + ".FeedInTime", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".Status", {
        type: "state",
        common: {
            name: "SMA inverter Status",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: {
            location: serial + ".Status"
        }
    });
    adapter.extendObject(serial + ".Status", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".GridRelay", {
        type: "state",
        common: {
            name: "SMA inverter Status",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: {
            location: serial + ".GridRelay"
        }
    });
    adapter.extendObject(serial + ".GridRelay", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".Temperature", {
        type: "state",
        common: {
            name: "SMA inverter Status",
            type: "number",
            role: "value.temperature",
            unit: "°C",
            read: true,
            write: false
        },
        native: {
            location: serial + ".Temperature"
        }
    });
    adapter.extendObject(serial + ".Temperature", {
        common: {
            role: "value.temperature",
        }
    });
    adapter.setObjectNotExists(serial + ".Pdc1", {
        type: "state",
        common: {
            name: "SMA inverter Power DC 1",
            type: "number",
            role: "value",
            unit: "W",
            read: true,
            write: false
        },
        native: {
            location: serial + ".Pdc1"
        }
    });
    adapter.extendObject(serial + ".Pdc1", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".Pdc2", {
        type: "state",
        common: {
            name: "SMA inverter Power DC 2",
            type: "number",
            role: "value",
            unit: "W",
            read: true,
            write: false
        },
        native: {
            location: serial + ".Pdc2"
        }
    });
    adapter.extendObject(serial + ".Pdc2", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".Idc1", {
        type: "state",
        common: {
            name: "SMA inverter Current DC 1",
            type: "number",
            role: "value.current",
            unit: "A",
            read: true,
            write: false
        },
        native: { location: serial + ".Idc1" }
    });
    adapter.extendObject(serial + ".Idc1", {
        common: {
            role: "value.current",
        }
    });
    adapter.setObjectNotExists(serial + ".Idc2", {
        type: "state",
        common: {
            name: "SMA inverter Current DC 2",
            type: "number",
            role: "value.current",
            unit: "A",
            read: true,
            write: false
        },
        native: { location: serial + ".Idc2" }
    });
    adapter.extendObject(serial + ".Idc2", {
        common: {
            role: "value.current",
        }
    });
    adapter.setObjectNotExists(serial + ".Udc1", {
        type: "state",
        common: {
            name: "SMA inverter Voltage DC 1",
            type: "number",
            role: "value.voltage",
            unit: "V",
            read: true,
            write: false
        },
        native: { location: serial + ".Udc1" }
    });
    adapter.extendObject(serial + ".Udc1", {
        common: {
            role: "value.voltage",
        }
    });
    adapter.setObjectNotExists(serial + ".Udc2", {
        type: "state",
        common: {
            name: "SMA inverter Voltage DC 2",
            type: "number",
            role: "value.voltage",
            unit: "V",
            read: true,
            write: false
        },
        native: { location: serial + ".Udc2" }
    });
    adapter.extendObject(serial + ".Udc2", {
        common: {
            role: "value.voltage",
        }
    });
    adapter.setObjectNotExists(serial + ".Pac1", {
        type: "state",
        common: {
            name: "SMA inverter Power AC 1",
            type: "number",
            role: "value",
            unit: "W",
            read: true,
            write: false
        },
        native: { location: serial + ".Pac1" }
    });
    adapter.extendObject(serial + ".Pac1", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".Pac2", {
        type: "state",
        common: {
            name: "SMA inverter Power AC 2",
            type: "number",
            role: "value",
            unit: "W",
            read: true,
            write: false
        },
        native: { location: serial + ".Pac2" }
    });
    adapter.extendObject(serial + ".Pac2", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".Pac3", {
        type: "state",
        common: {
            name: "SMA inverter Power AC 3",
            type: "number",
            role: "value",
            unit: "W",
            read: true,
            write: false
        },
        native: { location: serial + ".Pac3" }
    });
    adapter.extendObject(serial + ".Pac3", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".Iac1", {
        type: "state",
        common: {
            name: "SMA inverter Current AC 1",
            type: "number",
            role: "value.current",
            unit: "A",
            read: true,
            write: false
        },
        native: { location: serial + ".Iac1" }
    });
    adapter.extendObject(serial + ".Iac1", {
        common: {
            role: "value.current",
        }
    });
    adapter.setObjectNotExists(serial + ".Iac2", {
        type: "state",
        common: {
            name: "SMA inverter Current AC 2",
            type: "number",
            role: "value.current",
            unit: "A",
            read: true,
            write: false
        },
        native: { location: serial + ".Iac2" }
    });
    adapter.extendObject(serial + ".Iac2", {
        common: {
            role: "value.current",
        }
    });
    adapter.setObjectNotExists(serial + ".Iac3", {
        type: "state",
        common: {
            name: "SMA inverter Current AC 3",
            type: "number",
            role: "value.current",
            unit: "A",
            read: true,
            write: false
        },
        native: { location: serial + ".Iac3" }
    });
    adapter.extendObject(serial + ".Iac3", {
        common: {
            role: "value.current",
        }
    });
    adapter.setObjectNotExists(serial + ".Uac1", {
        type: "state",
        common: {
            name: "SMA inverter Voltage AC 1",
            type: "number",
            role: "value.voltage",
            unit: "V",
            read: true,
            write: false
        },
        native: { location: serial + ".Uac1" }
    });
    adapter.extendObject(serial + ".Uac1", {
        common: {
            role: "value.voltage",
        }
    });
    adapter.setObjectNotExists(serial + ".Uac2", {
        type: "state",
        common: {
            name: "SMA inverter Voltage AC 2",
            type: "number",
            role: "value.voltage",
            unit: "V",
            read: true,
            write: false
        },
        native: { location: serial + ".Uac2" }
    });
    adapter.extendObject(serial + ".Uac2", {
        common: {
            role: "value.voltage",
        }
    });
    adapter.setObjectNotExists(serial + ".Uac3", {
        type: "state",
        common: {
            name: "SMA inverter Voltage AC 3",
            type: "number",
            role: "value.voltage",
            unit: "V",
            read: true,
            write: false
        },
        native: { location: serial + ".Uac3" }
    });
    adapter.extendObject(serial + ".Uac3", {
        common: {
            role: "value.voltage",
        }
    });
    adapter.setObjectNotExists(serial + ".Frequency", {
        type: "state",
        common: {
            name: "SMA inverter Frequency",
            type: "number",
            role: "value",
            unit: "Hz",
            read: true,
            write: false
        },
        native: { location: serial + ".Frequency" }
    });
    adapter.extendObject(serial + ".Frequency", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".BT_Signal", {
        type: "state",
        common: {
            name: "SMA inverter BT_Signal",
            type: "number",
            role: "value",
            unit: "%",
            read: true,
            write: false
        },
        native: { location: serial + ".BT_Signal" }
    });
    adapter.extendObject(serial + ".BT_Signal", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".timestamp", {
        type: "state",
        common: {
            name: "SMA inverter timestamp",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: { location: serial + ".timestamp" }
    });
    adapter.extendObject(serial + ".timestamp", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".lastup", {
        type: "state",
        common: {
            name: "SMA inverter lastup",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: {
            location: serial + ".lastup"
        }
    });
    adapter.extendObject(serial + ".lastup", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".error", {
        type: "state",
        common: {
            name: "SMA inverter error",
            type: "string",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: {
            location: serial + ".error"
        }
    });
    adapter.extendObject(serial + ".error", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".history.today", {
        type: "state",
        common: {
            name: "SMA inverter history today (JSON)",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: {
            location: serial + ".history.today"
        }
    });
    adapter.extendObject(serial + ".history.today", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".history.last30Days", {
        type: "state",
        common: {
            name: "SMA inverter history last 30 days (JSON)",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: { location: serial + ".history.last30Days" }
    });
    adapter.extendObject(serial + ".history.last30Days", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".history.last12Months", {
        type: "state",
        common: {
            name: "SMA inverter history last 12 Months (JSON)",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: { location: serial + ".history.last12Months" }
    });
    adapter.extendObject(serial + ".history.last12Months", {
        common: {
            role: "value",
        }
    });
    adapter.setObjectNotExists(serial + ".history.years", {
        type: "state",
        common: {
            name: "SMA inverter history years (JSON)",
            type: "number",
            role: "value",
            unit: "",
            read: true,
            write: false
        },
        native: { location: serial + ".history.years" }
    });
    adapter.extendObject(serial + ".history.years", {
        common: {
            role: "value",
        }
    });
}

function CheckInverterVariables() {

}

function DB_Connect() {

    try {
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {

            //var express = require("express");
            const mysql = require("mysql");

            if (adapter.config.databasetype == "MariaDB") {
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
            adapter.log.info("start with sqlite");

            const path = require("path");

            const file_path = adapter.config.sqlite_path;
            const dbPath = path.resolve(__dirname, file_path.trim());

            adapter.log.debug("--- connecting to " + dbPath);

            const sqlite3 = require("better-sqlite3");

            sqlite_db = new sqlite3(dbPath, { fileMustExist: true });
            adapter.log.debug("sqlite Database is connected ...");
            DB_GetInverters();

        }

    }
    catch (e) {
        adapter.log.error("exception in DB_Connect [" + e + "]");
    }
}

function DB_GetInverters() {

    try {
        const query = "SELECT * from Inverters";
        numOfInverters = 0;
        adapter.log.debug(query);
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            mysql_connection.query(query, function (err, rows, fields) {
                GetInverter(err, rows);
            });
        } else {

            const stmt = sqlite_db.prepare(query);

            const rows = stmt.all();

            GetInverter(0, rows);

            /*
            sqlite_db.all(query, function (err, rows) {
 
                GetInverter(err, rows);
            });
            */
        }
    }
    catch (e) {
        adapter.log.error("exception in DB_GetInverters [" + e + "]");
    }
}

function GetInverter(err, rows) {
    if (!err) {

        adapter.log.debug("rows " + JSON.stringify(rows));

        if (rows.length > 0) {

            for (const i in rows) {


                adapter.log.info("got data from " + rows[i].Type + " with ID " + rows[i].Serial);

                AddInverterVariables(rows[i].Serial);

                adapter.setState(rows[i].Serial + ".Type", { ack: true, val: rows[i].Type });
                adapter.setState(rows[i].Serial + ".SW_Version", { ack: true, val: rows[i].SW_Version });
                adapter.setState(rows[i].Serial + ".TotalPac", { ack: true, val: rows[i].TotalPac });
                adapter.setState(rows[i].Serial + ".OperatingTime", { ack: true, val: rows[i].OperatingTime });
                adapter.setState(rows[i].Serial + ".FeedInTime", { ack: true, val: rows[i].FeedInTime });
                adapter.setState(rows[i].Serial + ".Status", { ack: true, val: rows[i].Status });
                adapter.setState(rows[i].Serial + ".GridRelay", { ack: true, val: rows[i].GridRelay });
                adapter.setState(rows[i].Serial + ".Temperature", { ack: true, val: rows[i].Temperature });
                adapter.setState(rows[i].Serial + ".timestamp", { ack: true, val: rows[i].TimeStamp });


                const oDate = new Date(rows[i].TimeStamp * 1000);
                const nDate = oDate.getDate();
                const nMonth = oDate.getMonth() + 1;
                const nYear = oDate.getFullYear();
                const nHours = oDate.getHours();
                const nMinutes = oDate.getMinutes();
                const nSeconds = oDate.getSeconds();
                const sLastup = nDate + "." + nMonth + "." + nYear + " " + nHours + ":" + nMinutes + ":" + nSeconds;

                adapter.setState(rows[i].Serial + ".lastup", { ack: true, val: sLastup });
                const oToday = new Date();
                let sError = "none";
                if (Math.abs(oDate.getTime() - oToday.getTime()) > (24 * 60 * 60 * 1000)) {

                    sError = "sbfspot no update since " + sLastup + " ";

                    adapter.log.debug(sError);

                }
                adapter.setState(rows[i].Serial + ".error", { ack: true, val: sError });
                numOfInverters++;
                DB_GetInvertersData(rows[i].Serial);
            }
        } else {
            //
            adapter.log.debug("no inverter data found");
            DB_AddDummyData();

        }

    } else {
        adapter.log.error("Error while performing Query in GetInverter. " + err);

        //Schreibrechte auf den DB-Ordner???

    }

}


function DB_GetInvertersData(serial) {
    try {
        //SELECT * from SpotData  where Serial ='2000562095' ORDER BY TimeStamp DESC LIMIT 1
        const query = "SELECT * from SpotData  where Serial =" + serial + " ORDER BY TimeStamp DESC LIMIT 1";
        adapter.log.debug(query);
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            //we only get one row = last one
            mysql_connection.query(query, function (err, rows, fields) {
                GetInverterData(err, rows, serial);
            });
        } else {

            const stmt = sqlite_db.prepare(query);

            const rows = stmt.all();

            GetInverterData(0, rows, serial);

            /*
            sqlite_db.all(query, function (err, rows) {
                GetInverterData(err, rows, serial);
            });
            */
        }
    }
    catch (e) {
        adapter.log.error("exception in DB_GetInvertersData [" + e + "]");
    }
}

function GetInverterData(err, rows, serial) {
    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        for (const i in rows) {
            //must only be one row...

            // check if it is really today, otherwise set to zero
            const oDate = new Date(rows[i].TimeStamp * 1000);
            const nDay = oDate.getDate();
            const nMonth = oDate.getMonth() + 1;
            const nYear = oDate.getFullYear();

            const oDateToday = new Date();
            const nDayToday = oDateToday.getDate();
            const nMonthToday = oDateToday.getMonth() + 1;
            const nYearToday = oDateToday.getFullYear();


            adapter.setState(rows[i].Serial + ".Pdc1", { ack: true, val: rows[i].Pdc1 });
            adapter.setState(rows[i].Serial + ".Pdc2", { ack: true, val: rows[i].Pdc2 });
            adapter.setState(rows[i].Serial + ".Idc1", { ack: true, val: rows[i].Idc1 });
            adapter.setState(rows[i].Serial + ".Idc2", { ack: true, val: rows[i].Idc2 });
            adapter.setState(rows[i].Serial + ".Udc1", { ack: true, val: rows[i].Udc1 });
            adapter.setState(rows[i].Serial + ".Udc2", { ack: true, val: rows[i].Udc2 });

            adapter.setState(rows[i].Serial + ".Pac1", { ack: true, val: rows[i].Pac1 });
            adapter.setState(rows[i].Serial + ".Pac2", { ack: true, val: rows[i].Pac2 });
            adapter.setState(rows[i].Serial + ".Pac3", { ack: true, val: rows[i].Pac3 });
            adapter.setState(rows[i].Serial + ".Iac1", { ack: true, val: rows[i].Iac1 });
            adapter.setState(rows[i].Serial + ".Iac2", { ack: true, val: rows[i].Iac2 });
            adapter.setState(rows[i].Serial + ".Iac3", { ack: true, val: rows[i].Iac3 });
            adapter.setState(rows[i].Serial + ".Uac1", { ack: true, val: rows[i].Uac1 });
            adapter.setState(rows[i].Serial + ".Uac2", { ack: true, val: rows[i].Uac2 });
            adapter.setState(rows[i].Serial + ".Uac3", { ack: true, val: rows[i].Uac3 });


            adapter.log.debug("### " + nDay + "." + nMonth + "." + nYear + " = " + nDayToday + "." + nMonthToday + "." + nYearToday);

            if (nDay == nDayToday && nMonth == nMonthToday && nYear == nYearToday) {
                adapter.setState(rows[i].Serial + ".EToday", { ack: true, val: rows[i].EToday });
            } else {
                adapter.setState(rows[i].Serial + ".EToday", { ack: true, val: 0 });
            }
            adapter.setState(rows[i].Serial + ".ETotal", { ack: true, val: rows[i].ETotal });
            adapter.setState(rows[i].Serial + ".Frequency", { ack: true, val: rows[i].Frequency });
            adapter.setState(rows[i].Serial + ".BT_Signal", { ack: true, val: rows[i].BT_Signal });
        }

        DB_CalcHistory_LastMonth(serial);

    } else {
        adapter.log.error("Error while performing Query in GetInverterData. " + err);
    }
}


function DB_CalcHistory_LastMonth(serial) {

    try {
        //täglich im aktuellen Monat
        //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1501542000 AND TimeStamp<= 1504133999 Group By from_unixtime(TimeStamp, '%Y-%m-%d')
        //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1500406746112 AND TimeStamp<= 1502998746112 Group By from_unixtime(TimeStamp, '%Y-%m-%d')

        //füy mySQL:
        //SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y')
        //für sqlite
        //SELECT  strftime('%Y-%m-%d ', datetime(TimeStamp, 'unixepoch')) as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095' AND TimeStamp>= 1511859131.474 AND TimeStamp<= 1514451131.474 Group By strftime('%Y-%m-%d ', datetime(TimeStamp, 'unixepoch'))

        const dateto = new Date(); //today
        const datefrom = new Date();
        datefrom.setDate(datefrom.getDate() - 30);
        //adapter.log.debug('from ' + datefrom.toDateString() + " to " + dateto.toDateString());
        //gettime gives milliseconds!!

        let query = "";
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            query = "SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%Y-%m-%d')";
        } else {
            query = "SELECT strftime('%Y-%m-%d', datetime(TimeStamp, 'unixepoch')) as date, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By strftime('%Y-%m-%d', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            mysql_connection.query(query, function (err, rows, fields) {

                CalcHistory_LastMonth(err, rows, serial);
            });
        } else {

            const stmt = sqlite_db.prepare(query);

            const rows = stmt.all();

            CalcHistory_LastMonth(0, rows, serial);

            /*
            sqlite_db.all(query, function (err, rows) {

                CalcHistory_LastMonth(err, rows, serial);
            });
            */
        }
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_LastMonth [" + e + "]");
    }
}

function CalcHistory_LastMonth(err, rows, serial) {

    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        //rows[{ "date": "2017-07-19", "ertrag": 12259 }, { "date": "2017-07-20", "ertrag": 9905 }, { "date": "2017-07-21", "ertrag": 12991 }, { "date": "2017-07-22", "ertrag": 9292 }, { "date": "2017-07-23", "ertrag": 7730 }, {


        const oLastDays = [];
        //var daydata = {};

        for (const i in rows) {

            const data = rows[i];

            oLastDays.push({
                "date": data["date"],
                "value": data["ertrag"]
            });
            //adapter.log.debug(JSON.stringify(oLastDays));

        }

        adapter.setState(serial + ".history.last30Days", { ack: true, val: JSON.stringify(oLastDays) });

        DB_CalcHistory_Prepare(serial);
    } else {
        adapter.log.error("Error while performing Query in CalcHistory_LastMonth. " + err);
    }

}


function DB_CalcHistory_Prepare(serial) {

    try {
        //var dateto = new Date(); //today

        //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, ETotal  FROM `SpotData` ORDER by `TimeStamp` ASC LIMIT  1
        let query = "";
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            query = "SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, ETotal  FROM `SpotData` WHERE `Serial` = '" + serial + "' ORDER by `TimeStamp` ASC LIMIT  1";
        } else {
            query = "SELECT strftime('%Y-%m-%d', datetime(TimeStamp, 'unixepoch')) as date, ETotal  FROM `SpotData` WHERE `Serial` = '" + serial + "' ORDER by `TimeStamp` ASC LIMIT  1";
        }
        adapter.log.debug(query);

        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Prepare(err, rows, serial);
            });
        } else {


            const stmt = sqlite_db.prepare(query);

            const rows = stmt.all();

            CalcHistory_Prepare(0, rows, serial);

            /*

            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Prepare(err, rows, serial);
            });
            */
        }
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Prepare [" + e + "]");
    }
}

function CalcHistory_Prepare(err, rows, serial) {
    if (!err) {
        adapter.log.debug("prepare: rows " + JSON.stringify(rows));

        for (const i in rows) {

            const data = rows[i];

            FirstValue4History = data["ETotal"];
            FirstDate4History = data["date"];

            adapter.log.debug(FirstDate4History + " " + FirstValue4History);
        }

        DB_CalcHistory_Today(serial);
    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Prepare. " + err);
    }
}


function DB_CalcHistory_Today(serial) {

    try {
        const dateto = new Date(); //today

        const datefrom = new Date();
        datefrom.setHours(0);
        datefrom.setMinutes(0);
        //adapter.log.debug('from ' + datefrom.toDateString() + " to " + dateto.toDateString());
        //gettime gives milliseconds!!

        let query = "";
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            query = "SELECT from_unixtime(TimeStamp, '%H:%i') as time, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%H:%i')";
        } else {
            query = "SELECT strftime('%H:%m', datetime(TimeStamp, 'unixepoch')) as time, Max(`EToday`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By strftime('%H-%m', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Today(err, rows, serial);
            });
        } else {

            const stmt = sqlite_db.prepare(query);

            const rows = stmt.all();

            CalcHistory_Today(0, rows, serial);

            /*

            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Today(err, rows, serial);
            });
            */
        }
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Today [" + e + "]");
    }
}

function CalcHistory_Today(err, rows, serial) {
    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        const oLastDays = [];
        //var daydata = {};

        for (const i in rows) {

            const data = rows[i];

            oLastDays.push({
                "time": data["time"],
                "value": data["ertrag"]
            });
            //adapter.log.debug(JSON.stringify(oLastDays));
        }

        adapter.setState(serial + ".history.today", { ack: true, val: JSON.stringify(oLastDays) });

        DB_CalcHistory_Years(serial);
    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Today. " + err);
    }
}


function DB_CalcHistory_Years(serial) {

    try {
        //SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y')

        let query = "";
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            query = "SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag, Min(`ETotal`) as startertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' Group By from_unixtime(TimeStamp, '%Y')";
        } else {
            query = "SELECT strftime('%Y', datetime(TimeStamp, 'unixepoch')) as date, Max(`ETotal`) as ertrag, Min(`ETotal`) as startertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' Group By strftime('%Y', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Years(err, rows, serial);
            });
        } else {

            const stmt = sqlite_db.prepare(query);

            const rows = stmt.all();

            CalcHistory_Years(0, rows, serial);

            /*
            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Years(err, rows, serial);
            });
            */

        }
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Years [" + e + "]");
    }
}


function CalcHistory_Years(err, rows, serial) {
    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        const oLastYears = [];
        //var yeardata = {};

        const installdate = new Date(adapter.config.install_date);
        const firstvaluedate = new Date(FirstDate4History);

        //adapter.log.debug("------ " + installdate.toDateString() + " " + firstvaluedate.toDateString());
        //adapter.log.debug("------ " + installdate.getUTCFullYear() + " < " + firstvaluedate.getUTCFullYear());

        const installyear = installdate.getUTCFullYear();
        let firstyear = true;
        let yearvalue = 0;
        for (const i in rows) {

            const data = rows[i];

            if (installdate.getUTCFullYear() < firstvaluedate.getUTCFullYear() && firstyear == true) {

                const diffyears = firstvaluedate.getUTCFullYear() - installdate.getUTCFullYear();

                const monthoffirstyear = 12 - installdate.getUTCMonth();
                const monthoflastyear = firstvaluedate.getUTCMonth();
                const months = monthoffirstyear + monthoflastyear + (diffyears - 1) * 12;

                //adapter.log.debug("---- " + monthoffirstyear + " " + monthoflastyear);
                const valuepermonth = FirstValue4History / months;

                //adapter.log.debug("++++ yeardiff " + diffyears + " monthdiff " + months + " value per month " + valuepermonth);


                for (let n = 0; n <= diffyears; n++) {

                    if (n == 0) {
                        yearvalue += monthoffirstyear * valuepermonth;
                    } else if (n == (diffyears)) {
                        //yearvalue += monthoflastyear * valuepermonth + data["ertrag"] - data["startertrag"];
                        //yearvalue += monthoflastyear * valuepermonth; 

                        yearvalue = FirstValue4History;


                        //????                      4                       504880.3333333333      44558440                   0
                        //adapter.log.debug("???? " + monthoflastyear + " " + valuepermonth + " " + data["ertrag"] + " " + data["startertrag"]);

                    } else {
                        yearvalue += 12 * valuepermonth;
                    }

                    adapter.log.debug("fillup " + (installyear + n) + " " + yearvalue);

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

                adapter.log.debug(data["date"] + " " + yearvalue);

                oLastYears.push({
                    "year": data["date"],
                    "value": yearvalue
                });
            }
            firstyear = false;

        }
        adapter.log.debug(JSON.stringify(oLastYears));
        adapter.setState(serial + ".history.years", { ack: true, val: JSON.stringify(oLastYears) });

        DB_CalcHistory_Months(serial);
    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Years. " + err);
    }
}

function DB_CalcHistory_Months(serial) {

    try {
        const dateto = new Date(); //today

        const datefrom = new Date();
        datefrom.setHours(0);
        datefrom.setMinutes(0);

        datefrom.setFullYear(dateto.getFullYear() - 1);
        datefrom.setDate(1);

        //adapter.log.debug('DB_CalcHistory_Months: from ' + datefrom.toDateString() + " to " + dateto.toDateString());

        //SELECT from_unixtime(TimeStamp, '%Y-%m') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y-%m')

        let query = "";
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            query = "SELECT from_unixtime(TimeStamp, '%Y-%m') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By from_unixtime(TimeStamp, '%Y-%m')";
        } else {
            query = "SELECT strftime('%Y-%m', datetime(TimeStamp, 'unixepoch')) as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' AND TimeStamp>= " + datefrom.getTime() / 1000 + " AND TimeStamp<= " + dateto.getTime() / 1000 + " Group By strftime('%Y-%m', datetime(TimeStamp, 'unixepoch'))";
        }
        adapter.log.debug(query);
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            mysql_connection.query(query, function (err, rows, fields) {
                CalcHistory_Months(err, rows, serial);
            });
        } else {

            const stmt = sqlite_db.prepare(query);

            const rows = stmt.all();

            CalcHistory_Months(0, rows, serial);

            /*

            sqlite_db.all(query, function (err, rows) {
                CalcHistory_Months(err, rows, serial);
            });

*/

        }
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Months [" + e + "]");
    }
}

function CalcHistory_Months(err, rows, serial) {
    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        const oLastMonth = [];
        //var monthdata = {};

        for (const i in rows) {

            const data = rows[i];

            oLastMonth.push({
                "month": data["date"],
                "value": data["ertrag"]
            });
            //adapter.log.debug(JSON.stringify(oLastDays));
        }

        adapter.setState(serial + ".history.last12Months", { ack: true, val: JSON.stringify(oLastMonth) });

        DB_Disconnect();
    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Months. " + err);
    }
}

function DB_AddDummyData() {

    try {
        adapter.log.debug("add dummy data");

        //INSERT INTO`Inverters`(`Serial`, `Name`, `Type`, `SW_Version`, `TimeStamp`, `TotalPac`, `EToday`, `ETotal`, `OperatingTime`, `FeedInTime`, `Status`, `GridRelay`, `Temperature`) VALUES([value - 1], [value - 2], [value - 3], [value - 4], [value - 5], [value - 6], [value - 7], [value - 8], [value - 9], [value - 10], [value - 11], [value - 12], [value - 13])
        let query = "";
        query = "INSERT INTO`Inverters`(`Serial`, `Name`, `Type`, `SW_Version`, `TimeStamp`, `TotalPac`,";
        query += " `EToday`, `ETotal`, `OperatingTime`, `FeedInTime`, `Status`, `GridRelay`, `Temperature`) VALUES(";
        query += " 12345678, `SN: 1234567`, `SB Dummy`, `0.0` , 1548776704 , 0 ,";
        query += " 3, 3512, 50, 45, `okay`,  `?`, 37 ";
        query += ")";

        adapter.log.debug(query);
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            mysql_connection.query(query, function (err, result) {

                if (err) {
                    adapter.log.error("error " + err);
                }

                adapter.terminate ? adapter.terminate(11) : process.exit(11);
            });
        } else {

            const stmt = sqlite_db.prepare(query);

            stmt.all();


            /*
            sqlite_db.all(query, function (err, rows) {

                if (err) {
                    adapter.log.error("error " + err);
                }

                adapter.terminate ? adapter.terminate(11) : process.exit(11);
            });
            */

        }
    }
    catch (e) {
        adapter.log.error("exception in DB_AddDummyData [" + e + "]");
    }

}


function DB_Disconnect() {

    numOfInverters--;
    // wait for all data paths... last data path will close connection

    if (numOfInverters == 0) {
        adapter.log.debug("disconnect database");
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
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



// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
