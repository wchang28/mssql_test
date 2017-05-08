import * as mssql from "mssql";
import * as sql from "mssql/msnodesqlv8";

let s = new Set<string>();
s.add("wen");
s.add("juei");
console.log(s.has("wen"));

function promiseTest() : Promise<any> {
    return Promise.resolve<any>(null);
}

/*
let conn = new mssql.ConnectionPool({user: "wchang", password: "ts9ah7g5", server: "192.168.1.14", database: "master", connectionTimeout: 5000}, (err?: any) => {
    if (err)
        console.error("I am here 2. err=" + JSON.stringify(err));
    else
        console.log("connected :-)");
        conn.request().query("select [time]=getdate();select [x]=1;").then((result: mssql.IResult<any>) => {
            console.log(JSON.stringify(result.recordsets, null, 2));
        }).catch((err: any) => {
            console.error("I am here 3. err=" + JSON.stringify(err));
        })
});
*/

/*
let conn = new sql.ConnectionPool("Driver={SQL Server Native Client 11.0};Server=192.168.1.14;Database=master;Uid=wchang;Pwd=ts9ah7g5", (err?: any) => {
    if (err)
        console.error("I am here 2. err=" + JSON.stringify(err));
    else
        console.log("connected :-)");
        conn.request().query("select [time]=getdate();select [x]=1;").then((result: mssql.IResult<any>) => {
            console.log(JSON.stringify(result.recordsets, null, 2));
        }).catch((err: any) => {
            console.error("I am here 3. err=" + JSON.stringify(err));
        })
});
*/

let conn = new sql.ConnectionPool("Driver={SQL Server Native Client 11.0};Server=192.168.1.14;Database=master;Trusted_Connection=yes", (err?: any) => {
    if (err)
        console.error("I am here 2. err=" + JSON.stringify(err));
    else
        console.log("connected :-) :-)");
        conn.request().query("select [time]=getdate();select [x]=1;").then((result: mssql.IResult<any>) => {
            console.log(JSON.stringify(result.recordsets, null, 2));
        }).catch((err: any) => {
            console.error("I am here 3. err=" + JSON.stringify(err));
        })
});


conn.on("error", (err: any) => {
    console.error("I am here 1. err=" + JSON.stringify(err));
});