// generic utility object to perform connect retry at a certain interval until the connection is established
import * as events from "events";

export interface IConnectable<T> {
    connect(): Promise<T>;
}

export interface IConnectRetry<T extends IConnectable<T>> {
    start(): void;
    on(event: "connecting", listener: () => void) : this;
    on(event: "connected", listener: (connectable: T) => void) : this;
    on(event: "error", listener: (err: any) => void) : this;
}

class ConnectRetry<T extends IConnectable<T>> extends events.EventEmitter implements IConnectRetry<T> {
    constructor(private connectable: T, private retryConnectMS: number) {
        super();
    }
    private get ConnectHandler(): () => void {
        let handler = () => {
            this.emit("connecting");
            this.connectable.connect()
            .then((connectable:T) => {
                this.emit("connected", connectable);
            }).catch((err: any) => {
                this.emit("error", err);
                setTimeout(this.ConnectHandler, this.retryConnectMS);
            })
        };
        return handler.bind(this);       
    }
    start() {   // start the connect sequence
        let connect = this.ConnectHandler;
        connect();
    }
}

export function get<T extends IConnectable<T>>(connectable: T, retryConnectMS: number) : IConnectRetry<T> {return new ConnectRetry(connectable, retryConnectMS);}