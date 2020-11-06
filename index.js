const { App } = require("@octokit/app");

require("dotenv").config();

run();

async function run() {
  const app = new App({
    appId: process.env.APP_ID,
    privateKey: process.env.APP_PRIVATE_KEY,
    webhooks: {
      secret: process.env.APP_WEBHOOK_SECRET,
    },
  });

  // authenticate as app
  const { data } = await app.octokit.request("GET /app");
  console.log(
    `Authenticated as ${data.name}. Installations: ${data.installations_count}`
  );

  // iterate through all installations & repositories and create a dispatch event
  await app.eachRepository(async ({ octokit, repository }) => {
    // https://docs.github.com/en/free-pro-team@latest/rest/reference/repos#create-a-repository-dispatch-event
    await octokit.request("POST /repos/:owner/:repo/dispatches", {
      owner: repository.owner.login,
      repo: repository.name,
      event_type: "test",
      client_payload: {
        timestamp: new Date().toISOString(),
      },
    });
    console.log("Event dispatched for %s", repository.html_url);
  });

  app.webhooks.on("issues.opened", async ({ payload, octokit }) => {
    const { data } = await octokit.request(
      "post /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.issue.number,
        body: `Welcome, @${payload.issue.user.login}`,
      }
    );

    console.log(`comment created: ${data.html_url}`);
  });

  // simulate receiving a webhook event
  await app.webhooks.receive({
    id: "123",
    name: "issues",
    payload: {
      action: "opened",
      issue: {
        number: 143,
        user: {
          login: "gr2m",
        },
      },
      repository: {
        name: "sandbox",
        owner: {
          login: "gr2m",
        },
      },
      sender: {
        login: "gr2m",
      },
      installation: {
        id: 9996154,
      },
    },
  });

  console.log("done");
}
