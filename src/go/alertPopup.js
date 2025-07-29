import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


@inject(DialogController, http, helper)
export class AlertPopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  alerts=[];
  scrollHeight;

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  activate(obj){
    let self = this;

    self.alerts = obj.alerts;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.popupWidth = windowWidth / 2;
    self.popupHeight = windowHeight / 2;
    self.popupTop = windowHeight / 4;
    self.popupLeft = windowWidth / 4;
  }

  attached(){
   // this.scrollHeight = this.popupHeight - (this.dxheader.clientHeight + this.footer.clientHeight);

    var res = $(this.alertpop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    this.scrollHeight = this.popupHeight - this.alerthead.clientHeight;
  }

  // rowClick(r){
  //   let self = this;
  //   self.selectedRow = r;
  //   for(var i = 0; i < self.rows.length; i++){
  //     if(self.rows[i].id == r.id){
  //       self.rows[i].selected = true;
  //     }else{
  //       self.rows[i].selected = false;
  //     }
  //   }
  // }

  // ok(){
  //   let self = this;
  //   self.dialogController.close(true);
  // }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
