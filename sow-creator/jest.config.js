const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");

/** @type {import("jest").Config} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",

  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/",
  }),
  transform: {
  "^.+\\.(ts|tsx)$": [
    "ts-jest",
    {
      tsconfig: {
        ...compilerOptions,
        jsx: "react-jsx",
      },
    },
  ],
},
moduleNameMapper: {
  "^@/(.*)$": "<rootDir>/$1",
  "next-auth/react": "<rootDir>/__mocks__/next-auth-react.js",
  "next/navigation": "<rootDir>/__mocks__/next-navigation.js"
},
transformIgnorePatterns: [
  "node_modules/(?!(next-auth|next)/)"
],
};