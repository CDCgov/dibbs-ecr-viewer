import path from "node:path";
import { fileURLToPath } from "node:url";

import importAlias from "@dword-design/eslint-plugin-import-alias";
import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import _import from "eslint-plugin-import";
import react from "eslint-plugin-react";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    { ignores: ["**/playwright-report*/**", ".next"] },
    importAlias.configs.recommended,
    {
    plugins: { "@next/next": nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules },
    },
    ...compat.extends(
        "plugin:jsdoc/recommended-typescript-error",
        "prettier",
    ),
    {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        import: fixupPluginRules(_import),
        react,
        "unused-imports": unusedImports,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            allowImportExportEverywhere: true,
        },
    },

    rules: {
        "@dword-design/import-alias/prefer-alias": ["error", {
            alias: {
                "@": "./src",
            },
        }],

        "@typescript-eslint/no-explicit-any": "error",
        "dot-notation": "error",
        eqeqeq: "error",
        "import/no-duplicates": "error",

        "import/order": ["error", {
            groups: ["builtin", "external", "parent", "sibling"],

            pathGroups: [{
                pattern: "react",
                group: "builtin",
                position: "before",
            }, {
                pattern: "@/**",
                group: "parent",
            }, {
                pattern: "@/../../../**",
                group: "parent",
                position: "before",
            }],

            pathGroupsExcludedImportTypes: [],
            "newlines-between": "always",

            alphabetize: {
                order: "asc",
                caseInsensitive: false,
            },

            distinctGroup: false,
        }],

        "no-unused-vars": "off",
        "no-var": "error",
        "object-shorthand": "error",
        "prefer-const": "error",
        "unused-imports/no-unused-imports": "error",

        "unused-imports/no-unused-vars": ["warn", {
            vars: "all",
            varsIgnorePattern: "^_",
            args: "after-used",
            argsIgnorePattern: "^_",
        }],

        "jsdoc/check-tag-names": "off",

        "jsdoc/require-jsdoc": ["warn", {
            require: {
                ArrowFunctionExpression: true,
            },

            publicOnly: true,
        }],

        "react/jsx-curly-brace-presence": [2, "never"],
        "react/jsx-boolean-value": [2, "always"],
    },
}, {
    files: ["./tests/**/*"],

    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "jsdoc/require-jsdoc": "off",
    },
}]);