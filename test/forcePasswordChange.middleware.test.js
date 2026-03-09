const forcePasswordChangeMiddleware = require('../src/middleware/forcePasswordChange.middleware');

jest.mock('../src/models/user.model', () => ({
  findById: jest.fn(),
}));

const User = require('../src/models/user.model');

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('forcePasswordChange.middleware', () => {
  function mockFindByIdSelectResult(user) {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows requests when user does not require password change', async () => {
    mockFindByIdSelectResult({
      forcePasswordChange: false,
      isTempPassword: false,
    });

    const req = {
      user: { _id: 'user-1' },
      method: 'GET',
      path: '/profile/analytics',
    };
    const res = mockResponse();
    const next = jest.fn();

    await forcePasswordChangeMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('blocks non-whitelisted routes when password change is required', async () => {
    mockFindByIdSelectResult({
      forcePasswordChange: true,
      isTempPassword: true,
    });

    const req = {
      user: { _id: 'user-2' },
      method: 'POST',
      path: '/change-path',
    };
    const res = mockResponse();
    const next = jest.fn();

    await forcePasswordChangeMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'CHANGE_PASSWORD_REQUIRED',
        }),
      })
    );
  });

  test('allows whitelist route GET /profile when password change is required', async () => {
    mockFindByIdSelectResult({
      forcePasswordChange: true,
      isTempPassword: true,
    });

    const req = {
      user: { _id: 'user-3' },
      method: 'GET',
      path: '/profile',
    };
    const res = mockResponse();
    const next = jest.fn();

    await forcePasswordChangeMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
