import { initSupertest } from './test-lib/supertest';
import * as _ from 'lodash';
import { sbvrUtils, dbModule } from '@balena/pinejs';

describe('Async Migrations', async function () {
	this.timeout(60000);

	before(async function () {
		const testConfig = require('../config');

		testConfig.models[0].migrationsPath =
			__dirname + '/fixtures/19-async-migrator/01-migrations/';

		// delete cached migrations
		testConfig.models[0].migrations = {};
		await initSupertest({ initConfig: testConfig, deleteDatabase: true });
	});

	it('wait for first catchup', function (done) {
		setInterval(async () => {
			try {
				let result;
				await sbvrUtils.db.transaction(async (tx) => {
					result = await tx.executeSql(
						`
SELECT * FROM test;`,
					);
				});
				const unequalRows = (result as unknown as dbModule.Result).rows.filter(
					(row) => {
						return row.columnA !== row.columnC;
					},
				);

				if (unequalRows.length === 0) {
					done();
				}
			} catch (err) {
				// just ignore it - case will fail after timeout
			}
		}, 1000);
	});
});
