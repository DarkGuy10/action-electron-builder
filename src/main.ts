import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { getPlatform } from './getPlatform'
import { join } from 'path'
import { existsSync } from 'fs'
import { exportVariableIfPresent } from './exportVariableIfPresent'
import { pmCommands } from './pmCommands'

/**
 * The main function for this action
 */
export async function run() {
	try {
		const platform = getPlatform()
		const release = core.getBooleanInput('release', { required: true })
		const pkgRoot = core.getInput('package_root', { required: true })
		const buildScriptName = core.getInput('build_script_name', {
			required: true,
		})
		const skipBuild = core.getBooleanInput('skip_build')
		const useVueCli = core.getBooleanInput('use_vue_cli')
		const args = core.getInput('args') || ''
		const maxAttempts = parseInt(core.getInput('max_attempts') || '1', 10)
		const githubToken = core.getInput('github_token', { required: true })
		const _pm = core.getInput('package_manager')
		const pkgJsonPath = join(pkgRoot, 'package.json')

		// Make sure the package manager is supported
		if (!['npm', 'yarn', 'pnpm'].includes(_pm))
			throw new Error(
				`Unsupported \`package_manager\` provided: ${_pm}. Allowed values: npm, yarn, pnpm`
			)
		const pm = _pm as 'npm' | 'yarn' | 'pnpm'

		if (!existsSync(pkgJsonPath))
			// Make sure `package.json` file exists
			throw new Error(
				`\`package.json\` file not found at path "${pkgJsonPath}"`
			)

		// Copy "github_token" input variable to "GH_TOKEN" env variable (required by `electron-builder`)
		core.exportVariable('GH_TOKEN', githubToken)

		// Require code signing certificate and password if building for macOS. Export them to environment
		// variables (required by `electron-builder`)
		if (platform === 'mac') {
			exportVariableIfPresent('CSC_LINK', core.getInput('mac_certs'))
			exportVariableIfPresent(
				'CSC_KEY_PASSWORD',
				core.getInput('mac_certs_password')
			)
		} else if (platform === 'windows') {
			exportVariableIfPresent('CSC_LINK', core.getInput('windows_certs'))
			exportVariableIfPresent(
				'CSC_KEY_PASSWORD',
				core.getInput('windows_certs_password')
			)
		}

		// Disable console advertisements during install phase
		core.exportVariable('ADBLOCK', true)

		console.log(`Installing dependencies using ${pm}`)
		await exec(pmCommands[pm].install, [], { cwd: pkgRoot })

		// Run NPM build script if it exists
		if (skipBuild)
			console.log('Skipping build script because `skip_build` option is set')
		else {
			console.log('Running the build script')
			await exec(pmCommands[pm].build(buildScriptName), [], { cwd: pkgRoot })
		}

		console.log(`Building${release ? ' and releasing' : ''} the Electron app`)
		const cmd = useVueCli
			? 'vue-cli-service electron:build'
			: 'electron-builder'
		for (let i = 1; i < maxAttempts; i++) {
			try {
				await exec(
					`${pmCommands[pm].prefix} ${cmd} --${platform} ${
						release ? '--publish always' : ''
					} ${args}`,
					[],
					{ cwd: pkgRoot }
				)
				break
			} catch (err) {
				if (i < maxAttempts - 1) {
					console.log(`Attempt ${i + 1} failed:`)
					console.log(err)
				} else throw err
			}
		}
	} catch (error) {
		core.setFailed(`Action failed with error ${error}`)
	}
}
