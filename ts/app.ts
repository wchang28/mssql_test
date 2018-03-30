// This is a mssql test app
// set the follwing evn vars: server, user, password
import * as sql from "mssql";

let server = process.env.server;
let user = process.env.user;
let password = process.env.password;

console.log('server=' + server);
console.log('user=' + user);
console.log('password=' + password);
console.log('');

function createPool(msnodesqlv8: boolean, config: sql.config) : sql.ConnectionPool {
    if (msnodesqlv8) {
        let nsql = require("mssql/msnodesqlv8");
        return new nsql.ConnectionPool(config);
    } else
        return new sql.ConnectionPool(config);
}

let conn = createPool(false, {server, database: "TestDB", user, password});
//let conn = createPool(true, {server, database: "TestDB", options: {trustedConnection: true}});

/*
conn.on("error", (err: any) => {
    console.error("!!! connection pool error: " + JSON.stringify(err));
}).connect()
.then((pool: sql.ConnectionPool) => {
    console.log("connected :-)");
    pool.request()
    .input('Name', "Wen Chang")
    .input('Age', 49)
    //.input('Male', false)
    .output('Id', sql.VarChar(50))
    .execute("[dbo].[stp_EchoSimpleParams]")
    .then((result: sql.IProcedureResult<any>) => {
        console.log(JSON.stringify(result, null, 2));
        pool.close();
    }).catch((err: any) => {
        console.error("!!! query error: " + JSON.stringify(err));
        pool.close();
    });
}).catch((err: any) => {
    console.error("!!! unable to connect: " + JSON.stringify(err));
});
*/

conn.on("error", (err: any) => {
    console.error("!!! connection pool error: " + JSON.stringify(err));
}).connect()
.then((pool: sql.ConnectionPool) => {
    console.log("connected :-)");
    let tvp = new sql.Table();
    tvp.columns.add('Id', sql.VarChar(50));
    tvp.rows.add("abcd");
    tvp.rows.add("efgh");
    pool.request()
    .input('Ids', tvp)
    .execute("[dbo].[stp_EchoTVP]")
    .then((result: sql.IProcedureResult<any>) => {
        console.log(JSON.stringify(result, null, 2));
        pool.close();
    }).catch((err: any) => {
        console.error("!!! query error: " + JSON.stringify(err));
        pool.close();
    });
}).catch((err: any) => {
    console.error("!!! unable to connect: " + JSON.stringify(err));
});