# Local CI

`npm run check` and `npm test` are the default hardware-free CI suite. Hardware tests are not run unless a real board is explicitly selected; system serial ports are never selected automatically.

The intended hardware command is `har ci run --project <path> --suite <suite>`. Its v1 local runner must mark human-action experiments **blocked** in headless mode rather than passing them.
