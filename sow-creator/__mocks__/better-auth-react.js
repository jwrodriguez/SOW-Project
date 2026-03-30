module.exports = {
  createAuthClient: () => ({
    session: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
};

