import { createState, stateArray, stateObjectArray, stateTable } from "./nobostate";
import { stateReference, StateReference, StateReferenceNotNull, stateReferenceNotNull } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { unwrapState } from "./unwrap_revive";

let state = createState({
    table1: stateTable<{ id: number, name : string }>()
  });

  const toLoad = { _stateObject: { 
    table1: { _stateTable: [] as any }, 
  }};

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
  console.log(state.table1.size)
  console.timeEnd("Load 10000 items");
