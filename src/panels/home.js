
import { Element, Router } from 'riza';
import fs from 'fs';

Element.register('r-home',
{
	contents: fs.readFileSync(__dirname + '/home.html'),

	init: function()
	{
		this.addClass('fill-parent d-flex flex-column');
		this.dataset.anim = this.args.anim || 'fade-in';
	},

	rready: function()
	{
		Router.refresh();
	},

	'route $': function()
	{
		Router.navigate('/tasks/');
	}
});
