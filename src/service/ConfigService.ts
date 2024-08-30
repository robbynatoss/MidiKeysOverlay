import { HttpClient } from "@angular/common/http";
import { parse } from 'yaml';

export class ConfigService {

    config: any;
    http: HttpClient;

    constructor(httpClient: HttpClient) {
        this.http = httpClient;
    }

    loadConfig = (): Promise<any> => {
        this.http.get('/config.yaml',{responseType:'text'}).subscribe((body: string) => {
            this.config = parse(body);
            console.log(this.config);
        });
        return Promise.resolve();
    }

    getConfig = (): any => { return this.config }
};