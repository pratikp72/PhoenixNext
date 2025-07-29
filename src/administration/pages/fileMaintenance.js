// import {inject} from "aurelia-dependency-injection";
import {bindable, inject} from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import * as _ from 'lodash';
import {PopupHelper} from "../../go/popupHelper";


class ListItem {
  constructor(descripiton, id, data){
    this.data=data;
    this.description= descripiton;
    this.selected = false;
    this.item=null;
    this.id=id;
  }
}

class ListGroup{
  constructor(description, items){
    this.items = items == undefined ? [] : items;
    this.description = description;
    this.headingId;
    this.collapseId;
    this.dataTarget;
    this.expanded = false;
    this.dataUrl;

    this.displayEntity = true;
    this.displayFirstName=true;
    this.displayMiddleName=true;
    this.displayLastName=true;
    this.displayTitle=true;
    this.displaySex=true;
    this.displayDob=true;
    this.displayTaxId=true;
    this.displayAddress1=true;
    this.displayAddress2=true;
    this.displayProviderRole=true;
    this.displayCity=true;
    this.displayState=true;
    this.displayZip=true;
    this.displaySalutation=true;
    this.displayHomePhone=true;
    this.displayWorkPhone=true;
    this.displayWorkExt=true;
    this.displayFaxPhone=true;
    this.displayCellPhone=true;
    this.displayEmail=true;
    this.displayMarried=true;
    this.displaySpouseFirst=true;
    this.displaySpouseLast=true;
    this.displayLocationType=true;
    this.displaySignatureButton=false;

  }
}

@inject(helper, http, Data, PopupHelper)
export class FileMaintenance {

  list=[];

  selectedItem=null;
  selectedGroup=null;

  height;

  enableEdit = false;

