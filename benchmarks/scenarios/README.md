# Scenarios

Required browser baselines: 1x512, heavy 1024 under 6x throttling, 5x256, 20x256, mixed 20, and
framework-specific 50x128 at 24 FPS with frameStep 1 and adaptive quality disabled.

For repeated keyed sources, reports also record the number of matching instances, distinct source
frames requested per worker tick, and native rasterizations. Synchronized instances should approach
one native rasterization per distinct source frame while canvas presentation remains per instance.
