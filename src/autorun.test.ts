import { autorun, Reaction } from "./autorun";
import { createState, stateArray, stateObject, stateTable } from "./nobostate";
import { StateReference, stateReference, stateReferenceNotNull, StateReferenceNotNull } from "./StateReference";
import { StateReferenceArray, stateReferenceArray } from "./StateReferenceArray";
import { newIntId } from "./StateTable";
import { unwrapState } from "./unwrap_revive";

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

  get length2() {
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
    table: stateTable<{ id: number }>(),
    arr: stateArray<number>(),
    refs: stateReferenceArray<{ id: number }>()
  }, {
    setSpecs: (props, specs) => {
      specs.referenceArray(props.refs, props.table);
    }
  });


  const test = (run: () => void, modifier: () => void) => {
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
  test(() => { state.arr.length; }, () => state.arr.push(1));

  const A = state.table.insert({ id: newIntId() });
  const B = state.table.insert({ id: newIntId() });
  state.refs.push(A, B);

  test(() => state.refs.map(x => 0), () => state.refs.length = 1);
  test(() => state.refs.map(x => 0), () => state.refs.push(B));
  state.refs.clear();
  test(() => state.refs.forEach(x => 0), () => state.refs.push(B));
  state.refs.clear();
  test(() => { state.refs.length; }, () => state.refs.push(B));

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

test('autorun-set-ref-should-not-subscribe', () => {
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
    state.ref.set(null);
    called++;
  })

  expect(called).toBe(1);

  state.ref.set({ id: newIntId() });
  expect(called).toBe(1);
  state.ref.set(null);
  expect(called).toBe(1);

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

  let X = state.table.insert({ id: newIntId() });
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


test('reaction-on-deleted-object-should-not-happend', () => {


  const state = createState({
    table: stateTable<{ id: number, name: string }>(),
    ref: stateReference<{ id: number }>(null),
    x: 0
  }, {
    setSpecs: (props, specs) => {
      specs.reference(props.ref, props.table);
    }
  });

  const obj = state.table.insert({ id: newIntId(), name: "a" });
  let called = 0;
  const reaction = new Reaction(() => { called++; });

  reaction.track(() => {
    obj.name;
  });

  expect(called).toBe(0);

  obj.name = "b";
  expect(called).toBe(1);

  state.table.remove(obj.id);

  obj.name = "c";

  expect(called).toBe(1);

});

// test('reaction-on-deleted-object-should-not-happend-2', () => {

//   const state = createState({
//     table: stateTable<{ id: number, name: string }>(),
//     ref: stateReference<{ id: number }>(null),
//     x: 0
//   }, {
//     setSpecs: (props, specs) => {
//       specs.reference(props.ref, props.table);
//     }
//   });

//   const obj = state.table.insert({ id: newIntId(), name: "a" });
//   let called = 0;
//   const reaction = new Reaction(() => { called++; });

//   reaction.track(() => {
//     obj.name;
//     state.x;
//   });

//   expect(called).toBe(0);

//   obj.name = "b";
//   expect(called).toBe(1);

//   state.x = 1;
//   expect(called).toBe(2);

//   obj._onRemove(() => state.x = 42)
//   state.table.remove(obj.id);
//   obj.name = "x";
//   expect(called).toBe(2);

//   expect(state.x).toBe(42);
// });


// test('reaction-on-deleted-object-should-not-happend-3', () => {

//   const state = createState({
//     table: stateTable<{ id: number, name: string }>(),
//     ref: stateReference<{ id: number, name: string }>(null),
//     x: 0
//   }, {
//     log: false,
//     setSpecs: (props, specs) => {
//       specs.reference(props.ref, props.table);
//     }
//   });

//   const obj = state.table.insert({ id: newIntId(), name: "a" });
//   state.ref.set(obj);

//   let called = 0;
//   const reaction = new Reaction(() => {
//     // console.log("reaction!");
//     called++;
//   });

//   reaction.track(() => {
//     state.ref.ref?.name;
//     state.x;
//   }, "test");

//   expect(called).toBe(0);

//   obj.name = "b";
//   expect(called).toBe(1);

//   state.x = 1;
//   expect(called).toBe(2);

//   // obj._onRemove(() => state.x = 42)
//   state.table.remove(obj.id);
//   // obj.name = "x";

//   expect(called).toBe(2);

//   // expect(state.x).toBe(42);
// });

// test('reaction-on-deleted-object-should-not-happend-4', () => {

//   interface MeshStore {
//     id: number;
//     data: any;
//   }
  
//   type Frame = { id: number, name: string, parentFrame: StateReference<Frame> };
//   const createNewState = () => createState({

//     meshStores: stateTable<MeshStore>(),
//     frames: stateTable<Frame>(),
//     tools: stateTable<{
//       id: number,
//       name: string,
//       frame: StateReferenceNotNull<Frame>,
//       meshFrames: StateReferenceArray<Frame>,
//       meshStore: StateReferenceNotNull<MeshStore>
//     }>()
//   }, {
//     log: false,
//     setSpecs: (props, specs) => {
//       specs.referenceArray(props.tools.meshFrames, props.frames, {own: true });
//       specs.reference(props.frames.parentFrame, props.frames, { onRefDeleted: (elt, removed) => {
//         elt.parentFrame.set(null);
//         elt.name = "x";
//       }});
//       specs.reference(props.tools.frame, props.frames, {own: true, onRefDeleted: "cascade"});
//       specs.reference(props.tools.meshStore, props.meshStores, {own: true, onRefDeleted: "cascade"});
//     }
//   });

//   const state = createNewState();
//   const tool = state.tools.insert({
//     id: newIntId(),
//     name: "a",
//     frame: stateReferenceNotNull<Frame>({
//       id: newIntId(),
//       name: "f",
//       parentFrame: stateReference<Frame>(null)
//     }),
//     meshStore: stateReferenceNotNull<MeshStore>({
//       id: newIntId(),
//       data: "f"
//     }),
//     meshFrames: stateReferenceArray<Frame>([])
//   });

//   tool.meshFrames.push({
//     id: newIntId(),
//     name: "f1",
//     parentFrame: stateReference<Frame>(tool.frame.ref)

//   }, {
//     id: newIntId(),
//     name: "f2",
//     parentFrame: stateReference<Frame>(tool.frame.ref)
//   })

//   let called = 0;
//   const reaction = new Reaction(() => {
//     // console.log("reaction!");
//     called++;
//   });

//   reaction.track(() => {
//     tool.meshFrames.length;
//     tool.meshFrames[0].name;
//     tool.meshStore.ref.id;
//     tool.meshFrames.forEach(m => { m.parentFrame.ref; m.name; m.id; });
//     tool.frame.ref.name;
//   }, "test");

//   expect(called).toBe(0);
  

//   // state._load(unwrapState(createNewState()));
//   // expect(tool.__removed__).toBe(true);
//   // state.tools.remove(tool.id);
//   state.frames.clear();
//   // state.tools.clear();
//   expect(tool.__removed__).toBe(true);
//   expect(called).toBe(0);

// });
