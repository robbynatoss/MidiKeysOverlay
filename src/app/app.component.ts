import { AfterContentChecked, AfterViewChecked, Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from './service/ConfigService';
import { WebSocketService } from './service/WebSocketService';
import { combineLatest, generate, merge, Observable, timeout } from 'rxjs';
import { parse } from 'yaml';
import { Key, KeyPress } from './common/key';
import { NoteNames, NoteData, CommandCode } from './common/notes';
import gsap from 'gsap';

const seconds = 4;

const height = 180;

let rectGrow = (target:string) => gsap.fromTo(target,{translateY:0,scaleY:0, force3D:true, ease:'linear'},{translateY:`-${height}vh`,scaleY:'-1',force3D:true,duration:seconds,ease:'linear'});

let rectSlide = (target:string, scale:number) => gsap.fromTo(target,{translateY:`${scale*height}vh`,scaleY:scale, ease:'linear'},{translateY:`-${height}vh`,scaleY:scale,duration:seconds+scale*seconds,ease:'linear'});

// let rectShrink = (target:string) => gsap.fromTo(target,{translateY:0,scaleY:0, ease:'linear'},{translateY:`-${height}vh`,scaleY:'-1',duration:seconds,ease:'linear'});

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewChecked {
  title = 'MidiKeysOverlay';
  webSocketService:WebSocketService;
  noteData:string;
  config:any;
  keys:{[key:number]:Key};
  justPressed:string[];
  justReleased:string[];
  currAnimation:gsap.core.Tween|undefined;
  runningAnimations:{[key:string]:gsap.core.Tween};
  constructor(){
    this.webSocketService = new WebSocketService();
    this.config = "";
    this.noteData="Data:";
    this.keys={};
    this.justPressed=[];
    this.justReleased=[];
    this.currAnimation = undefined;
    this.runningAnimations={}

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

        const fixedNote = this.shiftDown(data.noteName);

        const noteId = NoteNames.indexOf(fixedNote) + 10;
        const now:number = Date.now();
        if(this.keys[noteId]){
          if(data.velocity > 0){
            this.keys[noteId].pressed = true;
            const keyPress:KeyPress = {
              startTime:now,
              endTime:-1,
              diff:1
            }
            this.justPressed.unshift(noteId.toString());
            this.keys[noteId].keyPresses.unshift(keyPress);
          }else{
            this.keys[noteId].pressed = false;
            this.keys[noteId].keyPresses[0].endTime = now;
            this.keys[noteId].keyPresses[0].diff = -(now - this.keys[noteId].keyPresses[0].startTime)/(seconds*1000) ;
            if(this.keys[noteId].keyPresses[0].diff < -1){
              this.keys[noteId].keyPresses[0].diff = -1;
            }
            this.justReleased.unshift(noteId.toString());
          }
        }
        console.log(JSON.stringify(this.keys[noteId].keyPresses));
      });
    });
  }

  ngAfterViewChecked(){
    for(let key of this.justPressed){
      const noteId=parseInt(key);
      console.log(noteId.toString());
      // this.runningAnimations["#a"+noteId+'-'+(this.keys[noteId].keyPresses.length-1)] = rectGrow("#a"+noteId+'-'+(this.keys[noteId].keyPresses.length-1));
      this.runningAnimations["#a"+noteId+'-'+0] = rectGrow("#a"+noteId+'-'+'0');
      this.justPressed = this.justPressed.slice(1,this.justPressed.length-1);
    }
    for(let key of this.justReleased){
      const noteId=parseInt(key);
      this.runningAnimations["#a"+noteId+'-'+(0)].kill();
      console.log(this.keys[noteId].keyPresses[0].diff);
      // this.currAnimation = rectSlide("#a"+noteId+'-'+(this.keys[noteId].keyPresses.length-1),this.keys[noteId].keyPresses[this.keys[noteId].keyPresses.length-1].diff);
      this.currAnimation = rectSlide("#a"+noteId+'-'+0,this.keys[noteId].keyPresses[0].diff);
      this.justReleased = this.justReleased.slice(1,this.justReleased.length-1);
    }
  }

  isLeftKey(key:Key, index:number){
    return key.isWhiteKey&&
    ((key.noteName.includes('C')
    || key.noteName.includes('F')) 
    || index == 0);
  }

  isMiddleKey(key:Key, index:number){
    return key.isWhiteKey &&
    ((key.noteName.includes('D')) && (index !== Object.values(this.keys).length - 1 && index !== 0));
  }

  isMiddleKey1(key:Key, index:number){
    return key.isWhiteKey &&
    (key.noteName.includes('G') && (index !== Object.values(this.keys).length - 1 && index !== 0));
  }

  isMiddleKey2(key:Key, index:number){
    return key.isWhiteKey &&
    (key.noteName.includes('A') && (index !== Object.values(this.keys).length - 1 && index !== 0));
  }

  isRightKey(key:Key, index:number){
    return key.isWhiteKey 
    && (key.noteName.includes('E')
    || key.noteName.includes('B'));
  }

  isExtraKey(key:Key, index:number){
    return index == Object.values(this.keys).length - 1;
  }


  shiftDown(noteName:string){
    let result = "";
    const numbers = "0123456789";
    for(let char of noteName){
      if(numbers.includes(char)){
        const num = parseInt(char);
        result+= (num-1).toString();
      }else{
        result+=char
      }
    }
    return result;
  }

  generateKeyboard = () => {
    // const noteRange = Object.values(NoteNames); 

    const leftInd =  NoteNames.indexOf(this.config.range.leftKey);
    const rightInd = NoteNames.indexOf(this.config.range.rightKey);


    console.log("left" + this.config.range.leftKey);
    console.log("right" + this.config.range.rightKey);
    for(let i = leftInd; i <= rightInd; i++){
      const note = NoteNames[i];
      const key:Key = {
        isWhiteKey : !note.includes("#"),
        noteName:note,
        pressed:false,
        velocity:0,
        keyPresses:[]
      }
      this.keys[i+10]=key;
    }
    console.log(JSON.stringify(this.keys));
  }
  

  public readonly NoteNames = NoteNames;
}
