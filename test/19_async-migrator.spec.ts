import { initSupertest } from './test-lib/supertest';
import * as _ from 'lodash';
import { sbvrUtils, dbModule } from '@balena/pinejs';
import { expect } from 'chai';
import * as fs from 'fs';

describe('Async Migrations', async function () {
	this.timeout(60000);

	describe('data catch up', function () {
		beforeEach(async function () {
			const testConfig = require('../config');

			testConfig.models[0].migrationsPath =
				__dirname + '/fixtures/19-async-migrator/01-migrations/';

			// delete cached migrations
			testConfig.models[0].migrations = {};
			await initSupertest({ initConfig: testConfig, deleteDatabase: true });
		});

		it('wait for first catch up', function (done) {
			const test = setInterval(async () => {
				let result;
				await sbvrUtils.db.transaction(async (tx) => {
					try {
						result = await tx.executeSql(
							`
						SELECT * FROM test;`,
						);
					} catch (err) {
						// just ignore it - case will fail after timeout
					}
				});
				const unequalRows = (result as unknown as dbModule.Result).rows.filter(
					(row) => {
						return row.columnA !== row.columnC;
					},
				);

				if (unequalRows.length === 0) {
					clearInterval(test);
					done();
				}
			}, 1000);
		});
	});

	describe.only('async migration skip', function () {
		beforeEach(async function () {
			const testConfig = require('../config');

			testConfig.models[0].migrationsPath =
				__dirname + '/fixtures/19-async-migrator/02-skip-async/';

			// delete cached migrations
			testConfig.models[0].migrations = {};
			await initSupertest({ initConfig: testConfig, deleteDatabase: true });

			// manually calling the init data creation sql query as the model gets
			// executed for the first time and sync migrations are skipped
			const initDataSql = await fs.promises.readFile(
				__dirname +
					'/fixtures/19-async-migrator/02-skip-async/0001-init-data.sync.sql',
				'utf8',
			);

			await sbvrUtils.db.transaction(async (tx) => {
				try {
					await tx.executeSql(initDataSql);
				} catch (err) {
					// just ignore it - case will fail after timeout
				}
			});
		});

		it.only('no async row migration should take place', function (done) {
			setTimeout(async () => {
				let result: dbModule.Result = {} as dbModule.Result;

				await sbvrUtils.db.transaction(async (tx) => {
					try {
						result = await tx.executeSql(
							`
						SELECT * FROM test
						WHERE  "columnA" = "columnC";`,
						);
					} catch (err) {
						// just ignore it - case will fail after timeout
					}
				});
				try {
					expect(result?.rows).to.be.empty;
					done();
				} catch (err) {
					done(err);
				}
			}, 2000);
		});
	});
});
