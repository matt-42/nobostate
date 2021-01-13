import { createState, stateTable } from "./nobostate"

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