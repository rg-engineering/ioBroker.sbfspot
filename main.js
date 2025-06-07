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
//const { json } = require("stream/consumers");
const SunCalc = require("suncalc2");
const axios = require("axios");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec)
const os = require('os');

//const bluetooth_test = require("./lib/SMA_Bluetooth").test;

const supportedVersion="3.9.12"

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
        },

        //#######################################
        //  is called when adapter shuts down
        unload: function (callback) {
            try {

                if (intervalID != null) {
                    clearInterval(intervalID);
                }
                if (updateTimerID != null) {
                    clearTimeout(updateTimerID);
                }
                adapter && adapter.log && adapter.log.info && adapter.log.info("cleaned everything up...");
                //to do stop intervall
                callback();
            } catch (e) {
                callback();
            }
        },

        stateChange: async (id, state) => {
            //await HandleStateChange(id, state);
        },

        //#######################################
        //
        message: async (obj) => {
            if (obj) {
                switch (obj.command) {
                    case "Install":
                        adapter.log.debug("message install called");
                        break;
                    case "Update":
                        adapter.log.debug("message update called");
                        break;
                    case "checkInstallableversion":
                        await CheckVersion("installable", obj);
                        break;
                    case "checkCurrentVersion":
                        await CheckVersion("current", obj);
                        break;
                    case "checkSupportedVersion":
                        await CheckVersion("supported", obj);
                        break;
                    default:
                        adapter.log.error("unknown message " + obj.command);
                        break;
                }
            }
        }
        //#######################################


    });
    adapter = new utils.Adapter(options);
    return adapter;
}

let FirstValue4History;
let FirstDate4History;
//let numOfInverters;
let longitude;
let latitude;


//---------- sqlite
//https://www.npmjs.com/package/better-sqlite3
let sqlite_db;
//---------- mySQL
let mysql_connection;

let killTimer;
let intervalID = null;


async function main() {

    let readInterval = 5;
    if (parseInt(adapter.config.readInterval) > 0) {
        readInterval = adapter.config.readInterval;
    }
    adapter.log.debug("read every  " + readInterval + " minutes");
    intervalID = setInterval(Do, readInterval * 60 * 1000);


    //read at adapterstart
    await Do();
}


async function Do() {


    //bluetooth_test();


    //todo check access righst for sqlite file and folder...


    if (adapter.config.databasetype === undefined) {
        adapter.log.error("databasetype not defined. check and update settings and save");
    //    adapter.terminate ? adapter.terminate(11) : process.exit(11);
    }

    //await CheckInverterVariables();

    //killTimer = setTimeout(function () {
    //    //adapter.stop();
    //    adapter.log.error("force terminate ");
    //    adapter.terminate ? adapter.terminate(11) : process.exit(11);
    //}, 2*60*1000);


    let daylight = false;

    if (adapter.config.GetDataOnlyWhenDaylight) {

        await GetSystemDateformat();

        const times = SunCalc.getTimes(new Date(), latitude, longitude);

        // format sunset/sunrise time from the Date object
        const sunsetStr = ("0" + times.sunset.getHours()).slice(-2) + ":" + ("0" + times.sunset.getMinutes()).slice(-2);
        const sunriseStr = ("0" + times.sunrise.getHours()).slice(-2) + ":" + ("0" + times.sunrise.getMinutes()).slice(-2);

        adapter.log.debug("sunrise " + sunriseStr + " sunset " + sunsetStr + " " + adapter.config.GetDataOnlyWhenDaylight);

        const now = new Date();

        if ((now.getHours() > times.sunrise.getHours() || (now.getHours() == times.sunrise.getHours() && now.getMinutes() > times.sunrise.getMinutes()))
            && (now.getHours() < times.sunset.getHours() || (now.getHours() == times.sunset.getHours() && now.getMinutes() < times.sunset.getMinutes()))) {
            daylight = true;
        }
    }
    else {
        //always
        daylight = true;
    }

    if (daylight) {

        let connected = false;
        connected = await DB_Connect();

        if (connected) {
            const rows = await DB_GetInverters();

            adapter.log.debug("rows " + JSON.stringify(rows));

            if (rows != null && rows.length > 0) {

                for (const i in rows) {

                    const serial = rows[i].Serial;

                    await GetInverter(i, rows);

                    await DB_CheckLastUploads(serial);

                    let rows1 = await DB_GetInvertersData(serial);

                    adapter.log.debug("rows " + JSON.stringify(rows1));


                    if (rows1 != null) {


                        await GetInverterData(0, rows1, serial);

                        rows1 = await DB_CalcHistory_LastMonth(serial);


                        if (rows1 != null) {
                            await CalcHistory_LastMonth(0, rows1, serial);


                            rows1 = await DB_CalcHistory_Prepare(serial);
                            if (rows1 != null) {
                                await CalcHistory_Prepare(0, rows1, serial);


                                rows1 = await DB_CalcHistory_Today(serial);
                                if (rows1 != null) {
                                    await CalcHistory_Today(0, rows1, serial);


                                    rows1 = await DB_CalcHistory_Years(serial);
                                    if (rows1 != null) {
                                        await CalcHistory_Years(0, rows1, serial);

                                        rows1 = await DB_CalcHistory_Months(serial);
                                        if (rows1 != null) {
                                            await CalcHistory_Months(0, rows1, serial);
                                        }
                                    }

                                }

                            }
                        }
                    }
                }
            } else {
                //
                adapter.log.error("no inverter data found, adding dummy data...");
                await DB_AddDummyData();
            }
        }
        DB_Disconnect();
    }
    else {
        adapter.log.info("nothing to do, because no daylight ... ");
       
    }


    //if (killTimer) {
    //    clearTimeout(killTimer);
    //    adapter.log.debug("timer killed");
    //}

    //adapter.terminate ? adapter.terminate(11) : process.exit(11);


}

