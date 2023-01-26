import { createState, stateArray, stateObjectArray, stateTable } from "./nobostate";
import { stateReference, StateReference, StateReferenceNotNull, stateReferenceNotNull } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { unwrapState } from "./unwrap_revive";


test('test-array-dummy', () => {
  type Item = { id: number };

  const state = createState({
    arr: stateObjectArray<Item>()
  });

  state.arr.push({id: 32});

  expect(state.arr.length == 1);
  expect(state.arr[0].id == 32);

})