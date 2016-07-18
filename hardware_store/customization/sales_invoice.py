from __future__ import unicode_literals
import frappe
from frappe import _, msgprint
 

def custom_for_pos(self, method):
		if self.mode_of_payment == "Credit to account":
			self.is_pos = 0
			self.paid_amount = 0.0
			self.base_paid_amount = 0.0
			self.write_off_amount = 0.0
			self.outstanding_amount = self.base_grand_total 