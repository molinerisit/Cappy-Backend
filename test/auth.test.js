const request = require('supertest');
const bcrypt = require('bcrypt');

jest.mock('../src/models/user.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const app = require('../src/app');
const User = require('../src/models/user.model');

describe('Auth routes', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers a new user', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: 'user-id',
      email: 'test@example.com',
      role: 'user',
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'AComplexPass123!',
        confirmPassword: 'AComplexPass123!',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe('test@example.com');

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(User.create).toHaveBeenCalled();
  });

  test('logs in an existing user', async () => {
    const hashedPassword = await bcrypt.hash('Tr0pic@lFru1t92!', 12);
    User.findOne.mockResolvedValue({
      _id: 'user-id',
      email: 'login@example.com',
      role: 'user',
      password: hashedPassword,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'Tr0pic@lFru1t92!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe('login@example.com');
  });

  test('rejects registration with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'AComplexPass123!',
        confirmPassword: 'AComplexPass123!',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects registration with weak password format', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects registration when zxcvbn classifies password as weak', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!@#',
        confirmPassword: 'Password123!@#',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('WEAK_PASSWORD');
  });

  test('rejects login when zxcvbn classifies password as weak', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nouser@example.com', password: 'Password123!@#' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('WEAK_PASSWORD');
  });

  test('rejects login with invalid credentials', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nouser@example.com', password: 'C0smic!River$92' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
