import { createState, stateTable, stateArray, stateObjectArray } from "./nobostate";

function subscribeTest(state: any, listener: Function, update: () => void) {
  let called = false;
  let dispose = state._subscribe((s: any, prop: any) => { called = true; listener(s, prop); });
  update();
  expect(called).toBe(true);
  dispose();
}


test('subscribers-with-key', () => {

  let state = createState({
    table: stateTable<{id: number, test:number}>(),
    array: stateArray<{id: number, test:number}>(),
    objectArray: stateObjectArray<{id: number, test:number}>(),
  });

  expect(state.table._parentListener).toBeTruthy();

  let obj = state.table.insert({id : 1, test: 0});
  expect(obj._parentListener).toBeTruthy();

  subscribeTest(state,
    (s: any, prop: any) => {
      expect(prop).toBe("table");
    },
    () => state.table.insert({id : 1, test: 0})
  );
  // state
  subscribeTest(state,
    (s: any, prop: any) => expect(prop).toBe("table"),
    () => state.table.assertGet(1).test = 2
  );

  subscribeTest(state.table.assertGet(1),
    (s: any, prop: any) => expect(prop).toBe("test"),
    () => state.table.assertGet(1).test = 3
  );

  subscribeTest(state.array,
    (s: any, prop: any) => expect(prop).toBe(0),
    () => state.array.push({id : 1, test: 0})
  );

  subscribeTest(state.array,
    (s: any, prop: any) => expect(prop).toBe(1),
    () => state.array.push({id : 1, test: 0})
  );


  subscribeTest(state.objectArray,
    (s: any, prop: any) => expect(prop).toBe(0),
    () => state.objectArray.push({id : 1, test: 0})
  );

  subscribeTest(state.objectArray,
    (s: any, prop: any) => expect(prop).toBe(1),
    () => state.objectArray.push({id : 1, test: 0})
  );

  expect(state.objectArray[1]._parentListener).toBeTruthy();

  subscribeTest(state.objectArray,
    (s: any, prop: any) => expect(prop).toBe(1),
    () => state.objectArray[1]._parentListener()
  );


  subscribeTest(state.objectArray,
    (s: any, prop: any) => expect(prop).toBe(1),
    () => state.objectArray[1].test = 5
  );

});


test('subscribe-selector', () => {
  let state = createState({ table: stateTable<{id: number}>() });

  let called = 0;
  state.table._subscribeSelector(table => table.get(1), () => called++);
});
