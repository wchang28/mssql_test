import * as sql from "mssql";
import * as events from "events";

export interface IConnectRetry {
    start(): void;
    on(event: "connecting", listener: () => void) : this;
    on(event: "connected", listener: (pool:sql.ConnectionPool) => void) : this;
    on(event: "error", listener: (err: any) => void) : this;
}

class ConnectRetry extends events.EventEmitter implements IConnectRetry {
    constructor(private pool: sql.ConnectionPool, private retryConnectMS: number) {
        super();
    }
    private get ConnectHandler(): () => void {
        let handler = () => {
            this.emit("connecting");
            this.pool.connect()
            .then((pool:sql.ConnectionPool) => {
                this.emit("connected", pool);
            }).catch((err: any) => {
                this.emit("error", err);
                setTimeout(this.ConnectHandler, this.retryConnectMS);
            })
        };
        return handler.bind(this);       
    }
    start() {
        let connect = this.ConnectHandler;
        connect();
    }
}

export function get(pool: sql.ConnectionPool, retryConnectMS: number) : IConnectRetry {return new ConnectRetry(pool, retryConnectMS);}