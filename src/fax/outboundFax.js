import {DialogController} from 'aurelia-dialog';
import {inject, observable} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import { PopupHelper } from '../go/popupHelper';
import { Data } from '../data/go/data';


class Recipient{
  constructor(name, faxNumber, location){
    this.name = name;
    this.faxNumber = faxNumber;
    this.location = location;
  }
}


@inject(DialogController, http, helper, PopupHelper, Data)
export class OutboundFax {

  locations=[];
  pharmacies=[];
  labs=[];
  referringProviders=[];
  recipientTypes=['Referring', 'Locations', 'Pharmacy', 'Lab'];
  selectedRecipientType='Referring';
  filteredRecipients=[];
  selectedRecipient;
  faxRecipients=[];
  faxItems=[];

  disableRecipientPicker=false;

  @observable showRecipientPicker=false;
  showRecipientPickerChanged(newVal, oldVal){
    if(newVal){
      this.setupRecepientPicker();
    }
  }
  canSend=false;

  recipientClickListener=false;

  displayPhoneInputButton=false;
  phoneInputValue;

  constructor(DialogController, http, helper, PopupHelper, Data){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.popupHelper =PopupHelper;
    this.data = Data;
  }

  activate(obj){
    let self = this;

    self.faxItems = obj.faxItems;
    self.getReferring();
  }

  attached(){
    var style={
      'opacity': 0
    }
    $('ux-dialog-overlay').css(style);

    var uxStyle={
      'padding': 0
    }
    $('ux-dialog').css(uxStyle);

    let width = window.innerWidth / 2;

    var dxContainer = $('ux-dialog-container');
    dxContainer[0].style.setProperty("z-index", 4001, "important");
    dxContainer[0].style.setProperty("left", width + "px");
  }

  detached(){
    window.removeEventListener("click", this.windowClickedListener);
    if(this.recipientpicker){
      this.recipientpicker.removeEventListener("click", this.recipientPlusClickListener);
    }
  }


  plusClicked(event){
    let self = this;
    event.stopPropagation();
    self.showRecipientPicker = true;

    // if(!self.recipientClickListener){
    //   self.recipientClickListener = true;
    //   self.plusClickedListener(event);
    // }
  }

  setupRecepientPicker(){
    let self = this;
    if(!self.recipientClickListener){
      self.recipientClickListener = true;
      self.plusClickedListener();
    }
  }

  windowClickedListener = () =>{
    let self = this;
    if(self.showRecipientPicker == true){
      self.showRecipientPicker = false;
    }
  }

  recipientPlusClickListener = (event)=>{
    if(event.srcElement.id =="faxAddRecipientButton"){
      this.addRecipient();
    }
    event.stopPropagation();
  }

  plusClickedListener = (event) =>{
    let self = this;

    self.disableRecipientPicker = true;

    self.dialogController.controller.viewModel.showSpinner();

    //window.addEventListener("click", self.windowClickedListener);

    setTimeout(function(){

      window.addEventListener("click", self.windowClickedListener);

      self.recipientpicker.addEventListener("click",self.recipientPlusClickListener.bind(self));

      self.dialogController.controller.viewModel.hideSpinner();

      self.disableRecipientPicker = false;

    }, 1000);
  }

  filterRecipients(){
    let self = this;
    //self.selectedRecipientType = type;
    if(self.selectedRecipientType == 'Referring'){
      self.getReferring();
    }else{
      self.getLocations(self.selectedRecipientType);
    }
  }

  getReferring(){
    let self = this;

    //return if we have already retrieved providers...
    if(self.referringProviders.length > 0){
      self.filteredRecipients = self.referringProviders;
    }

    var url = 'referring/all';
    self.data.getWithUrl(url, function(res){
      for(var i = 0; i < res.length; i++){
        var aRecip = new Recipient(res[i].ReferringEntity, res[i].PhoneFax, res[i].Address1);
        self.referringProviders.push(aRecip);
      }

      self.filteredRecipients = self.referringProviders;
    });
  }

