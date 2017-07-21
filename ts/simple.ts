import * as sql from 'mssql';
import * as events from 'events';
import * as _ from 'lodash';

export interface Options {
    reconnectIntervalMS?: number
}

export interface ISimpleMSSQL {
    readonly Options: Options;
    readonly Connection: sql.ConnectionPool;
    readonly Connected: boolean;
    readonly Connecting: boolean;
    readonly msnodesqlv8: boolean;
    connect(): void;
    disconnect() : void;

    query(sqlString:string, params?: any) : Promise<sql.IResult<any>>;
    execute(storedProc:string, params?: any) : Promise<sql.IProcedureResult<any>>;

    on(event: "connect", listener: (connection: sql.ConnectionPool) => void) : this;
    on(event: "error", listener: (err: any) => void) : this;
    on(event: "close", listener: () => void) : this;
}

export class SimpleMSSQL extends events.EventEmitter implements ISimpleMSSQL {
    private __connection: sql.ConnectionPool;
    private __options: Options;
    private static defaultOptions: Options = {reconnectIntervalMS: 3000};
    private static NOT_CONNECTED_ERR  = {error: 'internal-server-error', error_description: 'not connected to the database'};
    constructor(private __sqlConfig: sql.config, options?: Options) {
        super();
        options = (options || SimpleMSSQL.defaultOptions)
        this.__options = _.assignIn({}, SimpleMSSQL.defaultOptions, options);
        this.__connection = null;
        this.connect();
    }
    get msnodesqlv8(): boolean {return (!this.__sqlConfig.user || !this.__sqlConfig.password ? true : false);}
    get Options(): Options {return this.__options;}
    get Connection(): sql.ConnectionPool {return this.__connection;}
    get Connected(): boolean {return (this.Connection ? this.Connection.connected : false);}
    get Connecting(): boolean {return (this.Connection ? this.Connection.connecting : false);}
    private closeConnection() : Promise<void> {
        return new Promise<void>((resolve: () => void, reject: (err: any) => void) => {
            this.__connection.close()
            .then(() => {
                this.__connection = null;
                resolve();
            }).catch((err: any) => {
                this.__connection = null;
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
    private onConnectionError(err: any) : void {
        this.emit('error', err);
        let cb = () => {
            if (this.Options.reconnectIntervalMS > 0) {
                setTimeout(() => {
                    this.connect();
                }, this.Options.reconnectIntervalMS);
            }            
        };
        this.closeConnection().then(cb).catch(cb);
    }
    connect() : void {
        if (!this.Connected) {
            let msnodesqlv8 = (this.__sqlConfig.password ? false : true);
            this.__connection = this.createPool(msnodesqlv8, this.__sqlConfig);
            this.__connection.on("error", (err: any) => {
                this.onConnectionError(err);
            }).connect()
            .then((connection: sql.ConnectionPool) => {
                this.emit('connect', connection);
            }).catch((err: any) => {
                this.onConnectionError(err);
            });
        }
    }
    disconnect() : Promise<void> {
        if (this.Connected)
            return this.closeConnection().then(() => {this.emit('close');});
        else
            return Promise.reject(SimpleMSSQL.NOT_CONNECTED_ERR);
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
}

export * from 'mssql';