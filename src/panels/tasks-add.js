
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
		let err = { response: 407, fields: { } };

		// ***
		r.name = (r.name || '').trim();
		if (r.name)
		{
			if ((await db.findOne('tasks', { name: r.name })) !== null)
				err.fields.name = 'Task with this name already exists.';
		}
		else
			err.fields.name = 'Please specify the task name.';

		// ***
		r.category = (r.category || '').trim();

		// ***
		if (Object.keys(err.fields).length)
			return resolve(err);

		db.insert('tasks', { name: r.name, category: r.category, started: null, total: 0 });
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
