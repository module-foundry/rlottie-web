# ADR 0001: One public package

Status: accepted.

Publish one package with core, `/reactjs`, and `/solidjs` exports. Workspace packages remain
private, so core imports never require either framework and consumers cannot accidentally depend on
internal package names.