async function GetSystemDateformat() {
    try {
        const ret = await adapter.getForeignObjectAsync("system.config");

        if (ret !== undefined && ret != null) {
            //dateformat = ret.common.dateFormat;
            longitude = ret.common.longitude;
            latitude = ret.common.latitude;
            adapter.log.debug("system: longitude " + longitude + " latitude " + latitude);
        }
        else {
            adapter.log.error("system.config not available. longitude and latitude set to Berlin");
            longitude = 52.520008;
            latitude = 13.404954;
        }
    }
    catch (e) {
        adapter.log.error("exception in GetSystemDateformat [" + e + "]");
    }
}



async function AddInverterVariables(serial) {

    adapter.log.debug("AddInverterVariables for " + serial );

    //This will be refused in future versions.Please report this to the developer.
    //The id 1100173807 has an invalid type!: Expected "string" or "object", received "number".
    //need a string instead of number as id


    await AddObject(serial.toString(), "channel", serial.toString(), "string", "", "", true, false);
    await AddObject(serial.toString() + ".Type", "state", "SMA inverter Serialnumber", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".ETotal", "state", "SMA inverter Ertrag Total", "number", "value", "Wh", true, false);
    await AddObject(serial.toString() + ".EToday", "state", "SMA inverter Ertrag Today", "number", "value", "Wh", true, false);
    await AddObject(serial.toString() + ".SW_Version", "state", "SMA inverter SW Version", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".TotalPac", "state", "SMA inverter Total P AC", "number", "value", "", true, false);
    await AddObject(serial.toString() + ".OperatingTime", "state", "SMA inverter Operating Time", "number", "value", "h", true, false);
    await AddObject(serial.toString() + ".FeedInTime", "state", "SMA inverter Feed In Time", "number", "value", "h", true, false);
    await AddObject(serial.toString() + ".Status", "state", "SMA inverter Status", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".GridRelay", "state", "SMA inverter Grid Relay", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".Temperature", "state", "SMA inverter Temperature", "number", "value.temperature", "°C", true, false);
    await AddObject(serial.toString() + ".Pdc1", "state", "SMA inverter Power DC 1", "number", "value", "W", true, false);
    await AddObject(serial.toString() + ".Pdc2", "state", "SMA inverter Power DC 2", "number", "value", "W", true, false);
    await AddObject(serial.toString() + ".Idc1", "state", "SMA inverter Current DC 1", "number", "value", "A", true, false);
    await AddObject(serial.toString() + ".Idc2", "state", "SMA inverter Current DC 2", "number", "value", "A", true, false);
    await AddObject(serial.toString() + ".Udc1", "state", "SMA inverter Voltage DC 1", "number", "value.voltage", "V", true, false);
    await AddObject(serial.toString() + ".Udc2", "state", "SMA inverter Voltage DC 2", "number", "value.voltage", "V", true, false);
    await AddObject(serial.toString() + ".Pac1", "state", "SMA inverter Power AC 1", "number", "value.voltage", "W", true, false);
    await AddObject(serial.toString() + ".Pac2", "state", "SMA inverter Power AC 2", "number", "value", "W", true, false);
    await AddObject(serial.toString() + ".Pac3", "state", "SMA inverter Power AC 3", "number", "value", "W", true, false);
    await AddObject(serial.toString() + ".Iac1", "state", "SMA inverter Current AC 1", "number", "value", "A", true, false);
    await AddObject(serial.toString() + ".Iac2", "state", "SMA inverter Current AC 2", "number", "value", "A", true, false);
    await AddObject(serial.toString() + ".Iac3", "state", "SMA inverter Current AC 3", "number", "value", "A", true, false);
    await AddObject(serial.toString() + ".Uac1", "state", "SMA inverter Voltage AC 1", "number", "value.voltage", "V", true, false);
    await AddObject(serial.toString() + ".Uac2", "state", "SMA inverter Voltage AC 2", "number", "value.voltage", "V", true, false);
    await AddObject(serial.toString() + ".Uac3", "state", "SMA inverter Voltage AC 3", "number", "value.voltage", "V", true, false);
    await AddObject(serial.toString() + ".Frequency", "state", "SMA inverter Frequency", "number", "value", "Hz", true, false);
    await AddObject(serial.toString() + ".BT_Signal", "state", "SMA inverter BT_Signal", "number", "value", "%", true, false);
    await AddObject(serial.toString() + ".timestamp", "state", "SMA inverter timestamp", "number", "value", "", true, false);
    await AddObject(serial.toString() + ".lastup", "state", "SMA inverter lastup", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".error", "state", "SMA inverter error", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".history.today", "state", "SMA inverter history today (JSON)", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".history.last30Days", "state", "SMA inverter history last 30 days (JSON)", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".history.last12Months", "state", "SMA inverter history last 12 Months (JSON)", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".history.years", "state", "SMA inverter history years (JSON)", "string", "value", "", true, false);

    await AddObject(serial.toString() + ".sbfspot.LastUpload", "state", "date/time of last upload to sbfspot", "string", "value", "", true, false);
    await AddObject(serial.toString() + ".sbfspot.notUploaded", "state", "number of datapoints waiting for upload", "number", "value", "", true, false);


    adapter.log.debug("AddInverterVariables done " );
}


