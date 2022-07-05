
import { db, Element } from 'riza';
import fs from 'fs';

Element.register('r-tasks-edit', 'r-panel',
{
	contents: fs.readFileSync(__dirname + '/tasks-edit.html'),
	model: { },
	record: null,

	init: function()
	{
		this.addClass('dialog bottom');
		this.dataset.route = "/tasks/edit/:id";
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
			if ((await db.findOne('tasks', { name: r.name }, { id: this.record.id })) !== null)
				err.fields.name = 'Task with this name already exists.';
		}
		else
			err.fields.name = 'Please specify the task name.';

		// ***
		r.category = (r.category || '').trim();

		// ***
		if (Object.keys(err.fields).length)
			return resolve(err);

		this.record.name = r.name;
		this.record.category = r.category;

		db.put('tasks', this.record);
		resolve({ response: 200 });
	},

	'event panelShown &this': async function(evt, args)
	{
		this.form.reset()
		this.form.model.set(this.record = await db.get('tasks', Number(args.id)));
	},

	'event formSuccess &form': function()
	{
		this.close();
	}
});
