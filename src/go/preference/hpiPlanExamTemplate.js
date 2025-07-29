import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';


//@inject(PopupHelper)
export class HpiPlanExamTemplate {

  section=null;
  macroList=['[he/she]', '[his/her]', '[him/her]','[patient]', '[side]', '[PostOpDays]', '[AGE]', '[Gender]','[Hand Dominance]'];
  selectedMacro;
  sectionId;

  constructor() {

  }

  activate(params) {
    var self = this;
    let p = params;
    self.section = params;
    self.templateId = self.section.name.toLowerCase() + "Section";
  }

  removeSection(){
    let self = this;
    // let id = self.section.items[0].id;
    // let name = self.section.items[0].name;

    let itm = self.section.items[0];
    self.section.removeItem(null, itm);
  }

  addMacro(){
    let self = this;
    if(self.selectedMacro && self.selectedTextarea){

      let selectStart = self.selectedTextarea.selectionStart;
      let selectEnd = self.selectedTextarea.selectionEnd;

      let txt = self.selectedTextarea.value;
      let start = txt.substr(0, selectStart);
      let end = txt.substr(selectEnd, txt.length - selectEnd);

      self.section.items[0].details = start + self.selectedMacro + end;
    }else{
      //ERROR!
      if(!this.selectedMacro){
        self.popHelper.openGenericMessagePop('Please select a macro to add to preference.', 'No Macro Selected', ['OK'], true, function(res){

        });
        return;
      }

      if(!this.selectedTextarea){
        self.popHelper.openGenericMessagePop('Please click in a textarea to add macro.', 'No Textarea Selected', ['OK'], true, function(res){

        });
        return;
      }
    }
  }

  textareaFocus(textarea, e){
    let self = this;
    self.selectedTextarea = e.target;
    self.selectedTextareaType = textarea;
  }


}
