"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nobostate_1 = require("./nobostate");
let state = nobostate_1.createState({
    table1: nobostate_1.stateTable()
});
const toLoad = { _stateObject: {
        table1: { _stateTable: [] },
    } };
console.time("create 10000 items");
for (let i = 0; i < 10000; i++) {
    toLoad._stateObject.table1._stateTable.push({
        _stateObject: { id: i, name: "john" }
    });
}
console.timeEnd("create 10000 items");
console.log("_____LOAD____");
console.time("Load 10000 items");
state._load(toLoad);
console.log(state.table1.size);
console.timeEnd("Load 10000 items");
//# sourceMappingURL=unwrap_revive.bench.js.map