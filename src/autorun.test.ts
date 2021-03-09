import { autorun } from "./autorun";
import { createState, stateArray, stateObject, stateTable } from "./nobostate";
import { stateReference } from "./StateReference";
import { stateReferenceArray } from "./StateReferenceArray";
import { newIntId } from "./StateTable";

// test('autorun simple', () => {

//   const state = createState({
//     obj: stateObject({
//       str: "hello"
//     })
//   });

//   let called = 0;
//   autorun(() => {
//     const test = state.obj.str;
//     called ++;
//   })

//   expect(called).toBe(1);

//   state.obj.str = "1";
//   expect(called).toBe(2);
//   state.obj.str = "1";
//   expect(called).toBe(3);

// });

test('autorun-dynamic', () => {

  const state = createState({
    obj: stateObject({
      x: 0, y: 1
    })
  });

  let called = 0;
  autorun(() => {
    called++;
    const test = called < 2 ? state.obj.x : state.obj.y;
  })

  expect(called).toBe(1);

  state.obj.y = 1;
  expect(called).toBe(1);
  state.obj.x = 1;
  expect(called).toBe(2);

  state.obj.x = 1;
  expect(called).toBe(2);


  state.obj.x = 1;
  state.obj.y = 1;
  expect(called).toBe(3);

  state.obj.x = 1;
  expect(called).toBe(3);

});

test('autorun on stateArray', () => {
  const state = createState({
    arr: stateArray<number>()
  });

  state.arr.push(1, 2, 3);

  let i = 0;
  let called = 0;
  autorun(() => {
    const test = state.arr[i];
    called++;
  })

  expect(called).toBe(1);

  state.arr[0] = 42;
  expect(called).toBe(2);

  state.arr[1] = 42;
  expect(called).toBe(2);

  i = 1;
  state.arr[0] = 42;
  expect(called).toBe(3);
  state.arr[0] = 42;
  expect(called).toBe(3);

  state.arr[1] = 42;
  expect(called).toBe(4);

});

class Test extends Array {

  get length2() 
  {
    console.log("get length!!");
    return super.length;
  }
}

// test('autorun-debug-length', () => {

//   // const x = new Test();
//   // console.log(x.length2);
//   const state = createState({
//     table: stateTable<{id: number}>(),
//     arr: stateArray<number>(),
//     refs: stateReferenceArray<{id: number}>()
//   }, {
//     setSpecs: (props, specs) => {
//       specs.referenceArray(props.refs, props.table);
//     }
//   });

//   const l = state.refs.length;
//   console.log(state.refs.length);
// });

test('autorun-on-stateArray-stateArrayReference-length', () => {
  const state = createState({
    table: stateTable<{id: number}>(),
    arr: stateArray<number>(),
    refs: stateReferenceArray<{id: number}>()
  }, {
    setSpecs: (props, specs) => {
      specs.referenceArray(props.refs, props.table);
    }
  });

  
  const test = (run : () => void, modifier: () => void) => {
    let called = 0;
    const dispose = autorun(() => {
      run();
      called++;
    });  
    expect(called).toBe(1);
    modifier();
    expect(called).toBe(2);
    modifier();
    expect(called).toBe(3);

    dispose();
  }

  state.arr.push(1, 2, 3);
  test(() => state.arr.map(x => 0), () => state.arr.length = 1);
  test(() => state.arr.map(x => 0), () => state.arr.push(1));
  test(() => state.arr.forEach(x => 0), () => state.arr.push(1));
  test(() => {state.arr.length;}, () => state.arr.push(1));

  const A = state.table.insert({id: newIntId()});
  const B = state.table.insert({id: newIntId()});
  state.refs.push(A, B);

  test(() => state.refs.map(x => 0), () => state.refs.length = 1);
  test(() => state.refs.map(x => 0), () => state.refs.push(B));
  state.refs.clear();
  test(() => state.refs.forEach(x => 0), () => state.refs.push(B));
  state.refs.clear();
  test(() => {state.refs.length;}, () => state.refs.push(B));

});

test('autorun on ref', () => {
  const state = createState({
    table: stateTable<{ id: number }>(),
    ref: stateReference<{ id: number }>(null)
  }, {
    setSpecs: (props, specs) => {
      specs.reference(props.ref, props.table);
    }
  });

  let called = 0;
  autorun(() => {
    const test = state.ref;
    called++;
  })

  expect(called).toBe(1);

  state.ref.set({ id: newIntId() });
  expect(called).toBe(2);
  state.ref.set(null);
  expect(called).toBe(3);

});


test('autorun setting values should not add any deps', () => {
  const state = createState({
    table: stateTable<{ id: number }>(),
    ref: stateReference<{ id: number }>(null),
    x: 0
  }, {
    setSpecs: (props, specs) => {
      specs.reference(props.ref, props.table);
    }
  });

  let X = state.table.insert({id : newIntId()});
  let called = 0;
  autorun(() => {
    state.x = 0
    called++;
  })

  expect(called).toBe(1);
  state.x = 0;
  expect(called).toBe(1);

  called = 0;
  autorun(() => {
    state.ref.set(X);
    called++;
  });

  expect(called).toBe(1);
  state.ref.set(X);
  expect(called).toBe(1);


});