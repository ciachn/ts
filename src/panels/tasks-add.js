
import { db, Element } from 'riza';
import fs from 'fs';

Element.register('r-tasks-add', 'r-panel',
{
	contents: fs.readFileSync(__dirname + '/tasks-add.html'),
	model: { },

	init: function()
	{
		this.addClass('dialog bottom');
		this.dataset.route = "/tasks/add/";
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
		r.taskName = (r.taskName || '').trim();
		if (!r.taskName) return resolve({ response: 407, fields: { taskName: 'Please specify the task name.' }});

		if ((await db.findOne('tasks', { name: r.taskName })) !== null)
			return resolve({ response: 407, fields: { taskName: 'Task with this name already exists.' }});

		db.insert('tasks', { name: r.taskName, started: null, total: 0 });
		resolve({ response: 200 });
	},

	'event panelShown &this': function()
	{
		this.form.reset()
		this.form.querySelector('input:first-child').focus();
	},

	'event formSuccess &form': function()
	{
		this.close();
	}
});