async function CreateObject(key, obj) {

    const obj_new = await adapter.getObjectAsync(key);
    //adapter.log.warn("got object " + JSON.stringify(obj_new));

    if (obj_new != null) {

        if ((obj_new.common.role != obj.common.role
            || obj_new.common.type != obj.common.type
            || (obj_new.common.unit != obj.common.unit && obj.common.unit != null)
            || obj_new.common.read != obj.common.read
            || obj_new.common.write != obj.common.write
            || obj_new.common.name != obj.common.name)
            && obj.type === "state"
        ) {
            adapter.log.warn("change object " + JSON.stringify(obj) + " " + JSON.stringify(obj_new));
            await adapter.extendObject(key, {
                common: {
                    name: obj.common.name,
                    role: obj.common.role,
                    type: obj.common.type,
                    unit: obj.common.unit,
                    read: obj.common.read,
                    write: obj.common.write
                }
            });
        }
    }
    else {
        await adapter.setObjectNotExistsAsync(key, obj);
    }
}


async function AddObject(key, type, common_name, common_type, common_role, common_unit, common_read, common_write) {

    adapter.log.debug("addObject " + key);

    const obj= {
        type: type,
        common: {
            name: common_name,
            type: common_type,
            role: common_role,
            unit: common_unit,
            read: common_read,
            write: common_write
        },
        native: {
            location: key
        }
    };

    await CreateObject(key, obj);
}



