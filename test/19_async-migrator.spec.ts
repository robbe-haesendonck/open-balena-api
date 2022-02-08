import { initSupertest } from './test-lib/supertest';
import * as _ from 'lodash';

describe('Resource Filtering', () => {
	describe('Basic Async Migrations', async function () {
		const testConfig = require('../config');
		const balenaModel = testConfig.models.find(
			(model: any) => model.modelName === ' balena',
		);
		balenaModel.migrationsPath =
			__dirname + '/fixtures/19-async-migrator/01-migrations/';

		await initSupertest(testConfig);
	});
});
