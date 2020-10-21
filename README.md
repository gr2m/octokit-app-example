# octokit-app-example

An example GitHub app implemented using `@octokit/*` libraries.

The app does 3 common things.

1. Sends a request authenticated as the app itself (JWT). In this case, it retrieves information about itself
2. Iterates through all installations, authenticates as each installation, then iterates through all repositories. In this example, it creates a [`repository_dispatch` event](https://docs.github.com/en/free-pro-team@latest/rest/reference/repos#create-a-repository-dispatch-event).
3. It acts on webhook events. The example simulates the retrieval of an `issues.opened` event for [gr2m/sandbox#143](https://github.com/gr2m/sandbox/issues/143). It authenticates as the according installation and creates a comment on the issue.

I use this example as a base of discussion on how to simplify the existing APIs.

## Local setup

In order to test the code, you will have to [register a new GitHub app](https://github.com/organizations/octokit/settings/apps/new). The app requires read & write access for

1. content
2. issues

You can disable webhooks.

Then copy `.env.example` to `.env` and set the values to the credentials of your GitHub app registration.

Then install the app on a test repository. In that repository, create a new issue. Update the `webhooks.receive()` in the example with the repository owner, name and the issue number of your example issue.

## License

[MIT](LICENSE)
