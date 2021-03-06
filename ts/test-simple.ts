import * as express from 'express';
import {IWebServerConfig, startServer} from 'express-web-server';
import * as bodyParser from "body-parser";
import noCache = require('no-cache-express');
import * as prettyPrinter from 'express-pretty-print';
import * as sql from "simple-mssql";

let server = process.env.server;
let user = process.env.user;
let password = process.env.password;

console.log('server=' + server);
console.log('user=' + user);
console.log('password=' + password);
console.log('');

let sqlConfig: sql.config = {server, database: "TestDB", user, password};
//let sqlConfig: simple.config = {server, database: "TestDB", options: {trustedConnection: true}};

let db = sql.get(sqlConfig, {reconnectIntervalMS: 3000})
console.log("msnodesqlv8=" + db.msnodesqlv8);

let app = express();

app.set('jsonp callback name', 'cb');

app.use(noCache);
app.use(bodyParser.json({"limit":"999mb"}));
app.use(prettyPrinter.get());

db.on("connect", (connection: sql.ConnectionPool) => {
    console.log("connected to the database :-)");
    connection.request().query("SELECT [value]=getdate()")
    .then((value: sql.IResult<any>) => {
        console.log(JSON.stringify(value, null, 2));
        //db.disconnect();
    }).catch((err: any) => {
        console.error("!!! query error: " + JSON.stringify(err));
        //db.disconnect();
    });
}).on("error", (err: any) => {
    console.error("!!! DB error: " + JSON.stringify(err));
}).on("close", () => {
    console.log("<<CLOSE>>");
}).on("change", (newState: sql.State, oldState: sql.State) => {
    console.log("change: <<" + oldState + " ===> " + newState + ">>");
}).on("connecting", () => {
    console.error("connecting...");
}).connect();

// /test?value={value}
app.get("/test", (req: express.Request, res: express.Response) => {
    db.query("SELECT [value]=@value", {"value": req.query["value"] ? req.query["value"] : null})
    .then((value: sql.IResult<any>) => {
        console.log(new Date().toISOString() + ": query good");
        res.jsonp({msg: "query is GOOD :-), value=" + value.recordset[0]["value"]});
    }).catch((err: any) => {
        console.error(new Date().toISOString() + ": !!! query error");
        res.jsonp({msg: "query is BAD :-(, err=" + JSON.stringify(err)});
    });
});

startServer({http:{port: 8080, host: "127.0.0.1"}}, app, (secure:boolean, host:string, port:number) => {
    let protocol = (secure ? 'https' : 'http');
    console.log(new Date().toISOString() + ': server listening at %s://%s:%s', protocol, host, port);
}, (err:any) => {
    console.error(new Date().toISOString() + ': !!! server error: ' + JSON.stringify(err));
    process.exit(1);
});