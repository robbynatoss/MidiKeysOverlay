import {NgModule, APP_INITIALIZER} from '@angular/core';
import { AppComponent } from './app.component';
import {ConfigService} from './service/ConfigService';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { provideRouter, RouterModule, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { WebSocketService } from './service/WebSocketService';

const appConfigFactory = (httpClient:HttpClient) => {
    console.log('here')
    console.log(JSON.stringify(httpClient));
    ConfigService.init(httpClient);
    
    return (): Promise<any> => {
        return ConfigService.loadConfig();
    }
}

@NgModule({
    imports:[BrowserModule],
    declarations:[AppComponent],
    bootstrap:[AppComponent],
    providers:[
        provideRouter(routes,withHashLocation()),
        provideHttpClient(),
        {
            provide:APP_INITIALIZER,
            useFactory: appConfigFactory,
            deps:[HttpClient],
            multi:true
        }
    ]
})
export class AppModule{}