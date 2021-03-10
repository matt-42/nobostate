import { StateBaseInterface } from "./StateBase";


type AutorunFunction = (() => void) | (() => () => void);

type AccessInfo = {
  state: StateBaseInterface<any>,
  key: string | null
}

let autorunTracking = true;

export function autorunIgnore<R>(f: () => R) {
  if (!currentAutorunContext) return f();

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

export function autorun(f: AutorunFunction): () => void {

  const reaction = new Reaction(() => {});

  const run = () => reaction.track(f);
  reaction.reactionCallback = run;

  run();
  return () => reaction.dispose();
}

export class Reaction {

  ctx: AutorunContext;

  reactionCallback : () => void;

  constructor(reactionCallback : () => void) {
    this.reactionCallback = reactionCallback;
    this.ctx = {
      accesses: new AccessInfoMap<boolean>(),
      disposers: new AccessInfoMap<() => void>()
    };
  }

  dispose() {
    this.ctx.disposers.forall(f => f[1]());
  }

  track<R>(trackedFunction: () => R) {
    if (currentAutorunContext) {
      // console.warn("Nested runs of autorun are forbidden.");
      return;
    }

    // retrieve the context.
    currentAutorunContext = this.ctx;

    // console.log("START AUTORUN.");
    // run the autorun function
    const res = trackedFunction();
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
      if (!currentAutorunContext?.disposers.has(acc[0])) {
        // console.log(`subscribe to ${acc[0].key}`);
        const { state, key } = acc[0];
        if (key === null || (Array.isArray(state) && key === "length"))
         this.ctx.disposers.set({ state, key: null }, state._subscribe(this.reactionCallback));
        else
         this.ctx.disposers.set(acc[0], state._subscribeKey(key, this.reactionCallback));
      }
    });

    // save previousAccesses.
   this.ctx.accesses.clear();

    // clear current context.
    currentAutorunContext = null;

    return res;

  }

}

