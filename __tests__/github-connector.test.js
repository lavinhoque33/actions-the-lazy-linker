/**
 * Unit tests for the GitHub connector functionality
 */
const { GithubConnector } = require('../src/github-connector');

// Mock the action-inputs module
jest.mock('../src/action-inputs', () => ({
  getInputs: jest.fn(() => ({
    GITHUB_TOKEN: 'mock-token'
  }))
}));

// Mock @actions/github
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(() => ({
    rest: {
      pulls: {
        get: jest.fn(),
        update: jest.fn(),
        listCommits: jest.fn()
      }
    }
  })),
  context: {
    eventName: 'pull_request',
    payload: {
      repository: { name: 'test-repo' },
      pull_request: { number: 123, head: { ref: 'feature-branch' } },
      organization: { login: 'test-org' }
    }
  }
}));

describe('GithubConnector', () => {
  let githubConnector;

  beforeEach(() => {
    // Create a fresh instance for each test
    githubConnector = new GithubConnector();
  });

  describe('_createJiraDescription', () => {
    it('should format commit messages under FIXES title', () => {
      const mockIssue = {
        key: 'PROJ-123',
        summary: 'Test Issue',
        description: 'Issue description',
        issuetype: 'Bug',
        issuetypeicon: 'https://example.com/icon.png',
        url: 'https://example.com/browse/PROJ-123'
      };

      const mockCommits = [
        {
          commit: {
            message: 'Fix bug in authentication\n\nThis fixes the login issue'
          }
        },
        {
          commit: {
            message: 'Add unit tests'
          }
        }
      ];

      const result = githubConnector._createJiraDescription(
        mockCommits,
        mockIssue
      );

      expect(result).toContain('**FIXES:**');
      expect(result).toContain('- Fix bug in authentication');
      expect(result).toContain('- Add unit tests');
      expect(result).toContain('PROJ-123: Test Issue');
      expect(result).toContain('Issue description');
    });

    it('should handle empty commit messages', () => {
      const mockIssue = {
        key: 'PROJ-123',
        summary: 'Test Issue',
        description: 'Issue description',
        issuetype: 'Bug',
        issuetypeicon: 'https://example.com/icon.png',
        url: 'https://example.com/browse/PROJ-123'
      };

      const mockCommits = [
        { commit: { message: '' } },
        { commit: { message: 'Valid commit' } },
        { commit: { message: null } }
      ];

      const result = githubConnector._createJiraDescription(
        mockCommits,
        mockIssue
      );

      expect(result).toContain('**FIXES:**');
      expect(result).toContain('- Valid commit');
      expect(result).not.toContain('- \n'); // Should not have empty bullet points
    });

    it('should handle multi-line commit messages by including full content', () => {
      const mockIssue = {
        key: 'PROJ-456',
        summary: 'Multi-line Test',
        description: 'Testing multi-line commits',
        issuetype: 'Task',
        issuetypeicon: 'https://example.com/task-icon.png',
        url: 'https://example.com/browse/PROJ-456'
      };

      const mockCommits = [
        {
          commit: {
            message:
              'Fix critical bug\n\nThis commit fixes a critical bug that was causing\nmemory leaks in production.\n\n- Fixed memory allocation\n- Added proper cleanup\n- Updated tests'
          }
        },
        {
          commit: {
            message: 'Update documentation\n\nMinor documentation update'
          }
        }
      ];

      const result = githubConnector._createJiraDescription(
        mockCommits,
        mockIssue
      );

      expect(result).toContain('**FIXES:**');
      expect(result).toContain('- Fix critical bug');
      expect(result).toContain(
        'This commit fixes a critical bug that was causing'
      );
      expect(result).toContain('memory leaks in production');
      expect(result).toContain('- Fixed memory allocation');
      expect(result).toContain('- Update documentation');
      expect(result).toContain('Minor documentation update');
    });

    it('should handle empty commits array', () => {
      const mockIssue = {
        key: 'PROJ-789',
        summary: 'Empty Commits Test',
        description: 'Testing with no commits',
        issuetype: 'Story',
        issuetypeicon: 'https://example.com/story-icon.png',
        url: 'https://example.com/browse/PROJ-789'
      };

      const mockCommits = [];

      const result = githubConnector._createJiraDescription(
        mockCommits,
        mockIssue
      );

      expect(result).toContain('**FIXES:**');
      expect(result).toContain('PROJ-789: Empty Commits Test');
      expect(result).toContain('Testing with no commits');
      // Should still have FIXES section even with no commits
      expect(result).not.toContain('- '); // No bullet points when no commits
    });

    it('should handle commits with special characters and markdown', () => {
      const mockIssue = {
        key: 'PROJ-999',
        summary: 'Special Characters Test',
        description: 'Testing special chars in commits',
        issuetype: 'Bug',
        issuetypeicon: 'https://example.com/bug-icon.png',
        url: 'https://example.com/browse/PROJ-999'
      };

      const mockCommits = [
        {
          commit: {
            message:
              'Fix: Handle **bold** and *italic* text in [links](https://example.com)'
          }
        },
        {
          commit: {
            message: 'Add support for <script> tags and & special chars'
          }
        },
        {
          commit: {
            message: 'Update: Use emojis 🚀 and symbols ±×÷'
          }
        }
      ];

      const result = githubConnector._createJiraDescription(
        mockCommits,
        mockIssue
      );

      expect(result).toContain('**FIXES:**');
      expect(result).toContain(
        '- Fix: Handle **bold** and *italic* text in [links](https://example.com)'
      );
      expect(result).toContain(
        '- Add support for <script> tags and & special chars'
      );
      expect(result).toContain('- Update: Use emojis 🚀 and symbols ±×÷');
      expect(result).toContain('PROJ-999: Special Characters Test');
    });
  });
});
