
import { db, Element } from 'riza';
import fs from 'fs';
import utils from '../utils';

Element.register('r-entries-edit', 'r-panel',
{
	contents: fs.readFileSync(__dirname + '/entries-edit.html'),
	model: { },
	record: null,

	init: function()
	{
		this.addClass('dialog bottom');
		this.dataset.route = "/reports/detailed/:id";
	},

	ready: function()
	{
		this.form.formAction = this.formSubmit.bind(this);
	},

	close: function()
	{
		history.back();
	},

	formSubmit: async function (r, resolve)
	{
		let err = { response: 407, fields: { } };
		let data = { };

		let tmp = r.date_yyyy + '-' + utils.align2(r.date_mm) + '-' + utils.align2(r.date_dd);
		if (utils.formatDate(tmp) !== tmp)
			err.error = 'The date is invalid.';
		else
			data.date = tmp;

		let record = await db.get('hours', Number(r.id));
		if (!record) err.error = 'Record not found.';

		let task = await db.get('tasks', Number(record.task_id));
		if (!task) err.error = 'Task not found.';

		task.total -= record.duration;

		// ***
		if (err.error || Object.keys(err.fields).length)
		{
			err.response = err.error ? 409 : 407;
			return resolve(err);
		}

		tmp = utils.parseDate(data.date + ' ' + utils.align2(r.started_hh) + ':' + utils.align2(r.started_mm));
		data.started = utils.formatDateTime(tmp);
		tmp.setMinutes(tmp.getMinutes() + Number(r.duration));
		data.ended = utils.formatDateTime(tmp);
		data.duration = utils.elapsedTime(data.ended, data.started);

		Object.assign(record, data);

		task.total += record.duration;

		db.put('tasks', task);
		db.put('hours', record);

		resolve({ response: 200 });
	},

	'event panelShown &this': async function(evt, args)
	{
		this.form.reset()

		let entry = await db.get('hours', Number(args.id));

		let tmp = utils.parseDate(entry.date);
		entry.date_yyyy = tmp.getFullYear();
		entry.date_mm = tmp.getMonth() + 1;
		entry.date_dd = tmp.getDate();

		tmp = utils.parseDate(entry.started);
		entry.started_hh = utils.align2(tmp.getHours());
		entry.started_mm = utils.align2(tmp.getMinutes());

		this.form.model.set(entry);
	},

	'event formSuccess &form': function()
	{
		EventBus.trigger('hoursUpdated');
		this.close();
	}
});
