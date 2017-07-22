import * as sql from 'mssql';
import * as events from 'events';
import * as _ from 'lodash';

export interface Options {
    reconnectIntervalMS?: number
}

export type State = "not-connected" | "connecting" | "connected" | "disconnecting";

export interface ISimpleMSSQL {
    readonly Options: Options;
    readonly Connection: sql.ConnectionPool;
    readonly State: State;
    readonly msnodesqlv8: boolean;
    readonly Connected: boolean;

    disconnect(): Promise<void>;
    query(sqlString:string, params?: any) : Promise<sql.IResult<any>>;
    execute(storedProc:string, params?: any) : Promise<sql.IProcedureResult<any>>;

    on(event: "change", listener: (state: State) => void) : this;
    on(event: "connect", listener: (connection: sql.ConnectionPool) => void) : this;
    on(event: "error", listener: (err: any) => void) : this;
    on(event: "close", listener: () => void) : this;
    on(event: "connect-req", listener: () => void) : this;
}

export class SimpleMSSQL extends events.EventEmitter implements ISimpleMSSQL {
    private __state: State; 
    private __connection: sql.ConnectionPool;
    private __options: Options;
    private static defaultOptions: Options = {reconnectIntervalMS: 3000};
    private __connectReq: any;
    private static NOT_CONNECTED_ERR  = {error: 'internal-server-error', error_description: 'not connected to the database'};
    constructor(private __sqlConfig: sql.config, options?: Options) {
        super();
        options = (options || SimpleMSSQL.defaultOptions)
        this.__options = _.assignIn({}, SimpleMSSQL.defaultOptions, options);
        this.__state = "not-connected";
        this.__connection = null;
        this.__connectReq = null;
        this.injectConnectRequestIfNecessary();
    }
    get msnodesqlv8(): boolean {return (!this.__sqlConfig.user || !this.__sqlConfig.password ? true : false);}
    get Options(): Options {return this.__options;}
    get Connection(): sql.ConnectionPool {return this.__connection;}
    get State(): State {return this.__state;}
    get Connected(): boolean {return this.State === "connected";}
    private setState(value: State) {
        if (this.__state !== value) {
            this.__state = value;
            this.emit("change", value);
            if (this.State === "not-connected")
                this.connectIfNecessary();
        }
    }
    private injectConnectRequestIfNecessary() {
        if (this.State === "not-connected" || this.State === "disconnecting") {
            if (!this.__connectReq) {
                this.__connectReq = {};
                this.emit("connect-req");
                this.connectIfNecessary();
            }
        }
    }
    private getConnectReq() : any {
        if (this.__connectReq) {
            let ret = this.__connectReq;
            this.__connectReq = null;
            return ret;
        } else
            return null;
    }
    private connectIfNecessary() {
        let connectReq: any = null;
        if (this.State === "not-connected" && (connectReq = this.getConnectReq()) != null) {
            this.setState("connecting");
            this.__connection = this.createPool(this.msnodesqlv8, this.__sqlConfig);
            this.__connection.on("error", (err: any) => {
                // connection is alreay closed at this time no need to call close()
                this.emit('error', err);
                this.__connection = null;
                this.setState("not-connected");
                this.emit("close");
                setTimeout(() => {this.injectConnectRequestIfNecessary();}, this.Options.reconnectIntervalMS);
            }).connect()
            .then((connection: sql.ConnectionPool) => {
                this.setState("connected");
                this.emit('connect', connection);
            }).catch((err: any) => {
                this.emit('error', err);
                if (this.State !== "disconnecting") this.closeConnection(true).then(() => {}).catch((err: any) => {});
            });
        }
    }
    private closeConnection(tryReconnect: boolean) : Promise<void> {
        return new Promise<void>((resolve: () => void, reject: (err: any) => void) => {
            this.setState("disconnecting");
            this.__connection.close()
            .then(() => {
                console.log(":-) connection.close() success");
                this.__connection = null;
                this.setState("not-connected");
                this.emit("close");
                if (tryReconnect) setTimeout(() => {this.injectConnectRequestIfNecessary();}, this.Options.reconnectIntervalMS);
                resolve();
            }).catch((err: any) => {
                console.error("!!! connection.close() failed !!! err=" + err.toString());
                this.__connection = null;
                this.setState("not-connected");
                this.emit("close");
                if (tryReconnect) setTimeout(() => {this.injectConnectRequestIfNecessary();}, this.Options.reconnectIntervalMS);
                reject(err);
            });
        });
    }
    private createPool(msnodesqlv8: boolean, config: sql.config) : sql.ConnectionPool {
        if (msnodesqlv8) {
            let nsql = require("mssql/msnodesqlv8");
            return new nsql.ConnectionPool(config);
        } else
            return new sql.ConnectionPool(config);
    }
    query(sqlString:string, params?: any) : Promise<sql.IResult<any>> {
        if (!this.Connected)
            return Promise.reject(SimpleMSSQL.NOT_CONNECTED_ERR);
        else {
            let request = this.Connection.request();
            if (params) {
                for (let field in params)
                    request.input(field, params[field]);
            }
            return request.query(sqlString);       
        }
    }
    execute(storedProc:string, params: any) : Promise<sql.IProcedureResult<any>> {
        if (!this.Connected)
            return Promise.reject(SimpleMSSQL.NOT_CONNECTED_ERR);
        else {
            let request = this.Connection.request();
            if (params) {
                for (let field in params)
                    request.input(field, params[field]);
            }
            return request.execute(storedProc);       
        }
    }
    disconnect() : Promise<void> {
        if (!this.Connected)
            return Promise.reject(SimpleMSSQL.NOT_CONNECTED_ERR);
        else
            return this.closeConnection(false);
    }
}

export * from 'mssql';