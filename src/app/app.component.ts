import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from './service/ConfigService';
import { WebSocketService } from './service/WebSocketService';
import { Observable, timeout } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'MidiKeysOverlay';
  webSocketService:WebSocketService;
  webSocket$: Promise<Observable<string>>;
  noteData:string;
  constructor(){
    this.webSocketService = new WebSocketService();
    this.webSocket$ = this.webSocketService.getWebSocket();
    this.noteData="Data:";
    
    this.webSocket$.then((ws:Observable<string>) =>{
      ws.subscribe((value:string) =>{
        console.log(value);
        this.noteData = this.noteData + value;
      })
    })
    
    // subscribe((value:string) =>{
    //   console.log(value);
    //   this.noteData = this.noteData + value;
    // })
  }

  


}
