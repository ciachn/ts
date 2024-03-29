
import { db, Api, Element, Utils, Router } from 'riza';
import utils from '../utils';
import fs from 'fs';

Element.register('r-reports', 'r-panel',
{
	contents: fs.readFileSync(__dirname + '/reports.html'),
	model: { },

	init: function()
	{
		this.addClass('r-panel flex-fill d-flex flex-column overflow-auto');
		this.dataset.route = "/reports/";
	},

	onConnected: function()
	{
		this._super['r-panel'].onConnected();

		EventBus.watch('reports:hoursUpdated', () => {
			this.refresh();
		});
	},

	onDisconnected: function()
	{
		this._super['r-panel'].onDisconnected();

		EventBus.unwatch('reports:hoursUpdated');
	},

	'route /reports/': function(evt, args)
	{
		if (args.route.changed)
			this.refresh();
	},

	refresh: async function()
	{
		let tmp;

		const firstWeekDay = 5; // Sunday=0

		// Load tasks.
		let tasks = await db.getAll('tasks');

		for (let i = 0; i < tasks.length; i++)
		{
			if (!tasks[i].total)
			{
				tasks.splice(i, 1);
				i--;
				continue;
			}

			tasks[i].hours = await db.getAll(db.index('hours', 'task'), tasks[i].id);
			if (!tasks[i].hours.length) continue;

			/* ** */
			for (let j = 0; j < tasks[i].hours.length; j++)
				tasks[i].hours[j].datetime = utils.parseDate(tasks[i].hours[j].started);

			tasks[i].hours.sort((b, a) => a.datetime - b.datetime);

			/* Daily */
			tmp = utils.mapify(tasks[i].hours, 'date');
			for (let i in tmp) tmp[i] = { date: i, duration: 0 };

			for (let j = 0; j < tasks[i].hours.length; j++)
				tmp[tasks[i].hours[j].date].duration += tasks[i].hours[j].duration;

			tasks[i].hours_per_date = Object.values(tmp);

			/* Weekly */
			let min_datetime = new Date(tasks[i].hours.reduce((acc, cur) => acc === null ? cur : (cur.datetime < acc.datetime ? cur : acc), null).datetime);
			let max_datetime = new Date(tasks[i].hours.reduce((acc, cur) => acc === null ? cur : (cur.datetime > acc.datetime ? cur : acc), null).datetime);

			while (min_datetime.getDay() != firstWeekDay)
				min_datetime.setDate(min_datetime.getDate() - 1);

			let cur_datetime = new Date(min_datetime);
			cur_datetime.setDate(cur_datetime.getDate() - 1);

			tmp = [];

			while (cur_datetime < max_datetime)
			{
				cur_datetime.setDate(cur_datetime.getDate() + 7);

				let tmp2 = { starts: utils.formatDate(min_datetime), ends: utils.formatDate(cur_datetime), duration: 0 };

				for (let j = 0; j < tasks[i].hours.length; j++)
				{
					if (utils.dateCompare(tasks[i].hours[j].datetime, min_datetime) >= 0 && utils.dateCompare(tasks[i].hours[j].datetime, cur_datetime) <= 0)
						tmp2.duration += tasks[i].hours[j].duration;
				}

				tmp.push(tmp2);
				min_datetime.setDate(min_datetime.getDate() + 7);
			}

			tasks[i].hours_per_week = Object.values(tmp);
		}

		this.model.set('tasks', tasks);

		// Load hours/tasks of category.
		let categories = [];

		for (let category of await db.getAllUnique(db.index('tasks', 'category'), 'category'))
		{
			let hours = [];
			let total = 0;

			for (let task of await db.getAll(db.index('tasks', 'category'), category))
			{
				if (!task.total)
					continue;

				let tmp = await db.getAll(db.index('hours', 'task'), task.id);
				if (!tmp.length) continue;

				for (let j = 0; j < tmp.length; j++) {
					tmp[j].task = task.name;
					tmp[j].datetime = utils.parseDate(tmp[j].started);
				}

				hours = hours.concat(tmp);
				total += task.total;
			}

			if (!total) continue;

			hours.sort((b, a) => a.datetime - b.datetime);
			categories.push({ name: category, total, hours });
		}

		this.model.set('categories', categories);
	},

	downloadCsv: function({ category })
	{
		let data = [];
		let hours;

		switch (category ? 'singleCategory' : this.reportsTab.activeTab)
		{
			case 'detailed':
				data.push(utils.csvRow(["Started", "Ended", "Duration", "Task"]));
				hours = [];

				for (let i of this.model.data.tasks)
				{
					for (let j of i.hours)
						hours.push({ datetime: j.datetime, started: j.started, ended: j.ended, duration: j.duration, task: i.name });
				}

				hours.sort((a, b) => a.datetime - b.datetime);

				for (let i of hours)
					data.push(utils.csvRow([
						utils.csvRaw(utils.formatDateTime(i.started)), 
						utils.csvRaw(utils.formatDateTime(i.ended)), 
						utils.csvRaw(utils.formatDuration(i.duration)),
						i.task]));

				data.push(utils.csvRow(['', 'Total', utils.csvRaw(utils.formatDuration(hours.reduce((s,x) => s+x.duration, 0))), '']));
				break;

			case 'daily':
				data.push(utils.csvRow(["Date", "Task", "Duration"]));
				hours = [];

				for (let i of this.model.data.tasks)
				{
					for (let j of i.hours_per_date)
						hours.push({ datetime: j.datetime, date: j.date, duration: j.duration, task: i.name });
				}

				hours.sort((a, b) => a.datetime - b.datetime);

				for (let i of hours)
					data.push(utils.csvRow([
						utils.csvRaw(utils.formatShortDate(i.date)), 
						i.task,
						utils.csvRaw(utils.formatDuration(i.duration))
						]));

				data.push(utils.csvRow(['', 'Total', utils.csvRaw(utils.formatDuration(hours.reduce((s,x) => s+x.duration, 0)))]));
				break;

			case 'weekly':
				data.push(utils.csvRow(["Week", "Task", "Duration"]));
				hours = [];

				for (let i of this.model.data.tasks)
				{
					for (let j of i.hours_per_week)
						hours.push({ datetime: j.datetime, starts: j.starts, ends: j.ends, duration: j.duration, task: i.name });
				}

				hours.sort((a, b) => a.datetime - b.datetime);

				for (let i of hours)
					data.push(utils.csvRow([
						utils.csvRaw(utils.formatShortDate(i.starts) + ' to ' + utils.formatShortDate(i.ends)),
						i.task,
						utils.csvRaw(utils.formatDuration(i.duration))
						]));

				data.push(utils.csvRow(['', 'Total', utils.csvRaw(utils.formatDuration(hours.reduce((s,x) => s+x.duration, 0)))]));
				break;

			case 'category':
				data.push(utils.csvRow(["Started", "Ended", "Category", "Task", "Duration"]));
				hours = [];

				for (let i of this.model.data.categories)
				{
					for (let j of i.hours)
						hours.push({ datetime: j.datetime, started: j.started, ended: j.ended, duration: j.duration, category: i.name, task: j.task });
				}

				hours.sort((a, b) => a.datetime - b.datetime);

				for (let i of hours)
					data.push(utils.csvRow([
						utils.csvRaw(utils.formatDateTime(i.started)), 
						utils.csvRaw(utils.formatDateTime(i.ended)), 
						i.category,
						i.task,
						utils.csvRaw(utils.formatDuration(i.duration))
					]));

				data.push(utils.csvRow(['', '', '', 'Total', utils.csvRaw(utils.formatDuration(hours.reduce((s,x) => s+x.duration, 0)))]));
				break;

			case 'singleCategory':
				data.push(utils.csvRow(["Started", "Ended", "Task", "Duration"]));
				hours = [];

				for (let i of this.model.data.categories)
				{
					if (i.name != category) continue;

					for (let j of i.hours)
						hours.push({ datetime: j.datetime, started: j.started, ended: j.ended, duration: j.duration, task: j.task });
				}

				hours.sort((a, b) => a.datetime - b.datetime);

				for (let i of hours)
					data.push(utils.csvRow([
						utils.csvRaw(utils.formatDateTime(i.started)), 
						utils.csvRaw(utils.formatDateTime(i.ended)), 
						i.task,
						utils.csvRaw(utils.formatDuration(i.duration))
					]));

				data.push(utils.csvRow(['', '', 'Total', utils.csvRaw(utils.formatDuration(hours.reduce((s,x) => s+x.duration, 0)))]));
				break;
		}

		Utils.showDownload ('report.csv', 'data:text/csv;base64,'+Api.base64.encode(data.join("\r\n")));
	},

	cleanHours: function ({ id })
	{
		utils.popupConfirm('Are you sure you want to clean this task?').then(async (response) =>
		{
			if (!response) return;

			await db.deleteAll(db.index('hours', 'task'), Number(id));

			let task = await db.get('tasks', Number(id));
			task.total = 0;
			await db.put('tasks', task);

			await this.refresh();
		});
	},

	cleanCategoryHours: function ({ category })
	{
		utils.popupConfirm('Are you sure you want to clean this category?').then(async (response) =>
		{
			if (!response) return;

			for (let task of await db.getAll(db.index('tasks', 'category'), category))
			{
				await db.deleteAll(db.index('hours', 'task'), task.id);

				task.total = 0;
				await db.put('tasks', task);
			}

			await this.refresh();
		});
	},

	downloadCategory: function ({ category })
	{
		this.downloadCsv({ category });
	},

	editEntry: function ({ id })
	{
		Router.navigate('/reports/detailed/' + id);
	}
});
