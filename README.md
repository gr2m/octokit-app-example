# octokit-app-example

An example GitHub app implemented using `@octokit/*` libraries.

The app does 3 common things.

1. Sends a request authenticated as the app itself (JWT). In this case, it retrieves information about itself
2. Iterates through all installations, authenticates as each installation, then iterates through all repositories. In this example, it creates a [`repository_dispatch` event](https://docs.github.com/en/free-pro-team@latest/rest/reference/repos#create-a-repository-dispatch-event).
3. It acts on webhook events. The example simulates the retrieval of an `issues.opened` event for [gr2m/sandbox#143](https://github.com/gr2m/sandbox/issues/143). It authenticates as the according installation and creates a comment on the issue.

I use this example as a base of discussion on how to simplify the existing APIs.

## Dreamcode

The currently working code exists in [index.js](/index.js). See [Changes](#changes) below for the original version and the iterations towards this dreamcode:

```js
const { App } = require("@octokit/app");

require("dotenv").config();

run();

async function run() {
  const app = new App({
    id: process.env.APP_ID,
    privateKey: process.env.APP_PRIVATE_KEY,
    webhookSecret: process.env.APP_WEBHOOK_SECRET,
  });

  // authenticate as app
  const { data } = await app.request("GET /app");
  console.log(
    `Authenticated as ${data.name}. Installations: ${data.installations_count}`
  );

  // iterate through all installations & repositories and create a dispatch event
  await app.eachRepository(async ({ octokit, repository }) => {
    // https://docs.github.com/rest/reference/repos#create-a-repository-dispatch-event
    await octokit.request("POST /repos/:owner/:repo/dispatches", {
      owner: repository.owner.login,
      repo: repository.name,
      event_type: "test",
      client_payload: {
        timestamp: new Date().toISOString(),
      },
    });
    console.log("Event dispatched for %s", repository.full_name);
  });

  // handle webhooks
  app.on("issues.opened", async ({ event, octokit }) => {
    const { data } = await octokit.request(
      "post /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: event.payload.repository.owner.login,
        repo: event.payload.repository.name,
        issue_number: event.payload.issue.number,
        body: `Welcome, @${event.payload.issue.user.login}`,
      }
    );

    console.log(`comment created: ${data.html_url}`);
  });

  // simulate receiving a webhook event
  await app.receive({
    /* ... */
  });

  console.log("done");
}
```

## Changes

1. [initial version of the code](https://github.com/gr2m/octokit-app-example/blob/19e35f944c058c88618fda0e53fbed41be115b32/index.js)
2. Derive installation octokit from app octokit: [changes](https://github.com/gr2m/octokit-app-example/pull/2/files) (-20 LOC)

## Local setup

In order to test the code, you will have to [register a new GitHub app](https://github.com/organizations/octokit/settings/apps/new). The app requires read & write access for

1. content
2. issues

You can disable webhooks.

Then copy `.env.example` to `.env` and set the values to the credentials of your GitHub app registration.

Then install the app on a test repository. In that repository, create a new issue. Update the `webhooks.receive()` in the example with the repository owner, name and the issue number of your example issue.

## License

[MIT](LICENSE)
