import _ from "lodash";
import { StateBaseInterface } from "./StateBase";


type AutorunFunction = (() => void) | (() => () => void);

type AccessInfo = {
  state: StateBaseInterface<any>,
  key: string | null
}

export function autorunIgnore<R>(f: () => R) {
  if (!currentAutorunContext) return f();

  const ctx = currentAutorunContext;
  if (ctx.ignoreAccesses === true) {
    return f();
  }

  ctx.ignoreAccesses = true;

  // console.group(">>>> autorunIgnore start");
  try {
    var res = f();
  }
  finally {
    if (ctx !== currentAutorunContext) throw new Error(
      "Got a different autorun context after running the autorun ignore function."
    );
    ctx.ignoreAccesses = false;
  }
  // console.log("<<<< autorunIgnore end");
  // console.groupEnd();
  return res;
}

class AccessInfoMap<V> {
  map = new Map<StateBaseInterface<any>, Map<string | null, V>>();

  get size() {
    let s = 0;
    this.map.forEach(m => { s += m.size; });
    return s;
  }

  has(info: AccessInfo) {
    return this.map.get(info.state)?.has(info.key) || false;
  }
  clear() { return this.map.clear(); }
  get(info: AccessInfo) {
    return this.map.get(info.state)?.get(info.key);
  }
  set(info: AccessInfo, val: V) {
    if (currentAutorunContext?.ignoreAccesses) {
      // console.log("autorun ignore ", info.key);
      return;
    }

    let m1 = this.map.get(info.state);
    if (!m1) {
      m1 = new Map<string, V>();
      this.map.set(info.state, m1);
    }
    m1.set(info.key, val);
    return this;
  }
  delete(info: AccessInfo) {
    this.map.get(info.state)?.delete(info.key);
    return this;
  }
  forall(f: (pair: [AccessInfo, V]) => void) {

    for (let [state, m2] of this.map)
      for (let [key, value] of m2)
        f([{ state: state, key: key }, value]);
  }
}

interface AutorunContext {
  accesses: AccessInfoMap<boolean>
  disposers: AccessInfoMap<() => void>
  ignoreAccesses : boolean
}

export let currentAutorunContext: AutorunContext | null = null;

type AutorunParams = { track: AutorunFunction, react: () => void }
export function autorun(f: AutorunParams, name?: string): () => void;
export function autorun(trackAndReact: AutorunFunction, name?: string): () => void;
export function autorun(f: AutorunFunction | AutorunParams,
  name?: string): () => void {

  const params = f as AutorunParams;
  const trackAndReact = f as AutorunFunction;
  const isParams = params.track !== undefined
  const reaction = new Reaction(() => { });

  const track = () => reaction.track(isParams ? params.track : trackAndReact, name);
  reaction.reactionCallback = isParams ? params.react : track;

  track();
  return () => reaction.dispose();
}

const reactionStack = [] as AutorunContext[];

export class Reaction {

  ctx: AutorunContext;
  disposed = false;
  reactionCallback: () => void;

  constructor(reactionCallback: () => void) {
    this.reactionCallback = reactionCallback;
    this.ctx = {
      accesses: new AccessInfoMap<boolean>(),
      disposers: new AccessInfoMap<() => void>(),
      ignoreAccesses: false
    };
  }

  printDependencies() {
    this.ctx.disposers.forall(([{ state, key },]) => {
      console.log(`${state._path()}${key ? "/" + key : ""}`);
    })
  }

  dispose() {
    this.disposed = true;
    // console.log("dispose REACTION.", this.name)
    this.ctx.disposers.forall(f => {
      // console.log("   dispose ", f[0].key);
      f[1]();
    });
    this.ctx.disposers.clear();
  }

  name = "";
  track<R>(trackedFunction: () => R, name?: string) {
    this.name = name || "";
    if (this.disposed) {
      throw new Error(`Reaction is already disposed: ${name} `);
    }

    // if (this.disposed) {
    //   console.warn("Reaction is already disposed: ", name);
    // }

    if (currentAutorunContext === this.ctx) {
      console.trace("Recursive reaction", name);
      return;
    }
    reactionStack.push(this.ctx);
    // retrieve the context.
    currentAutorunContext = this.ctx;

    // console.group("START AUTORUN", name);

    // if (name === "robot TCP") {
    //   console.log("Dependencies of ", name);
    //   this.printDependencies();
    // }

    // run the autorun function
    try {
      return trackedFunction();
    }
    finally {


      // currentAutorunContext.accesses.forall(pair => {
      // console.log("  got access to ", pair[0].key);
      // })
      // dispose to outdated subscribers.
      this.ctx.disposers.forall(acc => {
        if (!this.ctx.accesses.has(acc[0])) {
          // console.log(`unsubscribe to ${acc[0].key}`);
          this.ctx.disposers.get(acc[0])?.();
          this.ctx.disposers.delete(acc[0]);
        }
      });
      // subsribe to new dependencies.
      this.ctx.accesses.forall(acc => {
        if (!this.ctx.disposers.has(acc[0])) {
          // console.log(`subscribe to ${acc[0].key}`);
          const { state, key } = acc[0];

          // const onRemoveDisposer = state._onBeforeRemove(() => {
          //   // console.log('onRemoveDisposer ', name);
          //   this.dispose();

          // });
          const info =
            key === null || (Array.isArray(state) && key === "length") ?
              {
                access: { state, key: null }, dispose: state._subscribe(() => {
                  if (!this.disposed && currentAutorunContext !== this.ctx) {
                    // console.log("REACTION ", name);
                    // if (name === "robot TCP")
                    //   this.printDependencies();
                    this.reactionCallback();
                  }
                })
              }
              :
              {
                access: acc[0], dispose: state._subscribeKey(key, () => {
                  // if (name === "robot TCP")
                  //   console.log("REACTION ", name, key);
                  if (!this.disposed && currentAutorunContext !== this.ctx) {
                    // console.log("REACTION ", name);
                    // if (name === "robot TCP")
                    //   this.printDependencies();
                    this.reactionCallback();
                  }
                })
              }

          const disposeOnRemoveAndSubscribe = () => {
            // onRemoveDisposer();
            info.dispose();
          }
          this.ctx.disposers.set(info.access, disposeOnRemoveAndSubscribe);
          // if (key === null || (Array.isArray(state) && key === "length"))
          // {

          //   this.ctx.disposers.set({ state, key: null }, state._subscribe(this.reactionCallback));
          // }
          // else
          //  this.ctx.disposers.set(acc[0], state._subscribeKey(key, this.reactionCallback));
        }
      });

      // if (name === "robot TCP") {
      //   console.warn("AFTER autorun of ", name, this.ctx.disposers.size,
      //     "disposers and ", this.ctx.accesses.size, "accesses");
      //   console.warn("AFTER Dependencies of ", name, this.ctx.disposers.size);
      //   this.printDependencies();
      // }

      // save previousAccesses.
      this.ctx.accesses.clear();



      // pop current stack.
      reactionStack.pop();
      currentAutorunContext = _.last(reactionStack) || null;
      console.groupEnd();

    }

  }

}