  locationTypes=['Clinic','DME','Imaging','Lab', 'Other','Pharmacy','Surgical','Therapy'];
  providerRoles=['Surgeon','Assistant','Office Only','Therapy'];
  states=['AK', 'AL', 'AR', 'AS', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MP', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UM', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY'];
  sexes=['M','F'];

  saveDialog=null;

  @bindable datepicker;

  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(obj) {
    let self = this;
    self.data = obj.data;
    self.setup();
  }

  setup(){
    let self = this;

    self.height = window.innerHeight - 60;

    //setup list array...
    let locationGroup = new ListGroup('Location');
    locationGroup.displayFirstName=false;
    locationGroup.displayMiddleName=false;
    locationGroup.displayLastName=false;
    locationGroup.displayTitle=false;
    locationGroup.displaySex=false;
    locationGroup.displayDob=false;
    locationGroup.displayTaxId=false;
    locationGroup.displayProviderRole=false;
    locationGroup.displaySalutation=false;
    locationGroup.displayHomePhone=false;
    locationGroup.displayCellPhone=false;
    locationGroup.displayEmail=false;
    locationGroup.displayMarried=false;
    locationGroup.displaySpouseFirst=false;
    locationGroup.displaySpouseLast=false;


    let schoolGroup = new ListGroup('School');
    schoolGroup.displayFirstName=false;
    schoolGroup.displayMiddleName=false;
    schoolGroup.displayLastName=false;
    schoolGroup.displayTitle=false;
    schoolGroup.displaySex=false;
    schoolGroup.displayDob=false;
    schoolGroup.displayTaxId=false;
    schoolGroup.displayProviderRole=false;
    schoolGroup.displaySalutation=false;
    schoolGroup.displayHomePhone=false;
    schoolGroup.displayCellPhone=false;
    schoolGroup.displayEmail=false;
    schoolGroup.displayMarried=false;
    schoolGroup.displaySpouseFirst=false;
    schoolGroup.displaySpouseLast=false;



    let providerGroup = new ListGroup('Provider');
    providerGroup.displayLocationType = false;
    providerGroup.displayEntity = false;
    providerGroup.displaySignatureButton = true;
    self.selectGroup(providerGroup);
    let refPhysGroup = new ListGroup('Referring Physician');
    let pharmacyGroup = new ListGroup('Pharmacy');
    pharmacyGroup.displayFirstName=false;
    pharmacyGroup.displayMiddleName=false;
    pharmacyGroup.displayLastName=false;
    pharmacyGroup.displayTitle=false;
    pharmacyGroup.displaySex=false;
    pharmacyGroup.displayDob=false;
    pharmacyGroup.displayTaxId=false;
    pharmacyGroup.displayProviderRole=false;
    pharmacyGroup.displaySalutation=false;
    pharmacyGroup.displayHomePhone=false;
    pharmacyGroup.displayCellPhone=false;
    pharmacyGroup.displayEmail=false;
    pharmacyGroup.displayMarried=false;
    pharmacyGroup.displaySpouseFirst=false;
    pharmacyGroup.displaySpouseLast=false;




    let labGroup = new ListGroup('Lab');
    labGroup.displayFirstName=false;
    labGroup.displayMiddleName=false;
    labGroup.displayLastName=false;
    labGroup.displayTitle=false;
    labGroup.displaySex=false;
    labGroup.displayDob=false;
    labGroup.displayTaxId=false;
    labGroup.displayProviderRole=false;
    labGroup.displaySalutation=false;
    labGroup.displayHomePhone=false;
    labGroup.displayCellPhone=false;
    labGroup.displayEmail=false;
    labGroup.displayMarried=false;
    labGroup.displaySpouseFirst=false;
    labGroup.displaySpouseLast=false;


    let employerGroup = new ListGroup('Employer');
    employerGroup.displayLocationType = false;
    employerGroup.displayFirstName=false;
    employerGroup.displayMiddleName=false;
    employerGroup.displayLastName=false;
    employerGroup.displayTitle=false;
    employerGroup.displaySex=false;
    employerGroup.displayDob=false;
    employerGroup.displayTaxId=false;
    employerGroup.displayProviderRole=false;
    employerGroup.displaySalutation=false;
    employerGroup.displayHomePhone=false;
    employerGroup.displayCellPhone=false;
    employerGroup.displayEmail=false;
    employerGroup.displayMarried=false;
    employerGroup.displaySpouseFirst=false;
    employerGroup.displaySpouseLast=false;


    self.addGroup(locationGroup);
    self.addGroup(schoolGroup);
    self.addGroup(providerGroup);
    self.addGroup(refPhysGroup);
    self.addGroup(pharmacyGroup);
    self.addGroup(labGroup);
    self.addGroup(employerGroup);

    // let picklistGroup = new ListGroup('Picklist');
    // picklistGroup.headingId = 'heading' + self.list.length + 1;
    // picklistGroup.collapseId = 'collapse' + self.list.length + 1;
    // picklistGroup.dataTarget = '#'+picklistGroup.collapseId;
    // self.addGroup(picklistGroup);


    self.goData.getWithUrl('providers', function(res){
      providerGroup.dataUrl = 'providers';
      for(let p = 0; p < res.length; p++){
        providerGroup.items.push(new ListItem(res[p].ProviderEntity, res[p].ProviderID, res[p]));
      }
    });
    self.goData.getWithUrl('locations', function(res){
      //get labs
      let labs = _.filter(res, function(r){return r.Type.toLowerCase() == 'lab'});
      //get pharmacy
      let pharms = _.filter(res, function(r){return r.Type.toLowerCase() == 'pharmacy'});
      //NOT labs / pharmacy...
      let locations = _.reject(res, function(r){return r.Type.toLowerCase() == 'pharmacy' || r.Type.toLowerCase() == 'lab'});

      locationGroup.dataUrl = 'locations';
      pharmacyGroup.dataUrl = 'locations';
      labGroup.dataUrl = 'locations';

      for(let p = 0; p < locations.length; p++){
        locationGroup.items.push(new ListItem(locations[p].LocationName, locations[p].LocationID, locations[p]));
      }
      for(let p = 0; p < pharms.length; p++){
        pharmacyGroup.items.push(new ListItem(pharms[p].LocationName, pharms[p].LocationID,pharms[p]));
      }
      for(let p = 0; p < labs.length; p++){
        labGroup.items.push(new ListItem(labs[p].LocationName, labs[p].LocationID, labs[p]));
      }
    });
    self.goData.getWithUrl('schools', function(res){

      schoolGroup.dataUrl = 'schools';

      for(let p = 0; p < res.length; p++){
        schoolGroup.items.push(new ListItem(res[p].SchoolName, res[p].SchoolID, res[p]));
      }
    });
    self.goData.getWithUrl('employers', function(res){
      employerGroup.dataUrl='employer';//this is singular...

      for(let p = 0; p < res.length; p++){
        employerGroup.items.push(new ListItem(res[p].NameEmployer, res[p].EmployerID, res[p]));
      }
    });

    // let lists=['Med Allergies', 'IM Messages', 'Anesthesia', 'Implant', 'Autograft', 'Bone Tissue Graft', 'Bone Cement', 'Injections'];
    // self.goData.getLists(lists, function(res){
    //   for(let i = 0; i < lists.length; i++){
    //       let itmName = lists[i];
    //       let items = _.filter(res, function(i){return i.ListType == itmName && i.ProviderID == 0});
    //       if(items.length > 0){
    //
    //         let subGroup = new ListGroup(itmName);
    //         for(let r = 0; r < items.length; r++){
    //           let aItm = new ListItem(items[r].Description1, items[r]);
    //           subGroup.items.push(aItm);
    //         }
    //
    //         picklistGroup.items.push(subGroup);
    //       }
    //   }
    // });

  }

  openSignature(selectedItem){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let topThird = windowHeight / 3;

    let width = 634;
    let left = third / 2;
    let height='auto';
    let top = topThird / 2;

    let options={
      displayHeader: false,
      //bodyPadding: 0
      scrollHeight: 228
    }
    self.popupHelper.openViewModelPop('./signature', selectedItem,'',width,height,top,quarter,options,function(res){

    });
  }

  validatePhone(phone){
    let regx = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
    let pass = true;
    if(!regx.test(phone)){
      pass = false;
    }
    return pass;
  }

  itemClick(item, group){
    let self = this;
    //select item, deselect everything else...
    for(let g = 0; g < self.list.length; g++){
      let aGroup = self.list[g];
      for(let i = 0; i < aGroup.items.length; i++){
        let aItem = aGroup.items[i];
        if(aGroup.description == group.description &&
            aItem.description == item.description){
          aItem.selected = true;
          self.selectedItem = aItem;
          self.enableEdit = true;
          self.selectedItem.item = self.getDataItemWithGroup(aItem.data, aGroup);
        }else{
         aItem.selected = false;
        }
      }
    }
  }

  populateDataObjectWithListItemAndGroup(listItem, group){
    if(group.description =='Provider'){

      listItem.data.ProviderEntity = listItem.item.entity;
      listItem.data.NameFirst = listItem.item.firstName;
      listItem.data.NameMiddle= listItem.item.middleName;
      listItem.data.NameLast= listItem.item.lastName;
      listItem.data.NameTitle= listItem.item.title;
      listItem.data.sex= listItem.item.sex;
      listItem.data.DOB= listItem.item.dob;
      listItem.data.ProviderRole= listItem.item.providerRole;
      listItem.data.Practice_Address= listItem.item.address1;
      listItem.data.Practice_Address_2= listItem.item.address2;
      listItem.data.Practice_City= listItem.item.city;
      listItem.data.Practice_State= listItem.item.state;
      listItem.data.Practice_Zip= listItem.item.zip;

      let vHome = this.validatePhone(listItem.item.phoneHome);

      listItem.data.homephone= listItem.item.phoneHome;
      listItem.data.Practice_Phone= listItem.item.phoneWork;
      listItem.data.PhoneExt= listItem.item.phoneWorkExt;
      listItem.data.PhoneFax= listItem.item.phoneFax;
      listItem.data.cellPhone= listItem.item.phoneCell;
      listItem.data.Email= listItem.item.email;
      listItem.data.married= listItem.item.married;
      listItem.data.spouseFirst= listItem.item.spouseFirst;
      listItem.data.spouseLast= listItem.item.spouseLast;


      delete listItem.data.OD_Schedules;
      delete listItem.data.OD_Documents;
      delete listItem.data.OD_PDF_Instances;

    }else if(group.description =='Location'){

      listItem.data.LocationName= listItem.item.entity;
      listItem.data.taxId= listItem.item.taxId;
      listItem.data.Address1= listItem.item.address1;
      listItem.data.Address2= listItem.item.address2;
      listItem.data.ProviderRole= listItem.item.providerRole;
      listItem.data.City= listItem.item.city;
      listItem.data.State= listItem.item.state;
      listItem.data.Zip= listItem.item.zip;
      listItem.data.Phone= listItem.item.phoneWork;
      listItem.data.PhoneX= listItem.item.phoneWorkExt;
      listItem.data.Fax= listItem.item.phoneFax;
      listItem.data.Type= listItem.item.locationType;

    }else if(group.description =='School'){

      listItem.data.SchoolName= listItem.item.entity;
      listItem.data.FirstName= listItem.item.firstName;
      listItem.data.LastName= listItem.item.lastName;
      listItem.data.Title= listItem.item.title;
      listItem.data.Sex= listItem.item.sex;
      listItem.data.Address1= listItem.item.address1;
      listItem.data.Address2= listItem.item.address2;
      listItem.data.City= listItem.item.city;
      listItem.data.State= listItem.item.state;
      listItem.data.Zip= listItem.item.zip;
      listItem.data.phone= listItem.item.phoneWork;
      listItem.data.phoneX= listItem.item.phoneWorkExt;
      listItem.data.Fax= listItem.item.phoneFax;
      listItem.data.email= listItem.item.email;

      // itm.entity = data.SchoolName;
      // itm.firstName=data.FirstName;
      // itm.lastName=data.LastName;
      // itm.title=data.Title;
      // itm.sex=data.Sex;
      // //itm.dob=data.DOB;
      // //itm.taxId=data.
      // itm.address1=data.Address1;
      // itm.address2=data.Address2;
      // //itm.providerRole=data.ProviderRole;
      // itm.city=data.City;
      // itm.state=data.State;
      // itm.zip=data.Zip;
      // itm.phoneWork=data.phone;
      // itm.phoneWorkExt=data.phoneX;
      // itm.phoneFax=data.Fax;
      // itm.email=data.email;

    }else if(group.description =='Referring Physician'){

      listItem.data.ReferringEntity= listItem.item.entity;
      listItem.data.NameFirst= listItem.item.firstName;
      listItem.data.NameMiddle= listItem.item.middleName;
      listItem.data.NameLast= listItem.item.lastName;
      listItem.data.NameTitle= listItem.item.title;
      listItem.data.Address1= listItem.item.address1;
      listItem.data.Address2= listItem.item.address2;
      listItem.data.AddressCity= listItem.item.city;
      listItem.data.AddressState= listItem.item.state;
      listItem.data.AddressZip= listItem.item.zip;
      listItem.data.Salutation= listItem.item.salutation;
      listItem.data.Phone= listItem.item.phoneWork;
      listItem.data.PhoneExt= listItem.item.phoneWorkExt;
      listItem.data.Email= listItem.item.email;


      // itm.entity = data.ReferringEntity;
      // itm.firstName=data.NameFirst;
      // itm.middleName=data.NameMiddle;
      // itm.lastName=data.NameLast;
      // itm.title=data.NameTitle;
      // //itm.sex=data.sex;
      // //itm.dob=data.DOB;
      // //itm.taxId=data.
      // itm.address1=data.Address1;
      // itm.address2=data.Address2;
      // //itm.providerRole=data.ProviderRole;
      // itm.city=data.AddressCity;
      // itm.state=data.AddressState;
      // itm.zip=data.AddressZip;
      // itm.salutation=data.Salutation;
      // //itm.phoneHome=data.homePhone;
      // itm.phoneWork=data.Phone;
      // itm.phoneWorkExt=data.PhoneExt;
      // //itm.phoneFax=data.phoneExt;
      // //itm.phoneCell=data.cellPhone;
      // itm.email=data.Email;
      // // itm.married=data.married;
      // // itm.spouseFirst=data.spouseFirst;
      // // itm.spouseLast=data.spouseLast;


    }else if(group.description =='Pharmacy' || group.description =='Lab'){

      listItem.data.LocationName= listItem.item.entity;
      listItem.data.Type= listItem.item.locationType;
      listItem.data.Address1= listItem.item.address1;
      listItem.data.Address2= listItem.item.address2;
      listItem.data.City= listItem.item.city;
      listItem.data.State= listItem.item.state;
      listItem.data.Zip= listItem.item.zip;
      listItem.data.Phone= listItem.item.phoneWork;
      listItem.data.PhoneX= listItem.item.phoneWorkExt;
      listItem.data.Fax= listItem.item.phoneFax;



      // itm.entity = data.LocationName;
      // // itm.firstName=data.ContactName;
      // // itm.lastName=data.ContactLast;
      // // itm.title=data.Title;
      // // itm.sex=data.Sex;
      // //itm.dob=data.DOB;
      // //itm.taxId=data.
      // itm.locationType = data.Type;
      // itm.address1=data.Address1;
      // itm.address2=data.Address2;
      // //itm.providerRole=data.ProviderRole;
      // itm.city=data.City;
      // itm.state=data.State;
      // itm.zip=data.Zip;
      // itm.phoneWork=data.Phone;
      // itm.phoneWorkExt=data.PhoneX;
      // itm.phoneFax=data.Fax;
      // // itm.email=data.Email;
    }else if(group.description =='Employer'){

      listItem.data.NameEmployer= listItem.item.entity;
      listItem.data.NameContact= listItem.item.firstName;
      listItem.data.NameContactLast= listItem.item.lastName;
      listItem.data.Address1= listItem.item.address1;
      listItem.data.Address2= listItem.item.address2;
      listItem.data.AddressCity= listItem.item.city;
      listItem.data.AddressState= listItem.item.state;
      listItem.data.AddressZip= listItem.item.zip;
      listItem.data.Phone= listItem.item.phoneWork;
      listItem.data.PhoneExt= listItem.item.phoneWorkExt;
      listItem.data.PhoneFax= listItem.item.phoneFax;
      listItem.data.Email= listItem.item.email;

      // itm.entity = data.NameEmployer;
      // itm.firstName=data.NameContact;
      // itm.lastName=data.NameContactLast;
      // // itm.title=data.Title;
      // // itm.sex=data.Sex;
      // //itm.dob=data.DOB;
      // //itm.taxId=data.
      // itm.address1=data.Address1;
      // itm.address2=data.Address2;
      // //itm.providerRole=data.ProviderRole;
      // itm.city=data.AddressCity;
      // itm.state=data.AddressState;
      // itm.zip=data.AddressZip;
      // itm.phoneWork=data.Phone;
      // itm.phoneWorkExt=data.PhoneExt;
      // itm.phoneFax=data.PhoneFax;
      // itm.email=data.Email;
    }else if(group.description =='Picklist'){

    }

    return listItem;
  }

  getDataItemWithGroup(data, group){

    let itm={
      entity:"",
      firstName:"",
      middleName:"",
      lastName:"",
      title:"",
      sex:"",
      dob:"",
      taxId:"",
      address1:"",
      address2:"",
      providerRole:"",
      city:"",
      state:"",
      zip:"",
      salutation:"",
      phoneHome:"",
      phoneWork:"",
      phoneWorkExt:"",
      phoneFax:"",
      phoneCell:"",
      email:"",
      married:"",
      spouseFirst:"",
      spouseLast:"",
      locationType:""
    }

    if(group.description =='Provider'){
      itm.entity = data.NameFirst + " " + data.NameLast;
      itm.firstName=data.NameFirst;
      itm.middleName=data.NameMiddle;
      itm.lastName=data.NameLast;
      itm.title=data.NameTitle;
      itm.sex=data.sex;
      itm.dob=data.DOB;
      //itm.taxId=data.
      itm.address1=data.Practice_Address;
      itm.address2=data.Practice_Address_2;
      itm.providerRole=data.ProviderRole;
      itm.city=data.Practice_City;
      itm.state=data.Practice_State;
      itm.zip=data.Practice_Zip;
      //itm.salutation=data.
      itm.phoneHome=data.homephone;
      itm.phoneWork=data.Practice_Phone;
      itm.phoneWorkExt=data.PhoneExt;
      itm.phoneFax=data.PhoneFax;
      itm.phoneCell=data.cellPhone;
      itm.email=data.Email;
      itm.married=data.married;
      itm.spouseFirst=data.spouseFirst;
      itm.spouseLast=data.spouseLast;
    }else if(group.description =='Location'){
      itm.entity = data.LocationName;
      //itm.firstName=data.NameFirst;
      // itm.middleName=data.NameMiddle;
      // itm.lastName=data.NameLast;
      // itm.title=data.NameTitle;
      // itm.sex=data.sex;
      // itm.dob=data.DOB;
      itm.taxId=data.taxId;
      itm.address1=data.Address1;
      itm.address2=data.Address2;
      itm.providerRole=data.ProviderRole;
      itm.city=data.City;
      itm.state=data.State;
      itm.zip=data.Zip;
      //itm.salutation=data.
      //itm.phoneHome=data.homePhone;
      itm.phoneWork=data.Phone;
      itm.phoneWorkExt=data.PhoneX;
      itm.phoneFax=data.Fax;
      //itm.phoneCell=data.cellPhone;
      //itm.email=data.Email;
      // itm.married=data.married;
      // itm.spouseFirst=data.spouseFirst;
      // itm.spouseLast=data.spouseLast;
      itm.locationType = data.Type;

    }else if(group.description =='School'){
      itm.entity = data.SchoolName;
      itm.firstName=data.FirstName;
      itm.lastName=data.LastName;
      itm.title=data.Title;
      itm.sex=data.Sex;
      //itm.dob=data.DOB;
      //itm.taxId=data.
      itm.address1=data.Address1;
      itm.address2=data.Address2;
      //itm.providerRole=data.ProviderRole;
      itm.city=data.City;
      itm.state=data.State;
      itm.zip=data.Zip;
      itm.phoneWork=data.phone;
      itm.phoneWorkExt=data.phoneX;
      itm.phoneFax=data.Fax;
      itm.email=data.email;

    }else if(group.description =='Referring Physician'){

      itm.entity = data.ReferringEntity;
      itm.firstName=data.NameFirst;
      itm.middleName=data.NameMiddle;
      itm.lastName=data.NameLast;
      itm.title=data.NameTitle;
      //itm.sex=data.sex;
      //itm.dob=data.DOB;
      //itm.taxId=data.
      itm.address1=data.Address1;
      itm.address2=data.Address2;
      //itm.providerRole=data.ProviderRole;
      itm.city=data.AddressCity;
      itm.state=data.AddressState;
      itm.zip=data.AddressZip;
      itm.salutation=data.Salutation;
      //itm.phoneHome=data.homePhone;
      itm.phoneWork=data.Phone;
      //itm.phoneWorkExt=data.PhoneExt;
      itm.phoneFax=data.phoneExt;
      //itm.phoneCell=data.cellPhone;
      itm.email=data.Email;
      // itm.married=data.married;
      // itm.spouseFirst=data.spouseFirst;
      // itm.spouseLast=data.spouseLast;


    }else if(group.description =='Pharmacy' || group.description =='Lab'){
      itm.entity = data.LocationName;
      // itm.firstName=data.ContactName;
      // itm.lastName=data.ContactLast;
      // itm.title=data.Title;
      // itm.sex=data.Sex;
      //itm.dob=data.DOB;
      //itm.taxId=data.
      itm.locationType = data.Type;
      itm.address1=data.Address1;
      itm.address2=data.Address2;
      //itm.providerRole=data.ProviderRole;
      itm.city=data.City;
      itm.state=data.State;
      itm.zip=data.Zip;
      itm.phoneWork=data.Phone;
      itm.phoneWorkExt=data.PhoneX;
      itm.phoneFax=data.Fax;
      // itm.email=data.Email;
    }else if(group.description =='Employer'){
      itm.entity = data.NameEmployer;
      itm.firstName=data.NameContact;
      itm.lastName=data.NameContactLast;
      // itm.title=data.Title;
      // itm.sex=data.Sex;
      //itm.dob=data.DOB;
      //itm.taxId=data.
      itm.address1=data.Address1;
      itm.address2=data.Address2;
      //itm.providerRole=data.ProviderRole;
      itm.city=data.AddressCity;
      itm.state=data.AddressState;
      itm.zip=data.AddressZip;
      itm.phoneWork=data.Phone;
      itm.phoneWorkExt=data.PhoneExt;
      itm.phoneFax=data.PhoneFax;
      itm.email=data.Email;
    }else if(group.description =='Picklist'){

    }

    return itm;
  }

  selectGroup(grp){
    let self = this;
    self.selectedItem = null;
    self.enableEdit = false;
    self.isPicklist = false;

    for(let g = 0; g < self.list.length; g++){
      if(self.list[g].description == grp.description){
        this.selectedGroup = self.list[g];
        self.list[g].expanded = true;
      }else{
        self.list[g].expanded = false;
      }
    }
  }

  update(){
    let self = this;

    self.saveDialog = self.helper.createNoty("Saving " + self.selectedItem.description, 3000);

    if(self.selectedGroup && self.selectedItem){
      //update...
      let url = self.selectedGroup.dataUrl;
      if(self.selectedItem.id == 0){
        //save new...
        let saveObj = self.createSaveObjectWithGroupAndItem(self.selectedGroup, self.selectedItem);

        self.saveDialog.show();

        self.goData.postWithUrlAndData(url, JSON.stringify(saveObj), function (res) {

          self.saveDialog.close();

          //update item id...???
          self.selectedItem.data=res;
          if(self.selectedGroup.description == 'Provider'){
            self.selectedItem.id = res.ProviderID;
          }else if(self.selectedGroup.description == 'Location' ||
            self.selectedGroup.description == 'Lab' ||
            self.selectedGroup.description == 'Pharmacy'){
            self.selectedItem.id = res.LocationID;
          }else if(self.selectedGroup.description == 'Referring Physician'){

          }else if(self.selectedGroup.description == 'School'){
            self.selectedItem.id = res.SchoolID;
          }else if(self.selectedGroup.description == 'Employer'){
            self.selectedItem.id = res.EmployerID;
          }else if(self.selectedGroup.description == 'Picklist'){
            //self.selectedItem.id = res.ProviderID;
          }
        });
      }else{
        //update...
        let updateObj = self.createSaveObjectWithGroupAndItem(self.selectedGroup, self.selectedItem);
        self.saveDialog.show();

        self.goData.putWithUrlAndData(url, updateObj, function (res) {

          self.saveDialog.close();

        });
      }
    }
  }

  createSaveObjectWithGroupAndItem(group, item){
    let self = this;
    let populatedListItem = self.populateDataObjectWithListItemAndGroup(item, group);
    if(group.description == 'Lab' || group.description == 'Pharmacy'){
      let obj ={
        Location: populatedListItem.data
      }
      return obj;
    }else{
      let desc = group.description;
      let obj ={
        [desc]: populatedListItem.data
      }
      return obj;
    }
  }

  openNewItemPopup(header, inputArray, options){
    let self = this;
    self.popupHelper.openGenericInputPop(header, inputArray, null, false, function(res){
      let inputValues = res.inputs;
      let description=null;
      let url = `${self.selectedGroup.dataUrl}/new`;
      //get new item...
      self.goData.getWithUrl(url, function(res){

        //update new object...
        if(self.selectedGroup.description == 'Provider'){
          res.NameFirst=inputValues[0].value;
          res.NameLast=inputValues[1].value;
          res.ProviderEntity = res.NameFirst + " " + res.NameLast;
          description = res.ProviderEntity;
          res.OD_Users = options.user;
        }else if(self.selectedGroup.description == 'Location' ||
          self.selectedGroup.description == 'Lab' ||
          self.selectedGroup.description == 'Pharmacy'){
          res.LocationName = inputValues[0].value;
          description = res.LocationName;
        }else if(self.selectedGroup.description == 'Referring Physician'){

        }else if(self.selectedGroup.description == 'School'){
          res.SchoolName = inputValues[0].value;
          description = res.SchoolName;
        }else if(self.selectedGroup.description == 'Employer'){
          res.NameEmployer = inputValues[0].value;
          description = res.NameEmployer;
        }else if(self.selectedGroup.description == 'Picklist'){
          //res.LocationName = inputValues[0].value;
        }

        let newItem = new ListItem(description, 0, res);
        self.selectedGroup.items.push(newItem);
        self.itemClick(newItem, self.selectedGroup);
      });
    });
  }

  addClick(){
    let self = this;
    self.selectedItem = null;
    self.enableEdit = true;
    let header=null;

    if(self.selectedGroup){
      header = `New ${self.selectedGroup.description}`;

      let inputArray=[];
      if(self.selectedGroup.description == 'Provider'){
        inputArray.push('First');
        inputArray.push('Last');

        //display user selection popup...
        self.goData.getWithUrl('users', function(users){
          let picklistUsers=[];
          for(let u = 0; u < users.length; u++){
            picklistUsers.push(self.goData.getGenericPicklistItem(users[u].UserName, users[u]));
          }

          self.popupHelper.openGenericPicklistPop("User", "Select A User", picklistUsers, false, function(selectedUser){

            self.openNewItemPopup(header, inputArray, {user: selectedUser.item.data});

          });
        });

      }else{
        inputArray.push('Name');

        self.openNewItemPopup(header, inputArray);
      }

      // self.popupHelper.openGenericInputPop(header, inputArray, null, false, function(res){
      //   let inputValues = res.inputs;
      //   let description=null;
      //   let url = `${self.selectedGroup.dataUrl}/new`;
      //   //get new item...
      //   self.goData.getWithUrl(url, function(res){
      //
      //     //update new object...
      //     if(self.selectedGroup.description == 'Provider'){
      //       res.NameFirst=inputValues[0].value;
      //       res.NameLast=inputValues[1].value;
      //       res.ProviderEntity = res.NameFirst + " " + res.NameLast;
      //       description = res.ProviderEntity;
      //     }else if(self.selectedGroup.description == 'Location' ||
      //       self.selectedGroup.description == 'Lab' ||
      //     self.selectedGroup.description == 'Pharmacy'){
      //       res.LocationName = inputValues[0].value;
      //       description = res.LocationName;
      //     }else if(self.selectedGroup.description == 'Referring Physician'){
      //
      //     }else if(self.selectedGroup.description == 'School'){
      //       res.SchoolName = inputValues[0].value;
      //       description = res.SchoolName;
      //     }else if(self.selectedGroup.description == 'Employer'){
      //       res.NameEmployer = inputValues[0].value;
      //       description = res.NameEmployer;
      //     }else if(self.selectedGroup.description == 'Picklist'){
      //       //res.LocationName = inputValues[0].value;
      //     }
      //
      //     let newItem = new ListItem(description, 0, res);
      //     self.selectedGroup.items.push(newItem);
      //     self.itemClick(newItem, self.selectedGroup);
      //   });
      // });
    }else{
      //some alert to select group???
    }
  }

  addGroup(listGroup){
    let self = this;
    listGroup.headingId = 'heading' + self.list.length + 1;
    listGroup.collapseId = 'collapse' + self.list.length + 1;
    listGroup.dataTarget = '#'+listGroup.collapseId;
    self.list.push(listGroup);
  }
}
