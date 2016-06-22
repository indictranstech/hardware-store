from __future__ import unicode_literals
import frappe
import json
from frappe import _
from frappe.utils import nowdate, cstr, flt, now, getdate, add_months

@frappe.whitelist()
def rate(args):
	arg = json.loads(args)
	item_name = arg['item_name']
	item_qty = arg['qty']
		
	Price_list = ''
	if arg['customer_group'] == "Credit Customers":
		Price_list = "tabCredit Customers"
	elif arg['customer_group'] == "Resellers":
		Price_list = "tabReseller Customers"
	else:
		Price_list = "tabRegular Customers"
	rate = frappe.db.sql("""SELECT chld_tbl.rate as rate, chld_tbl.minimum_qty as minimum_qty 
					from 
						`tabItem` as item, `%s` as chld_tbl 
					where 
							item.name = chld_tbl.parent
						and 
							item.name = '%s'
						and
							chld_tbl.minimum_qty >= %s
						""" %(Price_list, item_name, item_qty),as_dict=1)

	return "hello"