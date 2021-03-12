import _ from "lodash";
import { StateBaseInterface } from "./StateBase";
import { StateTable } from "./StateTable";


type AutorunFunction = (() => void) | (() => () => void);

type AccessInfo = {
  state: StateBaseInterface<any>,
  key: string | null
}

let autorunTracking = true;

export function autorunIgnore<R>(f: () => R) {
  if (!currentAutorunContext) return f();

  if (autorunTracking === false) {
    return f();
  }

  autorunTracking = false;

  // console.log(">>>> autorunIgnore start");
  try {
    var res = f();
  }
  finally {
    autorunTracking = true;
  }
  // console.log("<<<< autorunIgnore end");
  return res;
}

class AccessInfoMap<V> {
  map = new Map<StateBaseInterface<any>, Map<string | null, V>>();

  has(info: AccessInfo) {
    return this.map.get(info.state)?.has(info.key) || false;
  }
  clear() { return this.map.clear(); }
  get(info: AccessInfo) {
    return this.map.get(info.state)?.get(info.key);
  }
  set(info: AccessInfo, val: V) {
    if (!autorunTracking) {
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
}

export let currentAutorunContext: AutorunContext | null = null;

type AutorunParams = { track: AutorunFunction, react: () => void }
export function autorun(f: AutorunParams, name?: string) : () => void;
export function autorun(trackAndReact: AutorunFunction, name?: string) : () => void;
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
      disposers: new AccessInfoMap<() => void>()
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

    // console.log("START AUTORUN.");
    // run the autorun function
    try {
      return trackedFunction();
    }
    finally {

      // console.log("AUTORUN END.");

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
                    // this.printDependencies();
                    this.reactionCallback();
                  }
                })
              }
              :
              {
                access: acc[0], dispose: state._subscribeKey(key, () => {
                  if (!this.disposed && currentAutorunContext !== this.ctx) {
                    // console.log("REACTION ", name);
                    // this.printDependencies();
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

      // save previousAccesses.
      this.ctx.accesses.clear();

      // pop current stack.
      reactionStack.pop();
      currentAutorunContext = _.last(reactionStack) || null;
    }

  }

}

