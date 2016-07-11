from __future__ import unicode_literals
import frappe
import json	
from frappe.utils import flt, cstr, cint
from frappe.utils import flt, today

@frappe.whitelist()
def get_buying_prices(supplier, item):
	total = 0.0
	buying_prices = frappe.db.sql("""select poi.rate from `tabPurchase Order` po, `tabPurchase Order Item` 
		poi where po.name = poi.parent and po.supplier = '%s' and  poi.item_code = '%s' and 
		po.docstatus = 1 order by po.creation desc """%(supplier, item), as_list =1)

	for p in buying_prices :
		total = total + flt(p[0])

	total_records = len(buying_prices)
	return buying_prices, total_records, total

@frappe.whitelist()
def get_expense_resons():
	frappe.errprint(today())
	expense_data = frappe.db.sql("""select etr.expense_reasons, etr.expense_amount from 
		`tabExpense Entry` e, `tabExpense Entries` etr where e.date = '%s' and 
		e.name = etr.parent """%(today()),as_dict=1)
	# frappe.errprint(expense_data[0][1])

	return expense_data

@frappe.whitelist()
def create_expense_entries(reason, amount):
	todays_entry = frappe.db.get_values("Expense Entry", {'date' : today()}, ['name'], as_dict =True)
	
	if todays_entry: 
		etr = frappe.get_doc("Expense Entry", todays_entry[0]['name'])
		etr_ch = etr.append('expense_entries', {})
		etr_ch.expense_reasons = reason
		etr_ch.expense_amount = amount

		etr.flags.ignore_permissions = 1
		etr.save()
		status = "created"
	else:
		exp = frappe.new_doc("Expense Entry")
		exp.date = today()
		exp_dtl = exp.append("expense_entries",{})
		exp_dtl.expense_reasons = reason
		exp_dtl.expense_amount = amount

		exp.flags.ignore_permissions = 1
		exp.save()
		status = "updated"

	return status