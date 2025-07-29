
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {BindingSignaler} from 'aurelia-templating-resources';
import {inject} from 'aurelia-framework';
import {PatientInfoOptions} from "../data/patient-info/options";

@inject(helper, http, BindingSignaler, PatientInfoOptions)
export class PatientInfoEditor {

	constructor(helper, http, signaler, patientInfoOptions){
		this.helper = helper;
		this.http = http;
		this.signaler = signaler;
		this.options = patientInfoOptions.data;
		this.providerId = null;
	}

	save(){
		let self = this;
		var optionsString = JSON.stringify(self.options);
		var data = {
			ProviderId: self.providerId,
			Type: 'patient-info',
			JsonData: optionsString
		};
		console.log('SAVE', data);
		var url = self.helper.getApiUrl('configuration');
		self.http.post(url, data, (returnData) => {
			console.log('SAVED CONFIGURATION:', returnData);
			if(returnData != null){
				self.setOptions(returnData);
			}
		});
	}

	checkChanged(){
		let self = this;
		console.log('CHECK CHANGED', option);
		//self.options.splice(optionIndex, 1);
		//option.showThis = !option.showThis;
		//self.signaler.signal('show-this-changed');
		//self.options.splice(optionIndex, 0, option);
		/*
		if(option.showThis === true){
			console.log('SHOW THIS IS TRUE');
			option.showThis = false;
		} else {
			console.log('SHOW THIS IS FALSE');
			option.showThis = true;
		}
		// option.showThis = !option.showThis;
		console.log('NEW VALUE', option);
		console.log('INDEX', optionIndex);
		*/

		/*
		for(var i = 0; i < self.options.length; i++) {
			var currentOption = self.options[i];
			if(currentOption.name == option.name){
				self.options.splice(i, 0, currentOption);
				break;
			}
		}
		*/
		/*
		var showThis = self.options.data[key].showThis;
		console.log('CHECK CHANGED', key);
		console.log('SHOW THIS', showThis);
		self.options.data[key].showThis = !showThis;
		console.log('NEW SHOW THIS', self.options.data[key].showThis);
		*/
		//this.save();
	}

	getKey(object){
		let keyNames = Object.keys(object);
		console.log('KEY NAMES:', keyNames);
	}

	setOptions(configurationObject){
		let self = this;
		try {
			let parsedData = JSON.parse(configurationObject.JsonData);
			self.options = parsedData.data;
		} catch (e) {
			console.log(e);
		}
	}

	getConfiguration(){
		let self = this;
		var providerIdString = self.providerId ? '&providerId=' + self.providerId : ''
		var resourceUrl = 'configuration/?type=patient-info' + providerIdString;
		var url = self.helper.getApiUrl(resourceUrl);
		self.http.get(url, (data) => {
			console.log('CONFIGURATION:', data);
			if(data != null){
				self.setOptions(data);
			}
		});
	}

	activate(params, arg2){
		let self = this;
		if (params.hasOwnProperty("jwt")){
			self.helper.processToken(params.jwt);
		}
		if (params.hasOwnProperty("providerId")){
			self.providerId = params.providerId;
		}
		self.getConfiguration();
	}

	attached(){
		let self = this;
		/*
		self.dialogService.open({viewModel: Login, model: {userName: 'when?'}, lock: true}).whenClosed(response => {
			if(!response.wasCancelled){
				console.log('good - ', response.output);
			}
			console.log('response', response);
		});
		*/
	}

}

