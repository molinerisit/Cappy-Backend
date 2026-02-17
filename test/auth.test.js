const request = require('supertest');
const bcrypt = require('bcrypt');

jest.mock('../src/models/user.model', () => ({
  findOne: jest.fn(),
  create: jest.fn()
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
    User.create.mockResolvedValue({ _id: 'user-id', email: 'test@example.com' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'User created' });

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(User.create).toHaveBeenCalled();
  });

  test('logs in an existing user', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    User.findOne.mockResolvedValue({
      _id: 'user-id',
      email: 'login@example.com',
      password: hashedPassword
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
  });

  test('rejects registration with missing email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Email and password are required');
  });

  test('rejects registration with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid email format');
  });

  test('rejects registration with short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: '123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Password must be at least 6 characters');
  });
});
