"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reaction = exports.debouncedAutorun = exports.autorun = exports.currentAutorunContext = exports.autorunIgnore = void 0;
const lodash_1 = __importDefault(require("lodash"));
function autorunIgnore(f) {
    if (!exports.currentAutorunContext)
        return f();
    const ctx = exports.currentAutorunContext;
    if (ctx.ignoreAccesses === true) {
        return f();
    }
    ctx.ignoreAccesses = true;
    // console.group(">>>> autorunIgnore start");
    try {
        var res = f();
    }
    finally {
        if (ctx !== exports.currentAutorunContext)
            throw new Error("Got a different autorun context after running the autorun ignore function.");
        ctx.ignoreAccesses = false;
    }
    // console.log("<<<< autorunIgnore end");
    // console.groupEnd();
    return res;
}
exports.autorunIgnore = autorunIgnore;
class AccessInfoMap {
    constructor() {
        this.map = new Map();
    }
    get size() {
        let s = 0;
        this.map.forEach(m => { s += m.size; });
        return s;
    }
    has(info) {
        var _a;
        return ((_a = this.map.get(info.state)) === null || _a === void 0 ? void 0 : _a.has(info.key)) || false;
    }
    clear() { return this.map.clear(); }
    get(info) {
        var _a;
        return (_a = this.map.get(info.state)) === null || _a === void 0 ? void 0 : _a.get(info.key);
    }
    set(info, val) {
        if (exports.currentAutorunContext === null || exports.currentAutorunContext === void 0 ? void 0 : exports.currentAutorunContext.ignoreAccesses) {
            // console.log("autorun ignore ", info.key);
            return;
        }
        let m1 = this.map.get(info.state);
        if (!m1) {
            m1 = new Map();
            this.map.set(info.state, m1);
        }
        m1.set(info.key, val);
        return this;
    }
    delete(info) {
        var _a;
        (_a = this.map.get(info.state)) === null || _a === void 0 ? void 0 : _a.delete(info.key);
        return this;
    }
    forall(f) {
        for (let [state, m2] of this.map)
            for (let [key, value] of m2)
                f([{ state: state, key: key }, value]);
    }
}
exports.currentAutorunContext = null;
function autorun(f, name) {
    const params = f;
    const trackAndReact = f;
    const isParams = params.track !== undefined;
    const reaction = new Reaction(() => { });
    const track = () => reaction.track(isParams ? params.track : trackAndReact, name);
    reaction.reactionCallback = isParams ? params.react : track;
    track();
    return () => reaction.dispose();
}
exports.autorun = autorun;
function debouncedAutorun(f, name, wait = 10) {
    const params = f;
    const trackAndReact = f;
    const isParams = params.track !== undefined;
    const reaction = new Reaction(() => { });
    const track = () => reaction.track(isParams ? params.track : trackAndReact, name);
    reaction.reactionCallback = lodash_1.default.debounce(() => {
        if (!reaction.disposed)
            isParams ? params.react() : track();
    }, wait);
    track();
    return () => reaction.dispose();
}
exports.debouncedAutorun = debouncedAutorun;
const reactionStack = [];
// Reaction class.
//    take 2 functions:
//       track:  run the function and remember every state members access.
//       reaction: run this function whenever a state members accessed by the track function
//                 has been changed. 
class Reaction {
    constructor(reactionCallback) {
        this.disposed = false;
        this.name = "";
        this.reactionCallback = reactionCallback;
        this.ctx = {
            accesses: new AccessInfoMap(),
            disposers: new AccessInfoMap(),
            ignoreAccesses: false
        };
    }
    printDependencies() {
        this.ctx.disposers.forall(([{ state, key },]) => {
            console.log(`${state._path()}${key ? "/" + key : ""}`);
        });
    }
    // dispose reaction.
    dispose() {
        this.disposed = true;
        // console.log("dispose REACTION.", this.name)
        this.ctx.disposers.forall(f => {
            // console.log("   dispose ", f[0].key);
            f[1]();
        });
        this.ctx.disposers.clear();
    }
    track(trackedFunction, name) {
        this.name = name || "";
        if (this.disposed) {
            throw new Error(`Reaction is already disposed: ${name} `);
        }
        // if (this.disposed) {
        //   console.warn("Reaction is already disposed: ", name);
        // }
        if (exports.currentAutorunContext === this.ctx) {
            console.trace("Recursive reaction", name);
            return;
        }
        reactionStack.push(this.ctx);
        // retrieve the context.
        exports.currentAutorunContext = this.ctx;
        // console.group("START AUTORUN", name);
        // if (name === "robot TCP") {
        //   console.log("Dependencies of ", name);
        //   this.printDependencies();
        // }
        // run the autorun function
        try {
            return trackedFunction();
        }
        finally {
            // currentAutorunContext.accesses.forall(pair => {
            // console.log("  got access to ", pair[0].key);
            // })
            // dispose to outdated subscribers.
            this.ctx.disposers.forall(acc => {
                var _a;
                if (!this.ctx.accesses.has(acc[0])) {
                    // console.log(`unsubscribe to ${acc[0].state._path()}/${acc[0].key}`);
                    (_a = this.ctx.disposers.get(acc[0])) === null || _a === void 0 ? void 0 : _a();
                    this.ctx.disposers.delete(acc[0]);
                }
            });
            // subsribe to new dependencies.
            this.ctx.accesses.forall(acc => {
                if (!this.ctx.disposers.has(acc[0])) {
                    // console.log(`subscribe to ${acc[0].state._path()}/${acc[0].key}`);
                    const { state, key } = acc[0];
                    // const onRemoveDisposer = state._onBeforeRemove(() => {
                    //   // console.log('onRemoveDisposer ', name);
                    //   this.dispose();
                    // });
                    const info = key === null || (Array.isArray(state) && key === "length") ?
                        {
                            access: { state, key: null }, dispose: state._subscribe(() => {
                                if (!this.disposed && exports.currentAutorunContext !== this.ctx) {
                                    // console.log("REACTION ", name);
                                    // if (name === "robot TCP")
                                    //   this.printDependencies();
                                    this.reactionCallback();
                                }
                            })
                        }
                        :
                            {
                                access: acc[0], dispose: state._subscribeKey(key, () => {
                                    // if (name === "robot TCP")
                                    //   console.log("REACTION ", name, key);
                                    if (!this.disposed && exports.currentAutorunContext !== this.ctx) {
                                        // console.log("REACTION ", name);
                                        // if (name === "robot TCP")
                                        //   this.printDependencies();
                                        this.reactionCallback();
                                    }
                                })
                            };
                    const disposeOnRemoveAndSubscribe = () => {
                        // onRemoveDisposer();
                        info.dispose();
                    };
                    this.ctx.disposers.set(info.access, disposeOnRemoveAndSubscribe);
                    // if (key === null || (Array.isArray(state) && key === "length"))
                    // {
                    //   this.ctx.disposers.set({ state, key: null }, state._subscribe(this.reactionCallback));
                    // }
                    // else
                    //  this.ctx.disposers.set(acc[0], state._subscribeKey(key, this.reactionCallback));
                }
            });
            // if (name === "robot TCP") {
            //   console.warn("AFTER autorun of ", name, this.ctx.disposers.size,
            //     "disposers and ", this.ctx.accesses.size, "accesses");
            //   console.warn("AFTER Dependencies of ", name, this.ctx.disposers.size);
            //   this.printDependencies();
            // }
            // save previousAccesses.
            this.ctx.accesses.clear();
            // pop current stack.
            reactionStack.pop();
            exports.currentAutorunContext = lodash_1.default.last(reactionStack) || null;
            console.groupEnd();
        }
    }
}
exports.Reaction = Reaction;
//# sourceMappingURL=autorun.js.map