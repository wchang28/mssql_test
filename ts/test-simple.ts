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

let db:simple.ISimpleMSSQL = new simple.SimpleMSSQL(sqlConfig, {reconnectIntervalMS: 10000})
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