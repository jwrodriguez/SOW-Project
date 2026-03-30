// __mocks__/next-auth-react.js
// Mock implementation for next-auth/react

module.exports = {
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    data: {
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    },
    status: "authenticated",
  })),
};