async function DB_Connect() {

    let ret = true;

    try {
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {

            //var express = require("express");
            const mysql = require("mysql2/promise");

            if (adapter.config.databasetype == "MariaDB") {
                adapter.log.info("start with MariaDB");
                adapter.log.debug("--- connecting to " + adapter.config.sbfspotIP + " " + adapter.config.sbfspotPort + " " + adapter.config.sbfspotDatabasename);

                mysql_connection = await mysql.createConnection({
                    host: adapter.config.sbfspotIP,
                    user: adapter.config.sbfspotUser,
                    port: adapter.config.sbfspotPort,
                    password: adapter.config.sbfspotPassword,
                    database: adapter.config.sbfspotDatabasename
                });

               

            } else {
                adapter.log.info("start with mySQL");
                adapter.log.debug("--- connecting to " + adapter.config.sbfspotIP + " " + adapter.config.sbfspotDatabasename);

                mysql_connection = await mysql.createConnection({
                    host: adapter.config.sbfspotIP,
                    user: adapter.config.sbfspotUser,
                    password: adapter.config.sbfspotPassword,
                    database: adapter.config.sbfspotDatabasename
                });

                
            }


            mysql_connection.on("error", err => {
                adapter.log.error("Error on connection: " + err.message);
                // stop doing stuff with conn
                DB_Disconnect();
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
            //DB_GetInverters();

        }

    }
    catch (e) {
        adapter.log.error("exception in DB_Connect [" + e + "]");
        ret = false;
    }

    return ret;
}

async function DB_Query(query) {

    adapter.log.debug(query);
    let retRows;

    if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {

        const [rows, fields] = await mysql_connection.execute(query);
        retRows = rows;

    } else {
        const stmt = sqlite_db.prepare(query);

        const rows = stmt.all();
        retRows = rows;
    }

    adapter.log.debug(JSON.stringify(retRows));

    return retRows;
}

async function DB_CheckLastUploads(serial) {

    try {
        let query = "SELECT `TimeStamp` FROM `DayData` WHERE `PVoutput` is null    ";

        let rows = await DB_Query(query);

        const notUploaded = rows.length;

        await adapter.setStateAsync(serial + ".sbfspot.notUploaded", { ack: true, val: notUploaded });

        query = "SELECT `TimeStamp` FROM `DayData` WHERE `PVoutput` = 1 ORDER BY TimeStamp DESC LIMIT 1   ";

        rows = await DB_Query(query);

        if (rows.length > 0) {
            const updateTimestamp = rows[0].TimeStamp;
            const oDate = new Date(updateTimestamp * 1000);
            const oDateNow = new Date();

            oDateNow.setDate(oDateNow.getDate() - 1);


            if (oDate < oDateNow) {
                adapter.log.error("no upload to sbfspot since " + oDate.toLocaleString());
            }

            const lastUpload = oDate.toLocaleString();

            await adapter.setStateAsync(serial + ".sbfspot.LastUpload", { ack: true, val: lastUpload });
        }
    }
    catch (e) {
        adapter.log.error("exception in DB_CheckLastUploads [" + e + "]");
    }
}



async function DB_GetInverters() {

    let retRows;
    try {
        const query = "SELECT * from Inverters";
        retRows = await DB_Query(query);
    }
    catch (e) {
        adapter.log.error("exception in DB_GetInverters [" + e + "]");
    }

    return retRows;
}




async function GetInverter(i, rows) {

    adapter.log.info("got data from " + rows[i].Type + " with ID " + rows[i].Serial);

    await AddInverterVariables(rows[i].Serial);

    await adapter.setStateAsync(rows[i].Serial + ".Type", { ack: true, val: rows[i].Type });
    await adapter.setStateAsync(rows[i].Serial + ".SW_Version", { ack: true, val: rows[i].SW_Version });
    await adapter.setStateAsync(rows[i].Serial + ".TotalPac", { ack: true, val: rows[i].TotalPac });
    await adapter.setStateAsync(rows[i].Serial + ".OperatingTime", { ack: true, val: rows[i].OperatingTime });
    await adapter.setStateAsync(rows[i].Serial + ".FeedInTime", { ack: true, val: rows[i].FeedInTime });
    await adapter.setStateAsync(rows[i].Serial + ".Status", { ack: true, val: rows[i].Status });
    await adapter.setStateAsync(rows[i].Serial + ".GridRelay", { ack: true, val: rows[i].GridRelay });
    await adapter.setStateAsync(rows[i].Serial + ".Temperature", { ack: true, val: rows[i].Temperature });
    await adapter.setStateAsync(rows[i].Serial + ".timestamp", { ack: true, val: rows[i].TimeStamp });


    const oDate = new Date(rows[i].TimeStamp * 1000);
    const nDate = oDate.getDate();
    const nMonth = oDate.getMonth() + 1;
    const nYear = oDate.getFullYear();
    const nHours = oDate.getHours();
    const nMinutes = oDate.getMinutes();
    const nSeconds = oDate.getSeconds();
    const sLastup = nDate + "." + nMonth + "." + nYear + " " + nHours + ":" + nMinutes + ":" + nSeconds;

    await adapter.setStateAsync(rows[i].Serial + ".lastup", { ack: true, val: sLastup });
    const oToday = new Date();
    let sError = "none";
    if (Math.abs(oDate.getTime() - oToday.getTime()) > (24 * 60 * 60 * 1000)) {

        sError = "sbfspot no update since " + sLastup + " ";

        adapter.log.debug(sError);

    }
    await adapter.setStateAsync(rows[i].Serial + ".error", { ack: true, val: sError });
    //numOfInverters++;
    // await DB_GetInvertersData(rows[i].Serial);


    adapter.log.debug("GetInverter done");


}




async function DB_GetInvertersData(serial) {

    let retRows;

    adapter.log.debug("DB_GetInvertersData for " + serial);

    try {
        //SELECT * from SpotData  where Serial ='2000562095' ORDER BY TimeStamp DESC LIMIT 1
        const query = "SELECT * from SpotData  where Serial =" + serial + " ORDER BY TimeStamp DESC LIMIT 1";
        retRows = await DB_Query(query);
    }
    catch (e) {
        adapter.log.error("exception in DB_GetInvertersData [" + e + "]");
    }

    adapter.log.debug("DB_GetInvertersData done ");

    return retRows;
}



async function GetInverterData(err, rows, serial) {

    adapter.log.debug("GetInverterData for " + serial);

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


            await adapter.setStateAsync(rows[i].Serial + ".Pdc1", { ack: true, val: rows[i].Pdc1 });
            await adapter.setStateAsync(rows[i].Serial + ".Pdc2", { ack: true, val: rows[i].Pdc2 });
            await adapter.setStateAsync(rows[i].Serial + ".Idc1", { ack: true, val: rows[i].Idc1 });
            await adapter.setStateAsync(rows[i].Serial + ".Idc2", { ack: true, val: rows[i].Idc2 });
            await adapter.setStateAsync(rows[i].Serial + ".Udc1", { ack: true, val: rows[i].Udc1 });
            await adapter.setStateAsync(rows[i].Serial + ".Udc2", { ack: true, val: rows[i].Udc2 });

            await adapter.setStateAsync(rows[i].Serial + ".Pac1", { ack: true, val: rows[i].Pac1 });
            await adapter.setStateAsync(rows[i].Serial + ".Pac2", { ack: true, val: rows[i].Pac2 });
            await adapter.setStateAsync(rows[i].Serial + ".Pac3", { ack: true, val: rows[i].Pac3 });
            await adapter.setStateAsync(rows[i].Serial + ".Iac1", { ack: true, val: rows[i].Iac1 });
            await adapter.setStateAsync(rows[i].Serial + ".Iac2", { ack: true, val: rows[i].Iac2 });
            await adapter.setStateAsync(rows[i].Serial + ".Iac3", { ack: true, val: rows[i].Iac3 });
            await adapter.setStateAsync(rows[i].Serial + ".Uac1", { ack: true, val: rows[i].Uac1 });
            await adapter.setStateAsync(rows[i].Serial + ".Uac2", { ack: true, val: rows[i].Uac2 });
            await adapter.setStateAsync(rows[i].Serial + ".Uac3", { ack: true, val: rows[i].Uac3 });


            adapter.log.debug("### " + nDay + "." + nMonth + "." + nYear + " = " + nDayToday + "." + nMonthToday + "." + nYearToday);

            if (nDay == nDayToday && nMonth == nMonthToday && nYear == nYearToday) {
                await adapter.setStateAsync(rows[i].Serial + ".EToday", { ack: true, val: rows[i].EToday });
            } else {
                await adapter.setStateAsync(rows[i].Serial + ".EToday", { ack: true, val: 0 });
            }
            await adapter.setStateAsync(rows[i].Serial + ".ETotal", { ack: true, val: rows[i].ETotal });
            await adapter.setStateAsync(rows[i].Serial + ".Frequency", { ack: true, val: rows[i].Frequency });
            await adapter.setStateAsync(rows[i].Serial + ".BT_Signal", { ack: true, val: rows[i].BT_Signal });
        }

        //await DB_CalcHistory_LastMonth(serial);

    } else {
        adapter.log.error("Error while performing Query in GetInverterData. " + err);
    }

    adapter.log.debug("GetInverterData done ");

}





