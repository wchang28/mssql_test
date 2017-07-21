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

let db:simple.ISimpleMSSQL = new simple.SimpleMSSQL(sqlConfig)
console.log("msnodesqlv8=" + db.msnodesqlv8);

let Pooling : () => Promise<void> = () => {
    return new Promise<void>((resolve: () => void, reject: (err: any) => void) => {
        if (db.Connected) {
            console.log("<<CONNECTED>>");
            db.Connection.request().query("SELECT [value]=1")
            .then((value: simple.IResult<any>) => {
                console.log(new Date().toISOString() + ": query good");
                resolve();
            }).catch((err: any) => {
                console.error(new Date().toISOString() + ": !!! query error");
                resolve();
            });
        } else {
            console.log("<<NOT-CONNECTED>>");
            resolve();
        }
    });
}

function geStart(Pooling: () => Promise<void>, intervalMS: number) : () => void {
    let timeoutHandler = () => {
        let cb = () => {setTimeout(timeoutHandler, intervalMS);};
        Pooling().then(cb).catch(cb);
    }
    return timeoutHandler;
}

let start = geStart(Pooling, 3000);
start();

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
    console.log("close event fired");
})