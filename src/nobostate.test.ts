import { create, extendWith } from "lodash";
import { createState, NoboTable, unwrapState } from "./nobostate";

interface Todo {
  id: string,
  description: string
  nullable: number | null
};

let state = createState({
  todos: NoboTable<Todo>()
});

test('insert/remove', () => {
  // console.log(state);
  expect(state.todos.size).toBe(0);
  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.size).toBe(1);

  // state.todos[1]
  let todo = state.todos["1"];
  expect(todo.id).toEqual("1");
  expect(todo.nullable).toEqual(23);
  expect(todo.description).toEqual("test");

  state.todos.remove("1");
  expect(state.todos.size).toBe(0);

});

test('subscribe on object', () => {

  let called = false;
  state.todos.insert({ id: "1", description: "test", nullable: 23 });

  // console.log(state.todos._assertGet("1")._subscribe);
  state.todos["1"]._subscribe("nullable", nullable => {
    // console.log("call!!");
    expect(nullable).toBe(12);
    called = true;
  });

  state.todos["1"].nullable = 12;
  expect(state.todos["1"].nullable).toBe(12);

  expect(called).toBe(true);
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

  state.todos["1"].nullable = 12;
  expect(state.todos["1"].nullable).toBe(12);

  expect(called).toBe(true);
  expect(called2).toBe(true);

});

// listen on insert/remove
test('subscribe on table insert/remove', () => {

  let state = createState({
    todos: NoboTable<Todo>()
  });

  let called = 0;
  state._subscribe("todos", () => called++);

  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(called).toBe(1);
  state.todos.remove("1");
  expect(called).toBe(2);
});

test("table iterator", () => {
  let state = createState({todos: NoboTable<Todo>()});

  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  state.todos.insert({ id: "2", description: "test2", nullable: 24 });

  let arr = [...state.todos.all()];

  expect(arr.length).toBe(2);
  expect(arr[0].nullable).toBe(23);
  expect(arr[1].nullable).toBe(24);
});

// unwrap/revive
test('unwrap', () => {
  let state = createState({
    todos: NoboTable<Todo>()
  });

  state.todos.insert({ id: "1", description: "test", nullable: 23 });

  expect(unwrapState(state)).toEqual({
    todos: { _stateTable: [{ id: "1", description: "test", nullable: 23 }] }
  })
});

test('revive', () => {
  let state = createState({
    todos: NoboTable<Todo>()
  });

  state._revive({
    todos: { _stateTable: [{ id: "1", description: "test", nullable: 23 }] }
  });

  expect(state.todos["1"].id).toBe("1");
  expect(state.todos["1"].description).toBe("test");
  expect(state.todos["1"].nullable).toBe(23);
});

function subscribeCheck(state : any, key: any)
{
  let called = false;
  state._subscribe(key, () => called = true);
  return () => expect(called).toBe(true);  
}

// arrays.
test('array push', () => {
  let state = createState({
    todos: [] as Todo[]
  });
  // console.log(state);
  let checkSubscribeonElement = subscribeCheck(state.todos, 0);
  let checkSubscribeonArray = subscribeCheck(state, "todos");
  state.todos.push({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.length).toBe(1);
  expect(state.todos[0].id).toBe("1");
  expect(state.todos[0].description).toBe("test");
  expect(state.todos[0].nullable).toBe(23);

  checkSubscribeonArray();
  checkSubscribeonElement();
});

test('array set', () => {
  let state = createState({
    todos: [] as Todo[]
  });
  // console.log(state);
  let checkSubscribeonElement = subscribeCheck(state.todos, 0);
  let checkSubscribeonArray = subscribeCheck(state, "todos");
  state.todos.push({ id: "1", description: "test", nullable: 23 });
  checkSubscribeonArray();
  checkSubscribeonElement();

  expect(state.todos.length).toBe(1);
  expect(state.todos[0].id).toBe("1");
  expect(state.todos[0].description).toBe("test");
  expect(state.todos[0].nullable).toBe(23);

  let checkSubscribeOnElementUpdate = subscribeCheck(state.todos, 0);
  let checkSubscribeOnElementUpdate1 = subscribeCheck(state, "todos");
  state.todos[0].nullable = 12;
  checkSubscribeOnElementUpdate();
  checkSubscribeOnElementUpdate1();

  expect([...state.todos].length).toBe(1);
});

test('object update', () => {
  let state = createState({ obj: {id: "", age : 0} });

  state.obj._update({id : "1", age: 12});

  expect(state.obj.id).toBe("1");
  expect(state.obj.age).toBe(12);

  state.obj._update({age: 24});
  expect(state.obj.id).toBe("1");
  expect(state.obj.age).toBe(24);

});

// // undo
// test('array set', () => {
//   let state = createState({
//     todos: [] as Todo[]
//   });

//   state.todos.push({ id: "1", description: "test", nullable: 23 });
//   state._undo();
// });