async function DB_CalcHistory_LastMonth(serial) {

    adapter.log.debug("DB_CalcHistory_LastMonth for " + serial);

    let retRows;
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
        retRows = await DB_Query(query);
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_LastMonth [" + e + "]");
    }

    return retRows;
}




async function CalcHistory_LastMonth(err, rows, serial) {

    adapter.log.debug("CalcHistory_LastMonth for " + serial);

    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        //rows[{ "date": "2017-07-19", "ertrag": 12259 }, { "date": "2017-07-20", "ertrag": 9905 }, { "date": "2017-07-21", "ertrag": 12991 }, { "date": "2017-07-22", "ertrag": 9292 }, { "date": "2017-07-23", "ertrag": 7730 }, {


        const oLastDays = [];
        //var daydata = {};

        for (const i in rows) {

            const data = rows[i];

            if (adapter.config.History4Vis2) {

                const oDate = new Date(data["date"]);
                oDate.setHours(12);
                oDate.setMinutes(0);

                //for vis-2
                oLastDays.push(
                    [
                        oDate,
                        data["ertrag"]
                    ]);

                /*
                    [
                        ["2024-04-23T00:00:00.000Z",12551],
                        ["2024-04-24T00:00:00.000Z",5898],
                        ["2024-04-25T00:00:00.000Z",8373]
                    ]

                */

            }
            else {
                oLastDays.push({
                    "date": data["date"],
                    "value": data["ertrag"]
                });
            }

            //adapter.log.debug(JSON.stringify(oLastDays));

        }

        await adapter.setStateAsync(serial + ".history.last30Days", { ack: true, val: JSON.stringify(oLastDays) });

        //await DB_CalcHistory_Prepare(serial);
    } else {
        adapter.log.error("Error while performing Query in CalcHistory_LastMonth. " + err);
    }

}




