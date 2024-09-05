import { Injectable } from "@angular/core";
import { ConfigService } from "./ConfigService";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";
import { catchError, map, Observable, retry, throwError } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { parse } from 'yaml';

@Injectable({providedIn: 'root'})
export class WebSocketService {
    
    private URL:string;
    private endpoint:string;
    private webSocketSubject:WebSocketSubject<string>|undefined;
    public webSocket$:Promise<Observable<string>>;

    private initws = () => {
        console.log('init');
        
        this.webSocket$.then((ws: Observable<string>) =>{
            ws.pipe(
                catchError((error)=>{
                    console.log('failed ws');
                    console.log(error);
                    return throwError(error);
                }),
                retry({delay:5_000})
            )
        })
        
    }

    constructor(){
        const configState = ConfigService.getConfig();
        this.URL='';
        this.endpoint='';
        this.webSocketSubject= undefined;
        
        this.webSocket$ = new Promise((resolve,reject) => {
            configState.subscribe((body:string) => {
                const state = parse(body);
                this.URL = state.websocket.URL;
                this.endpoint = state.websocket.endpoint;

                this.webSocketSubject = webSocket<string>({
                    url:this.URL+this.endpoint, 
                    openObserver: {
                        next: () => {
                            console.log('connection ok');
                        }
                    },
                    deserializer:(event) =>{return event.data},
                });
                return resolve(this.webSocketSubject.asObservable());
            })
        });
        this.initws();        
    }

    public getWebSocket = ():Promise<Observable<string>> => { return this.webSocket$;}
    
    
}