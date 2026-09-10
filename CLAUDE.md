# Xpenses

## 1. Project Context

Xpenses is a personal expense-management application.

The long-term goal is to provide a fast and practical way to:

* Record expenses and income manually.
* Categorize transactions.
* Edit and manage historical transactions.
* Visualize spending and income through metrics and time-series charts.
* Define recurring income and expenses.
* Confirm recurring transactions when they become due.
* Define budgets based on expected income.
* Support configurable budget allocations such as savings, entertainment, etc.
* Provide a fast workflow for the most common action: recording an expense.

The project is currently early-stage and is also being used as a learning project for Next.js and modern React architecture.

Do not implement future functionality merely because it is described here. This section describes product direction and context, not a list of features that should be implemented automatically.

---

## 2. Current Stack

* Next.js 16.1.6
* React 19.2.3
* TypeScript 5 with `strict: true`
* Next.js App Router
* Tailwind CSS 4
* shadcn/ui
* Zustand 5
* class-variance-authority
* clsx
* tailwind-merge
* lucide-react
* React Compiler
* Recharts is planned for data visualization

Path alias:

```text
@/* -> repository root
```

ESLint 9 with the Next.js configuration is used.

There is currently no Prettier configuration.

There is currently no automated testing framework or test suite.

---

## 3. Architecture

The project uses a feature-oriented structure.

Current example:

```text
features/
  expenses/
    expenses.types.ts
    expenses.mock.ts
    expenses.service.ts
    components/
```

This organization should be considered the current architectural direction, but avoid creating unnecessary layers or abstractions for small features.

Prefer simple solutions that are appropriate for the current size of the application.

Do not introduce an abstraction merely because it might be useful in the future.

When a new feature is added, first determine whether existing architecture can support it before introducing new architectural patterns.

---

## 4. Data Layer

The current application uses an in-memory mock service.

Current flow:

```text
UI
 ↓
Zustand store
 ↓
expenses.service
 ↓
in-memory mock data
```

The service layer currently simulates asynchronous operations.

There is no real backend yet.

### Future backend

The application is expected to eventually communicate with a backend API.

The service layer should therefore remain a reasonable boundary between UI/application state and data access, but do not design a complex API abstraction before an actual backend exists.

Zustand should NOT be treated as the mandatory data-fetching layer.

When backend APIs are introduced, evaluate whether data should be handled through:

* Server Components
* Server-side data fetching
* API calls
* Client-side state
* Zustand

based on the specific use case.

Do not automatically place all remotely fetched data into Zustand.

Zustand is better suited to client-side state that genuinely benefits from centralized/shared state.

### Financial data model

