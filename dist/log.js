"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nobostateEnableLog = exports._globalLogger = exports.Logger = void 0;
class Logger {
    groupEnd() {
        console.groupEnd();
    }
    log(message) {
        console.log(message);
    }
    groupLog(message) {
        console.group(message);
    }
}
exports.Logger = Logger;
exports._globalLogger = null;
function nobostateEnableLog() {
    if (!exports._globalLogger) {
        exports._globalLogger = new Logger();
    }
}
exports.nobostateEnableLog = nobostateEnableLog;
//# sourceMappingURL=log.js.map