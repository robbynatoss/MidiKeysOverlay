export type Key  = {
    pressed:boolean;
    velocity:number;
    noteName:string;
    isWhiteKey:boolean;
    keyPresses:KeyPress[];
    timesPressed:number;
}

export type KeyPress = {
    //ms since epoch
    startTime:number;
    endTime:number;
    diff:number;
    pressId:number;
}