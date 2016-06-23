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
	item_quanties = []
	quantity = frappe.db.sql("""SELECT chld_tbl.rate as rate, chld_tbl.minimum_qty as minimum_qty 
					from 
						`tabItem` as item, `%s` as chld_tbl 
					where 
							item.name = chld_tbl.parent
						and 
							item.name = '%s'
						""" %(Price_list, item_name),as_dict=1)

	for min_qty in quantity:
		item_quanties.append(min_qty.minimum_qty)
	sorted_quanties = sorted(item_quanties)
	
	required_qty =0
	for qty in sorted_quanties:
		if int(item_qty) <= qty:
			required_qty = qty
			break
		else:
			required_qty = max(sorted_quanties)
			break

	rate = frappe.db.sql("""SELECT chld_tbl.rate as rate 
					from 
						`tabItem` as item, `%s` as chld_tbl 
					where 
							item.name = chld_tbl.parent
						and 
							item.name = '%s'
						and 
							chld_tbl.minimum_qty = %s
						""" %(Price_list, item_name, required_qty),as_dict=1)
	
	return rate