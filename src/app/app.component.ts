import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from './service/ConfigService';
import { WebSocketService } from './service/WebSocketService';
import { combineLatest, generate, merge, Observable, timeout } from 'rxjs';
import { parse } from 'yaml';
import { Key } from './common/key';
import { NoteNames, NoteData, CommandCode } from './common/notes';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'MidiKeysOverlay';
  webSocketService:WebSocketService;
  noteData:string;
  config:any;
  keys:{[key:string]:Key};
  constructor(){
    this.webSocketService = new WebSocketService();
    this.config = "";
    this.noteData="Data:";
    this.keys={};

    ConfigService.getConfig().subscribe((confValue) =>{
      if(!this.config){
        this.config = parse(confValue);
        this.generateKeyboard();
      }
    })

    this.webSocketService.getWebSocket().then((ws:Observable<string>) => {
      ws.subscribe((wsValue)=>{
        console.log("ws" + wsValue);
        this.noteData = this.noteData + wsValue;
        const data:NoteData = JSON.parse(wsValue);
        const noteId = NoteNames.indexOf(data.noteName);
        if(this.keys[noteId]){
          if(data.velocity > 0){
            this.keys[noteId].pressed = true;
          }else{
            this.keys[noteId].pressed = false;
          }
        }
      });
    });
  }


  generateKeyboard = () => {
    // const noteRange = Object.values(NoteNames); 

    const leftInd =  NoteNames.indexOf(this.config.range.leftKey);
    const rightInd = NoteNames.indexOf(this.config.range.rightKey);


    console.log("left" + this.config.leftKey);
    console.log("right" + this.config.rightKey);
    for(let i = leftInd; i < rightInd; i++){
      const note = NoteNames[i];
      const key:Key = {
        isWhiteKey : !note.includes("#"),
        noteName:note,
        pressed:false,
        velocity:0
      }
      this.keys[i]=key;
    }
    console.log(JSON.stringify(this.keys));
  }
  


}
