import vue from 'eslint-plugin-vue'
import tsParser from '@typescript-eslint/parser'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.histoire/**',
      '**/.histoire-dist/**',
      '.features-gen/**',
      '.test-builds/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tsParser } },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-indent': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/max-template-depth': ['error', { maxDepth: 8 }],
      'vue/no-unused-properties': [
        'error',
        { groups: ['props', 'data', 'computed', 'methods', 'setup'] },
      ],
      'vue/no-unused-refs': 'error',
      'vue/no-unused-emit-declarations': 'error',
      'vue/prefer-use-template-ref': 'error',
      'vue/require-default-prop': 'off',
      'vue/no-undef-components': [
        'error',
        {
          ignorePatterns: [
            '^Story$',
            '^Variant$',
            '^Hst',
            '^Router(View|Link)$',
          ],
        },
      ],
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        { registeredComponentsOnly: false },
      ],
      'vue/match-component-file-name': [
        'error',
        { extensions: ['vue'], shouldMatchCase: true },
      ],
      'vue/custom-event-name-casing': [
        'error',
        'kebab-case',
        { ignores: ['/^update:/'] },
      ],
      'vue/require-explicit-slots': 'error',
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'],
        },
      ],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/no-useless-v-bind': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
    },
  },
]
