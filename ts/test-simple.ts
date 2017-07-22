import * as express from 'express';
import {IWebServerConfig, startServer} from 'express-web-server';
import * as bodyParser from "body-parser";
import noCache = require('no-cache-express');
import * as prettyPrinter from 'express-pretty-print';
import * as simple from "./simple";

let server = process.env.server;
let user = process.env.user;
let password = process.env.password;

console.log('server=' + server);
console.log('user=' + user);
console.log('password=' + password);
console.log('');

let sqlConfig: simple.config = {server, database: "TestDB", user, password};
//let sqlConfig: simple.config = {server, database: "TestDB", options: {trustedConnection: true}};

let db:simple.ISimpleMSSQL = new simple.SimpleMSSQL(sqlConfig, {reconnectIntervalMS: 3000})
console.log("msnodesqlv8=" + db.msnodesqlv8);

type StartPollingFunction = () => void;
type PollingFunction = () => Promise<void>;

function getStart(poll: PollingFunction, intervalMS: number) : StartPollingFunction {
    let doPolling = () => {
        let onPollingDone = () => {
            setTimeout(doPolling, intervalMS);
        };
        poll().then(onPollingDone).catch(onPollingDone);
    }
    return doPolling;
}

let pollingFunc: PollingFunction = () => {
    return new Promise<void>((resolve: () => void, reject: (err: any) => void) => {
        console.log("<POLL>");
        let timer = setTimeout(() => {
            reject({error: "timeout"});
        }, 5000);
        if (db.Connected) {
            //console.log("<<CONNECTED>>");
            db.Connection.request().query("SELECT [value]=1")
            .then((value: simple.IResult<any>) => {
                clearTimeout(timer);
                console.log(new Date().toISOString() + ": query good");
                resolve();
            }).catch((err: any) => {
                clearTimeout(timer);
                console.error(new Date().toISOString() + ": !!! query error");
                resolve();
            });
        } else {
            //console.log("<<NOT-CONNECTED>>");
            clearTimeout(timer);
            resolve();
        }
    });
}

let start = getStart(pollingFunc, 3000);
//start();

let app = express();

app.set('jsonp callback name', 'cb');

app.use(noCache);
app.use(bodyParser.json({"limit":"999mb"}));
app.use(prettyPrinter.get());

db.on("connect", (connection: simple.ConnectionPool) => {
    console.log("connected to the database :-)");
    connection.request().query("SELECT [value]=getdate()")
    .then((value: simple.IResult<any>) => {
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
}).on("change", (newState: simple.State, oldState: simple.State) => {
    console.log("change: <<" + oldState + " ===> " + newState + ">>");
}).on("connect-req", () => {
    console.log("<<connect-req>>");
}).connect();

app.get("/test", (req: express.Request, res: express.Response) => {
    db.query("SELECT [value]=1")
    .then((value: simple.IResult<any>) => {
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