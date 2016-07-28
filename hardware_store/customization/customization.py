from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.mapper import get_mapped_doc
from frappe.utils import nowdate, cstr, flt, now, getdate, add_months

@frappe.whitelist()
def make_sales_invoice(source_name, target_doc=None):
	return _make_sales_invoice(source_name, target_doc)

def _make_sales_invoice(source_name, target_doc=None, ignore_permissions=False):
	customer = _make_customer(source_name, ignore_permissions)

	def set_missing_values(source, target):
		if customer:
			target.customer = customer.name
			target.customer_name = customer.customer_name
		target.ignore_pricing_rule = 1
		target.flags.ignore_permissions = ignore_permissions
		target.run_method("set_missing_values")
		target.run_method("calculate_taxes_and_totals")

	doclist = get_mapped_doc("Quotation", source_name, {
			"Quotation": {
				"doctype": "Sales Invoice",
				"validation": {
					"docstatus": ["=", 1]
				}
			},
			"Quotation Item": {
				"doctype": "Sales Invoice Item",
				"field_map": {
					"parent": "prevdoc_docname"
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
		}, target_doc, set_missing_values, ignore_permissions=ignore_permissions)

	# postprocess: fetch shipping address, set missing values

	return doclist

def _make_customer(source_name, ignore_permissions=False):
	quotation = frappe.db.get_value("Quotation", source_name, ["lead", "order_type", "customer"])
	if quotation and quotation[0] and not quotation[2]:
		lead_name = quotation[0]
		customer_name = frappe.db.get_value("Customer", {"lead_name": lead_name},
			["name", "customer_name"], as_dict=True)
		if not customer_name:
			from erpnext.crm.doctype.lead.lead import _make_customer
			customer_doclist = _make_customer(lead_name, ignore_permissions=ignore_permissions)
			customer = frappe.get_doc(customer_doclist)
			customer.flags.ignore_permissions = ignore_permissions
			if quotation[1] == "Shopping Cart":
				customer.customer_group = frappe.db.get_value("Shopping Cart Settings", None,
					"default_customer_group")

			try:
				customer.insert()
				return customer
			except frappe.NameError:
				if frappe.defaults.get_global_default('cust_master_name') == "Customer Name":
					customer.run_method("autoname")
					customer.name += "-" + lead_name
					customer.insert()
					return customer
				else:
					raise
			except frappe.MandatoryError:
				frappe.local.message_log = []
				frappe.throw(_("Please create Customer from Lead {0}").format(lead_name))
		else:
			return customer_name

@frappe.whitelist()
def default_customer():
	query = """SELECT name from `tabCustomer` where name ='Cash Customer'"""
	return frappe.db.sql(query,as_dict=True)

@frappe.whitelist()
def convert_money_customer():
	query = """SELECT name from `tabCustomer` where name ='Convert Money Customer'"""
	return frappe.db.sql(query,as_dict=True)