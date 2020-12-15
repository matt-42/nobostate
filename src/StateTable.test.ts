import { createState, stateTable } from "./nobostate";

interface Todo {
  id: string,
  description: string
  nullable: number | null
};

let state = createState({
  todos: stateTable<Todo>()
  // todos: Array<Todo>()
});

test('table-insert-remove', () => {
  // console.log(state);
  // state.t
  // let table = stateTable<Todo>();
  // console.log(table);
  expect(state.todos.size).toBe(0);
  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.size).toBe(1);

  // state.todos[1]
  let todo = state.todos.assertGet("1");
  expect(todo.id).toEqual("1");
  expect(todo.nullable).toEqual(23);
  expect(todo.description).toEqual("test");

  state.todos.remove("1");
  expect(state.todos.size).toBe(0);

});


test('subscribe on table', () => {

  let called = false;
  let called2 = false;
  state.todos.insert({ id: "1", description: "test", nullable: 23 });

  state._subscribe("todos", () => called2 = true)
  state.todos._subscribe("1", todo => {
    expect(todo.nullable).toBe(12);
    called = true;
  });

  state.todos.assertGet("1").nullable = 12;
  expect(state.todos.assertGet("1").nullable).toBe(12);

  expect(called).toBe(true);
  expect(called2).toBe(true);

});

// listen on insert/remove
test('subscribe-table-insert-remove', () => {

  let state = createState({
    todos: stateTable<Todo>()
  });

  expect(state.todos._parentListener).toBeTruthy();
  let called = 0;
  // state.todos._subscribe(() =>
  //   called++
  // );
  state._subscribe("todos", () =>
    called++
  );

  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(called).toBe(1);
  state.todos.remove("1");
  expect(called).toBe(2);
});

test("table iterator", () => {
  let state = createState({ todos: stateTable<Todo>() });

  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  state.todos.insert({ id: "2", description: "test2", nullable: 24 });

  let arr = [...state.todos.values()];

  expect(arr.length).toBe(2);
  expect(arr[0].nullable).toBe(23);
  expect(arr[1].nullable).toBe(24);
});


test("table attach", () => {
  let state = createState({ table: stateTable<{ id: number }>() });

  let called = 0;
  state.table.attach(elt => {
    called++;
    expect(called).toBe(elt.id);

    return () => {
      expect(called).toBe(elt.id);
      called--;
    }
  });

  state.table.insert({ id: 1 });
  state.table.insert({ id: 2 });

  expect(called).toBe(2);

  state.table.remove(2);
  state.table.remove(1);

  expect(called).toBe(0);
});