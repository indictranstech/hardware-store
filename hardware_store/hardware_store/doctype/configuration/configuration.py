# -*- coding: utf-8 -*-
# Copyright (c) 2015, Makarand Bauskar and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import nowdate, cstr, flt, now, getdate, add_months
from frappe.model.document import Document
import datetime

class Configuration(Document):

	def validate(self):
		self.vaildate_days()
		# self.discount_value()

	def vaildate_days(self):
		if self.valid_days <= 0:
			frappe.throw(_("Please Enter proper valid days , valid days should be greater than Zero"))

	def discount_value(self):
		if self.discount_value <= 0:
			frappe.throw(_("Please Enter proper Discount Value , Discount Value should be greater than Zero"))

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

@frappe.whitelist()
def currency_data():
	from_currency =frappe.db.get_value("Configuration", "Configuration", "from_currency")
	to_currency =frappe.db.get_value("Configuration", "Configuration", "to_currency")
	exchange_rate =frappe.db.get_value("Configuration", "Configuration", "exchange_rate")
	return [from_currency ,to_currency, exchange_rate]