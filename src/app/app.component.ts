import {AfterViewChecked, Component} from '@angular/core';
import { ConfigService } from './service/ConfigService';
import { WebSocketService } from './service/WebSocketService';
import { Observable} from 'rxjs';
import { parse } from 'yaml';
import { Key, KeyPress } from './common/key';
import { NoteNames, NoteData} from './common/notes';
import gsap from 'gsap';

const seconds = 2;

const height = 80;

let rectGrow = (target: string) => gsap.fromTo(target, 
  { top: `0vh`, height: 0, ease: 'linear' }, 
  { top: `${-height}vh`, height: `${height}vh`, duration: seconds, ease: 'linear' });


let rectSlide = (target: string, scale: number) => gsap.fromTo(target, 
  { top: `${scale * height}vh`, height: `${-scale * height}vh`, ease: 'linear' }, 
  { top: `-${height}vh`, height: `${-scale * height}vh`, duration: seconds + scale * seconds, ease: 'linear' });


let rectShrink = (target: string, scale: number) => gsap.fromTo(target, 
  { top: `${-height}vh`, height: `${-scale * height}vh`, ease: 'linear' }, 
  { top: `${-height}vh`, height: `0`, duration: -scale * seconds, ease: 'linear' });

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewChecked {
  title = 'MidiKeysOverlay';
  webSocketService: WebSocketService;
  noteData: string;
  config: any;
  keys: { [key: number]: Key };
  justPressed: { note: string, press: number }[];
  justReleased: { note: string, press: number }[];
  currAnimation: gsap.core.Tween | undefined;
  runningAnimations: { [key: string]: gsap.core.Tween };
  colours: string[] = [];
  patternLength = 0;

  constructor() {
    this.webSocketService = new WebSocketService();
    this.config = "";
    this.noteData = "Data:";
    this.keys = {};
    this.justPressed = [];
    this.justReleased = [];
    this.currAnimation = undefined;
    this.runningAnimations = {}

    ConfigService.getConfig().subscribe((confValue) => {
      if (!this.config) {
        this.config = parse(confValue);
        this.patternLength = this.config.colors.length;
        const range = this.generateKeyboard();
        this.assignColours(this.config.colors.pattern,this.config.colors.keyboard, range);
      }
    })

    this.webSocketService.getWebSocket().then((ws: Observable<string>) => {
      ws.subscribe((wsValue) => {
        this.noteData = this.noteData + wsValue;
        const data: NoteData = JSON.parse(wsValue);

        const fixedNote = this.shiftDown(data.noteName);

        const noteId = NoteNames.indexOf(fixedNote) + 10;
        const now: number = Date.now();
        if (this.keys[noteId]) {
          if (data.velocity > 0) {
            this.keys[noteId].pressed = true;
            this.keys[noteId].timesPressed++;
            const keyPress: KeyPress = {
              startTime: now,
              endTime: -1,
              diff: 1,
              pressId: this.keys[noteId].timesPressed
            }
            this.justPressed.unshift({ 'note': noteId.toString(), 'press': keyPress.pressId });
            this.keys[noteId].keyPresses.unshift(keyPress);
          } else {
            this.keys[noteId].pressed = false;
            const press = this.keys[noteId].keyPresses[0]
            press.endTime = now;
            press.diff = -(now - this.keys[noteId].keyPresses[0].startTime) / (seconds * 1000);
            if (press.diff < -1) {
              press.diff = -1;
            }
            this.justReleased.unshift({ 'note': noteId.toString(), 'press': press.pressId });
          }
        }
      });
    });
  }

  ngAfterViewChecked() {
    for (let key of this.justPressed) {
      const noteId = parseInt(key['note']);
      const selector = "#a" + noteId + '-' + key['press'];

      this.runningAnimations[selector] = rectGrow(selector);
      this.justPressed = this.justPressed.slice(1, this.justPressed.length - 1);
    }
    for (let key of this.justReleased) {
      const noteId = parseInt(key['note']);
      const scale = this.keys[noteId].keyPresses[0].diff
      const selector = "#a" + noteId + '-' + key['press'];

      if (scale == -1) {
        this.runningAnimations[selector].kill();
        this.currAnimation = rectShrink(selector, scale);
      } else {
        this.runningAnimations[selector].kill();
        this.runningAnimations[selector] = rectSlide(selector, scale);
        setTimeout(() => {
          this.currAnimation = rectShrink(selector, scale);
          this.runningAnimations[selector].kill();
        }, (scale + 1) * 1000 * seconds);
        setTimeout(() => {
          // this.keys[noteId].keyPresses.pop()
          this.runningAnimations[selector].kill();
        }, 1000 * seconds)
      }
      this.justReleased = this.justReleased.slice(1, this.justReleased.length - 1);
    }
  }

  isLeftKey(key: Key, index: number) {
    return key.isWhiteKey &&
      ((key.noteName.includes('C')
        || key.noteName.includes('F'))
        || index == 0);
  }

  isMiddleKey(key: Key, index: number) {
    return key.isWhiteKey &&
      ((key.noteName.includes('D')) && (index !== Object.values(this.keys).length - 1 && index !== 0));
  }

  isMiddleKey1(key: Key, index: number) {
    return key.isWhiteKey &&
      (key.noteName.includes('G') && (index !== Object.values(this.keys).length - 1 && index !== 0));
  }

  isMiddleKey2(key: Key, index: number) {
    return key.isWhiteKey &&
      (key.noteName.includes('A') && (index !== Object.values(this.keys).length - 1 && index !== 0));
  }

  isRightKey(key: Key, index: number) {
    return key.isWhiteKey
      && (key.noteName.includes('E')
        || key.noteName.includes('B'));
  }

  isExtraKey(key: Key, index: number) {
    return index == Object.values(this.keys).length - 1;
  }


  shiftDown(noteName: string) {
    let result = "";
    const numbers = "0123456789";
    for (let char of noteName) {
      if (numbers.includes(char)) {
        const num = parseInt(char);
        result += (num - 1).toString();
      } else {
        result += char
      }
    }
    return result;
  }

  hexToRGBA(hex:string,alpha:number, darken:number){
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    if(!result) return "";

    const darker = {
      r:parseInt(result[1], 16) - darken,
      g:parseInt(result[2], 16) - darken,
      b:parseInt(result[3], 16) - darken
    }

    return `rgba(${darker.r}, ${darker.g}, ${darker.b}, ${alpha})`;
  }

  assignColours = (pattern:string[],keyboard:string[], range:number) => {
    let style = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(style);
    let styleText = '';
    if(pattern){
      for(let i = 0; i<=range;i++){
        let styleRule = `.color${i} { background-color: ${this.hexToRGBA(pattern[i%pattern.length],0.7,0)} !important;  }`;
        let gradientRule = `.grad${i} { background-image: linear-gradient(to right ,${this.hexToRGBA(pattern[i%pattern.length],1,0)},${this.hexToRGBA(pattern[i%pattern.length],1,30)})   !important;  }`;
        styleText = styleText.concat(styleRule, gradientRule);
      }
    }else if(keyboard){
      //TODO for later
    }
    style.innerHTML =styleText;
  };

  generateKeyboard = ():number => {
    const leftInd = NoteNames.indexOf(this.config.range.leftKey);
    const rightInd = NoteNames.indexOf(this.config.range.rightKey);

    for (let i = leftInd; i <= rightInd; i++) {
      const note = NoteNames[i];
      const key: Key = {
        isWhiteKey: !note.includes("#"),
        noteName: note,
        pressed: false,
        velocity: 0,
        keyPresses: [],
        timesPressed: 0
      }
      this.keys[i + 10] = key;
    }

    return rightInd-leftInd;
  }
  
  public readonly NoteNames = NoteNames;
}
