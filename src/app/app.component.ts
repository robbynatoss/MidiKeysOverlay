import { AfterContentChecked, AfterViewChecked, Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigService } from './service/ConfigService';
import { WebSocketService } from './service/WebSocketService';
import { combineLatest, generate, merge, Observable, timeout, timestamp } from 'rxjs';
import { parse } from 'yaml';
import { Key, KeyPress } from './common/key';
import { NoteNames, NoteData, CommandCode } from './common/notes';
import gsap from 'gsap';
import $ from 'jquery';

const seconds = 4;

const height = 80;

let rectGrow = (target:string) => gsap.fromTo(target,{top:`${height}vh`,height:0, ease:'linear'},{top:`0`,height:`${height}vh`,duration:seconds,ease:'linear'});

let rectSlide = (target:string, scale:number) => gsap.fromTo(target,{top:`${height + scale*height}vh`,height:`${-scale*height}vh`, ease:'linear'},{top:`0`,height:`${-scale*height}vh`,duration:seconds+scale*seconds,ease:'linear'});

let rectShrink = (target:string, scale:number) => gsap.fromTo(target,{top:`0`,height:`${-scale*height}vh`,ease:'linear'},{top:`0`,height:`0`,duration:-scale * seconds,ease:'linear'});

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewChecked,OnInit {
  title = 'MidiKeysOverlay';
  webSocketService:WebSocketService;
  noteData:string;
  config:any;
  keys:{[key:number]:Key};
  justPressed:{note:string,press:number}[];
  justReleased:{note:string,press:number}[];
  currAnimation:gsap.core.Tween|undefined;
  runningAnimations:{[key:string]:gsap.core.Tween};
  leftMargin:string;
  leftNegative:string;

  constructor(){
    this.webSocketService = new WebSocketService();
    this.config = "";
    this.noteData="Data:";
    this.keys={};
    this.justPressed=[];
    this.justReleased=[];
    this.currAnimation = undefined;
    this.runningAnimations={}
    this.leftMargin="0px";
    this.leftNegative="0px";

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
            this.keys[noteId].timesPressed++;
            const keyPress:KeyPress = {
              startTime:now,
              endTime:-1,
              diff:1,
              pressId:this.keys[noteId].timesPressed
            }
            this.justPressed.unshift({'note':noteId.toString(),'press':keyPress.pressId});
            this.keys[noteId].keyPresses.unshift(keyPress);
          }else{
            this.keys[noteId].pressed = false;
            const press = this.keys[noteId].keyPresses[0]
            press.endTime = now;
            press.diff = -(now - this.keys[noteId].keyPresses[0].startTime)/(seconds*1000) ;
            if(press.diff < -1){
              press.diff = -1;
            }
            this.justReleased.unshift({'note':noteId.toString(),'press':press.pressId});
          }
        }
        console.log(JSON.stringify(this.keys[noteId].keyPresses));
      });
    });
    
  }

  ngOnInit(): void {
    
  }

  ngAfterViewChecked(){
    this.leftMargin = $('.keyboardContainer').css("margin-left");
    this.leftMargin = this.leftMargin.substring(0,this.leftMargin.length-2);

    this.leftNegative = $('.leftKey').css('margin-left');
    this.leftNegative = this.leftNegative?.substring(0,this.leftNegative.length-2);
    console.log('leftneg' + this.leftNegative)

    console.log(this.leftMargin);
    for(let key of this.justPressed){
      const noteId=parseInt(key['note']);
      const selector="#a"+noteId+'-'+key['press'];
      console.log(noteId.toString());
      this.runningAnimations[selector] = rectGrow(selector);
      this.justPressed = this.justPressed.slice(1,this.justPressed.length-1);
    }
    for(let key of this.justReleased){
      const noteId=parseInt(key['note']);
      const scale = this.keys[noteId].keyPresses[0].diff
      const selector = "#a"+noteId+'-'+key['press'];
      
      console.log(this.keys[noteId].keyPresses[0].diff);
      if(scale == -1){
        this.runningAnimations[selector].kill();
        this.currAnimation=rectShrink(selector,scale);
      }else{
        this.runningAnimations[selector].kill();
        this.runningAnimations[selector] = rectSlide(selector,scale);
        setTimeout(() =>{
          this.currAnimation=rectShrink(selector,scale);
          this.runningAnimations[selector].kill();
        }, (scale + 1) * 1000 * seconds);
        setTimeout(()=>{
          // this.keys[noteId].keyPresses.pop()
          this.runningAnimations[selector].kill();
        }, 1000 * seconds)
      }
      
      
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

  computestyle = (ind:number) => {
    const colors = ["rgb(256,256,256)","rgb(125,0,0)","rgb(0,125,0)"];
    console.log('size'+(ind*20 + parseFloat(this.leftMargin))+'px');
    return {'background-color':colors[ind%3], 'left':(ind*20 + parseFloat(this.leftMargin))+'px'};
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
        keyPresses:[],
        timesPressed:0
      }
      this.keys[i+10]=key;
    }
    console.log(JSON.stringify(this.keys));
  }
  

  public readonly NoteNames = NoteNames;
}
