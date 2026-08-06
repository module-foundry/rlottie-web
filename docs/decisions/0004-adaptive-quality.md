# ADR 0004: Opt-in bounded adaptive quality

Status: accepted.

Adaptive quality is disabled by default. When enabled, it lowers resolution one configured step
after consecutive overloaded windows, then optionally lowers FPS. Recovery requires a longer stable
period and restores FPS before resolution. Public options constrain outcomes; internal thresholds
remain private until browser baselines exist.
