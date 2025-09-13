module.exports = {
	root: true,
	env: {
		browser: true,
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.json',
		sourceType: 'module',
		ecmaVersion: 2019,
	},
	plugins: [
		'@typescript-eslint',
	],
	extends: [
		'eslint:recommended',
		'@typescript-eslint/recommended',
	],
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/no-explicit-any': 'warn',
	},
	ignorePatterns: [
		'dist/',
		'node_modules/',
		'*.js'
	],
};