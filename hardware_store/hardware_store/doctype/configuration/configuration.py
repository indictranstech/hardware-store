# -*- coding: utf-8 -*-
# Copyright (c) 2015, Makarand Bauskar and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import nowdate, cstr, flt, now, getdate, add_months
from frappe.model.document import Document
import datetime
import json

class Configuration(Document):

	def validate(self):
		self.vaildate_days()
		
	def vaildate_days(self):
		if self.valid_days <= 0:
			frappe.throw(_("Please Enter proper valid days , valid days should be greater than Zero"))

	# def discount_value(self):
	# 	if self.discount_value <= 0:
	# 		frappe.throw(_("Please Enter proper Discount Value , Discount Value should be greater than Zero"))

	# def currency_exchange(self):
	# 	name = self.from_currency +"-"+ self.to_currency
	# 	if not frappe.db.get_value("Currency Exchange", {'name' : name}, 'name', as_dict =True):
	# 		create_currency_exchange = frappe.new_doc("Currency Exchange")
	# 		create_currency_exchange.name = name
	# 		create_currency_exchange.from_currency = self.from_currency
	# 		create_currency_exchange.to_currency = self.to_currency
	# 		create_currency_exchange.exchange_rate = self.exchange_rate
	# 		create_currency_exchange.flags.ignore_permissions = 1
	# 		create_currency_exchange.save()
	# 		frappe.db.commit()
	# 		print "-------------------create"
			
	# 	else:
	# 		update_currency_exchange = frappe.get_doc("Currency Exchange", name)
	# 		update_currency_exchange.exchange_rate = self.exchange_rate
	# 		update_currency_exchange.flags.ignore_permissions = 1
	# 		update_currency_exchange.save()
	# 		frappe.db.commit()
	# 		print "-------------------update"
			

@frappe.whitelist(allow_guest=True)
def quotation_status():
	configuration_obj = frappe.get_doc("Configuration", "Configuration")
	if configuration_obj:
		Quotations = frappe.db.sql("""SELECT  `name`, `transaction_date` 
									from 
										`tabQuotation` 
									where 
										quotation_status = 'Valid' 
										and status = 'Submitted'
									""", as_dict=1)
		
		for fields in Quotations:
			end_date = fields.transaction_date + datetime.timedelta(days=configuration_obj.valid_days)
			if getdate(nowdate()) > end_date:
				frappe.db.sql("""UPDATE `tabQuotation` 
								SET 
									quotation_status ='Expired', 
									order_lost_reason ='Expired due to transaction date exceeds given limit specified in configuration',
									status ='Lost' 
								where 
									name ='%s' 
								""" %(fields.name))
				frappe.db.commit()

@frappe.whitelist()
def discount_limit():
	discount_limit = frappe.db.get_value("Configuration", "Configuration", "discount_limit")
	discount_value = frappe.db.get_value("Configuration", "Configuration", "discount_value")
	return discount_limit, discount_value

# @frappe.whitelist()
# def currency_data():
# 	return frappe.db.get_values('Configuration', 'Configuration', ['from_currency', 'to_currency', 'exchange_rate'], as_dict=1)


@frappe.whitelist()
def currency_data():
	query = "select `name`, `from_currency` , `to_currency`, `exchange_rate` from `tabCurrency Exchange` where parent = 'Configuration'"
	return frappe.db.sql(query, as_dict=1)

@frappe.whitelist()
def item_stock_balance(arg):
	item_name = []
	for item_code in json.loads(arg):
		item_name.append(item_code['item_name'])

	item_names = ",".join(["'%s'"%name for name in item_name])
	
	query1 = """SELECT  s.item as item , p.p_qty ,(p.p_qty - s.qty) as actual_qty , p.con, (p.p_qty - s.qty) / p.con as pack from  
		(
		 	select pri.item_code as item, ifnull(sum(pri.stock_qty),0) as p_qty , pri.conversion_factor as con 
				from 
					`tabPurchase Receipt Item` as pri, 
					`tabPurchase Receipt` as pr 
				where pr.docstatus = 1 and pri.parent = pr.name and pri.item_code in (%s) group by pri.item_code) as p,  
		(
			select sii.item_code as item  , ifnull(sum(sii.qty),0) as qty 
				from 
					`tabSales Invoice` as si, 
					`tabSales Invoice Item` as sii 
				where si.docstatus = 1 and sii.parent = si.name and si.update_stock = 1 and sii.item_code in (%s) group by sii.item_code) as s 
			where s.item= p.item """%(item_names, item_names)
	data1 =  frappe.db.sql(query1, as_dict=1,debug=1)
	
	if not data1:
		query1 = """SELECT pri.item_code as item, ifnull(sum(pri.stock_qty),0) as actual_qty ,  pri.stock_qty / pri.conversion_factor as pack 
				from 
					`tabPurchase Receipt Item` as pri, 
					`tabPurchase Receipt` as pr 
				where pr.docstatus = 1 and pri.parent = pr.name and pri.item_code in (%s) group by pri.item_code"""%(item_names)
		data1 =  frappe.db.sql(query1, as_dict=1)

	else:
		query = """SELECT pri.item_code as item, ifnull(sum(pri.stock_qty),0) as actual_qty ,  pri.stock_qty / pri.conversion_factor as pack 
				from 
					`tabPurchase Receipt Item` as pri, 
					`tabPurchase Receipt` as pr 
				where pr.docstatus = 1 and pri.parent = pr.name and pri.item_code in (%s) group by pri.item_code"""%(item_names)
		data =  frappe.db.sql(query1, as_dict=1)
	return data1

