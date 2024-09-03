import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, take } from "rxjs";

@Injectable({providedIn: 'root'})
export class ConfigService {

    static config$: any;
    static http: HttpClient;

    static init(httpClient: HttpClient) {
        if(!ConfigService.http){
            ConfigService.http = httpClient;
        }
    }

    static loadConfig = (): Promise<Observable<string>> => {
        return new Promise((resolve, reject) => { 
            if(!ConfigService.config$){
                ConfigService.config$ = ConfigService.http.get('/config.yaml', { responseType: 'text' })
            }
            resolve(ConfigService.config$);
        });
    }

    static getConfig = (): Observable<any> => { 
        return ConfigService.config$;
    }
};