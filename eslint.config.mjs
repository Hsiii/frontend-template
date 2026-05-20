import { completeConfigBase } from 'eslint-config-complete';

export default [
    ...completeConfigBase,

    {
        ignores: ['dist/**', 'node_modules/**', 'vite.config.ts'],
    },

    {
        rules: {
            '@stylistic/quotes': [
                'error',
                'single',
                {
                    avoidEscape: true,
                },
            ],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            'import-x/no-unassigned-import': [
                'error',
                {
                    allow: ['**/*.css'],
                },
            ],
            'import-x/no-default-export': 'off',
            'n/file-extension-in-import': 'off',
            'perfectionist/sort-jsx-props': 'off',
            'unicorn/prefer-query-selector': 'off',
        },
    },
];
