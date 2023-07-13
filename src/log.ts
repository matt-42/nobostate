export class Logger {

    groupEnd() {
      console.groupEnd();
    }
  
    log(message: any) {
      console.log(message);
    }
  
    groupLog(message: any) {
      console.group(message);
    }
  }
  
  export let _globalLogger : Logger | null = null;
  
  export function nobostateEnableLog() {
    if (!_globalLogger) {
      _globalLogger = new Logger();
    }
  }
  