async function DB_CalcHistory_Prepare(serial) {


    adapter.log.debug("DB_CalcHistory_Prepare for " + serial);

    let retRows;
    try {
        //var dateto = new Date(); //today

        //SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, ETotal  FROM `SpotData` ORDER by `TimeStamp` ASC LIMIT  1
        let query = "";
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            query = "SELECT from_unixtime(TimeStamp, '%Y-%m-%d') as date, ETotal  FROM `SpotData` WHERE `Serial` = '" + serial + "' ORDER by `TimeStamp` ASC LIMIT  1";
        } else {
            query = "SELECT strftime('%Y-%m-%d', datetime(TimeStamp, 'unixepoch')) as date, ETotal  FROM `SpotData` WHERE `Serial` = '" + serial + "' ORDER by `TimeStamp` ASC LIMIT  1";
        }
        retRows = await DB_Query(query);
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Prepare [" + e + "]");
    }

    return retRows;
}



async function CalcHistory_Prepare(err, rows, serial) {

    adapter.log.debug("CalcHistory_Prepare for " + serial);

    if (!err) {
        adapter.log.debug("prepare: rows " + JSON.stringify(rows));

        for (const i in rows) {

            const data = rows[i];

            FirstValue4History = data["ETotal"];
            FirstDate4History = data["date"];

            adapter.log.debug(FirstDate4History + " " + FirstValue4History);
        }

        //await DB_CalcHistory_Today(serial);
    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Prepare. " + err);
    }
}




async function DB_CalcHistory_Today(serial) {

    adapter.log.debug("DB_CalcHistory_Today for " + serial);

    let retRows;
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
        retRows = await DB_Query(query);
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Today [" + e + "]");
    }


    return retRows;
}



