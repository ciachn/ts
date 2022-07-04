
import CustomDialog from './elems/custom-dialog';

/**
 * Month names.
 */
const monthName = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Returns an object containing the differences between the given objects.
 * @param {object} oldObject
 * @param {object} newObject
 * @returns {object}
 */
function getDiff (oldObject, newObject)
{
	let diffObject = { };

	for (let i in newObject)
	{
		if (i in oldObject)
		{
			if (oldObject[i] != newObject[i])
				diffObject[i] = newObject[i];
		}
		else
			diffObject[i] = newObject[i];
	}

	return diffObject;
}

/**
 * Converts the given value to a string.
 * @param {any} value
 * @returns {string}
 */
function str (value)
{
	return (value+'');
}

/**
 * Converts the given value to an integer.
 * @param {any} value
 * @returns {number}
 */
function int (value)
{
	return ~~(value);
}

/**
 * Returns the first non-null and non-undefined value in an argument list, or `null` if none found.
 * @param {any} ...values
 * @returns {any}
 */
function coalesce (...values)
{
	for (let i = 0; i < values.length; i++)
	{
		if (values[i] !== undefined && values[i] !== null)
			return values[i];
	}

	return null;
}

/**
 * Returns a promise that resolves after the given number of milliseconds.
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function wait (milliseconds)
{
	return new Promise((resolve, reject) => {
		setTimeout(resolve, milliseconds);
	});
}

/**
 * Returns a map using the specified field as the key.
 * @param {Array<object>} data
 * @param {string} field
 * @returns {object}
 */
function mapify (data, field)
{
	let _data = { };

	for (let i = 0; i < data.length; i++)
		_data[data[i][field]] = data[i];

	return _data;
}

/**
 * Executes the callback after the given number of milliseconds.
 * @param {number} milliseconds
 * @param {function} callback
 */
function runAfter (milliseconds, callback)
{
	setTimeout(callback, milliseconds);
}

/**
 * Shows an information popup.
 * @param {string} text
 * @param {object} [options]
 * @returns {Promise<any>}
 */
function popupInfo (text, options=null)
{
	let dialog = new CustomDialog();
	document.body.appendChild(dialog);

	dialog.setType('info');
	dialog.model.set('title', global.messages.info);
	dialog.model.set('text', text);

	dialog.model.set('buttons', [
		{ value: true, label: global.messages.ok, class: 'btn-primary px-4' },
	]);

	if (options)
		dialog.model.set(options);

	runAfter(0, () => dialog.show());

	global.currentDialog = dialog;
	return dialog.wait();
}

/**
 * Shows an error popup.
 * @param {string} text
 * @param {object} [options]
 * @returns {Promise<any>}
 */
function popupError (text, options=null)
{
	let dialog = new CustomDialog();
	document.body.appendChild(dialog);

	dialog.setType('error');
	dialog.model.set('title', global.messages.error);
	dialog.model.set('text', text);

	dialog.model.set('buttons', [
		{ value: true, label: global.messages.ok, class: 'btn-primary px-4' },
	]);

	if (options)
		dialog.model.set(options);

	runAfter(0, () => dialog.show());

	global.currentDialog = dialog;
	return dialog.wait();
}

/**
 * Shows a confirmation popup.
 * @param {string} text
 * @param {object} [options]
 * @returns {Promise<any>}
 */
function popupConfirm (text, options=null)
{
	let dialog = new CustomDialog();
	document.body.appendChild(dialog);

	dialog.setType('confirm');
	dialog.model.set('title', global.messages.confirm);
	dialog.model.set('text', text);

	dialog.model.set('buttons', [
		{ value: false, label: global.messages.no },
		{ value: true, label: global.messages.yes, class: 'btn-primary px-4' }
	]);

	if (options)
		dialog.model.set(options);

	runAfter(0, () => dialog.show());

	global.currentDialog = dialog;
	return dialog.wait();
}

/* *********************************************** */
function align2 (value)
{
	return (value/100).toFixed(2).substr(2);
}

function parseDate (value)
{
	if (typeof(value) === 'Date')
		return value;

	return new Date(str(value));
}

function formatDateTime (value)
{
	value = parseDate(value);
	return value.getFullYear() + '-' + align2(value.getMonth() + 1) + '-' + align2(value.getDate()) + ' ' + align2(value.getHours()) + ':' + align2(value.getMinutes());
}

function formatShortDateTime (value)
{
	value = parseDate(value);
	return monthName[value.getMonth()] + ' ' + align2(value.getDate()) + ' ' + align2(value.getHours()) + ':' + align2(value.getMinutes());
}

function formatDate (value)
{
	value = parseDate(value);
	return value.getFullYear() + '-' + align2(value.getMonth() + 1) + '-' + align2(value.getDate());
}

function formatShortDate (value)
{
	value = parseDate(value);
	return monthName[value.getMonth()] + ' ' + align2(value.getDate());
}

function formatDuration (value)
{
	return align2(int(value / 60)) + ':' + align2(value % 60);
}

function elapsedTime (date2, date1)
{
	return int((parseDate(date2) - parseDate(date1)) / (60*1000));
}

function dateCompare (date1, date2)
{
	if (date1.getFullYear() != date2.getFullYear())
		return date1.getFullYear() - date2.getFullYear();

	if (date1.getMonth() != date2.getMonth())
		return date1.getMonth() - date2.getMonth();

	return date1.getDate() - date2.getDate();
}

function csvEscape (value)
{
	return '"' + str(value).replace(/"/g, '""') + '"';
}

function csvRaw (value)
{
	return '="' + value + '"';
}

function csvRow (data)
{
	let s = [];

	for (let i of data)
		s.push(csvEscape(i));

	return s.join(',');
}

export default
{
	getDiff,
	str,
	int,
	coalesce,
	wait,
	mapify,
	runAfter,
	popupInfo,
	popupError,
	popupConfirm,

	align2,
	parseDate,
	formatDateTime,
	formatShortDateTime,
	formatDate,
	formatShortDate,
	formatDuration,
	elapsedTime,
	dateCompare,
	csvRaw,
	csvRow,
}
