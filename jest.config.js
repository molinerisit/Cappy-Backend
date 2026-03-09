module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/', '/test/', '/coverage/'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/scripts/**',
    '!src/swagger.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  testTimeout: 10000,
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js']
};
