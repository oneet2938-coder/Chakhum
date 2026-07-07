---
name: Drizzle raw SQL array parameters
description: How to pass PostgreSQL integer[] values in drizzle-orm sql template literals without them expanding into multi-param tuples.
---

## The problem

When you do `sql\`... ${myArray} ...\`` where `myArray` is a JS array like `[1,2,3]`, drizzle-orm expands it as `($1, $2, $3)` — a tuple, not a PostgreSQL array. This breaks `INTEGER[]` column inserts/updates.

## The fix

Build a PostgreSQL array literal string and inject it with `sql.raw()`:

```typescript
const tids = topicIds ?? [];
const tidsLiteral = tids.length > 0
  ? `'{${tids.join(",")}}'::integer[]`
  : "ARRAY[]::integer[]";

await db.execute(sql`
  INSERT INTO my_table (ids) VALUES (${sql.raw(tidsLiteral)})
`);
```

**Why:** `sql.raw()` injects the string verbatim without parameter binding, so PostgreSQL sees a proper array literal. Validate/sanitize the values first (ensure they are integers) to prevent injection.

**How to apply:** Any drizzle raw `sql\`\`` query that sets or inserts an `INTEGER[]` column must use this pattern. Affects `series_tests.topic_ids`, `series_test_questions` ordering, etc.