async function CalcHistory_Today(err, rows, serial) {

    adapter.log.debug("CalcHistory_Today for " + serial);

    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        const oLastDays = [];
        //var daydata = {};

        for (const i in rows) {

            const data = rows[i];

            if (adapter.config.History4Vis2) {


                const oDate = new Date();

                const times = data["time"].split(":");
                oDate.setHours(parseInt(times[0]));
                oDate.setMinutes(parseInt(times[1]));
                oDate.setSeconds(0);

                adapter.log.debug("### " + data["time"] + " " + JSON.stringify(times) + " " + oDate.toLocaleString());

                //for vis-2
                oLastDays.push(
                    [
                        oDate,
                        data["ertrag"]
                    ]);

                /*
                    [
                        ["2024-05-23T14:45:07.403Z",1],
                        ["2024-05-23T14:45:07.403Z",3],
                        ["2024-05-23T14:45:07.403Z",4],
                        ["2024-05-23T14:45:07.403Z",6],
                        ["2024-05-23T14:45:07.403Z",9],
                        ["2024-05-23T14:45:07.403Z",12],
                        ["2024-05-23T14:45:07.404Z",16],
                        ["2024-05-23T14:45:07.404Z",20]]

                */

            }
            else {
                oLastDays.push({
                    "time": data["time"],
                    "value": data["ertrag"]
                });

            }

        }

        await adapter.setStateAsync(serial + ".history.today", { ack: true, val: JSON.stringify(oLastDays) });

    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Today. " + err);
    }
}





async function DB_CalcHistory_Years(serial) {

    adapter.log.debug("DB_CalcHistory_Years for " + serial);

    let retRows;
    try {
        //SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag FROM `SpotData` WHERE `Serial` = '2000562095'  Group By from_unixtime(TimeStamp, '%Y')

        let query = "";
        if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
            query = "SELECT from_unixtime(TimeStamp, '%Y') as date, Max(`ETotal`) as ertrag, Min(`ETotal`) as startertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' Group By from_unixtime(TimeStamp, '%Y')";
        } else {
            query = "SELECT strftime('%Y', datetime(TimeStamp, 'unixepoch')) as date, Max(`ETotal`) as ertrag, Min(`ETotal`) as startertrag FROM `SpotData` WHERE `Serial` = '" + serial + "' Group By strftime('%Y', datetime(TimeStamp, 'unixepoch'))";
        }
        retRows = await DB_Query(query);
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Years [" + e + "]");
    }

    return retRows;
}





async function CalcHistory_Years(err, rows, serial) {

    adapter.log.debug("CalcHistory_Years for " + serial);


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

                    if (adapter.config.History4Vis2) {

                        const year = installyear + n;
                        const oDate = new Date(year);

                        //for vis-2
                        oLastYears.push(
                            [
                                oDate,
                                parseInt(yearvalue)
                            ]);

                        /*
                        [
                            ["2008-01-01T00:00:00.000Z",7000],
                            ["2009-01-01T00:00:00.000Z",2309000],
                            ["2010-01-01T00:00:00.000Z",4445000],
                            ["2011-01-01T00:00:00.000Z",7019000],["2012-01-01T00:00:00.000Z",9371000],["2013-01-01T00:00:00.000Z",11393000],["2014-01-01T00:00:00.000Z",13666000],["2015-01-01T00:00:00.000Z",16034000],["2016-01-01T00:00:00.000Z",18052202],["2017-01-01T00:00:00.000Z",20172891],["2018-01-01T00:00:00.000Z",22476037],["2019-01-01T00:00:00.000Z",24617484],["2020-01-01T00:00:00.000Z",26802727],["2021-01-01T00:00:00.000Z",28673935],["2022-01-01T00:00:00.000Z",30710918],["2023-01-01T00:00:00.000Z",32662549],["2024-01-01T00:00:00.000Z",33370608]]


                        */

                    }
                    else {
                        oLastYears.push({
                            "year": installyear + n,
                            "value": parseInt(yearvalue)
                        });
                    }
                }


            } else {


                yearvalue = data["ertrag"];

                adapter.log.debug(data["date"] + " " + yearvalue);

                if (adapter.config.History4Vis2) {

                    const oDate = new Date(data["date"]);
                    //for vis-2
                    oLastYears.push(
                        [
                            oDate,
                            yearvalue
                        ]);
                }
                else {

                    oLastYears.push({
                        "year": data["date"],
                        "value": yearvalue
                    });
                }


            }
            firstyear = false;

        }
        adapter.log.debug(JSON.stringify(oLastYears));
        await adapter.setStateAsync(serial + ".history.years", { ack: true, val: JSON.stringify(oLastYears) });

    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Years. " + err);
    }
}



async function DB_CalcHistory_Months(serial) {

    adapter.log.debug("DB_CalcHistory_Months for " + serial);

    let retRows;
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
        retRows = await DB_Query(query);
    }
    catch (e) {
        adapter.log.error("exception in DB_CalcHistory_Months [" + e + "]");
    }

    return retRows;
}



