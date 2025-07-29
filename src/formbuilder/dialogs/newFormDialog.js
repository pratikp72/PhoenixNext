import {DialogController} from 'aurelia-dialog';
import {inject, computedFrom} from 'aurelia-framework';

@inject(DialogController)
export class NewFormDialog {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  typeList=['GO', 'PDF', 'REPORT'];
  selectedType=null;
  formName=null;

  @computedFrom('formName', 'selectedType')
  get incomplete(){
    if(this.formName === null || this.selectedType === null){
      return true;
    }
    return false;
  }

  constructor(DialogController){
    this.dialogController = DialogController;
  }

  activate(obj){
    let self = this;
    self.popupWidth = obj.popupWidth / 3;
    self.popupHeight = obj.popupHeight / 4;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
  }

  attached(){
    let self = this;
    var res = $(self.genpicklist).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    var overlays = $('ux-dialog-overlay');
    for(let i = 0; i < overlays.length; i++){
      let over = overlays[i];
      over.style.setProperty("z-index", "5001", "important");
    }
  }

  ok(){
    let self = this;
    self.dialogController.close(true, {name: self.formName, type: self.selectedType });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
