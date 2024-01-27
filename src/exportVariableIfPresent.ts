import * as core from '@actions/core'

export function exportVariableIfPresent(name: string, val?: string) {
	if (val) core.exportVariable(name, val)
}
