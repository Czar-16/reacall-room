# Content review — 2026-10-29

The 41 skills follow the requested seven resume categories. Zod is under Backend and Vercel Analytics under DevOps & Tools. AWS covers both EC2 and S3. Five questions per entry progress from fundamentals through mechanism, application, tradeoffs and troubleshooting. Soft-skill questions are situational and every answer is labeled as hypothetical.

## Project evidence

Only read operations were performed against the three project directories. No application deployment, resume edits or project source edits were performed.

- The three `package.json` files establish React, Next.js, TypeScript, Tailwind v4 and Zod dependencies. `src/app` and `src/components` demonstrate their use. PurePin and BuzzLine also have shadcn configuration and local UI components.
- MailLoop: `src/auth.ts` uses the v5 beta NextAuth exports, Google OAuth and Gmail sending scope; `src/lib/gmail.ts` implements the provider boundary. `src/lib/inngest.ts` and `src/lib/inngest-client.ts` implement event work. `prisma/schema.prisma`, `src/lib/db.ts`, `docker-compose.yml` and the README establish PostgreSQL, Prisma and a local database container. This is not evidence of a containerized production app.
- MailLoop: `src/lib/billing/config.ts` accepts only `test_mode`; `dodo.ts`, `checkout.ts`, `webhooks.ts` and `docs/dodo-test-billing.md` demonstrate test billing. No live processing or revenue is asserted.
- BuzzLine: `src/lib/auth.ts` and the manifest use NextAuth v4 with JWT sessions. `src/lib/db.ts`, `src/models` and `socket-server/server.js` demonstrate MongoDB. The socket server imports Express, creates Socket.IO v4 rooms and relays messages. It accepts client identifiers; proposed authentication and membership checks in the skills guide are design advice, not descriptions of existing safeguards.
- PurePin: `src/lib/validation.ts` demonstrates boundary validation. `src/app/layout.tsx` mounts Vercel Analytics only when `VERCEL === "1"`; BuzzLine also mounts Analytics in its layout. Instrumentation is not evidence of a traffic result.
- HTTP JSON routes in the projects do not prove every REST constraint. Socket.IO usage does not prove an independent raw WebSocket implementation. General DSA and OOP examples do not establish formal implementations or personal expertise.
- Entries without verified usage carry “Resume-listed; not verified in these three projects.” Tool listings do not establish personal workflow, collaboration history or measured outcomes.

## Documentation review

Each entry stores an official technology or institutional reference link, bundled into the website and Markdown. References were checked against public documentation during implementation; links are optional reading and the site makes no requests to them. Particularly important cross-checks:

- [Prism](https://prismjs.com/) and [grammar dependencies](https://prismjs.com/extending.html): manual local highlighting with markup, C-like, JavaScript, TypeScript, JSX and TSX. Prism 1.30.0 is bundled with its MIT license.
- [Auth.js v5 migration](https://authjs.dev/getting-started/migrating-to-v5): do not mix v4 and v5 initialization/session examples.
- [Socket.IO v4](https://socket.io/docs/v4/) and [WebSocket RFC](https://www.rfc-editor.org/rfc/rfc6455): protocol layering, transport choices and application-level recovery.
- [Dodo integration](https://docs.dodopayments.com/developer-resources/integration-guide): hosted checkout and webhook fulfillment. The test-only restriction comes from MailLoop's actual configuration, not an assumption about Dodo's platform.
- [Gmail sending](https://developers.google.com/workspace/gmail/api/guides/sending), [Inngest durable primitives](https://www.inngest.com/docs/durable-execution/primitives), [Zod](https://zod.dev/basics) and [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110): encoding, durable steps, runtime validation and idempotent methods.
- [Tailwind class detection](https://tailwindcss.com/docs/detecting-classes-in-source-files), [Express middleware](https://expressjs.com/en/guide/using-middleware/), [Hono](https://hono.dev/docs), [Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/), [Git revert](https://git-scm.com/docs/git-revert), [Postman variables](https://learning.postman.com/docs/use/send-requests/variables/variables/), [Claude Code](https://code.claude.com/docs/en/overview) and [Cursor](https://cursor.com/docs): current API boundaries and tooling concepts.
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii) and [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html): resource lifetime and scoped temporary object access.
- Soft-skill entries use institutional references and labeled illustrative responses, rather than attributing invented experience to the resume owner.

Some sites rejected direct script fetches; readable official pages were checked through the web reader instead. The unavailable initial learning-research URL was replaced with Cornell's Learning Strategies Center. No reference page is a runtime dependency.
