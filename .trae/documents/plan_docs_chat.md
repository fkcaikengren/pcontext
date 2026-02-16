# Plan: Enhance Docs Detail Page with Chat and URL State

## Objective
1.  Synchronize the `Tabs` state (context/chat/benchmark) with the URL `tab` query parameter in `packages/web/app/routes/docs/detail.tsx`.
2.  Implement a functional `Chat` component in `packages/web/app/components/chat.tsx` using Vercel AI SDK (`useChat`), `streamdown` (Markdown rendering), and `shadcn/ui`.
3.  Connect the chat component to the existing backend endpoint `/api/chat`.

## Steps

### 1. Dependencies
- Install necessary packages in `packages/web`:
  - `ai`
  - `@ai-sdk/react`
  - `streamdown`
  - `@streamdown/code`
  - `@streamdown/math`

### 2. Components

#### `packages/web/app/components/chat.tsx`
- Refactor to use `useChat` from `@ai-sdk/react`.
- Configure `api` endpoint to `/api/chat`.
- Accept `libraryName` (or `slug`) as a prop and pass it in the request body (via `body` or `data` property of `useChat` options).
- **UI Implementation**:
  - **Layout**: Simple, no avatars.
  - **User Message**: Right-aligned, Theme color background (`bg-primary`), White text (`text-primary-foreground`).
  - **AI Message**: Left-aligned, Background color (`bg-muted`), standard text color.
  - **Markdown Rendering**: Use `Streamdown` with `code` (highlighting) and `math` (formulas) plugins.
  - **Auto-scroll**:
    - Automatically scroll to bottom when new messages arrive or are streaming.
    - "Scroll to Bottom" floating button: Visible when user scrolls up, hidden when at bottom.
  - **Input Area**: Sticky at the bottom, using `Input` or `Textarea` and `Button`.

### 3. Routes

#### `packages/web/app/routes/docs/detail.tsx`
- Import `useSearchParams` from `react-router`.
- Initialize `activeTab` from `searchParams.get('tab')` (default to 'chat').
- Update `onValueChange` for `Tabs` to update the URL search params.
- Replace the hardcoded chat UI in `TabsContent value="chat"` with the `<Chat />` component, passing the `slug`.

## Verification
- Verify that switching tabs updates the URL.
- Verify that refreshing the page with `?tab=context` opens the context tab.
- Verify that the chat sends messages to `/api/chat`.
- Verify that the response is streamed and rendered using `streamdown`.
- Verify code highlighting and math formulas work.
- Verify auto-scroll and "scroll to bottom" button behavior.
