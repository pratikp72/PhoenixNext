
import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class PreferenceBuilder {

    bodyparts=[];
    macros=[];

    hpiText = null;
    examText = null;
    planText = null;
    preferenceName = null;
    prefId = 0;

    selectedBodyPart = null;
    selectedTextarea = null;
    caratPosition = -1;
    showNameError = false;
    showBodyPartError = false;

    pref;

    constructor(DialogController, http, helper){
        const self = this;
        self.dialogController = DialogController;
        self.http = http;
        self.helper = helper;
        self.bodyparts.push('Ankle','Knee', 'Hip', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar');
        self.macros.push("[he/she]", '[his/her]', '[him/her]', '[patient]', '[side]', '[postopdays]','[age]', '[gender]','[current provider]', '[hand dominance]');
    }
    
    activate(model){
        const self = this;
        console.log('PREFERENCE BUILDER ACTIVATE', model);

        if(model == null)return;

        self.pref = model;

        model.NoteHistory ? self.hpiText = model.NoteHistory : self.hpiText = null;
        model.NoteExam ? self.examText = model.NoteExam : self.examText = null;
        model.NotePlan ? self.planText = model.NotePlan : self.planText = null;
        model.PostOpProcedure ? self.preferenceName = model.PostOpProcedure : self.preferenceName = null;
        model.BodyPart ? self.selectedBodyPart = model.BodyPart : self.selectedBodyPart = null;
        model.PostOpID ? self.prefId = model.PostOpID : self.prefId = 0;
    }
    
    attached() {
        /*
        optionsForm.addEventListener('submit', function(event) {
            if (optionsForm.checkValidity() === false) {
                event.preventDefault();
                event.stopPropagation();
            }
            optionsForm.classList.add('was-validated');
        }, false);
         */
    }

    setSelectedTextarea(event) {
        this.selectedTextarea = event.target;
        this.caratPosition = event.target.selectionStart;
    }
    
    macroClicked(m){
        let self = this;
        let mcro = m;
        if(self.selectedTextarea!=null && self.caratPosition > -1){
            //insert macro
            let txt = self.selectedTextarea.value;
            let splitTxt = [txt.slice(0, self.caratPosition), txt.slice(self.caratPosition)];
            self.selectedTextarea.value = splitTxt[0] + " " + m + " " + splitTxt[1];

            //update data
            if(self.selectedTextarea.id == 'exam'){
                self.examText = self.selectedTextarea.value;
            }
            if(self.selectedTextarea.id == 'hpi'){
                self.hpiText = self.selectedTextarea.value;
            }
            if(self.selectedTextarea.id == 'plan'){
                self.planText = self.selectedTextarea.value;
            }
        }
    }
    
    close(){
        let self = this;
        
        if(!self.preferenceName){
            self.showNameError = true;
        } else {
            self.showNameError = false;
        }
        if(!self.selectedBodyPart){
            self.showBodyPartError = true;
        } else {
            self.showBodyPartError = false;
        }
        if (self.showNameError || self.showBodyPartError) {
            return;
        }
        self.dialogController.close(true, {preferenceName: self.preferenceName, bodyPart: self.selectedBodyPart, hpiText: self.hpiText, examText: self.examText, planText: self.planText, id: self.prefId});
    }

    cancel(){
        let self = this;
        self.dialogController.cancel();
    }

}
