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
//let numOfInverters;
let longitude;
let latitude;


//---------- sqlite
//https://www.npmjs.com/package/better-sqlite3
let sqlite_db;
//---------- mySQL
let mysql_connection;

let killTimer;

async function main() {

    if (typeof adapter.config.databasetype == "undefined") {
        adapter.log.error("databasetype not defined. check and update settings and save");
        adapter.terminate ? adapter.terminate(11) : process.exit(11);
    }

    //await CheckInverterVariables();

    killTimer = setTimeout(function () {
        //adapter.stop();
        adapter.log.error("force terminate ");
        adapter.terminate ? adapter.terminate(11) : process.exit(11);
    }, 2*60*1000);


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


    if (killTimer) {
        clearTimeout(killTimer);
        adapter.log.debug("timer killed");
    }

    adapter.terminate ? adapter.terminate(11) : process.exit(11);


}

async function GetSystemDateformat() {
    try {
        const ret = await adapter.getForeignObjectAsync("system.config");

        if (typeof ret != undefined && ret != null) {
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

/*

2020-07-27 19:30:06.897 - info: sbfspot.0 (6113) Terminated (ADAPTER_REQUESTED_TERMINATION): Without reason
2020-07-27 19:30:07.015 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807 is invalid: obj.common.name has an invalid type! Expected "string" or "object", received "number"
2020-07-27 19:30:07.018 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.063 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Type is invalid: obj.type has to exist
2020-07-27 19:30:07.065 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.068 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.ETotal is invalid: obj.type has to exist
2020-07-27 19:30:07.070 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.073 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.EToday is invalid: obj.type has to exist
2020-07-27 19:30:07.076 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.078 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.SW_Version is invalid: obj.type has to exist
2020-07-27 19:30:07.081 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.084 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.TotalPac is invalid: obj.type has to exist
2020-07-27 19:30:07.086 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.088 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.OperatingTime is invalid: obj.type has to exist
2020-07-27 19:30:07.090 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.093 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.FeedInTime is invalid: obj.type has to exist
2020-07-27 19:30:07.095 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.098 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Status is invalid: obj.type has to exist
2020-07-27 19:30:07.100 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.103 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.GridRelay is invalid: obj.type has to exist
2020-07-27 19:30:07.105 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.107 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Temperature is invalid: obj.type has to exist
2020-07-27 19:30:07.109 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.112 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Pdc1 is invalid: obj.type has to exist
2020-07-27 19:30:07.114 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.116 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Pdc2 is invalid: obj.type has to exist
2020-07-27 19:30:07.118 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.121 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Idc1 is invalid: obj.type has to exist
2020-07-27 19:30:07.123 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.125 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Idc2 is invalid: obj.type has to exist
2020-07-27 19:30:07.127 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.130 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Udc1 is invalid: obj.type has to exist
2020-07-27 19:30:07.132 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.134 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Udc2 is invalid: obj.type has to exist
2020-07-27 19:30:07.136 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.139 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Pac1 is invalid: obj.type has to exist
2020-07-27 19:30:07.141 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.143 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Pac2 is invalid: obj.type has to exist
2020-07-27 19:30:07.145 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.148 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Pac3 is invalid: obj.type has to exist
2020-07-27 19:30:07.149 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.152 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Iac1 is invalid: obj.type has to exist
2020-07-27 19:30:07.154 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.156 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Iac2 is invalid: obj.type has to exist
2020-07-27 19:30:07.158 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.161 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Iac3 is invalid: obj.type has to exist
2020-07-27 19:30:07.163 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.165 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Uac1 is invalid: obj.type has to exist
2020-07-27 19:30:07.175 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.178 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Uac2 is invalid: obj.type has to exist
2020-07-27 19:30:07.180 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.183 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Uac3 is invalid: obj.type has to exist
2020-07-27 19:30:07.185 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.187 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.Frequency is invalid: obj.type has to exist
2020-07-27 19:30:07.189 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.191 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.BT_Signal is invalid: obj.type has to exist
2020-07-27 19:30:07.193 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.196 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.timestamp is invalid: obj.type has to exist
2020-07-27 19:30:07.198 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.200 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.lastup is invalid: obj.type has to exist
2020-07-27 19:30:07.202 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.205 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.error is invalid: obj.type has to exist
2020-07-27 19:30:07.206 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.209 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.history.today is invalid: obj.type has to exist
2020-07-27 19:30:07.211 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.213 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.history.last30Days is invalid: obj.type has to exist
2020-07-27 19:30:07.215 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.218 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.history.last12Months is invalid: obj.type has to exist
2020-07-27 19:30:07.220 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.222 - warn: sbfspot.0 (6113) Object sbfspot.0.1100173807.history.years is invalid: obj.type has to exist
2020-07-27 19:30:07.224 - warn: sbfspot.0 (6113) This object will not be created in future versions. Please report this to the developer.
2020-07-27 19:30:07.538 - info: host.orangepizero instance system.adapter.sbfspot.0 terminated with code 11 (ADAPTER_REQUESTED_TERMINATION)

*/



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

    let obj= {
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


/*
sbfspot.0	2021-07-08 19:30:16.081	info	State value to set for "sbfspot.0.2000562095.history.last12Months" has to be type "number" but received type "string"
sbfspot.0	2021-07-08 19:30:14.909	info	State value to set for "sbfspot.0.2000562095.history.years" has to be type "number" but received type "string"
sbfspot.0	2021-07-08 19:30:13.024	info	State value to set for "sbfspot.0.2000562095.history.today" has to be type "number" but received type "string"
sbfspot.0	2021-07-08 19:30:12.888	info	State value to set for "sbfspot.0.2000562095.history.last30Days" has to be type "number" but received type "string"
 */

/*
async function CheckInverterVariables() {

}
*/


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

        let notUploaded = rows.length;

        await adapter.setStateAsync(serial + ".sbfspot.notUploaded", { ack: true, val: notUploaded });

        query = "SELECT `TimeStamp` FROM `DayData` WHERE `PVoutput` = 1 ORDER BY TimeStamp DESC LIMIT 1   ";

        rows = await DB_Query(query);

        if (rows.length > 0) {
            let updateTimestamp = rows[0].TimeStamp;
            const oDate = new Date(updateTimestamp * 1000);
            const oDateNow = new Date();

            oDateNow.setDate(oDateNow.getDate() - 1);


            if (oDate < oDateNow) {
                adapter.log.error("no upload to sbfspot since " + oDate.toLocaleString());
            }

            let lastUpload = oDate.toLocaleString();

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

            oLastDays.push({
                "date": data["date"],
                "value": data["ertrag"]
            });
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

            oLastDays.push({
                "time": data["time"],
                "value": data["ertrag"]
            });

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

                    oLastYears.push({
                        "year": installyear + n,
                        "value": parseInt(yearvalue)
                    });
                }

                
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

            oLastMonth.push({
                "month": data["date"],
                "value": data["ertrag"]
            });

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
        if (typeof mysql_connection != undefined && mysql_connection != null) {
            mysql_connection.end();
        }
    } else {
        if (typeof sqlite_db != undefined && sqlite_db != null) {
            sqlite_db.close();
        }
    }

    adapter.log.info("all done ... ");
}




// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
