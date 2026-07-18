export function foo(arg) {
  const message = `Invoke protocol URL with arg: ${arg}`;
  new Notice(message);
  console.log(message);
}
