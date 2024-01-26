export function getPlatform() {
	switch (process.platform) {
		case 'darwin':
			return 'mac'
		case 'win32':
			return 'windows'
		default:
			return 'linux'
	}
}
