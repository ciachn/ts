
import { db, Element } from 'riza';
import fs from 'fs';
import workflow from '../workflow';
import utils from '../utils';

Element.register('r-splash',
{
	contents: fs.readFileSync(__dirname + '/splash.html'),

	init: async function()
	{
		this.addClass('text-center vertical-center');

		db.init('ts', 1, (db, txn, version) =>
		{
			let store;

			if (version < 1)
			{
				store = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });

				store = db.createObjectStore('hours', { keyPath: 'id', autoIncrement: true });
				store.createIndex('task', 'task_id');
			}
		})
		.then(() => {
			utils.runAfter(250, () => {
				this.dataset.anim = 'fade-out';
				workflow.continueTo('home');
			});
		});
	}
});
