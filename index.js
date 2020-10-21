const { Octokit } = require("@octokit/core");
const { createAppAuth } = require("@octokit/auth-app");
const { paginateRest } = require("@octokit/plugin-paginate-rest");
const { Webhooks } = require("@octokit/webhooks");

require("dotenv").config();

const CACHE = {};
const globalTokenCache = {
  async get(key) {
    return CACHE[key];
  },
  async set(key, value) {
    CACHE[key] = value;
  },
};

const MyAppOctokit = Octokit.plugin(paginateRest).defaults((options = {}) => {
  const defaults = {
    authStrategy: createAppAuth,
    auth: {
      id: process.env.APP_ID,
      privateKey: process.env.APP_PRIVATE_KEY,
      cache: globalTokenCache,
    },
    userAgent: "my-app/1.2.3",
  };

  if (options.auth) {
    defaults.auth.installationId = options.auth.installationId;
  }

  return defaults;
});

run();

async function run() {
  const appOctokit = new MyAppOctokit();

  // authenticate as app
  const { data } = await appOctokit.request("GET /app");
  console.log(
    `Authenticated as ${data.name}. Installations: ${data.installations_count}`
  );

  // iterate through all installations & repositories and create a dispatch event
  const installations = await appOctokit.paginate("GET /app/installations", {
    mediaType: { previews: ["machine-man"] },
    per_page: 100,
  });

  for (const {
    id,
    account: { login },
  } of installations) {
    console.log("Installation found: %s (%d)", login, id);
    const installationOctokit = new MyAppOctokit({
      auth: {
        installationId: id,
      },
    });

    const repositories = await installationOctokit.paginate(
      "GET /installation/repositories",
      {
        mediaType: { previews: ["machine-man"] },
        per_page: 100,
      }
    );

    for (const { name } of repositories) {
      // https://docs.github.com/en/free-pro-team@latest/rest/reference/repos#create-a-repository-dispatch-event
      await installationOctokit.request("POST /repos/:owner/:repo/dispatches", {
        owner: login,
        repo: name,
        event_type: "test",
        client_payload: {
          timestamp: new Date().toISOString(),
        },
      });
      console.log("Event distpatched for %s/%s", login, name);
    }
  }

  // handle webhooks
  const webhooks = new Webhooks({
    secret: process.env.APP_WEBHOOK_SECRET,
    // pass authenticated octokit instance to event handlers
    transform: (event) => {
      return {
        event,
        octokit: new MyAppOctokit({
          auth: {
            installationId: event.payload.installation.id,
          },
        }),
      };
    },
  });

  webhooks.on("issues.opened", async ({ event, octokit }) => {
    const owner = event.payload.repository.owner.login;
    const repo = event.payload.repository.name;
    const issue_number = event.payload.issue.number;
    const userLogin = event.payload.issue.user.login;

    const { data } = await octokit.request(
      "post /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo,
        issue_number,
        body: `Welcome, @${userLogin}`,
      }
    );

    console.log(`comment created: ${data.html_url}`);
  });

  // simulate receiving a webhook event
  await webhooks.receive({
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
