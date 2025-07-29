import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';


@inject(DialogController, http, helper)
export class GenericInputPopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  message="";
  header="";
  inputValue="";
  buttonText="";

  inputs=[];

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  activate(obj){
    let self = this;
    self.popupWidth = obj.popupWidth / 3;
    self.popupHeight = obj.popupHeight / 4;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    self.buttonText = obj.buttonText;
    self.message = obj.message;
    for(let i = 0; i < obj.inputs.length; i++){

      if(typeof obj.inputs[i] === 'string'){
        let inputObj ={
          description: obj.inputs[i],
          value:null,
          placeholder: "",
          inputType: "text"
        }
        self.inputs.push(inputObj);
      }else{
        let inputObj ={
          value:null,
          inputType: "text"
        }
        var options = obj.inputs[i];
        if(options['name']){
          inputObj['description']=options.name;
        }
        if(options['placeholder']){
          inputObj['placeholder']=options.placeholder;
        }
        if(options['inputType']){
          inputObj['inputType']=options.inputType;
        }
        if(options['value']){
          inputObj['value']=options.value;
        }
        self.inputs.push(inputObj);
      }
    }
  }

  buttonClick(){
    let self = this;
    self.dialogController.close(true, {inputs: self.inputs});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  attached(){
    let self = this;
    var res = $(self.genInput).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    var overlays = $('ux-dialog-overlay');//.closest('ux-dialog-container');
    for(let i = 0; i < overlays.length; i++){
      let over = overlays[i];
      over.style.setProperty("z-index", "5001", "important");
    }
  }
}