Credit-card debt (`features/expenses/balance.ts`) only persists facts: a purchase (an expense linked to an account, with the card's payment day snapshotted onto it at the time of purchase), a payment (amount, date, source account), and the account itself. Current debt, what's due now, upcoming obligations, and remaining installments are always computed from those facts, never stored — check whether a new "how much/when" value is derivable before adding a field for it.

A purchase's snapshotted payment day is never re-read from the account afterward, so editing a card's settings never rewrites the schedule of past purchases. A payment is never linked to a specific purchase; attribution (which purchase it "covers") is always recomputed, oldest obligation first.

Accounts remain optional on every transaction. An entry with no account is "untracked" and is treated as a direct cash movement — this fallback must keep working as account-related features grow; do not make account selection required.

---

## 5. State Management

Zustand is currently used for expenses.

It should not automatically be introduced for every piece of state.

Prefer:

* Local React state for local component state.
* Server/data-fetching mechanisms for server data when appropriate.
* Zustand only when shared client-side state or persistent client application state justifies it.

Examples of state that may benefit from Zustand in the future include globally relevant user/application information or client-side preferences.

Do not introduce Zustand simply because the project already uses it.

When one store's action needs another store's current data, read it via `useOtherStore.getState()` rather than coupling the stores' hooks together. Example: `store/subscriptions.store.ts`'s `syncDueEntries` reads and writes `useExpensesStore` this way.

---

## 6. Next.js / React

Use the App Router.

Prefer Server Components by default when possible.

Use `"use client"` only when client-side capabilities are actually required, such as:

* React state
* Event handlers requiring client execution
* Browser APIs
* Client-side interactive libraries

Do not add `"use client"` unnecessarily.

When implementing a feature, consider whether the functionality belongs on the server or client before choosing the component boundary.

Avoid introducing unnecessary client-side fetching when the functionality can naturally be handled server-side.

React Compiler is enabled (see ESLint's `react-hooks` rules, e.g. `react-hooks/set-state-in-effect`, `react-hooks/preserve-manual-memoization`). Do not reset a component's state with `useEffect` + `setState` in response to a prop change — pass a `key` from the parent to force a remount instead.

---

## 7. Styling and UI

Use Tailwind CSS for styling.

Use shadcn/ui components when an appropriate primitive already exists.

Use `cn()` when class merging is needed.

Use `class-variance-authority` when a component genuinely requires multiple visual variants.

Avoid creating custom abstractions around shadcn components unless there is a concrete project-specific reason.

Keep project-specific components separate from generic UI primitives.

shadcn's `Select` (Radix) rejects an empty-string item value. For an optional selection, use a sentinel string (e.g. `"none"`) and convert it to/from `undefined` at the boundary — see `NO_ACCOUNT` in `ExpenseDialog`.

---

## 8. Expense Entry UX

Fast expense entry is one of the most important product requirements.

The common workflow should require as little information and interaction as possible.

Example intended flow:

```text
User types:
"Coffee"

↓
Clicks register

↓
Expense form/modal opens:

Name: Coffee
Date: Today
Category: No category
Price: Focused input

↓
User enters:
3990

↓
Save
```

The application should infer sensible defaults whenever possible.

For example:

* Date defaults to the current date/time.
* Category/tag is optional and defaults to empty.
* The most important missing field should receive focus automatically.

Do not require the user to provide information that can reasonably be inferred.

When implementing expense-related UX, prioritize speed and low interaction cost.

The entry dialog has grown to support credit-card and subscription features (account, installments, affects-balance). Keep new fields progressively disclosed — visible only when relevant, e.g. installments only appear once a credit account is selected — rather than always-visible, to protect the fast-entry goal above.

---

## 9. Product Direction

The application is expected to eventually support:

### Transactions

* Manual expenses
* Manual income
* Editing transactions
* Categories/tags
* Historical transaction management

### Analytics

* Spending metrics
* Income metrics
* Category-based analysis
* Time-series visualization
* Charts using Recharts when appropriate

### Recurring transactions

Implemented as Subscriptions (`features/subscriptions/`). A subscription has a title, an optional fixed amount (undefined means variable — set when the generated entry is paid), a category, a billing day (1-31), and an optional end date; it can be active or paused, and can only be deleted while paused.

The "backend creates an entry when it's due" behavior is currently simulated client-side (`syncDueEntries` in `store/subscriptions.store.ts`): on load, it checks each subscription's most recent billing date and creates a `pending` entry if that cycle doesn't have one yet. Paying a pending entry (via the normal entry dialog) assigns it an account and clears `pending`.

Recurrence is monthly-only, driven by a single day-of-month. Arbitrary periods (e.g. "every 5 days") are not implemented.

### Budgets

Users should eventually be able to define budgets based on expected income.

For example:

```text
40% → Savings
25% → Entertainment
...
```

The exact budgeting model is not yet defined.

---

## 10. Authentication and Backend

Authentication is a future requirement.

The current idea is:

```text
Google Login
     ↓
Authentication provider
     ↓
JWT
     ↓
Backend API
     ↓
Validate authenticated request
```

AWS Cognito is currently being considered as the authentication provider.

This is a future architectural direction, not an implemented feature.

Do not introduce authentication infrastructure unless explicitly requested.

Do not assume Cognito is permanently selected until the decision is made.

---

## 11. Current Known State

Routes:

```text
/
/dashboard
/accounts
/subscriptions
```

`/` and `/dashboard` both render the expense list, although their implementations differ. This duplication appears to be leftover development scaffolding and should not be treated as an intentional architectural pattern. The canonical route has not yet been decided.

`/accounts` and `/subscriptions` were added later and are each the single implementation for their feature.

Current unused/incomplete functionality includes:

* Several shadcn components that are not yet connected to real functionality

Do not remove or refactor these automatically unless the current task requires it.

---

## 12. Testing

There is currently no automated testing setup.

Do not introduce a testing framework unless explicitly requested or unless a future task specifically requires one.

When testing becomes a project priority, establish the testing strategy deliberately rather than adding multiple testing tools by default.

---

## 13. Dependencies

Avoid adding dependencies when the existing stack can reasonably solve the problem.

Before introducing a new library:

1. Check whether the functionality already exists in the current stack.
2. Consider whether the dependency is justified by the complexity of the problem.
3. Prefer the simplest solution appropriate for the current project.

Do not add dependencies speculatively for future requirements.

---

## 14. Development Principles

### Prefer simplicity

This is an early-stage project.

Do not over-engineer solutions for hypothetical future requirements.

### Avoid premature abstractions

Do not create generic abstractions when there is only one concrete use case unless the abstraction provides an immediate and clear benefit.

### Preserve existing patterns

Before introducing a new pattern, inspect the existing code and determine whether an existing pattern can be reused.

### Separate facts from assumptions

Do not assume that a common Next.js or React best practice is an existing project convention.

If the repository does something unusual, understand why before changing it.

### Minimize unnecessary changes

When implementing a task, modify only what is necessary to accomplish it.

Do not perform unrelated refactors.

### Consider UX

For user-facing functionality, especially expense entry, optimize for speed and minimal interaction.

---

## 15. Implementation Workflow

When implementing a non-trivial feature:

1. Understand the requested behavior.
2. Inspect the relevant existing code.
3. Identify the smallest reasonable implementation.
4. Consider whether existing architecture can support it.
5. Implement the feature.
6. Validate the implementation.
7. Report what changed and any relevant limitations.

For larger features, break the work into smaller independently understandable pieces before implementation.

Do not automatically create multiple abstractions, agents, or layers simply because the feature is large.

---

## 16. Important Constraint

This file describes both the current state of the project and intentional architectural/product direction.

When the two differ, distinguish between:

* **Current state** — what the repository currently contains.
* **Project decision** — something explicitly established as a convention.
* **Future direction** — something planned but not implemented.

Never treat a future direction as an implemented capability.
Never treat an observed implementation detail as an intentional architectural rule unless explicitly stated.
