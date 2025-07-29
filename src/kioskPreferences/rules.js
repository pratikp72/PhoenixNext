
import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class Rules {

	pdfTemplate;
	activeRule;
	saving;
	daysValue;
	procedureValue;
	procedureFromValue;
	procedureToValue;
	errorMessage;

	constructor(DialogController, http, helper){
		this.message = "test login message";
		this.dialogController = DialogController;
		this.http = http;
		this.helper = helper;
		this.activeRule = 'DAYS';
		this.saving = false;
		this.errorMessage = '';
	}

	setActiveRule(ruleName){
	    this.activeRule = ruleName;
	}

	saveClicked(){
		let self = this;
		self.errorMessage = '';
		self.saving = true;
		let value = null;
		switch (self.activeRule) {
			case 'DAYS':
				value = self.daysValue;
				break;
			case 'PROCEDURE':
				let ruleProcedure = {
					ProcedureCode: self.procedureValue,
					RangeLower: self.procedureFromValue,
					RangeUpper: self.procedureToValue
				};
				value = JSON.stringify(ruleProcedure);
				break;
		}
		let fullUrl = self.helper.getApiUrl('pdftemplaterules');
		let data = {
			name: self.activeRule,
			value: value,
			templateId: self.pdfTemplate.TemplateID,
			providerId: 0
		};
		console.log('FULL LOGIN URL:', fullUrl);
		self.http.post(fullUrl, data, (returnData) => {
			console.log('RETURN DATA', returnData);
			// self.dialogController.close(true, returnData);
			self.saving = false;
		}, null, () => {
		    self.saving = false;
			self.setupRule(self.activeRule);
			self.errorMessage = 'Error Saving Rule';
		});
	}

	deleteClicked(){
		let self = this;
		self.errorMessage = '';
		self.saving = true;
		let fullUrl = self.helper.getApiUrl(`pdftemplaterules?name=${self.activeRule}&templateId=${self.pdfTemplate.TemplateID}&providerId=0`);
		console.log('FULL LOGIN URL:', fullUrl);
		self.http.del(fullUrl, (returnData) => {
			console.log('RETURN DATA', returnData);
			// self.dialogController.close(true, returnData);
			self.clearRule(self.activeRule);
			self.saving = false;
		}, () => {
		    self.setupRule(self.activeRule);
			self.saving = false;
			self.errorMessage = 'Error Deleting Rule';
		});
	}

	clearRule(ruleToClear){

		let self = this;

			if(ruleToClear === 'DAYS'){
				self.daysValue = null;
			}
			if(ruleToClear === 'PROCEDURE'){
				self.procedureValue = null;
				self.procedureToValue = null;
				self.procedureFromValue = null;
			}

	}

	setupRule(ruleToSetup){

		let self = this;
		let rules = self.pdfTemplate.OD_PDF_Template_Rules;

		for(let i = 0; i < rules.length; i++){
			let currentRule = rules[i];
			if(ruleToSetup === 'DAYS' && currentRule.Name === 'DAYS'){
				self.daysValue = currentRule.Value;
				break;
			}
			if(ruleToSetup === 'PROCEDURE' && currentRule.Name === 'PROCEDURE'){
				let procedureValue = JSON.parse(currentRule.Value);
				self.procedureValue = procedureValue.ProcedureCode;
				self.procedureFromValue = procedureValue.RangeLower;
				self.procedureToValue = procedureValue.RangeUpper;
				break;
			}
		}

	}

	activate(model){
		let self = this;
		self.pdfTemplate = model;
		self.setupRule('DAYS')
		self.setupRule('PROCEDURE')
		console.log('RULES ACTIVATE', model);
	}

	attached(){
    //rulesdialog
    var res = $(this.rulesdialog).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }

}
