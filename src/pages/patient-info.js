
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';
import {BindingSignaler} from 'aurelia-templating-resources';
import {PatientInfoOptions} from "../data/patient-info/options";

@inject(helper, http, BindingSignaler, PatientInfoOptions)
export class PatientInfo {

	constructor(helper, http, bindingSignaler, patientInfoOptions){
		this.message = 'WHAT UP FROM PATIENT INFO!';
		this.helper = helper;
		this.http = http;
		this.patientId = '';
		this.patient = {};
		this.providerId = null;
		this.employer = {};
		this.paymentGroups = [];
		this.options = patientInfoOptions.data;
		this.signaler = bindingSignaler;
		this.paymentInfo = {};
		// console.log('OPTIONS:', this.options);
	}

	refreshPage(){
		console.log('REFRESH PAGE');
		this.signaler.signal('update-options');
	}

    shouldShowPaymentGroups(options){
		let paymentGroupsOption = null;
		for(var i = 0; i< options.length; i++){
			let currentOption = options[i];
			console.log('CURRENT OPTION:', currentOption);
			if(currentOption.name === 'paymentGroups'){
				paymentGroupsOption = currentOption;
				break;
			}
		}
        let show = paymentGroupsOption.showThis;
        return show;
    }

	shouldShowOption(option){
		if(option.showName === false){
			return false;
		}
		let show = option.showThis;
		let currentData = self[option.entity];
		if(option.columns && option.columns.length > 0){
			for(let i = 0; i < option.columns.length; i++){
				var column = option.columns[i];
				var fullPath = column.split('.');
				//console.log('COLUMN FULL PATH:', fullPath);
			}
			//show = eval(option.nullCheckStatement);
		}
		return show;
		//return true;
	}

	getFormattedValue(option){
		let self = this;
		let currentData = self[option.entity];

		let blalue = null;

		for(let i = 0; i < option.columns.length; i++){
			var column = option.columns[i];
			var fullPath = column.split('.');
			let value = self.getValueRecurse(fullPath, currentData);
			if(blalue !== null){
			    blalue = blalue + ' ';
			} else {
				blalue = '';
			}
			blalue += value;
		}
		if(option.transform){
			blalue = option.transform(blalue);
		}
		if(blalue === '' || blalue === null || blalue === 'null') {
			return null;
		}
		return blalue;

	}

	getValueRecurse(fullPath, data){
		let self = this;
		let currentPath = fullPath.splice(0, 1);
		if(data && data.hasOwnProperty(currentPath)){
			if(fullPath.length > 0){
				//console.log('GETVALUERECURSE: CURRENT PATH', currentPath);
				return this.getValueRecurse(fullPath, data[currentPath]);
			}
			//console.log('GETVALUERECURSE: FINAL PATH', data, currentPath);
			return data[currentPath];
		}
		// return data[currentPath];
		return null;
	}

	getEmployer(employerId){
		let self = this;
		var url = self.helper.getApiUrl('employer?id=' + employerId);
		self.http.get(url, (data) => {
			//console.log('EMPLOYER', data);
			// self.dataObjects['employer'] = data;
			self.employer = data;
			self.refreshPage();
		});
	}

	getPatient(){
		let self = this;
		var url = self.helper.getApiUrl('patients/' + self.patientId);
		self.http.get(url, (data) => {
			console.log('PATIENT', data);
			// self.dataObjects['patient'] = data;
			self.patient = data;
			self.refreshPage();
			self.getEmployer(data.EmployerID);
		});
		self.loadAmounts(false);
	}

	loadAmounts(demo) {
		let self = this;
		//DEMO CODE:
		if(demo === true){
            self.paymentGroups = [
                {name: 'Co Pay', amount: null},
                {name: 'Balance', amount: null}
            ];
			let min = 25000;
			let max = 50000;
			for(var i = 0; i < self.paymentGroups.length; i++){
				let group = self.paymentGroups[i];
				group.amount = (Math.floor(Math.random() * (max - min) + min)) / 100;
			}
			return;
		} else {
			self.getPaymentInfo();
		}
	}

    getPaymentInfo(){
        let self = this;
        let patientId = self.patientId;
        let url = self.helper.getApiUrl(`practicemanagement?patientId=${patientId}`);
        console.log('PRACTICE MANAGEMENT URL', url);
        self.http.get(url, (data) => {
            console.log('PRACTICE MANAGEMENT DATA', data);
            console.log('FOR PATIENTID', patientId);
            self.paymentInfo = data;
            /*
             patient.Kiosk Copay
             patient.balance.patient_balance
             patient.insurance_profile.primary.copay
             */
            if(data.kiosk_copay_formatted && data.kiosk_copay_formatted > 0){
                let kioskCopayGroup = {
                    name: 'Kiosk Copay',
                    amount: data.kiosk_copay_formatted,
                    payThis: true
                };
                self.paymentGroups.push(kioskCopayGroup);
            }
            if(data.balance.patient_balance  && data.balance.patient_balance > 0){
                let balanceGroup = {
                    name: 'Patient Balance',
                    amount: data.balance.patient_balance,
                    payThis: true
                };
                self.paymentGroups.push(balanceGroup);
            }
            if(data.insurance_profile && data.insurance_profile.primary && data.insurance_profile.primary.copay && data.insurance_profile.primary.copay > 0){
                let insuranceCopayGroup = {
                    name: 'Insurance Copay',
                    amount: data.insurance_profile.primary.copay,
                    payThis: true
                };
                self.paymentGroups.push(insuranceCopayGroup);
            }
        });
    }

	setOptions(configurationObject){
		let self = this;
		try {
			let parsedData = JSON.parse(configurationObject.JsonData);
			//console.log('PARSED CONFIGURATION:', parsedData);
			self.options = parsedData;
		} catch (e) {
			console.log(e);
		}
	}

	getConfiguration(){
		let self = this;
		var providerIdString = self.providerId ? '&providerId=' + self.providerId : '';
		var resourceUrl = 'configuration/?type=patient-info' + providerIdString;
		var url = self.helper.getApiUrl(resourceUrl);
		self.http.get(url, (data) => {
			//console.log('CONFIGURATION:', data);
			if(data != null){
				self.setOptions(data);
			}
			self.getPatient();
		});
	}

	activate(params, arg2){
		let self = this;
		if (params.hasOwnProperty("jwt")){
			self.helper.processToken(params.jwt);
		}
		console.log('PARAMS', params);
		self.patientId = params.patientId;
		self.providerId = params.providerId;
		//self.getConfiguration();
		self.getPatient();
		/*
		var url = self.helper.getApiUrl('configuration/?type=patient-info&providerId=' + self.providerId);
		self.http.get(url, (data) => {
			console.log('CONFIGURATION:', data);
			if(data != null){
				self.setOptions(data);
			}
			self.getPatient();
		}, () => {
			self.getPatient();
		});
		*/
	}

}
