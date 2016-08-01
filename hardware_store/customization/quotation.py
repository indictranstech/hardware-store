from __future__ import unicode_literals
import frappe
import json
from frappe import _
from frappe.model.mapper import get_mapped_doc
from frappe.utils import nowdate, cstr, flt, now, getdate, add_months

@frappe.whitelist()
def rate(args):
	arg = json.loads(args)
	item_name = arg['item_name']
	item_qty = arg['qty']
	item_conversation = arg['item_uom']
		
	# Price_list = ''
	if arg['customer_group'] == "Credit Customers":
		Price_list = "tabCredit Customers"
		quantity = quantity_range(Price_list, item_name, item_conversation)
		required_qty =sort_quantity(item_qty, quantity)
		return final_item_rate(Price_list, item_name, required_qty,item_conversation)
	elif arg['customer_group'] == "Resellers":
		Price_list = "tabReseller Customers"
		quantity = quantity_range(Price_list, item_name, item_conversation)
		required_qty = sort_quantity(item_qty, quantity)
		return final_item_rate(Price_list, item_name, required_qty, item_conversation)
	elif arg['customer_group'] == "Regular Customers":
		Price_list = "tabRegular Customers"
		quantity = quantity_range(Price_list, item_name, item_conversation)
		required_qty =sort_quantity(item_qty, quantity)
		return final_item_rate(Price_list, item_name, required_qty, item_conversation)
	

def quantity_range(Price_list, item_name, item_conversation):
	item_quanties = []
	quantity = frappe.db.sql("""SELECT rate, minimum_qty, uom_quantity from `%s` 
						where  parent = '%s' and  NOT minimum_qty = 0 and  uom_quantity='%s'
						""" %(Price_list, item_name, item_conversation),as_dict=1)
	return quantity
 
def sort_quantity(item_qty, quantity):
 	item_quanties=[]
 	sorted_qty =[]
 	for min_qty in quantity:
		item_quanties.append(min_qty['minimum_qty'])
	sorted_qty = sorted(item_quanties)
	required_qty =0
	if item_quanties and sorted_qty:
		for qty in sorted_qty:
			if int(item_qty) <= int(qty):
				return int(qty)
			elif int(max(item_quanties)) < int(item_qty):
				return int(max(item_quanties))
	
def final_item_rate(Price_list, item_name, required_qty, item_conversation):
	return frappe.db.sql("""SELECT chld_tbl.rate as rate 
					from 
						`tabItem` as item, `%s` as chld_tbl 
					where 
							item.name = chld_tbl.parent
						and 
							item.name = '%s'
						and 
							chld_tbl.minimum_qty = %s
						and
							chld_tbl.uom_quantity ='%s'
						""" %(Price_list, item_name, required_qty or 0, item_conversation),as_dict=1)

@frappe.whitelist()
def make_sales_invoice(source_name, target_doc=None, ignore_permissions=False):
	def postprocess(source, target):
		set_missing_values(source, target)
		#Get the advance paid Journal Entries in Sales Invoice Advance
		target.get_advances()

	def set_missing_values(source, target):
		target.is_pos = 0
		target.ignore_pricing_rule = 1
		target.flags.ignore_permissions = True
		target.run_method("set_missing_values")
		target.run_method("calculate_taxes_and_totals")

	def update_item(source, target, source_parent):
		target.amount = flt(source.amount) - flt(source.billed_amt)
		target.base_amount = target.amount * flt(source_parent.conversion_rate)
		target.qty = target.amount / flt(source.rate) if (source.rate and source.billed_amt) else source.qty

	doclist = get_mapped_doc("Quotation", source_name, {
		"Quotation": {
			"doctype": "Sales Invoice",
			"field_map": {
				"party_account_currency": "party_account_currency"
			},
			"validation": {
				"docstatus": ["=", 1]
			}
		},
		"Quotation Item": {
			"doctype": "Sales Invoice Item",
			"field_map": {
				"name": "quotation_detail",
				"parent": "quotation",
			}
			 
		},
		"Sales Taxes and Charges": {
			"doctype": "Sales Taxes and Charges",
			"add_if_empty": True
		},
		"Sales Team": {
			"doctype": "Sales Team",
			"add_if_empty": True
		}
	}, target_doc, postprocess, ignore_permissions=ignore_permissions)

	return doclist