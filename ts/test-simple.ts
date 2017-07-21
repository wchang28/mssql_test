import * as simple from "./simple";

//let sqlConfig: simple.config = {server: "DESKTOP-0LO8NI0", database: "TestDB", user: "wchang", password: "ts9ah7g5"};
let sqlConfig: simple.config = {server: "DESKTOP-0LO8NI0", database: "TestDB", options: {trustedConnection: true}};

let db:simple.ISimpleMSSQL = new simple.SimpleMSSQL(sqlConfig)
db.on("connect", (connection: simple.ConnectionPool) => {
    console.log("connected to the database :-)");
}).on("error", (err: any) => {
    console.error("!!! DB error: " + JSON.stringify(err));
})