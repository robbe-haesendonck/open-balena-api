import { initSupertest } from './test-lib/supertest';
import * as _ from 'lodash';
import { sbvrUtils } from '@balena/pinejs';

describe('Async Migrations', async function () {
	this.timeout(60000);

	const testConfig = require('../config');

	testConfig.models[0].migrationsPath =
		__dirname + '/fixtures/19-async-migrator/01-migrations/';

	await initSupertest(testConfig);

	it('wait for migrations', function (done) {
		let count = 0;
		setInterval(async () => {
			const result = await sbvrUtils.db.transaction(async (tx) =>
				tx.executeSql(
					`
		SELECT * FROM test;`,
				),
			);
			console.log(result);

			if (count++ > 10) {
				done();
			}
		}, 1000);
	});
});
