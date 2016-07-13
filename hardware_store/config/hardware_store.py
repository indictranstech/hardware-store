from __future__ import unicode_literals
from frappe import _

def get_data():
	return [
		{
			"label": _("Expense"),
			"icon": "icon-star",
			"items": [
				{
					"type": "doctype",
					"name": "Expense Entry",
					"label": _("Expense entries."),
				},
				{
					"type": "doctype",
					"name": "Expense Reason",
					"description": _("Reason of Expense."),
				},
			]
		},
		{
			"label": _("Setup"),
			"items": [
				{
					"type": "doctype",
					"name": "Configuration",
					"label": _("Configuration"),
				},
			]
		},
		{
			"label": _("Report"),
			"items": [
				{
					"type": "page",
					"name": "end-of-day-sales-rep",
					"label": _("EOD Report"),
					"description": _("end of sales report."),
				},
			]
		},
			 
	]