async function CalcHistory_Months(err, rows, serial) {

    adapter.log.debug("CalcHistory_Months for " + serial);

    if (!err) {
        adapter.log.debug("rows " + JSON.stringify(rows));

        const oLastMonth = [];

        for (const i in rows) {

            const data = rows[i];
            if (adapter.config.History4Vis2) {

                const oDate = new Date(data["date"]);
                //for vis-2
                oLastMonth.push(
                    [
                        oDate,
                        data["ertrag"]
                    ]);

                /*
                    [
                        ["2023-05-01T00:00:00.000Z",31422838],
                        ["2023-06-01T00:00:00.000Z",31732951],
                        ["2023-07-01T00:00:00.000Z",32009703],
                        ["2023-08-01T00:00:00.000Z",32245904],["2023-09-01T00:00:00.000Z",32505135],["2023-10-01T00:00:00.000Z",32615574],["2023-11-01T00:00:00.000Z",32645852],["2023-12-01T00:00:00.000Z",32662549],["2024-01-01T00:00:00.000Z",32689084],["2024-02-01T00:00:00.000Z",32754174],["2024-03-01T00:00:00.000Z",32940065],["2024-04-01T00:00:00.000Z",33184421],["2024-05-01T00:00:00.000Z",33370608]]


                */

            }
            else {
                oLastMonth.push({
                    "month": data["date"],
                    "value": data["ertrag"]
                });
            }
        }

        await adapter.setStateAsync(serial + ".history.last12Months", { ack: true, val: JSON.stringify(oLastMonth) });

    } else {
        adapter.log.error("Error while performing Query in CalcHistory_Months. " + err);
    }
}




async function DB_AddDummyData() {

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


            await mysql_connection.execute(query);

           

        } else {

            const stmt = sqlite_db.prepare(query);

            stmt.all();


           

        }
    }
    catch (e) {
        adapter.log.error("exception in DB_AddDummyData [" + e + "]");
    }

}




function DB_Disconnect() {

    adapter.log.debug("disconnect database");
    if (adapter.config.databasetype == "mySQL" || adapter.config.databasetype == "MariaDB") {
        if (mysql_connection !== undefined && mysql_connection != null) {
            mysql_connection.end();
        }
    } else {
        if (sqlite_db !== undefined && sqlite_db != null) {
            sqlite_db.close();
        }
    }

    adapter.log.info("all done ... ");
}


async function CheckVersion(version, msg) {

    if (version == "installable") {

        const version = await GetLatestVersionGithub();

        adapter.sendTo(msg.from, msg.command, version, msg.callback);
    }
    else if (version == "current") {

        const version = await GetInstalledVersion();

        adapter.sendTo(msg.from, msg.command, version, msg.callback);
    }
    else if (version == "supported") {
        adapter.sendTo(msg.from, msg.command, supportedVersion, msg.callback);
    }

}


async function GetLatestVersionGithub() {

    let latestVersion = "unknown";

    try {
        const url = " https://api.github.com/repos/SBFspot/SBFspot/releases/latest";
        adapter.log.debug("call " + url);

        let result = await axios.get(url, { timeout: 5000 });

        if (result != null && result.status == 200 && result.data != null) {
            adapter.log.info("installable version " + JSON.stringify(result.data.name));

            latestVersion = result.data.name;
        }
        else {
            latestVersion = "unknown / no result";
        }
    }
    catch (e) {
        adapter.log.error("exception in GetLatestVersionGithub [" + e + "]");
        latestVersion = "unknown / error";
    }
    return latestVersion;


}



async function GetInstalledVersion() {

    let Version = "unknown";

    try {
        if (os.type() == "Linux") {
            const cmd = " /usr/local/bin/sbfspot.3/SBFspot -version";

            adapter.log.debug("call " + cmd);

            let res = await exec(cmd);

            Version = res.stdout;

            adapter.log.info("result " + Version);
        }
        else {
            adapter.log.error("sbfspot version cannot be detected on  " + os.type());
            Version = "unknown on " + os.type();
        }
    }
    catch (e) {
        adapter.log.error("exception in GetInstalledVersion [" + e + "]");
        Version = "unknown / error"
    }
    return Version;

}




// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
