export const pmCommands = {
	npm: {
		install: 'npm install',
		build: (buildScriptName: string) =>
			`npm run ${buildScriptName} --if-present`,
		prefix: 'npx --no-install',
	},
	yarn: {
		install: 'yarn',
		build: (buildScriptName: string) => `yarn ${buildScriptName}`,
		prefix: 'yarn run',
	},
	pnpm: {
		install: 'pnpm install',
		build: (buildScriptName: string) =>
			`pnpm run ${buildScriptName} --if-present`,
		prefix: 'pnpm exec',
	},
}
