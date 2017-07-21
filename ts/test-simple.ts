import * as simple from "./simple";

//let sqlConfig: simple.config = {server: "DESKTOP-0LO8NI0", database: "TestDB", user: "wchang", password: "ts9ah7g5"};
//let sqlConfig: simple.config = {server: "DESKTOP-0LO8NI0", database: "TestDB", options: {trustedConnection: true}};
let sqlConfig: simple.config = {server: "AWS-PRD-SQL01", database: "SFDC", options: {trustedConnection: true}};

let db:simple.ISimpleMSSQL = new simple.SimpleMSSQL(sqlConfig)
db.on("connect", (connection: simple.ConnectionPool) => {
    console.log("connected to the database :-)");
    connection.request().query("SELECT [value]=getdate()")
    .then((value: simple.IResult<any>) => {
        console.log(JSON.stringify(value, null, 2));
        db.disconnect();
    }).catch((err: any) => {
        console.error("!!! query error: " + JSON.stringify(err));
        db.disconnect();
    });
}).on("error", (err: any) => {
    console.error("!!! DB error: " + JSON.stringify(err));
}).on("close", () => {
    console.log("close event fired");
})