  getLocations(type){
    let self = this;

    //return if we have already retrieved providers...
    if(type == 'Locations' && self.locations.length > 0){
      self.filteredRecipients = self.locations;
      return;
    }
    if(type == 'Pharmacy' && self.pharmacies.length > 0){
      self.filteredRecipients = self.pharmacies;
      return;
    }
    if(type == 'Lab' && self.labs.length > 0){
      self.filteredRecipients = self.labs;
      return;
    }

    var url = 'locations';
    if(type != 'Locations'){
      url += "?type=" + type;
    }
    self.data.getWithUrl(url, function(res){
      for(var i = 0; i < res.length; i++){
        var aRecip = new Recipient(res[i].LocationName, res[i].Fax, res[i].Address1);
        if(type == 'Locations'){
          self.locations.push(aRecip);
        }
        if(type == 'Pharmacy'){
          self.pharmacies.push(aRecip);
        }
        if(type == 'Lab'){
          self.labs.push(aRecip);
        }
      }

      if(type == 'Locations'){
        self.filteredRecipients = self.locations;
      }
      if(type == 'Pharmacy'){
        self.filteredRecipients =self.pharmacies;
      }
      if(type == 'Lab'){
        self.filteredRecipients =self.labs;
      }
    });
  }

  addRecipient(){
    if(this.selectedRecipient){
      this.faxRecipients.push(this.selectedRecipient);
      this.showRecipientPicker=false;
      this.checkCanSend();
    }
  }

  addRecipientWithPhoneInput(){
    var aRecip = new Recipient(this.phoneInputValue, this.phoneInputValue, null);
    this.faxRecipients.push(aRecip);
    this.displayPhoneInputButton = false;
    this.phoneInputValue = null;
    this.checkCanSend();
  }

  cancelPhoneInput(){
    this.displayPhoneInputButton = false;
    this.phoneInputValue = null;
  }

  removeRecipient(index){
    this.faxRecipients.splice(index, 1);
    this.checkCanSend();
  }

  removeFaxItem(index){
    this.faxItems.splice(index, 1);
    this.checkCanSend();
  }

  checkCanSend(){
    if(this.faxItems.length > 0 && this.faxRecipients.length > 0){
      this.canSend = true;
    }else{
      this.canSend = false;
    }
  }

  buildFaxRecipientsForPost(){
    var self = this;
    var recips=[];
    for(var i = 0; i < self.faxRecipients.length; i++){
      recips.push(self.faxRecipients[i]);
    }
    return recips;
  }

  buildFaxDataForPost(){
    var self = this;
    var data=[];
    for(var i = 0; i < self.faxItems.length; i++){
      var aItm = self.faxItems[i];
      data.push({"Id": aItm.Id, "Type": aItm.Type});
    }
    return data;
  }

  sendFax(){
    let self = this;

    if(self.faxRecipients.length == 0 || self.faxItems.length == 0)return;

    self.dialogController.controller.viewModel.showSpinner();

    var n = self.helper.createNoty("Sending fax...", 30000);
    n.show();

    var url = 'faxing/send';
    var faxData={
      Username: self.helper._user.UserData.eFaxUser,
      Password: self.helper._user.UserData.eFaxPassword,
      Recipients: self.buildFaxRecipientsForPost(),
      Data: self.buildFaxDataForPost()
    }
    self.data.postWithUrlAndData(url, JSON.stringify(faxData), function(res){

      self.dialogController.controller.viewModel.hideSpinner();

      if(res.Error.errorStringField == "Success"){
        self.helper.updateNoty(n, "Fax sent!", "success", 3000);
      }else{
        self.helper.updateNoty(n, "Fax failed!", "error", 3000);
      }
      
      //n.close();

    });
  }

  faxPhoneInput(){
    this.displayPhoneInputButton = true;
  }

  openPatientSearch(){
    let self = this;
    self.popupHelper.openPatientPop(false, true, function(pat){

      // if(pat.createPatient){
      //   //open patientDetails...
      //   self.home.createPatient(function(newPatient){
      //     self.patientName = newPatient.NameFirst + " "+ newPatient.NameLast;
      //     self.patientId = newPatient.PatientID;
      //   });
      // }else{
      //   self.patientName = pat.NameFirst + " "+ pat.NameLast;
      //   self.patientId = pat.PatientID;
      // }
    });
  }


  cancel(){
    // let self = this;
    this.dialogController.cancel();
  }
}
