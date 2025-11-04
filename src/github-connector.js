const github = require('@actions/github');

const { HIDDEN_GENERATIVE_TAG } = require('./consts');
const { getInputs } = require('./action-inputs');

class GithubConnector {
  constructor() {
    const { GITHUB_TOKEN } = getInputs(1);

    this.octokit = github.getOctokit(GITHUB_TOKEN);
    this.ghdata = this._getGithubData();
  }

  get isPullRequest() {
    return (
      this.ghdata.eventName === 'pull_request' ||
      this.ghdata.eventName === 'pull_request_target'
    );
  }

  get headBranch() {
    return this.ghdata.pull_request.head.ref;
  }

  async updatePrDetails(issue) {
    const owner = this.ghdata.owner;
    const repo = this.ghdata.repository.name;
    const pull_number = this.ghdata.pull_request.number;

    const commits = await this.getPullRequestCommits(owner, repo, pull_number);

    const updateData = {
      owner,
      repo,
      pull_number,
      body: this._createJiraDescription(commits, issue)
    };

    if (issue) {
      updateData.title = this._createTitle(issue);
    }

    return await this.octokit.rest.pulls.update(updateData);
  }

  async getPullRequestDescription(owner, repository, pull_number) {
    try {
      const response = await this.octokit.rest.pulls.get({
        owner,
        repo: repository,
        pull_number
      });

      return response?.data?.body || '';
    } catch (error) {
      throw new Error(JSON.stringify(error, null, 4));
    }
  }

  async getPullRequestCommits(owner, repository, pull_number) {
    try {
      const response = await this.octokit.rest.pulls.listCommits({
        owner,
        repo: repository,
        pull_number
      });

      return response?.data || [];
    } catch (error) {
      throw new Error(JSON.stringify(error, null, 4));
    }
  }

  _getGithubData() {
    const {
      eventName,
      payload: { repository, pull_request }
    } = github.context;

    let owner = null;

    if (github.context.payload?.organization) {
      owner = github.context.payload.organization.login;
    } else {
      console.log(
        'Could not find organization, using repository owner instead.'
      );
      owner = github.context.payload.repository.owner.login;
    }

    if (!owner) {
      throw new Error('Could not find owner.');
    }

    return {
      eventName,
      repository,
      owner,
      pull_request
    };
  }

  _createTitle(issue) {
    return `${issue.key}: ${issue.summary}`;
  }

  _createJiraDescription(commits, issue) {
    const spacesAndImages = /(?:\n)( |\t|\r)+|(!.+!)/gm;

    // Extract commit messages
    const commitMessages = commits
      .map(commit => commit.commit?.message || '')
      .filter(message => message.trim().length > 0)
      .map(message => `- ${message.trim()}`)
      .join('\n');

    if (!issue) {
      return `
        ${HIDDEN_GENERATIVE_TAG}
        \n**FIXES:**
        \n${commitMessages}
        \n${HIDDEN_GENERATIVE_TAG}
      `.replace(spacesAndImages, '');
    }

    const { description, issuetype, issuetypeicon, key, summary, url } = issue;

    return `
      ${HIDDEN_GENERATIVE_TAG}
      \n<a href="${url}">${key}: ${summary}</a>
      \n\n<img width="12" height="12" src="${issuetypeicon}"/> ${issuetype}
      \n**Description:**
      \n${description}
      \n**FIXES:**
      \n${commitMessages}
      \n${HIDDEN_GENERATIVE_TAG}
    `.replace(spacesAndImages, '');
  }
}

module.exports = { GithubConnector };
