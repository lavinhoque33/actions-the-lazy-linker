# The Lazy Linker

[![GitHub Super-Linter](https://github.com/actions/hello-world-javascript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/hello-world-javascript-action/actions/workflows/ci.yml/badge.svg)

This action searches for a Jira issue key in the branch name, fetches
information about issue. The action will update the title of your Pull Request
and the description of the Pull Request with Jira information and all commit
messages from the PR under a "FIXES" section.

E.g. `feature/PRO-123` or `LLM-1874`

![image](https://github.com/user-attachments/assets/38493ab3-1afb-4c9f-85cb-9b116e13f9cb)

### What it does

The action will:

1. Extract the Jira issue key from the branch name (e.g., `PRO-123` from
   `feature/PRO-123`)
2. Fetch the issue details from Jira
3. Update the PR title to include the Jira issue key and summary
4. Update the PR description with:
   - Jira issue link and details
   - Issue type and description
   - **FIXES section** containing all commit messages from the PR

The FIXES section automatically lists all commit messages from every commit in
the pull request, providing reviewers with a complete overview of what changes
were made.

## Usage

Here's an example of how to use this action in a workflow file:

```yaml
name: Example PR Workflow

on:
  pull_request:
    types:
      - opened

permissions:
  actions: read
  contents: read
  pull-requests: write

jobs:
  jira-lazy-link:
    name: Jira Lazy Linker
    runs-on: ubuntu-latest

    steps:
      - name: Print to Log
        id: print-to-log
        uses: reachtrevor/actions-the-lazy-linker@v1.3.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          atlassian-org-name: ${{ secrets.ATLASSIAN_ORG_NAME }}
          jira-api-key: ${{ secrets.JIRA_API_KEY }}
          jira-user-email: ${{ secrets.JIRA_USER_EMAIL }}
```

## Inputs

| Input                            | Default | Description                                                   |
| -------------------------------- | ------- | ------------------------------------------------------------- |
| `github-token`                   | -       | Github token provided by Github Actions                       |
| `jira-api-key`                   | -       | User API key from Jira Cloud                                  |
| `atlassian-org-name`             | -       | Organization name url for Atlassian (Jira) Cloud              |
| `jira-user-email`                | -       | User email tied to API key from Jira Cloud                    |
| `fail-when-jira-issue-not-found` | false   | Enabled to enforce a Jira key in the branch name              |
| `description-character-limit`    | -       | Limit the description from Jira to a specific character count |

## FAQ

#### What happens to existing PR descriptions?

The action replaces the PR description with Jira information and commit
messages. If you have important information in the existing description, you
should preserve it manually before the action runs.

#### Do images get copied over?

No, there is code to strip images from Jira, images require authentication to
view and thus cannot be shown in the Pull Request description.

#### Will sensitive data be copied over?

Everything in the Jira description will be copied over with the exception of
images. Just edit your description once it gets populated and remove the
sensitive bits.

Some may be concerned about sensitive data making to Github in the first place,
my response is twofold.

1. It doesn't go into the git history of your repository
2. If a bad actor can get into your organization's private repository you've got
   bigger problems.

#### Can I modify how the title or description is formatted?

Not right now, I've put in what I believe are smart defaults. If I get enough
issues raised about it or someone wants to donate $$ to make it happen then I'll
do a simple version of title formatting.
