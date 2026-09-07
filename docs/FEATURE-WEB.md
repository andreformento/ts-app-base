# Adding a feature to the web

`apps/web` is conventional React. This is what "conventional" means here, so
that two sessions adding two screens produce the same shapes.
`src/features/spaces` is the worked example; `docs/FEATURE-API.md` is the same
procedure for the api.

## The order

1. **The api endpoint exists first**, and `make openapi` has been run. The web
   never types a response by hand — `src/types/api.ts` is generated
   (`CLAUDE.md` rule 9)
2. `src/lib/api.ts` — one method per endpoint
3. `src/features/<name>/use-<name>.ts` — the query and mutation hooks
4. `src/features/<name>/<name>-list.tsx`, `<name>-form.tsx` — the components
5. `src/components/ui/` — **only** when a control is used by more than one
   feature
6. `src/router.tsx` — add a route to the tree, with its screen in
   `src/routes/<screen>.tsx`
7. `test/e2e/<name>.e2e-spec.ts` — a Playwright spec with an axe check

Every file is kebab-case, in both apps. The export inside stays PascalCase:
`space-form.tsx` exports `SpaceForm`.

## The client

`src/lib/api.ts` holds one `openapi-fetch` client and one method per endpoint.
Each method is a single `client.VERB(...)` call ending the same way:

```ts
listSpaces: async (): Promise<Space[]> => {
  const result = await client.GET('/spaces');
  if (result.error !== undefined) throw refused(result.response, result.error);
  return result.data;
},
```

A method that returns nothing checks the same `result.error`, and returns after
it — a 204 carries no body to return.

**The repetition is deliberate.** `openapi-fetch` narrows `data` and `error`
per endpoint from the generated `paths` type; folding these methods into one
generic wrapper takes a type parameter instead, which is the assertion
`docs/DECISIONS.md` § The web's api types are generated exists to remove. Six
similar lines are cheaper than one `as`.

Path parameters go through `params`, never string concatenation:

```ts
await client.PATCH('/spaces/{id}', { params: { path: { id } }, body: input });
```

## Cache

TanStack Query, with conventions worth following exactly:

- **One key per feature**, a module-scope constant:
  `const SPACES = ['spaces'] as const`
- **A mutation invalidates its feature's key** in `onSuccess`
- **Sign-out calls `resetQueries()`**, not `invalidateQueries()`. The cache
  belongs to the identity that just left; invalidating would refetch it
- **Optimistic updates are the exception.** `useDeleteSpace` is the worked
  example: `cancelQueries` → snapshot with `getQueryData` → `setQueryData` →
  roll back in `onError` → `invalidateQueries` in `onSettled`. Worth it for a
  destructive action whose result the user is already looking at; not worth it
  for a create or an edit, where the refetch arrives while the form is closing

## Forms

`react-hook-form`, with a locally declared value type and the rules inline in
`register`:

```ts
type SpaceFormValues = { name: string; description: string };

const form = useForm<SpaceFormValues>({ defaultValues: { ... } });

<input
  {...form.register('name', {
    required: 'Name is required.',
    maxLength: {
      value: NAME_MAX,
      message: `Name must be at most ${String(NAME_MAX)} characters.`,
    },
  })}
/>
```

`useForm<Values>()` is the whole type guarantee: it checks every `register`
path and every `formState.errors` access. **No schema library and no
resolver** — see `CLAUDE.md` rule 6 and `docs/DECISIONS.md` § Validation on the
web. A `Record<keyof Values, RegisterOptions>` to force rule completeness was
considered and rejected: it is a trick, not the idiom.

Limits come from `src/lib/space.rules.ts`, which declares them for the web
deliberately rather than importing the api's.

## Every input goes through `Field`

`src/components/ui/field.tsx` owns the label association and the error wiring —
`id`, `aria-invalid`, `aria-describedby`, and the message in a `role="alert"`.
It is a render prop:

```tsx
<Field label="Name" error={form.formState.errors.name?.message}>
  {(props) => <input {...props} {...form.register('name', { ... })} />}
</Field>
```

This is not optional. `docs/TESTING.md` requires browser specs to select by
what a user can see — text, roles, labels — and that only holds if every
control is labelled and every error announced. A bare `<input>` breaks the axe
check in the same spec that would have found it.

## Errors the user sees

`ApiError` carries the status and a message; the message comes from
`messageOf`, which reads the api's `Failure` envelope (`statusCode`, `message`,
`error`). A query renders its own failure branch; a mutation sets
`form.setError('root', { message })` and the form renders it in one
`role="alert"`.

Per `docs/DECISIONS.md` § Errors are Nest's there is no machine-readable error
code, so a server-side refusal is shown in one place rather than on the field
it belongs to. Client-side rules still mark their own fields, because the form
validates before submitting.

## Routing

`src/router.tsx` holds the whole tree: a root route rendering `Outlet` with a
`notFoundComponent`, and one `createRoute` per screen. A screen component lives
in `src/routes/`.

Search params are validated on the route that owns them, which is how the
sign-in callback reads its token:

```ts
validateSearch: (search: Record<string, unknown>): HomeSearch =>
  typeof search['id_token'] === 'string' ? { id_token: search['id_token'] } : {},
```

Read them with `useSearch({ from: '/' })` and clear them with
`navigate({ search: {}, replace: true })`. Nothing in the web touches
`window.location.search` or `history.replaceState`. See `docs/DECISIONS.md`
§ Routing is typed.

## Testing

Tier 1 covers only the pure helpers in `src/lib` — `space.rules.spec.ts`,
`api.spec.ts`. **Components get no unit test**, and `@testing-library/react` is
not a dependency and is not to be added: the mock ban (`CLAUDE.md` rule 1)
makes a component test either a lie or an integration test, so a component is
covered by the browser tier against the real stack instead.

A browser spec drives the built bundle against the running api and the OIDC
container. Select by role, label and text; add an axe check for a screen a user
fills in. `docs/TESTING.md` § Tier 2 has the harness.
