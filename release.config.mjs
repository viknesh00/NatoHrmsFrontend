// Only Conventional Commits drive version tags. No date/build-number releases.
export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'angular' }],
    '@semantic-release/release-notes-generator',
    ['@semantic-release/github', { successComment: false, failComment: false, releasedLabels: false }],
  ],
};
