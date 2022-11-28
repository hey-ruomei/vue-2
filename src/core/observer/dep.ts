import config from '../config'
import { DebuggerOptions, DebuggerEventExtraInfo } from 'v3'

let uid = 0

const pendingCleanupDeps: Dep[] = []

export const cleanupDeps = () => {
  for (let i = 0; i < pendingCleanupDeps.length; i++) {
    const dep = pendingCleanupDeps[i]
    dep.subs = dep.subs.filter(s => s)
    dep._pending = false
  }
  pendingCleanupDeps.length = 0
}

/**
 * @internal
 */
export interface DepTarget extends DebuggerOptions {
  id: number
  addDep(dep: Dep): void
  update(): void
}

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * @internal
 */
export default class Dep {
  static target?: DepTarget | null
  id: number
  subs: Array<DepTarget | null>
  // pending subs cleanup
  _pending = false

  constructor() {
    this.id = uid++
    this.subs = []
  }

  // 添加依赖
  addSub(sub: DepTarget) {
    this.subs.push(sub)
  }
  // 移除依赖
  removeSub(sub: DepTarget) {
    // #12696 deps with massive amount of subscribers are extremely slow to
    // clean up in Chromium
    // to workaround this, we unset the sub for now, and clear them on
    // next scheduler flush.
    this.subs[this.subs.indexOf(sub)] = null
    if (!this._pending) {
      this._pending = true
      pendingCleanupDeps.push(this)
    }
  }

  // 添加依赖 watcher 入 dep.subs 列表
  depend(info?: DebuggerEventExtraInfo) {
    if (Dep.target) {
      // 真正触发依赖收集是 watcher 实例通过调用其 addDep 方法实现的
      // watcher.addDep 方法接受 dep 实例作为参数
      // watcher.addDep 方法中会调用 dep.addSub 来添加依赖
      debugger
      Dep.target.addDep(this)
      if (__DEV__ && info && Dep.target.onTrack) {
        Dep.target.onTrack({
          effect: Dep.target,
          ...info
        })
      }
    }
  }

  // 触发更新
  notify(info?: DebuggerEventExtraInfo) {
    // stabilize the subscriber list first
    const subs = this.subs.filter(s => s) as DepTarget[]
    if (__DEV__ && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    // 遍历依赖列表，触发每一个依赖的 update 方法
    for (let i = 0, l = subs.length; i < l; i++) {
      const sub = subs[i]
      if (__DEV__ && info) {
        sub.onTrigger &&
          sub.onTrigger({
            effect: subs[i],
            ...info
          })
      }
      sub.update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack: Array<DepTarget | null | undefined> = []

export function pushTarget(target?: DepTarget | null) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
