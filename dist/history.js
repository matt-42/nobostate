"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DummyHistory = exports.NoboHistory = void 0;
const lodash_1 = __importDefault(require("lodash"));
class NoboHistory {
    constructor(root) {
        this.history = [];
        this.currentHistoryIndex = -1;
        this.grouping = 0; // more than 0 when grouping.
        this.notRecording = 0;
        this.rootState = root;
    }
    startGroup(groupId = null) {
        var _a;
        // Create a new group only if:
        if (!this.grouping && // we are not already in a group
            !this.notRecording && // history recording is active
            // and groupId is null or if it is different from the last history group.
            (groupId === null || ((_a = lodash_1.default.last(this.history)) === null || _a === void 0 ? void 0 : _a.groupId) !== groupId)) {
            // console.log("new group,", _.last(this.history)?.groupId, groupId)
            this.history.push({ groupId, actions: [] });
            this.currentHistoryIndex++;
            // console.log(_.last(this.history)?.groupId);
        }
        this.grouping++;
    }
    endGroup() {
        var _a;
        this.grouping--;
        if (this.grouping < 0)
            throw new Error();
        // If we are ending of an empty history group, remove it. 
        if (this.grouping === 0 && ((_a = lodash_1.default.last(this.history)) === null || _a === void 0 ? void 0 : _a.actions.length) === 0) {
            if (this.currentHistoryIndex === this.history.length - 1)
                this.currentHistoryIndex--;
            let empty = this.history.pop();
            if (empty === null || empty === void 0 ? void 0 : empty.actions.length)
                throw new Error();
        }
    }
    ignore(f) {
        this.notRecording++;
        try {
            return f();
        }
        finally {
            this.notRecording--;
        }
    }
    asyncIgnore(f) {
        return __awaiter(this, void 0, void 0, function* () {
            this.notRecording++;
            try {
                const res = yield f();
                this.notRecording--;
                return res;
            }
            catch (e) {
                this.notRecording--;
                throw e;
            }
        });
    }
    group(groupId_, f_) {
        // if the last group has not the same merge id,
        // create a new group.
        // console.log(this.history.map(i => i.groupId));
        let f = f_ || groupId_;
        let groupId = f_ ? groupId_ : null;
        // if (!this.grouping && !this.notRecording && (groupId === null || _.last(this.history)?.groupId !== groupId)) {
        //   // console.log("new group,", _.last(this.history)?.groupId, groupId)
        //   this.history.push({ groupId, actions: [] });
        //   this.currentHistoryIndex++;
        //   // console.log(_.last(this.history)?.groupId);
        // }
        // else 
        // console.log("no new group,", _.last(this.history)?.groupId, groupId)
        // console.log(this.history.map(i => i.groupId));
        this.startGroup(groupId);
        try {
            return f();
        }
        finally {
            this.endGroup();
        }
    }
    size() { return this.history.length; }
    push(item) {
        // console.log(" PUSH ", item.action, item.target._path(), item.prop);
        var _a, _b;
        if (this.notRecording)
            return;
        // Ignore some props.
        if (item.propId._undoIgnore)
            return;
        // erase future if any.
        // console.log("resize history to ", this.currentHistoryIndex + 1);
        this.history.length = this.currentHistoryIndex + 1;
        // console.log("history size after resize", this.history.length);
        // if last group contains the same updateProp action.
        // and if this group contains just 1 action.
        if (item.action === "updateProp" && ((_a = lodash_1.default.last(this.history)) === null || _a === void 0 ? void 0 : _a.actions.length) === 1) {
            let last = lodash_1.default.last(this.history);
            let sameUpdateInLast = last === null || last === void 0 ? void 0 : last.actions.find(e => e.action === "updateProp" && e.target === item.target && e.propId === item.propId);
            if (sameUpdateInLast) {
                // the last group also updated item.prop, so we group the updates:
                sameUpdateInLast.next = item.next;
                return;
            }
        }
        // if we are grouping, append the action to the group.
        // node: "updateProp" actions are already grouped just above.
        if (this.grouping && lodash_1.default.last(this.history)) {
            (_b = lodash_1.default.last(this.history)) === null || _b === void 0 ? void 0 : _b.actions.push(item);
            return;
        }
        // console.log("PUSH NULL");
        // if item is not grouped, push a new item.
        this.history.push({ groupId: null, actions: [item] });
        this.currentHistoryIndex += 1;
    }
    undoAction(item) {
        // this.rootState._loggerObject?.log("Undo");
        // this.rootState._loggerObject?.log(item);
        if (item.action === "anyAction")
            item.undo();
        else if (item.action === "updateProp") {
            // console.log("UNDO: ", item.target, item.prop, item.target[item.prop], item.next);
            // if (!_.isEqual(item.target[item.prop], item.next))
            //   throw new Error();
            item.target[item.prop] = item.prev;
        }
        else if (item.action === "remove") {
            // console.log("UNDO remove: ", item.element.id);
            item.target.insert(item.element);
        }
        else if (item.action === "insert")
            item.target.remove(item.element.id);
        else if (item.action === "push")
            item.target.pop();
    }
    redoAction(item) {
        if (item.action === "anyAction")
            item.redo();
        // console.log("redo ", item);
        else if (item.action === "updateProp") {
            // if (!_.isEqual(item.target[item.prop], item.prev))
            //   throw new Error(`Redo Error: current value of ${item.target._props?._path?.join("/")}/${item.prop} should be ${item.prev} but it is ${item.target[item.prop]}`);
            item.target[item.prop] = item.next;
        }
        else if (item.action === "remove")
            item.target.remove(item.element.id);
        else if (item.action === "insert")
            item.target.insert(item.element);
        else if (item.action === "push")
            item.target.push(item.element);
    }
    undo() {
        // console.log("START UNDO.");
        this.rootState._transaction(() => {
            this.ignore(() => {
                let group = this.history[this.currentHistoryIndex];
                if (!group) {
                    // console.log(`Undo: Nothing to undo. ${this.history.length}`);
                    return;
                }
                // console.log(`Undo a group of ${group.actions.length} actions`);
                for (let i = group.actions.length - 1; i >= 0; i--)
                    this.undoAction(group.actions[i]);
                this.currentHistoryIndex -= 1;
            });
            // console.log(this.rootState.robots?.get(1)?.frame?.ref);
            // console.log("END UNDO.");
        });
    }
    redo() {
        this.rootState._transaction(() => {
            this.ignore(() => {
                let group = this.history[this.currentHistoryIndex + 1];
                if (!group)
                    return;
                group.actions.forEach(item => this.redoAction(item));
                this.currentHistoryIndex += 1;
            });
        });
    }
    goto(index) {
        if (index < this.currentHistoryIndex)
            while (index != this.currentHistoryIndex) {
                this.undo();
            }
        else
            while (index != this.currentHistoryIndex) {
                this.redo();
            }
    }
}
exports.NoboHistory = NoboHistory;
// Fake History, just execute everything without remembering anything.
class DummyHistory {
    startGroup(groupId = null) { }
    endGroup() { }
    ignore(f) {
        return f();
    }
    asyncIgnore(f) {
        return __awaiter(this, void 0, void 0, function* () {
            return f();
        });
    }
    group(groupId_, f_) {
        let f = f_ || groupId_;
        let groupId = f_ ? groupId_ : null;
        return f();
    }
    push(item) { }
    redo() { }
    goto(index) { }
}
exports.DummyHistory = DummyHistory;
;
//# sourceMappingURL=history.js.map