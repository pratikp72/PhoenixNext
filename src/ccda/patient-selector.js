
import {inject} from 'aurelia-framework';
import {DialogController} from 'aurelia-dialog';
import {helper} from '../helpers/helper';

@inject(DialogController, helper)
export class PatientSelector {

    constructor(dialogController, helper){
        this.dialogController = dialogController;
        this.model = {patients: []};
        this.helper = helper;
    }

    formatDate(date){
        return this.helper.getISODateToFormat(date, 'MM/DD/YYYY');
    }

    patientSelected(patient){
        console.log('PATIENT SELECTED', patient);
        this.dialogController.ok(patient);
    }

    activate(model){
        if(model){
            this.model = model;
        }
    }

}
