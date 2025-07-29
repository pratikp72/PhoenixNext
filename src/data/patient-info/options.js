
import moment from 'moment';

export class PatientInfoOptions {

	constructor(){
		/*
		this.data = [
			{ entity: 'patient', columnName: 'NameFirst', friendlyName: 'First Name',  showThis: true},
			{ entity: 'patient', columnName: 'NameLast', friendlyName: 'Last Name',  showThis: true},
			{ entity: 'patient', columnName: 'DOB', friendlyName: 'Date of Birth',  showThis: true},
			{ entity: 'employer', columnName: 'NameEmployer', friendlyName: 'Employer',  showThis: true},
			{ entity: 'insurance', columnName: 'OD_Insurance.OD_InsuranceCompany.Name', friendlyName: 'Insurance',  showThis: true},
			{ entity: 'insurance', columnName: 'OD_Insurance.PlanType', friendlyName: 'Plan Type',  showThis: true},
			{ entity: 'open-practice', columnName: 'PaymentGroups', friendlyName: 'Payment Groups',  showThis: true},
		];
		*/
		this.data = [
			{name: 'patientName', friendlyName: 'Patient Name', showName: true, columns: ['NameFirst', 'NameLast'], entity: 'patient', showThis: true},
			{name: 'patientAge', friendlyName: 'Patient Age', showName: true, columns: ['DOB'], entity: 'patient', showThis: true, transform: this.patientAgeTransform},
			{name: 'employerName', friendlyName: 'Employer Name', showName: true, columns: ['NameEmployer'], entity: 'employer', showThis: true},
			{name: 'insuranceName', friendlyName: 'Insurance Name', showName: true, columns: ['OD_Insurance.OD_InsuranceCompany.Name'], entity: 'patient', showThis: false},
			{name: 'insurancePlanType', friendlyName: 'Insurance Plan Type', showName: true, columns: ['OD_Insurance.PlanType'], entity: 'patient', showThis: false},
			{name: 'paymentGroups', friendlyName: 'Payment Groups', showName: false, columns: [], entity: null, showThis: true}
		];
		/*
		this.data = [
			{ name: 'Patient Name', showThis: true },
			{ name: 'Patient DOB', showThis: true },
			{ name: 'Employer Name', showThis: true },
			{ name: 'Insurance Name', showThis: true },
			{ name: 'Insurance Plan Type', showThis: true },
			{ name: 'Payment Groups', showThis: true }
		];
		*/
	}

	patientAgeTransform(patientDOB){
		if(!patientDOB || patientDOB == ''){
			return;
		}
		var m = moment(patientDOB, 'MM/DD/YYYY');
		var years = moment().diff(m, 'years', false);
		return years;
	}

}
