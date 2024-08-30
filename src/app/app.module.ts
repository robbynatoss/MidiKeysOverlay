import {NgModule, APP_INITIALIZER} from '@angular/core';
import { AppComponent } from './app.component';
import {ConfigService} from '../service/ConfigService';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { provideRouter, RouterModule, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

const appConfigFactory = (httpClient:HttpClient) => {
    console.log('here')
    console.log(JSON.stringify(httpClient));
    const config = new ConfigService(httpClient);
    
    return (): Promise<any> => {
        return config.loadConfig();
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