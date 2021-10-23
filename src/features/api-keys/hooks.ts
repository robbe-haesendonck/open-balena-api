import { hooks } from '@balena/pinejs';

hooks.addPureHook('POST', 'resin', 'api_keys', {
	PRERUN: async ({ request }) => {
		if (!request.values.provisioningKeyExpiry) {
			// should we set a default expiry date here
		}
	},
});
