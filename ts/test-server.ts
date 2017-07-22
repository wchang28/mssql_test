import * as express from 'express';
import {IWebServerConfig, startServer} from 'express-web-server';
import * as bodyParser from "body-parser";
import noCache = require('no-cache-express');
import * as prettyPrinter from 'express-pretty-print';
import * as sql from "mssql";
import {get as getConnectRetry} from "./mssql-connect-retry";

let server = process.env.server;
let user = process.env.user;
let password = process.env.password;

console.log('server=' + server);
console.log('user=' + user);
console.log('password=' + password);
console.log('');

function createPool(config: sql.config) : sql.ConnectionPool {
    let msnodesqlv8 = (!config.user || !config.password ? true : false)
    if (msnodesqlv8) {
        let nsql = require("mssql/msnodesqlv8");
        return new nsql.ConnectionPool(config);
    } else
        return new sql.ConnectionPool(config);
}

let pool = createPool({server, database: "TestDB", user, password});
//let pool = createPool({server, database: "TestDB", options: {trustedConnection: true}});

pool.on("error", (err: any) => {
    console.error("!!! pool error: " + JSON.stringify(err));
});

getConnectRetry(pool, 5000)
.on("connecting", () => {
    console.log("connecting...");
}).on("connected", (pool: sql.ConnectionPool) => {
    console.log("connected :-)");
}).on("error", (err: any) => {
    console.error("!!! connect error: " + JSON.stringify(err));
}).start();

let app = express();

app.set('jsonp callback name', 'cb');

app.use(noCache);
app.use(bodyParser.json({"limit":"999mb"}));
app.use(prettyPrinter.get());

app.get("/test", (req: express.Request, res: express.Response) => {
    pool.request().query("SELECT [value]=1")
    .then((value: sql.IResult<any>) => {
        console.log(new Date().toISOString() + ": query good");
        res.jsonp({msg: "query GOOD :-)"});
    }).catch((err: any) => {
        console.error(new Date().toISOString() + ": !!! query error");
        res.jsonp({msg: "query BAD :-(, err=" + JSON.stringify(err)});
    });
});

startServer({http:{port: 8080, host: "127.0.0.1"}}, app, (secure:boolean, host:string, port:number) => {
    let protocol = (secure ? 'https' : 'http');
    console.log(new Date().toISOString() + ': server listening at %s://%s:%s', protocol, host, port);
}, (err:any) => {
    console.error(new Date().toISOString() + ': !!! server error: ' + JSON.stringify(err));
    process.exit(1);
});