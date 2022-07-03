
import { db, Element, Template } from 'riza';
import fs from 'fs';
import utils from '../utils';

Template.register('elapsed', function (args)
{
	return utils.elapsedTime(new Date(), utils.parseDate(args[1]));
});

Template.register('formatDuration', function (args)
{
	return utils.formatDuration(args[1]);
});

Element.register('r-tasks', 'r-panel',
{
	contents: fs.readFileSync(__dirname + '/tasks.html'),
	model: { },

	ticker: null,

	init: function()
	{
		this.addClass('r-panel flex-fill d-flex flex-column overflow-auto');
		this.dataset.route = "/tasks/";

		// Ensure the ticker runs at the start of every minute.
		setTimeout(() => {
			this.onTick();
			this.ticker = setInterval(this.onTick.bind(this), 60*1000);
		}, (60 - (new Date()).getSeconds())*1000);
	},

	'route /tasks/$': function()
	{
		this.refresh();
	},

	onTick: function()
	{
		this.refresh();
	},

	onDisconnected: function()
	{
		if (this.ticker !== null)
			clearInterval(this.ticker);
	},

	refresh: async function()
	{
		this.model.set('list', await db.getAll('tasks'));
	},

	deleteTask: async function({ id })
	{
		utils.popupConfirm('Are you sure you want to delete this task?').then(async (response) =>
		{
			if (!response) return;
			await db.delete('tasks', Number(id));
			await this.refresh();
		});
	},

	toggleTaskTimer: async function({ id })
	{
		const task = await db.get('tasks', Number(id));
		const now = utils.formatDateTime(new Date());

		if (task.started)
		{
			let elapsed = utils.elapsedTime(now, task.started);
			if (elapsed > 0)
			{
				await db.insert('hours', { task_id: task.id, date: utils.formatDate(task.started), duration: elapsed, started: task.started, ended: now });
				task.total += elapsed;
			}

			task.started = null;
		}
		else
		{
			task.started = now;
		}

		await db.put('tasks', task);
		this.refresh();
	},

	cancelTimer: async function({ id })
	{
		const task = await db.get('tasks', Number(id));
		if (!task.started) return;

		utils.popupConfirm('Do you want to cancel current timer?').then(async (response) =>
		{
			if (!response) return;

			task.started = null;

			await db.put('tasks', task);
			this.refresh();
		});
	}
});
