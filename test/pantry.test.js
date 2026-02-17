const request = require('supertest');

jest.mock('../src/middleware/auth.middleware', () => (req, res, next) => {
  req.user = { _id: 'user-id' };
  next();
});

jest.mock('../src/models/ingredient.model', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOneAndDelete: jest.fn()
}));

const app = require('../src/app');
const Ingredient = require('../src/models/ingredient.model');

describe('Pantry routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds and lists pantry ingredients', async () => {
    Ingredient.create.mockResolvedValue({
      _id: 'ingredient-id',
      name: 'Tomato',
      user: 'user-id'
    });
    Ingredient.find.mockResolvedValue([
      { _id: 'ingredient-id', name: 'Tomato', user: 'user-id' }
    ]);

    const addResponse = await request(app)
      .post('/api/pantry')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Tomato' });

    expect(addResponse.status).toBe(201);
    expect(addResponse.body.name).toBe('Tomato');

    const listResponse = await request(app)
      .get('/api/pantry')
      .set('Authorization', 'Bearer test-token');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].name).toBe('Tomato');

    expect(Ingredient.create).toHaveBeenCalledWith({ name: 'Tomato', user: 'user-id' });
    expect(Ingredient.find).toHaveBeenCalledWith({ user: 'user-id' });
  });

  test('rejects adding ingredient without name', async () => {
    const response = await request(app)
      .post('/api/pantry')
      .set('Authorization', 'Bearer test-token')
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Ingredient name is required');
  });

  test('returns 404 when deleting non-existent ingredient', async () => {
    Ingredient.findOneAndDelete.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/pantry/fake-id')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Ingredient not found');
  });
});
