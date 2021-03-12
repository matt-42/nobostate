import { createState, stateTable } from "./nobostate"
import { StateReferenceNotNull, stateReferenceNotNull } from "./StateReference";
import { newIntId } from "./StateTable";

test("transaction", () => {
  const state = createState({
    str: ""
  });

  let called = 0;
  state._subscribeKey("str", () => {
    called++;
  });

  // Simple transactions.
  state._transaction(() => {

    state.str = "aa";
    state.str = "ab";
    expect(called).toBe(0);
  });

  expect(called).toBe(2);

  // Nested transactions.
  state._transaction(() => {

    state._transaction(() => {
      state.str = "aab";
      expect(called).toBe(2);
    });
    expect(called).toBe(2);
  });

  expect(called).toBe(3);



})

test("check-not-null-references", () => {
  type T = {id : number };
  type T2 = {id : number, ref: StateReferenceNotNull<T> };

  const state = createState({
    table: stateTable<T>(),
    table2: stateTable<T2>(),
  }, {
    setSpecs: (props, specs) => {
      specs.reference(props.table2.ref, props.table);
    }
  });

  const t1 = state.table.insert({id: newIntId()});
  const t2 = state.table2.insert({id: newIntId(), ref: stateReferenceNotNull<T>(t1)});

  expect(state._checkReferencesNotNull()).toBe(true);
  
  expect(t2._children.includes(t2.ref as any)).toBeTruthy();

  (t2.ref as any)._ref = null;

  expect(state._checkReferencesNotNull(true)).toBe(false);
})