
import { db, Api, Element, Utils } from 'riza';
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

	'route /reports/': function(evt, args)
	{
		if (args.route.changed)
			this.refresh();
	},

	refresh: async function()
	{
		let tasks = await db.getAll('tasks');
		let tmp;

		const firstWeekDay = 5; // Sunday=0

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

			/* ** */
			tmp = utils.mapify(tasks[i].hours, 'date');
			for (let i in tmp) tmp[i] = { date: i, duration: 0 };

			for (let j = 0; j < tasks[i].hours.length; j++)
				tmp[tasks[i].hours[j].date].duration += tasks[i].hours[j].duration;

			tasks[i].hours_per_date = Object.values(tmp);

			/* ** */
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

				let tmp2 = { date: utils.formatDate(min_datetime), duration: 0 };

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
	},

	downloadCsv: function()
	{
		let data = [];

		data.push(utils.csvRow(["Started", "Ended", "Duration", "Task"]));

		let hours = [];

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
	}
});
