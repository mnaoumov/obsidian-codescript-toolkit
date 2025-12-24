# [`TypeScript`][TypeScript] modules

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

Adds support for [`TypeScript`][TypeScript] modules:

```js
require('./path/to/script.ts');
require('./path/to/script.cts');
require('./path/to/script.mts');
```

> [!WARNING]
>
> When the plugin loads a [`TypeScript`][TypeScript] module, it strips all type annotations and convert the code into [`JavaScript`][JavaScript] syntax.
>
> The plugin will report an error only if the code is syntactically incorrect. No type-checking is performed, as it done by IDEs and/or compilers.
>
> So you can potentially load some non-compilable [`TypeScript`][TypeScript] module, and the plugin won't report any errors. You can get runtime errors when using the module.
>
> It is advisable to validate your [`TypeScript`][TypeScript] modules with external IDEs and/or compilers.
>
> Example of such problematic module:
>
> ```ts
> interface Foo {
>   bar: string;
> }
>
> export function printFoo(foo: Foo): void {
>   console.log(foo.barWithTypo); // this line would cause a compilation error in a regular IDE, but the plugin won't report any errors
> }
> ```
>
> The plugin just strips all type annotations and converts the code into [`JavaScript`][JavaScript]:
>
> ```js
> export function printFoo(foo) {
>   console.log(foo.barWithTypo);
> }
> ```
>
> So when we execute within [`Obsidian`][Obsidian]:
>
> ```js
> require('/FooModule.ts').printFoo({ bar: 'baz' });
> ```
>
> we get `undefined` instead of `baz`.

[JavaScript]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[Obsidian]: https://obsidian.md/
[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
[TypeScript]: https://www.typescriptlang.org/
