# Memory management

| Resource                               | Owner                     | Release                           |
| -------------------------------------- | ------------------------- | --------------------------------- |
| Fetch/decode task                      | `SourceLoader` call       | abort and drop buffers            |
| Source cache entry                     | bounded LRU               | byte-budget eviction              |
| Dedicated worker                       | shared `WorkerPool`       | idle termination                  |
| Embind animation                       | worker `AnimationSession` | `.delete()`                       |
| Offscreen canvas                       | worker session            | session destruction               |
| ImageBitmap fallback                   | main-thread player        | `.close()` on replacement/destroy |
| Resize/intersection observers          | player                    | `.disconnect()`                   |
| Media query/pointer/document listeners | player/profile binding    | remove listener                   |

WASM memory uses `ALLOW_MEMORY_GROWTH`; tests look for a plateau after warm-up rather than an
immediate reduction of the linear-memory high-water mark. A render view is recreated when its buffer
identity, byte offset, dimensions, or byte length changes.
