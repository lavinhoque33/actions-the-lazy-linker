const axios = require('axios');

const { getInputs } = require('./action-inputs');

class JiraConnector {
  constructor() {
    const { JIRA_TOKEN, ATLASSIAN_ORG_NAME, JIRA_USER_EMAIL } = getInputs(1);

    this.ATLASSIAN_ORG_NAME = ATLASSIAN_ORG_NAME;
    this.JIRA_TOKEN = JIRA_TOKEN;

    const credentials = Buffer.from(
      `${JIRA_USER_EMAIL}:${JIRA_TOKEN}`
    ).toString('base64');

    this.client = axios.create({
      baseURL: `https://${this.ATLASSIAN_ORG_NAME}.atlassian.net/rest/api/2`,
      timeout: 2000,
      headers: { Authorization: `Basic ${credentials}` }
    });
  }

  async ping() {
    try {
      const response = await this.client.get('/myself');

      if (!response?.data) {
        console.log(response);
        throw new Error('"response" is not defined.');
      }

      console.log('Jira user:', response.data.displayName);
      return Boolean(response.data.displayName);
    } catch (error) {
      if (error.response) {
        throw new Error(JSON.stringify(error.response.data, null, 4));
      }

      throw new Error(error.message);
    }
  }

  async getIssue(issueKey) {
    const { DESCRIPTION_CHARACTER_LIMIT } = getInputs(1);
    const fields = 'summary,description,issuetype';

    try {
      const response = await this.client.get(
        `/issue/${issueKey}?fields=${fields},expand=renderedFields`
      );

      if (!response?.data) {
        console.log(response);
        throw new Error('Jira issue "response" is not defined');
      }

      let description = await this.descriptionToMarkdown(
        response.data.fields.description
      );

      if (
        DESCRIPTION_CHARACTER_LIMIT &&
        description.length > DESCRIPTION_CHARACTER_LIMIT
      ) {
        description = `${description.substring(0, DESCRIPTION_CHARACTER_LIMIT)}...`;
      }

      return {
        key: response.data.key,
        summary: response.data.fields.summary,
        description,
        issuetype: response.data.fields.issuetype?.name,
        issuetypeicon: response.data.fields.issuetype?.iconUrl,
        url: `https://${this.ATLASSIAN_ORG_NAME}.atlassian.net/browse/${response.data.key}`
      };
    } catch (error) {
      if (error.response) {
        throw new Error(JSON.stringify(error.response.data, null, 4));
      }

      throw new Error(error.message);
    }
  }

  async descriptionToMarkdown(description) {
    if (!description) {
      return 'null';
    }

    let next = description;

    next = this.mdStatus(next);
    next = this.mdStripLinks(next);
    next = this.mdQuotes(next);
    next = this.mdPanel(next);
    next = this.mdCode(next);

    // order matters, there is cross over between numbered lists and headings
    next = this.mdNumberedLists(next);
    next = this.mdHeading(next);

    return next;
  }

  mdNumberedLists(text) {
    let next = text;

    // handles toplevel points only
    next = next.replace(/# /gm, '1. ');

    return next;
  }

  mdHeading(text) {
    const matches = text.match(/^(h1|h2|h3|h4|h5|h6)\./gm, '#');

    if (matches === null || !matches.length) {
      return text;
    }

    const next = matches.reduce((prev, match) => {
      const heading = match.match(/(\d)/g)[0];
      const number = Number(heading);

      const mdheading = new Array(number).fill('#').join('');

      return prev.replace(match, mdheading);
    }, text);

    return next;
  }

  mdQuotes(text) {
    let next = text;

    // replace first instance of {quote}, per line with >
    next = next.replace(/^{quote}/gm, '> ');
    // replace all other instances of {quote} with empty string
    next = next.replace(/{quote}$/gm, '');

    return next;
  }

  mdStripLinks(text) {
    const next = text.replace(/(\[.+\|.+\])|(\[~accountid.+\])/gm, '');

    return next;
  }

  mdStatus(text) {
    let next = text;

    next = text.replace(/\*?{color(:#[a-f0-9]{6}|[a-f0-9]{3})?}\*?/gim, '**');

    return next;
  }

  mdPanel(text) {
    let next = text;
    const startExp = new RegExp(/(?:{panel:bgColor=#[a-f0-9]{6}})/gim);
    const endExp = new RegExp(/(\w.+)\n(?:{panel})/gim);

    next = next.replace(endExp, '> [!NOTE]\n> $1');
    next = next.replace(startExp, '');

    return next;
  }

  mdCode(text) {
    let next = text;

    // single line
    next = next.replace(/{{(.+?)}}/gim, '`$1`');

    return next;
  }
}

module.exports = { JiraConnector };
