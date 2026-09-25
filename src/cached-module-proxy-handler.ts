import { noop } from 'obsidian-dev-utils/function';

export const EMPTY_MODULE_SYMBOL = Symbol('emptyModule');

type ApplyTarget = (this: unknown, ...$arguments: unknown[]) => unknown;
type ConstructTarget = new (...$arguments: unknown[]) => unknown;

export class CachedModuleProxyHandler implements ProxyHandler<object> {
  public constructor(private readonly cachedModuleFunction: () => unknown) {
    noop();
  }

  public apply(_target: object, thisArgument: unknown, argumentArray?: unknown[]): unknown {
    const cachedModule = this.cachedModuleFunction();
    return typeof cachedModule === 'function' ? Reflect.apply(cachedModule as ApplyTarget, thisArgument, argumentArray ?? []) : undefined;
  }

  public construct(_target: object, argumentArray: unknown[], newTarget: unknown): object {
    const cachedModule = this.cachedModuleFunction();
    return typeof cachedModule === 'function' ? (Reflect.construct(cachedModule as ConstructTarget, argumentArray, newTarget as ConstructTarget) as object) : {};
  }

  public defineProperty(_target: object, property: string | symbol, attributes: PropertyDescriptor): boolean {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.defineProperty(cachedModule, property, attributes) : false;
  }

  public deleteProperty(_target: object, property: string | symbol): boolean {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.deleteProperty(cachedModule, property) : false;
  }

  public get(_target: object, property: string | symbol, receiver: unknown): unknown {
    if (property === EMPTY_MODULE_SYMBOL) {
      return true;
    }

    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.get(cachedModule, property, receiver) : undefined;
  }

  public getOwnPropertyDescriptor(_target: object, property: string | symbol): PropertyDescriptor | undefined {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.getOwnPropertyDescriptor(cachedModule, property) : undefined;
  }

  public getPrototypeOf(): null | object {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.getPrototypeOf(cachedModule) : null;
  }

  public has(_target: object, property: string | symbol): boolean {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.has(cachedModule, property) : false;
  }

  public isExtensible(): boolean {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.isExtensible(cachedModule) : false;
  }

  public ownKeys(): ArrayLike<string | symbol> {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.ownKeys(cachedModule) : [];
  }

  public preventExtensions(): boolean {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.preventExtensions(cachedModule) : false;
  }

  public set(_target: object, property: string | symbol, value: unknown, receiver: unknown): boolean {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.set(cachedModule, property, value, receiver) : false;
  }

  public setPrototypeOf(_target: object, prototype: null | object): boolean {
    const cachedModule = this.cachedModuleFunction();
    return cachedModule && typeof cachedModule === 'object' ? Reflect.setPrototypeOf(cachedModule, prototype) : false;
  }
}
