export type Constructor<T = object> = new (...args: any[]) => T;

export type MixinTarget<TTarget extends Constructor, TSource extends Constructor> =
  TTarget &
    TSource & {
      prototype: InstanceType<TTarget> & InstanceType<TSource>;
    };

const STATIC_IGNORED_KEYS = new Set(["length", "name", "prototype"]);
const PROTOTYPE_IGNORED_KEYS = new Set(["constructor"]);

function getOwnKeys(target: object): Array<string | symbol> {
  return [...Object.getOwnPropertyNames(target), ...Object.getOwnPropertySymbols(target)];
}

function copyProperties(
  source: object,
  target: object,
  ignoredKeys: ReadonlySet<string>
): void {
  for (const key of getOwnKeys(source)) {
    if (typeof key === "string" && ignoredKeys.has(key)) {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor) {
      continue;
    }
    Object.defineProperty(target, key, descriptor);
  }
}

export function mixin<TSource extends Constructor, TTarget extends Constructor>(
  source: TSource,
  target: TTarget
): MixinTarget<TTarget, TSource> {
  copyProperties(source.prototype, target.prototype, PROTOTYPE_IGNORED_KEYS);
  copyProperties(source, target, STATIC_IGNORED_KEYS);
  return target as MixinTarget<TTarget, TSource>;
}
