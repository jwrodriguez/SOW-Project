const { useSearchParams } = require("next/navigation");

module.exports = {
    useSearchParams: jest.fn(() => ({
        get: jest.fn((param) => {
            if (param === "id") {
                return "test-id";
            }
            return null;
        }),
    })),
}